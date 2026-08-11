# API Contract

## Implemented

### GET `/api/health`

Health endpoint untuk NestJS backend process.

Response `200` saat aplikasi sehat atau database belum dikonfigurasi di local foundation:

```json
{
  "service": "virtual-run-beard",
  "status": "ok",
  "database": "not_configured",
  "timezone": "Asia/Jakarta",
  "checkedAt": "2026-07-23T00:00:00.000Z",
  "correlationId": "generated-or-forwarded-id"
}
```

Response `503` saat `DATABASE_URL` ada tetapi koneksi/check database gagal.

Header:

- `x-correlation-id`
- `cache-control: no-store`

## Error Shape

Target error response:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Data yang dikirim belum valid.",
    "correlationId": "request-correlation-id"
  }
}
```

Raw database error tidak boleh dikembalikan ke client.

## Planned Public APIs

Belum diimplementasikan:

- Public leaderboard.
- Certificate verification.

Implemented public participant flow:

- `GET /events/[slug]/register`
- `POST` server action dari form registration dengan idempotency key dan Turnstile.
- `GET /events/[slug]/register/confirmation`
- `GET /events/[slug]/participant`
- `POST` server action participant access memakai email + registration code.
- `GET /events/[slug]/participant/bib`
- `GET /events/[slug]/participant/submissions`
- `GET /events/[slug]/participant/submissions/[registrationCategoryId]`

Data pendaftaran publik mencakup `instagramUsername` sebagai field wajib baru. `province` dan
`cityOrRegency` dikirim sebagai nama wilayah hasil pilihan dari Wilayah.id; kode wilayah hanya
dipakai di UI untuk memuat daftar kota/kabupaten bertingkat.

Implemented admin event export:

- `GET /api/admin/events/export` menghasilkan workbook Excel untuk event yang dapat dikelola
  admin terautentikasi.
- Query filter opsional: `search`, `publication`, dan `period` (`UPCOMING`, `ONGOING`, `PAST`).
- Response memakai `cache-control: no-store` dan attachment `.xlsx`.
- `POST` server action submission revision dengan CSRF, idempotency key, activity URL
  dan/atau screenshot.
- Submission revision baru tidak menerima field elapsed/moving duration. Data durasi revision
  lama tetap dapat dibaca untuk kompatibilitas historis, tetapi bukan bagian dari form upload baru.
- `GET /events/[slug]/participant/submissions/[registrationCategoryId]/history`
- `GET /api/participant/bib/download?registrationId=...`
- `GET /api/participant/submission-file/download?fileId=...`

Download BIB dan evidence peserta membutuhkan participant access session HttpOnly yang cocok
dengan registration miliknya.

## Planned Admin APIs

Belum diimplementasikan:

- Report export job.
- Backup status.

Implemented admin registration/BIB routes:

- `/admin/events/[eventId]/bib`
- `/admin/events/[eventId]/participants`
- `/admin/events/[eventId]/participants/[registrationId]`
- `/admin/events/[eventId]/submissions`
- `/admin/events/[eventId]/submissions/[submissionId]`
- `/admin/validation/my-queue`
- `/admin/events/[eventId]/validation`
- `/admin/events/[eventId]/validators` legacy route, hidden from primary navigation
- Certificate template upload server action on `/admin/events/[eventId]`
- Event completion server action on `/admin/events/[eventId]` queues certificate jobs
- `GET /api/admin/bib/download?registrationId=...`
- `GET /api/admin/submission-file/download?fileId=...`

Admin mutation target berpindah ke NestJS API dengan CSRF validation. Participant list uses
server-side filtering and dynamic sorting through an internal allowlist. Submission admin
views use direct validation decision actions: approve, request revision, and reject. The
decision endpoint does not require a review claim; optimistic `review_version` remains the
concurrency guard. Production authorization uses a single active admin model; validator
assignment/revoke and claim/release endpoints remain legacy-compatible and are hidden from the
main UI.

Implemented Nest API foundation:

- `GET /api/health`
- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `GET /api/admin/auth/session`
- `GET /api/public/events`
- `GET /api/public/events/:slug`
- `GET /api/public/events/:slug/banner`
- `POST /api/public/events/:slug/register`
- `POST /api/public/events/:slug/participant/access`
- `GET /api/public/participant/session`
- `GET /api/participant/submissions`
- `GET /api/participant/events/:eventSlug/submissions/:registrationCategoryId`
- `POST /api/participant/events/:eventSlug/submissions/:registrationCategoryId/revisions`
- `GET /api/admin/dashboard`
- `GET /api/admin/sidebar`
- `GET /api/admin/events`
- `POST /api/admin/events`
- `POST /api/admin/events/full-create`
- `POST /api/admin/events/banner`
- `GET /api/admin/events/:eventId`
- `GET /api/admin/events/:eventId/with-categories`
- `PATCH /api/admin/events/:eventId`
- `POST /api/admin/events/:eventId/publish` menolak publish jika event belum memiliki kategori
  aktif atau BIB Template aktif yang ter-assign.
- `POST /api/admin/events/:eventId/unpublish`
- `POST /api/admin/events/:eventId/archive`
- `POST /api/admin/events/:eventId/complete` planned API parity; current UI completion uses a
  protected server action and service transaction
- `GET /api/admin/events/:eventId/categories`
- `POST /api/admin/events/:eventId/categories`
- `PATCH /api/admin/categories/:categoryId`
- `POST /api/admin/categories/:categoryId/active`
- Pengelolaan kategori inline pada edit event mendukung tambah, ubah, aktif/nonaktif, dan hapus
  kategori yang belum pernah dipakai pendaftaran; kategori yang sudah dipakai ditolak untuk hapus.
- `GET /api/admin/participants`
- `GET /api/admin/events/:eventId/participants`
- `GET /api/admin/registrations/:registrationId`
- `PATCH /api/admin/registrations/:registrationId/participant`
- `POST /api/admin/registrations/:registrationId/email/resend`
- `GET /api/admin/bib-templates`
- `GET /api/admin/bib-templates/:templateVersionId`
- `PATCH /api/admin/bib-templates/:templateVersionId/metadata`
- `POST /api/admin/bib-templates/:templateVersionId/publish`
  menerima `csrfToken` dan `eventId`; publish dapat memindahkan template ke event tujuan
  sekaligus mengaktifkannya sebagai template BIB event tersebut.
- `POST /api/admin/bib-templates/:templateVersionId/archive`
- `POST /api/admin/bib-templates/:templateVersionId/duplicate`
- `GET /api/admin/events/:eventId/bib`
- `PATCH /api/admin/events/:eventId/bib/settings`
- `POST /api/admin/events/:eventId/bib/template`
- `POST /api/admin/registrations/:registrationId/bib/regenerate`
- `GET /api/admin/validation/queue`
- `GET /api/admin/events/:eventId/validation`
- `GET /api/admin/events/:eventId/submissions`
- `GET /api/admin/submissions/:submissionId`
- `GET /api/admin/validation/submissions/:submissionId`
- `POST /api/admin/validation/submissions/:submissionId/claim` legacy compatibility, hidden from UI
- `POST /api/admin/validation/submissions/:submissionId/release` legacy compatibility, hidden from UI
- `POST /api/admin/validation/submissions/:submissionId/decision`
- `GET /api/admin/events/:eventId/validators`
- `POST /api/admin/events/:eventId/validators`
- `POST /api/admin/events/:eventId/validators/revoke`
- `GET /api/admin/bib/download?registrationId=...`
- `GET /api/admin/bib/template-preview?templateVersionId=...`
- `GET /api/admin/certificates/template-preview?eventId=...`
- `GET /api/admin/events/export`
- `GET /api/admin/submission-file/download?fileId=...`
- `GET /api/participant/bib/download?registrationId=...`
- `GET /api/participant/submission-file/download?fileId=...`

`GET /api/admin/registrations/:registrationId` mengembalikan ringkasan registrasi plus data detail peserta admin: submission kategori, email delivery, BIB document, validation review, dan aktivitas terbaru.

## Implemented Pages and Actions

Public:

- `/`
- `/events`
- `/events/[slug]`
- `/events/[slug]/register`
- `/events/[slug]/register/confirmation`
- `/events/[slug]/participant`
- `/events/[slug]/participant/bib`
- `/events/[slug]/participant/submissions`
- `/events/[slug]/participant/submissions/[registrationCategoryId]`
- `/events/[slug]/participant/submissions/[registrationCategoryId]/history`

Admin:

- `/admin/login`
- `/admin`
- `/admin/events`
- `/admin/events/new`
- `/admin/events/[eventId]`
- `/admin/events/[eventId]/edit`
- `/admin/events/[eventId]/categories`
- `/admin/events/[eventId]/preview`
- `/admin/events/[eventId]/bib`
- `/admin/bib-templates`
- `/admin/bib-templates/[templateVersionId]`
- `/admin/participants`
- `/admin/events/[eventId]/participants`
- `/admin/events/[eventId]/participants/[registrationId]`
- `/admin/events/[eventId]/submissions`
- `/admin/events/[eventId]/submissions/[submissionId]`
- `/admin/validation/my-queue`
- `/admin/events/[eventId]/validation`
- `/admin/events/[eventId]/validators` legacy route, hidden from primary navigation

Admin preview tidak diindeks dan tidak membuka draft ke route public.
