import { pool } from '../database/db.js';
import { getTurkeyTime } from '../utils/timeUtils.js';

/**
 * Admin Access Log Servisi
 * Admin kullanıcıların log erişimlerini kaydeder
 */

/**
 * Admin erişim logu oluşturur
 * @param {Object} accessData - Erişim verisi
 * @returns {Promise<number>} Log ID
 */
export async function createAdminAccessLog(accessData) {
  const client = await pool.connect();
  
  try {
    const {
      admin_id,
      action,
      search_criteria = null,
      accessed_log_ids = null,
      ip_address,
      user_agent = null
    } = accessData;
    
    await client.query(
      `INSERT INTO admin_access_logs (
        admin_id, action, search_criteria, accessed_log_ids,
        ip_address, user_agent, accessed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        admin_id,
        action,
        search_criteria ? JSON.stringify(search_criteria) : null,
        accessed_log_ids,
        ip_address,
        user_agent,
        getTurkeyTime()
      ]
    );
  } catch (error) {
    console.error('Admin erişim logu oluşturma hatası:', error);
    // Admin log hatası sistem logunu durdurmasın
  } finally {
    client.release();
  }
}

/**
 * Admin erişim loglarını getirir
 * @param {Object} filters - Filtre parametreleri
 * @returns {Promise<Array>} Erişim logları
 */
export async function getAdminAccessLogs(filters = {}) {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        aal.*,
        au.email as admin_email,
        au.role as admin_role
      FROM admin_access_logs aal
      LEFT JOIN admin_users au ON aal.admin_id = au.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (filters.admin_id) {
      query += ` AND aal.admin_id = $${paramIndex++}`;
      params.push(filters.admin_id);
    }
    
    if (filters.action) {
      query += ` AND aal.action = $${paramIndex++}`;
      params.push(filters.action);
    }
    
    if (filters.startDate) {
      query += ` AND aal.accessed_at >= $${paramIndex++}`;
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      query += ` AND aal.accessed_at <= $${paramIndex++}`;
      params.push(filters.endDate);
    }
    
    query += ` ORDER BY aal.accessed_at DESC`;
    
    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }
    
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Admin erişim logları getirme hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

