<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Superpowers (dev workflow)

Workflow skills are vendored from [obra/superpowers](https://github.com/obra/superpowers) (MIT License, Copyright (c) 2025 Jesse Vincent). Full license: `.cursor/skills/LICENSE-superpowers`.

Skills live at `.cursor/skills/<skill-name>/SKILL.md`. They are always on. Do not wait for a Marketplace plugin, an @-mention, or the user to enable them.

At the start of a task, follow `using-superpowers`. If there is even a 1% chance another skill applies, read that `SKILL.md` and follow it. Announce `Using [skill] to [purpose]`. Skip a Superpowers workflow only when the user explicitly says to skip it.

User instructions in this file take precedence over skills.

### When to use which skill

| Skill | Use when |
| --- | --- |
| `using-superpowers` | Start of a task — how to find and follow skills |
| `brainstorming` | Before new features, behavior changes, or design work |
| `writing-plans` | After a spec exists, before touching code on multi-step work |
| `executing-plans` | Implementing a written plan in this session |
| `subagent-driven-development` | Implementing a plan with a subagent per task plus review |
| `test-driven-development` | Any feature or bugfix that has (or should have) automated tests |
| `systematic-debugging` | Bugs, failures, or unexpected behavior |
| `verification-before-completion` | Before claiming done / fixed / passing |
| `using-git-worktrees` | Isolated workspaces for feature work |
| `finishing-a-development-branch` | Work is complete; tests/checks pass; merge / PR / cleanup |
| `dispatching-parallel-agents` | Two or more independent tasks |
| `requesting-code-review` | Before merge or after a major task |
| `receiving-code-review` | Acting on review feedback |
| `writing-skills` | Creating or editing skills |
| `diagnosing-superpowers` | A Superpowers session went wrong |

Process skills first (brainstorming, systematic-debugging), then implementation skills.

### This repository

- **App:** Next.js 16 (App Router) under `src/app/`, React 19, TypeScript, Tailwind CSS 4, shadcn/ui
- **Data:** Supabase (Postgres). Schema changes go in `supabase/migrations/`. Do not invent a second database layer.
- **Deploy:** Vercel (`vercel.json`). Do not deploy from agent sessions unless asked.
- **Package manager:** npm (`package-lock.json`). Do not switch to pnpm/yarn/bun.

### Commands (from `package.json`)

```bash
npm run dev      # next dev
npm run build    # next build
npm run start    # next start
npm run lint     # eslint
```

There is no `test` or `typecheck` script. Do not invent npm scripts or test runners. Default verification is `npm run lint` and `npm run build`. If you add automated tests, follow `test-driven-development` and add a real script to `package.json`.

Do not change environment variables or apply Supabase migrations unless the user asks.

Domain skills under `.agents/skills/` (Pluggy, Supabase) still apply for those integrations. Superpowers is the process layer; those skills are the domain layer.
