/**
 * Zaman Yönetimi Utils
 * UTC+3 (Türkiye saati) ve NTP senkronizasyonu
 */

/**
 * UTC+3 (Türkiye saati) alır
 * @returns {Date} UTC+3 zamanı
 */
export function getTurkeyTime() {
  const now = new Date();
  // UTC+3 offset (3 saat = 3 * 60 * 60 * 1000 ms)
  const turkeyOffset = 3 * 60 * 60 * 1000;
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  return new Date(utcTime + turkeyOffset);
}

/**
 * UTC+3 zamanını ISO string'e çevirir
 * @returns {string} ISO formatında UTC+3 zamanı
 */
export function getTurkeyTimeISO() {
  return getTurkeyTime().toISOString();
}

/**
 * Tarihi UTC+3'e göre formatlar
 * @param {Date} date - Formatlanacak tarih
 * @returns {string} Formatlanmış tarih
 */
export function formatTurkeyTime(date) {
  const turkeyTime = getTurkeyTime();
  return turkeyTime.toISOString().replace('T', ' ').substring(0, 19) + ' +03:00';
}

/**
 * NTP senkronizasyon kontrolü (basit versiyon)
 * Production'da gerçek NTP servisi kullanılmalı
 * @returns {Promise<boolean>} Senkronize durumu
 */
export async function checkNTPSync() {
  // Basit kontrol - sistem zamanının makul aralıkta olduğunu kontrol eder
  // Production'da gerçek NTP servisi ile entegrasyon yapılmalı
  try {
    const systemTime = Date.now();
    const turkeyTime = getTurkeyTime();
    
    // Sistem zamanı ile UTC+3 zamanı arasındaki fark 1 saatten az olmalı
    const diff = Math.abs(systemTime - turkeyTime.getTime());
    const oneHour = 60 * 60 * 1000;
    
    return diff < oneHour;
  } catch (error) {
    console.error('NTP senkronizasyon kontrolü hatası:', error);
    return false;
  }
}

/**
 * PostgreSQL için UTC+3 zaman fonksiyonu
 * @returns {string} SQL fonksiyonu
 */
export function getTurkeyTimeSQL() {
  return "(NOW() AT TIME ZONE 'Europe/Istanbul')";
}

