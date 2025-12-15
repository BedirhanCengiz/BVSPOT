# 🚀 Hızlı Başlangıç Rehberi

Bu rehber, BVSPOT sistemini en hızlı şekilde çalıştırmanızı sağlar.

## ⚡ 5 Dakikada Kurulum

### 1. Gereksinimleri Kontrol Edin

```bash
node --version   # 18+ olmalı
npm --version    # 9+ olmalı
docker --version # Docker kurulu olmalı (opsiyonel)
```

### 2. Projeyi İndirin

```bash
git clone <repository-url>
cd BVSPOT
```

### 3. Veritabanlarını Başlatın (Docker ile)

```bash
docker-compose up -d
```

Bu komut PostgreSQL ve Redis'i başlatır.

### 4. Backend'i Kurun ve Başlatın

```bash
cd backend
npm install

# .env dosyası oluşturun
cat > .env << EOF
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
JWT_SECRET=dev-secret-key-change-in-production
ADMIN_JWT_SECRET=dev-admin-secret-key-change-in-production
SMS_PROVIDER=test
EOF

# Backend'i başlatın
npm run dev
```

### 5. Frontend'i Kurun ve Başlatın (Yeni Terminal)

```bash
cd frontend
npm install

# .env.local dosyası oluşturun
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

# Frontend'i başlatın
npm run dev
```

### 6. Tarayıcıda Açın

- **Ana Sayfa**: http://localhost:3000
- **Admin Panel**: http://localhost:3000/admin/login

## 🔑 İlk Admin Kullanıcısı Oluşturma

Backend ilk kez başlatıldığında veritabanı otomatik oluşturulur, ancak admin kullanıcısı oluşturulmaz.

### Yöntem 1: SQL ile (Hızlı)

```bash
# PostgreSQL'e bağlanın
psql -U postgres -d bvspot_db

# Şifreyi hash'leyin (Node.js ile)
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('admin123', 10).then(hash => console.log(hash));"
# Çıktıyı kopyalayın (örn: $2a$10$...)

# Admin kullanıcısı ekleyin
INSERT INTO admin_users (email, password_hash, role, created_at)
VALUES ('admin@example.com', '$2a$10$YOUR_HASH_HERE', 'super_admin', NOW());
```

### Yöntem 2: Admin Panel Üzerinden

Eğer başka bir admin kullanıcınız varsa, admin panelinden yeni admin oluşturabilirsiniz:
1. Admin paneline giriş yapın
2. Ayarlar > Admin Kullanıcıları sekmesine gidin
3. "Yeni Admin Oluştur" butonuna tıklayın

## ✅ Kurulum Kontrolü

### Backend Kontrolü

```bash
curl http://localhost:3001/health
```

Beklenen çıktı:
```json
{
  "status": "ok",
  "database": "connected",
  "redis": "connected"
}
```

### Frontend Kontrolü

Tarayıcıda http://localhost:3000 adresine gidin. Ana sayfa görünmelidir.

## 🎯 İlk Kullanım

### 1. Admin Paneline Giriş

1. http://localhost:3000/admin/login adresine gidin
2. Oluşturduğunuz admin kullanıcısı ile giriş yapın

### 2. Test Kullanıcısı Kaydetme

1. Ana sayfaya gidin (http://localhost:3000)
2. Kayıt formunu doldurun:
   - Ad Soyad: Test Kullanıcı
   - Telefon: 5551234567
   - TCKN: Geçerli bir TCKN (test için algoritmik doğrulama yapılır)
   - Doğum Tarihi: 01.01.1990
3. KVKK ve kullanım koşullarını onaylayın
4. OTP kodu girin (test modunda konsola yazdırılır)

### 3. Admin Panelde Kontrol

1. Dashboard'da yeni kullanıcıyı görebilmelisiniz
2. Kullanıcılar sayfasından kullanıcı listesini görüntüleyebilirsiniz
3. Loglar sayfasından sistem loglarını inceleyebilirsiniz

## 🔧 Yaygın Sorunlar

### Port Zaten Kullanımda

```bash
# Port'u kullanan process'i bulun
netstat -ano | findstr :3001  # Windows
lsof -i :3001                 # Linux/Mac

# Process'i sonlandırın veya .env'de farklı port kullanın
```

### Veritabanı Bağlantı Hatası

```bash
# PostgreSQL'in çalıştığını kontrol edin
docker-compose ps

# Veya manuel kontrol
psql -U postgres -c "SELECT version();"
```

### Redis Bağlantı Hatası

```bash
# Redis'in çalıştığını kontrol edin
redis-cli ping
# Beklenen çıktı: PONG
```

## 📚 Sonraki Adımlar

- [KURULUM_REHBERI.md](./KURULUM_REHBERI.md) - Detaylı kurulum ve yapılandırma
- [README.md](./README.md) - Genel proje bilgileri

## 💡 İpuçları

- **Geliştirme Modu**: `npm run dev` kullanın (otomatik yeniden başlatma)
- **SMS Test Modu**: `SMS_PROVIDER=test` ile SMS göndermeden test edebilirsiniz
- **Loglar**: Backend konsolunda tüm işlemler loglanır
- **Veritabanı Reset**: `docker-compose down -v` ile veritabanını sıfırlayabilirsiniz

---

**Sorun mu yaşıyorsunuz?** [KURULUM_REHBERI.md](./KURULUM_REHBERI.md#sorun-giderme) dosyasındaki sorun giderme bölümüne bakın.

