# 0002 — AGENTS.md as the single source of truth

## Context

Multiple agent entry points and skill locations can cause duplicated or conflicting repository instructions.

## Decision

Root `AGENTS.md` is the source of truth for repository conventions and agent workflows. `CLAUDE.md` contains `@AGENTS.md` to reference that guide. Skills are canonical in `.agents/skills/`; documentation must reference that location.

## Consequences

Repository guidance is maintained once and shared across agent entry points. Skill documentation and links must use `.agents/skills/`, and changes to conventions must keep the guide and related docs current.

## Status

Accepted

## Date

2026-10-23
