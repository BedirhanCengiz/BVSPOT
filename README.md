# BVSPOT – Misafir Wi-Fi / Guest Network Kayıt ve Yönetim Sistemi

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red.svg)](https://redis.io/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)

Kapsamlı misafir Wi-Fi kayıt ve yönetim çözümü. T.C. kimlik doğrulaması, SMS/OTP doğrulama, gelişmiş admin paneli ve loglama özellikleri içerir.

## 🚀 Hızlı Başlangıç

```bash
# 1. Projeyi klonlayın
git clone <repository-url>
cd BVSPOT

# 2. Docker ile veritabanlarını başlatın
docker-compose up -d

# 3. Backend'i başlatın
cd backend
npm install
npm run dev

# 4. Frontend'i başlatın (yeni terminal)
cd frontend
npm install
npm run dev
```

Detaylı kurulum için [KURULUM_REHBERI.md](./KURULUM_REHBERI.md) dosyasına bakın.

## ✨ Özellikler

### 👥 Kullanıcı Özellikleri

- ✅ Kullanıcı kayıt formu (Ad Soyad, Telefon, TCKN, Doğum Tarihi)
- ✅ T.C. Kimlik Numarası algoritmik doğrulama
- ✅ SMS/OTP doğrulama sistemi
- ✅ KVKK ve kullanım koşulları onayı
- ✅ Mobil uyumlu (responsive) arayüz
- ✅ Captive Portal entegrasyonuna hazır yapı
- ✅ Çoklu dil desteği (Türkçe/İngilizce)

### 🔐 Admin Panel Özellikleri

- ✅ **Dashboard**: İstatistikler ve grafiksel özetler
  - Toplam kullanıcı sayısı
  - Aktif kullanıcı sayısı
  - Bugünkü kayıtlar
  - Haftalık kayıt grafiği
- ✅ **Kullanıcı Yönetimi**: Listeleme, filtreleme, engelleme, düzenleme
- ✅ **Log Yönetimi**: Sistem logları ve web trafiği logları (sayfalama ile)
- ✅ **SSID Yönetimi**: Wi-Fi ağ yönetimi ve arkaplan resmi yükleme
- ✅ **Ayarlar**:
  - Admin kullanıcı yönetimi (oluşturma, silme, şifre değiştirme)
  - Session timeout ayarları (inactive ve max session)
  - Tema değiştirme (Açık/Koyu mod)
  - Şifre değiştirme

### 🛡️ Güvenlik Özellikleri

- ✅ JWT tabanlı kimlik doğrulama
- ✅ Rate limiting (kullanıcı ve admin için farklı limitler)
- ✅ SQL injection koruması
- ✅ XSS/CSRF koruması
- ✅ KVKK uyumlu loglama (hassas veri maskeleme)
- ✅ Brute force saldırı koruması
- ✅ Şifre hash'leme (bcrypt)

### 🛠️ Teknik Özellikler

- ✅ **Backend**: Express.js, PostgreSQL, Redis
- ✅ **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- ✅ **API**: RESTful API mimarisi
- ✅ **Docker**: Docker Compose desteği
- ✅ **Real-time**: Redis ile OTP ve cache yönetimi

## 📋 Gereksinimler

- **Node.js**: 18.0.0 veya üzeri
- **PostgreSQL**: 15.0 veya üzeri
- **Redis**: 7.0 veya üzeri
- **npm**: 9.0.0 veya üzeri (veya yarn)

## 📦 Kurulum

Detaylı kurulum adımları için [KURULUM_REHBERI.md](./KURULUM_REHBERI.md) dosyasını inceleyin.

### Hızlı Kurulum (Docker)

```bash
# Veritabanlarını başlat
docker-compose up -d

# Backend kurulumu
cd backend
npm install
cp .env.example .env  # Environment değişkenlerini ayarlayın
npm run dev

# Frontend kurulumu (yeni terminal)
cd frontend
npm install
npm run dev
```

## 🔧 Yapılandırma

### Backend Environment Variables

`backend/.env` dosyası oluşturun:

```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

DB_HOST=localhost
DB_PORT=5432
DB_NAME=bvspot_db
DB_USER=postgres
DB_PASSWORD=postgres

REDIS_HOST=localhost
REDIS_PORT=6379

JWT_SECRET=your-super-secret-jwt-key
ADMIN_JWT_SECRET=your-super-secret-admin-jwt-key

SMS_PROVIDER=test  # test, netgsm, twilio, turkcell, turktelekom
```

### Frontend Environment Variables

`frontend/.env.local` dosyası oluşturun:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🏃 Çalıştırma

### Geliştirme Ortamı

```bash
# Backend (Terminal 1)
cd backend
npm run dev

# Frontend (Terminal 2)
cd frontend
npm run dev
```

- Backend: http://localhost:3001
- Frontend: http://localhost:3000
- Admin Panel: http://localhost:3000/admin/login

### Production Ortamı

```bash
# Backend
cd backend
npm start

# Frontend
cd frontend
npm run build
npm start
```

## 📚 Dokümantasyon

- **[CANLI_KURULUM.md](./CANLI_KURULUM.md)**: Sanal sunucuya tek komutla kurulum, canlıya alma ve FortiGate bağlantısı
- **[KURULUM_REHBERI.md](./KURULUM_REHBERI.md)**: Detaylı kurulum ve kullanım rehberi
- **API Dokümantasyonu**: Backend route dosyalarında JSDoc yorumları mevcuttur
- **Veritabanı Şeması**: `backend/src/database/init.js` dosyasını inceleyin

## 🏗️ Proje Yapısı

```
BVSPOT/
├── backend/                 # Backend API
│   ├── src/
│   │   ├── routes/         # API route'ları
│   │   ├── services/       # İş mantığı servisleri
│   │   ├── middleware/     # Express middleware'leri
│   │   └── database/       # Veritabanı yapılandırması
│   └── package.json
├── frontend/               # Frontend uygulaması
│   ├── src/
│   │   ├── app/            # Next.js sayfaları
│   │   ├── components/    # React bileşenleri
│   │   ├── contexts/      # React context'leri
│   │   └── lib/           # Yardımcı kütüphaneler
│   └── package.json
├── docker-compose.yml      # Docker Compose yapılandırması
└── README.md
```

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/admin/login` - Admin girişi
- `POST /api/auth/send-otp` - OTP gönderme
- `POST /api/auth/verify-otp` - OTP doğrulama

### Admin (JWT gerekli)
- `GET /api/admin/dashboard` - Dashboard istatistikleri
- `GET /api/admin/users` - Kullanıcı listesi
- `GET /api/admin/logs` - Sistem logları
- `GET /api/admin/settings` - Sistem ayarları
- `POST /api/admin/admins` - Yeni admin oluşturma

Detaylı API dokümantasyonu için `backend/src/routes/` klasöründeki dosyaları inceleyin.

## 🐛 Sorun Giderme

Yaygın sorunlar ve çözümleri için [KURULUM_REHBERI.md](./KURULUM_REHBERI.md#sorun-giderme) dosyasına bakın.

## 📝 Lisans

[Lisans bilgisi buraya eklenecek]

## 👥 Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen pull request göndermeden önce:
1. Projeyi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📞 İletişim

Sorularınız için GitHub Issues kullanabilirsiniz.

---

**Versiyon**: 1.0.0  
**Son Güncelleme**: 2024
