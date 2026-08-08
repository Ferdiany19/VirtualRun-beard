# Decisions and Assumptions

## Decisions

| Date       | Decision                                                                                      | Reason                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 2026-07-23 | Modular monolith dengan web dan worker process.                                               | Memenuhi kebutuhan production tanpa kompleksitas microservices.                            |
| 2026-07-23 | PostgreSQL + `pg` + raw parameterized SQL.                                                    | Sesuai constraint, auditable, dan menghindari ORM/query builder.                           |
| 2026-07-23 | Plain SQL migration runner tanpa down migration otomatis.                                     | Rollback destructive harus eksplisit dan direview.                                         |
| 2026-07-23 | Event status memakai text + CHECK constraint, bukan PostgreSQL enum.                          | Lebih mudah ditambah melalui migration sederhana tanpa operasi enum yang sulit rollback.   |
| 2026-07-23 | Participant active uniqueness memakai partial unique index pada email dan phone.              | Mendukung soft delete tanpa kehilangan audit history.                                      |
| 2026-07-23 | Foundation tidak mengimplementasikan registration, BIB, submission, leaderboard, certificate. | Brief meminta fondasi selesai sebelum fitur tersebut.                                      |
| 2026-07-23 | Public event routes dynamic server-rendered untuk slice ini.                                  | Menghindari draft leakage dari static cache sampai invalidation strategy final dibuat.     |
| 2026-07-23 | Banner seed memakai fixture lokal development.                                                | Upload R2 belum masuk scope slice ini; tombol upload palsu tidak dibuat.                   |
| 2026-07-23 | FAQ event disimpan sebagai JSONB array sementara.                                             | Cukup maintainable untuk MVP slice tanpa membuat entity baru sebelum kebutuhan final.      |
| 2026-07-23 | VirtualRun Mockup PDF menjadi design reference utama untuk UI public dan admin.               | Menjaga arah visual event olahraga yang konsisten dengan brief produk.                     |
| 2026-07-23 | UI mengikuti karakter mockup, bukan pixel-perfect copy.                                       | Data nyata, accessibility, dan business rules lebih penting daripada kesamaan visual.      |
| 2026-07-23 | Design system memakai navy, teal, orange, neutral surface, dan semantic status colors.        | Membuat public dan admin terasa satu produk tanpa gradient/glassmorphism generik.          |
| 2026-07-23 | UI tidak membuat fitur atau data palsu untuk menyamai mockup.                                 | Registration, BIB, upload, validator, certificate, sponsor, dan metric tetap sesuai scope. |
| 2026-07-24 | Registration code disimpan sebagai hash; session/job hanya menyimpan code terenkripsi.        | Code adalah credential tetapi email/confirmation tetap perlu menampilkannya secara aman.   |
| 2026-07-24 | BIB allocation memakai row lock pada `event_bib_settings.next_sequence`.                      | Menghindari race condition dan tidak bergantung pada `SELECT MAX(...) + 1`.                |
| 2026-07-24 | Template BIB memakai PNG private object dan versioning per event.                             | Worker dapat merender ulang dokumen dengan konfigurasi/template yang dapat diaudit.        |
| 2026-07-26 | Template BIB memakai lifecycle draft, active, dan archived di Nest API.                       | Dashboard global membutuhkan save draft/publish/archive yang berfungsi tanpa menghapus versi lama. |
| 2026-07-26 | Create event admin memakai endpoint Nest terpadu dengan kategori, banner, benefit, dan SEO.   | Halaman create baru harus menyimpan semua field dalam satu flow tanpa mengembalikan SQL/backend logic ke Next UI. |
| 2026-07-26 | Upload JPG template BIB dinormalisasi menjadi PNG private object.                             | UI menerima PNG/JPG, sementara renderer worker tetap memakai pipeline PNG yang konsisten. |
| 2026-07-24 | Local storage dan log email hanya development-only.                                           | Membuat slice bisa dicoba lokal tanpa melemahkan production security.                      |
| 2026-07-24 | Submission fase awal tidak memakai server-side draft.                                         | Submit valid langsung mencatat revision append-only `SUBMITTED`; validasi admin fase lain. |
| 2026-07-24 | Screenshot submission dinormalisasi server-side menjadi JPEG private object.                  | Menghapus metadata, menyeragamkan preview, dan menjaga evidence tetap tidak public.        |
| 2026-07-24 | Validation memakai claim dengan expiry dan optimistic `review_version`.                       | Mengurangi race condition antar validator tanpa memperkenalkan queue eksternal.            |
| 2026-07-24 | Validation review bersifat append-only dan participant note dipisah dari internal note.       | Menjaga audit trail sekaligus mencegah catatan internal bocor ke peserta.                  |
| 2026-07-24 | Warning validation deterministic tidak otomatis menentukan keputusan.                         | Reviewer tetap bertanggung jawab atas approve/reject, warning hanya alat bantu review.     |
| 2026-07-26 | Repository menjadi pnpm workspace `frontend/` + `backend/`, dengan NestJS sebagai backend API. | Memisahkan boundary HTTP/backend tanpa memperkenalkan microservice atau teknologi terlarang. |

## Assumptions

- Domain sementara adalah `beard.com`.
- Event MVP gratis, tetapi kolom mode dan price disiapkan untuk fase berbayar.
- Nomor HP dengan awalan `628` diterima sebagai variasi input umum dan disimpan menjadi `+628`.
- Gender dan tanggal lahir tetap optional kecuali kategori memakai age/gender requirement.
- R2/local private storage dipakai untuk BIB template/final document, submission evidence, dan banner event.
- Email delivery provider belum dipilih; production memakai konfigurasi SMTP generik.
- Upload submission fase ini ditargetkan melewati Nest API multipart, bukan presigned direct upload.
- Backup Google Drive akan memakai `rclone`, karena mendukung OAuth user dan Shared Drive service account.
- Retention MVP manual dan configurable, belum ada auto-delete data peserta.
- Development admin default adalah `admin@beard.test`; password harus diganti dengan command
  `admin:set-password` setelah seed lokal.
- Publish event membutuhkan minimal satu kategori aktif agar landing page tidak kosong.

## Open Questions

- Apakah organizer perlu multi-event tenancy dengan assignment validator sejak MVP?
- Field participant apa saja yang wajib secara legal dan operasional?
- Apakah age division dihitung dari tanggal event start atau tanggal activity?
- Apakah leaderboard publik menyembunyikan sebagian identitas secara default?
- Email provider mana yang akan digunakan untuk registration/submission notification di production?
- Apakah certificate output final berupa PDF saja atau PNG + PDF?
- Kebijakan retention data pribadi final mengikuti durasi berapa lama setelah event selesai?
