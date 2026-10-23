# 0001 — Default branch and PR flow

## Context

Contributors and agents need one clear review path and an explicit approval boundary for integration.

## Decision

There is no `homolog` branch. Work on `feat/*` or `fix/*` branches and open PRs to `main`, the default branch. Never push directly to `main`. Merges require Rubens's approval; agents must never merge or deploy.

## Consequences

Changes receive review through a single PR destination. Integration waits for Rubens's approval, and agents leave merging and deployment to the authorized human workflow.

## Status

Accepted

## Date

2026-10-23
