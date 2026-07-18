# Deploy USL on a VDS

## 1. Connect via SSH
```bash
ssh root@YOUR_SERVER_IP
```

## 2. Install dependencies (Ubuntu/Debian)
```bash
apt update
apt install -y nodejs npm git sqlite3
# If node is old (<18), install via NodeSource:
# curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs
node -v   # should be >= 18
npm -v
```

## 3. Create app user & directory
```bash
useradd -m -s /bin/bash usl
mkdir -p /opt/usl
chown -R usl:usl /opt/usl
```

## 4. Clone the repo
```bash
sudo -u usl git clone https://github.com/yamekel-coder/usl-site.git /opt/usl
cd /opt/usl
sudo -u usl npm install --omit=dev   # installs only deps (tailwind etc already in deps)
sudo -u usl npm run build:css
```

## 5. Configure environment
Either use the systemd unit (secrets are set there) OR create `/opt/usl/.env`:
```
NODE_ENV=production
PORT=3000
CAPTCHA_SECRET=some-random-string
SESSION_SECRET=another-random-string
```
server.js auto-loads `.env` via dotenv. If using systemd, the unit already exports
these vars, so `.env` is optional.

## 6. Install as a systemd service
```bash
cp /opt/usl/deploy/usl.service /etc/systemd/system/usl.service
# edit secrets in the file:
nano /etc/systemd/system/usl.service
systemctl daemon-reload
systemctl enable usl
systemctl start usl
systemctl status usl   # should show "active (running)"
```
Site is now on http://YOUR_SERVER_IP:3000

## 7. Setup backups (every 30 min, keep last 48)
```bash
cp /opt/usl/deploy/backup.sh /opt/usl/backup.sh
chmod +x /opt/usl/backup.sh
chown usl:usl /opt/usl/backup.sh
crontab -u usl -e
# add this line:
*/30 * * * * /opt/usl/backup.sh >> /opt/usl/backups/cron.log 2>&1
```
Backups land in `/opt/usl/backups/usl_YYYYMMDD_HHMMSS/` (db + uploads), old ones auto-deleted.

## 8. (Optional) Nginx + domain
```bash
apt install -y nginx
```
Config `/etc/nginx/sites-available/usl`:
```
server {
    listen 80;
    server_name yourdomain.com;
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
```bash
ln -s /etc/nginx/sites-available/usl /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## Updating the site later
```bash
sudo -u usl git -C /opt/usl pull
sudo -u usl npm install --omit=dev
sudo -u usl npm run build:css
systemctl restart usl
```

## Restore a backup
```bash
systemctl stop usl
cp /opt/usl/backups/usl_YYYYMMDD_HHMMSS/usl.db /opt/usl/database/usl.db
cp -r /opt/usl/backups/usl_YYYYMMDD_HHMMSS/uploads/. /opt/usl/public/uploads/
systemctl start usl
```
