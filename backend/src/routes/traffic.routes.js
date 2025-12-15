import express from 'express';
import { body, validationResult } from 'express-validator';
import { logWebTraffic, logBulkWebTraffic, getWebTrafficLogs, getWebTrafficStats } from '../services/webTrafficService.js';
import { requireAdmin } from '../middleware/auth.js';
import { macAddressMiddleware } from '../middleware/macAddress.js';

const router = express.Router();

/**
 * POST /api/traffic/log
 * Tek bir web trafiği logu kaydet
 * Router/hotspot'tan veya proxy'den çağrılır
 */
router.post('/log',
  macAddressMiddleware,
  [
    body('ipAddress').notEmpty().withMessage('IP adresi gereklidir'),
    body('url').notEmpty().withMessage('URL gereklidir'),
    body('method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']).withMessage('Geçerli bir HTTP method giriniz'),
    body('statusCode').optional().isInt({ min: 100, max: 599 }).withMessage('Geçerli bir HTTP status code giriniz'),
    body('dataTransferredBytes').optional().isInt({ min: 0 }).withMessage('Data transferred pozitif bir sayı olmalıdır'),
    body('userId').optional().isInt().withMessage('User ID pozitif bir sayı olmalıdır'),
    body('sessionId').optional().isInt().withMessage('Session ID pozitif bir sayı olmalıdır')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const {
        userId,
        sessionId,
        ipAddress,
        macAddress: bodyMacAddress,
        url,
        domain,
        method,
        statusCode,
        userAgent,
        referer,
        dataTransferredBytes,
        responseTimeMs,
        countryCode,
        deviceType,
        browser,
        os
      } = req.body;

      // MAC adresini otomatik çek (middleware'den veya body'den)
      const macAddress = req.macAddress || bodyMacAddress || null;

      await logWebTraffic({
        userId,
        sessionId,
        ipAddress,
        macAddress,
        url,
        domain,
        method,
        statusCode,
        userAgent: userAgent || req.get('user-agent'),
        referer: referer || req.get('referer'),
        dataTransferredBytes: dataTransferredBytes || 0,
        responseTimeMs,
        countryCode,
        deviceType,
        browser,
        os
      });

      res.json({ success: true, message: 'Web trafik logu kaydedildi' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/traffic/log-bulk
 * Toplu web trafiği logları kaydet
 * Router'dan gelen toplu loglar için
 */
router.post('/log-bulk',
  macAddressMiddleware,
  [
    body('logs').isArray({ min: 1 }).withMessage('Logs dizisi gereklidir'),
    body('logs.*.ipAddress').notEmpty().withMessage('Her log için IP adresi gereklidir'),
    body('logs.*.url').notEmpty().withMessage('Her log için URL gereklidir')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { logs } = req.body;

      await logBulkWebTraffic(logs);

      res.json({ success: true, message: `${logs.length} adet web trafik logu kaydedildi` });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/traffic/logs
 * Web trafiği loglarını getir (admin only)
 */
router.get('/logs',
  requireAdmin,
  async (req, res, next) => {
    try {
      const {
        userId,
        ipAddress,
        macAddress,
        domain,
        startDate,
        endDate,
        method,
        statusCode,
        page = 1,
        limit = 100
      } = req.query;

      const filters = {
        userId: userId ? parseInt(userId) : null,
        ipAddress,
        macAddress,
        domain,
        startDate,
        endDate,
        method,
        statusCode,
        limit: parseInt(limit)
      };

      const logs = await getWebTrafficLogs(filters);

      res.json({
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: logs.length
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/traffic/stats
 * Web trafiği istatistiklerini getir (admin only)
 */
router.get('/stats',
  requireAdmin,
  async (req, res, next) => {
    try {
      const { userId, startDate, endDate } = req.query;

      const filters = {
        userId: userId ? parseInt(userId) : null,
        startDate,
        endDate
      };

      const stats = await getWebTrafficStats(filters);

      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
);

export default router;



