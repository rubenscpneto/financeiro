import { addMonthsYm } from "@/lib/txn-class"

export type RecurrenceCharge = {
  id: string
  date: string
  amount: number
  merchant: string
  accountName: string
  usd?: string | null
}

export type RecurrenceSeries = {
  key: string
  name: string
  monthly: number
  cadence: "monthly" | "annual"
  count: number
  lastDate: string
  nextDate: string
  accountName: string
  usd: string | null
  isAi: boolean
  duplicate: boolean
}

export type RecurrenceWarning =
  | {
      kind: "duplicate_series"
      key: string
      name: string
      monthly: number
      yearly: number
      accountName: string
    }
  | {
      kind: "same_day"
      key: string
      name: string
      date: string
      amount: number
      count: number
    }

function norm(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(pagamento|pagto|compra|debito|credito|pix)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
}

function merchantName(input: {
  merchant?: string | null
  description?: string | null
}) {
  return (input.merchant || input.description || "Cobrança").trim()
}

function median(values: number[]) {
  if (values.length === 0) return 0
  const s = [...values].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function daysBetween(a: string, b: string) {
  return Math.round(
    (Date.parse(`${b}T00:00:00`) - Date.parse(`${a}T00:00:00`)) / 86_400_000
  )
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const AI_NAMES = /chatgpt|openai|cursor|claude|anthropic|gemini|copilot|midjourney/

export function detectRecurrences(
  txns: {
    id: string
    date: string
    amount: number
    merchant?: string | null
    description?: string | null
    accountName?: string | null
  }[],
  asOf: string
): { series: RecurrenceSeries[]; warnings: RecurrenceWarning[]; ended: RecurrenceSeries[] } {
  const expenses = txns.filter((t) => t.amount < 0)
  const byMerchant = new Map<string, RecurrenceCharge[]>()
  for (const t of expenses) {
    const name = merchantName(t)
    const key = norm(name)
    if (!key) continue
    const list = byMerchant.get(key) ?? []
    list.push({
      id: t.id,
      date: t.date.slice(0, 10),
      amount: Math.abs(t.amount),
      merchant: name,
      accountName: t.accountName ?? "",
    })
    byMerchant.set(key, list)
  }

  const series: RecurrenceSeries[] = []
  const warnings: RecurrenceWarning[] = []
  const ended: RecurrenceSeries[] = []

  for (const [key, charges] of byMerchant) {
    charges.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    const clusters: RecurrenceCharge[][] = []
    for (const c of charges) {
      const cluster = clusters.find(
        (g) => Math.abs(g[0].amount - c.amount) / Math.max(g[0].amount, 0.01) <= 0.1
      )
      if (cluster) cluster.push(c)
      else clusters.push([c])
    }

    const merchantSeries: RecurrenceSeries[] = []
    for (const cluster of clusters) {
      if (cluster.length < 2) continue
      const gaps = cluster
        .slice(1)
        .map((c, i) => daysBetween(cluster[i].date, c.date))
        .filter((g) => g > 0)
      const gap = median(gaps)
      let cadence: "monthly" | "annual" | null = null
      if (gap >= 25 && gap <= 35) cadence = "monthly"
      else if (gap >= 330 && gap <= 400) cadence = "annual"
      if (!cadence) continue
      const last = cluster[cluster.length - 1]
      const monthly = cadence === "annual" ? last.amount / 12 : last.amount
      const nextDate =
        cadence === "annual"
          ? `${Number(last.date.slice(0, 4)) + 1}${last.date.slice(4)}`
          : addDays(last.date, Math.round(gap) || 30)
      const staleDays = cadence === "annual" ? 400 : 45
      const item: RecurrenceSeries = {
        key: `${key}|${last.amount.toFixed(2)}`,
        name: last.merchant,
        monthly,
        cadence,
        count: cluster.length,
        lastDate: last.date,
        nextDate,
        accountName: last.accountName,
        usd: null,
        isAi: AI_NAMES.test(norm(last.merchant)),
        duplicate: false,
      }
      const age = daysBetween(last.date, asOf)
      if (age > staleDays) ended.push(item)
      else merchantSeries.push(item)
    }

    if (merchantSeries.length >= 2) {
      for (const s of merchantSeries) s.duplicate = true
      const monthly = merchantSeries[0].monthly
      warnings.push({
        kind: "duplicate_series",
        key: `${key}|dup`,
        name: merchantSeries[0].name,
        monthly,
        yearly: monthly * 12,
        accountName: merchantSeries[0].accountName,
      })
    }

    const byDay = new Map<string, RecurrenceCharge[]>()
    for (const c of charges) {
      const dayKey = `${c.date}|${c.amount.toFixed(2)}`
      const list = byDay.get(dayKey) ?? []
      list.push(c)
      byDay.set(dayKey, list)
    }
    for (const list of byDay.values()) {
      if (list.length < 2) continue
      warnings.push({
        kind: "same_day",
        key: `${key}|${list[0].date}|${list[0].amount}`,
        name: list[0].merchant,
        date: list[0].date,
        amount: list[0].amount,
        count: list.length,
      })
    }

    series.push(...merchantSeries)
  }

  series.sort((a, b) => b.monthly - a.monthly || a.name.localeCompare(b.name, "pt-BR"))
  ended.sort((a, b) => b.lastDate.localeCompare(a.lastDate))
  return { series, warnings, ended }
}

export function nextMonthLabel(iso: string) {
  return addMonthsYm(iso, 1)
}
