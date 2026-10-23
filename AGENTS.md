<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent guide

This personal finance web app/PWA supports Pluggy open-finance sync, budgets, goals, and investments. This guide is the source of truth for repository conventions and agent workflows.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, and shadcn/ui; Postgres via Drizzle ORM with Supabase migrations; better-auth for authentication. Use npm (`package-lock.json`); deployment targets Vercel (`vercel.json`). Dependencies and scripts are defined in `package.json`.

## Commands

| Command | Purpose / package script |
| --- | --- |
| `npm ci` | Install locked dependencies |
| `npm run dev` | `next dev` |
| `npm run build` | `next build` |
| `npm run start` | `next start` |
| `npm run lint` | `eslint` |
| `npm test` | `tsx --test src/lib/crypto/*.test.ts` |
| `npm run db:migrate` | `drizzle-kit migrate` — only when asked |

Run lint, test, and build before a PR: `npm run lint`, `npm test`, `npm run build`.
Do not run migrations or `encrypt:*` scripts unless explicitly asked.

## Branches & PRs

- There is no `homolog` branch. Work on `feat/*` or `fix/*` branches.
- Open PRs to `main`, the default branch. Never push directly to `main`.
- Agents must never merge or deploy. Merges require Rubens's approval.

## Hard rules

- This repository is public: never include secrets, personal/financial data, or server/VPS details.
- Document environment variable names and safe placeholders in `.env.example`; never include real values.
- Do not change environment variables or apply migrations unless asked.
- Do not switch package managers or introduce a second database layer.
- Use synthetic data only in fixtures and docs; never real financial data.

## Superpowers (dev workflow)

Workflow skills are vendored from [obra/superpowers](https://github.com/obra/superpowers) (MIT License, Copyright (c) 2025 Jesse Vincent). Full license: `.agents/skills/LICENSE-superpowers`.

Skills live at `.agents/skills/<skill-name>/SKILL.md`, the canonical location. They are always on; do not wait for a Marketplace plugin, an @-mention, or the user to enable them.

At the start of a task, follow `using-superpowers`. If there is even a 1% chance another skill applies, read its `SKILL.md` and follow it. Announce `Using [skill] to [purpose]`. Skip a Superpowers workflow only when the user explicitly says to skip it. User instructions in this file take precedence over skills.

| Skill | Use when |
| --- | --- |
| `using-superpowers` | Starting a task; finding and following skills |
| `brainstorming` | Before new features, behavior changes, or design work |
| `writing-plans` | After a spec exists, before code on multi-step work |
| `executing-plans` | Implementing a written plan in this session |
| `subagent-driven-development` | Implementing a plan with a subagent per task plus review |
| `test-driven-development` | Features or bugfixes that have or should have automated tests |
| `systematic-debugging` | Bugs, failures, or unexpected behavior |
| `verification-before-completion` | Before claiming done, fixed, or passing |
| `using-git-worktrees` | Isolated workspaces for feature work |
| `finishing-a-development-branch` | Checks pass; considering PR or cleanup, subject to branch rules above |
| `dispatching-parallel-agents` | Two or more independent tasks |
| `requesting-code-review` | Before merge or after a major task |
| `receiving-code-review` | Acting on review feedback |
| `writing-skills` | Creating or editing skills |
| `diagnosing-superpowers` | A Superpowers session went wrong |

Use process skills first (brainstorming, systematic-debugging), then implementation skills. Domain skills in `.agents/skills/` also apply: `pluggy-*` for Pluggy integrations and open-finance data; `supabase*` for Supabase and Postgres work.

## Repository map

| Area | Contents |
| --- | --- |
| `src/app/` | App Router pages, authenticated finance routes, auth routes, Pluggy webhook and cron APIs |
| `src/components/` | Finance screens, auth forms, app shell, and shared UI primitives |
| `src/lib/pluggy/` | Pluggy API client, item storage, data mapping, and sync |
| `src/lib/investments/` | Investment valuation and evolution calculations |
| `src/lib/crypto/` | Envelope encryption, key providers, user keys, row codecs, rotation, and tests |
| `src/lib/actions/` | Server actions for authentication, CRUD, and imports |
| `src/lib/parsers/` | C6 CSV, OFX, and PDF import parsers, detection, normalization, and rules |
| `src/db/` | Drizzle database client and schema |
| `drizzle/` | Drizzle SQL migrations and migration journal |
| `supabase/migrations/` | Supabase SQL migrations for Pluggy sync, investments, and indexes |
| `scripts/` | Migration/import utilities, parser checks, webhook registration, and encryption maintenance |
| `docs/` | Operational guides, implementation plans, decisions, and agent learnings |

Deeper docs: docs/ · Decisions: docs/decisions/ · Learnings: docs/agent-learnings.md · Skills: .agents/skills/

## Keep docs current (mandatory)

- PRs changing commands, structure, environment variables, dependencies, or conventions must update `AGENTS.md` and/or relevant docs in the same PR.
- Record non-trivial decisions in `docs/decisions/NNNN-*.md` using the ADR format.
- Append gotchas to `docs/agent-learnings.md`.
- Every PR must state `Docs updated: yes/n.a.`.
