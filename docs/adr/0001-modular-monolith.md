# ADR 0001: Modular Monolith

Date: 2026-07-23

## Status

Accepted

## Context

Virtual Run Beard membutuhkan web application, admin operation, public participant flow,
background jobs, reporting, and asset generation. Kompleksitas domain cukup tinggi, tetapi
produk belum membutuhkan independent scaling per domain.

## Decision

Gunakan modular monolith dalam satu repository. Repository dapat menghasilkan dua process:
Next.js web application dan background worker.

## Consequences

- Boundary module harus dijaga melalui struktur folder dan review.
- Shared database transaction lebih sederhana.
- Deployment VPS tanpa Docker lebih mudah.
- Jika scale meningkat, module boundary yang baik dapat menjadi dasar ekstraksi service di
  masa depan.
