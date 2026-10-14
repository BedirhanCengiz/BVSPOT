# BVSPOT kurulum

Bu rehber iki işi anlatır: uygulamayı Ubuntu sanal sunucuya kurmak ve FortiGate'i bu kayıt sayfasına bağlamak.

Uygulama sunucuda çalışır. FortiGate misafiri bu sayfaya gönderir. Kayıt bitince tarayıcı FortiGate'e geri döner ve internet açılır.

## Sanal sunucu

Ubuntu 22.04 veya 24.04, 2 vCPU, 2 GB RAM, 20 GB disk. SSH ile sunucuya bağlanın.

### İç IP ile kurulum

Alan adı henüz yoksa sunucunun kendi adresiyle kurun. `10.0.33.50` yerine `hostname -I` çıktısındaki adresi yazın. Bu kurulumda HTTPS yoktur. Site `http://` ile açılır.

```bash
git clone https://github.com/BedirhanCengiz/BVSPOT.git
cd BVSPOT
sudo bash deploy/install.sh \
  --domain 10.0.33.50 \
  --admin-email admin@bvspot.local \
  --firewall \
  --forti-hosts 10.10.10.1 \
  --forti-user bvspot \
  --forti-password 'BURAYA-FORTIGATE-MISAFIR-SIFRESI'
```

`--forti-hosts` misafir ağında FortiGate'in adresidir. `--forti-user` ve `--forti-password` birazdan FortiGate'te açacağınız yerel hesabın adı ve şifresidir. Wi-Fi şifresi bu değildir.

SSH portunuz 22 değilse `--firewall` yazmayın. Önce `ufw allow PORT/tcp` ekleyin.

Komut bitince:

- Site: `http://10.0.33.50`
- Panel: `http://10.0.33.50/admin/login`
- Giriş bilgisi: `/root/bvspot-install.txt`

Bu adres yalnızca `10.0.33.50` ağına bağlı bir bilgisayardan açılır.

### Alan adı ve HTTPS

Size ait bir alan adı gerekir. DNS A kaydı sunucunun IP'sine bakmalıdır. Kayıt yayıldıktan sonra kurun. `wifi.ornek.com` gibi örnek bir ad kullanmayın. Let's Encrypt o adı bulamaz ve kurulum sertifika adımında durur.

```bash
cd ~/BVSPOT
sudo bash deploy/install.sh \
  --domain portal.sirket.com \
  --admin-email admin@sirket.com \
  --ssl \
  --certbot-email admin@sirket.com \
  --firewall \
  --forti-hosts 10.10.10.1 \
  --forti-user bvspot \
  --forti-password 'BURAYA-FORTIGATE-MISAFIR-SIFRESI'
```

Site adresi `https://portal.sirket.com` olur.

### Kurulum ne yapar

- Node.js, Nginx, PostgreSQL, Redis ve Chrony kurar
- Arayüz ile API'yi yalnızca sunucunun içinde, `127.0.0.1` üzerinde çalıştırır
- Dışarıya 80 ve 443 açar
- Veritabanı şifresi ve JWT anahtarını üretir
- İlk admin hesabını oluşturur
- FortiGate bilgilerini `backend/.env` dosyasına yazar

İkinci çalıştırma mevcut `backend/.env` dosyasını silmez. Yeni kodu derler ve servisleri yeniden başlatır. Admin şifresi yalnızca ilk kurulumda `/root/bvspot-install.txt` içine yazılır.

### Ayakta mı

Sunucuda:

```bash
systemctl is-active bvspot-api bvspot-web nginx
curl -fsS http://127.0.0.1:3001/health
```

Üç servis `active` olmalı. Sağlık çıktısı şöyledir:

```json
{"status":"ok","database":"connected","redis":"connected"}
```

### Güncelleme

```bash
cd ~/BVSPOT
git pull
sudo bash deploy/install.sh --domain 10.0.33.50
```

Alan adı kullanıyorsanız `--domain` değerini o adla yazın. Betik alan adını `/etc/bvspot/install.env` içine kaydettiyse yalnızca `sudo bash deploy/install.sh` yeter.

### Sunucuda sık görülen duruşlar

Sertifika hatası `DNS problem: SERVFAIL` ise yazdığınız alan adı yok ya da A kaydı bu sunucuya bakmıyor. IP ile kurun veya DNS'i düzeltip yeniden çalıştırın.

`Failed to compile` derleme hatasıdır. Sunucuda `git fetch origin` ve `git reset --hard origin/main` yapıp betiği yeniden çalıştırın.

`Changing to the requested working directory failed: Permission denied` proje `/root` altındayken servisin `bvspot` kullanıcısıyla açılmaya çalışmasından olur. Güncel betik bu durumda servisi root olarak başlatır. Eski kurulumda hemen düzeltmek için:

```bash
sed -i 's/^User=.*/User=root/; s/^Group=.*/Group=root/' /etc/systemd/system/bvspot-api.service /etc/systemd/system/bvspot-web.service
systemctl daemon-reload
systemctl reset-failed bvspot-api bvspot-web
systemctl restart bvspot-api bvspot-web
curl -fsS http://127.0.0.1:3001/health
```

`Browserslist` satırları uyarıdır. Kurulumu durdurmaz.

## FortiGate

Dört ayar vardır. İsimleri kendi ağınıza göre değiştirin.

| Ne | Örnek |
| --- | --- |
| Kayıt sitesi | `10.0.33.50` veya `portal.sirket.com` |
| Sunucu IP'si | sanal sunucunun adresi |
| Misafir ağındaki FortiGate | `10.10.10.1` |
| Yerel kullanıcı | `bvspot` |
| Bu kullanıcının şifresi | kurulumdaki `--forti-password` |

### 1. Kullanıcı

**User & Authentication → User Definition → Create New → Local User**

Kullanıcı adı `bvspot`. Şifre, sunucudaki FortiGate şifresiyle aynı.

### 2. Grup

**User & Authentication → User Groups → Create New**

Ad `Guest`, tür Firewall, üye `bvspot`.

### 3. Misafir ağı kayıt sayfasına gitsin

FortiAP veya FortiWiFi kullanıyorsanız **WiFi & Switch → SSIDs** içinde misafir ağını açın.

- Security mode: Captive Portal
- Authentication portal: External
- Adres: `10.0.33.50` veya `portal.sirket.com`
- User groups: Guest

Adresin başına `http://` veya `https://` yazmayın.

Misafirler ayrı bir VLAN'daysa aynı ayar **Network → Interfaces** içindeki o arayüzdedir.

### 4. İki güvenlik duvarı kuralı

Birinci kural üstte durur. Kayıt bitmeden telefonun sayfaya ulaşmasını sağlar.

**Policy & Objects → Addresses** ile sunucu adresini ekleyin. Ad `bvspot-server`, adres sunucunun IP'si, maske `255.255.255.255`.

Birinci kural:

- Gelen: misafir arayüzü
- Giden: sunucunun durduğu arayüz. Sunucu internetteyse bu `wan` olur. Sunucu içerideyse o arayüzün adı yazılır
- Hedef: `bvspot-server`
- Servis: DNS, HTTP, HTTPS
- NAT: sunucu başka ağdaysa açık
- Exempt from Captive Portal: açık

İkinci kural internettir:

- Gelen: misafir arayüzü
- Giden: wan
- Hedef: all
- Servis: ALL
- NAT: açık
- Grup: Guest
- Captive portal muafiyeti: kapalı

İlk denemede **User & Authentication → Authentication Settings** içinde HTTPS doğrulama kapalı kalsın. Açık olursa telefon FortiGate sertifikasına takılabilir. İnternetin açık kalacağı süre bu sayfadaki Authentication timeout değeridir.

Aynı işin komut satırı karşılığı:

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

config firewall address
    edit "bvspot-server"
        set subnet 10.0.33.50 255.255.255.255
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

`dstintf` ve arayüz adları sizin cihazınızdaki isimlerle değişir. Sunucu ile misafir ağı aynı FortiGate'in iki arayüzüyse `wan` yerine sunucunun bağlı olduğu arayüzü yazın.

Kök firewall ile sunucunun firewall'u arasında PBR gerekmez. Misafir telefondan kayıt sitesine giden normal yol yeterlidir. Sunucu içerideyse mevcut omurga rotası veya site-to-site VPN bu yolu sağlar. PBR yalnızca bu trafiğin varsayılan çıkıştan başka bir hattan gitmesi gerektiğinde kullanılır.

Kayıt bitince telefon `10.10.10.1:1000` adresine, yani kendi FortiGate'ine döner. Bu paket sunucunun firewall'una gitmez.

### Sunucu ile FortiGate aynı olmalı

`backend/.env`:

```env
FORTI_ENABLED=true
FORTI_ALLOWED_HOSTS=10.10.10.1
FORTI_LOCAL_USER=bvspot
FORTI_LOCAL_PASSWORD=BURAYA-FORTIGATE-MISAFIR-SIFRESI
```

`10.10.10.1` misafir ağındaki FortiGate adresidir. Sunucunun IP'si buraya yazılmaz. Değişiklikten sonra:

```bash
sudo systemctl restart bvspot-api
```

### Deneme

Telefonda misafir ağa bağlanın ve bir site açın. Adres çubuğu kayıt sitesiyle başlamalı ve `magic` ile `usermac` içermelidir. Kayıt olup giriş yapınca internet açılır.

Sayfa açılmıyorsa birinci kural eksiktir veya sunucu IP'si yanlıştır. Sayfa açılıp internet açılmıyorsa kullanıcı adı, şifre veya `10.10.10.1` eşleşmiyordur. `magic` bir kez kullanılır. Dönüş olmazsa telefonda yeni bir site açıp yönlendirmeyi tazelemek gerekir.

### Log

Giriş anında BVSPOT şunları yazar: kimlik, saat, MAC (`usermac`), misafir IP'si (`userip`), sunucunun gördüğü dış IP ve KVKK onayı. Kayıt paneldeki log ekranındadır.

İnternet açıldıktan sonra gidilen siteler ve kullanılan veri BVSPOT'a kendiliğinden düşmez. Onlar FortiGate trafik logunda kalır.
