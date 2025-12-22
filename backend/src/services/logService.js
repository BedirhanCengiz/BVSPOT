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
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Base query parts - user_id is now BIGINT referencing users.id
    const baseQuery = 'SELECT l.*, u.full_name, u.phone FROM logs l LEFT JOIN users u ON l.user_id = u.id';

    if (filters.userId) {
      conditions.push(`l.user_id = $${paramIndex++}`);
      // Convert to integer since user_id is now BIGINT
      const userIdValue = typeof filters.userId === 'number' 
        ? filters.userId 
        : parseInt(String(filters.userId).replace(/^0+/, ''), 10); // Remove leading zeros
      if (isNaN(userIdValue)) {
        throw new Error(`Invalid userId value: ${filters.userId}`);
      }
      params.push(userIdValue);
    }

    if (filters.action) {
      conditions.push(`l.action = $${paramIndex++}`);
      params.push(String(filters.action));
    }

    if (filters.startDate) {
      conditions.push(`l.created_at >= $${paramIndex++}`);
      params.push(String(filters.startDate));
    }

    if (filters.endDate) {
      conditions.push(`l.created_at <= $${paramIndex++}`);
      params.push(String(filters.endDate));
    }

    if (filters.ipAddress) {
      conditions.push(`l.ip_address = $${paramIndex++}`);
      params.push(String(filters.ipAddress));
    }

    // Build WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Build ORDER BY
    const orderBy = 'ORDER BY l.created_at DESC';
    
    // Build LIMIT - Embed directly in query (safe since it's from our code, not user input)
    let limitClause = '';
    if (filters.limit !== undefined && filters.limit !== null) {
      // Convert to integer and embed directly (safe - not user input)
      const limitValue = Math.floor(Number(filters.limit));
      if (isNaN(limitValue) || limitValue < 0 || limitValue > 1000000) {
        throw new Error(`Invalid limit value: ${filters.limit}`);
      }
      // Embed directly in query - safe because it's from our code, not user input
      limitClause = `LIMIT ${limitValue}`;
    }
    
    // Build OFFSET - Embed directly in query (safe since it's from our code, not user input)
    let offsetClause = '';
    if (filters.offset !== undefined && filters.offset !== null) {
      // Convert to integer and embed directly (safe - not user input)
      const offsetValue = Math.floor(Number(filters.offset));
      if (isNaN(offsetValue) || offsetValue < 0 || offsetValue > 1000000) {
        throw new Error(`Invalid offset value: ${filters.offset}`);
      }
      // Embed directly in query - safe because it's from our code, not user input
      offsetClause = `OFFSET ${offsetValue}`;
    }

    // Build final query
    const queryParts = [baseQuery, whereClause, orderBy, limitClause, offsetClause].filter(Boolean);
    const query = queryParts.join(' ');

    // Debug: Log query and params
    console.log('[getLogs] Query:', query);
    console.log('[getLogs] Params:', params.map((p, i) => `$${i + 1}: ${p} (${typeof p})`).join(', '));

    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[getLogs] Log getirme hatası:', error);
    console.error('[getLogs] Error message:', error.message);
    console.error('[getLogs] Error code:', error.code);
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

