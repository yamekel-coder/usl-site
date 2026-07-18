#!/bin/bash
# ============================================================
#  USL VDS auto-setup script
#  Run as root on a fresh Ubuntu/Debian VDS:
#     bash <(curl -fsSL https://raw.githubusercontent.com/yamekel-coder/usl-site/main/deploy/setup-vds.sh)
#  or:  curl -fsSL ... -o setup.sh && bash setup.sh
# ============================================================
set -euo pipefail

REPO="https://github.com/yamekel-coder/usl-site.git"
APP_DIR="/opt/usl"
APP_USER="usl"
PORT=3000

echo "=== [1/9] Detect OS & install packages ==="
if ! command -v apt-get >/dev/null 2>&1; then
  echo "This script supports Debian/Ubuntu only. Aborting."
  exit 1
fi
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git nginx sqlite3 \
  build-essential ca-certificates gnupg

# Node.js 20 LTS (NodeSource)
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt 18 ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v)  npm: $(npm -v)"

echo "=== [2/9] Create app user & dir ==="
id "$APP_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$APP_USER"
mkdir -p "$APP_DIR" /var/backups/usl
chown -R "$APP_USER:$APP_USER" "$APP_DIR" /var/backups/usl

echo "=== [3/9] Clone repo & install deps ==="
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git clone "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"
sudo -u "$APP_USER" npm install --omit=dev
sudo -u "$APP_USER" npm run build:css

echo "=== [4/9] Generate secrets ==="
SESSION_SECRET=$(openssl rand -hex 32)
CAPTCHA_SECRET=$(openssl rand -hex 32)
echo "Generated SESSION_SECRET and CAPTCHA_SECRET"

echo "=== [5/9] Write .env ==="
cat > "$APP_DIR/.env" <<EOF
NODE_ENV=production
PORT=$PORT
SESSION_SECRET=$SESSION_SECRET
CAPTCHA_SECRET=$CAPTCHA_SECRET
# Set to true AFTER you enable HTTPS (certbot) so cookies become secure.
COOKIE_SECURE=false
EOF
chown "$APP_USER:$APP_USER" "$APP_DIR/.env"

echo "=== [6/9] Install systemd service ==="
cat > /etc/systemd/system/usl.service <<EOF
[Unit]
Description=USL Site (Ultimate Shitty List)
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$APP_DIR/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable --now usl
sleep 3
systemctl is-active usl && echo "usl service: ACTIVE" || { echo "usl service FAILED"; journalctl -u usl -n 30; exit 1; }

echo "=== [7/9] Configure nginx (port 80, no port in URL) ==="
cat > /etc/nginx/sites-available/usl <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;
    client_max_body_size 10m;
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/usl /etc/nginx/sites-enabled/usl
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx

echo "=== [8/9] Setup 30-min backups with rotation ==="
cp "$APP_DIR/deploy/backup.sh" "$APP_DIR/backup.sh"
chmod +x "$APP_DIR/backup.sh"
chown "$APP_USER:$APP_USER" "$APP_DIR/backup.sh"
# install cron job for the app user
CRON_LINE="*/30 * * * * $APP_DIR/backup.sh >> $APP_DIR/backups/cron.log 2>&1"
( crontab -u "$APP_USER" -l 2>/dev/null | grep -v "backup.sh"; echo "$CRON_LINE" ) | crontab -u "$APP_USER" -
mkdir -p "$APP_DIR/backups"
chown "$APP_USER:$APP_USER" "$APP_DIR/backups"
echo "Backup cron installed."

echo "=== [9/9] Verify ==="
sleep 2
if curl -fsS "http://127.0.0.1:$PORT" >/dev/null; then
  echo "OK: app responds on :$PORT"
else
  echo "WARN: app did not respond on :$PORT — check 'journalctl -u usl'"
fi
echo "Visit http://$(curl -fsS icanhazip.com 2>/dev/null || echo YOUR_SERVER_IP) (no port needed)"
echo ""
echo "Secrets saved in $APP_DIR/.env — keep them safe."
echo "To update later:"
echo "   sudo -u $APP_USER git -C $APP_DIR pull && sudo -u $APP_USER npm install --omit=dev && sudo -u $APP_USER npm run build:css && systemctl restart usl"
echo "To enable HTTPS later: apt install -y certbot python3-certbot-nginx && certbot --nginx"
