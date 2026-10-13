# Self-hosting (Coolify on a VPS)

Production can run outside Vercel as a Docker container next to a self-hosted Supabase stack.

## Layout (Coolify project `financeiro`)
- `financeiro-supabase`: trimmed Supabase stack (db, auth, rest, storage with file backend, meta, studio, kong). Kong has **no public domain**; it is reachable only on the internal Docker network.
- `financeiro-app`: this repo built with the `Dockerfile` (`output: "standalone"`), served at `https://financeiro.rubenspereira.tech`.

All Supabase calls happen server-side (server components, server actions, route handlers, middleware), so `NEXT_PUBLIC_SUPABASE_URL` points at the internal Kong URL (`http://supabase-kong-<uuid>:8000`).

## Environment variables
| Name | Build arg | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | internal Kong URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes | self-hosted anon key |
| `NEXT_PUBLIC_SITE_URL` | yes | `https://financeiro.rubenspereira.tech` |
| `SUPABASE_SERVICE_ROLE_KEY` | no | self-hosted service key |
| `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_ITEM_ID`, `PLUGGY_SYNC_USER_ID`, `PLUGGY_TXN_DATE_FROM` | no | Pluggy |
| `CRON_SECRET` | no | protects `/api/cron/pluggy-sync` |
| `PLUGGY_WEBHOOK_SECRET`, `WEBHOOK_BASE_URL` | no | Pluggy webhooks |

## Cron
`vercel.json` crons do not run outside Vercel. A Coolify scheduled task calls
`/api/cron/pluggy-sync` daily at 16:00 UTC with `Authorization: Bearer $CRON_SECRET`.

## Email
The self-hosted GoTrue has no SMTP configured, so sign-up confirmation and password-reset emails are not sent. Sign-up is disabled (single user). Configure `SMTP_*` on the Supabase service to enable them.
