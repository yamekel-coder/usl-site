#!/bin/bash
# USL backup script — runs every 30 min via cron.
# Backs up the SQLite DB + uploads folder, keeps last 48 copies (~24h), deletes older.

set -e

APP_DIR="/opt/usl"
BACKUP_DIR="$APP_DIR/backups"
DB_FILE="$APP_DIR/database/usl.db"
UPLOADS_DIR="$APP_DIR/public/uploads"
KEEP=48  # number of backups to keep (48 * 30min = 24h)

mkdir -p "$BACKUP_DIR"

TS=$(date +%Y%m%d_%H%M%S)
DEST="$BACKUP_DIR/usl_$TS"
mkdir -p "$DEST"

# Backup database (use .backup for safe online copy)
if [ -f "$DB_FILE" ]; then
  sqlite3 "$DB_FILE" ".backup '$DEST/usl.db'" 2>/dev/null || cp "$DB_FILE" "$DEST/usl.db"
fi

# Backup uploads (avatars, banners, logos)
if [ -d "$UPLOADS_DIR" ]; then
  cp -r "$UPLOADS_DIR" "$DEST/uploads" 2>/dev/null || true
fi

# Remove old backups
ls -1dt "$BACKUP_DIR"/usl_* 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -rf

echo "[$(date)] Backup done: $DEST"
