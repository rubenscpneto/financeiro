# Design-as-code — tokens, /design gallery, screenshot CI

**Intent:** Turn the designer’s v3 mockups (Início + Configurações, light/dark, 390/1440) into tokens + React screens, reviewable at `/design`, with Playwright screenshots on every PR.

## Goals

- CSS variables in `design/` for light + dark, wired into Tailwind/shadcn.
- Real components matching v3 mockups (plain pt-BR, Geist, lucide).
- Internal `/design` route (not in nav) showing both screens × both themes × 390 and 1440, mock data.
- Values hidden by default in product prefs; Settings toggle to show. Budget default = teto por categoria; optional envelope mode in Settings. Theme toggle.
- Playwright captures all 8 views in CI; artifacts uploaded and attached to the PR.

## Non-goals

- No auth/DB/schema changes. Do not touch `feat/drizzle-better-auth`.
- Do not replace live `/painel` data fetching. New UI lives as components + `/design`.
- Do not merge.

## Constraints

- Base: `main`. Additive UI only.
- WCAG AA. Body 15–16px. Geist. lucide.
- Dark: bg `#0B0B0C`, cards `#161618`, elevated `#1C1C1F`, borders `#2C2C30`, text `#F2F2F3`, secondary `#B8B8BE` / `#9D9DA4`, button `#5FD394` + dark text.
- Light: primary `#1E6B47`, deep `#0F3A27`, bg `#F5F6F2`.
- `/design` open if logged in **or** non-production **or** `CI=true` **or** `ALLOW_DESIGN_GALLERY=true`.

## Source of truth

Designer archive: v3 PNGs (latest) + `src/d_dark3.js`, `m_dark3.js`, `s_dark3.js` layout/copy. Light tokens from user spec + v2 light PNGs.

## Builder calls

- Isolated `/design` views via `?view=inicio|configuracoes&theme=claro|escuro`.
- Desktop Configurações: same sidebar chrome as Início desktop + settings content (no v3 desktop settings PNG).
- Gallery `/design` embeds all 8 frames for humans; Playwright hits isolated views.
- Prefs (hide money, envelope, theme) are client/localStorage only — no DB.
