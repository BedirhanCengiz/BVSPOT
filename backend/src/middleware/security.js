import { body } from 'express-validator';
import validator from 'validator';

/**
 * CSRF koruması - API için token tabanlı authentication kullanıldığı için
 * CSRF koruması gerekli değil (JWT token kullanılıyor)
 * Ancak form-based authentication için gerekli olabilir
 */

/**
 * XSS koruması - Input sanitization
 */
export function sanitizeInput(input) {
  if (typeof input === 'string') {
    // HTML taglerini temizle
    return validator.escape(input.trim());
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized = {};
    for (const key in input) {
      if (typeof input[key] === 'string') {
        sanitized[key] = validator.escape(input[key].trim());
      } else {
        sanitized[key] = input[key];
      }
    }
    return sanitized;
  }
  return input;
}

/**
 * XSS koruması middleware
 */
export function xssProtection(req, res, next) {
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }
  if (req.params) {
    req.params = sanitizeInput(req.params);
  }
  next();
}

/**
 * Password complexity validator
 */
export const passwordValidator = [
  body('password')
    .isLength({ min: 8 }).withMessage('Şifre en az 8 karakter olmalıdır')
    .matches(/[A-Z]/).withMessage('Şifre en az bir büyük harf içermelidir')
    .matches(/[a-z]/).withMessage('Şifre en az bir küçük harf içermelidir')
    .matches(/[0-9]/).withMessage('Şifre en az bir rakam içermelidir')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Şifre en az bir özel karakter içermelidir')
];

/**
 * Environment variable validation
 */
export function validateEnvVars() {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Production'da zorunlu, development'da uyarı
  const required = [
    'JWT_SECRET',
    'DB_HOST',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    const message = `Missing required environment variables: ${missing.join(', ')}`;
    if (isProduction) {
      throw new Error(message);
    } else {
      console.warn(`⚠️  Warning: ${message}`);
    }
  }

  // JWT_SECRET güvenlik kontrolü - sadece production'da zorunlu
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET === 'your-secret-key' || process.env.JWT_SECRET.length < 32) {
      const message = 'JWT_SECRET must be at least 32 characters long and not use default value';
      if (isProduction) {
        throw new Error(message);
      } else {
        console.warn(`⚠️  Warning: ${message}`);
      }
    }
  } else if (isProduction) {
    throw new Error('JWT_SECRET is required in production');
  }
}

/**
 * Security headers middleware
 */
export function securityHeaders(req, res, next) {
  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Content Type Options
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Frame Options
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  
  // Strict Transport Security (HTTPS için)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  next();
}

/**
 * IP whitelist kontrolü (opsiyonel)
 */
export function ipWhitelist(allowedIPs = []) {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // Whitelist yoksa geç
    }
    
    const clientIP = req.ip || req.connection.remoteAddress;
    if (allowedIPs.includes(clientIP)) {
      return next();
    }
    
    return res.status(403).json({ error: 'IP adresi yetkili değil' });
  };
}

