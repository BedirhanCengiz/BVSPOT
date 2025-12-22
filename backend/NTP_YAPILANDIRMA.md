# NTP (Network Time Protocol) Yapılandırma Rehberi

Bu sistem Türkiye NTP sunucularını kullanarak zaman senkronizasyonu yapar.

## 🕐 NTP Sunucuları

Sistem şu Türkiye NTP sunucularını kullanır:
- `0.tr.pool.ntp.org`
- `1.tr.pool.ntp.org`
- `2.tr.pool.ntp.org`
- `3.tr.pool.ntp.org`

## 📋 Sistem Seviyesi Yapılandırma

### Linux Sistemler

**Otomatik Yapılandırma:**
```bash
cd backend
chmod +x scripts/configure-ntp.sh
sudo ./scripts/configure-ntp.sh
```

**Manuel Yapılandırma (Chrony):**
```bash
# Chrony yapılandırma dosyasını düzenle
sudo nano /etc/chrony.conf

# Şu satırları ekle:
server 0.tr.pool.ntp.org iburst
server 1.tr.pool.ntp.org iburst
server 2.tr.pool.ntp.org iburst
server 3.tr.pool.ntp.org iburst

# Chrony'yi yeniden başlat
sudo systemctl restart chronyd
sudo systemctl enable chronyd

# Durum kontrolü
chronyc sources
chronyc tracking
```

**Manuel Yapılandırma (NTPD - Eski Sistemler):**
```bash
# NTP yapılandırma dosyasını düzenle
sudo nano /etc/ntp.conf

# Şu satırları ekle:
server 0.tr.pool.ntp.org
server 1.tr.pool.ntp.org
server 2.tr.pool.ntp.org
server 3.tr.pool.ntp.org

# NTPD'yi yeniden başlat
sudo systemctl restart ntpd
sudo systemctl enable ntpd

# Durum kontrolü
ntpq -p
```

### Windows Sistemler

**PowerShell ile (Yönetici olarak):**
```powershell
cd backend
.\scripts\configure-ntp.ps1
```

**Manuel Yapılandırma:**
```powershell
# PowerShell'i Yönetici olarak açın

# NTP sunucularını ayarla
w32tm /config /manualpeerlist:"0.tr.pool.ntp.org,1.tr.pool.ntp.org,2.tr.pool.ntp.org,3.tr.pool.ntp.org" /syncfromflags:manual /reliable:yes /update

# Windows Time servisini yeniden başlat
Restart-Service w32time -Force

# Senkronizasyonu zorla
w32tm /resync /force

# Durum kontrolü
w32tm /query /status
w32tm /query /peers
```

## 🔧 Uygulama Seviyesi Yapılandırma

Backend uygulaması otomatik olarak NTP senkronizasyonu yapar:

1. **Başlangıçta**: Server başladığında NTP senkronizasyonu yapılır
2. **Periyodik**: Her saatte bir NTP offset'i güncellenir
3. **Cache**: NTP offset'i 1 saat cache'lenir (performans için)

### API Endpoint'leri

**NTP Durum Kontrolü:**
```bash
GET /api/admin/ntp-sync
Authorization: Bearer <admin_token>
```

**Manuel Senkronizasyon:**
```bash
GET /api/admin/ntp-sync?force=true
Authorization: Bearer <admin_token>
```

### Yanıt Formatı

```json
{
  "success": true,
  "synced": true,
  "offset": 125,
  "message": "Mükemmel senkronizasyon (125ms fark)"
}
```

## ⚙️ Environment Variables

NTP kullanımını kontrol etmek için (gelecekte):
```env
# NTP kullanımını etkinleştir/devre dışı bırak (varsayılan: true)
USE_NTP=true

# NTP cache süresi (ms) - varsayılan: 3600000 (1 saat)
NTP_CACHE_DURATION=3600000
```

## 🔍 Sorun Giderme

### NTP Sunucularına Erişilemiyor

1. Firewall kontrolü: UDP port 123'ün açık olduğundan emin olun
2. DNS kontrolü: NTP sunucu adreslerinin çözümlenebildiğini kontrol edin
3. Ağ bağlantısı: İnternet bağlantısını kontrol edin

### Zaman Hala Yanlış

1. Sistem seviyesi NTP yapılandırmasını kontrol edin
2. Uygulama loglarını kontrol edin: `[NTP]` ile başlayan loglar
3. Manuel senkronizasyon yapın: `/api/admin/ntp-sync?force=true`

### Log Kontrolü

Backend konsolunda şu logları görebilirsiniz:
```
[NTP] Zaman alındı: 0.tr.pool.ntp.org -> 2024-12-22T08:51:22.833Z
[NTP] Offset güncellendi: 125ms (NTP: ..., Sistem: ...)
✅ NTP senkronizasyonu: Mükemmel senkronizasyon (125ms fark)
```

## 📝 Notlar

- NTP offset'i cache'lenir, bu yüzden her zaman güncel olmayabilir
- Sistem seviyesi NTP yapılandırması önerilir (daha doğru)
- Uygulama seviyesi NTP, sistem zamanı yanlışsa düzeltir
- NTP başarısız olursa sistem zamanı kullanılır (fallback)

