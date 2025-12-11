import axios from 'axios';
import { validateTCKN } from '../utils/tcknValidator.js';
import { XMLParser } from 'fast-xml-parser';

/**
 * TCKN Gerçek Kişi Doğrulama Servisi
 * 
 * Bu servis TCKN ve doğum tarihini birlikte kontrol eder.
 * Gerçek bir kişi olup olmadığını doğrular.
 */

const TCKN_VERIFICATION_API_URL = process.env.TCKN_VERIFICATION_API_URL;
const TCKN_VERIFICATION_API_KEY = process.env.TCKN_VERIFICATION_API_KEY;
const TCKN_VERIFICATION_ENABLED = process.env.TCKN_VERIFICATION_ENABLED === 'true';
const USE_NVI_FREE_SERVICE = process.env.USE_NVI_FREE_SERVICE === 'true'; // NVİ ücretsiz SOAP servisi
const NVI_FREE_SERVICE_URL = 'https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx';

/**
 * TCKN ve doğum tarihini gerçek API ile doğrula
 * 
 * @param {string} tckn - TC Kimlik Numarası
 * @param {string} birthDate - Doğum tarihi (YYYY-MM-DD formatında)
 * @param {string} firstName - Ad (opsiyonel, daha güvenilir doğrulama için)
 * @param {string} lastName - Soyad (opsiyonel, daha güvenilir doğrulama için)
 * @returns {Promise<{valid: boolean, errors: string[], verified: boolean}>}
 */
export async function verifyTCKNWithAPI(tckn, birthDate, firstName = null, lastName = null) {
  const result = {
    valid: false,
    verified: false, // Gerçek API'den doğrulandı mı?
    errors: []
  };

  // Önce algoritmik kontrolü yap
  const algorithmicCheck = validateTCKN(tckn, birthDate);
  if (!algorithmicCheck.valid) {
    result.errors = algorithmicCheck.errors;
    return result;
  }

  // NVİ ücretsiz SOAP servisi kullanılıyor mu?
  if (USE_NVI_FREE_SERVICE) {
    return await verifyWithNVIFreeService(tckn, birthDate, firstName, lastName);
  }

  // Eğer gerçek API entegrasyonu aktif değilse, sadece algoritmik kontrolü kullan
  if (!TCKN_VERIFICATION_ENABLED || !TCKN_VERIFICATION_API_URL) {
    console.log('[TCKN Verification] API entegrasyonu aktif değil, sadece algoritmik kontrol kullanılıyor');
    result.valid = true;
    result.verified = false; // Gerçek API'den doğrulanmadı
    return result;
  }

  try {
    // Gerçek API çağrısı
    // NOT: Bu örnek bir yapıdır, gerçek API entegrasyonu için servis sağlayıcınızın dokümantasyonuna bakın
    
    const requestData = {
      tckn: tckn,
      birthDate: birthDate,
      ...(firstName && { firstName }),
      ...(lastName && { lastName })
    };

    const response = await axios.post(
      TCKN_VERIFICATION_API_URL,
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          ...(TCKN_VERIFICATION_API_KEY && { 'Authorization': `Bearer ${TCKN_VERIFICATION_API_KEY}` })
        },
        timeout: 10000 // 10 saniye timeout
      }
    );

    // API yanıtını kontrol et
    if (response.data && response.data.valid === true) {
      // Doğum tarihi eşleşiyor mu kontrol et
      if (response.data.birthDate) {
        const apiBirthDate = new Date(response.data.birthDate).toISOString().split('T')[0];
        const providedBirthDate = new Date(birthDate).toISOString().split('T')[0];
        
        if (apiBirthDate !== providedBirthDate) {
          result.errors.push('TCKN ile doğum tarihi eşleşmiyor');
          return result;
        }
      }

      result.valid = true;
      result.verified = true; // Gerçek API'den doğrulandı
      return result;
    } else {
      result.errors.push('TCKN doğrulanamadı - böyle bir kişi bulunamadı');
      return result;
    }

  } catch (error) {
    console.error('[TCKN Verification] API hatası:', error.message);
    
    // API hatası durumunda algoritmik kontrolü kabul et (fallback)
    // Production'da bu davranışı değiştirebilirsiniz
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.response?.status >= 500) {
      console.warn('[TCKN Verification] API erişilemedi, algoritmik kontrol kullanılıyor');
      result.valid = true;
      result.verified = false;
      result.errors.push('Doğrulama servisi geçici olarak kullanılamıyor, algoritmik kontrol kullanıldı');
      return result;
    }

    // 4xx hataları (kullanıcı hatası) - gerçek hata
    if (error.response?.status >= 400 && error.response?.status < 500) {
      result.errors.push('TCKN doğrulanamadı - geçersiz bilgiler');
      return result;
    }

    // Diğer hatalar için algoritmik kontrolü kabul et
    result.valid = true;
    result.verified = false;
    return result;
  }
}

/**
 * TCKN doğrulama (ana fonksiyon)
 * Önce algoritmik kontrol, sonra gerçek API kontrolü
 * 
 * @param {string} tckn - TC Kimlik Numarası
 * @param {string} birthDate - Doğum tarihi
 * @param {string} firstName - Ad (opsiyonel)
 * @param {string} lastName - Soyad (opsiyonel)
 * @returns {Promise<{valid: boolean, errors: string[], verified: boolean}>}
 */
export async function verifyTCKN(tckn, birthDate, firstName = null, lastName = null) {
  // Ad soyad varsa tam adı parse et
  let parsedFirstName = firstName;
  let parsedLastName = lastName;

  if (!parsedFirstName && !parsedLastName && firstName) {
    // Eğer sadece fullName varsa, ilk kelimeyi ad, geri kalanını soyad olarak al
    const nameParts = firstName.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      parsedFirstName = nameParts[0];
      parsedLastName = nameParts.slice(1).join(' ');
    }
  }

  return await verifyTCKNWithAPI(tckn, birthDate, parsedFirstName, parsedLastName);
}

/**
 * NVİ Ücretsiz SOAP Servisi
 * https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx
 * 
 * NOT: Bu servis ücretsizdir ancak:
 * - Ad, Soyad ve Doğum Yılı gerektirir
 * - Sadece TCKN + Doğum Tarihi yeterli değil
 * - SOAP formatında istek gönderilir
 */
export async function verifyWithNVIFreeService(tckn, birthDate, firstName, lastName) {
  const result = {
    valid: false,
    verified: false,
    errors: []
  };

  // Önce algoritmik kontrolü yap
  const algorithmicCheck = validateTCKN(tckn, birthDate);
  if (!algorithmicCheck.valid) {
    result.errors = algorithmicCheck.errors;
    return result;
  }

  // Ad ve soyad gereklidir
  if (!firstName || !lastName) {
    console.warn('[NVİ Free Service] Ad ve soyad gereklidir, algoritmik kontrol kullanılıyor');
    result.valid = true;
    result.verified = false;
    return result;
  }

  // Doğum yılını çıkar
  const birthYear = new Date(birthDate).getFullYear();

  try {
    // SOAP XML isteği oluştur
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" 
               xmlns:xsd="http://www.w3.org/2001/XMLSchema" 
               xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TCKimlikNoDogrula xmlns="http://tckimlik.nvi.gov.tr/WS">
      <TCKimlikNo>${tckn}</TCKimlikNo>
      <Ad>${firstName.toUpperCase()}</Ad>
      <Soyad>${lastName.toUpperCase()}</Soyad>
      <DogumYili>${birthYear}</DogumYili>
    </TCKimlikNoDogrula>
  </soap:Body>
</soap:Envelope>`;

    const response = await axios.post(
      NVI_FREE_SERVICE_URL,
      soapEnvelope,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://tckimlik.nvi.gov.tr/WS/TCKimlikNoDogrula'
        },
        timeout: 10000
      }
    );

    // SOAP yanıtını parse et
    const parser = new XMLParser();
    const parsedResponse = parser.parse(response.data);
    
    // Yanıt yapısı: soap:Envelope.soap:Body.TCKimlikNoDogrulaResponse.TCKimlikNoDogrulaResult
    const soapBody = parsedResponse['soap:Envelope']?.['soap:Body'];
    const resultNode = soapBody?.TCKimlikNoDogrulaResponse?.TCKimlikNoDogrulaResult;
    
    if (resultNode === true || resultNode === 'true') {
      result.valid = true;
      result.verified = true; // NVİ'den doğrulandı
      return result;
    } else {
      result.errors.push('TCKN, ad, soyad veya doğum yılı eşleşmiyor');
      return result;
    }

  } catch (error) {
    console.error('[NVİ Free Service] Hata:', error.message);
    
    // API hatası durumunda algoritmik kontrolü kabul et (fallback)
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT' || error.response?.status >= 500) {
      console.warn('[NVİ Free Service] Servis erişilemedi, algoritmik kontrol kullanılıyor');
      result.valid = true;
      result.verified = false;
      result.errors.push('NVİ servisi geçici olarak kullanılamıyor, algoritmik kontrol kullanıldı');
      return result;
    }

    // 4xx hataları - gerçek hata
    if (error.response?.status >= 400 && error.response?.status < 500) {
      result.errors.push('TCKN doğrulanamadı - geçersiz bilgiler');
      return result;
    }

    // Diğer hatalar için algoritmik kontrolü kabul et
    result.valid = true;
    result.verified = false;
    return result;
  }
}

/**
 * NVİ (Nüfus ve Vatandaşlık İşleri) Ücretli API entegrasyonu örneği
 * NOT: Bu sadece bir örnek yapıdır, gerçek API dokümantasyonuna göre güncellenmelidir
 */
export async function verifyWithNVI(tckn, birthDate, firstName, lastName) {
  // NVİ ücretli API entegrasyonu için örnek yapı
  // Gerçek implementasyon için NVİ dokümantasyonuna bakın
  // https://www.nvi.gov.tr/
  
  const nviApiUrl = process.env.NVI_API_URL || 'https://api.nvi.gov.tr/v1/verify';
  
  try {
    const response = await axios.post(
      nviApiUrl,
      {
        tckn,
        birthDate,
        firstName,
        lastName
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.NVI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      valid: response.data.valid === true,
      verified: true,
      errors: response.data.errors || []
    };
  } catch (error) {
    throw error;
  }
}

