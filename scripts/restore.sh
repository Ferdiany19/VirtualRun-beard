#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

if [[ $# -ne 2 ]]; then
  log "Usage: scripts/restore.sh <encrypted-backup-file> <target-database-url>"
  exit 1
fi

if [[ "${RESTORE_CONFIRM:-}" != "I_UNDERSTAND_THIS_CAN_OVERWRITE_DATA" ]]; then
  log "Set RESTORE_CONFIRM=I_UNDERSTAND_THIS_CAN_OVERWRITE_DATA before restoring"
  exit 1
fi

if [[ -z "${BACKUP_ENCRYPTION_PASSWORD:-}" ]]; then
  log "Missing required environment variable: BACKUP_ENCRYPTION_PASSWORD"
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  log "Missing required command: openssl"
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  log "Missing required command: pg_restore"
  exit 1
fi

ENCRYPTED_BACKUP_FILE="$1"
TARGET_DATABASE_URL="$2"
DECRYPTED_FILE="$(mktemp -t virtual-run-beard-restore.XXXXXX.dump)"

cleanup() {
  rm -f "$DECRYPTED_FILE"
}

trap cleanup EXIT

log "Decrypting backup"
openssl enc \
  -d \
  -aes-256-cbc \
  -pbkdf2 \
  -in "$ENCRYPTED_BACKUP_FILE" \
  -out "$DECRYPTED_FILE" \
  -pass env:BACKUP_ENCRYPTION_PASSWORD

log "Restoring backup to target database"
pg_restore --clean --if-exists --no-owner --dbname="$TARGET_DATABASE_URL" "$DECRYPTED_FILE"

log "Restore completed"
