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

## Cron
`vercel.json` crons do not run outside Vercel. A Coolify scheduled task calls
`/api/cron/pluggy-sync` daily at 16:00 UTC with `Authorization: Bearer $CRON_SECRET`.

## Email
Sign-up is disabled (`disableSignUp: true`). Password reset emails are sent only when
`RESEND_API_KEY` is set.
