# Hotspot / Captive Portal Entegrasyon Kılavuzu

Bu doküman, BVSPOT sistemini çeşitli hotspot/router cihazlarıyla entegre etme adımlarını içerir.

## Genel Yaklaşım

1. Kullanıcı Wi-Fi'ye bağlandığında captive portal açılır
2. Portal URL'i BVSPOT kayıt sayfasına yönlendirir
3. Kullanıcı kayıt olur ve OTP doğrular
4. Başarılı doğrulamada MAC adresi router'a iletilir
5. Router kullanıcıya internete erişim izni verir

## Mikrotik RouterOS Entegrasyonu

### 1. Hotspot Profili Oluşturma

```bash
/ip hotspot profile add name=bvspot-guest \
  hotspot-address=192.168.1.1 \
  dns-name=bvspot.local \
  html-directory=hotspot \
  rate-limit="10M/10M"
```

### 2. Hotspot Server Ayarları

```bash
/ip hotspot add \
  name=bvspot-hotspot \
  interface=wlan1 \
  profile=bvspot-guest \
  address-pool=guest-pool
```

### 3. Captive Portal Yönlendirme

Mikrotik'te login script'i oluşturun:

```bash
/system script add name=bvspot-login source={
  :local mac [/ip hotspot active get [find where user=$user] mac-address]
  :local ip [/ip hotspot active get [find where user=$user] address]
  
  # BVSPOT API'ye istek gönder
  :local apiUrl "http://your-bvspot-server:3001/api/hotspot/verify"
  :local response [/tool fetch url="$apiUrl" http-method=post http-data="{\"mac\":\"$mac\",\"ip\":\"$ip\"}"]
  
  # Başarılı ise kullanıcıyı aktif et
  :if ($response = "success") do={
    /ip hotspot user add name=$mac mac-address=$mac profile=bvspot-guest
  }
}
```

### 4. API Endpoint Ekleme (Backend)

Backend'e Mikrotik için özel endpoint ekleyin:

```javascript
// backend/src/routes/hotspot.routes.js
router.post('/hotspot/verify', async (req, res) => {
  const { mac, ip } = req.body;
  
  // MAC adresine göre kullanıcıyı kontrol et
  const user = await findUserByMac(mac);
  
  if (user && user.status === 'verified') {
    // Mikrotik'e kullanıcıyı ekle
    await addUserToMikrotik(mac, ip);
    res.json({ status: 'success' });
  } else {
    res.json({ status: 'pending' });
  }
});
```

## UniFi Controller Entegrasyonu

### 1. Guest Portal Ayarları

1. UniFi Controller'a giriş yapın
2. Settings > Guest Control > Guest Portal
3. Portal Type: "External Portal Server"
4. External Portal URL: `http://your-bvspot-server:3000`

### 2. RADIUS Entegrasyonu (Opsiyonel)

UniFi'de RADIUS authentication kullanmak için:

1. Settings > Profiles > RADIUS
2. RADIUS Server: BVSPOT API endpoint'inizi ekleyin
3. Authentication: `POST /api/radius/auth`

### 3. API Endpoint (RADIUS)

```javascript
router.post('/radius/auth', async (req, res) => {
  const { username, password, mac } = req.body;
  
  // MAC adresine göre kullanıcı kontrolü
  const user = await findUserByMac(mac);
  
  if (user && user.status === 'verified') {
    res.json({
      reply: {
        'Access-Accept': true,
        'Session-Timeout': 7200, // 2 saat
      }
    });
  } else {
    res.json({ reply: { 'Access-Reject': true } });
  }
});
```

## OpenWRT Entegrasyonu

### CoovaChilli ile

1. CoovaChilli kurulumu:
```bash
opkg update
opkg install coova-chilli
```

2. `/etc/chilli/config` dosyasını düzenleyin:
```
HS_UAMHOMEPAGE=http://your-bvspot-server:3000
HS_UAMSERVER=http://your-bvspot-server:3001/api/hotspot/auth
```

3. CoovaChilli'yi başlatın:
```bash
/etc/init.d/chilli start
```

### nodogsplash ile

1. nodogsplash kurulumu:
```bash
opkg install nodogsplash
```

2. `/etc/nodogsplash/nodogsplash.conf`:
```
GatewayInterface br-lan
GatewayAddress 192.168.1.1
GatewayName "BVSPOT Guest WiFi"
AuthServer http://your-bvspot-server:3001/api/hotspot/auth
```

## pfSense Entegrasyonu

### Captive Portal Ayarları

1. Services > Captive Portal
2. Zone Settings:
   - Interface: Guest network interface
   - Portal Page Contents: External Portal URL
   - Portal URL: `http://your-bvspot-server:3000`

### RADIUS Authentication

1. Services > RADIUS Authentication
2. RADIUS Server: BVSPOT API endpoint
3. Authentication Method: POST to `/api/radius/auth`

## MAC Adresi Yakalama

Captive portal'dan MAC adresini almak için:

### JavaScript (Frontend)

```javascript
// MAC adresini URL parametresinden al
const urlParams = new URLSearchParams(window.location.search);
const macAddress = urlParams.get('mac') || null;

// Veya router'dan gelen header'dan
const macAddress = req.headers['x-mac-address'] || null;
```

### Backend Middleware

```javascript
// MAC adresini request'ten al
app.use((req, res, next) => {
  const macAddress = 
    req.headers['x-mac-address'] || 
    req.query.mac || 
    req.body.mac;
  
  req.macAddress = macAddress;
  next();
});
```

## Test Senaryoları

### 1. Yerel Test

```bash
# Backend'i başlat
cd backend && npm run dev

# Frontend'i başlat
cd frontend && npm run dev

# Tarayıcıda test et
# http://localhost:3000?mac=AA:BB:CC:DD:EE:FF
```

### 2. Router Test

1. Test Wi-Fi ağına bağlanın
2. Captive portal açılmalı
3. Kayıt formunu doldurun
4. OTP'yi doğrulayın
5. İnternete erişim verilmeli

## Güvenlik Notları

1. **HTTPS Kullanın**: Production'da mutlaka SSL sertifikası kullanın
2. **API Key**: Hotspot API çağrılarında authentication kullanın
3. **Rate Limiting**: Router'dan gelen istekleri sınırlandırın
4. **MAC Spoofing**: MAC adreslerini doğrulayın (mümkünse)

## Sorun Giderme

### Kullanıcı doğrulandı ama internete erişemiyor

1. Router loglarını kontrol edin
2. MAC adresinin doğru eklendiğini doğrulayın
3. Firewall kurallarını kontrol edin
4. IP pool'unun yeterli olduğunu kontrol edin

### Captive Portal açılmıyor

1. DNS ayarlarını kontrol edin
2. Router'ın portal URL'ini doğru yönlendirdiğini kontrol edin
3. Browser cache'ini temizleyin
4. HTTPS/HTTP karışıklığını kontrol edin

## Örnek Konfigürasyon Dosyaları

Örnek konfigürasyon dosyaları `examples/` klasöründe bulunabilir.

## Destek

Sorularınız için GitHub Issues kullanabilirsiniz.

