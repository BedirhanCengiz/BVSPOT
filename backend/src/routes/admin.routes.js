import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { requireAdmin } from '../middleware/auth.js';
import { pool } from '../database/db.js';
import { getLogs } from '../services/logService.js';
import { createLog } from '../services/logService.js';
import { passwordValidator } from '../middleware/security.js';

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
      // Bugünkü kayıtları kontrol et (timezone sorunlarını önlemek için)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);
      
      // Günlük istatistikler - optimize edilmiş tek sorgu
      const dailyStats = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE created_at >= $1::timestamp AND created_at <= $2::timestamp)::INTEGER as today_registrations,
          COUNT(*) FILTER (WHERE status = 'active' AND connection_start_time IS NOT NULL AND connection_start_time >= $1::timestamp AND connection_start_time <= $2::timestamp)::INTEGER as today_active,
          COUNT(*) FILTER (WHERE status = 'active')::INTEGER as total_active,
          COUNT(*) FILTER (WHERE status = 'verified')::INTEGER as total_verified,
          COUNT(*) FILTER (WHERE status = 'blocked')::INTEGER as total_blocked
        FROM users
      `, [todayStart.toISOString(), todayEnd.toISOString()]);

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
          SELECT COALESCE(COUNT(DISTINCT user_id), 0)::INTEGER as count
          FROM sessions
          WHERE status = 'active' AND start_time > NOW() - INTERVAL '5 minutes'
        `);
      } catch (error) {
        // Fallback: Eğer start_time yoksa veya hata varsa alternatif sorgu
        console.warn('Online users sorgusu hatası, alternatif kullanılıyor:', error.message);
        try {
          onlineUsers = await client.query(`
            SELECT COALESCE(COUNT(DISTINCT s.user_id), 0)::INTEGER as count
            FROM sessions s
            INNER JOIN users u ON s.user_id = u.phone
            WHERE s.status = 'active' AND (
              (u.connection_start_time IS NOT NULL AND u.connection_start_time > NOW() - INTERVAL '5 minutes') 
              OR 
              (s.start_time IS NOT NULL AND s.start_time > NOW() - INTERVAL '5 minutes')
            )
          `);
        } catch (fallbackError) {
          // Son fallback: Sadece aktif session sayısı
          console.warn('Fallback sorgusu da başarısız, varsayılan değer kullanılıyor:', fallbackError.message);
          onlineUsers = { rows: [{ count: 0 }] };
        }
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

      // Toplam kullanıcı sayısı
      const totalUsers = await client.query(`
        SELECT COALESCE(COUNT(*), 0)::INTEGER as count FROM users
      `);

      // Trafik istatistikleri (5651 Kanunu logları)
      let trafficStats;
      try {
        trafficStats = await client.query(`
          SELECT 
            COUNT(*) as total_logs,
            COALESCE(SUM(data_transferred_bytes), 0) as total_bytes,
            COUNT(*) FILTER (WHERE DATE(created_at) = CURRENT_DATE) as today_logs,
            COALESCE(SUM(data_transferred_bytes) FILTER (WHERE DATE(created_at) = CURRENT_DATE), 0) as today_bytes
          FROM web_traffic_logs
        `);
      } catch (error) {
        console.warn('Traffic stats sorgusu hatası:', error.message);
        trafficStats = { rows: [{ total_logs: 0, total_bytes: 0, today_logs: 0, today_bytes: 0 }] };
      }

      const trafficData = trafficStats.rows[0] || {};
      const totalTrafficGB = (parseInt(trafficData.total_bytes || 0) / (1024 * 1024 * 1024)).toFixed(2);
      const todayTrafficMB = (parseInt(trafficData.today_bytes || 0) / (1024 * 1024)).toFixed(2);

      // Daily stats'ı güvenli şekilde al
      const dailyData = dailyStats.rows[0] || {};
      
      // Değerleri güvenli şekilde parse et
      const todayRegistrations = dailyData.today_registrations !== null && dailyData.today_registrations !== undefined 
        ? parseInt(dailyData.today_registrations) 
        : 0;

      res.json({
        daily: {
          today_registrations: todayRegistrations,
          today_active: parseInt(dailyData.today_active) || 0,
          total_active: parseInt(dailyData.total_active) || 0,
          total_verified: parseInt(dailyData.total_verified) || 0,
          total_blocked: parseInt(dailyData.total_blocked) || 0,
          total_users: parseInt(totalUsers.rows[0]?.count) || 0
        },
        weekly: weeklyStats.rows || [],
        monthly: monthlyStats.rows || [],
        onlineUsers: parseInt(onlineUsers?.rows?.[0]?.count || 0),
        verificationStats: verificationStats.rows || [],
        traffic: {
          total_logs: parseInt(trafficData.total_logs || 0),
          total_traffic_gb: parseFloat(totalTrafficGB || 0),
          today_logs: parseInt(trafficData.today_logs || 0),
          today_traffic_mb: parseFloat(todayTrafficMB || 0)
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
 * GET /api/admin/users
 * Kullanıcı listesi (filtreleme ve sayfalama ile)
 */
router.get('/users', async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, search, startDate, endDate, idType, pendingPassport, onlineOnly } = req.query;
    const offset = (page - 1) * limit;

    const client = await pool.connect();
    try {
      let query = `
        SELECT DISTINCT u.phone as id, u.phone, u.full_name, u.tckn, u.passport_no, u.foreign_id_no, u.id_type, u.birth_date, u.mac_address, u.ip_address,
               u.status, u.quota_mb, u.quota_used_mb, u.speed_limit_mbps,
               u.connection_start_time, u.connection_end_time, u.created_at
        FROM users u
        ${onlineOnly === 'true' ? 'INNER JOIN sessions s ON u.phone = s.user_id' : ''}
        WHERE 1=1
      `;
      const params = [];
      let paramIndex = 1;

      if (onlineOnly === 'true') {
        query += ` AND s.status = 'active' AND s.start_time > NOW() - INTERVAL '5 minutes'`;
      }

      if (status) {
        query += ` AND u.status = $${paramIndex++}`;
        params.push(status);
      }

      // Pasaport bekleyenleri filtrele
      if (pendingPassport === 'true') {
        query += ` AND u.id_type = 'passport' AND (u.status = 'pending' OR u.status = 'awaiting_admin_approval')`;
      }

      if (idType) {
        query += ` AND u.id_type = $${paramIndex++}`;
        params.push(idType);
      }

      if (search) {
        query += ` AND (u.full_name ILIKE $${paramIndex} OR u.phone LIKE $${paramIndex} OR u.tckn LIKE $${paramIndex} OR u.passport_no LIKE $${paramIndex} OR u.foreign_id_no LIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND u.created_at >= $${paramIndex++}`;
        params.push(startDate);
      }

      if (endDate) {
        query += ` AND u.created_at <= $${paramIndex++}`;
        params.push(endDate);
      }

      query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
      params.push(limit, offset);

      const result = await client.query(query, params);

      // Toplam sayı - COUNT için DISTINCT kullan
      let countQuery = `
        SELECT COUNT(DISTINCT u.phone) as total
        FROM users u
        ${onlineOnly === 'true' ? 'INNER JOIN sessions s ON u.phone = s.user_id' : ''}
        WHERE 1=1
      `;
      const countParams = [];
      let countParamIndex = 1;

      if (onlineOnly === 'true') {
        countQuery += ` AND s.status = 'active' AND s.start_time > NOW() - INTERVAL '5 minutes'`;
      }

      if (status) {
        countQuery += ` AND u.status = $${countParamIndex++}`;
        countParams.push(status);
      }

      if (pendingPassport === 'true') {
        countQuery += ` AND u.id_type = 'passport' AND (u.status = 'pending' OR u.status = 'awaiting_admin_approval')`;
      }

      if (idType) {
        countQuery += ` AND u.id_type = $${countParamIndex++}`;
        countParams.push(idType);
      }

      if (search) {
        countQuery += ` AND (u.full_name ILIKE $${countParamIndex} OR u.phone LIKE $${countParamIndex} OR u.tckn LIKE $${countParamIndex} OR u.passport_no LIKE $${countParamIndex} OR u.foreign_id_no LIKE $${countParamIndex})`;
        countParams.push(`%${search}%`);
        countParamIndex++;
      }

      if (startDate) {
        countQuery += ` AND u.created_at >= $${countParamIndex++}`;
        countParams.push(startDate);
      }

      if (endDate) {
        countQuery += ` AND u.created_at <= $${countParamIndex++}`;
        countParams.push(endDate);
      }

      const countResult = await client.query(countQuery, countParams);

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
         LEFT JOIN sessions s ON u.phone = s.user_id
         WHERE u.phone = $1
         GROUP BY u.phone`,
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
        'UPDATE users SET status = $1, updated_at = NOW() WHERE phone = $2',
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
        'UPDATE users SET status = $1, updated_at = NOW() WHERE phone = $2',
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
    body('quotaMb').optional({ nullable: true, checkFalsy: false }).custom((value) => {
      console.log('[set-quota] quotaMb validation - received:', value, 'type:', typeof value, 'isNaN:', isNaN(value));
      
      // undefined, null veya boş string ise geç (optional olduğu için)
      if (value === undefined || value === null || value === '') {
        console.log('[set-quota] quotaMb is empty, skipping validation');
        return true;
      }
      
      // Number'a çevir
      let numValue;
      if (typeof value === 'string') {
        // Boş string kontrolü
        if (value.trim() === '') {
          console.log('[set-quota] Empty string, skipping');
          return true;
        }
        numValue = Number(value);
        console.log('[set-quota] Converted string to number:', value, '->', numValue);
      } else if (typeof value === 'number') {
        numValue = value;
      } else {
        console.log('[set-quota] Invalid type:', typeof value);
        throw new Error('Kota MB cinsinden pozitif bir sayı olmalıdır veya -1 (sınırsız)');
      }
      
      // NaN kontrolü
      if (isNaN(numValue)) {
        console.log('[set-quota] NaN detected');
        throw new Error('Kota MB cinsinden pozitif bir sayı olmalıdır veya -1 (sınırsız)');
      }
      
      console.log('[set-quota] Final numValue:', numValue, 'type:', typeof numValue, 'is -1?', numValue === -1, 'is >= 0?', numValue >= 0);
      
      // -1 = sınırsız
      if (numValue === -1) {
        console.log('[set-quota] -1 detected, allowing unlimited');
        return true;
      }
      
      // Pozitif sayı kontrolü (0 dahil)
      if (numValue >= 0) {
        console.log('[set-quota] Valid positive number:', numValue);
        return true;
      }
      
      console.log('[set-quota] Validation FAILED - numValue:', numValue);
      throw new Error('Kota MB cinsinden pozitif bir sayı olmalıdır veya -1 (sınırsız)');
    }),
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
        // -1 = sınırsız (NULL olarak kaydedilir)
        if (quotaMb === -1 || quotaMb === null) {
          updates.push(`quota_mb = NULL`);
        } else {
          updates.push(`quota_mb = $${paramIndex++}`);
          params.push(quotaMb);
        }
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
          `UPDATE users SET ${updates.join(', ')} WHERE phone = $${paramIndex}`,
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
         WHERE phone = $1`,
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
         WHERE phone = $1 AND id_type = 'passport'`,
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
         WHERE phone = $1 AND id_type = 'passport'`,
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
    body('password').optional().isLength({ min: 8 }).withMessage('Şifre en az 8 karakter olmalıdır')
      .optional().matches(/[A-Z]/).withMessage('Şifre en az bir büyük harf içermelidir')
      .optional().matches(/[a-z]/).withMessage('Şifre en az bir küçük harf içermelidir')
      .optional().matches(/[0-9]/).withMessage('Şifre en az bir rakam içermelidir')
      .optional().matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Şifre en az bir özel karakter içermelidir'),
    body('passportNo').optional().isLength({ min: 5, max: 50 }).withMessage('Pasaport numarası 5-50 karakter arasında olmalıdır'),
    body('foreignIdNo').optional().isLength({ min: 5, max: 50 }).withMessage('Yabancı kimlik numarası 5-50 karakter arasında olmalıdır'),
    body('status').optional().isIn(['pending', 'verified', 'active', 'blocked', 'expired', 'awaiting_admin_approval']).withMessage('Geçerli bir durum seçiniz'),
    body('quotaMb')
      .optional({ nullable: true, checkFalsy: false })
      .custom((value) => {
        console.log('[PUT /users/:id] quotaMb validation - received:', value, 'type:', typeof value);
        
        // undefined, null veya boş string ise geç (optional olduğu için)
        if (value === undefined || value === null || value === '') {
          console.log('[PUT /users/:id] quotaMb is empty, skipping validation');
          return true;
        }
        
        // Number'a çevir
        let numValue;
        if (typeof value === 'string') {
          // Boş string kontrolü
          if (value.trim() === '') {
            console.log('[PUT /users/:id] Empty string, skipping');
            return true;
          }
          numValue = Number(value);
          console.log('[PUT /users/:id] Converted string to number:', value, '->', numValue);
        } else if (typeof value === 'number') {
          numValue = value;
        } else {
          console.log('[PUT /users/:id] Invalid type:', typeof value);
          throw new Error('Kota MB cinsinden pozitif bir sayı olmalıdır veya -1 (sınırsız)');
        }
        
        // NaN kontrolü
        if (isNaN(numValue)) {
          console.log('[PUT /users/:id] NaN detected');
          throw new Error('Kota MB cinsinden pozitif bir sayı olmalıdır veya -1 (sınırsız)');
        }
        
        console.log('[PUT /users/:id] Final numValue:', numValue, 'type:', typeof numValue, 'is -1?', numValue === -1, 'is >= 0?', numValue >= 0);
        
        // -1 = sınırsız
        if (numValue === -1) {
          console.log('[PUT /users/:id] -1 detected, allowing unlimited');
          return true;
        }
        
        // Pozitif sayı kontrolü (0 dahil)
        if (numValue >= 0) {
          console.log('[PUT /users/:id] Valid positive number:', numValue);
          return true;
        }
        
        console.log('[PUT /users/:id] Validation FAILED - numValue:', numValue);
        throw new Error('Kota MB cinsinden pozitif bir sayı olmalıdır veya -1 (sınırsız)');
      }),
    body('speedLimitMbps').optional().isInt({ min: 1 }).withMessage('Hız limiti Mbps cinsinden pozitif bir sayı olmalıdır')
  ],
  async (req, res, next) => {
    try {
      console.log('[PUT /users/:id] Request body:', JSON.stringify(req.body));
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('[PUT /users/:id] Validation errors:', JSON.stringify(errors.array(), null, 2));
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
        // -1 = sınırsız (NULL olarak kaydedilir)
        if (quotaMb === -1 || quotaMb === null) {
          updates.push(`quota_mb = NULL`);
        } else {
          updates.push(`quota_mb = $${paramIndex++}`);
          params.push(quotaMb);
        }
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
          `UPDATE users SET ${updates.join(', ')} WHERE phone = $${paramIndex}`,
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
        // user_id is VARCHAR (phone number), not integer
        countParams.push(String(userId));
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
        userId: userId ? (typeof userId === 'number' ? userId : parseInt(String(userId).replace(/^0+/, ''), 10)) : null, // user_id is now BIGINT
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
router.get('/logs/export', requireAdmin, async (req, res, next) => {
  try {
    console.log('[Export] Export request received:', {
      format: req.query.format,
      hasStartDate: !!req.query.startDate,
      hasEndDate: !!req.query.endDate,
      hasAction: !!req.query.action
    });
    
    const { format = 'json', startDate, endDate, action } = req.query;
    const filters = { limit: 10000 }; // Limit as integer
    
    // Only add filters if they have values
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (action && action.trim()) filters.action = action.trim();
    
    console.log('[Export] Fetching logs with filters:', JSON.stringify(filters));
    
    let logs;
    try {
      logs = await getLogs(filters);
      console.log('[Export] Fetched', logs?.length || 0, 'logs');
    } catch (dbError) {
      console.error('[Export] Database error:', dbError);
      console.error('[Export] Database error message:', dbError.message);
      console.error('[Export] Database error code:', dbError.code);
      console.error('[Export] Database error stack:', dbError.stack);
      throw dbError;
    }

    if (!Array.isArray(logs)) {
      console.error('[Export] Logs is not an array:', typeof logs, logs);
      throw new Error('Logs is not an array');
    }

    if (format === 'csv') {
      // Set headers BEFORE writing any data
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=logs_${new Date().toISOString().split('T')[0]}.csv`);
      
      // Helper function for CSV escaping
      const escapeCSV = (field) => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        // If field contains comma, quote, or newline, wrap in quotes and escape quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };
      
      try {
        // UTF-8 BOM for Excel compatibility
        res.write('\uFEFF');
        
        // CSV header
        res.write('ID,User ID,Action,IP Address,MAC Address,Created At\n');
        
        // CSV rows with proper escaping
        let rowCount = 0;
        for (const log of logs) {
          if (!log) continue; // Skip null/undefined logs
          
          try {
            const row = [
              escapeCSV(log.id),
              escapeCSV(log.user_id),
              escapeCSV(log.action),
              escapeCSV(log.ip_address),
              escapeCSV(log.mac_address),
              escapeCSV(log.created_at)
            ].join(',') + '\n';
            
            res.write(row);
            rowCount++;
          } catch (rowError) {
            console.error('[Export] Error writing row:', rowError, 'Log:', log);
            // Continue with next row
          }
        }
        
        console.log('[Export] Wrote', rowCount, 'rows to CSV');
        res.end();
      } catch (writeError) {
        console.error('[Export] Error writing CSV:', writeError);
        console.error('[Export] Write error stack:', writeError.stack);
        if (!res.headersSent) {
          return res.status(500).json({ 
            error: 'CSV yazma hatası', 
            message: process.env.NODE_ENV === 'development' ? writeError.message : 'Sunucu hatası oluştu' 
          });
        }
        // If headers already sent, we can't send JSON, so just end the response
        if (!res.finished) {
          res.end();
        }
        throw writeError;
      }
    } else {
      res.json({ logs });
    }
  } catch (error) {
    console.error('[Export] Logs export hatası:', error);
    console.error('[Export] Error stack:', error.stack);
    console.error('[Export] Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    
    // If headers haven't been sent yet, send error response
    if (!res.headersSent) {
      return res.status(500).json({ 
        error: 'Export başarısız', 
        message: process.env.NODE_ENV === 'development' ? error.message : 'Sunucu hatası oluştu',
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
      });
    }
    
    // If headers already sent, just log the error
    next(error);
  }
});

/**
 * GET /api/admin/immutable-logs
 * 5651 Kanunu uyumlu immutable erişim logları
 */
router.get('/immutable-logs', requireAdmin, async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 100, 
      userId, 
      internalIp, 
      externalIp,
      sourceIp,
      destinationIp,
      sourcePort,
      destinationPort,
      macAddress,
      protocol,
      startDate, 
      endDate,
      dateRangeStart,
      dateRangeEnd
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    const { getImmutableAccessLogs } = await import('../services/immutableLogService.js');
    const { createAdminAccessLog } = await import('../services/adminAccessLogService.js');
    
    const filters = {
      userId: userId ? (typeof userId === 'number' ? userId : parseInt(String(userId).replace(/^0+/, ''), 10)) : null, // user_id is now BIGINT
      internalIp,
      externalIp,
      sourceIp,
      destinationIp,
      sourcePort: sourcePort ? parseInt(sourcePort) : null,
      destinationPort: destinationPort ? parseInt(destinationPort) : null,
      macAddress,
      protocol,
      startDate,
      endDate,
      dateRange: (dateRangeStart && dateRangeEnd) ? {
        start: dateRangeStart,
        end: dateRangeEnd
      } : null,
      limit: parseInt(limit),
      offset: offset
    };
    
    const logs = await getImmutableAccessLogs(filters);
    
    // Admin erişim logu
    await createAdminAccessLog({
      admin_id: req.admin.id,
      action: 'view_immutable_logs',
      search_criteria: filters,
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });
    
    // Toplam sayıyı al
    const client = await pool.connect();
    try {
      let countQuery = 'SELECT COUNT(*) as total FROM immutable_access_logs WHERE 1=1';
      const countParams = [];
      let paramIndex = 1;
      
      if (userId) {
        countQuery += ` AND user_id = $${paramIndex++}`;
        // user_id is now BIGINT (integer phone number)
        const userIdValue = typeof userId === 'number' 
          ? userId 
          : parseInt(String(userId).replace(/^0+/, ''), 10); // Remove leading zeros
        if (isNaN(userIdValue)) {
          throw new Error(`Invalid userId value: ${userId}`);
        }
        countParams.push(userIdValue);
      }
      if (internalIp) {
        countQuery += ` AND internal_ip = $${paramIndex++}`;
        countParams.push(internalIp);
      }
      if (externalIp) {
        countQuery += ` AND external_ip = $${paramIndex++}`;
        countParams.push(externalIp);
      }
      if (macAddress) {
        countQuery += ` AND mac_address = $${paramIndex++}`;
        countParams.push(macAddress);
      }
      if (startDate) {
        countQuery += ` AND connection_start_time >= $${paramIndex++}`;
        countParams.push(startDate);
      }
      if (endDate) {
        countQuery += ` AND connection_end_time <= $${paramIndex++}`;
        countParams.push(endDate);
      }
      
      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);
      
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
 * GET /api/admin/immutable-logs/ip-lookup
 * "Şu IP'yi şu saatte kim kullandı?" sorgusu
 */
router.get('/immutable-logs/ip-lookup', requireAdmin, async (req, res, next) => {
  try {
    const { ip, timestamp } = req.query;
    
    if (!ip || !timestamp) {
      return res.status(400).json({ 
        error: 'IP adresi ve timestamp gereklidir' 
      });
    }
    
    const { findUserByIpAndTime } = await import('../services/immutableLogService.js');
    const { createAdminAccessLog } = await import('../services/adminAccessLogService.js');
    
    const logs = await findUserByIpAndTime(ip, new Date(timestamp));
    
    // Admin erişim logu
    await createAdminAccessLog({
      admin_id: req.admin.id,
      action: 'ip_lookup',
      search_criteria: { ip, timestamp },
      accessed_log_ids: logs.map(l => l.id),
      ip_address: req.ip,
      user_agent: req.get('user-agent')
    });
    
    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/immutable-logs/export
 * 5651 uyumlu resmi log çıktısı (PDF/CSV)
 */
router.get('/immutable-logs/export', requireAdmin, async (req, res, next) => {
  try {
    const { 
      format = 'csv', 
      startDate, 
      endDate,
      userId,
      internalIp,
      externalIp,
      macAddress
    } = req.query;
    
    const { getImmutableAccessLogs } = await import('../services/immutableLogService.js');
    const { createAdminAccessLog } = await import('../services/adminAccessLogService.js');
    
    const filters = {
      userId,
      internalIp,
      externalIp,
      sourceIp: req.query.sourceIp,
      destinationIp: req.query.destinationIp,
      sourcePort: req.query.sourcePort ? parseInt(req.query.sourcePort) : null,
      destinationPort: req.query.destinationPort ? parseInt(req.query.destinationPort) : null,
      macAddress,
      protocol: req.query.protocol,
      startDate,
      endDate,
      limit: 100000 // Export için yüksek limit
    };
    
    const logs = await getImmutableAccessLogs(filters);
    
    // Admin erişim logu (hata olsa bile devam et)
    try {
      await createAdminAccessLog({
        admin_id: req.admin.id,
        action: 'export_immutable_logs',
        search_criteria: filters,
        accessed_log_ids: logs.map(l => l.id).filter(id => id != null),
        ip_address: req.ip,
        user_agent: req.get('user-agent')
      });
    } catch (logError) {
      console.error('Admin access log oluşturma hatası (export devam ediyor):', logError);
    }
    
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=5651_logs_${new Date().toISOString().split('T')[0]}.csv`);
      
      // 5651 uyumlu CSV header
      res.write('\uFEFF'); // UTF-8 BOM
      res.write('Tarih,Saat,Kullanıcı ID,Ad Soyad,İç IP,Dış IP,Kaynak IP,Hedef IP,MAC Adresi,Gateway ID,Firewall ID,Başlangıç Zamanı,Bitiş Zamanı,Kaynak Port,Hedef Port,Protokol,Veri Transferi (Byte),Oturum Süresi (Saniye),Log Hash\n');
      
      // CSV rows
      logs.forEach(log => {
        const startTime = log.connection_start_time ? new Date(log.connection_start_time) : null;
        const endTime = log.connection_end_time ? new Date(log.connection_end_time) : null;
        const date = startTime ? startTime.toISOString().split('T')[0] : '';
        const time = startTime ? startTime.toTimeString().split(' ')[0] : '';
        
        res.write([
          date,
          time,
          log.user_id || '',
          log.full_name || '',
          log.internal_ip || '',
          log.external_ip || '',
          log.source_ip || '',
          log.destination_ip || '',
          log.mac_address || '',
          log.gateway_id || '',
          log.firewall_id || '',
          log.connection_start_time || '',
          log.connection_end_time || '',
          log.source_port || '',
          log.destination_port || '',
          log.protocol || '',
          log.data_transferred_bytes || 0,
          log.session_duration_seconds || '',
          log.log_hash || ''
        ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n');
      });
      
      res.end();
    } else {
      res.json({ 
        logs,
        export_info: {
          export_date: new Date().toISOString(),
          total_records: logs.length,
          format: '5651_kanunu_uyumlu'
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/hash-chain/verify
 * Hash chain bütünlüğünü kontrol eder
 */
router.get('/hash-chain/verify', requireAdmin, async (req, res, next) => {
  try {
    const { verifyHashChain } = await import('../services/hashChainService.js');
    const result = await verifyHashChain();
    
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/ntp-sync
 * NTP senkronizasyon durumunu kontrol eder ve günceller
 */
router.get('/ntp-sync', requireAdmin, async (req, res, next) => {
  try {
    const { checkNTPSync, syncNTP } = await import('../utils/timeUtils.js');
    const { force } = req.query;
    
    if (force === 'true') {
      // Manuel senkronizasyon
      const offset = await syncNTP();
      const status = await checkNTPSync();
      res.json({
        success: true,
        message: 'NTP senkronizasyonu güncellendi',
        offset: offset,
        ...status
      });
    } else {
      // Sadece durum kontrolü
      const status = await checkNTPSync();
      res.json({
        success: true,
        ...status
      });
    }
  } catch (error) {
    console.error('[NTP Sync] Hata:', error);
    res.status(500).json({
      success: false,
      error: 'NTP senkronizasyon kontrolü başarısız',
      message: error.message
    });
  }
});

/**
 * GET /api/admin/daily-log-files
 * Günlük log dosyalarını listeler
 */
router.get('/daily-log-files', requireAdmin, async (req, res, next) => {
  try {
    const { getDailyLogFiles } = await import('../services/dailyLogFileService.js');
    const { startDate, endDate, status } = req.query;
    
    const files = await getDailyLogFiles({
      startDate,
      endDate,
      status,
      limit: 365 // Son 1 yıl
    });
    
    res.json({ files });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/daily-log-files/seal
 * Günlük log dosyasını mühürler
 */
router.post('/daily-log-files/seal', requireAdmin, async (req, res, next) => {
  try {
    const { sealDailyLogFile } = await import('../services/dailyLogFileService.js');
    const { logDate, seal_type, seal_authority } = req.body;
    
    const result = await sealDailyLogFile(
      logDate ? new Date(logDate) : null,
      {
        seal_type: seal_type || 'manual',
        seal_authority: seal_authority || 'ADMIN'
      }
    );
    
    res.json({ success: true, seal_info: result });
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

/**
 * GET /api/admin/settings
 * Tüm ayarları getir
 */
router.get('/settings', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM settings ORDER BY key');
      const settings = {};
      result.rows.forEach(row => {
        settings[row.key] = {
          value: row.value,
          description: row.description,
          updatedAt: row.updated_at
        };
      });
      res.json({ settings });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/settings
 * Ayarları güncelle
 */
router.put('/settings',
  [
    body('inactive_timeout_hours').optional().isInt({ min: 1, max: 168 }).withMessage('Inactive timeout 1-168 saat arasında olmalıdır'),
    body('max_session_hours').optional().isInt({ min: 1, max: 720 }).withMessage('Max session 1-720 saat arasında olmalıdır'),
    body('theme').optional().isIn(['light', 'dark']).withMessage('Tema light veya dark olmalıdır')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const client = await pool.connect();
      try {
        // Güvenlik: Sadece izin verilen ayar anahtarları güncellenebilir
        const allowedSettings = [
          'inactive_timeout_hours',
          'max_session_hours',
          'theme',
          'quota_mb',
          'speed_limit_mbps'
        ];
        
        const updates = Object.keys(req.body).filter(key => allowedSettings.includes(key));
        
        if (updates.length === 0) {
          return res.status(400).json({ error: 'Geçersiz ayar anahtarı' });
        }
        
        for (const key of updates) {
          // Input validation
          const value = req.body[key];
          if (typeof value !== 'string' && typeof value !== 'number') {
            return res.status(400).json({ error: `Geçersiz değer tipi: ${key}` });
          }
          
          await client.query(
            `INSERT INTO settings (key, value, updated_by) 
             VALUES ($1, $2, $3)
             ON CONFLICT (key) 
             DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
            [key, value.toString(), req.admin.id]
          );
        }

        await createLog(null, 'settings_updated', req, { 
          adminId: req.admin.id, 
          updates: req.body 
        });

        res.json({ success: true, message: 'Ayarlar güncellendi' });
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/admin/admins
 * Admin kullanıcılarını listele
 */
router.get('/admins', async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT id, email, role, last_login, created_at FROM admin_users ORDER BY created_at DESC'
      );
      res.json({ admins: result.rows });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/admins
 * Yeni admin kullanıcısı oluştur
 */
router.post('/admins',
  [
    body('email').isEmail().withMessage('Geçerli bir e-posta adresi giriniz'),
    ...passwordValidator,
    body('role').optional().isIn(['admin', 'super_admin']).withMessage('Geçerli bir rol seçiniz')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, role = 'admin' } = req.body;
      const client = await pool.connect();
      try {
        // Email kontrolü
        const existing = await client.query('SELECT id FROM admin_users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
          return res.status(400).json({ error: 'Bu e-posta adresi zaten kullanılıyor' });
        }

        // Şifreyi hash'le
        const passwordHash = await bcrypt.hash(password, 10);

        // Admin kullanıcısı oluştur
        const result = await client.query(
          'INSERT INTO admin_users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id, email, role, created_at',
          [email, passwordHash, role]
        );

        await createLog(null, 'admin_created', req, { 
          adminId: req.admin.id, 
          newAdminEmail: email,
          newAdminRole: role
        });

        res.status(201).json({ 
          success: true, 
          message: 'Admin kullanıcısı oluşturuldu',
          admin: result.rows[0]
        });
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PUT /api/admin/admins/:id/password
 * Admin şifresini değiştir
 */
router.put('/admins/:id/password',
  [
    ...passwordValidator
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { password } = req.body;
      const adminId = parseInt(req.params.id);
      const client = await pool.connect();
      try {
        // Admin kontrolü
        const admin = await client.query('SELECT id FROM admin_users WHERE id = $1', [adminId]);
        if (admin.rows.length === 0) {
          return res.status(404).json({ error: 'Admin kullanıcısı bulunamadı' });
        }

        // Sadece kendi şifresini değiştirebilir veya super_admin olmalı
        if (req.admin.id !== adminId && req.admin.role !== 'super_admin') {
          return res.status(403).json({ error: 'Bu işlem için yetkiniz yok' });
        }

        // Şifreyi hash'le
        const passwordHash = await bcrypt.hash(password, 10);

        // Şifreyi güncelle
        await client.query(
          'UPDATE admin_users SET password_hash = $1 WHERE id = $2',
          [passwordHash, adminId]
        );

        await createLog(null, 'admin_password_changed', req, { 
          adminId: req.admin.id, 
          targetAdminId: adminId
        });

        res.json({ success: true, message: 'Şifre değiştirildi' });
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/admin/admins/:id
 * Admin kullanıcısını sil
 */
router.delete('/admins/:id', async (req, res, next) => {
  try {
    const adminId = parseInt(req.params.id);
    const client = await pool.connect();
    try {
      // Super admin kontrolü
      if (req.admin.role !== 'super_admin') {
        return res.status(403).json({ error: 'Bu işlem için super_admin yetkisi gereklidir' });
      }

      // Kendini silemez
      if (req.admin.id === adminId) {
        return res.status(400).json({ error: 'Kendi hesabınızı silemezsiniz' });
      }

      // Admin kontrolü
      const admin = await client.query('SELECT id, email FROM admin_users WHERE id = $1', [adminId]);
      if (admin.rows.length === 0) {
        return res.status(404).json({ error: 'Admin kullanıcısı bulunamadı' });
      }

      // Admin'i sil
      await client.query('DELETE FROM admin_users WHERE id = $1', [adminId]);

      await createLog(null, 'admin_deleted', req, { 
        adminId: req.admin.id, 
        deletedAdminEmail: admin.rows[0].email
      });

      res.json({ success: true, message: 'Admin kullanıcısı silindi' });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

export default router;

