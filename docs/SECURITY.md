# Security

## Admin Authentication

- Password hash Argon2id.
- Random opaque session token.
- Hash session token disimpan di database.
- HttpOnly cookie.
- Secure cookie di production.
- SameSite sesuai flow admin.
- Expiration dan optional idle expiration.
- Revocation dan logout.
- Login rate limit.
- CSRF protection untuk state-changing request.
- Audit login success/failure tanpa menyimpan password.

Schema dan service login/logout tersedia di backend NestJS. Session token dan CSRF token raw
hanya disimpan di cookie; database menyimpan hash SHA-256. Cookie memakai HttpOnly, SameSite
Lax, dan Secure pada production.

## Public Participant Flow

- Tidak ada akun/login peserta.
- Registration code random dan sulit ditebak.
- Token credential disimpan sebagai hash.
- Public form dilindungi rate limiting, Turnstile, validation server-side,
  idempotency key, dan duplicate submission protection.
- Error untuk data sensitif harus generik.
- Participant access memakai email + registration code lalu membuat HttpOnly opaque session.
- Registration code hash disimpan di `event_registrations`; plaintext hanya berada di memori
  request dan session/job payload terenkripsi.
- Identity conflict email/phone membuat security attempt dan audit record tanpa membuka data
  peserta lain.
- Turnstile development bypass hanya aktif bila `TURNSTILE_DEVELOPMENT_BYPASS=true` dan
  `NODE_ENV` bukan production. Env validation menolak bypass di production.
- Rate limiting dicatat di `registration_security_attempts` untuk IP/email/phone/access
  identifier hash.
- Participant submission form memakai CSRF token HttpOnly yang di-hash di
  `participant_access_sessions`.
- Submission upload wajib menyertakan activity URL dan/atau screenshot. Screenshot divalidasi
  lewat signature file, dibaca dengan Sharp, dinormalisasi menjadi JPEG tanpa metadata EXIF,
  dan disimpan sebagai private object.
- Evidence download peserta dibatasi oleh participant access session yang memiliki
  registration terkait; admin download dibatasi oleh event management access.

## Authorization

- Production memakai single-role app-level admin: setiap admin session aktif memiliki akses penuh
  ke event, peserta, BIB, validation, email operasional, dan sertifikat.
- Authorization tetap wajib diputuskan server-side; client hanya mengatur tampilan.
- Role legacy `SUPER_ADMIN`, `EVENT_ADMIN`, `VALIDATOR`, dan `REPORT_VIEWER` serta tabel
  assignment lama dipertahankan untuk kompatibilitas migration, bukan pembatas akses produksi.

## CSRF

Setiap form admin state-changing membawa hidden `csrfToken`. Server action memvalidasi:

- token form sama dengan cookie CSRF.
- hash cookie CSRF sama dengan hash di `admin_sessions`.
- session admin masih aktif.

Jika validasi gagal, action ditolak sebelum service mutasi berjalan.

## Data Handling

- Jangan log password, session token, API key, atau secret.
- Audit log menyimpan previous/new values secukupnya.
- PII dalam report default harus dibatasi.
- Object storage private dan download memakai signed URL berumur pendek.
- BIB/template objects tetap private. Participant dan admin download diproxy melalui endpoint
  yang memverifikasi session/authorization sebelum membaca object.
- Template dan hasil sertifikat disimpan sebagai private object. Sertifikat v1 hanya dikirim
  lewat email attachment PNG dan tidak membuat public object URL.
- Development storage/email adapter (`local`, `log`) ditolak saat `NODE_ENV=production`.
- Validation review memiliki `participant_visible_note` dan `internal_note`. UI peserta hanya
  memakai participant-visible note; internal note hanya tampil pada admin validation detail.
- Validation decision memakai CSRF admin, authorization server-side, optimistic
  `review_version`, row lock, dan audit log. Field/endpoint review claim masih legacy dan bukan
  flow produksi utama.

## Admin Participant Management

- Semua admin aktif dapat memperbaiki participant sesuai kebijakan single admin app-level.
- Perubahan participant sensitif divalidasi global uniqueness dan dicatat di audit log.
- Perubahan nama dapat menjadwalkan regenerate BIB tanpa mengubah BIB number atau
  registration code.

## Transport dan Infrastructure

- Production wajib HTTPS.
- Nginx menjadi reverse proxy ke web process lokal.
- Frontend, backend API, dan worker berjalan sebagai Linux user non-root.
- PostgreSQL hanya menerima koneksi dari host/jaringan yang diizinkan.
- Firewall hanya membuka port yang diperlukan.

## Secrets

Secrets disediakan melalui environment file di server, bukan repository. Development memakai
`backend/.env` dan `frontend/.env`; production memakai env file systemd masing-masing proses.
File `.env.example` hanya berisi nama variabel dan placeholder.
SMTP password, termasuk Gmail App Password, diperlakukan sebagai secret dan tidak boleh
dicetak ke log, dimasukkan ke source control, atau dipakai ulang untuk layanan lain.

## Development Credentials

Seed development membuat `admin@beard.test` / `ChangeMe!2026`. Credential ini bukan untuk
production. Operator harus menjalankan `pnpm admin:set-password admin@beard.test <password>`
setelah seed lokal.
