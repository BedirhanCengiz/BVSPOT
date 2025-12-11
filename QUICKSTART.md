# BVSPOT Hızlı Başlangıç Kılavuzu

## 🚀 Hızlı Kurulum (5 Dakika)

### 1. Gereksinimler

- Node.js 18+ yüklü olmalı
- Docker Desktop yüklü olmalı (PostgreSQL ve Redis için)

### 2. Veritabanlarını Başlat

```bash
docker-compose up -d
```

Bu komut PostgreSQL ve Redis'i başlatacak.

### 3. Backend Kurulumu

```bash
cd backend
npm install

# .env dosyası oluştur (zaten .env.example var)
cp .env.example .env

# Backend'i başlat
npm run dev
```

Backend `http://localhost:3001` adresinde çalışacak.

### 4. Frontend Kurulumu

Yeni bir terminal açın:

```bash
cd frontend
npm install
npm run dev
```

Frontend `http://localhost:3000` adresinde çalışacak.

### 5. İlk Test

1. Tarayıcıda `http://localhost:3000` adresine gidin
2. Kayıt formunu doldurun:
   - Ad Soyad: Test Kullanıcı
   - Telefon: 05551234567
   - TCKN: 12345678901 (test için geçerli bir TCKN girin)
   - Doğum Tarihi: 01.01.1990
   - KVKK ve Kullanım Koşulları: İşaretleyin
3. Kayıt olun
4. OTP kodu gelir (development modunda konsola yazdırılır)
5. OTP'yi girin
6. Başarılı!

### 6. Admin Paneline Giriş

1. `http://localhost:3000/admin/login` adresine gidin
2. Varsayılan admin bilgileri:
   - Email: `admin@bvspot.com`
   - Şifre: `admin123`
3. Dashboard'u görüntüleyin

## 🔧 Yapılandırma

### Backend Yapılandırması

`backend/.env` dosyasını düzenleyin:

```env
# SMS Provider (Test modunda SMS gönderilmez)
SMS_PROVIDER=netgsm
NETGSM_USERNAME=your-username
NETGSM_PASSWORD=your-password

# Production'da mutlaka değiştirin!
JWT_SECRET=your-super-secret-key-change-this
ADMIN_PASSWORD=your-secure-password
```

### Frontend Yapılandırması

`frontend/.env.local` dosyası oluşturun:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 📱 Test Senaryoları

### Test 1: Kullanıcı Kaydı

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Test User",
    "phone": "05551234567",
    "tckn": "12345678901",
    "birthDate": "1990-01-01",
    "kvkkAccepted": "true",
    "termsAccepted": "true"
  }'
```

### Test 2: OTP Gönderme

```bash
curl -X POST http://localhost:3001/api/auth/send-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "05551234567",
    "userId": 1
  }'
```

### Test 3: Admin Girişi

```bash
curl -X POST http://localhost:3001/api/auth/admin-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bvspot.com",
    "password": "admin123"
  }'
```

## 🐛 Sorun Giderme

### PostgreSQL bağlantı hatası

```bash
# Docker container'ları kontrol et
docker ps

# PostgreSQL loglarını kontrol et
docker logs bvspot_postgres
```

### Redis bağlantı hatası

```bash
# Redis container'ını kontrol et
docker logs bvspot_redis

# Redis'i yeniden başlat
docker restart bvspot_redis
```

### Port zaten kullanılıyor

`.env` dosyasında port numaralarını değiştirin:
- Backend: `PORT=3001` → `PORT=3002`
- Frontend: `next.config.js` içinde port ayarı

### Veritabanı tabloları oluşmadı

Backend'i yeniden başlatın. İlk çalıştırmada otomatik oluşturulur.

## 📚 Sonraki Adımlar

1. ✅ SMS provider'ı yapılandırın (NetGSM, Twilio, vb.)
2. ✅ Production için güvenlik ayarlarını yapın
3. ✅ Hotspot/router entegrasyonunu yapın (HOTSPOT_INTEGRATION.md)
4. ✅ SSL sertifikası ekleyin (HTTPS)
5. ✅ Loglama ve monitoring kurun

## 💡 İpuçları

- Development modunda OTP kodları konsola yazdırılır
- Test için geçerli TCKN algoritması kullanılmalı
- Admin şifresini production'da mutlaka değiştirin
- Docker container'ları durdurmak için: `docker-compose down`

## 🆘 Yardım

Sorun yaşıyorsanız:
1. Logları kontrol edin (`backend` ve `frontend` konsolları)
2. Docker loglarını kontrol edin
3. GitHub Issues'da sorun açın

---

**Başarılar! 🎉**

