# BVSPOT - Kurulum Rehberi ve Dokümantasyon

## 📋 İçindekiler

1. [Genel Bakış](#genel-bakış)
2. [Sistem Gereksinimleri](#sistem-gereksinimleri)
3. [Kurulum](#kurulum)
4. [Yapılandırma](#yapılandırma)
5. [Çalıştırma](#çalıştırma)
6. [Sistem Mimarisi](#sistem-mimarisi)
7. [Özellikler ve Kullanım](#özellikler-ve-kullanım)
8. [Sorun Giderme](#sorun-giderme)

---

## 🎯 Genel Bakış

BVSPOT, misafir Wi-Fi ağları için geliştirilmiş kapsamlı bir kayıt ve yönetim sistemidir. Sistem, kullanıcıların Wi-Fi ağına kayıt olmasını, SMS/OTP doğrulaması yapmasını ve admin paneli üzerinden yönetilmesini sağlar.

### Ana Özellikler

- ✅ T.C. Kimlik Numarası doğrulama
- ✅ SMS/OTP doğrulama sistemi
- ✅ KVKK uyumlu veri maskeleme
- ✅ Gelişmiş admin paneli
- ✅ Kullanıcı yönetimi ve engelleme
- ✅ Web trafiği loglama
- ✅ SSID yönetimi
- ✅ Session timeout yönetimi
- ✅ Tema desteği (Açık/Koyu mod)
- ✅ Çoklu dil desteği (Türkçe/İngilizce)

---

## 💻 Sistem Gereksinimleri

### Minimum Gereksinimler

- **Node.js**: 18.0.0 veya üzeri
- **PostgreSQL**: 15.0 veya üzeri
- **Redis**: 7.0 veya üzeri
- **npm**: 9.0.0 veya üzeri (veya yarn)
- **RAM**: En az 2GB
- **Disk**: En az 5GB boş alan

### Önerilen Gereksinimler

- **Node.js**: 20.x LTS
- **PostgreSQL**: 15.x
- **Redis**: 7.x
- **RAM**: 4GB veya üzeri
- **Disk**: 10GB+ boş alan

---

## 🚀 Kurulum

### 1. Projeyi İndirme

```bash
git clone <repository-url>
cd BVSPOT
```

### 2. Docker ile Kurulum (Önerilen)

Docker ve Docker Compose kullanarak hızlı kurulum:

```bash
# PostgreSQL ve Redis'i başlat
docker-compose up -d

# Servislerin çalıştığını kontrol et
docker-compose ps
```

### 3. Manuel Kurulum

#### 2.1. PostgreSQL Kurulumu

**Windows:**
- [PostgreSQL İndirme Sayfası](https://www.postgresql.org/download/windows/) adresinden indirin
- Kurulum sırasında şifre belirleyin (varsayılan: `postgres`)

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

#### 2.2. Redis Kurulumu

**Windows:**
- [Redis Windows İndirme](https://github.com/microsoftarchive/redis/releases) veya WSL kullanın

**Linux (Ubuntu/Debian):**
```bash
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**macOS:**
```bash
brew install redis
brew services start redis
```

#### 2.3. Veritabanı Oluşturma

```bash
# PostgreSQL'e bağlan
psql -U postgres

# Veritabanı oluştur
CREATE DATABASE bvspot_db;

# Çıkış
\q
```

### 4. Backend Kurulumu

```bash
cd backend

# Bağımlılıkları yükle
npm install

# Environment dosyası oluştur
cp .env.example .env  # Eğer varsa
# veya manuel olarak .env dosyası oluşturun
```

### 5. Frontend Kurulumu

```bash
cd frontend

# Bağımlılıkları yükle
npm install
```

---

## ⚙️ Yapılandırma

### Backend Environment Variables

`backend/.env` dosyası oluşturun ve aşağıdaki değişkenleri ayarlayın:

```env
# Sunucu Ayarları
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Veritabanı Ayarları
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bvspot_db
DB_USER=postgres
DB_PASSWORD=postgres

# Redis Ayarları
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT Secret (Güvenli bir değer kullanın!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
ADMIN_JWT_SECRET=your-super-secret-admin-jwt-key-change-this-in-production

# SMS Sağlayıcı Ayarları
SMS_PROVIDER=netgsm  # netgsm, twilio, turkcell, turktelekom, test
NETGSM_USERNAME=your-netgsm-username
NETGSM_PASSWORD=your-netgsm-password
NETGSM_MSGHEADER=your-msg-header

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 dakika (milisaniye)
RATE_LIMIT_MAX_REQUESTS=100
ADMIN_RATE_LIMIT_MAX_REQUESTS=1000

# RADIUS Sunucu Ayarları (Opsiyonel - Hotspot entegrasyonu için)
RADIUS_ENABLED=false
RADIUS_HOST=localhost
RADIUS_PORT=1812
RADIUS_SECRET=your-radius-secret-key-here  # Access point ile aynı olmalı!
RADIUS_TIMEOUT=5000
RADIUS_RETRIES=3
```

### Frontend Environment Variables

`frontend/.env.local` dosyası oluşturun:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### SMS Sağlayıcı Yapılandırması

SMS göndermek için bir sağlayıcı seçmeniz gerekiyor:

#### NetGSM (Türkiye için önerilen)
```env
SMS_PROVIDER=netgsm
NETGSM_USERNAME=kullanici_adi
NETGSM_PASSWORD=sifre
NETGSM_MSGHEADER=baslik
```

#### Test Modu (Geliştirme için)
```env
SMS_PROVIDER=test
```
Test modunda SMS gönderilmez, sadece konsola yazdırılır.

### RADIUS Yapılandırması (Opsiyonel)

Wi-Fi access point'lerinizle RADIUS entegrasyonu için:

```env
RADIUS_ENABLED=true
RADIUS_HOST=localhost
RADIUS_PORT=1812
RADIUS_SECRET=your-radius-secret-key-here
```

**Önemli:** RADIUS secret kodu, access point'inizde ve RADIUS sunucusunda aynı olmalıdır.

Detaylı RADIUS yapılandırması için [RADIUS_YAPILANDIRMA.md](./RADIUS_YAPILANDIRMA.md) dosyasına bakın.

---

## ▶️ Çalıştırma

### Geliştirme Ortamı

#### 1. Backend'i Başlatma

```bash
cd backend
npm run dev  # Nodemon ile otomatik yeniden başlatma
# veya
npm start    # Normal başlatma
```

Backend `http://localhost:3001` adresinde çalışacaktır.

#### 2. Frontend'i Başlatma

Yeni bir terminal penceresinde:

```bash
cd frontend
npm run dev
```

Frontend `http://localhost:3000` adresinde çalışacaktır.

### Production Ortamı

#### Backend

```bash
cd backend
npm start
```

#### Frontend

```bash
cd frontend
npm run build
npm start
```

### İlk Admin Kullanıcısı Oluşturma

Veritabanı ilk kez başlatıldığında otomatik olarak bir admin kullanıcısı oluşturulmaz. Admin kullanıcısı oluşturmak için:

1. PostgreSQL'e bağlanın:
```bash
psql -U postgres -d bvspot_db
```

2. Admin kullanıcısı ekleyin:
```sql
INSERT INTO admin_users (email, password_hash, role, created_at)
VALUES (
  'admin@example.com',
  '$2a$10$YourHashedPasswordHere',  -- bcrypt hash'i
  'super_admin',
  NOW()
);
```

**Not:** Şifreyi hash'lemek için Node.js kullanabilirsiniz:
```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('your-password', 10).then(hash => console.log(hash));"
```

Veya admin paneli üzerinden (eğer başka bir admin varsa) yeni admin oluşturabilirsiniz.

---

## 🏗️ Sistem Mimarisi

### Teknoloji Stack'i

**Backend:**
- **Express.js**: RESTful API framework
- **PostgreSQL**: Ana veritabanı
- **Redis**: OTP saklama ve cache
- **JWT**: Kimlik doğrulama
- **bcryptjs**: Şifre hash'leme
- **express-rate-limit**: Rate limiting

**Frontend:**
- **Next.js 14**: React framework
- **TypeScript**: Tip güvenliği
- **Tailwind CSS**: Styling
- **Axios**: HTTP client
- **React Hook Form**: Form yönetimi
- **Recharts**: Grafik görselleştirme

### Veritabanı Şeması

Ana tablolar:
- `users`: Kullanıcı bilgileri
- `admin_users`: Admin kullanıcıları
- `sessions`: Aktif oturumlar
- `logs`: Sistem logları
- `web_traffic`: Web trafiği kayıtları
- `ssids`: Wi-Fi ağ bilgileri
- `settings`: Sistem ayarları

### API Endpoints

#### Authentication (`/api/auth`)
- `POST /api/auth/register` - Kullanıcı kaydı
- `POST /api/auth/login` - Kullanıcı girişi
- `POST /api/auth/admin/login` - Admin girişi
- `POST /api/auth/send-otp` - OTP gönderme
- `POST /api/auth/verify-otp` - OTP doğrulama

#### User (`/api/user`)
- `GET /api/user/profile` - Kullanıcı profili
- `GET /api/user/sessions` - Aktif oturumlar

#### Admin (`/api/admin`)
- `GET /api/admin/dashboard` - Dashboard istatistikleri
- `GET /api/admin/users` - Kullanıcı listesi
- `GET /api/admin/users/:id` - Kullanıcı detayı
- `POST /api/admin/users/:id/block` - Kullanıcı engelleme
- `GET /api/admin/logs` - Sistem logları
- `GET /api/admin/traffic/logs` - Web trafiği logları
- `GET /api/admin/settings` - Sistem ayarları
- `PUT /api/admin/settings` - Sistem ayarlarını güncelleme
- `GET /api/admin/admins` - Admin kullanıcıları listesi
- `POST /api/admin/admins` - Yeni admin oluşturma
- `DELETE /api/admin/admins/:id` - Admin silme

#### SSID (`/api/ssids`)
- `GET /api/ssids` - SSID listesi
- `POST /api/ssids` - Yeni SSID oluşturma
- `PUT /api/ssids/:id` - SSID güncelleme
- `DELETE /api/ssids/:id` - SSID silme

---

## 📱 Özellikler ve Kullanım

### Kullanıcı Kayıt Süreci

1. **Kayıt Formu**: Kullanıcı ad, soyad, telefon, TCKN ve doğum tarihi girer
2. **TCKN Doğrulama**: Algoritmik TCKN doğrulaması yapılır
3. **KVKK Onayı**: Kullanım koşulları ve KVKK metni onaylanır
4. **OTP Gönderimi**: Telefon numarasına SMS ile OTP kodu gönderilir
5. **OTP Doğrulama**: Kullanıcı OTP kodunu girer
6. **Kayıt Tamamlanır**: Kullanıcı Wi-Fi ağına erişim kazanır

### Admin Panel Özellikleri

#### Dashboard
- Toplam kullanıcı sayısı
- Aktif kullanıcı sayısı
- Bugünkü kayıtlar
- Haftalık kayıt grafiği
- Son kayıtlar listesi

#### Kullanıcı Yönetimi
- Kullanıcı listesi (sayfalama ile)
- Kullanıcı arama ve filtreleme
- Kullanıcı detay görüntüleme
- Kullanıcı engelleme/aktifleştirme
- Kullanıcı bilgilerini düzenleme

#### Log Yönetimi
- Sistem logları görüntüleme
- Web trafiği logları
- Log filtreleme ve arama
- Sayfalama desteği

#### SSID Yönetimi
- SSID listesi
- Yeni SSID ekleme
- SSID düzenleme
- SSID aktif/pasif yapma
- SSID arkaplan resmi yükleme

#### Ayarlar
- **Admin Kullanıcıları**: Admin oluşturma, silme, şifre değiştirme
- **Session Ayarları**: 
  - Inactive timeout (trafik yoksa kaç saat sonra atılsın)
  - Max session (maksimum oturum süresi)
- **Tema Ayarları**: Açık/Koyu mod seçimi
- **Şifre Değiştirme**: Admin şifresi değiştirme

### Güvenlik Özellikleri

- **Rate Limiting**: 
  - Normal kullanıcılar: 15 dakikada 100 istek
  - Admin kullanıcıları: 15 dakikada 1000 istek
  - OTP gönderme: 1 dakikada 1 istek
  - Kayıt: 15 dakikada 5 deneme

- **JWT Authentication**: Token tabanlı kimlik doğrulama
- **Password Hashing**: bcrypt ile şifre hash'leme
- **SQL Injection Protection**: Parametreli sorgular
- **XSS Protection**: Helmet.js ile güvenlik başlıkları
- **KVKK Compliance**: Hassas veriler maskeleme

---

## 🔧 Sorun Giderme

### Backend Başlamıyor

**Sorun**: `Error: connect ECONNREFUSED`
**Çözüm**: 
- PostgreSQL ve Redis'in çalıştığından emin olun
- `.env` dosyasındaki bağlantı bilgilerini kontrol edin
- Port'ların kullanılabilir olduğunu kontrol edin

```bash
# PostgreSQL kontrolü
psql -U postgres -c "SELECT version();"

# Redis kontrolü
redis-cli ping
```

### Veritabanı Bağlantı Hatası

**Sorun**: `password authentication failed`
**Çözüm**:
- PostgreSQL şifresini kontrol edin
- `pg_hba.conf` dosyasını kontrol edin
- Kullanıcı yetkilerini kontrol edin

### Redis Bağlantı Hatası

**Sorun**: `Redis Client Error`
**Çözüm**:
- Redis servisinin çalıştığını kontrol edin
- Redis port'unun açık olduğunu kontrol edin
- Firewall ayarlarını kontrol edin

### Frontend API Hatası

**Sorun**: `Network Error` veya `CORS Error`
**Çözüm**:
- Backend'in çalıştığını kontrol edin
- `FRONTEND_URL` environment variable'ını kontrol edin
- CORS ayarlarını kontrol edin

### SMS Gönderilmiyor

**Sorun**: SMS gönderilemiyor
**Çözüm**:
- SMS sağlayıcı bilgilerini kontrol edin
- Test modunda çalıştırın: `SMS_PROVIDER=test`
- SMS sağlayıcı loglarını kontrol edin

### Rate Limiting Hatası

**Sorun**: `429 Too Many Requests`
**Çözüm**:
- Rate limiting limitlerini artırın (`.env` dosyasında)
- Admin kullanıcıları için limit zaten yüksek (1000/15dk)
- Birkaç dakika bekleyin

### Veritabanı Tabloları Oluşmadı

**Sorun**: Tablolar yok
**Çözüm**:
- Backend'i yeniden başlatın (otomatik oluşturulur)
- Manuel olarak `backend/src/database/init.js` dosyasını çalıştırın

---

## 📚 Ek Kaynaklar

### API Dokümantasyonu

API endpoint'leri için detaylı dokümantasyon:
- Backend kodunda route dosyalarında JSDoc yorumları mevcuttur
- `backend/src/routes/` klasöründeki dosyaları inceleyin

### Veritabanı Şeması

Detaylı veritabanı şeması için:
- `backend/src/database/init.js` dosyasını inceleyin

### Güvenlik

- Production ortamında mutlaka güçlü `JWT_SECRET` kullanın
- HTTPS kullanın
- Rate limiting ayarlarını gözden geçirin
- Düzenli olarak güvenlik güncellemeleri yapın

---

## 📞 Destek

Sorun yaşarsanız:
1. Bu dokümantasyonu gözden geçirin
2. Log dosyalarını kontrol edin
3. GitHub Issues'da sorun bildirin

---

## 📝 Lisans

[Lisans bilgisi buraya eklenecek]

---

**Son Güncelleme**: 2024
**Versiyon**: 1.0.0

