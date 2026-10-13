# Per-user envelope encryption

> **For agentic workers:** Use superpowers:executing-plans. Native inline execution.

**Goal:** Encrypt each user's sensitive financial data with a per-user DEK so a DB admin cannot read other users' data.

**Architecture:** Envelope encryption (AES-256-GCM DEK per user, wrapped by a KEK never stored in Postgres). KeyProvider interface: Phase 0 file KEK, Phase 1 OpenBao Transit. Blind indexes (HMAC-SHA256) for exact-match/dedup. Better Auth session is the only decrypt authorization.

**Tech Stack:** Next.js 16, Drizzle, Better Auth, Postgres, node:crypto

**Spec:** User request 2026-10-13 (this branch)

## Global Constraints

- Ciphertext format `v1:keyId:nonce:ct:tag` (AES-256-GCM, 96-bit nonce, AAD = user_id + column name)
- KEK from `KEK_FILE` only; never git, Postgres, or DB backups
- Numeric columns become text ciphertext (expand/backfill/contract)
- Plaintext: user_id, ids/FKs, dates, type/status, fixed-list category
- Sums/budgets computed in-app after decrypt
- `npm test`, `npm run lint`, `npm run build` must pass
