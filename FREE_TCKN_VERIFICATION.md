# Ücretsiz TCKN Doğrulama Servisleri

## 🎉 İyi Haber: Ücretsiz Seçenekler Var!

### 1. ✅ NVİ Ücretsiz SOAP Servisi (ÖNERİLEN)

**URL:** `https://tckimlik.nvi.gov.tr/Service/KPSPublic.asmx`

**Özellikler:**
- ✅ **Tamamen ÜCRETSİZ**
- ✅ Resmi devlet servisi
- ✅ Yüksek güvenilirlik
- ✅ Gerçek kişi kontrolü yapıyor

**Gereksinimler:**
- TCKN (11 haneli)
- Ad (tam adın ilk kelimesi)
- Soyad (tam adın geri kalanı)
- Doğum Yılı (doğum tarihinden çıkarılıyor)

**Nasıl Aktif Edilir?**

`backend/.env` dosyasına ekleyin:
```env
USE_NVI_FREE_SERVICE=true
```

**NOT:** Bu servis SOAP formatında çalışır ve ad/soyad gerektirir. Sistem otomatik olarak ad/soyadı parse eder.

---

### 2. ✅ Algoritmik Kontrol (Zaten Aktif)

**Dosya:** `backend/src/utils/tcknValidator.js`

**Özellikler:**
- ✅ **Tamamen ÜCRETSİZ**
- ✅ Hızlı
- ✅ İnternet gerektirmiyor
- ✅ TCKN format kontrolü
- ✅ 10. ve 11. hane algoritmik kontrolü

**Dezavantajları:**
- ❌ Gerçek kişi kontrolü yapmıyor
- ❌ TCKN'nin var olup olmadığını kontrol etmiyor

---

## 🚀 Hızlı Başlangıç

### NVİ Ücretsiz Servisi Aktif Etme

1. **Environment Variable Ekleyin:**
   ```env
   USE_NVI_FREE_SERVICE=true
   ```

2. **Paket Yükleyin:**
   ```bash
   cd backend
   npm install fast-xml-parser
   ```

3. **Backend'i Yeniden Başlatın:**
   ```bash
   npm run dev
   ```

4. **Test Edin:**
   - Kayıt formunda TCKN + Doğum Tarihi + Ad Soyad girin
   - Sistem otomatik olarak NVİ servisini kullanacak

---

## 📊 Karşılaştırma

| Özellik | Algoritmik Kontrol | NVİ Ücretsiz Servisi |
|---------|-------------------|---------------------|
| **Maliyet** | Ücretsiz ✅ | Ücretsiz ✅ |
| **Gerçek Kişi Kontrolü** | ❌ | ✅ |
| **TCKN Var mı Kontrolü** | ❌ | ✅ |
| **Ad/Soyad Gereksinimi** | ❌ | ✅ |
| **İnternet Gereksinimi** | ❌ | ✅ |
| **Hız** | Çok Hızlı | Orta |
| **Güvenilirlik** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

---

## 🔧 Nasıl Çalışıyor?

### 1. Algoritmik Kontrol (Her Zaman Aktif)
```javascript
// TCKN formatını ve algoritmasını kontrol eder
validateTCKN(tckn, birthDate)
```

### 2. NVİ Ücretsiz Servisi (USE_NVI_FREE_SERVICE=true)
```javascript
// TCKN + Ad + Soyad + Doğum Yılı ile gerçek kontrol
verifyWithNVIFreeService(tckn, birthDate, firstName, lastName)
```

**Akış:**
1. Algoritmik kontrol yapılır (hızlı)
2. Eğer geçerliyse ve `USE_NVI_FREE_SERVICE=true` ise:
   - NVİ SOAP servisine istek gönderilir
   - Ad, soyad ve doğum yılı kontrol edilir
   - Gerçek kişi kontrolü yapılır

---

## ⚠️ Önemli Notlar

### NVİ Ücretsiz Servisi İçin:

1. **Ad ve Soyad Gereklidir:**
   - Sistem otomatik olarak `fullName`'den ad ve soyadı parse eder
   - İlk kelime = Ad
   - Geri kalan = Soyad

2. **Doğum Yılı:**
   - Doğum tarihinden otomatik çıkarılır
   - Örnek: `1990-01-01` → `1990`

3. **SOAP Formatı:**
   - Servis SOAP XML formatında çalışır
   - Sistem otomatik olarak XML oluşturur ve parse eder

4. **Hata Durumları:**
   - API erişilemezse → Algoritmik kontrol kullanılır (fallback)
   - Ad/soyad yoksa → Algoritmik kontrol kullanılır
   - Geçersiz bilgiler → Hata döner

---

## 🧪 Test Senaryoları

### Senaryo 1: Sadece Algoritmik Kontrol
```env
USE_NVI_FREE_SERVICE=false
# veya hiç eklemeyin
```
- ✅ TCKN format kontrolü yapılır
- ❌ Gerçek kişi kontrolü yapılmaz

### Senaryo 2: NVİ Ücretsiz Servisi
```env
USE_NVI_FREE_SERVICE=true
```
- ✅ TCKN format kontrolü yapılır
- ✅ Gerçek kişi kontrolü yapılır (Ad + Soyad + Doğum Yılı)

---

## 📝 Örnek Kullanım

### Backend'de:
```javascript
import { verifyTCKN } from './services/tcknVerificationService.js';

const result = await verifyTCKN(
  '12345678901',      // TCKN
  '1990-01-01',       // Doğum tarihi
  'Ahmet Yılmaz'      // Ad Soyad (veya 'Ahmet', 'Yılmaz')
);

if (result.valid) {
  if (result.verified) {
    console.log('NVİ\'den doğrulandı ✅');
  } else {
    console.log('Sadece algoritmik kontrol ✅');
  }
}
```

---

## 🎯 Sonuç

**Ücretsiz seçenekler:**
1. ✅ **Algoritmik Kontrol** - Zaten aktif, ücretsiz, hızlı
2. ✅ **NVİ Ücretsiz SOAP Servisi** - Gerçek kişi kontrolü, ücretsiz

**Öneri:**
- Geliştirme/Test: Algoritmik kontrol yeterli
- Production: `USE_NVI_FREE_SERVICE=true` yaparak gerçek kişi kontrolü aktif edin

---

## 🔗 İlgili Dosyalar

- `backend/src/services/tcknVerificationService.js` - Ana servis
- `backend/src/utils/tcknValidator.js` - Algoritmik kontrol
- `backend/.env` - Yapılandırma

---

## ❓ Sorular

**S: NVİ servisi gerçekten ücretsiz mi?**
C: Evet, resmi NVİ SOAP servisi ücretsizdir. Ancak kullanım koşulları değişebilir, güncel bilgi için NVİ web sitesini kontrol edin.

**S: Ad ve soyad olmadan kullanabilir miyim?**
C: NVİ servisi için ad ve soyad gereklidir. Eğer yoksa algoritmik kontrol kullanılır.

**S: Servis çalışmazsa ne olur?**
C: Otomatik olarak algoritmik kontrol kullanılır (fallback mekanizması).



