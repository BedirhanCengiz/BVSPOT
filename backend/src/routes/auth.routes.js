import express from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { pool } from '../database/db.js';
import { validateTCKN } from '../utils/tcknValidator.js';
import { verifyTCKN } from '../services/tcknVerificationService.js';
import { sendOTP, verifyOTP } from '../services/otpService.js';
import { authenticateToken, generateToken } from '../middleware/auth.js';
import { buildFortiRelease } from '../services/fortiGateService.js';
import { createLog } from '../services/logService.js';
import { registerRateLimiter, otpRateLimiter } from '../middleware/rateLimiter.js';
import { passwordValidator } from '../middleware/security.js';

const router = express.Router();

function isIpv4(ip) {
  return typeof ip === 'string' && /^(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(ip);
}

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
    ...passwordValidator,
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
            error: 'TCKN geçersiz',
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

      // Şifre hash'leme (artık zorunlu)
      const passwordHash = await bcrypt.hash(password, 10);

      // Kullanıcı zaten kayıtlı mı kontrol et
      const client = await pool.connect();
      try {
        let existingQuery = 'SELECT phone, status FROM users WHERE phone = $1';
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
              'SELECT phone FROM users WHERE mac_address = $1 AND phone = $2',
              [macAddress, user.phone]
            );
            
            if (macMatch.rows.length > 0) {
              await createLog(user.phone, 'auto_login_mac', req, { macAddress });
              const token = generateToken(user.phone);
              return res.json({
                success: true,
                message: 'Otomatik giriş başarılı',
                token,
                user: {
                  id: user.phone,
                  phone: user.phone,
                  fullName: user.full_name,
                  status: user.status
                }
              });
            }
          }

          // Kullanıcı varsa ama OTP doğrulanmamışsa, OTP gönder
          if (user.status === 'pending') {
            await createLog(user.phone, 'register_retry', req, { phone });
            return res.json({
              success: true,
              message: 'Kullanıcı kayıtlı, OTP gönderiliyor',
              requiresOTP: true,
              userId: user.phone
            });
          }

          return res.status(409).json({
            error: 'Bu telefon numarası veya TCKN ile zaten kayıt yapılmış'
          });
        }

        // Pasaport kayıtları için status = 'pending' (admin onayı gerekli)
        // Diğerleri için status = 'pending' (OTP doğrulaması gerekli)
        const initialStatus = idType === 'passport' ? 'pending' : 'pending';

        // Yeni kullanıcı kaydı - varsayılan olarak sınırsız kota (NULL)
        const result = await client.query(
          `INSERT INTO users (
            full_name, phone, id_type, tckn, passport_no, foreign_id_no, 
            birth_date, password_hash, mac_address, ip_address, 
            kvkk_accepted, terms_accepted, language, status, quota_mb
          )
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           RETURNING phone, full_name, phone as id, status, language, id_type`,
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
            initialStatus,
            null // quota_mb = NULL (sınırsız)
          ]
        );

        const newUser = result.rows[0];
        const maskedId = idValue ? idValue.substring(0, 5) + '****' : '****';
        await createLog(newUser.phone, 'register_success', req, { phone, idType, idValue: maskedId });
        
        // KVKK onay kayıtları (detaylı)
        if (kvkkAccepted === 'true') {
          try {
            const { createKVKKConsent } = await import('../services/kvkkConsentService.js');
            // KVKK metni versiyonu (settings'ten veya sabit değer)
            const kvkkVersion = process.env.KVKK_VERSION || '1.0';
            const kvkkText = process.env.KVKK_TEXT || 'KVKK Aydınlatma Metni'; // Production'da gerçek metin olmalı
            
            await createKVKKConsent({
              user_id: newUser.phone,
              consent_type: 'kvkk',
              consent_version: kvkkVersion,
              consent_text: kvkkText,
              ip_address: req.ip,
              user_agent: req.get('user-agent')
            });
          } catch (consentError) {
            console.error('KVKK onay kaydı hatası:', consentError);
          }
        }
        
        if (termsAccepted === 'true') {
          try {
            const { createKVKKConsent } = await import('../services/kvkkConsentService.js');
            const termsVersion = process.env.TERMS_VERSION || '1.0';
            const termsText = process.env.TERMS_TEXT || 'Kullanım Şartları'; // Production'da gerçek metin olmalı
            
            await createKVKKConsent({
              user_id: newUser.phone,
              consent_type: 'terms',
              consent_version: termsVersion,
              consent_text: termsText,
              ip_address: req.ip,
              user_agent: req.get('user-agent')
            });
          } catch (consentError) {
            console.error('Kullanım şartları onay kaydı hatası:', consentError);
          }
        }
        
        // 5651 Kanunu bilgilendirme onayı
        try {
          const { createKVKKConsent } = await import('../services/kvkkConsentService.js');
          const law5651Version = process.env.LAW5651_VERSION || '1.0';
          const law5651Text = process.env.LAW5651_TEXT || '5651 sayılı kanun kapsamında log tutulduğuna dair bilgilendirme';
          
          await createKVKKConsent({
            user_id: newUser.phone,
            consent_type: 'law5651',
            consent_version: law5651Version,
            consent_text: law5651Text,
            ip_address: req.ip,
            user_agent: req.get('user-agent')
          });
        } catch (consentError) {
          console.error('5651 bilgilendirme onay kaydı hatası:', consentError);
        }

        // Pasaport kayıtları için admin onayı mesajı
        if (idType === 'passport') {
          return res.json({
            success: true,
            message: 'Pasaport kaydınız admin onayına gönderildi',
            userId: newUser.phone,
            requiresApproval: true,
            hasPassword: !!passwordHash
          });
        }

        res.json({
          success: true,
          message: 'Kayıt başarılı, OTP kodu gönderiliyor',
          userId: newUser.phone,
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
    body('userId').optional().matches(/^[0-9]{10,11}$/).withMessage('Geçerli bir telefon numarası giriniz')
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
          const userCheck = await client.query('SELECT phone FROM users WHERE phone = $1', [userId]);
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
    body('userId').matches(/^[0-9]{10,11}$/).withMessage('Geçerli bir telefon numarası giriniz')
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
        const userResult = await client.query('SELECT * FROM users WHERE phone = $1', [phone]);
        if (userResult.rows.length === 0 || userResult.rows[0].phone !== userId) {
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
        
        // İç IP ve dış IP ayrımı (basit implementasyon - production'da DHCP/NAT'tan alınmalı)
        const internalIp = req.ip || user.ip_address || null;
        const externalIp = req.headers['x-forwarded-for'] || req.ip || null; // NAT sonrası IP
        const gatewayId = req.headers['x-gateway-id'] || process.env.GATEWAY_ID || null;
        const firewallId = req.headers['x-firewall-id'] || process.env.FIREWALL_ID || null;

        // Session oluştur (5651 uyumlu)
        const sessionResult = await updateClient.query(
          `INSERT INTO sessions (user_id, mac_address, internal_ip, external_ip, ip_address, gateway_id, firewall_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           RETURNING id`,
          [userId, sessionMacAddress, internalIp, externalIp, internalIp, gatewayId, firewallId]
        );
        
        const sessionId = sessionResult.rows[0]?.id;
        
        // Immutable access log oluştur (5651 Kanunu)
        if (sessionId) {
          try {
            const { logSessionStart } = await import('../services/immutableLogService.js');
            await logSessionStart({
              user_id: userId,
              session_id: sessionId,
              internal_ip: internalIp,
              external_ip: externalIp,
              mac_address: sessionMacAddress,
              gateway_id: gatewayId,
              firewall_id: firewallId,
              start_time: new Date()
            });
            
            // Günlük log dosyasına ekle
            const { appendToDailyLogFile } = await import('../services/dailyLogFileService.js');
            // Bu async olarak çalışabilir, hata durumunda log oluşturma başarısız olmasın
            appendToDailyLogFile(sessionId, new Date()).catch(err => 
              console.error('Günlük log dosyasına ekleme hatası:', err)
            );
          } catch (logError) {
            console.error('Immutable log oluşturma hatası:', logError);
            // Log hatası session oluşturmayı engellemesin
          }
        }
      } finally {
        updateClient.release();
      }

      // Token oluştur
      const token = generateToken(phone);

      await createLog(phone, 'otp_verify_success', req, { phone });

      res.json({
        success: true,
        message: 'Doğrulama başarılı',
        token,
        user: {
          id: user.phone,
          phone: user.phone,
          fullName: user.full_name,
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
    body('phone').matches(/^[0-9]{10,11}$/).withMessage('Geçerli bir telefon numarası giriniz'),
    body('password').notEmpty().withMessage('Şifre gereklidir')
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { phone, password, macAddress: bodyMacAddress, userIp } = req.body;

      // MAC adresini otomatik çek (middleware'den veya body'den)
      const macAddress = req.macAddress || bodyMacAddress || null;

      const client = await pool.connect();
      try {
        // Sadece telefon numarası ile kullanıcıyı bul
        const result = await client.query('SELECT * FROM users WHERE phone = $1', [phone]);

        if (result.rows.length === 0) {
          await createLog(null, 'login_failed', req, { phone, reason: 'user_not_found' });
          return res.status(401).json({ error: 'Telefon numarası veya şifre hatalı' });
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
          await createLog(user.phone, 'login_failed', req, { phone, reason: 'invalid_password' });
          return res.status(401).json({ error: 'Telefon numarası veya şifre hatalı' });
        }

        // Kullanıcı durumu kontrolü
        if (user.status === 'blocked') {
          await createLog(user.phone, 'login_blocked', req, { phone });
          return res.status(403).json({ error: 'Hesabınız engellenmiş' });
        }

        // Pasaport kullanıcıları için admin onayı kontrolü
        if (user.id_type === 'passport' && user.status === 'pending') {
          await createLog(user.phone, 'login_pending_approval', req, { phone });
          return res.status(403).json({ 
            error: 'Pasaport kaydınız admin onayı bekliyor. Lütfen onaylandıktan sonra tekrar deneyin.' 
          });
        }

        const guestIp = isIpv4(userIp) ? userIp : null;

        // MAC adresi güncelle
        if (macAddress) {
          await client.query(
            'UPDATE users SET mac_address = $1, ip_address = $2, updated_at = NOW() WHERE phone = $3',
            [macAddress, guestIp || req.ip, user.phone]
          );
        }

        // Kullanıcıyı aktif yap
        await client.query(
          `UPDATE users 
           SET status = 'active', 
               connection_start_time = NOW(),
               updated_at = NOW()
           WHERE phone = $1`,
          [user.phone]
        );

        // MAC adresini otomatik çek (middleware'den veya body'den)
        const sessionMacAddress = macAddress || user.mac_address || null;

        const internalIp = guestIp || req.ip || user.ip_address || null;
        const externalIp = req.headers['x-forwarded-for'] || req.ip || null;
        const gatewayId = req.headers['x-gateway-id'] || process.env.GATEWAY_ID || null;
        const firewallId = req.headers['x-firewall-id'] || process.env.FIREWALL_ID || null;

        // Session oluştur (5651 uyumlu)
        const sessionResult = await client.query(
          `INSERT INTO sessions (user_id, mac_address, internal_ip, external_ip, ip_address, gateway_id, firewall_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
           RETURNING id`,
          [user.phone, sessionMacAddress, internalIp, externalIp, internalIp, gatewayId, firewallId]
        );
        
        const sessionId = sessionResult.rows[0]?.id;
        
        // Immutable access log oluştur (5651 Kanunu)
        if (sessionId) {
          try {
            const { logSessionStart } = await import('../services/immutableLogService.js');
            const immutableLogId = await logSessionStart({
              user_id: user.phone,
              session_id: sessionId,
              internal_ip: internalIp,
              external_ip: externalIp,
              mac_address: sessionMacAddress,
              gateway_id: gatewayId,
              firewall_id: firewallId,
              start_time: new Date()
            });
            
            // Günlük log dosyasına ekle
            const { appendToDailyLogFile } = await import('../services/dailyLogFileService.js');
            // Bu async olarak çalışabilir, hata durumunda log oluşturma başarısız olmasın
            appendToDailyLogFile(immutableLogId, new Date()).catch(err => 
              console.error('Günlük log dosyasına ekleme hatası:', err)
            );
          } catch (logError) {
            console.error('Immutable log oluşturma hatası:', logError);
            // Log hatası session oluşturmayı engellemesin
          }
        }

        // Token oluştur
        const token = generateToken(user.phone);

        await createLog(user.phone, 'login_success', req, { phone, idType: user.id_type });

        res.json({
          success: true,
          message: 'Giriş başarılı',
          token,
          user: {
            id: user.phone,
            phone: user.phone,
            fullName: user.full_name,
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
 * POST /api/auth/fortigate/release
 * Giriş doğrulandıktan sonra tarayıcının FortiGate fgtauth adresine
 * göndereceği formu döndürür. Parola yalnızca başarılı kullanıcı token'ı ile verilir.
 */
router.post('/fortigate/release', authenticateToken, (req, res) => {
  try {
    const result = buildFortiRelease({
      postUrl: req.body?.post,
      magic: req.body?.magic,
    });
    res.json(result);
  } catch (error) {
    res.status(error.status || 500).json({ error: error.message || 'FortiGate oturumu açılamadı' });
  }
});

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

