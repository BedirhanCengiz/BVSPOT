import { redisClient } from '../server.js';
import { pool } from '../database/db.js';
import { sendSMS } from './smsService.js';

const OTP_LENGTH = parseInt(process.env.OTP_LENGTH) || 6;
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES) || 3;
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS) || 5;

/**
 * 6 haneli rastgele OTP kodu üretir
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * OTP kodunu Redis'e kaydeder
 */
async function storeOTP(phone, code) {
  const key = `otp:${phone}`;
  const expirySeconds = OTP_EXPIRY_MINUTES * 60;
  
  await redisClient.setEx(key, expirySeconds, JSON.stringify({
    code,
    attempts: 0,
    createdAt: new Date().toISOString()
  }));
}

/**
 * OTP kodunu doğrular
 */
export async function verifyOTP(phone, code) {
  const key = `otp:${phone}`;
  const stored = await redisClient.get(key);

  if (!stored) {
    return {
      success: false,
      error: 'OTP kodu bulunamadı veya süresi dolmuş'
    };
  }

  const data = JSON.parse(stored);
  
  // Maksimum deneme sayısı kontrolü
  if (data.attempts >= OTP_MAX_ATTEMPTS) {
    await redisClient.del(key);
    return {
      success: false,
      error: 'Maksimum deneme sayısına ulaşıldı. Lütfen yeni kod talep edin.'
    };
  }

  // Kod kontrolü
  if (data.code !== code) {
    data.attempts += 1;
    await redisClient.setEx(key, OTP_EXPIRY_MINUTES * 60, JSON.stringify(data));
    
    return {
      success: false,
      error: 'OTP kodu hatalı',
      attemptsLeft: OTP_MAX_ATTEMPTS - data.attempts
    };
  }

  // Başarılı doğrulama - OTP'yi sil ve veritabanına kaydet
  await redisClient.del(key);
  
  // Veritabanına kaydet
  const client = await pool.connect();
  try {
    // SQL Injection koruması - parametreli sorgu kullan
    await client.query(
      `INSERT INTO otp_codes (phone, code, verified, expires_at) 
       VALUES ($1, $2, true, NOW() + INTERVAL '1 minute' * $3)`,
      [phone, code, OTP_EXPIRY_MINUTES]
    );
  } finally {
    client.release();
  }

  return {
    success: true,
    message: 'OTP kodu doğrulandı'
  };
}

/**
 * OTP kodunu gönderir
 */
export async function sendOTP(phone) {
  try {
    // Rate limiting kontrolü - aynı telefon için 1 dakikada 1 OTP
    const rateLimitKey = `otp:rate:${phone}`;
    const rateLimit = await redisClient.get(rateLimitKey);
    
    if (rateLimit) {
      return {
        success: false,
        error: 'Lütfen bir dakika bekleyip tekrar deneyin'
      };
    }

    // OTP üret
    const code = generateOTP();

    // Redis'e kaydet
    await storeOTP(phone, code);

    // Rate limiting için 1 dakika bekleme
    await redisClient.setEx(rateLimitKey, 60, '1');

    // SMS gönder
    const smsResult = await sendSMS(phone, `BVSPOT doğrulama kodunuz: ${code}. Bu kod ${OTP_EXPIRY_MINUTES} dakika geçerlidir.`);

    if (!smsResult.success) {
      // SMS gönderilemezse bile OTP'yi kaydet (test için)
      console.error('SMS gönderilemedi:', smsResult.error);
      // Test ortamında OTP'yi logla
      if (process.env.NODE_ENV === 'development') {
        console.log(`[TEST] OTP for ${phone}: ${code}`);
      }
    }

    // Veritabanına kaydet
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO otp_codes (phone, code, expires_at) 
         VALUES ($1, $2, NOW() + INTERVAL '${OTP_EXPIRY_MINUTES} minutes')`,
        [phone, code]
      );
    } finally {
      client.release();
    }

    return {
      success: true,
      message: 'OTP kodu gönderildi',
      // Test ortamında kodu döndür
      ...(process.env.NODE_ENV === 'development' && { code })
    };
  } catch (error) {
    console.error('OTP gönderme hatası:', error);
    return {
      success: false,
      error: 'OTP gönderilirken bir hata oluştu'
    };
  }
}

/**
 * OTP kodunu kontrol eder (sadece kontrol, silmez)
 */
export async function checkOTP(phone) {
  const key = `otp:${phone}`;
  const stored = await redisClient.get(key);
  
  if (!stored) {
    return { exists: false };
  }

  const data = JSON.parse(stored);
  return {
    exists: true,
    attempts: data.attempts,
    expiresAt: new Date(Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000))
  };
}

