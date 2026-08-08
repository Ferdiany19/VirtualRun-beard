#!/usr/bin/env bash
set -Eeuo pipefail

umask 077

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    log "Missing required environment variable: ${name}"
    exit 1
  fi
}

require_command() {
  local name="$1"
  if ! command -v "$name" >/dev/null 2>&1; then
    log "Missing required command: ${name}"
    exit 1
  fi
}

require_env DATABASE_URL
require_env BACKUP_ENCRYPTION_PASSWORD
require_env R2_ENDPOINT
require_env R2_BUCKET_NAME
require_env GDRIVE_REMOTE
require_env GDRIVE_BACKUP_PATH

require_command pg_dump
require_command openssl
require_command sha256sum
require_command aws
require_command rclone

BACKUP_DIR="${BACKUP_DIR:-/var/backups/virtual-run-beard}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP="$(date -u +'%Y%m%dT%H%M%SZ')"
BASE_NAME="virtual-run-beard-${TIMESTAMP}"

mkdir -p "$BACKUP_DIR"

LOG_FILE="${BACKUP_DIR}/${BASE_NAME}.log"
DUMP_FILE="${BACKUP_DIR}/${BASE_NAME}.dump"
RAW_CHECKSUM_FILE="${DUMP_FILE}.sha256"
ENCRYPTED_FILE="${DUMP_FILE}.enc"
ENCRYPTED_CHECKSUM_FILE="${ENCRYPTED_FILE}.sha256"
METADATA_FILE="${DUMP_FILE}.metadata.json"

exec > >(tee -a "$LOG_FILE") 2>&1

log "Starting PostgreSQL backup"
pg_dump --format=custom --file="$DUMP_FILE" "$DATABASE_URL"

log "Writing raw checksum"
sha256sum "$DUMP_FILE" > "$RAW_CHECKSUM_FILE"

log "Encrypting backup"
openssl enc \
  -aes-256-cbc \
  -pbkdf2 \
  -salt \
  -in "$DUMP_FILE" \
  -out "$ENCRYPTED_FILE" \
  -pass env:BACKUP_ENCRYPTION_PASSWORD

log "Writing encrypted checksum"
sha256sum "$ENCRYPTED_FILE" > "$ENCRYPTED_CHECKSUM_FILE"

cat > "$METADATA_FILE" <<JSON
{
  "name": "${BASE_NAME}",
  "createdAt": "$(date -u +'%Y-%m-%dT%H:%M:%SZ')",
  "format": "pg_dump custom encrypted with openssl aes-256-cbc pbkdf2",
  "encryptedFile": "$(basename "$ENCRYPTED_FILE")",
  "encryptedChecksumFile": "$(basename "$ENCRYPTED_CHECKSUM_FILE")",
  "rawChecksumFile": "$(basename "$RAW_CHECKSUM_FILE")"
}
JSON

R2_PREFIX="s3://${R2_BUCKET_NAME}/database"
GDRIVE_PREFIX="${GDRIVE_REMOTE}:${GDRIVE_BACKUP_PATH}"

log "Uploading encrypted backup to Cloudflare R2"
aws s3 cp "$ENCRYPTED_FILE" "${R2_PREFIX}/$(basename "$ENCRYPTED_FILE")" \
  --endpoint-url "$R2_ENDPOINT" \
  --only-show-errors
aws s3 cp "$ENCRYPTED_CHECKSUM_FILE" "${R2_PREFIX}/$(basename "$ENCRYPTED_CHECKSUM_FILE")" \
  --endpoint-url "$R2_ENDPOINT" \
  --only-show-errors
aws s3 cp "$METADATA_FILE" "${R2_PREFIX}/$(basename "$METADATA_FILE")" \
  --endpoint-url "$R2_ENDPOINT" \
  --only-show-errors

log "Uploading encrypted backup to Google Drive"
rclone copyto "$ENCRYPTED_FILE" "${GDRIVE_PREFIX}/$(basename "$ENCRYPTED_FILE")"
rclone copyto "$ENCRYPTED_CHECKSUM_FILE" "${GDRIVE_PREFIX}/$(basename "$ENCRYPTED_CHECKSUM_FILE")"
rclone copyto "$METADATA_FILE" "${GDRIVE_PREFIX}/$(basename "$METADATA_FILE")"

log "Verifying remote backup existence"
aws s3 ls "${R2_PREFIX}/$(basename "$ENCRYPTED_FILE")" --endpoint-url "$R2_ENDPOINT" >/dev/null
rclone lsf "$GDRIVE_PREFIX" --files-only | grep -Fx "$(basename "$ENCRYPTED_FILE")" >/dev/null

log "Removing temporary raw dump after both remote uploads succeeded"
rm -f "$DUMP_FILE" "$RAW_CHECKSUM_FILE"

log "Applying local encrypted backup retention"
find "$BACKUP_DIR" -type f -name 'virtual-run-beard-*.dump.enc' -mtime "+${BACKUP_RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -type f -name 'virtual-run-beard-*.dump.enc.sha256' -mtime "+${BACKUP_RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -type f -name 'virtual-run-beard-*.dump.metadata.json' -mtime "+${BACKUP_RETENTION_DAYS}" -delete
find "$BACKUP_DIR" -type f -name 'virtual-run-beard-*.log' -mtime "+${BACKUP_RETENTION_DAYS}" -delete

log "Backup completed"
