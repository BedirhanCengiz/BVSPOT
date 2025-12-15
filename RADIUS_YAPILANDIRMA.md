# 🔐 RADIUS Yapılandırma Rehberi

Bu doküman, BVSPOT sisteminin RADIUS sunucusu ile entegrasyonu için gerekli yapılandırmaları açıklar.

## 📋 RADIUS Secret Kodu Nedir?

RADIUS secret kodu, Wi-Fi access point'lerin (NAS - Network Access Server) RADIUS sunucusuna bağlanırken kullandığı güvenlik anahtarıdır. Bu kod, RADIUS sunucusu ile access point arasındaki iletişimi şifrelemek ve doğrulamak için kullanılır.

## 🔑 RADIUS Secret Kodu Yapılandırması

### Access Point Tarafında (NAS)

Access point'inizde (Mikrotik, UniFi, OpenWRT, vb.) RADIUS sunucusu yapılandırması:

#### Mikrotik RouterOS Örneği

```bash
/radius
add address=YOUR_RADIUS_SERVER_IP secret=YOUR_RADIUS_SECRET service=hotspot
```

#### UniFi Controller Örneği

1. Settings → Profiles → RADIUS
2. RADIUS Server IP: `YOUR_RADIUS_SERVER_IP`
3. RADIUS Port: `1812` (Authentication), `1813` (Accounting)
4. RADIUS Secret: `YOUR_RADIUS_SECRET`

#### OpenWRT Örneği

`/etc/config/freeradius3` dosyasında:

```
config client
    option ipaddr 'YOUR_RADIUS_SERVER_IP'
    option secret 'YOUR_RADIUS_SECRET'
    option nasid 'access-point-1'
```

### RADIUS Sunucusu Tarafında (FreeRADIUS)

FreeRADIUS sunucusunda (`/etc/freeradius/3.0/clients.conf`):

```
client access-point-1 {
    ipaddr = ACCESS_POINT_IP
    secret = YOUR_RADIUS_SECRET
    require_message_authenticator = no
    nas_type = other
}
```

## 🔒 Güvenli Secret Kodu Oluşturma

RADIUS secret kodu en az 16 karakter olmalı ve güçlü olmalıdır:

```bash
# Linux/Mac
openssl rand -hex 16

# Veya manuel olarak güçlü bir kod oluşturun
# Örnek: BvSp0t-R4d1u5-S3cr3t-2024!
```

## ⚙️ BVSPOT RADIUS Entegrasyonu

### Environment Variables

`backend/.env` dosyasına ekleyin:

```env
# RADIUS Sunucu Ayarları
RADIUS_ENABLED=true
RADIUS_HOST=localhost
RADIUS_PORT=1812
RADIUS_SECRET=your-radius-secret-key-here
RADIUS_TIMEOUT=5000
RADIUS_RETRIES=3

# RADIUS Accounting (Opsiyonel)
RADIUS_ACCOUNTING_ENABLED=true
RADIUS_ACCOUNTING_PORT=1813
```

### Önerilen Secret Kod Değerleri

**Geliştirme Ortamı:**
```
RADIUS_SECRET=testing123
```

**Production Ortamı:**
```
RADIUS_SECRET=BvSp0t-R4d1u5-S3cr3t-2024!ChangeThis
```

**Önemli:** Production ortamında mutlaka güçlü ve benzersiz bir secret kodu kullanın!

## 🔄 RADIUS İş Akışı

```
1. Kullanıcı Wi-Fi'ye bağlanır
   ↓
2. Access Point → RADIUS Sunucu (Access-Request)
   - Username: MAC adresi veya telefon numarası
   - Password: OTP kodu veya session token
   - NAS-IP-Address: Access point IP'si
   - Called-Station-Id: SSID
   - Calling-Station-Id: Kullanıcı MAC adresi
   ↓
3. RADIUS Sunucu → BVSPOT API (Kullanıcı doğrulama)
   ↓
4. BVSPOT API → Veritabanı (Kullanıcı kontrolü)
   ↓
5. RADIUS Sunucu → Access Point (Access-Accept veya Access-Reject)
   ↓
6. Kullanıcıya internet erişimi verilir veya reddedilir
```

## 📝 FreeRADIUS Yapılandırma Örneği

### `/etc/freeradius/3.0/clients.conf`

```conf
# BVSPOT Access Point
client mikrotik-ap {
    ipaddr = 192.168.1.1
    secret = BvSp0t-R4d1u5-S3cr3t-2024!
    require_message_authenticator = no
    nas_type = other
}

# UniFi Access Point
client unifi-ap {
    ipaddr = 192.168.1.2
    secret = BvSp0t-R4d1u5-S3cr3t-2024!
    require_message_authenticator = no
    nas_type = other
}
```

### `/etc/freeradius/3.0/sites-enabled/default`

```conf
authorize {
    # BVSPOT API'ye sorgu gönder
    rest {
        uri = "http://localhost:3001/api/radius/authorize"
        method = "post"
        tls = no
    }
    
    # Eğer REST başarısız olursa, varsayılan davranış
    if (noop) {
        update control {
            Auth-Type := Reject
        }
    }
}

authenticate {
    # BVSPOT API'ye kimlik doğrulama isteği gönder
    rest {
        uri = "http://localhost:3001/api/radius/authenticate"
        method = "post"
        tls = no
    }
}

accounting {
    # BVSPOT API'ye accounting bilgisi gönder
    rest {
        uri = "http://localhost:3001/api/radius/accounting"
        method = "post"
        tls = no
    }
}
```

## 🛠️ BVSPOT RADIUS API Endpoint'leri

### POST /api/radius/authorize

RADIUS authorization isteği.

**Request:**
```json
{
  "username": "AA:BB:CC:DD:EE:FF",
  "nas_ip": "192.168.1.1",
  "called_station_id": "BVSPOT-Guest",
  "calling_station_id": "AA:BB:CC:DD:EE:FF"
}
```

**Response:**
```json
{
  "success": true,
  "auth_type": "Accept",
  "session_timeout": 3600,
  "idle_timeout": 1800
}
```

### POST /api/radius/authenticate

RADIUS authentication isteği.

**Request:**
```json
{
  "username": "AA:BB:CC:DD:EE:FF",
  "password": "123456",
  "nas_ip": "192.168.1.1"
}
```

**Response:**
```json
{
  "success": true,
  "auth_type": "Accept",
  "user_id": "uuid-here"
}
```

### POST /api/radius/accounting

RADIUS accounting bilgisi.

**Request:**
```json
{
  "username": "AA:BB:CC:DD:EE:FF",
  "acct_status_type": "Start",
  "acct_session_id": "session-id",
  "acct_input_octets": 1024,
  "acct_output_octets": 2048,
  "acct_session_time": 3600
}
```

## 🔍 Secret Kodu Kontrolü

### Access Point'te Kontrol

**Mikrotik:**
```bash
/radius print
```

**UniFi:**
Settings → Profiles → RADIUS → RADIUS Secret alanını kontrol edin.

### RADIUS Sunucusunda Kontrol

```bash
# FreeRADIUS
cat /etc/freeradius/3.0/clients.conf | grep secret

# Test
radtest test_user test_password localhost 0 testing123
```

## ⚠️ Güvenlik Önerileri

1. **Güçlü Secret Kodu**: En az 16 karakter, büyük/küçük harf, rakam ve özel karakter içermeli
2. **Her Access Point İçin Farklı Secret**: Her access point için benzersiz secret kodu kullanın
3. **Düzenli Değiştirme**: Production ortamında secret kodları düzenli olarak değiştirin
4. **Şifreleme**: RADIUS trafiği için TLS/DTLS kullanın (production)
5. **Firewall**: RADIUS portlarını (1812, 1813) sadece gerekli IP'lere açın

## 🐛 Sorun Giderme

### Secret Kodu Eşleşmiyor

**Sorun**: `Access-Reject` alıyorsunuz
**Çözüm**:
1. Access point ve RADIUS sunucusundaki secret kodların aynı olduğundan emin olun
2. Büyük/küçük harf duyarlılığını kontrol edin
3. Özel karakterlerin doğru escape edildiğinden emin olun

### RADIUS Sunucusuna Bağlanılamıyor

**Sorun**: `Timeout` hatası
**Çözüm**:
1. RADIUS sunucusunun çalıştığını kontrol edin: `systemctl status freeradius`
2. Port'ların açık olduğunu kontrol edin: `netstat -tuln | grep 1812`
3. Firewall kurallarını kontrol edin

### Kullanıcı Doğrulanamıyor

**Sorun**: Kullanıcı doğru bilgilerle giriş yapamıyor
**Çözüm**:
1. BVSPOT API'nin çalıştığını kontrol edin
2. Veritabanı bağlantısını kontrol edin
3. RADIUS loglarını inceleyin: `tail -f /var/log/freeradius/radius.log`

## 📚 Ek Kaynaklar

- [FreeRADIUS Documentation](https://freeradius.org/documentation/)
- [RADIUS Protocol (RFC 2865)](https://tools.ietf.org/html/rfc2865)
- [RADIUS Accounting (RFC 2866)](https://tools.ietf.org/html/rfc2866)

---

**Not**: Bu doküman genel bir rehberdir. Spesifik access point ve RADIUS sunucu yapılandırmaları için üretici dokümantasyonuna bakın.

**Son Güncelleme**: 2024

