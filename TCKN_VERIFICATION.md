# TCKN Gerçek Kişi Doğrulama Servisi

Bu dokümantasyon, TCKN ve doğum tarihi ile gerçek kişi kontrolü yapmak için hazırlanmıştır.

## Özellikler

- ✅ Algoritmik TCKN kontrolü (her zaman aktif)
- ✅ Gerçek API entegrasyonu (opsiyonel)
- ✅ TCKN + Doğum Tarihi birlikte kontrol
- ✅ Ad Soyad ile ek doğrulama (opsiyonel)
- ✅ API hatası durumunda fallback mekanizması

## Yapılandırma

### 1. Environment Variables

`backend/.env` dosyasına aşağıdaki değişkenleri ekleyin:

```env
# TCKN Doğrulama Servisi Ayarları
TCKN_VERIFICATION_ENABLED=false  # true yaparak gerçek API'yi aktifleştirin
TCKN_VERIFICATION_API_URL=https://api.example.com/tckn/verify
TCKN_VERIFICATION_API_KEY=your_api_key_here

# NVİ API (Alternatif)
NVI_API_URL=https://api.nvi.gov.tr/v1/verify
NVI_API_KEY=your_nvi_api_key
```

### 2. Şu Anki Durum

**Varsayılan olarak sadece algoritmik kontrol aktif:**
- TCKN format kontrolü
- 10. ve 11. hane algoritmik kontrolü
- Doğum tarihi mantık kontrolü

**Gerçek API entegrasyonu için:**
- `TCKN_VERIFICATION_ENABLED=true` yapın
- API URL ve Key'i ayarlayın

## Kullanılabilir Servisler

### 1. NVİ (Nüfus ve Vatandaşlık İşleri) API
- **Resmi servis**
- Ücretli
- Yüksek güvenilirlik
- Dokümantasyon: https://www.nvi.gov.tr/

### 2. E-Devlet API
- **Resmi servis**
- Ücretli
- Dokümantasyon: https://www.turkiye.gov.tr/

### 3. Üçüncü Parti Servisler
- kimlikdoğrulama.com
- tckimlikdogrulama.com
- Diğer özel servisler

## API Entegrasyonu Nasıl Yapılır?

### Adım 1: Servis Sağlayıcıdan API Key Alın

Örnek: NVİ API için başvuru yapın ve API key alın.

### Adım 2: Environment Variables Ayarlayın

```env
TCKN_VERIFICATION_ENABLED=true
TCKN_VERIFICATION_API_URL=https://api.nvi.gov.tr/v1/verify
TCKN_VERIFICATION_API_KEY=your_api_key_here
```

### Adım 3: API Formatını Güncelleyin

`backend/src/services/tcknVerificationService.js` dosyasındaki `verifyTCKNWithAPI` fonksiyonunu servis sağlayıcınızın API formatına göre güncelleyin.

### Örnek API Request Formatı:

```javascript
POST https://api.example.com/tckn/verify
Headers:
  Authorization: Bearer YOUR_API_KEY
  Content-Type: application/json

Body:
{
  "tckn": "12345678901",
  "birthDate": "1990-01-01",
  "firstName": "Ahmet",
  "lastName": "Yılmaz"
}

Response:
{
  "valid": true,
  "birthDate": "1990-01-01",
  "firstName": "Ahmet",
  "lastName": "Yılmaz"
}
```

## Test Etme

### 1. Algoritmik Kontrol (Şu An Aktif)

```bash
# Backend'i başlat
cd backend && npm run dev

# Test isteği gönder
curl -X POST http://localhost:3001/api/auth/validate-tckn \
  -H "Content-Type: application/json" \
  -d '{
    "tckn": "12345678901",
    "birthDate": "1990-01-01",
    "fullName": "Test User"
  }'
```

### 2. Gerçek API Kontrolü (API Key Gerekli)

```env
TCKN_VERIFICATION_ENABLED=true
TCKN_VERIFICATION_API_URL=your_api_url
TCKN_VERIFICATION_API_KEY=your_api_key
```

## Güvenlik Notları

1. **API Key'i Güvenli Tutun**: `.env` dosyasını asla commit etmeyin
2. **Rate Limiting**: API sağlayıcınızın rate limit'lerine dikkat edin
3. **Timeout**: API çağrıları için timeout ayarlayın (varsayılan: 10 saniye)
4. **Fallback**: API erişilemezse algoritmik kontrol kullanılır
5. **Logging**: TCKN'leri loglarda maskelenmiş olarak saklayın

## Hata Yönetimi

- **API Erişilemez**: Algoritmik kontrol kullanılır (fallback)
- **API 4xx Hatası**: Kullanıcı hatası, kayıt reddedilir
- **API 5xx Hatası**: Sunucu hatası, algoritmik kontrol kullanılır
- **Timeout**: Algoritmik kontrol kullanılır

## Örnek Kullanım

```javascript
import { verifyTCKN } from './services/tcknVerificationService.js';

const result = await verifyTCKN(
  '12345678901',      // TCKN
  '1990-01-01',       // Doğum tarihi
  'Ahmet',            // Ad (opsiyonel)
  'Yılmaz'           // Soyad (opsiyonel)
);

if (result.valid) {
  console.log('TCKN geçerli');
  if (result.verified) {
    console.log('Gerçek API\'den doğrulandı');
  } else {
    console.log('Sadece algoritmik kontrol ile doğrulandı');
  }
} else {
  console.log('Hatalar:', result.errors);
}
```

## Sorun Giderme

### API Çalışmıyor
- `TCKN_VERIFICATION_ENABLED=false` yaparak sadece algoritmik kontrolü kullanın
- API URL ve Key'i kontrol edin
- Network bağlantısını kontrol edin

### Yanlış Sonuçlar
- API dokümantasyonunu kontrol edin
- Request/Response formatını doğrulayın
- Logları kontrol edin

## İletişim

API entegrasyonu için sorularınız varsa:
- Servis sağlayıcınızın dokümantasyonuna bakın
- `backend/src/services/tcknVerificationService.js` dosyasını inceleyin



