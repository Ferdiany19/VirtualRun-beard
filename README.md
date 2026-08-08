# Virtual Run Beard

Virtual Run Beard adalah fondasi platform virtual run untuk event Indonesia. UI utama
menggunakan Bahasa Indonesia dan timezone bisnis default adalah `Asia/Jakarta` atau WIB.

Status repository saat ini: vertical slice event management + pendaftaran peserta, BIB,
upload hasil peserta, dan workflow validation admin.
Admin authentication, RBAC dasar, event/category management, admin preview, public event
routes, registrasi publik tanpa akun, participant access session, BIB allocation, BIB
template, PostgreSQL job queue, storage private, email confirmation job, admin participant
management, submission per kategori, riwayat revisi, validation queue, direct admin
decision approve/request revision/reject, validator assignment legacy, validation audit,
notification job validation, dan certificate v1 sudah tersedia. Leaderboard, payment, dan
report export belum diimplementasikan sebagai fitur produk.

## Stack

- NestJS backend API
- Next.js App Router
- TypeScript strict mode
- PostgreSQL dengan `pg`
- Raw parameterized SQL
- Zod validation
- Tailwind CSS
- Cloudflare R2 private object storage atau local development adapter
- Sharp untuk render BIB PNG
- Vitest untuk unit dan integration test setup
- Plain SQL migrations dengan runner sederhana
- systemd dan Nginx untuk deployment tanpa Docker

## Setup Lokal

```bash
pnpm install
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
pnpm dev
```

Frontend lokal berjalan di `http://localhost:3000`; backend NestJS berjalan di
`http://localhost:3001`. Backend membaca `backend/.env`; frontend membaca `frontend/.env`.
Pada production, Nginx meneruskan `/api/*` ke backend dan route lain ke frontend.

## Command Development

```bash
pnpm dev
pnpm dev:frontend
pnpm dev:backend
pnpm worker
pnpm db:migrate
pnpm db:seed:dev
pnpm email:test -- peserta@example.com
```

`pnpm db:migrate` membutuhkan `DATABASE_URL` dan akan mencatat migrasi ke tabel
`schema_migrations`.

`pnpm email:test` mengirim email contoh lewat konfigurasi SMTP backend. Untuk Gmail, isi
`backend/.env` dengan `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USERNAME` alamat
Gmail, `SMTP_PASSWORD` App Password 16 digit, `SMTP_FROM_EMAIL` alamat pengirim yang sama,
lalu ubah `EMAIL_DRIVER=smtp`.

Seed development membuat akun:

- Email: `admin@beard.test`
- Password: `ChangeMe!2026`

Credential ini hanya untuk development. Ganti password dengan:

```bash
pnpm admin:set-password admin@beard.test <password-baru-minimal-12-karakter>
```

## Command Quality Gate

```bash
pnpm format
pnpm lint
pnpm typecheck
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm build
```

Integration test saat ini memvalidasi struktur file migrasi dan memiliki jalur opsional
untuk benar-benar menjalankan migrasi ke PostgreSQL jika `INTEGRATION_DATABASE_URL`
disediakan.

## Struktur Utama

```text
frontend/
  src/
    app/
    modules/
    shared/
backend/
  src/
    api/
    db/
    modules/
    shared/
    worker/
docs/
deploy/
scripts/
```

Detail arsitektur, database, keamanan, deployment, backup, dan backlog ada di folder
`docs/`.

## Implemented Slice

- Shell public dan admin.
- Design tokens dasar di Tailwind dan CSS variables.
- Health endpoint NestJS di `/api/health`.
- Environment validation dengan Zod.
- Application error dan HTTP error response helper.
- PostgreSQL pool dan transaction helper.
- Migration runner plain SQL.
- Migrasi untuk admin auth, events, categories, participants, audit logs, FAQ event,
  category description, admin event assignment, registration, BIB, job queue, participant
  sessions, idempotency, dan email delivery.
- Admin login/logout dengan Argon2id, session token hash, HttpOnly cookie, CSRF token, rate
  limit, RBAC dasar, dan audit log.
- Event dan category management dari admin.
- Public landing page event di `/`, `/events`, dan `/events/[slug]`.
- Public registration di `/events/[slug]/register`, confirmation, participant access, dan
  participant BIB download.
- Admin BIB template/settings di `/admin/events/[eventId]/bib`.
- Admin participant list/detail/edit di `/admin/events/[eventId]/participants`.
- Participant submission dashboard, upload hasil, dan riwayat revisi di
  `/events/[slug]/participant/submissions`.
- Admin validation queue/detail di `/admin/validation/my-queue`,
  `/admin/events/[eventId]/validation`, dan `/admin/events/[eventId]/submissions`.
- Admin validator assignment di `/admin/events/[eventId]/validators`.
- Participant dapat melihat status validation dan catatan validator yang participant-visible.
- Worker `pnpm worker` dari workspace backend memproses `GENERATE_BIB`, `SEND_REGISTRATION_CONFIRMATION`,
  notification validation, dan `CLEAN_EXPIRED_UPLOADS`.
- Unit test untuk business policy dan integration/e2e test setup.
- Contoh systemd, Nginx, logrotate, backup, restore, dan verify backup.

## Batasan Saat Ini

Tidak ada data dummy di production path. Payment, certificate, leaderboard, dan export Excel
belum aktif. BIB generation membutuhkan template PNG aktif per event dan worker berjalan.
Submission tetap tidak memakai draft server-side; revision baru dari peserta bersifat
append-only dan kembali ke `SUBMITTED` sampai validator mengambil keputusan. Development
boleh memakai `STORAGE_DRIVER=local` dan `EMAIL_DRIVER=log`; production menolak fallback
tersebut melalui env validation.
