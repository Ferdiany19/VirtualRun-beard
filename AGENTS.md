# AGENTS.md

## Project identity

This repository contains a production-oriented Virtual Run platform for Indonesian participants and event administrators.

Primary language for user-facing content: Bahasa Indonesia.

Business timezone: Asia/Jakarta.

The application is a modular monolith deployed natively on Ubuntu.

## Mandatory technology

- Next.js App Router.
- TypeScript strict mode.
- PostgreSQL.
- Raw parameterized SQL through `pg`.
- Zod.
- Tailwind CSS.
- Cloudflare R2.
- Sharp.
- ExcelJS.
- Nginx.
- systemd.
- PostgreSQL-backed job queue.
- pnpm.

## Prohibited technology

Do not introduce:

- Docker or Docker Compose.
- Kubernetes.
- ORM or query builder.
- Prisma.
- Sequelize.
- TypeORM.
- Drizzle.
- Redis.
- BullMQ.
- Microservices.
- GraphQL.
- Firebase.
- Supabase.
- External monitoring platforms.

A prohibited dependency may only be added after an explicit user instruction changes this document.

## Architecture rules

- Keep the application as a modular monolith.
- Organize code by business feature.
- SQL belongs only in repository modules.
- Business rules belong in services or domain policies.
- HTTP parsing belongs in route handlers.
- React components must not query the database.
- Do not put SQL inside route handlers or server actions.
- Do not create a generic repository abstraction.
- Do not use a global `utils.ts` dumping ground.
- Do not introduce a new production dependency without explaining why existing code cannot solve the requirement cleanly.

## SQL rules

- Use parameterized queries for every external value.
- Never interpolate user-provided values into SQL.
- Use explicit column lists; do not use `SELECT *`.
- Dynamic identifiers must come from internal allowlists.
- Transactions must use one checked-out client from BEGIN through COMMIT or ROLLBACK.
- Protect integrity with database constraints.
- Concurrent BIB allocation must use transaction locking.
- Migrations are plain, versioned SQL.
- Update `docs/DATABASE.md` after schema changes.

## Core business rules

- One participant represents one person.
- Active participant email is globally unique after normalization.
- Active participant phone number is globally unique after normalization.
- One participant may join multiple events.
- One participant has one event registration per event.
- One event registration may contain multiple event categories.
- One participant uses one BIB across categories within the same event.
- BIB numbers are unique per event.
- Submission is managed per registered category.
- Submission revisions are append-only; never overwrite prior revisions.
- Participants may submit revisions while the upload period or an explicit admin override is active.
- Only the latest approved revision is eligible for ranking.
- Certificates are generated per approved registered category.
- Event payment is an extension point and is not part of the MVP.
- Data retention is currently indefinite but must remain configurable.

Read `docs/BUSINESS_RULES.md` before changing domain behavior.

## Security rules

- Validate all external input with Zod.
- Enforce authorization on the server.
- Never store admin tokens in localStorage.
- Use HttpOnly secure sessions.
- Do not expose raw database errors.
- Do not log passwords, session tokens, API keys or storage secrets.
- Avoid logging participant personal data.
- Public registration and submission endpoints require rate limiting and Turnstile verification.
- Uploaded objects remain private in R2.
- File extension and browser Content-Type are not trusted.
- Create audit records for significant administrator actions.

Read `docs/SECURITY.md` before modifying authentication, authorization, upload or public access flows.

## UI rules

The UI must look intentionally designed, not like a generic AI-generated SaaS template.

Do not use:

- decorative gradients without event branding.
- glassmorphism.
- neon glow.
- random blobs.
- generic 3D illustrations.
- excessive shadows.
- excessive rounded cards.
- pill-shaped controls everywhere.
- fake testimonials.
- fake sponsors.
- fake metrics.
- lorem ipsum.
- default shadcn styling without customization.
- meaningless icons.
- decorative charts without operational value.
- giant empty hero sections.
- generic motivational copy.

Use:

- strong editorial hierarchy.
- restrained neutral palette.
- configurable event brand color.
- clear tables and filters.
- consistent status components.
- real Bahasa Indonesia copy.
- accessible form labels.
- visible focus states.
- minimum 44 px touch targets.
- mobile-first layouts.
- useful empty, error and loading states.
- information-dense but readable admin screens.

Review `docs/UI_GUIDELINES.md` before building or changing user interfaces.

## Workflow

Before coding:

1. Inspect existing code.
2. Read relevant project documentation.
3. State assumptions that materially affect the implementation.
4. Plan the smallest coherent change.
5. Do not modify unrelated files.

After coding:

1. Run formatting.
2. Run lint.
3. Run TypeScript typecheck.
4. Run relevant tests.
5. Run build when the change can affect production compilation.
6. Update documentation.
7. Report changed files and actual command results.
8. Report remaining risks honestly.

Never claim a command passed unless it was executed.

## Required commands

Use the commands defined in `package.json`.

At minimum, expect commands equivalent to:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:integration`
- `pnpm build`
- `pnpm db:migrate`

Do not silently weaken a test, lint rule or TypeScript configuration to make a task pass.

## Documentation contract

Keep these documents aligned with the implementation:

- `docs/PROJECT_SCOPE.md`
- `docs/BUSINESS_RULES.md`
- `docs/ARCHITECTURE.md`
- `docs/DATABASE.md`
- `docs/API_CONTRACT.md`
- `docs/SECURITY.md`
- `docs/UI_GUIDELINES.md`
- `docs/DEPLOYMENT.md`
- `docs/BACKUP_RESTORE.md`
- `docs/DECISIONS.md`
- `docs/BACKLOG.md`

When code and documentation disagree, investigate the implementation and update the incorrect side. Do not leave them knowingly inconsistent.

## Change discipline

- Keep tasks scoped to one milestone or one coherent feature.
- Prefer simple, explicit code over clever abstractions.
- Preserve existing business behavior unless the task explicitly changes it.
- Do not refactor unrelated code while adding a feature.
- Do not leave visible placeholders or unfinished production paths.
- Add TODO only with a corresponding backlog reference.
- Record significant architecture decisions in `docs/DECISIONS.md`.
- Ask before making destructive database changes when data already exists.

## Code review rules

Flag any change that introduces:

- SQL interpolation.
- missing authorization.
- missing event deadline validation.
- missing transaction around multi-step writes.
- unsafe concurrent BIB allocation.
- mutation of previous submission revisions.
- public R2 objects containing participant data.
- missing audit logging for sensitive admin actions.
- personal data in logs.
- business logic inside UI components.
- generic AI-template visual patterns.
- fake UI content.
- undocumented schema changes.
- a prohibited dependency.
