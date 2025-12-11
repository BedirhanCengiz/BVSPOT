# BVSPOT - Proje Genel Bakış ve Dokümantasyon

## 📋 Proje Hakkında

**BVSPOT**, misafir Wi-Fi ağları için kapsamlı bir kayıt ve yönetim sistemidir. Kullanıcıların Wi-Fi ağına kayıt olmasını, kimlik doğrulamasını ve internet erişimini yönetmeyi sağlar. Türkiye'deki KVKK yasalarına uyumlu olarak tasarlanmıştır.

## 🎯 Projenin Amacı

Bu proje, oteller, kafeler, restoranlar, işletmeler ve diğer kuruluşların misafir Wi-Fi ağlarını yönetmek için kullanılabilir. Sistem şunları sağlar:

- **Güvenli Kayıt**: TCKN, pasaport veya yabancı kimlik ile kayıt
- **Kimlik Doğrulama**: SMS/OTP ile telefon doğrulama
- **Yönetim Paneli**: Kapsamlı admin paneli ile kullanıcı ve trafik yönetimi
- **KVKK Uyumlu**: Hassas verilerin güvenli saklanması ve maskelenmesi
- **Hotspot Entegrasyonu**: Mikrotik, UniFi, OpenWRT gibi router'larla entegrasyon

## 🏗️ Mimari Yapı

### Teknoloji Stack

#### Backend
- **Node.js** (Express.js framework)
- **PostgreSQL** - Ana veritabanı
- **Redis** - OTP kodları ve cache için
- **JWT** - Authentication token'ları
- **bcryptjs** - Şifre hashleme

#### Frontend
- **Next.js 14** - React framework (App Router)
- **TypeScript** - Tip güvenliği
- **Tailwind CSS** - Styling
- **React Hook Form** - Form yönetimi
- **Axios** - HTTP client

#### Altyapı
- **Docker** - PostgreSQL ve Redis container'ları
- **Docker Compose** - Servis orkestrasyonu

## 📁 Proje Yapısı

```
BVSPOT/
├── backend/                 # Backend API sunucusu
│   ├── src/
│   │   ├── database/       # Veritabanı bağlantı ve migration
│   │   ├── middleware/      # Auth, rate limiting, error handling
│   │   ├── routes/         # API route'ları
│   │   ├── services/       # İş mantığı servisleri
│   │   ├── utils/          # Yardımcı fonksiyonlar
│   │   └── server.js       # Ana sunucu dosyası
│   └── package.json
│
├── frontend/               # Frontend Next.js uygulaması
│   ├── src/
│   │   ├── app/           # Next.js App Router sayfaları
│   │   │   ├── admin/     # Admin panel sayfaları
│   │   │   └── page.tsx   # Ana kayıt sayfası
│   │   ├── components/    # React bileşenleri
│   │   ├── contexts/      # React context'leri
│   │   ├── lib/           # API client ve utilities
│   │   └── utils/         # Yardımcı fonksiyonlar
│   └── package.json
│
├── docker-compose.yml      # Docker servisleri
└── README.md              # Ana dokümantasyon
```

## 🔑 Temel Özellikler

### 1. Kullanıcı Kayıt Sistemi

#### Desteklenen Kimlik Tipleri
- **TCKN (T.C. Kimlik No)**: Türk vatandaşları için
- **Pasaport No**: Yabancı uyruklu kullanıcılar için (admin onayı gerekir)
- **Yabancı Kimlik No**: Yabancı uyruklu kullanıcılar için

#### Kayıt Akışı
1. Kullanıcı Wi-Fi'ye bağlanır
2. Captive Portal otomatik olarak kayıt sayfasına yönlendirir
3. Kullanıcı kimlik tipini seçer (TCKN/Pasaport/Yabancı Kimlik)
4. Kişisel bilgileri girer:
   - Ad Soyad
   - Telefon numarası
   - Kimlik numarası (TCKN/Pasaport/Yabancı Kimlik)
   - Doğum tarihi
   - Şifre (opsiyonel)
5. KVKK ve kullanım koşullarını kabul eder
6. Sistem TCKN'yi algoritmik olarak doğrular
7. SMS ile OTP kodu gönderilir
8. Kullanıcı OTP kodunu girer
9. Doğrulama başarılı olursa internete erişim verilir

### 2. TCKN Doğrulama

Sistem, TCKN'yi algoritmik olarak doğrular (11 haneli, son rakam kontrolü). Ayrıca opsiyonel olarak:
- **NVI (Nüfus ve Vatandaşlık İşleri) API** entegrasyonu
- **Ücretsiz TCKN doğrulama servisleri** entegrasyonu

### 3. SMS/OTP Sistemi

- **NetGSM** entegrasyonu (varsayılan)
- 6 haneli OTP kodu
- 3 dakika geçerlilik süresi
- Maksimum 5 deneme hakkı
- Redis'te güvenli saklama

### 4. Admin Paneli

#### Dashboard
- Günlük kayıt sayısı
- Aktif kullanıcı sayısı
- Doğrulanmış kullanıcı sayısı
- Engellenmiş kullanıcı sayısı
- Online kullanıcı sayısı
- Haftalık/aylık kayıt grafikleri
- Doğrulama istatistikleri

#### Kullanıcı Yönetimi
- Kullanıcı listesi (sayfalama ve filtreleme)
- Kullanıcı detayları görüntüleme
- Kullanıcı engelleme/engel kaldırma
- Kota ve hız limiti ayarlama
- Manuel doğrulama
- Pasaport kayıtlarını onaylama/reddetme
- Kullanıcı bilgilerini düzenleme

#### Log Yönetimi
- Sistem loglarını görüntüleme
- Filtreleme (kullanıcı, aksiyon, tarih, IP)
- CSV/JSON export
- KVKK uyumlu maskelenmiş veriler

#### Web Trafiği İzleme
- Kullanıcıların ziyaret ettiği web siteleri
- Domain bazlı istatistikler
- Trafik miktarı (byte/MB)
- HTTP method ve status code dağılımı
- IP adresi ve MAC adresi takibi
- Response time analizi

#### MAC Adresi Yönetimi
- Whitelist/Blacklist yönetimi
- MAC adresi ekleme/çıkarma
- Sebep belirtme

### 5. Güvenlik Özellikleri

#### Authentication & Authorization
- JWT tabanlı token sistemi
- Admin ve kullanıcı için ayrı token'lar
- Token expiration (varsayılan 1 saat)
- Refresh token desteği (opsiyonel)

#### Rate Limiting
- API endpoint'lerinde rate limiting
- Brute force koruması
- OTP deneme sayısı sınırlaması

#### Veri Güvenliği
- Şifreler bcrypt ile hashlenir
- TCKN ve telefon numaraları loglarda maskelenir
- SQL injection koruması (parametreli sorgular)
- XSS/CSRF koruması (Helmet middleware)
- CORS yapılandırması

#### KVKK Uyumluluk
- Hassas veriler maskelenir (TCKN: 12345****01, Telefon: 0555***4567)
- 1 yıl sonra loglar otomatik temizlenir
- KVKK ve kullanım koşulları onayı zorunlu

### 6. Web Trafiği Loglama

Sistem, kullanıcıların web trafiğini loglar:
- Ziyaret edilen URL'ler
- Domain bilgileri
- HTTP method ve status code
- Trafik miktarı (byte)
- Response time
- IP ve MAC adresi
- User agent bilgisi
- Referer bilgisi

**Not**: Web trafiği logları genellikle router/hotspot cihazından veya proxy sunucudan gelir.

## 🔌 API Endpoints

### Authentication Endpoints

```
POST   /api/auth/register              # Kullanıcı kaydı
POST   /api/auth/validate-tckn         # TCKN doğrulama
POST   /api/auth/send-otp              # OTP gönderme
POST   /api/auth/verify-otp            # OTP doğrulama
POST   /api/auth/login                 # Kullanıcı girişi
POST   /api/auth/admin-login           # Admin girişi
```

### User Endpoints

```
GET    /api/user/profile               # Kullanıcı profili
GET    /api/user/session               # Aktif session bilgisi
```

### Admin Endpoints

```
GET    /api/admin/dashboard            # Dashboard istatistikleri
GET    /api/admin/users                # Kullanıcı listesi
GET    /api/admin/users/:id            # Kullanıcı detayı
PUT    /api/admin/users/:id             # Kullanıcı güncelleme
POST   /api/admin/users/:id/block       # Kullanıcı engelleme
POST   /api/admin/users/:id/unblock     # Engel kaldırma
POST   /api/admin/users/:id/set-quota   # Kota ve hız limiti ayarlama
POST   /api/admin/users/:id/verify-manual # Manuel doğrulama
POST   /api/admin/users/:id/approve      # Pasaport onaylama
POST   /api/admin/users/:id/reject       # Pasaport reddetme
GET    /api/admin/logs                 # Log listesi
GET    /api/admin/logs/export          # Log export (CSV/JSON)
GET    /api/admin/mac-list             # MAC adresi listesi
POST   /api/admin/mac-list             # MAC adresi ekleme
```

### Traffic Endpoints

```
POST   /api/traffic/log               # Tek web trafiği logu kaydet
POST   /api/traffic/log-bulk          # Toplu web trafiği logları
GET    /api/traffic/logs              # Web trafiği logları (admin)
GET    /api/traffic/stats             # Web trafiği istatistikleri (admin)
```

## 🗄️ Veritabanı Şeması

### Tablolar

#### `users`
Kullanıcı bilgileri:
- id, full_name, phone, tckn, passport_no, foreign_id_no
- id_type (tckn/passport/foreign_id)
- birth_date, password_hash
- mac_address, ip_address
- status (pending/verified/active/blocked/expired/awaiting_admin_approval)
- quota_mb, quota_used_mb, speed_limit_mbps
- connection_start_time, connection_end_time
- kvkk_accepted, terms_accepted, language
- created_at, updated_at

#### `otp_codes`
OTP kodları:
- id, phone, code, attempts
- expires_at, verified
- created_at

#### `sessions`
Aktif oturumlar:
- id, user_id, mac_address, ip_address
- start_time, end_time
- data_transferred_mb
- status (active/ended/expired)

#### `logs`
Sistem logları:
- id, user_id, action
- ip_address, mac_address, user_agent
- details (JSONB)
- created_at

#### `admin_users`
Admin kullanıcıları:
- id, email, password_hash
- role (admin/super_admin)
- last_login, created_at

#### `mac_list`
MAC adresi whitelist/blacklist:
- id, mac_address
- list_type (whitelist/blacklist)
- reason, created_by
- created_at

#### `web_traffic_logs`
Web trafiği logları:
- id, user_id, session_id
- ip_address, mac_address
- url, domain, method
- status_code, user_agent, referer
- data_transferred_bytes, response_time_ms
- country_code, device_type, browser, os
- created_at

## 🔄 Kullanım Senaryoları

### Senaryo 1: Otel Misafir Wi-Fi

1. Misafir odaya girer ve Wi-Fi'ye bağlanır
2. Captive Portal açılır
3. Misafir TCKN ile kayıt olur
4. OTP kodu telefonuna gelir
5. OTP'yi girer ve internete erişir
6. Otel yönetimi admin panelinden misafirleri görüntüleyebilir

### Senaryo 2: Kafe/Restoran Wi-Fi

1. Müşteri Wi-Fi'ye bağlanır
2. Kayıt formunu doldurur
3. OTP ile doğrulanır
4. İnternete erişir
5. İşletme sahibi trafik istatistiklerini görüntüleyebilir

### Senaryo 3: Yabancı Uyruklu Kullanıcı

1. Yabancı uyruklu kullanıcı pasaport ile kayıt olur
2. Kayıt admin onayına düşer
3. Admin panelinden kayıt onaylanır veya reddedilir
4. Onaylandıktan sonra kullanıcı internete erişebilir

## 🚀 Kurulum ve Çalıştırma

Detaylı kurulum talimatları için `QUICKSTART.md` dosyasına bakın.

### Hızlı Başlangıç

```bash
# 1. Veritabanlarını başlat
docker-compose up -d

# 2. Backend'i başlat
cd backend
npm install
npm run dev

# 3. Frontend'i başlat (yeni terminal)
cd frontend
npm install
npm run dev
```

## 🔧 Yapılandırma

### Backend (.env)

```env
PORT=3001
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bvspot_db
DB_USER=postgres
DB_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=your-secret-key-change-this
JWT_EXPIRES_IN=1h

# SMS Provider
SMS_PROVIDER=netgsm
NETGSM_USERNAME=your-username
NETGSM_PASSWORD=your-password

# Admin
ADMIN_EMAIL=admin@bvspot.com
ADMIN_PASSWORD=admin123

# Frontend URL (CORS)
FRONTEND_URL=http://localhost:3000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🌐 Hotspot Entegrasyonu

Detaylı entegrasyon bilgileri için `HOTSPOT_INTEGRATION.md` dosyasına bakın.

### Desteklenen Router'lar

- **Mikrotik RouterOS**
- **UniFi Controller**
- **OpenWRT** (CoovaChilli, nodogsplash)
- **Generic Captive Portal**

## 📊 Monitoring ve Loglama

### Sistem Logları

- Kullanıcı kayıtları
- Giriş/çıkış işlemleri
- Admin işlemleri
- Hata logları
- OTP gönderimleri

### Web Trafiği Logları

- Ziyaret edilen siteler
- Trafik miktarı
- Domain istatistikleri
- Response time analizi

## 🔐 Güvenlik Best Practices

1. **Production'da mutlaka değiştirin:**
   - JWT_SECRET
   - ADMIN_PASSWORD
   - Database şifreleri
   - SMS provider credentials

2. **HTTPS kullanın**: SSL sertifikası ekleyin

3. **Rate limiting**: API endpoint'lerinde rate limiting aktif

4. **Input validation**: Tüm kullanıcı girdileri validate edilir

5. **SQL injection koruması**: Parametreli sorgular kullanılır

6. **XSS/CSRF koruması**: Helmet middleware ile korunur

## 📝 Geliştirme Notları

### Test Modu

Development modunda:
- SMS gönderilmez, OTP konsola yazdırılır
- Test için gerçek SMS provider gerekmez
- Loglar detaylı yazdırılır

### Migration Sistemi

Veritabanı migration'ları `backend/src/database/migrate.js` dosyasında yönetilir. Yeni sütunlar veya tablolar eklemek için bu dosyayı güncelleyin.

### Yeni Özellik Ekleme

1. Backend'de route ekleyin (`backend/src/routes/`)
2. Service oluşturun (`backend/src/services/`)
3. Frontend'de API çağrısı ekleyin (`frontend/src/lib/api.ts`)
4. UI bileşeni oluşturun (`frontend/src/components/`)

## 🐛 Bilinen Sorunlar ve Çözümler

### PostgreSQL Bağlantı Hatası
- Docker container'ının çalıştığından emin olun: `docker ps`
- Port'un kullanılmadığından emin olun

### Redis Bağlantı Hatası
- Redis container'ının çalıştığından emin olun
- Redis loglarını kontrol edin: `docker logs bvspot_redis`

### CORS Hatası
- Backend'deki `FRONTEND_URL` ayarını kontrol edin
- Frontend'in doğru port'ta çalıştığından emin olun

## 📚 Ek Dokümantasyon

- `README.md` - Ana dokümantasyon
- `QUICKSTART.md` - Hızlı başlangıç kılavuzu
- `HOTSPOT_INTEGRATION.md` - Hotspot entegrasyon rehberi
- `TCKN_VERIFICATION.md` - TCKN doğrulama detayları
- `WEB_TRAFFIC_LOGGING.md` - Web trafiği loglama rehberi

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📞 Destek

Sorularınız için GitHub Issues'da sorun açabilirsiniz.

## 📄 Lisans

Bu proje özel kullanım içindir.

---

**Not**: Production'a geçmeden önce tüm güvenlik ayarlarını gözden geçirin ve test edin!

**Son Güncelleme**: 2025-12-11

