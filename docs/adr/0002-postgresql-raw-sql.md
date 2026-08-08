# ADR 0002: PostgreSQL and Raw SQL

Date: 2026-07-23

## Status

Accepted

## Context

Brief melarang ORM dan query builder. Domain membutuhkan constraint kuat, locking untuk BIB,
query leaderboard/report yang eksplisit, dan migration yang mudah diaudit.

## Decision

Gunakan PostgreSQL dengan package `pg` dan raw parameterized SQL.

## Consequences

- Repository wajib menulis nama kolom eksplisit.
- Input pengguna wajib memakai parameterized values.
- Dynamic identifier wajib memakai allowlist.
- Database constraint menjadi bagian dari business safety.
- Developer perlu review SQL lebih disiplin.
