# Business Rules

Dokumen ini mencatat aturan bisnis yang sudah disepakati dari brief. Implementasi fitur
akan mengacu ke dokumen ini dan memperbaruinya saat ada keputusan baru.

## Participant

- Satu participant mewakili satu manusia.
- Email dinormalisasi dengan `trim` dan `lowercase`.
- Nomor HP Indonesia dinormalisasi dengan membuang spasi, dash, dan tanda kurung.
- Awalan `08` disimpan menjadi `+628`.
- Awalan `628` diterima sebagai variasi input umum dan disimpan menjadi `+628`.
- Email dan nomor HP unik secara global untuk participant aktif.
- Soft delete tidak boleh menghapus audit history.

## Event

- Event memiliki status eksplisit, bukan boolean tunggal.
- Status yang digunakan: `DRAFT`, `SCHEDULED`, `REGISTRATION_OPEN`,
  `REGISTRATION_CLOSED`, `ACTIVITY_OPEN`, `UPLOAD_OPEN`, `REVIEW`, `COMPLETED`,
  `ARCHIVED`.
- Perpindahan status wajib divalidasi oleh service.
- Registration, activity, dan upload window divalidasi server-side.
- MVP hanya mengaktifkan `FREE`, tetapi schema sudah memiliki extension point untuk `PAID`.
- Public hanya dapat melihat event dengan `publication_status = PUBLISHED` dan status event
  bukan `ARCHIVED`.
- Draft dapat dilihat melalui admin preview terproteksi, bukan melalui public route.
- Publish event membutuhkan minimal satu kategori aktif dan BIB Template aktif yang ter-assign
  pada event.
- Race Pack Digital dan field kontak darurat dapat diaktifkan atau disembunyikan per event.
- Urutan tanggal yang divalidasi berantai: registration start tidak boleh setelah
  registration end, registration end tidak boleh setelah activity start, activity start
  tidak boleh setelah activity end, activity end tidak boleh setelah upload start, dan
  upload start tidak boleh setelah upload end.

## Category

- Category selalu dimiliki event.
- Slug category unik di dalam event.
- Distance meter wajib positif.
- Ranking dan certificate dapat diaktifkan per category.
- Category price disimpan untuk kesiapan fase berbayar, tanpa payment logic MVP.
- Category tidak dihapus hard delete pada slice ini. Admin memakai status active/inactive.
- Minimum age tidak boleh lebih besar dari maximum age.

## Admin Authentication

- Admin login memakai email dan password.
- Password disimpan sebagai Argon2id hash.
- Session memakai opaque token; database hanya menyimpan hash token.
- Cookie session dan CSRF memakai HttpOnly, SameSite Lax, dan Secure pada production.
- State-changing admin action wajib membawa CSRF token yang cocok dengan session.
- Login sukses, login gagal, logout, perubahan event, dan perubahan category membuat audit log.

## Role-Based Access

- Production memakai single-role app-level admin: semua admin aktif dapat mengelola seluruh
  event, peserta, BIB, validation, email, dan sertifikat.
- Tabel `admin_user_roles`, `admin_event_assignments`, dan `event_validator_assignments`
  dipertahankan sebagai legacy compatibility dan tidak menjadi pembatas akses produksi.
- Role legacy `SUPER_ADMIN`, `EVENT_ADMIN`, `VALIDATOR`, dan `REPORT_VIEWER` tidak ditampilkan
  sebagai konsep operasional utama di UI admin.

## Registration

- Peserta tidak membuat akun.
- Satu participant hanya memiliki satu registration per event.
- Participant dapat memilih banyak category dalam satu registration.
- Satu BIB dipakai untuk semua category yang dipilih dalam event yang sama.
- Registration code harus random, sulit ditebak, dan bukan ID sequential.
- Registration code adalah credential: tabel registration menyimpan hash dan lookup hash
  pendek, bukan plaintext.
- Confirmation session dapat menyimpan registration code terenkripsi secara short-lived agar
  halaman confirmation tetap bisa direfresh tanpa query parameter credential.
- Jika email dan phone mengarah ke participant berbeda, pendaftaran ditolak dengan pesan
  generik dan audit/security record.
- Jika participant sudah punya registration aktif pada event yang sama, sistem tidak membuat
  registration atau BIB baru.
- Duplicate submit dengan idempotency key dan payload sama mengembalikan registration yang
  sudah dibuat.
- Umur kategori dihitung terhadap tanggal mulai aktivitas event.
- Gender wajib hanya saat kategori memakai division `MALE` atau `FEMALE`.

## BIB

- BIB unik per event.
- Allocation memakai transaction dan row lock pada `event_bib_settings`.
- Dilarang memakai `SELECT MAX(bib_number) + 1` tanpa locking.
- Image BIB dibuat oleh background job dan registration tetap berhasil saat job pending.
- Nomor display dibentuk dari prefix, sequence numeric, padding, dan suffix.
- Template BIB adalah PNG private object dengan versioning per event.
- Template BIB memiliki lifecycle `DRAFT`, `ACTIVE`, dan `ARCHIVED`; hanya template
  `ACTIVE` yang dipakai untuk generate BIB.
- Upload template JPG dinormalisasi menjadi PNG private object sebelum disimpan.
- Worker memakai Sharp dan SVG text overlay berdasarkan koordinat canvas asli.
- Regenerate membuat document object baru dan audit log; BIB lama tidak menjadi public URL.

## Submission dan Revision

- Submission dilakukan per registration category.
- Minimal salah satu dari screenshot atau activity URL wajib tersedia.
- Revision lama tidak ditimpa; riwayat revision bersifat append-only.
- Revision baru membuat status aggregate kembali ke `SUBMITTED`.
- Activity date wajib berada di dalam periode activity event.
- Upload peserta hanya diterima saat window upload aktif atau ada admin upload override aktif.
- Screenshot dinormalisasi server-side menjadi JPEG tanpa metadata EXIF dan disimpan sebagai
  private object.
- Fase ini tidak membuat server-side draft: submit valid langsung membuat revision
  `SUBMITTED`.
- Approval lama tidak dipakai lagi untuk leaderboard setelah revision baru.
- Admin upload override harus memiliki expiration, reason, actor, dan audit log. Tabel sudah
  tersedia, UI/action override belum dibangun.
- Admin mereview submission dari queue validation dan langsung menyimpan keputusan tanpa step
  claim. Optimistic `review_version` tetap dipakai untuk mencegah keputusan dari tab lama.
- Semua admin aktif dapat melihat dan bertindak pada validation queue lintas event.
- Keputusan validation bersifat append-only di `validation_reviews`; action tidak menghapus
  review sebelumnya.
- Action validation utama UI produksi: `APPROVE`, `REQUEST_REVISION`, dan `REJECT`.
  `DISQUALIFY`, claim/release, restore, dan reopen tetap legacy/internal sampai cleanup
  terpisah.
- `REQUEST_REVISION` mengembalikan submission ke `REVISION_REQUIRED`; peserta boleh
  mengirim revision baru dan aggregate status kembali ke `SUBMITTED`.
- `APPROVED` menetapkan `approved_revision_id` latest dan `ranking_eligible = true`.
- `REJECTED` dan `DISQUALIFIED` tidak eligible ranking.
- Participant hanya melihat status aggregate dan `participant_visible_note`; `internal_note`
  admin tidak boleh ditampilkan di UI peserta.
- Deterministic warning membantu admin melihat jarak, tanggal aktivitas, pace, evidence,
  dan duplicate evidence, tetapi warning tidak otomatis mengambil keputusan.

## Leaderboard

Belum diimplementasikan. Aturan target:

- Hanya latest approved revision yang eligible.
- Ranking utama berdasarkan `elapsed_time_seconds` ascending.
- Waktu sama mendapat competition rank yang sama.
- BIB hanya deterministic display ordering, bukan tie-breaker kompetisi.

## Certificate

- Template sertifikat adalah PNG private object per event; hanya satu template `ACTIVE` per event.
- Sertifikat dibuat per approved registration category saat event berubah ke `COMPLETED`.
- Category harus memiliki `certificate_enabled = true`, submission harus `APPROVED`, dan
  `approved_revision_id` wajib ada.
- Event tanpa template sertifikat tidak membuat job sertifikat dan tidak boleh menyebabkan crash.
- Certificate number dan verification code unik.
- Worker membuat PNG sertifikat dengan Sharp dari template event dan overlay nama peserta,
  event/kategori, BIB, certificate number, dan tanggal validasi.
- Sertifikat v1 dikirim melalui email attachment PNG; belum ada dashboard/download peserta atau
  public verification page.
- Perubahan submission setelah sertifikat terbit harus meng-invalidate sertifikat lama.

## Audit

- Admin action dan perubahan penting wajib memiliki audit log.
- Audit log tidak boleh menyimpan password, session token, API key, atau secret.
- PII dicatat secukupnya untuk kebutuhan operasional dan legal.
