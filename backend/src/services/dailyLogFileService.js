import { pool } from '../database/db.js';
import { calculateHash } from './hashChainService.js';
import { getTurkeyTime } from '../utils/timeUtils.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Daily Log File Servisi
 * Günlük log dosyaları oluşturur ve hash ile mühürler
 */

const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs');

/**
 * Log dizinini oluşturur
 */
async function ensureLogDirectory() {
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.error('Log dizini oluşturma hatası:', error);
  }
}

/**
 * Günlük log dosyası oluşturur veya mevcut olanı döndürür
 * @param {Date} logDate - Log tarihi (opsiyonel, bugün kullanılır)
 * @returns {Promise<Object>} Günlük log dosyası bilgisi
 */
export async function getOrCreateDailyLogFile(logDate = null) {
  const client = await pool.connect();
  
  try {
    const date = logDate || getTurkeyTime();
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Mevcut dosyayı kontrol et
    const existing = await client.query(
      `SELECT * FROM daily_log_files WHERE log_date = $1`,
      [dateStr]
    );
    
    if (existing.rows.length > 0) {
      return existing.rows[0];
    }
    
    // Yeni dosya oluştur
    await ensureLogDirectory();
    const filePath = path.join(LOG_DIR, `access_log_${dateStr}.log`);
    
    // Önceki günün hash'ini al
    const prevDay = await client.query(
      `SELECT file_hash FROM daily_log_files 
       WHERE log_date < $1 
       ORDER BY log_date DESC 
       LIMIT 1`,
      [dateStr]
    );
    const previousDayHash = prevDay.rows.length > 0 ? prevDay.rows[0].file_hash : null;
    
    const result = await client.query(
      `INSERT INTO daily_log_files (
        log_date, file_path, file_hash, previous_day_hash, status
      ) VALUES ($1, $2, $3, $4, 'open')
      RETURNING *`,
      [dateStr, filePath, null, previousDayHash]
    );
    
    return result.rows[0];
  } catch (error) {
    console.error('Günlük log dosyası oluşturma hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Günlük log dosyasına log satırı ekler
 * @param {number} logId - Immutable log ID
 * @param {Date} logDate - Log tarihi
 * @returns {Promise<void>}
 */
export async function appendToDailyLogFile(logId, logDate = null) {
  const client = await pool.connect();
  
  try {
    const date = logDate || getTurkeyTime();
    const dateStr = date.toISOString().split('T')[0];
    
    // Günlük dosyayı al veya oluştur
    const dailyFile = await getOrCreateDailyLogFile(date);
    
    // Log verisini al
    const logResult = await client.query(
      `SELECT * FROM immutable_access_logs WHERE id = $1`,
      [logId]
    );
    
    if (logResult.rows.length === 0) {
      throw new Error('Log bulunamadı');
    }
    
    const log = logResult.rows[0];
    
    // Log satırını formatla (5651 uyumlu format)
    const logLine = formatLogLine(log);
    
    // Dosyaya ekle
    if (dailyFile.file_path) {
      await fs.appendFile(dailyFile.file_path, logLine + '\n', 'utf8');
    }
    
    // Toplam log sayısını güncelle
    await client.query(
      `UPDATE daily_log_files 
       SET total_logs = total_logs + 1
       WHERE log_date = $1`,
      [dateStr]
    );
  } catch (error) {
    console.error('Günlük log dosyasına ekleme hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Log satırını formatlar (5651 uyumlu)
 * @param {Object} log - Log verisi
 * @returns {string} Formatlanmış log satırı
 */
function formatLogLine(log) {
  // 5651 Kanunu uyumlu log formatı
  // Format: timestamp|user_id|session_id|internal_ip|external_ip|mac_address|gateway_id|firewall_id|start_time|end_time|source_port|dest_port|protocol|data_bytes|log_hash
  const parts = [
    log.created_at || new Date().toISOString(),
    log.user_id || '',
    log.session_id || '',
    log.internal_ip || '',
    log.external_ip || '',
    log.mac_address || '',
    log.gateway_id || '',
    log.firewall_id || '',
    log.connection_start_time || '',
    log.connection_end_time || '',
    log.source_port || '',
    log.destination_port || '',
    log.protocol || '',
    log.data_transferred_bytes || 0,
    log.log_hash || ''
  ];
  
  return parts.join('|');
}

/**
 * Gün sonunda log dosyasını mühürler (hash ile)
 * @param {Date} logDate - Mühürlenecek gün (opsiyonel, bugün)
 * @param {Object} sealOptions - Mühür seçenekleri
 * @returns {Promise<Object>} Mühür bilgisi
 */
export async function sealDailyLogFile(logDate = null, sealOptions = {}) {
  const client = await pool.connect();
  
  try {
    const date = logDate || getTurkeyTime();
    const dateStr = date.toISOString().split('T')[0];
    
    // Günlük dosyayı al
    const dailyFile = await client.query(
      `SELECT * FROM daily_log_files WHERE log_date = $1`,
      [dateStr]
    );
    
    if (dailyFile.rows.length === 0) {
      throw new Error('Günlük log dosyası bulunamadı');
    }
    
    const file = dailyFile.rows[0];
    
    if (file.status === 'sealed') {
      throw new Error('Dosya zaten mühürlenmiş');
    }
    
    // Dosya içeriğini oku ve hash'le
    let fileHash = null;
    if (file.file_path) {
      try {
        const fileContent = await fs.readFile(file.file_path, 'utf8');
        fileHash = calculateHash(fileContent);
      } catch (error) {
        console.error('Dosya okuma hatası:', error);
        // Dosya yoksa veya okunamazsa, veritabanındaki loglardan hash hesapla
        const logs = await client.query(
          `SELECT log_hash FROM immutable_access_logs 
           WHERE log_date = $1 
           ORDER BY created_at`,
          [dateStr]
        );
        const allHashes = logs.rows.map(r => r.log_hash).join('');
        fileHash = calculateHash(allHashes);
      }
    }
    
    // Mühür bilgileri
    const sealType = sealOptions.seal_type || 'manual';
    const sealHash = sealOptions.seal_hash || fileHash; // Elektronik imza veya zaman damgası hash'i
    const sealTimestamp = sealOptions.seal_timestamp || getTurkeyTime();
    const sealAuthority = sealOptions.seal_authority || 'SYSTEM';
    
    // Dosyayı mühürle
    await client.query(
      `UPDATE daily_log_files 
       SET file_hash = $1,
           seal_type = $2,
           seal_hash = $3,
           seal_timestamp = $4,
           seal_authority = $5,
           status = 'sealed',
           sealed_at = $6
       WHERE log_date = $7`,
      [fileHash, sealType, sealHash, sealTimestamp, sealAuthority, getTurkeyTime(), dateStr]
    );
    
    return {
      log_date: dateStr,
      file_hash: fileHash,
      seal_hash: sealHash,
      seal_timestamp: sealTimestamp,
      seal_authority: sealAuthority,
      status: 'sealed'
    };
  } catch (error) {
    console.error('Günlük log dosyası mühürleme hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Günlük log dosyalarını listeler
 * @param {Object} filters - Filtre parametreleri
 * @returns {Promise<Array>} Günlük log dosyaları
 */
export async function getDailyLogFiles(filters = {}) {
  const client = await pool.connect();
  
  try {
    let query = `SELECT * FROM daily_log_files WHERE 1=1`;
    const params = [];
    let paramIndex = 1;
    
    if (filters.startDate) {
      query += ` AND log_date >= $${paramIndex++}`;
      params.push(filters.startDate);
    }
    
    if (filters.endDate) {
      query += ` AND log_date <= $${paramIndex++}`;
      params.push(filters.endDate);
    }
    
    if (filters.status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(filters.status);
    }
    
    query += ` ORDER BY log_date DESC`;
    
    if (filters.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(filters.limit);
    }
    
    const result = await client.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('Günlük log dosyaları getirme hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

