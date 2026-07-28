import { createClient } from "@/lib/server"
import {
  type AssetClass,
  type InvestmentMovement,
  type InvestmentPosition,
} from "@/lib/types"
import { buildInvestmentEvolution } from "@/lib/investments/evolution"
import {
  formatRentabilidade,
  positionCurrentValue,
  positionInvestedValue,
} from "@/lib/investments/value"
import {
  InvestimentosClient,
  type AtivoView,
  type MovimentoView,
} from "@/components/investimentos-client"

type PositionRow = InvestmentPosition & {
  accounts: { institution: string } | { institution: string }[] | null
}

function institutionOf(p: PositionRow): string {
  const acc = p.accounts
  if (!acc) return ""
  if (Array.isArray(acc)) return acc[0]?.institution ?? ""
  return acc.institution ?? ""
}

export default async function InvestimentosPage() {
  const supabase = await createClient()
  const [{ data: positions }, { data: movements }] = await Promise.all([
    supabase
      .from("investment_positions")
      .select("*, accounts(institution)")
      .order("asset_name"),
    supabase
      .from("investment_movements")
      .select("*")
      .order("date", { ascending: false }),
  ])

  const list = (positions ?? []) as PositionRow[]
  const movs = (movements ?? []) as InvestmentMovement[]

  const firstAporteByPosition = new Map<string, string>()
  for (const m of [...movs].reverse()) {
    if (m.type !== "aporte" || !m.position_id) continue
    if (!firstAporteByPosition.has(m.position_id)) {
      firstAporteByPosition.set(m.position_id, m.date)
    }
  }

  let currentTotal = 0
  const ativos: AtivoView[] = list.map((p) => {
    const valorAtual = positionCurrentValue(p)
    const valorInvestido = positionInvestedValue(p)
    const rendimento = valorAtual - valorInvestido
    const rendimentoPct =
      valorInvestido > 0 ? (rendimento / valorInvestido) * 100 : null
    currentTotal += valorAtual

    const investedAt =
      p.purchase_date ?? firstAporteByPosition.get(p.id) ?? p.as_of

    return {
      id: p.id,
      assetName: p.asset_name,
      ticker: p.ticker,
      assetClass: p.asset_class as AssetClass,
      institution: institutionOf(p),
      investedAt,
      rentabilidade: formatRentabilidade(
        p.rate != null ? Number(p.rate) : null,
        p.rate_type
      ),
      valorInvestido,
      valorAtual,
      rendimento,
      rendimentoPct,
      portfolioPct: 0,
    }
  })

  for (const a of ativos) {
    a.portfolioPct =
      currentTotal > 0 ? (a.valorAtual / currentTotal) * 100 : 0
  }

  ativos.sort((a, b) => b.valorAtual - a.valorAtual)

  const evolution = buildInvestmentEvolution(
    currentTotal,
    movs.map((m) => ({
      date: m.date,
      type: m.type,
      amount: Number(m.amount) || 0,
    })),
    12
  )

  const movimentos: MovimentoView[] = movs
    .filter((m) => m.type === "aporte" || m.type === "resgate")
    .map((m) => ({
      id: m.id,
      date: m.date,
      type: m.type as "aporte" | "resgate",
      amount: Number(m.amount) || 0,
    }))

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Investimentos</h1>
        <p className="text-sm text-muted-foreground">
          Patrimônio, ativos e movimentações via Open Finance.
        </p>
      </div>

      <InvestimentosClient
        currentTotal={currentTotal}
        evolution={evolution}
        ativos={ativos}
        movimentos={movimentos}
      />
    </div>
  )
}
