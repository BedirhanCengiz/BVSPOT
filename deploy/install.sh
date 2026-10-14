#!/usr/bin/env bash
# Vintra canlı kurulum — Ubuntu/Debian sanal sunucu
# Kullanım: sudo bash deploy/install.sh --domain wifi.ornek.com --ssl --certbot-email admin@ornek.com
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="/etc/bvspot"
STATE_FILE="${STATE_DIR}/install.env"
NOTES_FILE="/root/bvspot-install.txt"

DOMAIN=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""
SSL=0
CERTBOT_EMAIL=""
FORTI_HOSTS=""
FORTI_USER=""
FORTI_PASSWORD=""
SMS_PROVIDER="test"
FORCE=0
FIREWALL=0

usage() {
  cat <<'EOF'
Vintra canlı kurulum

  sudo bash deploy/install.sh --domain wifi.ornek.com --ssl --certbot-email admin@ornek.com

Seçenekler:
  --domain AD          Portal alan adı (ilk kurulumda zorunlu)
  --admin-email ADRES  İlk admin e-postası
  --admin-password SIF İlk admin şifresi (verilmezse üretilir)
  --ssl                Let's Encrypt sertifikası alır
  --certbot-email ADRES  Sertifika hesabı ( --ssl ile zorunlu )
  --forti-hosts IP     FortiGate adresleri, virgülle (ör. 10.10.10.1)
  --forti-user AD      FortiGate yerel misafir kullanıcısı
  --forti-password SIF Bu kullanıcının şifresi
  --sms-provider AD    test (varsayılan) veya netgsm
  --firewall           UFW ile SSH, 80 ve 443 dışında gelen trafiği kapatır
  --force              backend/.env dosyasını yeniden üretir
  -h, --help           Bu metin
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --admin-email) ADMIN_EMAIL="${2:-}"; shift 2 ;;
    --admin-password) ADMIN_PASSWORD="${2:-}"; shift 2 ;;
    --ssl) SSL=1; shift ;;
    --certbot-email) CERTBOT_EMAIL="${2:-}"; shift 2 ;;
    --forti-hosts) FORTI_HOSTS="${2:-}"; shift 2 ;;
    --forti-user) FORTI_USER="${2:-}"; shift 2 ;;
    --forti-password) FORTI_PASSWORD="${2:-}"; shift 2 ;;
    --sms-provider) SMS_PROVIDER="${2:-}"; shift 2 ;;
    --firewall) FIREWALL=1; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Bilinmeyen argüman: $1"; usage; exit 1 ;;
  esac
done

if [[ "$(id -u)" -ne 0 ]]; then
  echo "Bu betik root olarak çalışmalı: sudo bash deploy/install.sh ..."
  exit 1
fi

if [[ ! -f /etc/debian_version ]]; then
  echo "Bu betik Debian veya Ubuntu içindir."
  exit 1
fi

if [[ -z "$DOMAIN" && -f "$STATE_FILE" ]]; then
  DOMAIN="$(grep -E '^DOMAIN=' "$STATE_FILE" | head -n1 | cut -d= -f2- || true)"
fi

if [[ -z "$DOMAIN" ]]; then
  echo "Alan adı gerekli. Örnek: --domain wifi.ornek.com"
  usage
  exit 1
fi

if [[ "$DOMAIN" != "_" ]] && ! [[ "$DOMAIN" =~ ^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$ ]]; then
  echo "Geçersiz alan adı: $DOMAIN"
  exit 1
fi

if [[ "$SSL" == "1" && -z "$CERTBOT_EMAIL" ]]; then
  echo "--ssl için --certbot-email gerekli."
  exit 1
fi

if [[ -n "$FORTI_HOSTS" ]]; then
  if [[ -z "$FORTI_USER" || -z "$FORTI_PASSWORD" ]]; then
    echo "--forti-hosts ile birlikte --forti-user ve --forti-password verin."
    exit 1
  fi
fi

case "$SMS_PROVIDER" in
  test|netgsm|twilio|turkcell|turktelekom) ;;
  *) echo "Geçersiz SMS sağlayıcı: $SMS_PROVIDER"; exit 1 ;;
esac

echo "==> Paketler kuruluyor"
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg nginx postgresql postgresql-contrib redis-server chrony ufw

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]]; then
  echo "==> Node.js 20 kuruluyor"
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

MEM_MB="$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)"
if [[ "$MEM_MB" -lt 1800 && ! -f /swapfile ]]; then
  echo "==> RAM ${MEM_MB} MB. Derleme için 2 GB takas alanı ekleniyor"
  fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if [[ ! -f /etc/chrony/sources.d/bvspot-tr.sources ]]; then
  mkdir -p /etc/chrony/sources.d
  cat > /etc/chrony/sources.d/bvspot-tr.sources <<'EOF'
server 0.tr.pool.ntp.org iburst
server 1.tr.pool.ntp.org iburst
server 2.tr.pool.ntp.org iburst
server 3.tr.pool.ntp.org iburst
EOF
fi
if [[ -f /etc/chrony/chrony.conf ]] && ! grep -q 'tr.pool.ntp.org' /etc/chrony/chrony.conf && ! grep -q 'sourcedir /etc/chrony/sources.d' /etc/chrony/chrony.conf; then
  printf '\nserver 0.tr.pool.ntp.org iburst\nserver 1.tr.pool.ntp.org iburst\nserver 2.tr.pool.ntp.org iburst\nserver 3.tr.pool.ntp.org iburst\n' >> /etc/chrony/chrony.conf
fi
systemctl enable --now chrony nginx postgresql redis-server
systemctl restart chrony

if [[ -n "${SUDO_USER:-}" && "${SUDO_USER}" != "root" ]]; then
  APP_USER="$SUDO_USER"
else
  APP_USER="bvspot"
  if ! id "$APP_USER" >/dev/null 2>&1; then
    useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
  fi
fi

# /root 700 olduğu için bvspot kullanıcısı /root/BVSPOT içine giremez.
if ! su -s /bin/bash "$APP_USER" -c "test -x '$ROOT'"; then
  echo "==> $APP_USER bu klasöre giremiyor. Servisler root olarak çalışacak."
  APP_USER="root"
fi

install -d -m 755 /var/www/html
install -d -o "$APP_USER" -g "$APP_USER" -m 750 "$ROOT/backend/logs" "$ROOT/backend/uploads/ssids"

env_quote() {
  local v="$1"
  v="${v//\\/\\\\}"
  v="${v//\"/\\\"}"
  v="${v//$'\n'/}"
  printf '"%s"' "$v"
}

write_proxy_snippet() {
  cat > /etc/nginx/snippets/bvspot-proxy.conf <<'EOF'
client_max_body_size 15m;

location /.well-known/acme-challenge/ {
    root /var/www/html;
}

location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /health {
    proxy_pass http://127.0.0.1:3001/health;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
EOF
}

write_nginx() {
  local mode="$1"
  local conf="/etc/nginx/sites-available/bvspot"
  if [[ "$mode" == "ssl" ]]; then
    cat > "$conf" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 301 https://\$host\$request_uri; }
}

server {
    listen 443 ssl;
    server_name ${DOMAIN};
    ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    include snippets/bvspot-proxy.conf;
}
EOF
  else
    cat > "$conf" <<EOF
server {
    listen 80;
    server_name ${DOMAIN};
    include snippets/bvspot-proxy.conf;
}
EOF
  fi
  ln -sfn /etc/nginx/sites-available/bvspot /etc/nginx/sites-enabled/bvspot
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl reload nginx
}

CERT_READY=0
if [[ "$DOMAIN" != "_" && -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]]; then
  CERT_READY=1
fi

write_proxy_snippet
if [[ "$SSL" == "1" && "$CERT_READY" == "0" ]]; then
  echo "==> Sertifika için geçici HTTP sitesi açılıyor"
  write_nginx http
  apt-get install -y certbot
  certbot certonly --webroot -w /var/www/html -d "$DOMAIN" \
    --non-interactive --agree-tos -m "$CERTBOT_EMAIL"
  CERT_READY=1
fi

if [[ "$CERT_READY" == "1" ]]; then
  PUBLIC_URL="https://${DOMAIN}"
else
  if [[ "$DOMAIN" == "_" ]]; then
    PUBLIC_URL="http://$(hostname -I | awk '{print $1}')"
  else
    PUBLIC_URL="http://${DOMAIN}"
  fi
fi

if [[ -z "$ADMIN_EMAIL" ]]; then
  if [[ "$DOMAIN" == "_" ]]; then
    ADMIN_EMAIL="admin@bvspot.local"
  else
    ADMIN_EMAIL="admin@${DOMAIN}"
  fi
fi

CREATED_NOTES=0
if [[ ! -f "$ROOT/backend/.env" || "$FORCE" == "1" ]]; then
  echo "==> Ortam dosyası yazılıyor"
  if [[ -z "$ADMIN_PASSWORD" ]]; then
    ADMIN_PASSWORD="Aa1!$(openssl rand -hex 8)"
  fi
  DB_PASSWORD="$(openssl rand -hex 24)"
  JWT_SECRET="$(openssl rand -hex 32)"

  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='bvspot'" | grep -q 1; then
    sudo -u postgres psql -c "ALTER ROLE bvspot WITH LOGIN PASSWORD '${DB_PASSWORD}'"
  else
    sudo -u postgres psql -c "CREATE ROLE bvspot LOGIN PASSWORD '${DB_PASSWORD}'"
  fi
  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='bvspot_db'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE DATABASE bvspot_db OWNER bvspot"
  fi
  sudo -u postgres psql -d bvspot_db -c "GRANT ALL PRIVILEGES ON DATABASE bvspot_db TO bvspot"
  sudo -u postgres psql -d bvspot_db -c "GRANT ALL ON SCHEMA public TO bvspot"

  FORTI_ENABLED=false
  if [[ -n "$FORTI_HOSTS" ]]; then
    FORTI_ENABLED=true
  fi

  cat > "$ROOT/backend/.env" <<EOF
PORT=3001
HOST=127.0.0.1
NODE_ENV=production
TRUST_PROXY=true
FRONTEND_URL=${PUBLIC_URL}
SUCCESS_REDIRECT_URL=https://www.google.com

DB_HOST=127.0.0.1
DB_PORT=5432
DB_NAME=bvspot_db
DB_USER=bvspot
DB_PASSWORD=${DB_PASSWORD}

REDIS_HOST=127.0.0.1
REDIS_PORT=6379

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=12h

ADMIN_EMAIL=$(env_quote "$ADMIN_EMAIL")
ADMIN_PASSWORD=$(env_quote "$ADMIN_PASSWORD")

SMS_PROVIDER=${SMS_PROVIDER}
NETGSM_USERNAME=
NETGSM_PASSWORD=
NETGSM_MSGHEADER=VINTRA

FORTI_ENABLED=${FORTI_ENABLED}
FORTI_ALLOWED_HOSTS=$(env_quote "$FORTI_HOSTS")
FORTI_LOCAL_USER=$(env_quote "$FORTI_USER")
FORTI_LOCAL_PASSWORD=$(env_quote "$FORTI_PASSWORD")
GATEWAY_ID=$(env_quote "${FORTI_HOSTS%%,*}")
FIREWALL_ID=fortigate
EOF
  chown "$APP_USER:$APP_USER" "$ROOT/backend/.env"
  chmod 600 "$ROOT/backend/.env"

  umask 077
  cat > "$NOTES_FILE" <<EOF
Vintra kurulum notu
Portal: ${PUBLIC_URL}
Admin: ${PUBLIC_URL}/admin/login
E-posta: ${ADMIN_EMAIL}
Şifre: ${ADMIN_PASSWORD}
Veritabanı kullanıcısı: bvspot
Veritabanı şifresi: ${DB_PASSWORD}
FortiGate yerel kullanıcı: ${FORTI_USER:-'(kapalı)'}
EOF
  chmod 600 "$NOTES_FILE"
  CREATED_NOTES=1
  echo "NEXT_PUBLIC_API_URL=${PUBLIC_URL}" > "$ROOT/frontend/.env.production.local"
else
  echo "==> Mevcut backend/.env korunuyor (--force ile yenilenir)"
  if [[ ! -f "$ROOT/frontend/.env.production.local" ]]; then
    echo "NEXT_PUBLIC_API_URL=${PUBLIC_URL}" > "$ROOT/frontend/.env.production.local"
  fi
fi

echo "==> Uygulama derleniyor"
if [[ -f "$ROOT/frontend/.env.production.local" ]]; then
  current_api="$(grep -E '^NEXT_PUBLIC_API_URL=' "$ROOT/frontend/.env.production.local" | head -n1 | cut -d= -f2- || true)"
  if [[ "$current_api" != "$PUBLIC_URL" ]]; then
    echo "NEXT_PUBLIC_API_URL=${PUBLIC_URL}" > "$ROOT/frontend/.env.production.local"
    if [[ -f "$ROOT/backend/.env" ]]; then
      sed -i "s|^FRONTEND_URL=.*|FRONTEND_URL=${PUBLIC_URL}|" "$ROOT/backend/.env"
    fi
  fi
fi
cd "$ROOT"
npm install
npm run build --prefix frontend

NODE_BIN="$(command -v node)"
NPM_BIN="$(command -v npm)"

cat > /etc/systemd/system/bvspot-api.service <<EOF
[Unit]
Description=Vintra API
After=network-online.target postgresql.service redis-server.service
Wants=network-online.target postgresql.service redis-server.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${ROOT}/backend
EnvironmentFile=${ROOT}/backend/.env
ExecStart=${NODE_BIN} src/server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

cat > /etc/systemd/system/bvspot-web.service <<EOF
[Unit]
Description=Vintra Web
After=network-online.target bvspot-api.service
Wants=bvspot-api.service

[Service]
Type=simple
User=${APP_USER}
Group=${APP_USER}
WorkingDirectory=${ROOT}/frontend
Environment=NODE_ENV=production
ExecStart=${NPM_BIN} run start -- -H 127.0.0.1 -p 3000
Restart=on-failure
RestartSec=5
NoNewPrivileges=true

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable bvspot-api bvspot-web
systemctl restart bvspot-api
systemctl restart bvspot-web

if [[ "$CERT_READY" == "1" ]]; then
  write_nginx ssl
else
  write_nginx http
fi

echo "==> Servisler bekleniyor"
ready=0
for _ in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:3001/health" >/dev/null && curl -fsS -o /dev/null "http://127.0.0.1:3000/"; then
    ready=1
    break
  fi
  sleep 2
done

if [[ "$ready" != "1" ]]; then
  echo "Servisler ayağa kalkmadı. Son API kayıtları:"
  journalctl -u bvspot-api -n 60 --no-pager || true
  journalctl -u bvspot-web -n 40 --no-pager || true
  exit 1
fi

install -d -m 755 "$STATE_DIR"
cat > "$STATE_FILE" <<EOF
DOMAIN=${DOMAIN}
PUBLIC_URL=${PUBLIC_URL}
EOF
chmod 644 "$STATE_FILE"

if [[ "$FIREWALL" == "1" ]]; then
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
fi

echo
echo "Vintra ayakta: ${PUBLIC_URL}"
echo "Admin panel: ${PUBLIC_URL}/admin/login"
echo "Sağlık: ${PUBLIC_URL}/health"
if [[ "$CREATED_NOTES" == "1" ]]; then
  echo "İlk admin bilgisi: ${NOTES_FILE}"
else
  echo "Admin şifresi ilk kurulumda ${NOTES_FILE} dosyasına yazıldı."
fi
if [[ "$SSL" == "1" && "$CERT_READY" == "1" ]]; then
  echo "Sertifika yenileme certbot zamanlayıcısı ile yapılır."
fi
echo "FortiGate adımları: ${ROOT}/CANLI_KURULUM.md"
