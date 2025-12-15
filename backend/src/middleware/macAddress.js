/**
 * MAC adresini request'ten otomatik çeker
 * Captive Portal entegrasyonu için
 */

/**
 * MAC adresini çeşitli kaynaklardan otomatik çeker
 * Öncelik sırası:
 * 1. Body'den (macAddress)
 * 2. Query parametresinden (?mac=...)
 * 3. HTTP header'dan (X-MAC-Address)
 * 4. IP adresinden çözümleme (opsiyonel, RADIUS/hotspot API üzerinden)
 */
export function extractMacAddress(req) {
  // 1. Body'den al
  if (req.body && req.body.macAddress) {
    const mac = req.body.macAddress.trim();
    if (isValidMacFormat(mac)) {
      return normalizeMacAddress(mac);
    }
  }

  // 2. Query parametresinden al
  if (req.query && req.query.mac) {
    const mac = req.query.mac.trim();
    if (isValidMacFormat(mac)) {
      return normalizeMacAddress(mac);
    }
  }

  // 3. HTTP header'dan al (captive portal'larda yaygın)
  const headerMac = req.headers['x-mac-address'] || 
                    req.headers['x-mac'] || 
                    req.headers['mac-address'] ||
                    req.headers['mac'];
  
  if (headerMac) {
    const mac = String(headerMac).trim();
    if (isValidMacFormat(mac)) {
      return normalizeMacAddress(mac);
    }
  }

  // MAC adresi bulunamadı
  return null;
}

/**
 * MAC adresi formatını doğrular
 */
function isValidMacFormat(mac) {
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
function normalizeMacAddress(mac) {
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
  return cleaned.match(/.{1,2}/g).join(':');
}

/**
 * Express middleware - MAC adresini req.macAddress'e ekler
 */
export function macAddressMiddleware(req, res, next) {
  const macAddress = extractMacAddress(req);
  
  if (macAddress) {
    req.macAddress = macAddress;
    // Body'ye de ekle (eğer yoksa)
    if (!req.body.macAddress) {
      req.body.macAddress = macAddress;
    }
  }
  
  next();
}



