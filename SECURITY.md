# Security policy

This repository is **public**. Treat every commit, screenshot, and workflow log
as world-readable.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security reports.

1. Use GitHub’s **Privately report a vulnerability** flow on this repo
   (Settings → Code security → Private vulnerability reporting — enable it if
   it is off).
2. If that is unavailable, email the repository owner using the address on
   their GitHub profile.

Include: affected path/commit (no secret values in the subject line), impact,
and whether you believe the credential is still live. Allow time to rotate
before any public disclosure.

## What must never be committed

- Secrets: Pluggy client id/secret, item IDs, `BETTER_AUTH_SECRET`,
  `CRON_SECRET`, webhook secrets, `DATABASE_URL` with credentials,
  Resend/API keys, KEKs, private keys (`*.pem` / `*.key`).
- Real financial data: bank statement PDFs/CSVs, JSON/CSV exports, seeds or
  fixtures copied from production, account/card numbers.
- Personal data: CPF, family names, personal emails/phones/addresses.
- Attacker-useful infra: VPS IPs, internal hostnames, pgweb URLs/credentials,
  backup paths, neighboring services on the same host.
- Screenshots of production with real balances, emails, or hostnames.

Use `.env.example` (placeholders only) and mock fixtures. CI screenshot jobs
must render **mock data**, never a production session.

## Encryption notes

Per-user envelope encryption uses a KEK loaded from `KEK_FILE` (32 bytes on
disk in the app container). The KEK is **not** in git, Postgres, or database
backups. Losing it makes ciphertext unrecoverable. See `docs/SELF_HOSTING.md`.

## Rotating credentials

If a secret is found in git history (this repo does **not** rewrite history):

1. Rotate / revoke the live credential first.
2. Optionally purge history later with `git filter-repo` — only after rotation
   and only with the owner’s explicit approval (force-push required).

## GitHub settings (owner)

Recommended for a public personal-finance app: secret scanning + push
protection, Dependabot alerts and security updates, private vulnerability
reporting, a ruleset on `main` requiring PRs + passing checks and denying
force-pushes, Actions: approve fork PR workflows, read-only default
`GITHUB_TOKEN`, disable unused Wiki/Projects.
