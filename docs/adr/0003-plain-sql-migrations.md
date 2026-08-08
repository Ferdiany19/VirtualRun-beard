# ADR 0003: Plain SQL Migrations

Date: 2026-07-23

## Status

Accepted

## Context

Migration harus sederhana, berurutan, dapat diaudit, dan tidak bergantung pada ORM.

## Decision

Gunakan file SQL berurutan di `src/db/migrations` dan runner TypeScript sederhana.
Runner mencatat version, name, checksum, dan applied timestamp di `schema_migrations`.

## Consequences

- Migration berjalan satu kali.
- Perubahan file migration yang sudah applied terdeteksi lewat checksum.
- Tidak ada automatic down migration.
- Rollback destructive harus ditulis dan direview manual.
