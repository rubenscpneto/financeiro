# Design-as-code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tokens + Início/Configurações components + `/design` gallery + Playwright CI screenshots of all 8 views.

**Architecture:** Hex tokens in `design/tokens.css` map onto shadcn CSS variables in `globals.css`. Presentational screens consume mock data and a `hideValues` flag. `/design` is outside `(app)` so it never hits Supabase. Middleware early-returns for `/design` when the gallery is public.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, shadcn, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-10-13-design-as-code.md`

## Global Constraints

- Base `main`; do not touch `feat/drizzle-better-auth`.
- UI-only: no auth/DB/schema/env changes beyond a middleware allow-list for `/design`.
- Copy: plain pt-BR from v3 mockups.
- Tokens: dark bg `#0B0B0C`, cards `#161618`, elevated `#1C1C1F`, borders `#2C2C30`, text `#F2F2F3`, muted `#B8B8BE`, subtle `#9D9DA4`, btn `#5FD394` / on-btn `#05200F`. Light primary `#1E6B47`, deep `#0F3A27`, bg `#F5F6F2`.
- Body 15–16px, Geist, lucide, WCAG AA.
- `/design` public when `NODE_ENV !== 'production'` OR `CI=true` OR `ALLOW_DESIGN_GALLERY=true`; otherwise existing login gate.
- Default hide money; budget mode default teto; envelope optional.

## Review Focus

- Production `/design` must not leak without login when CI/ALLOW are unset.
- Hidden money replaces `R$ 1.234,56` (and minus/plus variants) with `R$ ••••`, never empty.
- Dark theme uses green only as accent/button, never as page background.
- Desktop 1440 settings still shows Aparência / Privacidade / Orçamento groups.
- Screenshots are full-page of isolated views, not the gallery chrome.

---

### Task 1: Tokens + money helpers + gallery gate

**Files:**
- Create: `design/tokens.css`
- Create: `src/lib/design/tokens.test.mjs`
- Create: `src/lib/design/money.ts`
- Create: `src/lib/design/money.test.ts`
- Create: `src/lib/design/gallery-access.ts`
- Create: `src/lib/design/gallery-access.test.ts`
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx` (`--font-sans` → Geist, body 16px)
- Modify: `package.json` (`test` script)

**Interfaces:**
- Consumes: none
- Produces: CSS `--ds-*` variables; `formatBRLMasked(value: number, hidden: boolean): string`; `maskMoneyInText(text: string, hidden: boolean): string`; `isDesignGalleryPublic(env: { NODE_ENV?: string; CI?: string; ALLOW_DESIGN_GALLERY?: string }): boolean`

- [ ] **Step 1: Write failing tests** asserting token hex strings, mask behavior, gallery gate.
- [ ] **Step 2: Run tests — fail** (files missing).
- [ ] **Step 3: Implement tokens.css, money.ts, gallery-access.ts, wire globals + Geist.**
- [ ] **Step 4: Tests pass.**
- [ ] **Step 5: Commit** `feat(design): add tokens, money mask, gallery gate`

### Task 2: Screens + /design route

**Files:**
- Create: `src/lib/design/mock-data.ts`
- Create: `src/components/design/*.tsx` (home, settings, chrome)
- Create: `src/app/design/page.tsx`
- Modify: `src/lib/middleware.ts` (early-return when gallery public)
- Modify: `src/app/layout.tsx` if ThemeProvider needed

**Interfaces:**
- Consumes: money helpers, `--ds-*` tokens
- Produces: `HomeScreen({ variant: 'mobile' | 'desktop'; hideValues: boolean; theme: 'claro' | 'escuro' })`; `SettingsScreen({ variant; theme; hideValuesDefault; budgetMode: 'teto' | 'envelope' })`; `/design` and `/design?view=&theme=`

- [ ] **Step 1: Playwright spec asserting copy on isolated views (fails 404).**
- [ ] **Step 2: Run — fail.**
- [ ] **Step 3: Port mockups into components; add `/design`; middleware allow.**
- [ ] **Step 4: Playwright content assertions pass.**
- [ ] **Step 5: Commit** `feat(design): port Início and Configurações to /design`

### Task 3: Screenshot automation + CI

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/design-screenshots.spec.ts`
- Create: `.github/workflows/design-screenshots.yml`
- Create: `design/screenshots/*.png` (generated)

- [ ] **Step 1: Spec writes 8 PNGs at 390/1440 × claro/escuro × inicio/configuracoes.**
- [ ] **Step 2: Workflow builds, runs Playwright, uploads artifacts, comments PR with images.**
- [ ] **Step 3: Generate screenshots locally; commit.**
- [ ] **Step 4: `npm run lint` and `npm run build` pass.**
- [ ] **Step 5: Commit** `ci(design): Playwright screenshots of /design`
