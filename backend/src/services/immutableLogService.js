import { pool } from '../database/db.js';
import { calculateLogHash, getPreviousLogHash, addToHashChain } from './hashChainService.js';
import { getTurkeyTimeSync } from '../utils/timeUtils.js';

/**
 * Immutable Access Log Servisi
 * 5651 Kanunu uyumlu - Değiştirilemez erişim logları
 */

/**
 * UTC+3 (Türkiye saati) alır - Senkronize olmayan versiyon (performans için)
 * @returns {Date} UTC+3 zamanı
 */
function getTurkeyTimestamp() {
  return getTurkeyTimeSync();
}

/**
 * Immutable access log oluşturur
 * @param {Object} logData - Log verisi
 * @returns {Promise<number>} Oluşturulan log ID
 */
export async function createImmutableAccessLog(logData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Zamanı UTC+3'e çevir
    const turkeyTime = getTurkeyTimestamp();
    const logDate = logData.log_date || turkeyTime.toISOString().split('T')[0];
    
    // Log hash'ini hesapla
    const logHash = calculateLogHash({
      ...logData,
      log_date: logDate,
      connection_start_time: logData.connection_start_time || turkeyTime
    });
    
    // Önceki logun hash'ini al
    const previousHash = await getPreviousLogHash();
    
    // Oturum süresini hesapla (saniye cinsinden)
    let sessionDurationSeconds = null;
    if (logData.connection_start_time && logData.connection_end_time) {
      const startTime = new Date(logData.connection_start_time);
      const endTime = new Date(logData.connection_end_time);
      sessionDurationSeconds = Math.floor((endTime - startTime) / 1000);
    }

    // Kaynak IP: internal_ip varsa onu kullan, yoksa source_ip'yi kullan
    const sourceIp = logData.source_ip || logData.internal_ip;
    
    // Immutable log kaydı oluştur
    const result = await client.query(
      `INSERT INTO immutable_access_logs (
        log_hash, previous_log_hash, user_id, session_id,
        internal_ip, external_ip, source_ip, destination_ip, mac_address,
        gateway_id, firewall_id,
        connection_start_time, connection_end_time,
        source_port, destination_port, protocol,
        session_duration_seconds, data_transferred_bytes, log_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING id`,
      [
        logHash,
        previousHash,
        logData.user_id || null,
        logData.session_id || null,
        logData.internal_ip,
        logData.external_ip || null,
        sourceIp,
        logData.destination_ip || null,
        logData.mac_address,
        logData.gateway_id || null,
        logData.firewall_id || null,
        logData.connection_start_time || turkeyTime,
        logData.connection_end_time || null,
        logData.source_port || null,
        logData.destination_port || null,
        logData.protocol || null,
        sessionDurationSeconds,
        logData.data_transferred_bytes || 0,
        logDate
      ]
    );
    
    const logId = result.rows[0].id;
    
    // Hash chain'e ekle
    await addToHashChain(logId, logHash, previousHash);
    
    await client.query('COMMIT');
    
    return logId;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Immutable log oluşturma hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Session başlangıcında immutable log oluşturur
 * @param {Object} sessionData - Session verisi
 * @returns {Promise<number>} Log ID
 */
export async function logSessionStart(sessionData) {
  return await createImmutableAccessLog({
    user_id: sessionData.user_id,
    session_id: sessionData.session_id,
    internal_ip: sessionData.internal_ip,
    external_ip: sessionData.external_ip,
    source_ip: sessionData.source_ip || sessionData.internal_ip, // Kaynak IP
    destination_ip: sessionData.destination_ip, // Hedef IP (erişilen sunucu)
    mac_address: sessionData.mac_address,
    gateway_id: sessionData.gateway_id,
    firewall_id: sessionData.firewall_id,
    connection_start_time: sessionData.start_time || getTurkeyTimestamp(),
    source_port: sessionData.source_port,
    destination_port: sessionData.destination_port,
    protocol: sessionData.protocol || 'TCP'
  });
}

/**
 * Session bitişinde immutable log günceller (sadece end_time eklenir, immutable olduğu için yeni kayıt oluşturulur)
 * @param {number} sessionId - Session ID
 * @param {Date} endTime - Bitiş zamanı
 * @returns {Promise<number>} Yeni log ID
 */
export async function logSessionEnd(sessionId, endTime) {
  const client = await pool.connect();
  
  try {
    // Session bilgilerini al
    const sessionResult = await client.query(
      `SELECT s.*, s.user_id 
       FROM sessions s
       WHERE s.id = $1`,
      [sessionId]
    );
    
    if (sessionResult.rows.length === 0) {
      throw new Error('Session bulunamadı');
    }
    
    const session = sessionResult.rows[0];
    
    // Bitiş logu oluştur (immutable olduğu için yeni kayıt)
    const endTimestamp = endTime || getTurkeyTimestamp();
    return await createImmutableAccessLog({
      user_id: session.user_id,
      session_id: sessionId,
      internal_ip: session.internal_ip || session.ip_address,
      external_ip: session.external_ip,
      source_ip: session.internal_ip || session.ip_address, // Kaynak IP
      destination_ip: null, // Bitiş logunda hedef IP yok
      mac_address: session.mac_address,
      gateway_id: session.gateway_id,
      firewall_id: session.firewall_id,
      connection_start_time: session.start_time,
      connection_end_time: endTimestamp,
      source_port: null,
      destination_port: null,
      protocol: 'TCP',
      data_transferred_bytes: (session.data_transferred_mb || 0) * 1048576
    });
  } catch (error) {
    console.error('Session bitiş logu oluşturma hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Immutable logları sorgular (admin için)
 * @param {Object} filters - Filtre parametreleri
 * @returns {Promise<Array>} Log kayıtları
 */
export async function getImmutableAccessLogs(filters = {}) {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        ial.*,
        u.full_name,
        u.phone,
        u.tckn,
        s.start_time as session_start_time,
        s.end_time as session_end_time
      FROM immutable_access_logs ial
      LEFT JOIN users u ON ial.user_id = u.id
      LEFT JOIN sessions s ON ial.session_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (filters.userId) {
      query += ` AND ial.user_id = $${paramIndex++}`;
      // Convert to integer since user_id is now BIGINT
      const userIdValue = typeof filters.userId === 'number' 
        ? filters.userId 
        : parseInt(String(filters.userId).replace(/^0+/, ''), 10); // Remove leading zeros
      if (isNaN(userIdValue)) {
        throw new Error(`Invalid userId value: ${filters.userId}`);
      }
      params.push(userIdValue);
    }
    
    if (filters.internalIp) {
      query += ` AND ial.internal_ip = $${paramIndex++}`;
      params.push(filters.internalIp);
    }
    
    if (filters.externalIp) {
      query += ` AND ial.external_ip = $${paramIndex++}`;
      params.push(filters.externalIp);
    }
    
    if (filters.sourceIp) {
      query += ` AND ial.source_ip = $${paramIndex++}`;
      params.push(filters.sourceIp);
    }
    
    if (filters.destinationIp) {
      query += ` AND ial.destination_ip = $${paramIndex++}`;
      params.push(filters.destinationIp);
    }
    
    if (filters.macAddress) {
      query += ` AND ial.mac_address = $${paramIndex++}`;
      params.push(filters.macAddress);
    }
    
    if (filters.protocol) {
      query += ` AND ial.protocol = $${paramIndex++}`;
      params.push(filters.protocol);
    }
    
    if (filters.sourcePort) {
      query += ` AND ial.source_port = $${paramIndex++}`;
      params.push(parseInt(filters.sourcePort));
    }
    
    if (filters.destinationPort) {
      query += ` AND ial.destination_port = $${paramIndex++}`;
      params.push(parseInt(filters.destinationPort));
    }
    
    if (filters.startDate) {
      query += ` AND ial.connection_start_time >= $${paramIndex++}`;
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      query += ` AND ial.connection_end_time <= $${paramIndex++}`;
      params.push(filters.endDate);
    }
    
    if (filters.dateRange) {
      query += ` AND ial.log_date >= $${paramIndex++} AND ial.log_date <= $${paramIndex + 1}`;
      params.push(filters.dateRange.start, filters.dateRange.end);
      paramIndex += 2;
    }
    
    // Index kullanımını optimize et - connection_start_time DESC ile sıralama
    query += ` ORDER BY ial.connection_start_time DESC NULLS LAST`;
    
    // Limit ve offset ekle
    const limit = filters.limit || 100;
    const offset = filters.offset || 0;
    
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);
    
    const result = await client.query(query, params);
    
    // KVKK uyumlu - hassas verileri maskele
    return result.rows.map(row => ({
      ...row,
      tckn: row.tckn ? maskTCKN(row.tckn) : null,
      phone: row.phone ? maskPhone(row.phone) : null
    }));
  } catch (error) {
    console.error('Immutable log getirme hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * "Şu IP'yi şu saatte kim kullandı?" sorusuna cevap verir
 * @param {string} ip - IP adresi (iç veya dış)
 * @param {Date} timestamp - Zaman
 * @returns {Promise<Array>} Eşleşen loglar
 */
export async function findUserByIpAndTime(ip, timestamp) {
  const client = await pool.connect();
  
  try {
    // 5 dakikalık tolerans ile arama
    const startTime = new Date(timestamp);
    startTime.setMinutes(startTime.getMinutes() - 5);
    const endTime = new Date(timestamp);
    endTime.setMinutes(endTime.getMinutes() + 5);
    
    const result = await client.query(
      `SELECT 
        ial.*,
        u.full_name,
        u.phone,
        u.tckn,
        u.id_type
      FROM immutable_access_logs ial
      LEFT JOIN users u ON ial.user_id = u.phone
      WHERE (
        (ial.internal_ip = $1 OR ial.external_ip = $1)
        AND ial.connection_start_time >= $2
        AND ial.connection_start_time <= $3
      )
      ORDER BY ial.connection_start_time DESC
      LIMIT 10`,
      [ip, startTime, endTime]
    );
    
    return result.rows.map(row => ({
      ...row,
      tckn: row.tckn ? maskTCKN(row.tckn) : null,
      phone: row.phone ? maskPhone(row.phone) : null
    }));
  } catch (error) {
    console.error('IP ve zaman bazlı arama hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Helper functions
function maskTCKN(tckn) {
  if (!tckn || tckn.length !== 11) return tckn;
  return tckn.substring(0, 5) + '****' + tckn.substring(9);
}

function maskPhone(phone) {
  if (!phone || phone.length < 10) return phone;
  return phone.substring(0, 3) + '***' + phone.substring(phone.length - 2);
}

