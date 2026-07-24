#!/usr/bin/env bash
# OPS-01: scheduled backup of the production database and uploaded files.
#
# The prod stack keeps everything durable in named volumes (postgres_data,
# api_uploads, api_private_uploads) but NOTHING backed them up — the only backup
# on disk was a single manual dump, so a host loss meant losing everything since.
# Run this from cron on the host, e.g. hourly DB + daily files:
#
#   0 * * * *  /opt/agrotraders/infra/backup.sh db   >> /var/log/agro-backup.log 2>&1
#   30 3 * * * /opt/agrotraders/infra/backup.sh files >> /var/log/agro-backup.log 2>&1
#
# Set BACKUP_DIR to an OFF-HOST mount (NFS / rclone remote / object storage) so a
# host failure doesn't take the backups with it. Retention prunes by age.
set -euo pipefail

COMPOSE="docker compose --env-file ${ENV_FILE:-.env} -f infra/docker-compose.prod.yml"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/agrotraders}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$BACKUP_DIR"

backup_db() {
  # pg_dump from inside the postgres container (custom format → parallel restore).
  local out="$BACKUP_DIR/db-$STAMP.dump"
  # shellcheck disable=SC2086
  $COMPOSE exec -T postgres \
    sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$out"
  echo "db backup written: $out ($(du -h "$out" | cut -f1))"
}

backup_files() {
  # tar the two upload volumes via a throwaway alpine that mounts them read-only.
  local out="$BACKUP_DIR/files-$STAMP.tar.gz"
  docker run --rm \
    -v agrostock-prod_api_uploads:/data/uploads:ro \
    -v agrostock-prod_api_private_uploads:/data/private-uploads:ro \
    -v "$BACKUP_DIR":/backup alpine:latest \
    tar czf "/backup/$(basename "$out")" -C /data uploads private-uploads
  echo "files backup written: $out ($(du -h "$out" | cut -f1))"
}

prune() {
  find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.dump' -mtime "+$RETENTION_DAYS" -delete || true
  find "$BACKUP_DIR" -maxdepth 1 -type f -name '*.tar.gz' -mtime "+$RETENTION_DAYS" -delete || true
}

case "${1:-all}" in
  db)    backup_db ;;
  files) backup_files ;;
  all)   backup_db; backup_files ;;
  *)     echo "usage: $0 [db|files|all]" >&2; exit 2 ;;
esac
prune

# Restore drill (run in a staging environment, NEVER blind against prod):
#   docker compose ... exec -T postgres sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < db-<STAMP>.dump
#   docker run --rm -v agrostock-prod_api_uploads:/data/uploads -v "$BACKUP_DIR":/backup alpine \
#     sh -c 'cd /data && tar xzf /backup/files-<STAMP>.tar.gz'
