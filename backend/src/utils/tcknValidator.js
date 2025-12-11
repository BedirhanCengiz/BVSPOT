/**
 * T.C. Kimlik Numarası Doğrulama Algoritması
 * 
 * Kurallar:
 * 1. 11 haneli olmalı
 * 2. İlk rakam 0 olamaz
 * 3. 1-9 arası rakamların toplamından 10. hane hesaplanır
 * 4. 1-10 arası rakamların toplamından 11. hane hesaplanır
 * 5. Tüm rakamlar aynı olamaz (11111111111 gibi)
 */

export function validateTCKN(tckn, birthDate) {
  const result = {
    valid: false,
    errors: []
  };

  // 1. 11 haneli kontrol
  if (!tckn || typeof tckn !== 'string') {
    result.errors.push('TCKN boş olamaz');
    return result;
  }

  if (tckn.length !== 11) {
    result.errors.push('TCKN 11 haneli olmalıdır');
    return result;
  }

  // 2. Sadece rakam kontrolü
  if (!/^\d+$/.test(tckn)) {
    result.errors.push('TCKN sadece rakamlardan oluşmalıdır');
    return result;
  }

  // 3. İlk rakam 0 olamaz
  if (tckn[0] === '0') {
    result.errors.push('TCKN ilk rakamı 0 olamaz');
    return result;
  }

  // 4. Tüm rakamlar aynı olamaz
  if (/^(\d)\1{10}$/.test(tckn)) {
    result.errors.push('TCKN tüm rakamları aynı olamaz');
    return result;
  }

  // 5. 10. hane kontrolü
  const digits = tckn.split('').map(Number);
  let sum1 = 0;
  let sum2 = 0;

  // İlk 9 rakamın tek sıradakilerinin toplamı
  for (let i = 0; i < 9; i += 2) {
    sum1 += digits[i];
  }

  // İlk 9 rakamın çift sıradakilerinin toplamı
  for (let i = 1; i < 9; i += 2) {
    sum2 += digits[i];
  }

  // 10. hane = (sum1 * 7 - sum2) mod 10
  const checkDigit10 = (sum1 * 7 - sum2) % 10;
  if (checkDigit10 < 0) {
    const checkDigit10Corrected = checkDigit10 + 10;
    if (checkDigit10Corrected !== digits[9]) {
      result.errors.push('TCKN 10. hanesi geçersiz');
      return result;
    }
  } else {
    if (checkDigit10 !== digits[9]) {
      result.errors.push('TCKN 10. hanesi geçersiz');
      return result;
    }
  }

  // 6. 11. hane kontrolü
  // İlk 10 rakamın toplamının mod 10'u
  const sumFirst10 = digits.slice(0, 10).reduce((a, b) => a + b, 0);
  const checkDigit11 = sumFirst10 % 10;

  if (checkDigit11 !== digits[10]) {
    result.errors.push('TCKN 11. hanesi geçersiz');
    return result;
  }

  // 7. Doğum tarihi kontrolü (opsiyonel ama mantıklı kontrol)
  if (birthDate) {
    const birth = new Date(birthDate);
    const now = new Date();
    
    if (birth > now) {
      result.errors.push('Doğum tarihi gelecekte olamaz');
      return result;
    }

    const age = now.getFullYear() - birth.getFullYear();
    if (age < 0 || age > 120) {
      result.errors.push('Doğum tarihi mantıklı bir aralıkta olmalıdır');
      return result;
    }
  }

  result.valid = true;
  return result;
}

/**
 * TCKN'yi maskeler (güvenlik için)
 * Örnek: 12345678901 -> 12345****01
 */
export function maskTCKN(tckn) {
  if (!tckn || tckn.length !== 11) return tckn;
  return tckn.substring(0, 5) + '****' + tckn.substring(9);
}

/**
 * Telefon numarasını maskeler
 * Örnek: 05551234567 -> 0555***4567
 */
export function maskPhone(phone) {
  if (!phone || phone.length < 10) return phone;
  return phone.substring(0, 4) + '***' + phone.substring(7);
}

