import { and, gte, lte, sql } from "drizzle-orm"
import { db } from "@/db"
import { cdiDaily } from "@/db/schema"
import { todayYmd } from "@/lib/format"

const BCB_SGS_12 =
  "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados"

function toBrDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}

function fromBrDate(value: string) {
  const [d, m, y] = value.split("/")
  return `${y}-${m}-${d}`
}

export type CdiRate = { date: string; rate: number }

async function ratesInRange(from: string, to: string): Promise<CdiRate[]> {
  try {
    const rows = await db
      .select()
      .from(cdiDaily)
      .where(and(gte(cdiDaily.date, from), lte(cdiDaily.date, to)))
    return rows
      .map((r) => ({ date: r.date, rate: Number(r.rate) }))
      .filter((r) => Number.isFinite(r.rate))
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}

async function fetchBcb(from: string, to: string): Promise<CdiRate[]> {
  const url = `${BCB_SGS_12}?formato=json&dataInicial=${encodeURIComponent(toBrDate(from))}&dataFinal=${encodeURIComponent(toBrDate(to))}`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) return []
  const body = (await res.json()) as { data: string; valor: string }[]
  if (!Array.isArray(body)) return []
  return body
    .map((row) => ({
      date: fromBrDate(row.data),
      rate: Number(String(row.valor).replace(",", ".")),
    }))
    .filter((r) => r.date && Number.isFinite(r.rate))
}

async function cacheRates(rows: CdiRate[]) {
  if (rows.length === 0) return
  const now = new Date()
  try {
    await db
      .insert(cdiDaily)
      .values(rows.map((r) => ({ date: r.date, rate: String(r.rate), fetched_at: now })))
      .onConflictDoUpdate({
        target: cdiDaily.date,
        set: { rate: sql`excluded.rate`, fetched_at: now },
      })
  } catch {
    /* table may not be migrated yet */
  }
}

/**
 * Published daily CDI rates (% a.d.) from BCB SGS series 12, cached in cdi_daily.
 * Only published business days are returned (today is usually missing).
 */
export async function getCdiRates(from: string, to: string): Promise<CdiRate[]> {
  const start = from.slice(0, 10)
  const end = to.slice(0, 10) < todayYmd() ? to.slice(0, 10) : todayYmd()
  if (end < start) return []

  const cached = await ratesInRange(start, end)
  const last = cached.at(-1)?.date
  const needFetch = !last || last < end
  if (needFetch) {
    const fetchFrom = last
      ? new Date(`${last}T00:00:00`)
      : new Date(`${start}T00:00:00`)
    if (last) fetchFrom.setDate(fetchFrom.getDate() + 1)
    const fetchStart = fetchFrom.toISOString().slice(0, 10)
    if (fetchStart <= end) {
      try {
        const fresh = await fetchBcb(fetchStart, end)
        await cacheRates(fresh)
      } catch {
        /* keep cache */
      }
    }
  }
  return ratesInRange(start, end)
}
