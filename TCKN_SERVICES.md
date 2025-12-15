# TCKN Doğrulama Servisleri - Detaylı Bilgi

## 🔍 Şu Anki Durum

### 1. Algoritmik Kontrol (Aktif ✅)
**Dosya:** `backend/src/utils/tcknValidator.js`

**Ne yapıyor?**
- TCKN formatını kontrol eder (11 haneli, rakam kontrolü)
- 10. ve 11. haneyi algoritmik olarak doğrular
- Doğum tarihi mantık kontrolü yapar (gelecek tarih, yaş kontrolü)

**Nereden sağlıyor?**
- ❌ **Dış servis YOK** - Tamamen yerel/offline kontrol
- ✅ Sadece matematiksel algoritma kullanıyor
- ✅ İnternet bağlantısı gerektirmiyor

**Avantajları:**
- ✅ Ücretsiz
- ✅ Hızlı
- ✅ İnternet gerektirmiyor
- ✅ Rate limit yok

**Dezavantajları:**
- ❌ Gerçek kişi kontrolü YOK
- ❌ TCKN'nin gerçekten var olup olmadığını kontrol etmiyor
- ❌ Sadece format ve algoritma kontrolü

---

### 2. Gerçek API Kontrolü (Pasif ❌)
**Dosya:** `backend/src/services/tcknVerificationService.js`

**Ne yapıyor?**
- TCKN'nin gerçekten var olup olmadığını kontrol eder
- TCKN + Doğum Tarihi eşleşmesini doğrular
- Ad Soyad ile ek doğrulama yapabilir

**Nereden sağlıyor?**
- ⚠️ **Şu anda SADECE YAPI hazır**
- ❌ Gerçek API entegrasyonu YOK
- ❌ `TCKN_VERIFICATION_ENABLED=false` (varsayılan)

**Kod içinde:**
```javascript
// Satır 38-44
if (!TCKN_VERIFICATION_ENABLED || !TCKN_VERIFICATION_API_URL) {
  console.log('[TCKN Verification] API entegrasyonu aktif değil, sadece algoritmik kontrol kullanılıyor');
  result.valid = true;
  result.verified = false; // Gerçek API'den doğrulanmadı
  return result;
}
```

---

## 🌐 Kullanılabilecek Gerçek Servisler

### 1. NVİ (Nüfus ve Vatandaşlık İşleri) API
**Resmi Devlet Servisi**

- **Web:** https://www.nvi.gov.tr/
- **API Dokümantasyon:** NVİ'den başvuru gerekiyor
- **Ücret:** Ücretli (paket bazlı)
- **Güvenilirlik:** ⭐⭐⭐⭐⭐ (En yüksek)
- **Entegrasyon:** Resmi API dokümantasyonuna göre yapılmalı

**Nasıl Kullanılır?**
1. NVİ'ye başvuru yapın
2. API key alın
3. `.env` dosyasına ekleyin:
   ```env
   TCKN_VERIFICATION_ENABLED=true
   TCKN_VERIFICATION_API_URL=https://api.nvi.gov.tr/v1/verify
   TCKN_VERIFICATION_API_KEY=your_nvi_api_key
   ```

---

### 2. E-Devlet API
**Resmi Devlet Servisi**

- **Web:** https://www.turkiye.gov.tr/
- **API Dokümantasyon:** E-Devlet portalından başvuru gerekiyor
- **Ücret:** Ücretli
- **Güvenilirlik:** ⭐⭐⭐⭐⭐
- **Entegrasyon:** E-Devlet API dokümantasyonuna göre yapılmalı

---

### 3. Üçüncü Parti Servisler

#### a) Kimlik Doğrulama Servisleri
- **Örnek:** kimlikdoğrulama.com, tckimlikdogrulama.com
- **Ücret:** Genellikle ücretli (sorgu başına veya paket)
- **Güvenilirlik:** ⭐⭐⭐ (Servise göre değişir)
- **Entegrasyon:** Her servisin kendi API formatı var

**Örnek Entegrasyon:**
```javascript
// backend/src/services/tcknVerificationService.js içinde
const response = await axios.post(
  'https://api.kimlikdoğrulama.com/verify',
  {
    tckn: tckn,
    birthDate: birthDate,
    firstName: firstName,
    lastName: lastName
  },
  {
    headers: {
      'Authorization': `Bearer ${TCKN_VERIFICATION_API_KEY}`,
      'Content-Type': 'application/json'
    }
  }
);
```

---

## 🔧 Nasıl Aktif Edilir?

### Adım 1: Servis Seçin
NVİ, E-Devlet veya üçüncü parti bir servis seçin.

### Adım 2: API Key Alın
Seçtiğiniz servisten API key alın.

### Adım 3: Environment Variables Ayarlayın
`backend/.env` dosyasına ekleyin:
```env
TCKN_VERIFICATION_ENABLED=true
TCKN_VERIFICATION_API_URL=https://api.example.com/tckn/verify
TCKN_VERIFICATION_API_KEY=your_api_key_here
```

### Adım 4: API Formatını Güncelleyin
`backend/src/services/tcknVerificationService.js` dosyasındaki `verifyTCKNWithAPI` fonksiyonunu servis sağlayıcınızın API formatına göre güncelleyin.

**Mevcut kod (Satır 57-67):**
```javascript
const response = await axios.post(
  TCKN_VERIFICATION_API_URL,
  requestData,
  {
    headers: {
      'Content-Type': 'application/json',
      ...(TCKN_VERIFICATION_API_KEY && { 'Authorization': `Bearer ${TCKN_VERIFICATION_API_KEY}` })
    },
    timeout: 10000
  }
);
```

Bu kısmı servis sağlayıcınızın API formatına göre güncelleyin.

---

## 📊 Karşılaştırma

| Özellik | Algoritmik Kontrol | Gerçek API Kontrolü |
|---------|-------------------|---------------------|
| **Maliyet** | Ücretsiz | Ücretli |
| **Hız** | Çok Hızlı | Orta (API çağrısı) |
| **İnternet** | Gerektirmiyor | Gerektiriyor |
| **Gerçek Kişi Kontrolü** | ❌ | ✅ |
| **TCKN Var mı Kontrolü** | ❌ | ✅ |
| **Doğum Tarihi Eşleşmesi** | ❌ | ✅ |
| **Rate Limit** | Yok | Var (servise göre) |

---

## ⚠️ Önemli Notlar

1. **Şu Anki Durum:** Sadece algoritmik kontrol aktif
2. **Gerçek API:** Henüz entegre edilmedi, sadece yapı hazır
3. **Güvenlik:** API key'leri `.env` dosyasında saklayın, commit etmeyin
4. **Fallback:** API erişilemezse otomatik olarak algoritmik kontrol kullanılır
5. **Maliyet:** Gerçek API kullanımı ücretli olabilir, sorgu başına veya paket bazlı

---

## 🚀 Sonuç

**Şu anda sistem:**
- ✅ Algoritmik kontrol yapıyor (yerel, ücretsiz)
- ❌ Gerçek kişi kontrolü yapmıyor
- ⚠️ Gerçek API entegrasyonu için hazır yapı var ama aktif değil

**Gerçek kişi kontrolü için:**
1. Bir servis seçin (NVİ, E-Devlet veya üçüncü parti)
2. API key alın
3. `.env` dosyasını yapılandırın
4. API formatını güncelleyin



