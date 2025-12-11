/**
 * MAC adresini otomatik olarak çeşitli kaynaklardan çeker
 * Captive Portal entegrasyonu için
 */

/**
 * MAC adresini otomatik olarak çeker
 * Öncelik sırası:
 * 1. URL query parametresi (?mac=...)
 * 2. HTTP header (X-MAC-Address)
 * 3. Referrer URL'den
 * 4. null döner (opsiyonel)
 */
export function getMacAddress(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  // 1. URL query parametresinden al (?mac=AA:BB:CC:DD:EE:FF)
  const urlParams = new URLSearchParams(window.location.search);
  let macAddress = urlParams.get('mac') || urlParams.get('macAddress') || urlParams.get('mac_address');
  
  if (macAddress && isValidMacFormat(macAddress)) {
    return normalizeMacAddress(macAddress);
  }

  // 2. Referrer URL'den al (captive portal redirect'lerinde)
  try {
    const referrer = document.referrer;
    if (referrer) {
      const referrerUrl = new URL(referrer);
      macAddress = referrerUrl.searchParams.get('mac') || 
                   referrerUrl.searchParams.get('macAddress') || 
                   referrerUrl.searchParams.get('mac_address');
      
      if (macAddress && isValidMacFormat(macAddress)) {
        return normalizeMacAddress(macAddress);
      }
    }
  } catch (e) {
    // Referrer parse hatası, devam et
  }

  // 3. Hash'ten al (#mac=...)
  const hash = window.location.hash;
  if (hash) {
    const hashParams = new URLSearchParams(hash.substring(1));
    macAddress = hashParams.get('mac') || hashParams.get('macAddress') || hashParams.get('mac_address');
    
    if (macAddress && isValidMacFormat(macAddress)) {
      return normalizeMacAddress(macAddress);
    }
  }

  // MAC adresi bulunamadı, null döner
  return null;
}

/**
 * MAC adresi formatını doğrular
 * Kabul edilen formatlar:
 * - AA:BB:CC:DD:EE:FF (colon)
 * - AA-BB-CC-DD-EE-FF (dash)
 * - AABBCCDDEEFF (no separator)
 */
function isValidMacFormat(mac: string): boolean {
  if (!mac || typeof mac !== 'string') {
    return false;
  }

  // Temizle ve normalize et
  const cleaned = mac.trim().toUpperCase().replace(/[^0-9A-F]/g, '');
  
  // 12 hex karakter olmalı
  if (cleaned.length !== 12) {
    return false;
  }

  // Hex karakter kontrolü
  return /^[0-9A-F]{12}$/.test(cleaned);
}

/**
 * MAC adresini standart formata çevirir (AA:BB:CC:DD:EE:FF)
 */
function normalizeMacAddress(mac: string): string {
  if (!mac) {
    return '';
  }

  // Tüm ayırıcıları kaldır ve büyük harfe çevir
  const cleaned = mac.trim().toUpperCase().replace(/[^0-9A-F]/g, '');
  
  // 12 karakter olmalı
  if (cleaned.length !== 12) {
    return mac; // Orijinali döndür
  }

  // AA:BB:CC:DD:EE:FF formatına çevir
  return cleaned.match(/.{1,2}/g)?.join(':') || mac;
}

/**
 * MAC adresini sessionStorage'a kaydeder (tekrar kullanım için)
 */
export function saveMacAddress(macAddress: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (macAddress && isValidMacFormat(macAddress)) {
    try {
      sessionStorage.setItem('macAddress', normalizeMacAddress(macAddress));
    } catch (e) {
      // SessionStorage hatası, sessizce devam et
    }
  }
}

/**
 * SessionStorage'dan MAC adresini alır
 */
export function getSavedMacAddress(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const saved = sessionStorage.getItem('macAddress');
    if (saved && isValidMacFormat(saved)) {
      return normalizeMacAddress(saved);
    }
  } catch (e) {
    // SessionStorage hatası
  }

  return null;
}

/**
 * MAC adresini otomatik çeker veya kaydedilmiş olanı kullanır
 */
export function getMacAddressAuto(): string | null {
  // Önce otomatik çekmeyi dene
  const autoMac = getMacAddress();
  if (autoMac) {
    saveMacAddress(autoMac);
    return autoMac;
  }

  // Kaydedilmiş MAC adresini kullan
  const savedMac = getSavedMacAddress();
  if (savedMac) {
    return savedMac;
  }

  return null;
}


