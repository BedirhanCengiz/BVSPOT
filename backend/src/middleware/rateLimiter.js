import rateLimit from 'express-rate-limit';

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 dakika
const MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;

export const rateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX_REQUESTS,
  message: {
    error: 'Çok fazla istek gönderildi. Lütfen daha sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// OTP gönderme için özel rate limiter (daha sıkı)
export const otpRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 dakika
  max: 1, // 1 dakikada 1 istek
  message: {
    error: 'Lütfen bir dakika bekleyip tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Register için özel rate limiter
export const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 dakika
  max: 5, // 15 dakikada 5 kayıt
  message: {
    error: 'Çok fazla kayıt denemesi. Lütfen daha sonra tekrar deneyin.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

