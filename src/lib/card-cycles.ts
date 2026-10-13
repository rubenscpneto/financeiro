import { parseInstallment, addMonthsYm } from "@/lib/txn-class"
import { closeAndDueDays } from "@/lib/account-meta"
import type { AccountExtraMeta } from "@/lib/types"

export type CardCycle = {
  dueYm: string
  closeDate: string
  dueDate: string
  label: string
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

function ymd(y: number, m: number, d: number) {
  const last = new Date(y, m, 0).getDate()
  return `${y}-${pad(m)}-${pad(Math.min(d, last))}`
}

function shiftMonth(y: number, m: number, delta: number) {
  const d = new Date(y, m - 1 + delta, 1)
  return { y: d.getFullYear(), m: d.getMonth() + 1 }
}

export function cycleForDate(
  isoDate: string,
  closeDay: number,
  dueDay: number
): CardCycle {
  const [y, m, d] = isoDate.slice(0, 10).split("-").map(Number)
  let close = { y, m }
  if (d > closeDay) close = shiftMonth(y, m, 1)
  let due = { y: close.y, m: close.m }
  if (dueDay <= closeDay) due = shiftMonth(close.y, close.m, 1)
  const dueYm = `${due.y}-${pad(due.m)}`
  return {
    dueYm,
    closeDate: ymd(close.y, close.m, closeDay),
    dueDate: ymd(due.y, due.m, dueDay),
    label: new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(
      new Date(due.y, due.m - 1, 1)
    ),
  }
}

export function currentAndNextCycles(
  asOf: string,
  closeDay: number,
  dueDay: number
): CardCycle[] {
  const current = cycleForDate(asOf, closeDay, dueDay)
  const nextAsOf = `${addMonthsYm(current.closeDate, 1)}-01`
  const next = cycleForDate(nextAsOf, closeDay, dueDay)
  const next2AsOf = `${addMonthsYm(next.closeDate, 1)}-01`
  const next2 = cycleForDate(next2AsOf, closeDay, dueDay)
  return [current, next, next2]
}

export type CycleItem = {
  id: string
  date: string
  name: string
  amount: number
  category: string | null
  installmentLabel: string | null
  installmentCurrent: number | null
  installmentTotal: number | null
  remainingAfter: number
  subLine: string | null
  isRefunded: boolean
}

export function itemsForCycle<T extends {
  id: string
  date?: string | null
  description?: string | null
  amount: number
  installment?: string | null
  category_name?: string | null
  account_id?: string | null
}>(
  txns: T[],
  accountId: string,
  cycle: CardCycle,
  closeDay: number,
  dueDay: number
): CycleItem[] {
  const out: CycleItem[] = []
  for (const t of txns) {
    if (t.account_id !== accountId) continue
    const date = t.date?.slice(0, 10)
    if (!date) continue
    const parcela = parseInstallment(t.installment)
    const baseCycle = cycleForDate(date, closeDay, dueDay)
    let dueYm = baseCycle.dueYm
    if (parcela) {
      dueYm = addMonthsYm(baseCycle.dueYm, parcela.current - 1)
    }
    if (dueYm !== cycle.dueYm) continue
    const amount = Number(t.amount) || 0
    out.push({
      id: t.id,
      date,
      name: t.description ?? "Compra",
      amount,
      category: t.category_name ?? null,
      installmentLabel: parcela
        ? `Parcela ${parcela.current} de ${parcela.total}`
        : null,
      installmentCurrent: parcela?.current ?? null,
      installmentTotal: parcela?.total ?? null,
      remainingAfter: parcela ? parcela.total - parcela.current : 0,
      subLine: null,
      isRefunded: false,
    })
  }
  return out.sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name))
}

export function futureInstallments<T extends {
  id: string
  date?: string | null
  description?: string | null
  amount: number
  installment?: string | null
  account_id?: string | null
}>(
  txns: T[],
  accountId: string,
  afterDueYm: string,
  closeDay: number,
  dueDay: number
): { dueYm: string; items: CycleItem[] }[] {
  const byYm = new Map<string, CycleItem[]>()
  const seen = new Map<string, T>()
  for (const t of txns) {
    if (t.account_id !== accountId) continue
    const parcela = parseInstallment(t.installment)
    if (!parcela) continue
    const date = t.date?.slice(0, 10)
    if (!date) continue
    const key = `${(t.description ?? "").replace(/\d+\s*\/\s*\d+/g, "")}|${parcela.total}`
    const prev = seen.get(key)
    if (prev && (prev.date ?? "") > date) continue
    seen.set(key, t)
  }
  for (const t of seen.values()) {
    const parcela = parseInstallment(t.installment)
    if (!parcela) continue
    const date = t.date!.slice(0, 10)
    const base = cycleForDate(date, closeDay, dueDay)
    for (let k = parcela.current + 1; k <= parcela.total; k++) {
      const dueYm = addMonthsYm(base.dueYm, k - parcela.current)
      if (dueYm <= afterDueYm) continue
      const list = byYm.get(dueYm) ?? []
      list.push({
        id: `${t.id}-${k}`,
        date,
        name: t.description ?? "Parcela",
        amount: Number(t.amount) || 0,
        category: null,
        installmentLabel: `Parcela ${k} de ${parcela.total}`,
        installmentCurrent: k,
        installmentTotal: parcela.total,
        remainingAfter: parcela.total - k + 1,
        subLine: `faltam ${parcela.total - k + 1} ×`,
        isRefunded: false,
      })
      byYm.set(dueYm, list)
    }
  }
  return [...byYm.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dueYm, items]) => ({ dueYm, items }))
}

export function cardSchedule(meta: AccountExtraMeta | null) {
  return closeAndDueDays(meta)
}
