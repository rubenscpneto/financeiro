import type { AccountExtraMeta } from "./types"

export function parseAccountMeta(
  raw: string | null | undefined
): AccountExtraMeta | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as AccountExtraMeta
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

export function closeAndDueDays(meta: AccountExtraMeta | null): {
  closeDay: number
  dueDay: number
} {
  const closeIso = meta?.balanceCloseDate?.slice(0, 10)
  const dueIso = meta?.balanceDueDate?.slice(0, 10)
  const closeDay = closeIso ? Number(closeIso.slice(8, 10)) : 2
  const dueDay = dueIso ? Number(dueIso.slice(8, 10)) : 10
  return {
    closeDay: Number.isFinite(closeDay) && closeDay >= 1 && closeDay <= 31 ? closeDay : 2,
    dueDay: Number.isFinite(dueDay) && dueDay >= 1 && dueDay <= 31 ? dueDay : 10,
  }
}
