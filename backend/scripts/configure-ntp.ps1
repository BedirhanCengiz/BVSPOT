# NTP Yapılandırma Script'i (Windows PowerShell)
# Türkiye NTP sunucularını Windows NTP yapılandırmasına ekler

Write-Host "🕐 NTP yapılandırması başlatılıyor..." -ForegroundColor Cyan

# Yönetici yetkisi kontrolü
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "❌ Bu script yönetici yetkisi gerektirir!" -ForegroundColor Red
    Write-Host "Lütfen PowerShell'i 'Yönetici olarak çalıştır' ile açın." -ForegroundColor Yellow
    exit 1
}

# Mevcut NTP sunucularını göster
Write-Host "`n📋 Mevcut NTP sunucuları:" -ForegroundColor Yellow
w32tm /query /peers

# Türkiye NTP sunucularını ekle
Write-Host "`n📝 Türkiye NTP sunucuları ekleniyor..." -ForegroundColor Cyan

$ntpServers = @(
    "0.tr.pool.ntp.org",
    "1.tr.pool.ntp.org",
    "2.tr.pool.ntp.org",
    "3.tr.pool.ntp.org"
)

foreach ($server in $ntpServers) {
    Write-Host "  - $server ekleniyor..." -ForegroundColor Gray
    w32tm /config /manualpeerlist:"$server" /syncfromflags:manual /reliable:yes /update
}

# Windows Time servisini yeniden başlat
Write-Host "`n🔄 Windows Time servisi yeniden başlatılıyor..." -ForegroundColor Cyan
Restart-Service w32time -Force

# NTP senkronizasyonunu zorla
Write-Host "`n🕐 NTP senkronizasyonu başlatılıyor..." -ForegroundColor Cyan
w32tm /resync /force

# Durum kontrolü
Write-Host "`n📊 NTP durumu:" -ForegroundColor Yellow
w32tm /query /status
w32tm /query /peers

Write-Host "`n✅ NTP yapılandırması tamamlandı!" -ForegroundColor Green
Write-Host "`nNot: Sistem zamanının senkronize olması birkaç dakika sürebilir." -ForegroundColor Yellow

