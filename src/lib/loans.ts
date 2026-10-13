import type { DecoratedTxn } from "./txn-class"

export type LoanGroup = {
  key: string
  person: string
  lent: number
  returned: number
  remaining: number
  firstDate: string
  firstAmount: number
  firstTxnId: string
  lastReturnDate: string | null
  writtenOff: boolean
  writeOffId: string | null
  writeOffDate: string | null
  accountIds: string[]
}

export type AdjustmentRow = {
  id: string
  date: string
  kind: string
  category: string
  amount: number
  ref_id: string | null
  notes: string | null
  undone_at: Date | null
}

function norm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

export function loanPerson(description: string, merchant?: string | null) {
  const src = `${description} ${merchant ?? ""}`.trim()
  const m =
    /emprestimo(?:s)?(?:\s+para|\s+a)?\s+(.+)/i.exec(src) ||
    /loan to\s+(.+)/i.exec(src)
  const name = (m?.[1] ?? merchant ?? description)
    .replace(/\s*[·•].*$/, "")
    .trim()
  return name || "Empréstimo"
}

export function groupLoans<T extends DecoratedTxn<{
  id: string
  date?: string | null
  description?: string | null
  merchant?: string | null
  amount: number
  account_id?: string | null
}>>(
  txns: T[],
  adjustments: AdjustmentRow[]
): LoanGroup[] {
  const map = new Map<string, LoanGroup>()
  for (const t of txns) {
    if (t.class.kind !== "loan") continue
    const person = loanPerson(t.description ?? "", t.merchant)
    const key = norm(person)
    const amount = Number(t.amount) || 0
    const date = t.date?.slice(0, 10) ?? ""
    const existing = map.get(key)
    const accountId = t.account_id ?? ""
    if (!existing) {
      map.set(key, {
        key,
        person,
        lent: amount < 0 ? Math.abs(amount) : 0,
        returned: amount > 0 ? amount : 0,
        remaining: 0,
        firstDate: amount < 0 ? date : "",
        firstAmount: amount < 0 ? Math.abs(amount) : 0,
        firstTxnId: t.id,
        lastReturnDate: amount > 0 ? date : null,
        writtenOff: false,
        writeOffId: null,
        writeOffDate: null,
        accountIds: accountId ? [accountId] : [],
      })
      continue
    }
    if (accountId && !existing.accountIds.includes(accountId)) {
      existing.accountIds.push(accountId)
    }
    if (amount < 0) {
      existing.lent += Math.abs(amount)
      if (!existing.firstDate || date < existing.firstDate) {
        existing.firstDate = date
        existing.firstAmount = Math.abs(amount)
        existing.firstTxnId = t.id
      }
    } else if (amount > 0) {
      existing.returned += amount
      if (!existing.lastReturnDate || date > existing.lastReturnDate) {
        existing.lastReturnDate = date
      }
    }
  }

  const writeOffs = adjustments.filter(
    (a) => a.kind === "family_help" && !a.undone_at
  )
  for (const group of map.values()) {
    const off = writeOffs.find(
      (a) => a.ref_id === group.firstTxnId || norm(a.notes ?? "") === group.key
    )
    const written = off ? Math.abs(off.amount) : 0
    group.writtenOff = Boolean(off)
    group.writeOffId = off?.id ?? null
    group.writeOffDate = off?.date ?? null
    group.remaining = Math.max(0, Math.round((group.lent - group.returned - written) * 100) / 100)
  }

  return [...map.values()].sort(
    (a, b) => b.remaining - a.remaining || a.person.localeCompare(b.person, "pt-BR")
  )
}

export function filterLoansByAccountIds(
  loans: LoanGroup[],
  accountIds: string[] | null
): LoanGroup[] {
  if (accountIds == null) return loans
  const set = new Set(accountIds)
  return loans.filter((l) => l.accountIds.some((id) => set.has(id)))
}

export function receivablesTotal(
  loans: LoanGroup[],
  refunds: { amount: number }[]
): number {
  const open = loans
    .filter((l) => l.remaining > 0 && !l.writtenOff)
    .reduce((s, l) => s + l.remaining, 0)
  const pending = refunds.reduce((s, r) => s + Math.abs(r.amount), 0)
  return Math.round((open + pending) * 100) / 100
}
