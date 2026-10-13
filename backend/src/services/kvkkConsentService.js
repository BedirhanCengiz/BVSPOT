import { pool } from '../database/db.js';
import { calculateHash } from './hashChainService.js';
import { getTurkeyTime } from '../utils/timeUtils.js';

/**
 * KVKK Consent Servisi
 * Kullanıcı onaylarını detaylı şekilde kaydeder
 */

/**
 * KVKK onay kaydı oluşturur
 * @param {Object} consentData - Onay verisi
 * @returns {Promise<number>} Onay kaydı ID
 */
export async function createKVKKConsent(consentData) {
  const client = await pool.connect();
  
  try {
    const {
      user_id,
      consent_type, // 'kvkk', 'terms', 'law5651'
      consent_version, // Metin versiyonu (örn: '1.0')
      consent_text, // Onaylanan metin (hash'lenecek)
      ip_address,
      user_agent
    } = consentData;
    
    // Metin hash'ini hesapla
    const consentTextHash = consent_text ? calculateHash(consent_text) : null;
    
    const result = await client.query(
      `INSERT INTO kvkk_consents (
        user_id, consent_type, consent_version,
        consent_text_hash, ip_address, user_agent,
        accepted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        user_id || null,
        consent_type,
        consent_version,
        consentTextHash,
        ip_address,
        user_agent || null,
        getTurkeyTime()
      ]
    );
    
    return result.rows[0].id;
  } catch (error) {
    console.error('KVKK onay kaydı oluşturma hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Kullanıcının onay geçmişini getirir
 * @param {number} userId - Kullanıcı ID
 * @returns {Promise<Array>} Onay kayıtları
 */
export async function getUserConsents(userId) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      `SELECT * FROM kvkk_consents
       WHERE user_id = $1
       ORDER BY accepted_at DESC`,
      [userId]
    );
    
    return result.rows;
  } catch (error) {
    console.error('Kullanıcı onay geçmişi getirme hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Belirli bir onay metninin versiyonunu kontrol eder
 * @param {string} consentType - Onay tipi
 * @param {string} consentVersion - Versiyon
 * @returns {Promise<Object|null>} Onay metni bilgisi
 */
export async function getConsentVersion(consentType, consentVersion) {
  const client = await pool.connect();
  
  try {
    // Bu fonksiyon settings tablosundan veya ayrı bir consent_texts tablosundan
    // onay metnini alabilir. Şimdilik null döndürüyoruz.
    // Production'da consent metinleri ayrı bir tabloda saklanmalı.
    return null;
  } catch (error) {
    console.error('Onay versiyonu getirme hatası:', error);
    throw error;
  } finally {
    client.release();
  }
}

