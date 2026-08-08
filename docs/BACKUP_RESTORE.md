# Backup and Restore

Backup memakai `pg_dump -Fc`, checksum SHA-256, enkripsi, upload ke Cloudflare R2 dan
Google Drive, lalu verifikasi remote file.

## Scripts

- `scripts/backup.sh`
- `scripts/restore.sh`
- `scripts/verify-backup.sh`

## Required Tools

- `pg_dump`
- `pg_restore`
- `openssl`
- `sha256sum`
- `aws` CLI yang dikonfigurasi untuk Cloudflare R2
- `rclone` untuk Google Drive

Google Drive dapat memakai OAuth user account atau Google Workspace Shared Drive dengan
service account. Credential tidak boleh di-hardcode.

## Environment

```bash
DATABASE_URL=postgres://...
BACKUP_DIR=/var/backups/virtual-run-beard
BACKUP_RETENTION_DAYS=30
BACKUP_ENCRYPTION_PASSWORD=...
R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_BUCKET_NAME=virtual-run-beard
GDRIVE_REMOTE=gdrive
GDRIVE_BACKUP_PATH=VirtualRunBeard/backups
```

## Backup

```bash
scripts/backup.sh
```

Script menghapus temporary local file hanya setelah upload R2 dan Google Drive berhasil.

## Verify

```bash
scripts/verify-backup.sh backup-file.dump.enc
```

Script memeriksa keberadaan file di R2 dan Google Drive.

## Restore

```bash
scripts/restore.sh /secure/path/backup.dump.enc postgres://target-db-url
```

Restore harus dilakukan ke database target yang benar. Untuk production, ambil maintenance
window, stop web dan worker, lalu jalankan smoke test setelah restore.

## Retention

Retention configurable melalui `BACKUP_RETENTION_DAYS`. Foundation script membersihkan file
lokal lama setelah backup baru berhasil; retention remote perlu disesuaikan dengan lifecycle
policy R2 dan rclone cleanup terpisah saat kebijakan final diputuskan.
