# 🏗️ BVSPOT Sistem Mimarisi

Bu doküman, BVSPOT sisteminin teknik mimarisini ve çalışma prensiplerini açıklar.

## 📐 Genel Mimari

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Ana Sayfa  │  │ Admin Panel  │  │  Components  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│                    ┌───────▼────────┐                       │
│                    │   API Client   │                       │
│                    │    (Axios)     │                       │
│                    └───────┬────────┘                       │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTP/REST API
┌────────────────────────────▼─────────────────────────────────┐
│                    Backend (Express.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Routes     │  │  Middleware  │  │   Services   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
│         ┌──────────────────┼──────────────────┐             │
│         │                  │                  │             │
│  ┌──────▼──────┐    ┌──────▼──────┐   ┌──────▼──────┐      │
│  │ PostgreSQL  │    │    Redis    │   │   External  │      │
│  │  Database   │    │    Cache    │   │   Services  │      │
│  └─────────────┘    └─────────────┘   └─────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 Veri Akışı

### 1. Kullanıcı Kayıt Süreci

```
Kullanıcı → Frontend Form → API Request → Backend Validation
    ↓
TCKN Doğrulama → Redis (OTP Storage) → SMS Service → External SMS Provider
    ↓
OTP Verification → Session Creation → Database (users table)
    ↓
Response → Frontend Success Screen
```

### 2. Admin Panel İşlemleri

```
Admin Login → JWT Token → Protected Routes → Admin Middleware
    ↓
Dashboard Request → Database Queries → Aggregated Data
    ↓
Response → Frontend Dashboard (Charts, Stats)
```

### 3. Session Yönetimi

```
User Login → Session Creation → Database (sessions table)
    ↓
Request → Session Validation → Middleware Check
    ↓
Session Timeout Check → Auto Logout (if expired)
```

## 🗄️ Veritabanı Şeması

### Ana Tablolar

#### `users`
Kullanıcı bilgileri ve kayıt verileri.

```sql
- id (UUID, Primary Key)
- first_name (VARCHAR)
- last_name (VARCHAR)
- phone (VARCHAR, Unique)
- tckn (VARCHAR, Unique, Masked)
- birth_date (DATE)
- is_active (BOOLEAN)
- is_blocked (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `admin_users`
Admin kullanıcıları ve yetkileri.

```sql
- id (UUID, Primary Key)
- email (VARCHAR, Unique)
- password_hash (VARCHAR)
- role (VARCHAR) -- 'super_admin', 'admin'
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `sessions`
Aktif kullanıcı oturumları.

```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users.id)
- mac_address (VARCHAR)
- ip_address (VARCHAR)
- started_at (TIMESTAMP)
- last_activity (TIMESTAMP)
- expires_at (TIMESTAMP)
- is_active (BOOLEAN)
```

#### `logs`
Sistem logları ve kullanıcı aktiviteleri.

```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users.id)
- action (VARCHAR) -- 'register', 'login', 'logout', etc.
- details (JSONB)
- ip_address (VARCHAR)
- created_at (TIMESTAMP)
```

#### `web_traffic`
Web trafiği kayıtları.

```sql
- id (UUID, Primary Key)
- user_id (UUID, Foreign Key → users.id)
- session_id (UUID, Foreign Key → sessions.id)
- url (VARCHAR)
- method (VARCHAR)
- status_code (INTEGER)
- response_time (INTEGER)
- created_at (TIMESTAMP)
```

#### `ssids`
Wi-Fi ağ bilgileri.

```sql
- id (UUID, Primary Key)
- name (VARCHAR)
- description (TEXT)
- background_image (VARCHAR)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `settings`
Sistem ayarları.

```sql
- id (UUID, Primary Key)
- inactive_timeout_hours (INTEGER) -- Trafik yoksa kaç saat sonra atılsın
- max_session_hours (INTEGER) -- Maksimum oturum süresi
- theme (VARCHAR) -- 'light', 'dark'
- updated_at (TIMESTAMP)
```

## 🔐 Güvenlik Katmanları

### 1. Authentication & Authorization

```
Request → JWT Middleware → Token Validation
    ↓
Role Check → Admin Middleware → Route Handler
    ↓
Response
```

**JWT Token Yapısı:**
- User Token: `JWT_SECRET` ile imzalanır
- Admin Token: `ADMIN_JWT_SECRET` ile imzalanır
- Token içeriği: `{ userId, email, role, iat, exp }`

### 2. Rate Limiting

```
Request → Rate Limiter Middleware → Request Count Check
    ↓
Limit Aşıldı mı? → 429 Error
    ↓
Limit İçinde → Continue
```

**Rate Limit Ayarları:**
- Normal kullanıcılar: 100 istek / 15 dakika
- Admin kullanıcıları: 1000 istek / 15 dakika
- OTP gönderme: 1 istek / 1 dakika
- Kayıt: 5 deneme / 15 dakika

### 3. Veri Maskeleme (KVKK Uyumluluk)

```javascript
// Hassas veriler maskeleme
phone: "555****567"
tckn: "12345****89"
```

## 🔄 Servisler ve İş Mantığı

### `otpService.js`
- OTP kod üretimi (6 haneli)
- Redis'te saklama (5 dakika TTL)
- OTP doğrulama
- Rate limiting kontrolü

### `smsService.js`
- Çoklu SMS sağlayıcı desteği
- NetGSM, Twilio, Türkcell, Türk Telekom
- Test modu desteği
- Hata yönetimi ve retry mekanizması

### `tcknVerificationService.js`
- TCKN algoritmik doğrulama
- Doğum tarihi kontrolü
- Checksum algoritması

### `logService.js`
- Sistem logları kaydetme
- Log filtreleme ve arama
- Pagination desteği

### `webTrafficService.js`
- Web trafiği kaydetme
- Domain analizi
- Top domain istatistikleri

### `ssidService.js`
- SSID yönetimi
- Arkaplan resmi yükleme
- Aktif/pasif kontrolü

## 🌐 API Mimarisi

### RESTful API Prensipleri

- **GET**: Veri okuma
- **POST**: Yeni kayıt oluşturma
- **PUT**: Kayıt güncelleme
- **DELETE**: Kayıt silme

### Response Formatı

**Başarılı:**
```json
{
  "success": true,
  "data": { ... },
  "message": "İşlem başarılı"
}
```

**Hata:**
```json
{
  "success": false,
  "error": "Hata mesajı",
  "code": "ERROR_CODE"
}
```

### Error Handling

```
Error → Error Handler Middleware → Error Formatting
    ↓
Logging → Response → Client
```

## 🎨 Frontend Mimarisi

### Component Yapısı

```
app/
├── page.tsx              # Ana sayfa (kayıt formu)
├── admin/
│   ├── layout.tsx        # Admin layout wrapper
│   ├── login/
│   │   └── page.tsx      # Admin giriş sayfası
│   ├── dashboard/
│   │   └── page.tsx      # Dashboard
│   ├── users/
│   │   └── page.tsx      # Kullanıcı yönetimi
│   └── ...
└── layout.tsx            # Root layout

components/
├── admin/                # Admin panel bileşenleri
│   ├── AdminLayout.tsx
│   ├── DashboardStats.tsx
│   └── UsersTable.tsx
├── RegisterForm.tsx      # Kayıt formu
├── OTPVerification.tsx   # OTP doğrulama
└── ...
```

### State Management

- **React Context**: Theme, Language
- **Local State**: useState, useReducer
- **Server State**: Axios ile API çağrıları

### Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Dark Mode**: `dark:` prefix ile tema desteği
- **Responsive**: Mobile-first yaklaşım

## 🔧 Middleware Katmanı

### Request Pipeline

```
1. Helmet (Security Headers)
2. CORS (Cross-Origin Resource Sharing)
3. Morgan (Logging)
4. Body Parser (JSON, URL-encoded)
5. MAC Address Middleware
6. Rate Limiting
7. Authentication (JWT)
8. Authorization (Role Check)
9. Route Handler
10. Error Handler
```

## 📊 Monitoring ve Logging

### Log Seviyeleri

- **INFO**: Normal işlemler
- **WARN**: Uyarılar
- **ERROR**: Hatalar
- **DEBUG**: Geliştirme logları

### Log Kaynakları

- **Morgan**: HTTP request logları
- **Console**: Uygulama logları
- **Database**: İş mantığı logları (logs table)

## 🚀 Deployment Mimarisi

### Production Ortamı

```
Load Balancer
    ↓
Frontend (Next.js) - Static Export / SSR
    ↓
Backend (Express.js) - PM2 / Docker
    ↓
PostgreSQL (Primary + Replica)
Redis (Cluster)
```

### Environment Variables

- **Development**: `.env` dosyası
- **Production**: Environment variables veya secrets manager

## 🔄 Cache Stratejisi

### Redis Kullanımı

1. **OTP Storage**: 5 dakika TTL
2. **Rate Limiting**: Request count tracking
3. **Session Cache**: Aktif session bilgileri (opsiyonel)

### Cache Invalidation

- OTP: Otomatik expire (TTL)
- Rate Limit: Window-based expiration
- Session: Database sync

## 📈 Ölçeklenebilirlik

### Horizontal Scaling

- **Stateless Backend**: Her instance bağımsız çalışabilir
- **Database Connection Pooling**: PostgreSQL connection pool
- **Redis Cluster**: Distributed cache

### Vertical Scaling

- **Database Indexing**: Performans optimizasyonu
- **Query Optimization**: Efficient database queries
- **CDN**: Static asset delivery (frontend)

---

**Son Güncelleme**: 2024  
**Versiyon**: 1.0.0

