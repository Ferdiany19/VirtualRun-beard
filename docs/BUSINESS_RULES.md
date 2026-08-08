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
- Publish event membutuhkan minimal satu kategori aktif.
- Urutan tanggal yang divalidasi: start tidak boleh setelah end untuk registration,
  activity, dan upload. Upload end juga tidak boleh sebelum activity start.

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

- `SUPER_ADMIN` dapat mengelola seluruh event.
- `EVENT_ADMIN` dapat mengelola event yang dibuatnya atau event yang ditugaskan melalui
  `admin_event_assignments`.
- `VALIDATOR` dan `REPORT_VIEWER` sudah tersedia sebagai role tetapi dashboard lengkapnya
  belum dibangun pada slice ini.

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
- Admin/validator mereview submission dari queue validation. Claim review memiliki expiry
  (`REVIEW_CLAIM_DURATION_MINUTES`) dan optimistic `review_version`.
- Validator yang bukan event manager hanya dapat melihat/bertindak pada event yang memiliki
  assignment aktif.
- Keputusan validation bersifat append-only di `validation_reviews`; action tidak menghapus
  review sebelumnya.
- Action validation utama: `START_REVIEW`, `RELEASE_CLAIM`, `APPROVE`,
  `REQUEST_REVISION`, `REJECT`, `DISQUALIFY`, dan override claim oleh event manager.
- `REQUEST_REVISION` mengembalikan submission ke `REVISION_REQUIRED`; peserta boleh
  mengirim revision baru dan aggregate status kembali ke `SUBMITTED`.
- `APPROVED` menetapkan `approved_revision_id` latest dan `ranking_eligible = true`.
- `REJECTED` dan `DISQUALIFIED` tidak eligible ranking.
- Participant hanya melihat status aggregate dan `participant_visible_note`; `internal_note`
  validator tidak boleh ditampilkan di UI peserta.
- Deterministic warning membantu reviewer melihat jarak, tanggal aktivitas, pace, evidence,
  dan duplicate evidence, tetapi warning tidak otomatis mengambil keputusan.

## Leaderboard

Belum diimplementasikan. Aturan target:

- Hanya latest approved revision yang eligible.
- Ranking utama berdasarkan `elapsed_time_seconds` ascending.
- Waktu sama mendapat competition rank yang sama.
- BIB hanya deterministic display ordering, bukan tie-breaker kompetisi.

## Certificate

Belum diimplementasikan. Aturan target:

- Sertifikat dibuat per approved registration category.
- Certificate number dan verification code unik.
- Perubahan submission setelah sertifikat terbit harus meng-invalidate sertifikat lama.

## Audit

- Admin action dan perubahan penting wajib memiliki audit log.
- Audit log tidak boleh menyimpan password, session token, API key, atau secret.
- PII dicatat secukupnya untuk kebutuhan operasional dan legal.
