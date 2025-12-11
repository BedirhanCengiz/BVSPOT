import jwt from 'jsonwebtoken';
import { pool } from '../database/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * JWT token doğrulama middleware
 */
export async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token bulunamadı' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Kullanıcıyı veritabanından kontrol et
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id, status FROM users WHERE id = $1', [decoded.userId]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Kullanıcı bulunamadı' });
      }

      if (result.rows[0].status === 'blocked') {
        return res.status(403).json({ error: 'Hesabınız engellenmiş' });
      }

      req.user = {
        id: decoded.userId,
        role: decoded.role || 'user'
      };
    } finally {
      client.release();
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Geçersiz token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token süresi dolmuş' });
    }
    return res.status(500).json({ error: 'Token doğrulama hatası' });
  }
}

/**
 * Admin yetkisi kontrolü
 */
export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Token bulunamadı' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Admin token'ında adminId olmalı
    if (!decoded.adminId) {
      return res.status(403).json({ error: 'Admin yetkisi gerekli' });
    }

    if (decoded.role !== 'admin' && decoded.role !== 'super_admin') {
      return res.status(403).json({ error: 'Admin yetkisi gerekli' });
    }

    // Admin kullanıcıyı veritabanından kontrol et
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT id, role FROM admin_users WHERE id = $1', [decoded.adminId]);
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Admin kullanıcı bulunamadı' });
      }

      req.admin = {
        id: decoded.adminId,
        role: result.rows[0].role
      };
    } finally {
      client.release();
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Geçersiz token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token süresi dolmuş' });
    }
    return res.status(500).json({ error: 'Token doğrulama hatası' });
  }
}

/**
 * JWT token oluşturur
 */
export function generateToken(userId, role = 'user') {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

/**
 * Admin JWT token oluşturur
 */
export function generateAdminToken(adminId, role = 'admin') {
  return jwt.sign(
    { adminId, role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
  );
}

