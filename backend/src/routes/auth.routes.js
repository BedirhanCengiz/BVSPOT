import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { pool } from '../database/db.js';
import { validateTCKN } from '../utils/tcknValidator.js';
import { verifyTCKN } from '../services/tcknVerificationService.js';
import { sendOTP, verifyOTP } from '../services/otpService.js';
import { generateToken } from '../middleware/auth.js';
import { createLog } from '../services/logService.js';
import { registerRateLimiter, otpRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * POST /api/auth/register
 * Kullanıcı kayıt endpoint'i
 */
router.post('/register',
  registerRateLimiter,
  [
    body('fullName').trim().isLength({ min: 3, max: 255 }).withMessage('Ad Soyad 3-255 karakter arasında olmalıdır'),
    body('phone').matches(/^[0-9]{10,11}$/).withMessage('Geçerli bir telefon numarası giriniz'),
    body('idType').isIn(['tckn', 'passport', 'foreign_id']).withMessage('Geçerli bir kimlik tipi seçiniz'),
    body('tckn').optional().matches(/^[0-9]{11}$/).withMessage('TCKN 11 haneli olmalıdır'),
    body('passportNo').optional().isLength({ min: 5, max: 50 }).withMessage('Pasaport numarası 5-50 karakter arasında olmalıdır'),
    body('foreignIdNo').optional().isLength({ min: 5, max: 50 }).withMessage('Yabancı kimlik numarası 5-50 karakter arasında olmalıdır'),
    body('password').optional().isLength({ min: 6 }).withMessage('Şifre en az 6 karakter olmalıdır'),
    body('birthDate').isISO8601().withMessage('Geçerli bir doğum tarihi giriniz'),
    body('language').optional().isIn(['tr', 'en']).withMessage('Geçerli bir dil seçiniz'),
    body('kvkkAccepted').equals('true').withMessage('KVKK onayı zorunludur'),
    body('termsAccepted').equals('true').withMessage('Kullanım koşulları onayı zorunludur'),
    body('macAddress').optional({ nullable: true, checkFalsy: true }).custom((value) => {
      if (!value || value === 'null' || value === 'undefined') return true;
      if (/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/.test(value)) return true;
      throw new Error('Geçerli bir MAC adresi giriniz');
    })
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { 
        fullName, 
        phone, 
        idType, 
        tckn, 
        passportNo, 
        foreignIdNo, 
        password,
        birthDate, 
        language,
        kvkkAccepted, 
        termsAccepted, 
        macAddress: bodyMacAddress, 
        ipAddress 
      } = req.body;

      // MAC adresini otomatik çek (middleware'den veya body'den)
      const macAddress = req.macAddress || bodyMacAddress || null;

      // Kimlik tipine göre doğrulama
      let idValue = null;
      if (idType === 'tckn') {
        if (!tckn) {
          return res.status(400).json({ error: 'TCKN gereklidir' });
        }
        
        // TCKN ve doğum tarihi ile gerçek kişi kontrolü
        const tcknValidation = await verifyTCKN(tckn, birthDate, fullName);
        if (!tcknValidation.valid) {
          await createLog(null, 'register_failed_tckn', req, { 
            tckn, 
            birthDate,
            errors: tcknValidation.errors,
            verified: tcknValidation.verified 
          });
          return res.status(400).json({
            error: 'TCKN doğrulama hatası',
            details: tcknValidation.errors,
            verified: tcknValidation.verified
          });
        }
        
        // Gerçek API'den doğrulanmadıysa uyarı logla (opsiyonel)
        if (!tcknValidation.verified) {
          console.warn(`[TCKN Verification] TCKN ${tckn} sadece algoritmik kontrol ile doğrulandı`);
        }
        
        idValue = tckn;
      } else if (idType === 'passport') {
        if (!passportNo) {
          return res.status(400).json({ error: 'Pasaport numarası gereklidir' });
        }
        idValue = passportNo;
      } else if (idType === 'foreign_id') {
        if (!foreignIdNo) {
          return res.status(400).json({ error: 'Yabancı kimlik numarası gereklidir' });
        }
        idValue = foreignIdNo;
      }

      // Şifre hash'leme
      let passwordHash = null;
      if (password) {
        passwordHash = await bcrypt.hash(password, 10);
      }

      // Kullanıcı zaten kayıtlı mı kontrol et
      const client = await pool.connect();
      try {
        let existingQuery = 'SELECT id, status FROM users WHERE phone = $1';
        let existingParams = [phone];
        
        if (idType === 'tckn' && tckn) {
          existingQuery += ' OR tckn = $2';
          existingParams.push(tckn);
        } else if (idType === 'passport' && passportNo) {
          existingQuery += ' OR passport_no = $2';
          existingParams.push(passportNo);
        } else if (idType === 'foreign_id' && foreignIdNo) {
          existingQuery += ' OR foreign_id_no = $2';
          existingParams.push(foreignIdNo);
        }
        
        const existingUser = await client.query(existingQuery, existingParams);

        if (existingUser.rows.length > 0) {
          const user = existingUser.rows[0];
          
          // Eğer MAC adresi eşleşiyorsa ve kullanıcı aktifse, direkt erişim ver
          if (macAddress && user.status === 'active') {
            const macMatch = await client.query(
              'SELECT id FROM users WHERE mac_address = $1 AND id = $2',
              [macAddress, user.id]
            );
            
            if (macMatch.rows.length > 0) {
              await createLog(user.id, 'auto_login_mac', req, { macAddress });
              const token = generateToken(user.id);
              return res.json({
                success: true,
                message: 'Otomatik giriş başarılı',
                token,
                user: {
                  id: user.id,
                  fullName: user.full_name,
                  status: user.status
                }
              });
            }
          }

          // Kullanıcı varsa ama OTP doğrulanmamışsa, OTP gönder
          if (user.status === 'pending') {
            await createLog(user.id, 'register_retry', req, { phone });
            return res.json({
              success: true,
              message: 'Kullanıcı kayıtlı, OTP gönderiliyor',
              requiresOTP: true,
              userId: user.id
            });
          }

          return res.status(409).json({
            error: 'Bu telefon numarası veya TCKN ile zaten kayıt yapılmış'
          });
        }

        // Pasaport kayıtları için status = 'pending' (admin onayı gerekli)
        // Diğerleri için status = 'pending' (OTP doğrulaması gerekli)
        const initialStatus = idType === 'passport' ? 'pending' : 'pending';

        // Yeni kullanıcı kaydı
        const result = await client.query(
          `INSERT INTO users (
            full_name, phone, id_type, tckn, passport_no, foreign_id_no, 
            birth_date, password_hash, mac_address, ip_address, 
            kvkk_accepted, terms_accepted, language, status
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING id, full_name, phone, status, language, id_type`,
          [
            fullName, 
            phone, 
            idType,
            idType === 'tckn' ? tckn : null,
            idType === 'passport' ? passportNo : null,
            idType === 'foreign_id' ? foreignIdNo : null,
            birthDate, 
            passwordHash,
            macAddress || null, 
            ipAddress || req.ip, 
            kvkkAccepted === 'true', 
            termsAccepted === 'true',
            language || 'tr',
            initialStatus
          ]
        );

        const newUser = result.rows[0];
        const maskedId = idValue ? idValue.substring(0, 5) + '****' : '****';
        await createLog(newUser.id, 'register_success', req, { phone, idType, idValue: maskedId });

        // Pasaport kayıtları için admin onayı mesajı
        if (idType === 'passport') {
          return res.json({
            success: true,
            message: 'Pasaport kaydınız admin onayına gönderildi',
            userId: newUser.id,
            requiresApproval: true,
            hasPassword: !!passwordHash
          });
        }

        res.json({
          success: true,
          message: 'Kayıt başarılı, OTP kodu gönderiliyor',
          userId: newUser.id,
          requiresOTP: true,
          hasPassword: !!passwordHash
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
 * POST /api/auth/validate-tckn
 * TCKN doğrulama endpoint'i (ayrı endpoint olarak)
 */
router.post('/validate-tckn',
  [
    body('tckn').matches(/^[0-9]{11}$/).withMessage('TCKN 11 haneli olmalıdır'),
    body('birthDate').isISO8601().withMessage('Geçerli bir doğum tarihi giriniz')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { tckn, birthDate, fullName } = req.body;
      
      // TCKN ve doğum tarihi ile gerçek kişi kontrolü
      const validation = await verifyTCKN(tckn, birthDate, fullName);

      res.json(validation);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/send-otp
 * OTP gönderme endpoint'i
 */
router.post('/send-otp',
  otpRateLimiter,
  [
    body('phone').matches(/^[0-9]{10,11}$/).withMessage('Geçerli bir telefon numarası giriniz'),
    body('userId').optional().isInt().withMessage('Geçerli bir kullanıcı ID giriniz')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone, userId } = req.body;

      // Kullanıcı kontrolü
      if (userId) {
        const client = await pool.connect();
        try {
          const userCheck = await client.query('SELECT id, phone FROM users WHERE id = $1', [userId]);
          if (userCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
          }
          if (userCheck.rows[0].phone !== phone) {
            return res.status(400).json({ error: 'Telefon numarası eşleşmiyor' });
          }
        } finally {
          client.release();
        }
      }

      const result = await sendOTP(phone);
      
      if (result.success) {
        await createLog(userId || null, 'otp_sent', req, { phone });
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/verify-otp
 * OTP doğrulama endpoint'i
 */
router.post('/verify-otp',
  [
    body('phone').matches(/^[0-9]{10,11}$/).withMessage('Geçerli bir telefon numarası giriniz'),
    body('code').matches(/^[0-9]{6}$/).withMessage('OTP kodu 6 haneli olmalıdır'),
    body('userId').isInt().withMessage('Kullanıcı ID gerekli')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone, code, userId } = req.body;

      // Kullanıcı kontrolü
      const client = await pool.connect();
      let user;
      try {
        const userResult = await client.query('SELECT * FROM users WHERE id = $1 AND phone = $2', [userId, phone]);
        if (userResult.rows.length === 0) {
          return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
        }
        user = userResult.rows[0];
      } finally {
        client.release();
      }

      // OTP doğrulama
      const otpResult = await verifyOTP(phone, code);

      if (!otpResult.success) {
        await createLog(userId, 'otp_verify_failed', req, { phone, error: otpResult.error });
        return res.status(400).json(otpResult);
      }

      // Kullanıcıyı aktif yap (internet erişimi için)
      const updateClient = await pool.connect();
      try {
        await updateClient.query(
          `UPDATE users 
           SET status = 'active', 
               connection_start_time = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [userId]
        );

        // MAC adresini otomatik çek (middleware'den veya user'dan)
        const sessionMacAddress = req.macAddress || user.mac_address || null;

        // Session oluştur
        await updateClient.query(
          `INSERT INTO sessions (user_id, mac_address, ip_address, status)
           VALUES ($1, $2, $3, 'active')
           ON CONFLICT DO NOTHING`,
          [userId, sessionMacAddress, req.ip]
        );
      } finally {
        updateClient.release();
      }

      // Token oluştur
      const token = generateToken(userId);

      await createLog(userId, 'otp_verify_success', req, { phone });

      res.json({
        success: true,
        message: 'Doğrulama başarılı',
        token,
        user: {
          id: user.id,
          fullName: user.full_name,
          phone: user.phone,
          status: 'active',
          quotaMb: user.quota_mb,
          speedLimitMbps: user.speed_limit_mbps,
          language: user.language || 'tr'
        },
        redirectUrl: process.env.SUCCESS_REDIRECT_URL || 'https://google.com'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Kullanıcı giriş endpoint'i
 */
router.post('/login',
  [
    body('idType').isIn(['tckn', 'passport', 'foreign_id']).withMessage('Geçerli bir kimlik tipi seçiniz'),
    body('idNumber').notEmpty().withMessage('Kimlik numarası gereklidir'),
    body('phone').matches(/^[0-9]{10,11}$/).withMessage('Geçerli bir telefon numarası giriniz'),
    body('password').notEmpty().withMessage('Şifre gereklidir')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { idType, idNumber, phone, password, macAddress: bodyMacAddress } = req.body;

      // MAC adresini otomatik çek (middleware'den veya body'den)
      const macAddress = req.macAddress || bodyMacAddress || null;

      const client = await pool.connect();
      try {
        // Kimlik tipine göre kullanıcıyı bul
        let query = 'SELECT * FROM users WHERE phone = $1';
        let params = [phone];
        
        if (idType === 'tckn') {
          query += ' AND tckn = $2';
          params.push(idNumber);
        } else if (idType === 'passport') {
          query += ' AND passport_no = $2';
          params.push(idNumber);
        } else if (idType === 'foreign_id') {
          query += ' AND foreign_id_no = $2';
          params.push(idNumber);
        }

        const result = await client.query(query, params);

        if (result.rows.length === 0) {
          await createLog(null, 'login_failed', req, { phone, idType, reason: 'user_not_found' });
          return res.status(401).json({ error: 'Kimlik bilgileri veya şifre hatalı' });
        }

        const user = result.rows[0];

        // Şifre kontrolü
        if (!user.password_hash) {
          return res.status(400).json({ 
            error: 'Bu kullanıcı için şifre tanımlanmamış. Lütfen kayıt olun veya OTP ile giriş yapın.' 
          });
        }

        const isValid = await bcrypt.compare(password, user.password_hash);

        if (!isValid) {
          await createLog(user.id, 'login_failed', req, { phone, idType, reason: 'invalid_password' });
          return res.status(401).json({ error: 'Kimlik bilgileri veya şifre hatalı' });
        }

        // Kullanıcı durumu kontrolü
        if (user.status === 'blocked') {
          await createLog(user.id, 'login_blocked', req, { phone });
          return res.status(403).json({ error: 'Hesabınız engellenmiş' });
        }

        // Pasaport kullanıcıları için admin onayı kontrolü
        if (user.id_type === 'passport' && user.status === 'pending') {
          await createLog(user.id, 'login_pending_approval', req, { phone });
          return res.status(403).json({ 
            error: 'Pasaport kaydınız admin onayı bekliyor. Lütfen onaylandıktan sonra tekrar deneyin.' 
          });
        }

        // MAC adresi güncelle
        if (macAddress) {
          await client.query(
            'UPDATE users SET mac_address = $1, ip_address = $2, updated_at = NOW() WHERE id = $3',
            [macAddress, req.ip, user.id]
          );
        }

        // Kullanıcıyı aktif yap
        await client.query(
          `UPDATE users 
           SET status = 'active', 
               connection_start_time = NOW(),
               updated_at = NOW()
           WHERE id = $1`,
          [user.id]
        );

        // MAC adresini otomatik çek (middleware'den veya body'den)
        const sessionMacAddress = macAddress || user.mac_address || null;

        // Session oluştur
        await client.query(
          `INSERT INTO sessions (user_id, mac_address, ip_address, status)
           VALUES ($1, $2, $3, 'active')
           ON CONFLICT DO NOTHING`,
          [user.id, sessionMacAddress, req.ip]
        );

        // Token oluştur
        const token = generateToken(user.id);

        await createLog(user.id, 'login_success', req, { phone, idType });

        res.json({
          success: true,
          message: 'Giriş başarılı',
          token,
          user: {
            id: user.id,
            fullName: user.full_name,
            phone: user.phone,
            status: 'active',
            quotaMb: user.quota_mb,
            speedLimitMbps: user.speed_limit_mbps,
            language: user.language || 'tr'
          },
          redirectUrl: process.env.SUCCESS_REDIRECT_URL || 'https://google.com'
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
 * POST /api/auth/admin-login
 * Admin giriş endpoint'i
 */
router.post('/admin-login',
  [
    body('email').isEmail().withMessage('Geçerli bir e-posta adresi giriniz'),
    body('password').notEmpty().withMessage('Şifre gerekli')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      const client = await pool.connect();
      try {
        const result = await client.query('SELECT * FROM admin_users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
          return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
        }

        const admin = result.rows[0];
        const isValid = await bcrypt.compare(password, admin.password_hash);

        if (!isValid) {
          await createLog(null, 'admin_login_failed', req, { email });
          return res.status(401).json({ error: 'E-posta veya şifre hatalı' });
        }

        // Son giriş zamanını güncelle
        await client.query('UPDATE admin_users SET last_login = NOW() WHERE id = $1', [admin.id]);

        const { generateAdminToken } = await import('../middleware/auth.js');
        const token = generateAdminToken(admin.id, admin.role);

        await createLog(null, 'admin_login_success', req, { email, adminId: admin.id });

        res.json({
          success: true,
          token,
          admin: {
            id: admin.id,
            email: admin.email,
            role: admin.role
          }
        });
      } finally {
        client.release();
      }
    } catch (error) {
      next(error);
    }
  }
);

export default router;

