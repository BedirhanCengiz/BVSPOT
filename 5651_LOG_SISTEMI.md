# 5651 Kanunu ve KVKK Uyumlu Loglama Sistemi

## Genel Bakış

Bu sistem, 5651 sayılı kanun ve KVKK (Kişisel Verilerin Korunması Kanunu) uyumlu olarak internet erişim loglarını kayıt altına alır. Loglar değiştirilemez (immutable), hash chain ile korunur ve günlük dosyalar halinde mühürlenir.

## Özellikler

### 1. Immutable Logs (Değiştirilemez Loglar)

- Her log kaydı SHA-256 ile hashlenir
- Hash chain (zincirleme hash) ile bütünlük korunur
- UPDATE ve DELETE işlemleri trigger ile engellenir
- Append-only storage prensibi

### 2. Hash Chain (Zincirleme Hash)

Her log satırı:
- Kendi hash'ine sahiptir
- Önceki logun hash'ini içerir
- Zincir kırılırsa tespit edilir

**Örnek Hash Chain:**
```
Log 1: hash_1 = SHA256(data_1)
Log 2: hash_2 = SHA256(data_2 + hash_1)
Log 3: hash_3 = SHA256(data_3 + hash_2)
...
```

### 3. Günlük Log Dosyaları

- Her gün için ayrı log dosyası oluşturulur
- Gün sonunda dosya hash'lenir ve mühürlenir
- Önceki günün hash'i ile zincirlenir
- Elektronik imza veya zaman damgası ile mühürlenebilir

### 4. UTC+3 Zaman Yönetimi

- Tüm zaman bilgileri UTC+3 (Türkiye saati) olarak saklanır
- PostgreSQL `Europe/Istanbul` timezone kullanılır
- NTP senkronizasyon kontrolü yapılır

### 5. KVKK Uyumlu Onay Kayıtları

Her kullanıcı onayı için:
- Onay zamanı (timestamp)
- Onaylanan metin versiyonu
- Onay IP adresi
- Onaylanan metnin hash'i
- User agent bilgisi

## Veritabanı Şeması

### 1. `immutable_access_logs` - Ana Log Tablosu

```sql
CREATE TABLE immutable_access_logs (
  id BIGSERIAL PRIMARY KEY,
  log_hash VARCHAR(64) NOT NULL UNIQUE,
  previous_log_hash VARCHAR(64),
  user_id INTEGER REFERENCES users(id),
  session_id INTEGER REFERENCES sessions(id),
  internal_ip VARCHAR(45) NOT NULL,      -- İç IP (DHCP)
  external_ip VARCHAR(45),               -- Dış IP (NAT sonrası)
  mac_address VARCHAR(17) NOT NULL,
  gateway_id VARCHAR(100),
  firewall_id VARCHAR(100),
  connection_start_time TIMESTAMP NOT NULL,
  connection_end_time TIMESTAMP,
  source_port INTEGER,                    -- CGNAT varsa zorunlu
  destination_port INTEGER,
  protocol VARCHAR(20),                   -- HTTP, HTTPS, FTP, SSH, DNS, TCP, UDP
  data_transferred_bytes BIGINT DEFAULT 0,
  log_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Europe/Istanbul')
);
```

### 2. `log_hash_chain` - Hash Zinciri

```sql
CREATE TABLE log_hash_chain (
  id SERIAL PRIMARY KEY,
  log_id BIGINT REFERENCES immutable_access_logs(id),
  log_hash VARCHAR(64) NOT NULL UNIQUE,
  previous_hash VARCHAR(64),
  chain_position BIGINT NOT NULL,
  created_at TIMESTAMP DEFAULT (NOW() AT TIME ZONE 'Europe/Istanbul')
);
```

### 3. `daily_log_files` - Günlük Log Dosyaları

```sql
CREATE TABLE daily_log_files (
  id SERIAL PRIMARY KEY,
  log_date DATE NOT NULL UNIQUE,
  file_path VARCHAR(500),
  file_hash VARCHAR(64) NOT NULL,
  previous_day_hash VARCHAR(64),
  seal_type VARCHAR(20),                 -- 'electronic_signature', 'timestamp_authority', 'manual'
  seal_hash VARCHAR(64),
  seal_timestamp TIMESTAMP,
  seal_authority VARCHAR(255),           -- TÜBİTAK vb.
  total_logs INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'open',     -- 'open', 'sealed', 'archived'
  created_at TIMESTAMP,
  sealed_at TIMESTAMP
);
```

### 4. `kvkk_consents` - KVKK Onay Kayıtları

```sql
CREATE TABLE kvkk_consents (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  consent_type VARCHAR(50) NOT NULL,      -- 'kvkk', 'terms', 'law5651'
  consent_version VARCHAR(20) NOT NULL,  -- Metin versiyonu
  consent_text_hash VARCHAR(64),         -- Onaylanan metnin hash'i
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  accepted_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP
);
```

### 5. `admin_access_logs` - Admin Erişim Logları

```sql
CREATE TABLE admin_access_logs (
  id SERIAL PRIMARY KEY,
  admin_id INTEGER REFERENCES admin_users(id),
  action VARCHAR(100) NOT NULL,          -- 'view_logs', 'export_logs', 'ip_lookup' vb.
  search_criteria JSONB,
  accessed_log_ids BIGINT[],
  ip_address VARCHAR(45),
  user_agent TEXT,
  accessed_at TIMESTAMP NOT NULL
);
```

## Log Formatı

### Günlük Log Dosyası Formatı (5651 Uyumlu)

Her satır pipe-separated (|) formatında:

```
timestamp|user_id|session_id|internal_ip|external_ip|mac_address|gateway_id|firewall_id|start_time|end_time|source_port|dest_port|protocol|data_bytes|log_hash
```

**Örnek Satır:**
```
2024-01-15T10:30:45+03:00|123|456|192.168.1.100|85.123.45.67|AA:BB:CC:DD:EE:FF|GW-001|FW-001|2024-01-15T10:30:45+03:00|2024-01-15T12:45:30+03:00|54321|443|HTTPS|1048576|a1b2c3d4e5f6...
```

## API Endpoints

### Admin Endpoints

#### 1. Immutable Logları Listele
```
GET /api/admin/immutable-logs
Query Parameters:
  - page: Sayfa numarası
  - limit: Sayfa başına kayıt
  - userId: Kullanıcı ID
  - internalIp: İç IP
  - externalIp: Dış IP
  - macAddress: MAC adresi
  - startDate: Başlangıç tarihi
  - endDate: Bitiş tarihi
```

#### 2. IP ve Zaman Bazlı Arama
```
GET /api/admin/immutable-logs/ip-lookup
Query Parameters:
  - ip: IP adresi (iç veya dış)
  - timestamp: Zaman (ISO format)
```

**Örnek:**
```
GET /api/admin/immutable-logs/ip-lookup?ip=192.168.1.100&timestamp=2024-01-15T10:30:00Z
```

#### 3. Log Export (5651 Uyumlu)
```
GET /api/admin/immutable-logs/export
Query Parameters:
  - format: 'csv' veya 'json'
  - startDate: Başlangıç tarihi
  - endDate: Bitiş tarihi
  - userId, internalIp, externalIp, macAddress: Filtreler
```

#### 4. Hash Chain Doğrulama
```
GET /api/admin/hash-chain/verify
```

#### 5. Günlük Log Dosyaları
```
GET /api/admin/daily-log-files
Query Parameters:
  - startDate, endDate, status
```

#### 6. Günlük Log Dosyasını Mühürle
```
POST /api/admin/daily-log-files/seal
Body:
{
  "logDate": "2024-01-15",
  "seal_type": "manual",
  "seal_authority": "ADMIN"
}
```

## Kullanım Senaryoları

### Senaryo 1: Kullanıcı Girişi ve Log Oluşturma

1. Kullanıcı OTP doğrulaması yapar
2. Session oluşturulur (iç IP, dış IP, MAC adresi ile)
3. Immutable access log otomatik oluşturulur
4. Log hash chain'e eklenir
5. Günlük log dosyasına yazılır

### Senaryo 2: "Şu IP'yi Şu Saatte Kim Kullandı?" Sorgusu

```javascript
// Admin panelinden
GET /api/admin/immutable-logs/ip-lookup?ip=192.168.1.100&timestamp=2024-01-15T10:30:00Z

// Sonuç:
{
  "logs": [
    {
      "user_id": 123,
      "full_name": "Ahmet Yılmaz",
      "internal_ip": "192.168.1.100",
      "external_ip": "85.123.45.67",
      "mac_address": "AA:BB:CC:DD:EE:FF",
      "connection_start_time": "2024-01-15T10:28:45+03:00",
      "connection_end_time": "2024-01-15T12:45:30+03:00",
      "log_hash": "a1b2c3d4..."
    }
  ]
}
```

### Senaryo 3: Gün Sonu Mühürleme

1. Gün sonunda (örn: 23:59) cron job çalışır
2. O günün log dosyası hash'lenir
3. Önceki günün hash'i ile zincirlenir
4. Elektronik imza veya zaman damgası ile mühürlenir
5. Status 'sealed' olarak güncellenir

## Güvenlik Önlemleri

### 1. Immutable Storage

- PostgreSQL trigger ile UPDATE/DELETE engellenir
- Loglar sadece INSERT edilebilir
- Append-only prensibi

### 2. Hash Chain Integrity

- Her log önceki logun hash'ini içerir
- Zincir kırılırsa `verifyHashChain()` ile tespit edilir
- Düzenli olarak hash chain doğrulanmalıdır

### 3. Admin Erişim Kontrolü

- Tüm log erişimleri `admin_access_logs` tablosuna kaydedilir
- Hangi admin hangi loglara eriştiği takip edilir
- Arama kriterleri ve erişilen log ID'leri saklanır

### 4. KVKK Uyumluluk

- TCKN ve telefon numaraları maskelenir
- Hassas veriler hash'lenir
- Onay kayıtları detaylı tutulur

## Saklama Süresi

- Loglar en az **2 yıl** saklanmalıdır
- 2 yıl sonra otomatik arşivlenebilir
- Arşivlenen loglar silinmez, sadece erişim kısıtlanır

## NTP Senkronizasyonu

Sistem zamanı NTP ile senkronize edilmelidir:

```bash
# Linux'ta NTP kurulumu
sudo apt-get install ntp
sudo systemctl enable ntp
sudo systemctl start ntp

# NTP kontrolü
ntpq -p
```

Kod içinde `checkNTPSync()` fonksiyonu ile kontrol edilir.

## Production Önerileri

1. **Elektronik İmza Entegrasyonu**: TÜBİTAK veya başka bir sertifikalı kurumdan elektronik imza servisi kullanın
2. **WORM Storage**: Değiştirilemez depolama (Write Once Read Many) kullanın
3. **Yedekleme**: Loglar düzenli olarak yedeklenmeli ve farklı lokasyonlarda saklanmalı
4. **Monitoring**: Hash chain bütünlüğü düzenli kontrol edilmeli
5. **Access Control**: Admin erişimleri sıkı kontrol altında olmalı

## Örnek Log Satırı

```
2024-01-15T10:30:45+03:00|123|456|192.168.1.100|85.123.45.67|AA:BB:CC:DD:EE:FF|GW-001|FW-001|2024-01-15T10:30:45+03:00|2024-01-15T12:45:30+03:00|54321|443|HTTPS|1048576|a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

## Hash Chain Akışı

```
1. İlk Log:
   - Log 1 oluşturulur
   - hash_1 = SHA256(log_data_1)
   - previous_hash = null
   - Hash chain'e eklenir

2. İkinci Log:
   - Log 2 oluşturulur
   - hash_2 = SHA256(log_data_2 + hash_1)
   - previous_hash = hash_1
   - Hash chain'e eklenir

3. Üçüncü Log:
   - Log 3 oluşturulur
   - hash_3 = SHA256(log_data_3 + hash_2)
   - previous_hash = hash_2
   - Hash chain'e eklenir

... ve böyle devam eder
```

## Sorun Giderme

### Hash Chain Kırıldı

```javascript
// Hash chain doğrulama
GET /api/admin/hash-chain/verify

// Sonuç:
{
  "valid": false,
  "total_logs": 1000,
  "issues": [
    {
      "type": "chain_break",
      "log_id": 500,
      "chain_position": 500,
      "expected_previous": "abc123...",
      "actual_previous": "def456..."
    }
  ]
}
```

### Log Dosyası Mühürlenemedi

- Dosya yolu kontrol edilmeli
- Dosya izinleri kontrol edilmeli
- Disk alanı kontrol edilmeli

## İletişim ve Destek

5651 Kanunu ve KVKK uyumluluk soruları için hukuki danışmanlık alınması önerilir.

