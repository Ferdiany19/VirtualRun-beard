# Project Scope

## Tujuan

Membangun platform Virtual Run production-grade untuk peserta di Indonesia dan admin event.
MVP mendukung event gratis, pendaftaran peserta tanpa akun, upload hasil tanpa login,
validasi admin, leaderboard, sertifikat digital, reporting, backup, dan deployment VPS
tanpa Docker.

## Scope Saat Ini

Sudah dibuat:

- Next.js App Router dengan TypeScript strict.
- Struktur modular berbasis domain.
- Validasi environment.
- Error handling dasar dan correlation ID.
- PostgreSQL pool, transaction helper, dan plain SQL migration runner.
- Initial migration untuk admin authentication, events, categories, participants, dan audit logs.
- Shell public dan admin dengan design tokens dasar.
- Unit/integration test setup.
- Dokumentasi arsitektur, database, API, security, UI, deployment, backup, decisions, dan backlog.
- Contoh konfigurasi systemd, Nginx, logrotate, dan script backup/restore/verify.
- Admin authentication server-side dengan Argon2id, opaque session token hash, HttpOnly
  cookie, CSRF token, logout, login rate limiting, dan audit log.
- Single active admin app-level authorization. Role dan assignment lama tetap ada sebagai
  legacy schema compatibility.
- Event management: list, search, filter status, create, edit, publish, unpublish, archive,
  dan preview.
- Category management: create, edit, active/inactive, display order.
- Public routes `/`, `/events`, dan `/events/[slug]` untuk event published.
- Development seed untuk `Nusantara Virtual Run 2026`.
- Registrasi peserta publik tanpa akun di `/events/[slug]/register`.
- Participant access session HttpOnly untuk confirmation dan BIB peserta.
- Participant identity resolution berdasarkan normalized email dan normalized phone.
- Idempotency key, Turnstile verification, dan rate limit dasar untuk public registration.
- Event registration, multi-category registration, dan BIB allocation transaction-safe.
- BIB template PNG, settings per event, active template version, dan private BIB document.
- PostgreSQL-backed background job queue untuk `GENERATE_BIB` dan
  `SEND_REGISTRATION_CONFIRMATION`.
- Worker Sharp untuk render BIB dari template PNG dan SVG text overlay.
- Storage adapter private: Cloudflare R2 untuk production dan local adapter development-only.
- Email confirmation adapter: SMTP untuk production dan log adapter development-only.
- Admin participant list, participant detail/edit, BIB regenerate/retry, dan BIB download.
- Participant dashboard untuk BIB dan submission per kategori.
- Upload hasil peserta dengan activity URL dan/atau screenshot private object.
- Revision history append-only; submit revisi baru tidak menimpa revision lama.
- Admin validation queue, detail review, direct decision tanpa claim, dan deterministic warning.
- Keputusan validation UI produksi: approve, request revision, dan reject. Disqualify tetap
  legacy/internal.
- Validation review append-only dan audit log untuk action penting.
- Participant melihat status validation dan catatan admin yang participant-visible.
- Notification job untuk revision request, approved, rejected, disqualified, dan revised submission.
- Template sertifikat PNG per event, certificate records, worker render PNG, dan email attachment
  ketika event diselesaikan.
- Worker handler `CLEAN_EXPIRED_UPLOADS` untuk membersihkan upload session expired.

## Tidak Termasuk Foundation

Belum diimplementasikan:

- Leaderboard calculation.
- Public certificate verification page dan dashboard/download peserta untuk sertifikat.
- Export Excel.
- Payment gateway.
- Upload banner R2. Untuk development tersedia fixture lokal eksplisit.

## Non-Goals MVP

- Akun/login peserta.
- Event berbayar aktif.
- Integrasi payment gateway.
- Dashboard marketing dengan metrik palsu.
- Monitoring eksternal.
- Docker, Kubernetes, Redis, ORM, query builder, atau GraphQL.

## Target Pengguna

- Peserta Virtual Run di Indonesia yang memakai perangkat mobile.
- Admin organizer.
- Admin organizer yang mengelola event, peserta, BIB, validasi hasil, email, dan sertifikat.

## Timezone

Semua deadline bisnis menggunakan `Asia/Jakarta` dan ditampilkan sebagai WIB.
Timestamp disimpan sebagai `timestamptz` di PostgreSQL.
