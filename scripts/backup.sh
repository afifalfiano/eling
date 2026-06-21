#!/bin/sh
# Daily Postgres backup for Eling.
# Run from the host where Docker is running.
# Assumes the compose project is named "eling" (directory name = project name).
#
# Usage: ./scripts/backup.sh
# Cron (daily at 02:00):
#   0 2 * * * /path/to/eling/scripts/backup.sh >> /var/log/eling-backup.log 2>&1
#
# Restore:
#   gunzip -c /var/backups/eling/eling-YYYY-MM-DD_HH-MM-SS.sql.gz | \
#     docker exec -i eling-postgres-1 psql -U eling eling

set -e

BACKUP_DIR="${BACKUP_DIR:-/var/backups/eling}"
CONTAINER="${CONTAINER:-eling-postgres-1}"
DB_USER="${DB_USER:-eling}"
DB_NAME="${DB_NAME:-eling}"
KEEP_DAYS="${KEEP_DAYS:-7}"

mkdir -p "$BACKUP_DIR"

DATE=$(date +%Y-%m-%d_%H-%M-%S)
OUTFILE="$BACKUP_DIR/eling-$DATE.sql.gz"

docker exec "$CONTAINER" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$OUTFILE"

echo "[$(date)] Backup written: $OUTFILE"

find "$BACKUP_DIR" -name "eling-*.sql.gz" -mtime +"$KEEP_DAYS" -delete
echo "[$(date)] Pruned backups older than $KEEP_DAYS days"
