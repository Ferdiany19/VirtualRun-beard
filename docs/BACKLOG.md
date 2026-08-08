# Phased Backlog

## Phase 0 - Foundation

Status: completed for original foundation; NestJS workspace migration foundation is in
progress.

- Next.js App Router, TypeScript strict, Tailwind.
- Environment validation.
- Database pool dan transaction helper.
- Plain SQL migration runner.
- Initial migrations: admin auth, events, categories, participants, audit logs.
- Base public shell dan admin shell.
- Test setup.
- Deployment dan backup documentation.
- Finish frontend boundary rewrite so Next SSR/pages/actions call Nest API instead of
  importing `db`, repositories, or services directly.

Dependencies: none.

## Phase 1 - Admin Authentication and RBAC

Status: implemented for base admin event management.

- Implement admin login/logout.
- Argon2id password hash.
- Session token hashing, cookie, expiration, revocation.
- CSRF protection.
- Login rate limit.
- Role guard dan server-side authorization.
- Audit login success/failure.

Dependencies: Phase 0 schema.

## Phase 2 - Event and Category Management

Status: implemented for core vertical slice.

- Admin CRUD event.
- Status transition service.
- Category CRUD.
- Event publication controls.
- Landing page reads published event from PostgreSQL.
- Public landing page reads published event from PostgreSQL.
- Mobile and desktop UI review screenshots remain pending until a database-backed local run
  is available.

Dependencies: Phase 1 auth.

## Phase 3 - Registration

Status: implemented as part of current registration/BIB vertical slice.

- Participant normalization and upsert policy.
- Registration form without participant login.
- Multi-category selection.
- Idempotency key and duplicate protection.
- Turnstile verification.
- Registration code generation and hashing.
- Registration confirmation.

Dependencies: Phase 2 event/category, Phase 1 security.

## Phase 4 - BIB

Status: implemented as part of current registration/BIB vertical slice.

- BIB settings and template upload.
- Coordinate editor.
- Race-condition safe BIB allocation with row lock.
- PostgreSQL job queue.
- Sharp-based BIB generation.
- Signed URL download.

Dependencies: Phase 3 registration, storage foundation, jobs foundation.

## Phase 5 - Submission and Validation

Status: implemented untuk upload hasil, revision history, validation queue, validator
assignment, claim review, keputusan validation, audit review, dan notification job dasar.
Leaderboard, certificates, payment, dan export tetap belum aktif.

- Upload lookup using event, registration code, and email. Implemented via participant access
  session.
- Submission per registration category. Implemented.
- Revision history. Implemented append-only.
- Screenshot/activity URL validation. Implemented basic evidence requirement and image
  normalization.
- Validator queue. Implemented.
- Approve, request revision, reject, disqualify. Implemented.
- Restore/reopen internal action tersedia di service policy, tetapi belum dibuka sebagai UI
  umum.
- Audit every validation action. Implemented for validation workflow.

Dependencies: Phase 3 registration, Phase 4 storage/jobs.

## Phase 6 - Leaderboard

- Eligibility policy.
- Latest approved revision query.
- Competition rank with ties.
- Pagination, search, divisions.
- Explicit recalculation job and timestamps.

Dependencies: Phase 5 validation.

## Phase 7 - Certificates

- Certificate template editor.
- Certificate number and verification code.
- Sharp/PDF generation.
- Public verification page with minimal PII.
- Invalidation and regeneration after approved revision changes.

Dependencies: Phase 5 validation, Phase 4 jobs/storage.

## Phase 8 - Reporting and Export

- Admin dashboard KPIs with useful filters.
- Server-side filtering, sorting, pagination.
- Excel export job with required sheets.
- PII-minimized default report.

Dependencies: Phase 5 validation, Phase 6 leaderboard.

## Phase 9 - Operations Hardening

- Full backup automation validation.
- Restore drill.
- Log rotation review.
- Deployment runbook dry run.
- Playwright critical journeys.

Dependencies: Phases 1-8 as relevant.

## Phase 10 - Paid Event Extension

- Payment schema.
- Payment status.
- Proof/callback/refund model.
- Payment expiration.

Dependencies: Free registration stable in production.
