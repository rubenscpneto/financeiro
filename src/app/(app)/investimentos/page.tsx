import { and, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { accounts, investmentMovements, investmentPositions } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { decMovement, decPosition } from "@/lib/crypto/rows"
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

export default async function InvestimentosPage() {
  const { userId } = await requireUserOrRedirect()
  const crypto = await getOrCreateUserCrypto(userId)
  const [positionRows, movementRows] = await Promise.all([
    db
      .select({
        position: investmentPositions,
        institution: accounts.institution,
      })
      .from(investmentPositions)
      .innerJoin(accounts, eq(investmentPositions.account_id, accounts.id))
      .where(
        and(
          eq(investmentPositions.user_id, userId),
          eq(investmentPositions.is_active, true),
          eq(accounts.type, "investment")
        )
      )
      .orderBy(investmentPositions.id),
    db
      .select()
      .from(investmentMovements)
      .where(eq(investmentMovements.user_id, userId))
      .orderBy(desc(investmentMovements.date), desc(investmentMovements.id)),
  ])

  const list = positionRows.map((row) => {
    const p = decPosition(crypto, row.position)
    return {
      ...p,
      institution: crypto.decryptFlex("institution", row.institution) ?? "",
    }
  }) as (InvestmentPosition & { institution: string })[]

  const movs = movementRows.map((m) =>
    decMovement(crypto, m)
  ) as InvestmentMovement[]

  const firstAporteByPosition = new Map<string, string>()
  for (const m of [...movs].reverse()) {
    if (m.type !== "aporte" || !m.position_id) continue
    if (!firstAporteByPosition.has(m.position_id)) {
      firstAporteByPosition.set(m.position_id, m.date)
    }
  }

  const ativos: AtivoView[] = list.map((p) => {
    const valorAtual = positionCurrentValue(p)
    const valorInvestido = positionInvestedValue(p)
    const rendimento = valorAtual - valorInvestido
    const rendimentoPct =
      valorInvestido > 0 ? (rendimento / valorInvestido) * 100 : null

    const investedAt =
      p.purchase_date ?? firstAporteByPosition.get(p.id) ?? p.as_of

    return {
      id: p.id,
      assetName: p.asset_name,
      ticker: p.ticker,
      assetClass: p.asset_class as AssetClass,
      institution: p.institution,
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
  const currentTotal = ativos.reduce((sum, a) => sum + a.valorAtual, 0)

  for (const a of ativos) {
    a.portfolioPct =
      currentTotal > 0 ? (a.valorAtual / currentTotal) * 100 : 0
  }

  ativos.sort(
    (a, b) => b.valorAtual - a.valorAtual || a.id.localeCompare(b.id)
  )

  const evolution = buildInvestmentEvolution(
    ativos.map((a) => ({
      purchaseDate: a.investedAt,
      invested: a.valorInvestido,
      current: a.valorAtual,
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
    <InvestimentosClient
        currentTotal={currentTotal}
        evolution={evolution}
        ativos={ativos}
        movimentos={movimentos}
      />
  )
}
