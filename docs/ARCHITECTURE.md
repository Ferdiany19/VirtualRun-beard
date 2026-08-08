# Architecture

## Style

Virtual Run Beard memakai modular monolith berbentuk pnpm workspace. Satu repository
menghasilkan tiga proses:

- Next.js frontend application di `frontend/`.
- NestJS backend API di `backend/`.
- Background worker dari backend.

Worker memproses PostgreSQL-backed job queue untuk `GENERATE_BIB`,
`SEND_REGISTRATION_CONFIRMATION`, submission validation notification, dan
`CLEAN_EXPIRED_UPLOADS`. Handler job tetap berada dalam monolith yang sama dan tidak memakai
Redis/BullMQ.

## Request Boundary

```text
Browser/Next SSR -> Nest controller -> Service -> Repository -> PostgreSQL
```

- Nest controller: HTTP, auth, validation, response, correlation ID.
- Service: business rule, authorization, orchestration transaksi.
- Repository: SQL dan mapping row ke domain type.
- React component: UI dan interaction state, tanpa query database langsung.
- Next server component boleh mengambil data melalui HTTP ke Nest, bukan import repository
  atau service backend.

## Struktur

```text
frontend/
  src/
    app/
    modules/
    shared/ui/
backend/
  src/
    api/
    db/
    modules/
    shared/
    worker/
```

Slice registration/BIB menambahkan module `registrations`, `bib`, `jobs`, `storage`, dan
`email`. Slice submission menambahkan module `submissions` untuk upload hasil, revision
history, dan evidence file. Slice validation menambahkan module `validation` untuk queue,
assignment validator, claim concurrency, decision policy, deterministic warnings, dan review
audit. Folder leaderboard, certificates, dan reports tetap belum dibangun.

## Database Access

- PostgreSQL diakses dengan `pg`.
- Tidak ada ORM dan tidak ada query builder.
- Semua value dari request harus memakai parameterized SQL.
- Dynamic identifier harus berasal dari allowlist internal.
- Multi-step write memakai transaction helper dan client yang sama.

## Runtime

- Backend Nest berjalan di port default `3001`.
- Frontend Next berjalan di port default `3000`.
- Nginx meneruskan `/api/*` ke backend dan semua route lain ke frontend.
- Public event routes saat ini dynamic server-rendered agar build tidak membutuhkan koneksi
  database dan draft tidak masuk static cache. Caching public dapat ditambahkan dengan
  invalidation eksplisit setelah publish/unpublish.
- Admin dan response yang memuat data sensitif harus `no-store`.

## Admin Flow

```text
/admin/login -> authenticateAdmin -> session cookies -> protected admin group
```

Protected admin pages memakai server component layout yang memanggil `requireAdminSession`.
State-changing action memvalidasi CSRF token, lalu memanggil service. SQL tetap hanya berada
di repository.

## Public Event Flow

`/`, `/events`, dan `/events/[slug]` hanya membaca event published dari repository public.
Admin preview memakai data draft terbaru dari route `/admin/events/[eventId]/preview` dan
komponen landing yang sama.

## Background Jobs

Job queue memakai tabel `background_jobs`, transaction, dan `FOR UPDATE SKIP LOCKED`.
Job types aktif:

- `GENERATE_BIB`
- `SEND_REGISTRATION_CONFIRMATION`
- `SEND_REVISION_REQUEST_NOTIFICATION`
- `SEND_SUBMISSION_APPROVED_NOTIFICATION`
- `SEND_SUBMISSION_REJECTED_NOTIFICATION`
- `SEND_SUBMISSION_DISQUALIFIED_NOTIFICATION`
- `SEND_REVISED_SUBMISSION_RECEIVED_NOTIFICATION`
- `CLEAN_EXPIRED_UPLOADS`

Worker mengambil job dengan lock, menjalankan handler idempotent, lalu menandai
`COMPLETED`, `FAILED`, atau `DEAD`. BIB failure tidak membatalkan registration.

## Object Storage

Target storage adalah Cloudflare R2 private bucket. Database hanya menyimpan object key dan
metadata. Production memakai adapter R2 S3-compatible; development boleh memakai
`STORAGE_DRIVER=local`. Download BIB diproxy melalui endpoint terotorisasi agar object tetap
private. Evidence submission memakai object key
`events/{eventId}/submissions/{submissionId}/revisions/{revisionId}/{fileId}.jpg` dan
dipreview/diunduh melalui endpoint terotorisasi.

## Email

Email confirmation dikirim melalui job `SEND_REGISTRATION_CONFIRMATION`. Submission
validation notification memakai job email yang sama untuk revision request, approved,
rejected, disqualified, dan revised submission received. Production memakai SMTP lewat
environment variable; development boleh memakai `EMAIL_DRIVER=log`. Registration code di
payload job disimpan terenkripsi dengan `SESSION_SECRET`.

## Deployment

Production target:

- Linux VPS.
- Node.js process dengan Next.js standalone output untuk frontend.
- NestJS backend API process terpisah.
- Backend worker process terpisah.
- systemd untuk process manager.
- Nginx reverse proxy.
- HTTPS via Certbot atau mekanisme ACME lain.
- Tidak menggunakan Docker.
