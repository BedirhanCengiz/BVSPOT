import crypto from 'crypto';
import { pool } from '../database/db.js';

/**
 * Hash Chain Servisi
 * 5651 Kanunu uyumlu - Logların değiştirilemezliğini sağlar
 * Her log satırı SHA-256 ile hashlenir ve önceki logun hash'i ile zincirlenir
 */

/**
 * SHA-256 hash hesaplar
 * @param {string} data - Hashlenecek veri
 * @returns {string} SHA-256 hash (hex)
 */
export function calculateHash(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Log satırından hash hesaplar
 * @param {Object} logData - Log verisi
 * @returns {string} Log hash'i
 */
export function calculateLogHash(logData) {
  // Log verisini deterministik şekilde string'e çevir
  const logString = JSON.stringify({
    user_id: logData.user_id || null,
    session_id: logData.session_id || null,
    internal_ip: logData.internal_ip,
    external_ip: logData.external_ip || null,
    source_ip: logData.source_ip || null,
    destination_ip: logData.destination_ip || null,
    mac_address: logData.mac_address,
    gateway_id: logData.gateway_id || null,
    firewall_id: logData.firewall_id || null,
    connection_start_time: logData.connection_start_time,
    connection_end_time: logData.connection_end_time || null,
    source_port: logData.source_port || null,
    destination_port: logData.destination_port || null,
    protocol: logData.protocol || null,
    session_duration_seconds: logData.session_duration_seconds || null,
    data_transferred_bytes: logData.data_transferred_bytes || 0,
    log_date: logData.log_date
  });
  
  return calculateHash(logString);
}

/**
 * Önceki logun hash'ini alır (hash chain için)
 * @returns {Promise<string|null>} Önceki logun hash'i veya null
 */
export async function getPreviousLogHash() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT log_hash FROM log_hash_chain 
       ORDER BY chain_position DESC 
       LIMIT 1`
    );
    
    if (result.rows.length > 0) {
      return result.rows[0].log_hash;
    }
    
    return null; // İlk log
  } catch (error) {
    console.error('Önceki log hash alma hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Hash chain'e yeni log ekler
 * @param {number} logId - Log ID
 * @param {string} logHash - Log hash'i
 * @param {string|null} previousHash - Önceki logun hash'i
 * @returns {Promise<void>}
 */
export async function addToHashChain(logId, logHash, previousHash = null) {
  const client = await pool.connect();
  
  try {
    // Chain pozisyonunu al
    const positionResult = await client.query(
      `SELECT COALESCE(MAX(chain_position), 0) + 1 as next_position 
       FROM log_hash_chain`
    );
    const nextPosition = positionResult.rows[0].next_position;
    
    // Hash chain'e ekle
    await client.query(
      `INSERT INTO log_hash_chain (log_id, log_hash, previous_hash, chain_position)
       VALUES ($1, $2, $3, $4)`,
      [logId, logHash, previousHash, nextPosition]
    );
  } catch (error) {
    console.error('Hash chain ekleme hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Hash chain'in bütünlüğünü kontrol eder
 * @returns {Promise<Object>} Kontrol sonucu
 */
export async function verifyHashChain() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT 
        lhc.id,
        lhc.log_id,
        lhc.log_hash,
        lhc.previous_hash,
        lhc.chain_position,
        ial.log_hash as actual_log_hash
       FROM log_hash_chain lhc
       LEFT JOIN immutable_access_logs ial ON lhc.log_id = ial.id
       ORDER BY lhc.chain_position`
    );
    
    const issues = [];
    let previousHash = null;
    
    for (const row of result.rows) {
      // Hash eşleşmesi kontrolü
      if (row.actual_log_hash && row.log_hash !== row.actual_log_hash) {
        issues.push({
          type: 'hash_mismatch',
          log_id: row.log_id,
          chain_position: row.chain_position,
          expected: row.log_hash,
          actual: row.actual_log_hash
        });
      }
      
      // Zincir kontrolü
      if (previousHash && row.previous_hash !== previousHash) {
        issues.push({
          type: 'chain_break',
          log_id: row.log_id,
          chain_position: row.chain_position,
          expected_previous: previousHash,
          actual_previous: row.previous_hash
        });
      }
      
      previousHash = row.log_hash;
    }
    
    return {
      valid: issues.length === 0,
      total_logs: result.rows.length,
      issues
    };
  } catch (error) {
    console.error('Hash chain doğrulama hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}
