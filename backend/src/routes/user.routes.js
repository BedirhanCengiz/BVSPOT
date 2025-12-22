import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { pool } from '../database/db.js';
import { createLog } from '../services/logService.js';

const router = express.Router();

/**
 * GET /api/user/profile
 * Kullanıcı profil bilgileri
 */
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT phone, full_name, phone as id, status, quota_mb, quota_used_mb, 
                speed_limit_mbps, connection_start_time, connection_end_time, created_at
         FROM users WHERE phone = $1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
      }

      const user = result.rows[0];
      
      // Hassas bilgileri maskele
      user.phone = user.phone.substring(0, 4) + '***' + user.phone.substring(7);

      res.json({ user });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/user/session
 * Aktif session bilgileri
 */
router.get('/session', authenticateToken, async (req, res, next) => {
  try {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT s.*, u.full_name, u.quota_mb, u.quota_used_mb, u.speed_limit_mbps
         FROM sessions s
         JOIN users u ON s.user_id = u.phone
         WHERE s.user_id = $1 AND s.status = 'active'
         ORDER BY s.start_time DESC
         LIMIT 1`,
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.json({ session: null });
      }

      res.json({ session: result.rows[0] });
    } finally {
      client.release();
    }
  } catch (error) {
    next(error);
  }
});

export default router;

