# ADR 0004: Public Participant Without Login

Date: 2026-07-23

## Status

Accepted

## Context

Peserta virtual run tidak boleh diwajibkan membuat akun. Namun registration code dan upload
flow tetap menjadi credential yang perlu dilindungi.

## Decision

Peserta memakai event context, normalized email, dan registration code untuk flow upload.
Token credential disimpan sebagai hash. Public form harus memakai rate limit, Turnstile,
server-side validation, idempotency key, duplicate protection, dan generic sensitive error.

## Consequences

- UX peserta lebih ringan.
- Security bergantung pada token randomness, hashing, rate limit, dan validasi server-side.
- Admin auth tetap terpisah dan tidak boleh dipindahkan ke client state.
