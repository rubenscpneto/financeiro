# Self-hosting (Coolify on a VPS)

Production runs as a Docker container next to a Postgres instance. Auth is Better Auth
(email + password). Files are stored on local disk, not object storage.

## Layout (Coolify project `financeiro`)
- Postgres (self-hosted). Point `DATABASE_URL` at it.
- `financeiro-app`: this repo built with the `Dockerfile` (`output: "standalone"`), served at `https://financeiro.rubenspereira.tech`.
- Persistent volume for statements: mount at `/data/statements` (uid 1000 / `node`).

The container runs `drizzle-kit`-equivalent SQL migrations (`scripts/migrate.mjs`) before starting the Next.js server.

## Environment variables
| Name | Build arg | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | yes | `https://financeiro.rubenspereira.tech` |
| `DATABASE_URL` | no | Postgres connection string |
| `BETTER_AUTH_SECRET` | no | 32+ char secret |
| `BETTER_AUTH_URL` | no | same as `NEXT_PUBLIC_SITE_URL` |
| `STORAGE_DIR` | no | default `/data/statements` |
| `KEK_FILE` | no | path to 32-byte KEK (e.g. `/run/secrets/financeiro_kek`). Never in git, Postgres, or DB backups. |
| `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_ITEM_ID`, `PLUGGY_SYNC_USER_ID`, `PLUGGY_TXN_DATE_FROM` | no | Pluggy |
| `CRON_SECRET` | no | protects `/api/cron/pluggy-sync` |
| `PLUGGY_WEBHOOK_SECRET`, `WEBHOOK_BASE_URL` | no | Pluggy webhooks |
| `RESEND_API_KEY` | no | optional; enables password-reset email |
| `EMAIL_FROM` | no | optional sender for Resend |

## Migration (existing DB with data)
1. Dump GoTrue users into `public.legacy_auth_users` (`id`, `email`, `encrypted_password`, `email_confirmed_at`, `raw_user_meta_data`, `created_at`, `updated_at`).
2. Start the app (or run `node scripts/migrate.mjs`) so baseline + Better Auth tables apply. Migration `0001_better_auth` copies legacy users when that table exists.
3. Optionally re-run `npx tsx scripts/import-legacy-users.ts` (idempotent).
4. Sign in with the previous email/password (bcrypt hashes still verify).

## Envelope encryption (per-user DEK)

Each user has an AES-256-GCM data key (DEK). The DEK is wrapped with a Key
Encryption Key (KEK) and stored in `user_keys`. The KEK is **only** on disk in
the app container (`KEK_FILE`). Phase 0 reads that file; Phase 1 can swap
`KeyProvider` to OpenBao Transit without changing row encryption.

Ciphertext format: `v1:keyId:nonce:ct:tag` (96-bit nonce, AAD = `user_id:column`).
Exact-match / dedup (`external_hash`, Pluggy account ids) uses HMAC-SHA256 blind
indexes. Sums, budgets, and alerts are computed in the app after decrypt.
Authorization is the Better Auth session (or the single configured Pluggy sync
user for cron/webhooks). There is no admin route that decrypts another user's
data.

### Generate and mount the KEK

```bash
# 32 cryptographically random bytes. Keep an offline copy (USB / paper backup
# in a safe). This copy is NOT stored next to Postgres dumps.
openssl rand -out financeiro_kek 32
chmod 400 financeiro_kek
```

Coolify / Docker: mount as a secret, not a bind of the git checkout.

```yaml
# example
volumes:
  - type: secret
    source: financeiro_kek
    target: /run/secrets/financeiro_kek
environment:
  KEK_FILE: /run/secrets/financeiro_kek
```

Never commit `financeiro_kek`, never put it in `DATABASE_URL` backups, never
log it. Losing the KEK means every user's data is unrecoverable.

### Migrate existing plaintext (expand / backfill / contract)

1. **Backup Postgres** (`pg_dump`) **and** copy `KEK_FILE` to offline storage
   (separate from the dump).
2. Deploy this build so `0002_encryption_expand` runs (numeric columns become
   `text`; `user_keys` / `key_grants` created). The app dual-reads leftover
   plaintext and writes ciphertext.
3. **Backfill** (idempotent). Run from a git checkout that can reach Postgres
   (the slim app image has no `tsx` / `src`):

   ```bash
   KEK_FILE=/run/secrets/financeiro_kek DATABASE_URL=... \
     npx tsx scripts/encrypt-existing-data.ts
   ```

4. **Contract / verify** no plaintext amounts or descriptions remain:

   ```bash
   KEK_FILE=/run/secrets/financeiro_kek DATABASE_URL=... \
     npx tsx scripts/encrypt-existing-data.ts --verify
   ```

Statement PDFs under `STORAGE_DIR` are encrypted in place by the same script.

### Rotate keys

- **KEK rotation** (rewrap DEKs only):

  ```bash
  KEK_FILE_OLD=/run/secrets/financeiro_kek_old \
  KEK_FILE=/run/secrets/financeiro_kek_new \
  npx tsx scripts/rewrap-deks.ts
  ```

  Then point `KEK_FILE` at the new secret and restart. Keep the old KEK offline
  until you confirm login + painel for each user.

- **DEK rotation** (re-encrypt all rows and files; blind-index key is kept so
  dedup hashes stay valid):

  ```bash
  KEK_FILE=/run/secrets/financeiro_kek npx tsx scripts/rotate-deks.ts
  ```

### Delete a user

`DELETE` on Better Auth `user` cascades to `user_keys`. To shred immediately:

```bash
npx tsx scripts/destroy-user-dek.ts <user-uuid>
```

That drops the wrapped DEK and deletes `STORAGE_DIR/<user-uuid>`. Remaining
ciphertext is unreadable.

### Backup policy

| What | Where |
|---|---|
| Postgres dump | usual backup disk / object storage |
| KEK file | **offline, separate**, at least two copies |
| Statement files | volume `STORAGE_DIR` (already ciphertext) |

A stolen DB dump without the KEK cannot be decrypted.

## Cron
`vercel.json` crons do not run outside Vercel. A Coolify scheduled task calls
`/api/cron/pluggy-sync` daily at 16:00 UTC with `Authorization: Bearer $CRON_SECRET`.

## Email
Sign-up is disabled (`disableSignUp: true`). Password reset emails are sent only when
`RESEND_API_KEY` is set.
