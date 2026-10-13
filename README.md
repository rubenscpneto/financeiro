# Financeiro

Personal finance app. Postgres + Drizzle ORM + Better Auth. Open Finance data via Pluggy.

## Stack
- Next.js App Router
- Drizzle ORM (`postgres` driver) on `DATABASE_URL`
- Better Auth (email + password, sign-up disabled)
- Local disk storage for statement files (`STORAGE_DIR`)

## Setup

```bash
cp .env.example .env.local
npm install
npx drizzle-kit migrate
npx tsx scripts/import-legacy-users.ts   # if migrating from Supabase/GoTrue
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

See [docs/SELF_HOSTING.md](docs/SELF_HOSTING.md) for Docker/Coolify.

## Scripts
- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint`
- `npm run db:migrate` — apply Drizzle migrations
- `npm run db:import-users` — import `legacy_auth_users` into Better Auth tables
