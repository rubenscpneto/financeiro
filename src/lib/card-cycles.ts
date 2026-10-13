import {
  parseInstallment,
  addMonthsYm,
  addMonthsDate,
  classifyTransaction,
  installmentGroupKey,
  type ClassifiableTxn,
} from "./txn-class.ts"
import { closeAndDueDays } from "./account-meta.ts"
import type { AccountExtraMeta } from "./types.ts"

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
    label: new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(`${due.y}-${pad(due.m)}-01T12:00:00.000-03:00`)),
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

export function faturaHeaderTotal(opts: {
  tab: number
  openBill: number
  items: CycleItem[]
}): number {
  if (opts.tab === 0) return Math.abs(opts.openBill)
  return cycleTotals(opts.items).net
}

export function cycleTotals(items: CycleItem[]): {
  aVista: number
  parcelas: number
  net: number
} {
  let aVista = 0
  let parcelas = 0
  for (const i of items) {
    if (i.installmentTotal) parcelas += i.amount
    else aVista += i.amount
  }
  return {
    aVista: Math.round((-aVista + Number.EPSILON) * 100) / 100,
    parcelas: Math.round((-parcelas + Number.EPSILON) * 100) / 100,
    net: Math.round((-(aVista + parcelas) + Number.EPSILON) * 100) / 100,
  }
}

export function itemsForCycle<T extends ClassifiableTxn & {
  id: string
  date?: string | null
  description?: string | null
  amount: number
  installment?: string | null
  category_name?: string | null
  account_id?: string | null
  class?: { kind?: string }
}>(
  txns: T[],
  accountId: string,
  cycle: CardCycle,
  closeDay: number,
  dueDay: number
): CycleItem[] {
  const out: CycleItem[] = []
  const groups = new Map<string, T[]>()
  for (const t of txns) {
    if (t.account_id !== accountId) continue
    const date = t.date?.slice(0, 10)
    if (!date) continue
    const kind = t.class?.kind ?? classifyTransaction(t).kind
    if (kind === "card_bill" || kind === "card_bill_hidden") continue
    const parcela = parseInstallment(t.installment)
    if (!parcela) {
      const baseCycle = cycleForDate(date, closeDay, dueDay)
      if (baseCycle.dueYm !== cycle.dueYm) continue
      const amount = Number(t.amount) || 0
      out.push({
        id: t.id,
        date,
        name: t.description ?? "Compra",
        amount,
        category: t.category_name ?? null,
        installmentLabel: null,
        installmentCurrent: null,
        installmentTotal: null,
        remainingAfter: 0,
        subLine: null,
        isRefunded: false,
      })
      continue
    }
    const key = installmentGroupKey(t)
    if (!key) continue
    const list = groups.get(key) ?? []
    list.push(t)
    groups.set(key, list)
  }
  for (const list of groups.values()) {
    const dates = list
      .map((r) => r.date?.slice(0, 10))
      .filter((d): d is string => Boolean(d))
      .sort()
    const origin = dates[0]
    if (!origin) continue
    const sample = [...list].sort(
      (a, b) =>
        (parseInstallment(b.installment)?.current ?? 0) -
        (parseInstallment(a.installment)?.current ?? 0)
    )[0]
    const parcela = parseInstallment(sample.installment)
    if (!parcela) continue
    for (let k = 1; k <= parcela.total; k++) {
      const sched = addMonthsDate(origin, k - 1)
      if (cycleForDate(sched, closeDay, dueDay).dueYm !== cycle.dueYm) continue
      out.push({
        id: `${sample.id}-k${k}`,
        date: sched,
        name: sample.description ?? "Compra",
        amount: Number(sample.amount) || 0,
        category: sample.category_name ?? null,
        installmentLabel: `Parcela ${k} de ${parcela.total}`,
        installmentCurrent: k,
        installmentTotal: parcela.total,
        remainingAfter: parcela.total - k,
        subLine: null,
        isRefunded: false,
      })
    }
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
  const groups = new Map<string, T[]>()
  for (const t of txns) {
    if (t.account_id !== accountId) continue
    const parcela = parseInstallment(t.installment)
    if (!parcela) continue
    const date = t.date?.slice(0, 10)
    if (!date) continue
    const key = installmentGroupKey(t)
    if (!key) continue
    const list = groups.get(key) ?? []
    list.push(t)
    groups.set(key, list)
  }
  for (const list of groups.values()) {
    const dates = list
      .map((r) => r.date?.slice(0, 10))
      .filter((d): d is string => Boolean(d))
      .sort()
    const origin = dates[0]
    if (!origin) continue
    const sample = [...list].sort(
      (a, b) =>
        (parseInstallment(b.installment)?.current ?? 0) -
        (parseInstallment(a.installment)?.current ?? 0)
    )[0]
    const parcela = parseInstallment(sample.installment)
    if (!parcela) continue
    for (let k = 1; k <= parcela.total; k++) {
      const sched = addMonthsDate(origin, k - 1)
      const dueYm = cycleForDate(sched, closeDay, dueDay).dueYm
      if (dueYm <= afterDueYm) continue
      const remaining = parcela.total - k + 1
      const items = byYm.get(dueYm) ?? []
      items.push({
        id: `${sample.id}-${k}`,
        date: sched,
        name: sample.description ?? "Parcela",
        amount: Number(sample.amount) || 0,
        category: null,
        installmentLabel: `Parcela ${k} de ${parcela.total}`,
        installmentCurrent: k,
        installmentTotal: parcela.total,
        remainingAfter: remaining,
        subLine: `faltam ${remaining} ×`,
        isRefunded: false,
      })
      byYm.set(dueYm, items)
    }
  }
  return [...byYm.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dueYm, items]) => ({
      dueYm,
      items: [...items].sort(
        (a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name)
      ),
    }))
}

export function cardSchedule(meta: AccountExtraMeta | null) {
  return closeAndDueDays(meta)
}
