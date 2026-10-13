# BVSPOT — Sanal sunucuya kurulum ve FortiGate bağlantısı

Bu rehber, projeyi bir Ubuntu sanal sunucuda tek komutla ayağa kaldırır ve misafir Wi-Fi kaydını FortiGate captive portalına bağlar.

Uygulama üç parçadır: Next.js arayüz (port 3000), Express API (port 3001), PostgreSQL ve Redis. Kurulum betiği bunları yalnızca `127.0.0.1` üzerinde çalıştırır. Dışarıya Nginx üzerinden 80/443 açılır.

## Sunucu

- Ubuntu 22.04 veya 24.04, 2 vCPU, 2 GB RAM, 20 GB disk
- Alan adının A kaydı sunucunun IP adresine bakmalı (`wifi.ornek.com`)
- Misafir ağı, kayıt bitmeden bu alan adına 80 ve 443 üzerinden ulaşabilmeli

Geliştirme kurulumu için [KURULUM_REHBERI.md](./KURULUM_REHBERI.md) yeterlidir. Bu dosya canlı sunucu içindir.

## Tek komut

Sunucuda depoyu alın, sonra kök dizinde:

```bash
sudo bash deploy/install.sh \
  --domain wifi.ornek.com \
  --admin-email admin@ornek.com \
  --ssl \
  --certbot-email admin@ornek.com \
  --firewall \
  --forti-hosts 10.10.10.1 \
  --forti-user bvspot \
  --forti-password 'BURAYA-FORTIGATE-MISAFIR-SIFRESI'
```

`--forti-hosts` FortiGate'in misafir VLAN'da görünen adresidir. Birden fazla cihaz varsa virgülle yazın: `10.10.10.1,10.20.20.1`. `--forti-user` ve `--forti-password`, FortiGate üzerinde oluşturacağınız yerel misafir hesabıyla aynı olmalıdır. Bu hesap yalnızca Guest grubunda durur; FortiGate yönetici şifresi değildir.

FortiGate henüz hazır değilse o üç bayrağı vermeyin. Portal yine açılır. Bağlantıyı sonra `backend/.env` içinden açabilirsiniz.

SSH portunuz 22 değilse `--firewall` kullanmayın. Önce `ufw allow PORT/tcp` ekleyin.

İlk admin e-posta ve şifresi `/root/bvspot-install.txt` dosyasına yazılır. Panel: `https://wifi.ornek.com/admin/login`

Betik bittikten sonra kontrol:

```bash
curl -fsS https://wifi.ornek.com/health
```

Beklenen gövde: `{"status":"ok","database":"connected","redis":"connected"}`

## Betiğin yaptıkları

- Node.js 20, Nginx, PostgreSQL, Redis ve Chrony (Türkiye NTP havuzu)
- `bvspot` veritabanı kullanıcısı ve `bvspot_db`
- `backend/.env` (JWT, veritabanı şifresi, FortiGate alanları)
- Üretim derlemesi ve iki systemd servisi: `bvspot-api`, `bvspot-web`
- Nginx: `/` arayüze, `/api/` ve `/health` API'ye
- `--ssl` ile Let's Encrypt
- 2 GB altı RAM'de derlemenin düşmemesi için takas dosyası

İkinci çalıştırma mevcut `backend/.env` dosyasını korur, kodu yeniden derler ve servisleri yeniden başlatır. Alan adı `/etc/bvspot/install.env` içinden okunur:

```bash
cd /path/BVSPOT
git pull
sudo bash deploy/install.sh
```

Ortam dosyasını sıfırdan üretmek `--force` ile yapılır. Bu, veritabanı şifresini ve JWT anahtarını değiştirir. Tablolardaki admin satırı olduğu gibi kalır; panel şifresi ancak ilk kurulumda oluşturulan hesaba aittir.

## Misafir akışı

1. Telefon misafir SSID'ye bağlanır.
2. FortiGate tarayıcıyı portala yönlendirir. Adreste `magic`, `post`, `usermac`, `userip` ve `ssid` vardır.
3. Misafir kayıt olur, ardından belirlediği şifreyle giriş yapar.
4. Başarı ekranı, giriş token'ı ile API'den FortiGate formunu ister ve tarayıcıyı `post` adresine (`http://FORTI:1000/fgtauth` veya `https://FORTI:1003/fgtauth`) gönderir.
5. FortiGate `magic` ile oturumu tanır, yerel `bvspot` kullanıcısını doğrular ve interneti açar.

`magic` tek kullanımlıktır. Dönüş başarısız olursa misafir yeni bir site açmalı; FortiGate yeni bir yönlendirme üretir.

Portal, FortiGate'in gönderdiği `usermac` değerini MAC olarak, `userip` değerini iç IP olarak kaydeder. 5651 oturum kaydı giriş anında yazılır.

İnternetin ne kadar açık kalacağı FortiGate kimlik doğrulama zaman aşısıdır. BVSPOT'taki oturum süresi bu erişimi FortiGate üzerinde kendiliğinden kesmez.

```bash
config user setting
    set auth-timeout 480
end
```

`480` dakika örnektir. Süre işletmenin kuralına göre değişir.

## FortiGate

Aşağıdaki komutlar FortiOS 7.2 ve 7.4 için tipiktir. Alan adı sürüme göre değişirse aynı ayarı arayüzden girin: SSID veya arayüzde Captive Portal, kimlik doğrulama portalı External, adres `wifi.ornek.com` (şema yazılmadan).

### Yerel kullanıcı ve grup

Şifre, kurulum komutundaki `--forti-password` ile aynı olmalıdır.

```bash
config user local
    edit "bvspot"
        set type password
        set passwd BURAYA-FORTIGATE-MISAFIR-SIFRESI
    next
end

config user group
    edit "Guest"
        set member "bvspot"
    next
end
```

### Kablosuz SSID

```bash
config wireless-controller vap
    edit "guest"
        set ssid "Misafir"
        set security wpa2-only-personal
        set passphrase "WIFI-SIFRESI"
        set captive-portal enable
        set external-web "wifi.ornek.com"
        set selected-usergroups "Guest"
    next
end
```

### Kablolu misafir VLAN'ı

```bash
config system interface
    edit "guest"
        set security-mode captive-portal
        set security-external-web "wifi.ornek.com"
        set security-groups "Guest"
    next
end
```

### Portal sunucusuna kayıt bitmeden izin

Bu kural, kimlik doğrulaması isteyen internet kuralının üstünde durmalıdır. `bvspot-server` adres nesnesi sanal sunucunun IP'sidir. Bu satır olmazsa telefon portalı hiç açamaz.

```bash
config firewall address
    edit "bvspot-server"
        set subnet 203.0.113.10 255.255.255.255
    next
end

config firewall policy
    edit 0
        set name "bvspot-portal"
        set srcintf "guest"
        set dstintf "wan"
        set srcaddr "all"
        set dstaddr "bvspot-server"
        set action accept
        set schedule "always"
        set service "DNS" "HTTP" "HTTPS"
        set nat enable
        set captive-portal-exempt enable
    next
end
```

İnternet kuralı Guest grubuna izin verir ve muafiyet taşımaz:

```bash
config firewall policy
    edit 0
        set name "guest-internet"
        set srcintf "guest"
        set dstintf "wan"
        set srcaddr "all"
        set dstaddr "all"
        set action accept
        set schedule "always"
        set service "ALL"
        set nat enable
        set groups "Guest"
    next
end
```

`post` adresi FortiGate'in kendi 1000 (HTTP) veya 1003 (HTTPS) portudur. Misafir bu porta zaten FortiGate üzerinden gider; sanal sunucuda bu portlar açılmaz.

HTTPS doğrulama için:

```bash
config user setting
    set auth-secure-http enable
end
```

Bu açıkken dönüş adresi `https://10.10.10.1:1003/fgtauth` olur. `FORTI_ALLOWED_HOSTS` yine `10.10.10.1` olarak kalır.

### Eşleştirme

| FortiGate | BVSPOT `backend/.env` |
| --- | --- |
| `external-web` alan adı | Nginx `server_name` ve `FRONTEND_URL` |
| Yerel kullanıcı adı | `FORTI_LOCAL_USER` |
| Yerel kullanıcı şifresi | `FORTI_LOCAL_PASSWORD` |
| FortiGate IP'si | `FORTI_ALLOWED_HOSTS` |
| Guest grubu | SSID veya arayüzdeki security group |

`FORTI_ENABLED=true` iken API, dönüş adresinin bu IP listesinde olmasını ve yolun `fgtauth` içermesini şart koşar. Liste dışındaki adrese parola verilmez.

Değişiklikten sonra:

```bash
sudo systemctl restart bvspot-api
```

Arayüzü yeniden derlemeye gerek yoktur. FortiGate parolası tarayıcı paketine gömülmez; giriş başarılı olduktan sonra API yanıtıyla yalnızca o oturuma verilir.

## SMS

Varsayılan sağlayıcı `test`tir. OTP kullanılan akışta kod API günlüğüne düşer:

```bash
journalctl -u bvspot-api -f
```

NetGSM için `backend/.env`:

```env
SMS_PROVIDER=netgsm
NETGSM_USERNAME=kullanici
NETGSM_PASSWORD=sifre
NETGSM_MSGHEADER=BASLIK
```

Ardından `sudo systemctl restart bvspot-api`.

Güncel portalda misafir kayıt olur ve kendi şifresiyle giriş yapar. SMS, OTP uçları çağrıldığında kullanılır.

## Servisler

```bash
sudo systemctl status bvspot-api bvspot-web nginx postgresql redis-server
sudo journalctl -u bvspot-api -n 100 --no-pager
sudo nginx -t && sudo systemctl reload nginx
```

API ve web yalnızca yerelden dinler. PostgreSQL ve Redis de öyle kalmalıdır. Dışarı açılan kapılar 22, 80 ve 443'tür.

Zaman, 5651 kayıtları için Chrony ile `*.tr.pool.ntp.org` üzerinden senkron tutulur. Kontrol: `chronyc tracking`

## Sorun giderme

**`/health` hata veriyor.** `journalctl -u bvspot-api -n 80 --no-pager` çıktısında veritabanı veya Redis satırına bakın. `sudo systemctl status postgresql redis-server`

**Portal açılmıyor, FortiGate döngüde.** Muafiyet kuralı yoksa veya portalın IP'si yanlışsa telefon sayfaya ulaşamaz. Misafir VLAN'dan `curl -I https://wifi.ornek.com` deneyin.

**Kayıt oluyor, internet açılmıyor.** Tarayıcı adresinde `magic` ve `post` var mı bakın. FortiGate yerel kullanıcısı, grup üyeliği ve `backend/.env` şifresi aynı olmalı. `FORTI_ALLOWED_HOSTS`, `post` adresindeki IP ile aynı olmalı. `magic` bir kez kullanılır.

**iPhone penceresi kapanıyor.** Harici portal adresi sertifikadaki alan adıyla aynı olmalı. Sayfa başka bir ada 301 atmamalı.

**Admin şifresi unutuldu.** `/root/bvspot-install.txt` ilk kurulumdaki şifredir. Veritabanında kullanıcı zaten varsa `.env` içindeki `ADMIN_PASSWORD` satırını değiştirmek paneli güncellemez.

**Derleme bellekten düşüyor.** Betik 2 GB altı makinelerde takas açar. Elle: `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`
