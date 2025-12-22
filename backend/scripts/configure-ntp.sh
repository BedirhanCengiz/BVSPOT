#!/bin/bash

# NTP Yapılandırma Script'i (Linux)
# Türkiye NTP sunucularını sistem NTP yapılandırmasına ekler

echo "🕐 NTP yapılandırması başlatılıyor..."

# NTP paketini kontrol et ve kur
if ! command -v ntpd &> /dev/null && ! command -v chronyd &> /dev/null; then
    echo "NTP servisi bulunamadı. Kurulum yapılıyor..."
    
    # Ubuntu/Debian
    if command -v apt-get &> /dev/null; then
        sudo apt-get update
        sudo apt-get install -y chrony
    # CentOS/RHEL
    elif command -v yum &> /dev/null; then
        sudo yum install -y chrony
    # Arch Linux
    elif command -v pacman &> /dev/null; then
        sudo pacman -S --noconfirm chrony
    else
        echo "❌ Desteklenmeyen Linux dağıtımı. Lütfen manuel olarak NTP kurun."
        exit 1
    fi
fi

# Chrony yapılandırması (modern Linux dağıtımları)
if command -v chronyd &> /dev/null; then
    echo "📝 Chrony yapılandırılıyor..."
    
    # Yedek al
    sudo cp /etc/chrony.conf /etc/chrony.conf.backup
    
    # Türkiye NTP sunucularını ekle
    cat <<EOF | sudo tee /etc/chrony.conf > /dev/null
# Türkiye NTP Sunucuları
server 0.tr.pool.ntp.org iburst
server 1.tr.pool.ntp.org iburst
server 2.tr.pool.ntp.org iburst
server 3.tr.pool.ntp.org iburst

# Yerel saat kaynağı (fallback)
# pool 2.pool.ntp.org iburst

# Zaman kaynağı bilgilerini logla
logdir /var/log/chrony
log measurements statistics tracking

# İzin verilen ağlar (gerekirse düzenleyin)
# allow 192.168.0.0/16
EOF
    
    # Chrony'yi yeniden başlat
    sudo systemctl restart chronyd
    sudo systemctl enable chronyd
    
    echo "✅ Chrony yapılandırıldı ve başlatıldı"
    
# NTPD yapılandırması (eski sistemler)
elif command -v ntpd &> /dev/null; then
    echo "📝 NTPD yapılandırılıyor..."
    
    # Yedek al
    sudo cp /etc/ntp.conf /etc/ntp.conf.backup
    
    # Türkiye NTP sunucularını ekle
    cat <<EOF | sudo tee /etc/ntp.conf > /dev/null
# Türkiye NTP Sunucuları
server 0.tr.pool.ntp.org
server 1.tr.pool.ntp.org
server 2.tr.pool.ntp.org
server 3.tr.pool.ntp.org

# Yerel saat kaynağı (fallback)
# server 127.127.1.0
# fudge 127.127.1.0 stratum 10
EOF
    
    # NTPD'yi yeniden başlat
    sudo systemctl restart ntpd
    sudo systemctl enable ntpd
    
    echo "✅ NTPD yapılandırıldı ve başlatıldı"
fi

# Senkronizasyon durumunu kontrol et
echo ""
echo "📊 NTP senkronizasyon durumu:"
if command -v chronyd &> /dev/null; then
    chronyc sources
    chronyc tracking
elif command -v ntpd &> /dev/null; then
    ntpq -p
fi

echo ""
echo "✅ NTP yapılandırması tamamlandı!"

