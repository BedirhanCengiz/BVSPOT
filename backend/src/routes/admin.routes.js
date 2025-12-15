import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '../middleware/auth.js';
import { pool } from '../database/db.js';
import { getLogs } from '../services/logService.js';
import { createLog } from '../services/logService.js';

const router = express.Router();

// Tüm admin route'ları admin yetkisi gerektirir
router.use(requireAdmin);

/**
 * GET /api/admin/dashboard
 * Dashboard istatistikleri
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      // Günlük istatistikler
      const dailyStats = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_registrations,
          COUNT(*) FILTER (WHERE status = 'active' AND connection_start_time::date = CURRENT_DATE) as today_active,
          COUNT(*) FILTER (WHERE status = 'active') as total_active,
          COUNT(*) FILTER (WHERE status = 'verified') as total_verified,
          COUNT(*) FILTER (WHERE status = 'blocked') as total_blocked
        FROM users
      `);

      // Haftalık istatistikler
      const weeklyStats = await client.query(`
        SELECT 
          DATE(created_at) as date,
          COUNT(*) as registrations
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `);

      // Aylık istatistikler
      const monthlyStats = await client.query(`
        SELECT 
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as registrations
        FROM users
        WHERE created_at >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY month DESC
      `);

      // Online kullanıcı sayısı
      let onlineUsers;
      try {
        onlineUsers = await client.query(`
          SELECT COUNT(DISTINCT user_id) as count
          FROM sessions
          WHERE status = 'active' AND start_time > NOW() - INTERVAL '5 minutes'
        `);
      } catch (error) {
        // Fallback: Eğer start_time yoksa veya hata varsa alternatif sorgu
        console.warn('Online users sorgusu hatası, alternatif kullanılıyor:', error.message);
        onlineUsers = await client.query(`
          SELECT COUNT(DISTINCT s.user_id) as count
          FROM sessions s
          INNER JOIN users u ON s.user_id = u.id
          WHERE s.status = 'active' AND (u.connection_start_time > NOW() - INTERVAL '5 minutes' OR s.start_time > NOW() - INTERVAL '5 minutes')
        `).catch(() => {
          // Son fallback: Sadece aktif session sayısı
          return { rows: [{ count: 0 }] };
        });
      }

      // Başarılı/başarısız doğrulama istatistikleri
      let verificationStats;
      try {
        verificationStats = await client.query(`
          SELECT 
            action,
            COUNT(*) as count
          FROM logs
          WHERE action IN ('otp_verify_success', 'otp_verify_failed', 'register_success', 'register_failed_tckn')
          AND created_at >= CURRENT_DATE - INTERVAL '7 days'
          GROUP BY action
        `);
      } catch (error) {
        console.warn('Verification stats sorgusu hatası:', error.message);
        verificationStats = { rows: [] };
      }

      res.json({
        daily: dailyStats.rows[0] || {},
        weekly: weeklyStats.rows || [],
        monthly: monthlyStats.rows || [],
        onlineUsers: onlineUsers?.rows?.[0]?.count || 0,
        verificationStats: verificationStats.rows || []
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users
 * Kullanıcı listesi (filtreleme ve sayfalama ile)
 */
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, search, startDate, endDate, idType, pendingPassport } = req.query;
    const offset = (page - 1) * limit;

    const client = await pool.connect();
    try {
      let query = `
        SELECT id, full_name, phone, tckn, passport_no, foreign_id_no, id_type, birth_date, mac_address, ip_address,
               status, quota_mb, quota_used_mb, speed_limit_mbps,
               connection_start_time, connection_end_time, created_at
        FROM users
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (status) {
        query += ` AND status = $${paramIndex++}`;
        params.push(status);
      }

      // Pasaport bekleyenleri filtrele
      if (pendingPassport === 'true') {
        query += ` AND id_type = 'passport' AND (status = 'pending' OR status = 'awaiting_admin_approval')`;
      }

      if (idType) {
        query += ` AND id_type = $${paramIndex++}`;
        params.push(idType);
      }

      if (search) {
        query += ` AND (full_name ILIKE $${paramIndex} OR phone LIKE $${paramIndex} OR tckn LIKE $${paramIndex} OR passport_no LIKE $${paramIndex} OR foreign_id_no LIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND created_at >= $${paramIndex++}`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND created_at <= $${paramIndex++}`;
        params.push(endDate);
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await client.query(query, params);

      // Toplam sayı
      const countQuery = query.replace(/SELECT.*FROM/, 'SELECT COUNT(*) as total FROM').replace(/ORDER BY.*$/, '');
      const countResult = await client.query(countQuery.replace(/LIMIT.*OFFSET.*$/, ''), params.slice(0, -2));

      // Admin için telefon numarası maskelenmemiş döner (admin yetkili kullanıcı)
      // TCKN güvenlik nedeniyle hala maskelenmiş kalır
      const users = result.rows.map(user => {
        const maskedUser = { ...user };
        // TCKN'yi maskele (eğer varsa)
        if (maskedUser.tckn && maskedUser.tckn.length >= 11) {
          maskedUser.tckn = maskedUser.tckn.substring(0, 5) + '****' + maskedUser.tckn.substring(9);
        }
        // Telefon numarası maskelenmemiş - admin düzenleme yapabilmeli
        return maskedUser;
      });

      res.json({
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(countResult.rows[0].total),
          totalPages: Math.ceil(countResult.rows[0].total / limit)
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users/:id
 * Kullanıcı detayı
 */
router.get('/users/:id', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT u.*, 
                COUNT(s.id) as session_count,
                SUM(s.data_transferred_mb) as total_data_transferred
         FROM users u
         LEFT JOIN sessions s ON u.id = s.user_id
         WHERE u.id = $1
         GROUP BY u.id`,
        [req.params.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }

      const user = result.rows[0];
      // Admin için telefon numarası maskelenmemiş döner (admin düzenleme yapabilmeli)
      // TCKN güvenlik nedeniyle maskelenmiş kalır
      if (user.tckn && user.tckn.length >= 11) {
        user.tckn = user.tckn.substring(0, 5) + '****' + user.tckn.substring(9);
      }

      res.json({ user });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:id/block
 * Kullanıcıyı engelle
 */
router.post('/users/:id/block', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
        ['blocked', req.params.id]
      );

      await createLog(req.params.id, 'user_blocked', req, { adminId: req.admin.id });

      res.json({ success: true, message: 'Kullanıcı engellendi' });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:id/unblock
 * Kullanıcı engelini kaldır
 */
router.post('/users/:id/unblock', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE users SET status = $1, updated_at = NOW() WHERE id = $2',
        ['verified', req.params.id]
      );

      await createLog(req.params.id, 'user_unblocked', req, { adminId: req.admin.id });

      res.json({ success: true, message: 'Kullanıcı engeli kaldırıldı' });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:id/set-quota
 * Kullanıcı kotası ve hız limiti ayarla
 */
router.post('/users/:id/set-quota',
  [
    body('quotaMb').optional().isInt({ min: 0 }).withMessage('Kota MB cinsinden pozitif bir sayı olmalıdır'),
    body('speedLimitMbps').optional().isInt({ min: 1 }).withMessage('Hız limiti Mbps cinsinden pozitif bir sayı olmalıdır')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { quotaMb, speedLimitMbps } = req.body;
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (quotaMb !== undefined) {
        updates.push(`quota_mb = $${paramIndex++}`);
        params.push(quotaMb);
      }

      if (speedLimitMbps !== undefined) {
        updates.push(`speed_limit_mbps = $${paramIndex++}`);
        params.push(speedLimitMbps);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Güncellenecek alan belirtilmedi' });
      }

      updates.push(`updated_at = NOW()`);
      params.push(req.params.id);

      const client = await pool.connect();
      try {
        await client.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          params
        );

        await createLog(req.params.id, 'quota_updated', req, { 
          adminId: req.admin.id, 
          quotaMb, 
          speedLimitMbps 
        });

        res.json({ success: true, message: 'Kota ve hız limiti güncellendi' });
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/admin/users/:id/verify-manual
 * Kullanıcıyı manuel doğrula
 */
router.post('/users/:id/verify-manual', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE users 
         SET status = 'verified', 
             connection_start_time = NOW(),
             updated_at = NOW()
         WHERE id = $1`,
        [req.params.id]
      );

      await createLog(req.params.id, 'manual_verification', req, { adminId: req.admin.id });

      res.json({ success: true, message: 'Kullanıcı manuel olarak doğrulandı' });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:id/approve
 * Pasaport kaydını onayla
 */
router.post('/users/:id/approve', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE users 
         SET status = 'active', 
             updated_at = NOW()
         WHERE id = $1 AND id_type = 'passport'`,
        [req.params.id]
      );

      await createLog(req.params.id, 'passport_approved', req, { adminId: req.admin.id });

      res.json({ success: true, message: 'Pasaport kaydı onaylandı' });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users/:id/reject
 * Pasaport kaydını reddet
 */
router.post('/users/:id/reject', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE users 
         SET status = 'blocked', 
             updated_at = NOW()
         WHERE id = $1 AND id_type = 'passport'`,
        [req.params.id]
      );

      await createLog(req.params.id, 'passport_rejected', req, { adminId: req.admin.id });

      res.json({ success: true, message: 'Pasaport kaydı reddedildi' });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/users/:id
 * Kullanıcı bilgilerini güncelle (Şifre değiştirme dahil, TCKN değiştirilemez)
 */
router.put('/users/:id',
  [
    body('fullName').optional().trim().isLength({ min: 3, max: 255 }).withMessage('Ad Soyad 3-255 karakter arasında olmalıdır'),
    body('phone').optional().matches(/^[0-9]{10,11}$/).withMessage('Geçerli bir telefon numarası giriniz'),
    body('password').optional().isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır'),
    body('passportNo').optional().isLength({ min: 5, max: 50 }).withMessage('Pasaport numarası 5-50 karakter arasında olmalıdır'),
    body('foreignIdNo').optional().isLength({ min: 5, max: 50 }).withMessage('Yabancı kimlik numarası 5-50 karakter arasında olmalıdır'),
    body('status').optional().isIn(['pending', 'verified', 'active', 'blocked', 'expired', 'awaiting_admin_approval']).withMessage('Geçerli bir durum seçiniz'),
    body('quotaMb').optional().isInt({ min: 0 }).withMessage('Kota MB cinsinden pozitif bir sayı olmalıdır'),
    body('speedLimitMbps').optional().isInt({ min: 1 }).withMessage('Hız limiti Mbps cinsinden pozitif bir sayı olmalıdır')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { fullName, phone, password, passportNo, foreignIdNo, status, quotaMb, speedLimitMbps } = req.body;
      const updates = [];
      const params = [];
      let paramIndex = 1;

      if (fullName !== undefined) {
        updates.push(`full_name = $${paramIndex++}`);
        params.push(fullName);
      }
      if (phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        params.push(phone);
      }
      // Şifre hash'leme
      if (password !== undefined) {
        const passwordHash = await bcrypt.hash(password, 10);
        updates.push(`password_hash = $${paramIndex++}`);
        params.push(passwordHash);
      }
      // TCKN değiştirilemez - kaldırıldı
      if (passportNo !== undefined) {
        updates.push(`passport_no = $${paramIndex++}`);
        params.push(passportNo);
      }
      if (foreignIdNo !== undefined) {
        updates.push(`foreign_id_no = $${paramIndex++}`);
        params.push(foreignIdNo);
      }
      if (status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
      }
      if (quotaMb !== undefined) {
        updates.push(`quota_mb = $${paramIndex++}`);
        params.push(quotaMb);
      }
      if (speedLimitMbps !== undefined) {
        updates.push(`speed_limit_mbps = $${paramIndex++}`);
        params.push(speedLimitMbps);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Güncellenecek alan belirtilmedi' });
      }

      updates.push(`updated_at = NOW()`);
      params.push(req.params.id); // Son parametre ID

      const client = await pool.connect();
      try {
        await client.query(
          `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
          params
        );

        await createLog(req.params.id, 'user_updated_by_admin', req, { adminId: req.admin.id, updates: req.body });

        res.json({ success: true, message: 'Kullanıcı bilgileri güncellendi' });
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/logs
 * Log listesi
 */
router.get('/logs', async (req, res, next) => {
  try {
    const { page = 1, limit = 100, userId, action, startDate, endDate, ipAddress } = req.query;
    const offset = (page - 1) * limit;

    const client = await pool.connect();
    try {
      // Toplam kayıt sayısını al
      let countQuery = 'SELECT COUNT(*) as total FROM logs WHERE 1=1';
      const countParams = [];
      let paramIndex = 1;

      if (userId) {
        countQuery += ` AND user_id = $${paramIndex++}`;
        countParams.push(parseInt(userId));
      }
      if (action) {
        countQuery += ` AND action = $${paramIndex++}`;
        countParams.push(action);
      }
      if (startDate) {
        countQuery += ` AND created_at >= $${paramIndex++}`;
        countParams.push(startDate);
      }
      if (endDate) {
        countQuery += ` AND created_at <= $${paramIndex++}`;
        countParams.push(endDate);
      }
      if (ipAddress) {
        countQuery += ` AND ip_address = $${paramIndex++}`;
        countParams.push(ipAddress);
      }

      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      // Logları getir
      const logs = await getLogs({
        userId: userId ? parseInt(userId) : null,
        action,
        startDate,
        endDate,
        ipAddress,
        limit: parseInt(limit),
        offset: offset
      });

      res.json({
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/logs/export
 * Logları export et (CSV/JSON)
 */
router.get('/logs/export', async (req, res, next) => {
  try {
    const { format = 'json', startDate, endDate } = req.query;
    const logs = await getLogs({ startDate, endDate, limit: 10000 });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=logs.csv');
      
      // CSV header
      res.write('ID,User ID,Action,IP Address,MAC Address,Created At\n');
      
      // CSV rows
      logs.forEach(log => {
        res.write(`${log.id},${log.user_id || ''},${log.action},${log.ip_address || ''},${log.mac_address || ''},${log.created_at}\n`);
      });
      
      res.end();
    } else {
      res.json({ logs });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/mac-list
 * MAC adresi whitelist/blacklist
 */
router.get('/mac-list', async (req, res, next) => {
  try {
    const { listType } = req.query;
    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM mac_list WHERE 1=1';
      const params = [];
      
      if (listType) {
        query += ' AND list_type = $1';
        params.push(listType);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await client.query(query, params);
      res.json({ macList: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/mac-list
 * MAC adresi ekle (whitelist/blacklist)
 */
router.post('/mac-list',
  [
    body('macAddress').matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).withMessage('Geçerli bir MAC adresi giriniz'),
    body('listType').isIn(['whitelist', 'blacklist']).withMessage('Liste tipi whitelist veya blacklist olmalıdır'),
    body('reason').optional().isString()
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { macAddress, listType, reason } = req.body;
      const client = await pool.connect();
      try {
        await client.query(
          `INSERT INTO mac_list (mac_address, list_type, reason, created_by)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (mac_address) DO UPDATE SET list_type = $2, reason = $3`,
          [macAddress, listType, reason, req.admin.id]
        );

        await createLog(null, 'mac_list_updated', req, { macAddress, listType, adminId: req.admin.id });

        res.json({ success: true, message: 'MAC adresi listeye eklendi' });
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;

