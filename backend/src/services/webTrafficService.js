import { pool } from '../database/db.js';
import { maskTCKN, maskPhone } from '../utils/tcknValidator.js';

/**
 * Web Trafik Log Servisi
 * Kullanıcıların web trafiğini loglar (KVKK uyumlu)
 */

/**
 * Web trafiği logu oluşturur
 * Router/hotspot'tan veya proxy'den gelen trafik loglarını kaydeder
 * 
 * @param {Object} trafficData - Trafik verisi
 * @param {number} trafficData.userId - Kullanıcı ID (opsiyonel, IP/MAC'ten bulunabilir)
 * @param {number} trafficData.sessionId - Session ID (opsiyonel)
 * @param {string} trafficData.ipAddress - IP adresi (zorunlu)
 * @param {string} trafficData.macAddress - MAC adresi (opsiyonel)
 * @param {string} trafficData.url - Erişilen URL (zorunlu)
 * @param {string} trafficData.domain - Domain (opsiyonel, URL'den çıkarılabilir)
 * @param {string} trafficData.method - HTTP method (GET, POST, etc.)
 * @param {number} trafficData.statusCode - HTTP status code
 * @param {string} trafficData.userAgent - User agent
 * @param {string} trafficData.referer - Referer URL
 * @param {number} trafficData.dataTransferredBytes - Transfer edilen byte sayısı
 * @param {number} trafficData.responseTimeMs - Response time (milisaniye)
 * @param {string} trafficData.countryCode - Ülke kodu (opsiyonel)
 * @param {string} trafficData.deviceType - Cihaz tipi (mobile, desktop, etc.)
 * @param {string} trafficData.browser - Tarayıcı bilgisi
 * @param {string} trafficData.os - İşletim sistemi
 */
export async function logWebTraffic(trafficData) {
  const client = await pool.connect();
  
  try {
    const {
      userId = null,
      sessionId = null,
      ipAddress,
      macAddress = null,
      url,
      domain = null,
      method = 'GET',
      statusCode = null,
      userAgent = null,
      referer = null,
      dataTransferredBytes = 0,
      responseTimeMs = null,
      countryCode = null,
      deviceType = null,
      browser = null,
      os = null
    } = trafficData;

    // Domain'i URL'den çıkar (eğer verilmemişse)
    let extractedDomain = domain;
    if (!extractedDomain && url) {
      try {
        const urlObj = new URL(url);
        extractedDomain = urlObj.hostname;
      } catch (e) {
        // URL parse edilemezse domain olarak URL'in kendisini kullan
        extractedDomain = url.substring(0, 255);
      }
    }

    // Eğer userId yoksa, IP ve MAC'ten kullanıcıyı bul
    let resolvedUserId = userId;
    if (!resolvedUserId && (ipAddress || macAddress)) {
      try {
        const userQuery = macAddress 
          ? 'SELECT id FROM users WHERE mac_address = $1 AND status = $2 LIMIT 1'
          : 'SELECT id FROM users WHERE ip_address = $1 AND status = $2 ORDER BY updated_at DESC LIMIT 1';
        
        const userParams = macAddress ? [macAddress, 'active'] : [ipAddress, 'active'];
        const userResult = await client.query(userQuery, userParams);
        
        if (userResult.rows.length > 0) {
          resolvedUserId = userResult.rows[0].id;
        }
      } catch (error) {
        console.error('Kullanıcı bulma hatası:', error);
      }
    }

    // Eğer sessionId yoksa ama userId varsa, aktif session'ı bul
    let resolvedSessionId = sessionId;
    if (!resolvedSessionId && resolvedUserId) {
      try {
        const sessionResult = await client.query(
          `SELECT id FROM sessions 
           WHERE user_id = $1 AND status = 'active' 
           ORDER BY start_time DESC LIMIT 1`,
          [resolvedUserId]
        );
        
        if (sessionResult.rows.length > 0) {
          resolvedSessionId = sessionResult.rows[0].id;
        }
      } catch (error) {
        console.error('Session bulma hatası:', error);
      }
    }

    // Log kaydı oluştur
    await client.query(
      `INSERT INTO web_traffic_logs (
        user_id, session_id, ip_address, mac_address, url, domain, method, 
        status_code, user_agent, referer, data_transferred_bytes, 
        response_time_ms, country_code, device_type, browser, os
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        resolvedUserId,
        resolvedSessionId,
        ipAddress,
        macAddress,
        url,
        extractedDomain,
        method,
        statusCode,
        userAgent,
        referer,
        dataTransferredBytes,
        responseTimeMs,
        countryCode,
        deviceType,
        browser,
        os
      ]
    );

    // Session'daki data transferred'i güncelle
    if (resolvedSessionId && dataTransferredBytes > 0) {
      try {
        await client.query(
          `UPDATE sessions 
           SET data_transferred_mb = data_transferred_mb + ($1::bigint / 1048576)
           WHERE id = $2`,
          [dataTransferredBytes, resolvedSessionId]
        );
      } catch (error) {
        console.error('Session data transferred güncelleme hatası:', error);
      }
    }

    // User'daki quota_used_mb'yi güncelle
    if (resolvedUserId && dataTransferredBytes > 0) {
      try {
        await client.query(
          `UPDATE users 
           SET quota_used_mb = quota_used_mb + ($1::bigint / 1048576)
           WHERE id = $2`,
          [dataTransferredBytes, resolvedUserId]
        );
      } catch (error) {
        console.error('User quota güncelleme hatası:', error);
      }
    }

  } catch (error) {
    console.error('Web trafik log kaydı oluşturma hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Toplu web trafiği logları oluşturur
 * Router'dan gelen toplu loglar için
 * 
 * @param {Array} trafficLogs - Trafik logları dizisi
 */
export async function logBulkWebTraffic(trafficLogs) {
  const client = await pool.connect();
  
  try {
    // Her bir log için ayrı ayrı kaydet (basit implementasyon)
    // Production'da bulk insert kullanılabilir
    for (const trafficData of trafficLogs) {
      try {
        await logWebTraffic(trafficData);
      } catch (error) {
        console.error('Toplu log kaydı hatası:', error);
        // Bir log hatası diğerlerini etkilemesin
        continue;
      }
    }
  } finally {
    client.release();
  }
}

/**
 * Web trafiği loglarını getirir (admin için)
 * 
 * @param {Object} filters - Filtre parametreleri
 * @returns {Promise<Array>} Log kayıtları
 */
export async function getWebTrafficLogs(filters = {}) {
  const client = await pool.connect();
  
  try {
    let query = `
      SELECT 
        wtl.*,
        u.full_name,
        u.phone,
        u.tckn,
        s.start_time as session_start_time
      FROM web_traffic_logs wtl
      LEFT JOIN users u ON wtl.user_id = u.id
      LEFT JOIN sessions s ON wtl.session_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (filters.userId) {
      query += ` AND wtl.user_id = $${paramIndex++}`;
      params.push(filters.userId);
    }

    if (filters.ipAddress) {
      query += ` AND wtl.ip_address = $${paramIndex++}`;
      params.push(filters.ipAddress);
    }

    if (filters.macAddress) {
      query += ` AND wtl.mac_address = $${paramIndex++}`;
      params.push(filters.macAddress);
    }

    if (filters.domain) {
      query += ` AND wtl.domain ILIKE $${paramIndex++}`;
      params.push(`%${filters.domain}%`);
    }

    if (filters.startDate) {
      query += ` AND wtl.created_at >= $${paramIndex++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND wtl.created_at <= $${paramIndex++}`;
      params.push(filters.endDate);
    }

    if (filters.method) {
      query += ` AND wtl.method = $${paramIndex++}`;
      params.push(filters.method);
    }

    if (filters.statusCode) {
      query += ` AND wtl.status_code = $${paramIndex++}`;
      params.push(filters.statusCode);
    }

    query += ` ORDER BY wtl.created_at DESC`;
    
    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }
    
    if (filters.offset !== undefined) {
      query += ` OFFSET $${paramIndex++}`;
      params.push(filters.offset);
    }

    const result = await client.query(query, params);
    
    // KVKK uyumlu - TCKN ve telefon maskelenmiş döner
    return result.rows.map(row => ({
      ...row,
      tckn: row.tckn ? maskTCKN(row.tckn) : null,
      phone: row.phone ? maskPhone(row.phone) : null
    }));
  } catch (error) {
    console.error('Web trafik log getirme hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Web trafiği istatistiklerini getirir
 * 
 * @param {Object} filters - Filtre parametreleri
 * @returns {Promise<Object>} İstatistikler
 */
export async function getWebTrafficStats(filters = {}) {
  const client = await pool.connect();
  
  try {
    let whereClause = 'WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (filters.userId) {
      whereClause += ` AND user_id = $${paramIndex++}`;
      params.push(filters.userId);
    }

    if (filters.startDate) {
      whereClause += ` AND created_at >= $${paramIndex++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      whereClause += ` AND created_at <= $${paramIndex++}`;
      params.push(filters.endDate);
    }

    // Toplam istek sayısı
    const totalRequests = await client.query(
      `SELECT COUNT(*) as count FROM web_traffic_logs ${whereClause}`,
      params
    );

    // Toplam data transfer
    const totalData = await client.query(
      `SELECT SUM(data_transferred_bytes) as total_bytes FROM web_traffic_logs ${whereClause}`,
      params
    );

    // En çok ziyaret edilen domainler
    const topDomains = await client.query(
      `SELECT domain, COUNT(*) as count, SUM(data_transferred_bytes) as total_bytes
       FROM web_traffic_logs ${whereClause}
       GROUP BY domain
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    // Ortalama response time
    const avgResponseTime = await client.query(
      `SELECT AVG(response_time_ms) as avg_time FROM web_traffic_logs ${whereClause}
       AND response_time_ms IS NOT NULL`,
      params
    );

    // HTTP method dağılımı
    const methodStats = await client.query(
      `SELECT method, COUNT(*) as count FROM web_traffic_logs ${whereClause}
       GROUP BY method`,
      params
    );

    // Status code dağılımı
    const statusStats = await client.query(
      `SELECT status_code, COUNT(*) as count FROM web_traffic_logs ${whereClause}
       AND status_code IS NOT NULL
       GROUP BY status_code
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    return {
      totalRequests: parseInt(totalRequests.rows[0]?.count || 0),
      totalDataBytes: parseInt(totalData.rows[0]?.total_bytes || 0),
      totalDataMB: Math.round((parseInt(totalData.rows[0]?.total_bytes || 0) / 1048576) * 100) / 100,
      avgResponseTime: avgResponseTime.rows[0]?.avg_time ? Math.round(parseFloat(avgResponseTime.rows[0].avg_time)) : null,
      topDomains: topDomains.rows,
      methodStats: methodStats.rows,
      statusStats: statusStats.rows
    };
  } catch (error) {
    console.error('Web trafik istatistik getirme hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Eski web trafik loglarını temizler (KVKK - 1 yıl sonra)
 */
export async function cleanOldWebTrafficLogs() {
  const client = await pool.connect();
  
  try {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const result = await client.query(
      'DELETE FROM web_traffic_logs WHERE created_at < $1',
      [oneYearAgo]
    );

    return { deleted: result.rowCount };
  } catch (error) {
    console.error('Eski web trafik log temizleme hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

