# Deployment

Production target tidak memakai Docker.

## Prerequisites

- Linux VPS.
- Node.js LTS.
- pnpm.
- PostgreSQL.
- Nginx.
- systemd.
- Certbot atau ACME client lain.
- Linux user khusus, contoh: `virtual-run-beard`.

## Build

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test:unit
pnpm build
```

## Migration

```bash
pnpm db:migrate
```

Jalankan migrasi dari workspace backend sebelum restart frontend/backend/worker untuk rilis
yang membutuhkan schema baru.

## Runtime Configuration

- `REVIEW_CLAIM_DURATION_MINUTES` hanya dipakai endpoint claim legacy; flow validation produksi
  memakai direct admin decision tanpa claim.
- Email production dikirim dari backend/worker melalui `EMAIL_DRIVER=smtp`. Untuk Gmail,
  gunakan `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USERNAME` alamat Gmail,
  `SMTP_PASSWORD` App Password 16 digit, dan `SMTP_FROM_EMAIL` alamat pengirim yang sama.
  Verifikasi dengan `pnpm email:test -- operator@example.com` dari workspace root.
- Backend API berjalan di port lokal `3001`.
- Frontend Next berjalan di port lokal `3000`.
- Konfigurasi runtime dipisah per aplikasi: backend memakai env backend/worker, frontend
  memakai env web. Development memakai `backend/.env` dan `frontend/.env`.
- Worker harus berjalan agar BIB, registration email, submission validation notification, dan
  cleanup upload expired diproses.

## systemd

Contoh unit:

- `deploy/systemd/virtual-run-beard-backend.service`
- `deploy/systemd/virtual-run-beard-web.service`
- `deploy/systemd/virtual-run-beard-worker.service`

Web process memakai Next.js standalone output dari `frontend/`. Backend API memakai NestJS
build dari `backend/`. Worker process memakai `pnpm --filter backend worker`.

## Nginx

Contoh reverse proxy:

- `deploy/nginx/beard.com.conf`

Nginx meneruskan `/api/*` ke `127.0.0.1:3001` dan route lain ke `127.0.0.1:3000`.

## Rollback

1. Simpan release lama di direktori versioned.
2. Stop web dan worker.
3. Arahkan symlink `current` ke release sebelumnya.
4. Restart service.
5. Verifikasi `/api/health`.
6. Rollback database hanya dengan SQL manual yang sudah direview.

## Permissions

- Application user tidak boleh root.
- File env production hanya dapat dibaca application user.
- Backup directory hanya dapat dibaca application user dan operator yang berwenang.

## Firewall

- Buka `80` dan `443` untuk Nginx.
- Batasi SSH.
- Jangan expose PostgreSQL ke internet publik.

## Logs

- Gunakan journald untuk web dan worker.
- Logrotate example tersedia di `deploy/logrotate/virtual-run-beard`.
- Jangan mencetak credential di log.
