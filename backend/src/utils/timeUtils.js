/**
 * Zaman Yönetimi Utils
 * UTC+3 (Türkiye saati) ve NTP senkronizasyonu
 */

import { getNTPTime as fetchNTPTime } from './ntpClient.js';

// NTP offset cache (sistem zamanı ile NTP zamanı arasındaki fark)
let ntpOffset = 0;
let lastNTPCheck = 0;
const NTP_CACHE_DURATION = 3600000; // 1 saat cache

/**
 * NTP offset'ini günceller (cache'lenmiş)
 * @returns {Promise<number>} Offset (ms)
 */
async function updateNTPOffset() {
  const now = Date.now();
  
  // Cache kontrolü
  if (now - lastNTPCheck < NTP_CACHE_DURATION && ntpOffset !== 0) {
    return ntpOffset;
  }
  
  try {
    const ntpTime = await fetchNTPTime();
    const systemTime = new Date();
    ntpOffset = ntpTime.getTime() - systemTime.getTime();
    lastNTPCheck = now;
    
    console.log(`[NTP] Offset güncellendi: ${ntpOffset}ms (NTP: ${ntpTime.toISOString()}, Sistem: ${systemTime.toISOString()})`);
    
    return ntpOffset;
  } catch (error) {
    console.error('[NTP] Offset güncellenemedi, sistem zamanı kullanılıyor:', error.message);
    // Hata durumunda offset'i 0 yap (sistem zamanını kullan)
    ntpOffset = 0;
    return 0;
  }
}

/**
 * UTC+3 (Türkiye saati) alır - NTP senkronize
 * @param {boolean} useNTP - NTP kullanılsın mı? (varsayılan: true)
 * @returns {Date} UTC+3 zamanı
 */
export async function getTurkeyTime(useNTP = true) {
  let now;
  
  if (useNTP) {
    try {
      // NTP offset'ini güncelle
      const offset = await updateNTPOffset();
      now = new Date(Date.now() + offset);
    } catch (error) {
      // NTP hatası durumunda sistem zamanını kullan
      console.warn('[NTP] Sistem zamanı kullanılıyor:', error.message);
      now = new Date();
    }
  } else {
    now = new Date();
  }
  
  // UTC+3 offset (3 saat = 3 * 60 * 60 * 1000 ms)
  const turkeyOffset = 3 * 60 * 60 * 1000;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utcTime + turkeyOffset);
}

/**
 * Senkronize olmayan versiyon (hızlı, cache kullanır)
 * @returns {Date} UTC+3 zamanı
 */
export function getTurkeyTimeSync() {
  const now = new Date(Date.now() + ntpOffset);
  const turkeyOffset = 3 * 60 * 60 * 1000;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utcTime + turkeyOffset);
}

/**
 * UTC+3 zamanını ISO string'e çevirir (senkronize)
 * @returns {Promise<string>} ISO formatında UTC+3 zamanı
 */
export async function getTurkeyTimeISO() {
  const time = await getTurkeyTime();
  return time.toISOString();
}

/**
 * UTC+3 zamanını ISO string'e çevirir (senkronize olmayan, hızlı)
 * @returns {string} ISO formatında UTC+3 zamanı
 */
export function getTurkeyTimeISOSync() {
  return getTurkeyTimeSync().toISOString();
}

/**
 * Tarihi UTC+3'e göre formatlar
 * @param {Date} date - Formatlanacak tarih (opsiyonel, yoksa şu anki zaman)
 * @returns {string} Formatlanmış tarih
 */
export function formatTurkeyTime(date = null) {
  const turkeyTime = date || getTurkeyTimeSync();
  return turkeyTime.toISOString().replace('T', ' ').substring(0, 19) + ' +03:00';
}

/**
 * NTP senkronizasyon kontrolü
 * @returns {Promise<{synced: boolean, offset: number, message: string}>} Senkronize durumu
 */
export async function checkNTPSync() {
  try {
    const offset = await updateNTPOffset();
    const absOffset = Math.abs(offset);
    const oneSecond = 1000;
    const oneMinute = 60 * 1000;
    
    if (absOffset < oneSecond) {
      return {
        synced: true,
        offset: offset,
        message: `Mükemmel senkronizasyon (${offset}ms fark)`
      };
    } else if (absOffset < oneMinute) {
      return {
        synced: true,
        offset: offset,
        message: `İyi senkronizasyon (${Math.round(offset / 1000)}s fark)`
      };
    } else {
      return {
        synced: false,
        offset: offset,
        message: `Senkronizasyon hatası (${Math.round(offset / 1000)}s fark)`
      };
    }
  } catch (error) {
    console.error('[NTP] Senkronizasyon kontrolü hatası:', error);
    return {
      synced: false,
      offset: 0,
      message: `NTP kontrolü başarısız: ${error.message}`
    };
  }
}

/**
 * NTP offset'ini manuel olarak günceller
 * @returns {Promise<number>} Offset (ms)
 */
export async function syncNTP() {
  return await updateNTPOffset();
}

/**
 * PostgreSQL için UTC+3 zaman fonksiyonu
 * @returns {string} SQL fonksiyonu
 */
export function getTurkeyTimeSQL() {
  return "(NOW() AT TIME ZONE 'Europe/Istanbul')";
}

