#!/usr/bin/env bash
set -euo pipefail

# Simple backup script for SQLite DB + uploads.
# Usage (from backend/):
#   ./scripts/backup.sh /path/to/backup-dir
#
# This is intended as a starting point; in production you would
# schedule it via cron or your orchestrator and sync the backup
# directory to durable storage (S3, GCS, etc.).

BACKUP_DIR="${1:-./backups}"
mkdir -p "$BACKUP_DIR"

TS="$(date +%Y%m%d-%H%M%S)"

DB_FILE="yacht_booking.db"
UPLOADS_DIR="uploads"

if [ -f "$DB_FILE" ]; then
  cp "$DB_FILE" "$BACKUP_DIR/${DB_FILE}.${TS}"
fi

if [ -d "$UPLOADS_DIR" ]; then
  tar -czf "$BACKUP_DIR/uploads-${TS}.tar.gz" "$UPLOADS_DIR"
fi

echo "Backup complete: $BACKUP_DIR"

