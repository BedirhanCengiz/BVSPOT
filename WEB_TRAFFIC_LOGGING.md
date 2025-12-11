# Web Trafiği Loglama Sistemi

Bu dokümantasyon, kullanıcıların web trafiğini loglamak için hazırlanmıştır.

## 📋 Genel Bakış

Sistem, kullanıcıların ziyaret ettiği web sitelerini, IP adreslerini, trafik miktarını ve diğer detayları loglar.

## 🗄️ Veritabanı Yapısı

### `web_traffic_logs` Tablosu

```sql
CREATE TABLE web_traffic_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  session_id INTEGER REFERENCES sessions(id) ON DELETE SET NULL,
  ip_address VARCHAR(45) NOT NULL,
  mac_address VARCHAR(17),
  url TEXT NOT NULL,
  domain VARCHAR(255),
  method VARCHAR(10) DEFAULT 'GET',
  status_code INTEGER,
  user_agent TEXT,
  referer TEXT,
  data_transferred_bytes BIGINT DEFAULT 0,
  response_time_ms INTEGER,
  country_code VARCHAR(2),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔌 API Endpoint'leri

### 1. POST `/api/traffic/log`
Tek bir web trafiği logu kaydet

**Request Body:**
```json
{
  "ipAddress": "192.168.1.100",
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "url": "https://www.google.com/search?q=test",
  "domain": "www.google.com",
  "method": "GET",
  "statusCode": 200,
  "userAgent": "Mozilla/5.0...",
  "referer": "https://www.google.com",
  "dataTransferredBytes": 1024,
  "responseTimeMs": 150,
  "userId": 123,
  "sessionId": 456,
  "countryCode": "TR",
  "deviceType": "mobile",
  "browser": "Chrome",
  "os": "Android"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Web trafik logu kaydedildi"
}
```

### 2. POST `/api/traffic/log-bulk`
Toplu web trafiği logları kaydet

**Request Body:**
```json
{
  "logs": [
    {
      "ipAddress": "192.168.1.100",
      "url": "https://www.google.com",
      "method": "GET",
      "statusCode": 200,
      "dataTransferredBytes": 1024
    },
    {
      "ipAddress": "192.168.1.101",
      "url": "https://www.youtube.com",
      "method": "GET",
      "statusCode": 200,
      "dataTransferredBytes": 2048
    }
  ]
}
```

### 3. GET `/api/traffic/logs` (Admin Only)
Web trafiği loglarını getir

**Query Parameters:**
- `userId` - Kullanıcı ID
- `ipAddress` - IP adresi
- `macAddress` - MAC adresi
- `domain` - Domain (ILIKE search)
- `method` - HTTP method (GET, POST, etc.)
- `statusCode` - HTTP status code
- `startDate` - Başlangıç tarihi (YYYY-MM-DD)
- `endDate` - Bitiş tarihi (YYYY-MM-DD)
- `page` - Sayfa numarası (default: 1)
- `limit` - Sayfa başına kayıt (default: 100)

**Response:**
```json
{
  "logs": [
    {
      "id": 1,
      "user_id": 123,
      "ip_address": "192.168.1.100",
      "url": "https://www.google.com",
      "domain": "www.google.com",
      "method": "GET",
      "status_code": 200,
      "data_transferred_bytes": 1024,
      "created_at": "2024-01-01T12:00:00Z",
      "full_name": "Ahmet Yılmaz",
      "phone": "0555***4567"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1
  }
}
```

### 4. GET `/api/traffic/stats` (Admin Only)
Web trafiği istatistiklerini getir

**Query Parameters:**
- `userId` - Kullanıcı ID (opsiyonel)
- `startDate` - Başlangıç tarihi
- `endDate` - Bitiş tarihi

**Response:**
```json
{
  "totalRequests": 1000,
  "totalDataBytes": 104857600,
  "totalDataMB": 100,
  "topDomains": [
    {
      "domain": "www.google.com",
      "count": 500,
      "total_bytes": 52428800
    }
  ],
  "methodStats": [
    { "method": "GET", "count": 900 },
    { "method": "POST", "count": 100 }
  ],
  "statusStats": [
    { "status_code": 200, "count": 950 },
    { "status_code": 404, "count": 50 }
  ]
}
```

## 🔧 Router/Hotspot Entegrasyonu

### Mikrotik Entegrasyonu

Mikrotik router'ınızda web trafiği loglarını yakalamak için:

**1. Script Oluşturun:**
```javascript
/system script add name="log-web-traffic" source={
  :local url "http://your-bvspot-server:3001/api/traffic/log";
  :local ip [/ip firewall connection get [find src-address=$srcAddress] src-address];
  :local mac [/ip dhcp-server lease get [find address=$ip] mac-address];
  
  :local data "{\"ipAddress\":\"$ip\",\"macAddress\":\"$mac\",\"url\":\"$url\",\"method\":\"GET\",\"statusCode\":200}";
  
  /tool fetch url=$url http-method=post http-data=$data;
}
```

**2. Firewall Rule Ekle:**
```
/ip firewall filter add chain=forward action=log log-prefix="web-traffic" 
```

### UniFi Entegrasyonu

UniFi controller'da webhook oluşturun:

**Webhook URL:** `http://your-bvspot-server:3001/api/traffic/log`

**Payload:**
```json
{
  "ipAddress": "{{client_ip}}",
  "macAddress": "{{client_mac}}",
  "url": "{{url}}",
  "method": "{{method}}",
  "statusCode": {{status_code}},
  "dataTransferredBytes": {{bytes}}
}
```

### OpenWRT Entegrasyonu

**1. LuCI Web Interface:**
- System > Logging
- Log to Remote Server: `your-bvspot-server:3001/api/traffic/log`

**2. Script ile:**
```bash
#!/bin/sh
# /etc/hotplug.d/iface/web-traffic-logger

logger -t web-traffic "IP: $IP, MAC: $MAC, URL: $URL"

curl -X POST http://your-bvspot-server:3001/api/traffic/log \
  -H "Content-Type: application/json" \
  -d "{\"ipAddress\":\"$IP\",\"macAddress\":\"$MAC\",\"url\":\"$URL\"}"
```

### pfSense Entegrasyonu

**1. Package Manager:**
- Install `pfSense-pkg-WebTrafficLogger`

**2. Custom Script:**
```php
<?php
// /usr/local/www/web-traffic-logger.php

$data = [
    'ipAddress' => $_SERVER['REMOTE_ADDR'],
    'macAddress' => getMacAddress($_SERVER['REMOTE_ADDR']),
    'url' => $_SERVER['REQUEST_URI'],
    'method' => $_SERVER['REQUEST_METHOD'],
    'statusCode' => http_response_code(),
    'userAgent' => $_SERVER['HTTP_USER_AGENT']
];

file_get_contents('http://your-bvspot-server:3001/api/traffic/log', false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => json_encode($data)
    ]
]));
```

## 📊 Admin Panel

Admin panelde web trafiği loglarını görüntülemek için:

1. **Admin Panel > Web Trafiği** sayfasına gidin
2. Filtrelerle arama yapın (User ID, IP, Domain, Tarih, etc.)
3. İstatistikleri görüntüleyin
4. En çok ziyaret edilen domainleri görüntüleyin

## 🔒 Güvenlik

- **API Key:** Router entegrasyonları için API key kullanın (gelecekte eklenecek)
- **Rate Limiting:** Toplu log gönderimlerinde rate limiting uygulanır
- **KVKK Uyumlu:** TCKN ve telefon numaraları maskelenmiş olarak saklanır
- **1 Yıl Saklama:** Loglar 1 yıl sonra otomatik temizlenir

## 📈 Otomatik Özellikler

1. **Kullanıcı Eşleştirme:**
   - IP ve MAC adresinden otomatik kullanıcı bulma
   - Session ID'den kullanıcı eşleştirme

2. **Kota Takibi:**
   - Her trafik logu kullanıcının `quota_used_mb`'sini günceller
   - Session'daki `data_transferred_mb` güncellenir

3. **Domain Çıkarma:**
   - URL'den otomatik domain çıkarma
   - Domain bazlı istatistikler

## 🧪 Test Etme

### Manuel Test:
```bash
curl -X POST http://localhost:3001/api/traffic/log \
  -H "Content-Type: application/json" \
  -d '{
    "ipAddress": "192.168.1.100",
    "macAddress": "AA:BB:CC:DD:EE:FF",
    "url": "https://www.google.com",
    "method": "GET",
    "statusCode": 200,
    "dataTransferredBytes": 1024
  }'
```

### Toplu Test:
```bash
curl -X POST http://localhost:3001/api/traffic/log-bulk \
  -H "Content-Type: application/json" \
  -d '{
    "logs": [
      {
        "ipAddress": "192.168.1.100",
        "url": "https://www.google.com",
        "method": "GET",
        "statusCode": 200,
        "dataTransferredBytes": 1024
      }
    ]
  }'
```

## 📝 Notlar

- Loglar KVKK uyumlu olarak saklanır
- Hassas veriler (TCKN, telefon) maskelenmiş olarak gösterilir
- 1 yıl sonra otomatik temizlenir
- Router entegrasyonu için API key sistemi gelecekte eklenecek


