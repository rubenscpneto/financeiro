"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { formatDateBR } from "@/lib/format"
import { setPositionExcludeFromReserveAction } from "@/lib/actions/crud"
import {
  Bar,
  DsCard,
  IconBadge,
  PageTitle,
  SectionHead,
} from "@/components/design/primitives"
import { AppMoney } from "@/components/app-money"
import { brl } from "@/components/design/money-display"
import { useHideValues } from "@/components/hide-values-provider"
import type { ProductGroup, TitledPosition, CdiKpi } from "@/lib/investments/net"
import type { ReserveView } from "@/lib/reserve"

function pctLabel(value: number | null, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${(value * 100).toFixed(digits)}%`
}

function cdiPctLabel(ratio: number | null) {
  if (ratio == null || !Number.isFinite(ratio)) return "—"
  return `${(ratio * 100).toFixed(1)}% do CDI`
}

export function InvestimentosClient({
  net,
  gross,
  iof,
  ir,
  earnings,
  liquid,
  locked,
  excluded,
  groups,
  monthKpi,
  yearKpi,
  reserve,
  vencimentos,
  bands,
  iofNotes,
  bankSuffix = "",
}: {
  net: number
  gross: number
  iof: number
  ir: number
  earnings: number
  liquid: number
  locked: number
  excluded: number
  groups: ProductGroup[]
  monthKpi: CdiKpi
  yearKpi: CdiKpi
  reserve: ReserveView
  vencimentos: { date: string; name: string; gross: number }[]
  bands: { label: string; rate: string; gross: number }[]
  iofNotes: TitledPosition[]
  bankSuffix?: string
}) {
  const { hidden } = useHideValues()
  const [open, setOpen] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const total = net || 1
  const empty = groups.length === 0

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <PageTitle subtitle="Patrimônio, rendimento e reserva — já com IOF e IR." />

      {empty ? (
        <DsCard>
          <p className="text-base">Você ainda não tem investimentos conectados</p>
          <a href="/contas" className="text-sm font-semibold text-ds-accent">
            Ver contas
          </a>
        </DsCard>
      ) : (
        <>
          <DsCard className="gap-2 border-ds-hero-stroke bg-ds-hero p-5 text-ds-on-hero">
            <p className="text-sm text-ds-on-hero-muted">Total investido{bankSuffix}</p>
            <p className="text-[34px] leading-none font-semibold whitespace-nowrap">
              <AppMoney value={net} className="text-ds-on-hero" />
            </p>
            <p className="text-sm text-ds-on-hero-muted">
              Já sem IOF e IR estimados · bruto {brl(gross, hidden)}
            </p>
          </DsCard>

          <div className="grid gap-3 lg:grid-cols-3">
            <DsCard>
              <p className="text-sm text-ds-muted">Rendeu neste mês</p>
              <p className="text-xl font-semibold text-ds-pos whitespace-nowrap">
                <AppMoney value={monthKpi.rendimento} sign />
              </p>
              <p className="text-sm text-ds-muted">
                {formatDateBR(monthKpi.from).slice(0, 5)} a{" "}
                {formatDateBR(monthKpi.to).slice(0, 5)} ·{" "}
                {pctLabel(monthKpi.averageBalance ? monthKpi.rendimento / monthKpi.averageBalance : null)}{" "}
                · {monthKpi.usedContracted ? `${monthKpi.contractedPct?.toFixed(1)}% contratado` : cdiPctLabel(monthKpi.pctOfCdi)}
              </p>
            </DsCard>
            <DsCard>
              <p className="text-sm text-ds-muted">Rendeu em 12 meses</p>
              <p className="text-xl font-semibold text-ds-pos whitespace-nowrap">
                <AppMoney value={yearKpi.rendimento} sign />
              </p>
              <p className="text-sm text-ds-muted">
                {pctLabel(yearKpi.averageBalance ? yearKpi.rendimento / yearKpi.averageBalance : null)}{" "}
                · {yearKpi.usedContracted ? `${yearKpi.contractedPct?.toFixed(1)}% contratado` : cdiPctLabel(yearKpi.pctOfCdi)}
              </p>
            </DsCard>
            <DsCard className="hidden lg:flex">
              <p className="text-sm text-ds-muted">Reserva de emergência</p>
              <p className="text-xl font-semibold">
                {reserve.monthsLivre.toFixed(1)} meses de 6
              </p>
              <Bar pct={reserve.progress} />
              <p className="text-sm text-ds-muted">
                Reserva livre · disponível: {reserve.monthsDisponivel.toFixed(1)} meses
              </p>
            </DsCard>
          </div>
          <p className="text-sm leading-5 text-ds-subtle">
            Como calculamos o % do CDI: rendimento ÷ (saldo médio × CDI do período).
            O saldo médio é por dia útil; aplicar ou resgatar muda o saldo, mas não
            conta como rendimento. CDI do período = produto das taxas diárias do
            Banco Central (série 12)
            {monthKpi.businessDays
              ? `: ${monthKpi.businessDays} dias úteis = ${(monthKpi.cdi * 100).toFixed(3)}%`
              : ""}
            . 12 meses = {(yearKpi.cdi * 100).toFixed(2)}%. Taxa contratada média:{" "}
            {monthKpi.contractedPct?.toFixed(1) ?? "—"}% do CDI
            {monthKpi.usedContracted
              ? ". Ainda sem histórico para comparar com o CDI — mostrando a taxa contratada."
              : "."}
          </p>

          <DsCard>
            <SectionHead title="Disponível hoje vs preso até o vencimento" />
            <div className="flex h-3 overflow-hidden rounded-full bg-ds-track">
              <div
                className="bg-ds-accent"
                style={{ width: `${(liquid / total) * 100}%` }}
              />
              <div
                className="bg-ds-warn"
                style={{ width: `${((locked + excluded) / total) * 100}%` }}
              />
            </div>
            <div className="flex flex-wrap justify-between gap-3 text-sm">
              <p>
                Disponível hoje{" "}
                <span className="whitespace-nowrap font-semibold">
                  {brl(liquid, hidden)}
                </span>{" "}
                · {((liquid / total) * 100).toFixed(1)}%
              </p>
              <p>
                Preso{" "}
                <span className="whitespace-nowrap font-semibold">
                  {brl(locked + excluded, hidden)}
                </span>{" "}
                · {(((locked + excluded) / total) * 100).toFixed(1)}%
              </p>
            </div>
          </DsCard>

          {groups.map((g) => (
            <DsCard key={g.key}>
              <button
                type="button"
                className="flex w-full min-w-0 items-start gap-3 text-left"
                onClick={() => setOpen(open === g.key ? null : g.key)}
              >
                <IconBadge name="trending" tone={g.locked ? "warn" : "ok"} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-base font-semibold">{g.name}</p>
                  <p className="text-sm text-ds-muted">
                    {g.titles.length} título{g.titles.length === 1 ? "" : "s"}
                    {g.locked ? " · Preso até o vencimento" : " · Liquidez diária"}
                    {g.iof > 0 ? ` · IOF ${brl(g.iof, hidden)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="whitespace-nowrap font-semibold">
                    <AppMoney value={g.net} />
                  </p>
                  <p className="text-sm text-ds-pos">
                    rendeu {brl(g.earnings, hidden)}
                  </p>
                </div>
              </button>
              {open === g.key ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="text-ds-muted">
                      <tr>
                        <th className="py-2 font-medium">Aplicado em</th>
                        <th className="py-2 font-medium">Vence em</th>
                        <th className="py-2 font-medium">Valor aplicado</th>
                        <th className="py-2 font-medium">Valor hoje</th>
                        <th className="py-2 font-medium">Fora da reserva</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.titles.map((t) => (
                        <tr key={t.id} className="border-t border-ds-border">
                          <td className="py-2">
                            {t.purchaseDate ? formatDateBR(t.purchaseDate) : "—"}
                          </td>
                          <td className="py-2">
                            {t.dueDate ? formatDateBR(t.dueDate) : "—"}
                          </td>
                          <td className="py-2 whitespace-nowrap">
                            {brl(t.invested, hidden)}
                          </td>
                          <td className="py-2 whitespace-nowrap">
                            {brl(t.gross, hidden)}
                          </td>
                          <td className="py-2">
                            <label className="flex items-center gap-2">
                              <input
                                key={`${t.id}-${t.excludeFromReserve}`}
                                type="checkbox"
                                className="size-4 accent-ds-accent"
                                aria-label="Fora da reserva"
                                defaultChecked={t.excludeFromReserve}
                                disabled={pending}
                                onChange={(e) => {
                                  const fd = new FormData()
                                  fd.set("id", t.id)
                                  fd.set(
                                    "exclude_from_reserve",
                                    e.target.checked ? "true" : "false"
                                  )
                                  start(async () => {
                                    const res =
                                      await setPositionExcludeFromReserveAction(fd)
                                    if (res.error) toast.error(res.error)
                                  })
                                }}
                              />
                              <span className="text-ds-muted">Fora da reserva</span>
                            </label>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </DsCard>
          ))}

          <DsCard>
            <SectionHead title="Reserva de emergência" />
            <p className="text-sm text-ds-muted">Reserva livre</p>
            <p className="text-[34px] font-semibold leading-none">
              {reserve.monthsLivre.toFixed(1)}{" "}
              <span className="text-lg font-medium text-ds-muted">de 6</span>
            </p>
            <p className="whitespace-nowrap text-lg font-semibold">
              <AppMoney value={reserve.livre} />
            </p>
            <p className="text-sm text-ds-muted">
              Depois de pagar as faturas abertas
            </p>
            <p className="text-sm text-ds-subtle">
              Disponível hoje (antes das faturas) {brl(reserve.disponivel, hidden)}{" "}
              · {reserve.monthsDisponivel.toFixed(1)} meses
            </p>
            <Bar pct={reserve.progress} />
            {reserve.excluded > 0 ? (
              <p className="text-sm text-ds-muted">
                Fora da reserva{" "}
                <span className="whitespace-nowrap font-semibold">
                  {brl(reserve.excluded, hidden)}
                </span>
              </p>
            ) : null}
            <p className="text-sm leading-5 text-ds-muted">
              Contamos o gasto que se repete: {brl(reserve.recurringSpend, hidden)} por
              mês (média de 6 meses, sem compras pontuais). Faturas abertas:{" "}
              {reserve.billLines
                .map((b) => `${b.name} ${brl(b.amount, hidden)}`)
                .join(" + ") || "nenhuma"}
              {reserve.billLines.length
                ? ` = ${brl(reserve.openBills, hidden)}`
                : ""}
              {reserve.excluded > 0
                ? `. Fora da reserva: ${brl(reserve.excluded, hidden)}`
                : ""}
              . Para 6 meses ({brl(reserve.target, hidden)}) faltam{" "}
              {brl(reserve.falta, hidden)} na reserva livre.
            </p>
          </DsCard>

          {vencimentos.length > 0 ? (
            <DsCard>
              <SectionHead title="Próximos vencimentos" />
              {vencimentos.map((v) => (
                <div
                  key={`${v.date}-${v.name}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-ds-muted">{formatDateBR(v.date)}</span>
                  <span className="min-w-0 flex-1 truncate">{v.name}</span>
                  <span className="whitespace-nowrap font-medium">
                    {brl(v.gross, hidden)}
                  </span>
                </div>
              ))}
            </DsCard>
          ) : null}

          <DsCard>
            <SectionHead title="Impostos estimados" />
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <tbody>
                  {bands.map((b) => (
                    <tr key={b.label} className="border-b border-ds-border">
                      <td className="py-2">{b.label}</td>
                      <td className="py-2">{b.rate}</td>
                      <td className="py-2 whitespace-nowrap">{brl(b.gross, hidden)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <p className="flex justify-between gap-3">
                Valor hoje (bruto){" "}
                <span className="whitespace-nowrap">{brl(gross, hidden)}</span>
              </p>
              <p className="flex justify-between gap-3">
                Rendimento{" "}
                <span className="whitespace-nowrap">{brl(earnings, hidden)}</span>
              </p>
              {iof > 0 ? (
                <p className="flex justify-between gap-3">
                  IOF (resgate com menos de 30 dias){" "}
                  <span className="whitespace-nowrap">−{brl(iof, hidden)}</span>
                </p>
              ) : null}
              <p className="flex justify-between gap-3">
                IR estimado{" "}
                <span className="whitespace-nowrap">−{brl(ir, hidden)}</span>
              </p>
              <p className="flex justify-between gap-3 font-semibold">
                Você recebe (líquido){" "}
                <span className="whitespace-nowrap">{brl(net, hidden)}</span>
              </p>
            </div>
            <p className="text-sm leading-5 text-ds-subtle">
              Se resgatar hoje. Primeiro sai o IOF
              {iofNotes.length
                ? `, nos títulos com menos de 30 dias (${iofNotes
                    .map((t) => `${t.days} dias`)
                    .join(", ")})`
                : ""}
              . Depois o IR, sobre o rendimento que sobrou.
            </p>
          </DsCard>
        </>
      )}
    </div>
  )
}
