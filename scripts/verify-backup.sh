#!/usr/bin/env bash
set -Eeuo pipefail

log() {
  printf '%s %s\n' "$(date -u +'%Y-%m-%dT%H:%M:%SZ')" "$*"
}

if [[ $# -ne 1 ]]; then
  log "Usage: scripts/verify-backup.sh <encrypted-backup-file-name>"
  exit 1
fi

for name in R2_ENDPOINT R2_BUCKET_NAME GDRIVE_REMOTE GDRIVE_BACKUP_PATH; do
  if [[ -z "${!name:-}" ]]; then
    log "Missing required environment variable: ${name}"
    exit 1
  fi
done

if ! command -v aws >/dev/null 2>&1; then
  log "Missing required command: aws"
  exit 1
fi

if ! command -v rclone >/dev/null 2>&1; then
  log "Missing required command: rclone"
  exit 1
fi

BACKUP_FILE_NAME="$(basename "$1")"
R2_OBJECT="s3://${R2_BUCKET_NAME}/database/${BACKUP_FILE_NAME}"
GDRIVE_PREFIX="${GDRIVE_REMOTE}:${GDRIVE_BACKUP_PATH}"

log "Checking Cloudflare R2"
aws s3 ls "$R2_OBJECT" --endpoint-url "$R2_ENDPOINT" >/dev/null

log "Checking Google Drive"
rclone lsf "$GDRIVE_PREFIX" --files-only | grep -Fx "$BACKUP_FILE_NAME" >/dev/null

log "Backup exists in both remotes"
