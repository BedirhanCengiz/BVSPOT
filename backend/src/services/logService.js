import { pool } from '../database/db.js';
import { maskTCKN, maskPhone } from '../utils/tcknValidator.js';

/**
 * Log kaydı oluşturur
 * KVKK uyumlu - hassas veriler maskelenir
 */
export async function createLog(userId, action, req, details = {}) {
  const client = await pool.connect();
  
  try {
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    const macAddress = req.headers['x-mac-address'] || details.macAddress || null;

    // KVKK uyumlu - hassas verileri maskele
    const safeDetails = { ...details };
    if (safeDetails.tckn) {
      safeDetails.tckn = maskTCKN(safeDetails.tckn);
    }
    if (safeDetails.phone) {
      safeDetails.phone = maskPhone(safeDetails.phone);
    }

    await client.query(
      `INSERT INTO logs (user_id, action, ip_address, mac_address, user_agent, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, action, ipAddress, macAddress, userAgent, JSON.stringify(safeDetails)]
    );
  } catch (error) {
    console.error('Log kaydı oluşturma hatası:', error);
  } finally {
    client.release();
  }
}

/**
 * Logları getirir (admin için)
 */
export async function getLogs(filters = {}) {
  const client = await pool.connect();
  
  try {
    let query = 'SELECT l.*, u.full_name, u.phone FROM logs l LEFT JOIN users u ON l.user_id = u.id WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.userId) {
      query += ` AND l.user_id = $${paramIndex++}`;
      params.push(filters.userId);
    }

    if (filters.action) {
      query += ` AND l.action = $${paramIndex++}`;
      params.push(filters.action);
    }

    if (filters.startDate) {
      query += ` AND l.created_at >= $${paramIndex++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND l.created_at <= $${paramIndex++}`;
      params.push(filters.endDate);
    }

    if (filters.ipAddress) {
      query += ` AND l.ip_address = $${paramIndex++}`;
      params.push(filters.ipAddress);
    }

    query += ' ORDER BY l.created_at DESC';
    
    if (filters.limit) {
      query += ' LIMIT $' + paramIndex++;
      params.push(filters.limit);
    }
    
    if (filters.offset !== undefined) {
      query += ' OFFSET $' + paramIndex++;
      params.push(filters.offset);
    }

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Log getirme hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Eski logları temizler (KVKK - 1 yıl sonra)
 */
export async function cleanOldLogs() {
  const client = await pool.connect();
  
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await client.query(
      'DELETE FROM logs WHERE created_at < $1',
      [oneYearAgo]
    );

    return { deleted: result.rowCount };
  } catch (error) {
    console.error('Eski log temizleme hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

