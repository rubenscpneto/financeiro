export type BankGroup = {
  key: string
  name: string
  accountIds: string[]
}

export function bankKey(institution: string | null | undefined): string {
  const n = (institution ?? "").trim() || "outros"
  return n
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function groupAccountsByBank(
  accounts: { id: string; institution: string | null }[]
): BankGroup[] {
  const map = new Map<string, BankGroup>()
  for (const account of accounts) {
    const name = account.institution?.trim() || "Outros"
    const key = bankKey(account.institution)
    const existing = map.get(key)
    if (existing) {
      existing.accountIds.push(account.id)
    } else {
      map.set(key, { key, name, accountIds: [account.id] })
    }
  }
  return [...map.values()].sort(
    (a, b) => a.name.localeCompare(b.name, "pt-BR") || a.key.localeCompare(b.key)
  )
}

/** Account ids for a bank filter. `null` = Todos. Empty array = unknown bank. */
export function accountIdsForBank(
  groups: BankGroup[],
  key: string | null | undefined
): string[] | null {
  if (!key) return null
  return groups.find((g) => g.key === key)?.accountIds ?? []
}
