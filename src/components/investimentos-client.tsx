"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatDateBR } from "@/lib/format"
import { ASSET_CLASS_LABELS, type AssetClass } from "@/lib/types"
import {
  sliceEvolution,
  type EvolutionPoint,
} from "@/lib/investments/evolution"
import { cn } from "@/lib/utils"
import {
  DsCard,
  IconBadge,
  PageTitle,
  SectionHead,
} from "@/components/design/primitives"
import { AppMoney } from "@/components/app-money"
import { brl } from "@/components/design/money-display"
import { useHideValues } from "@/components/hide-values-provider"
import { DesignIcon } from "@/components/design/icons"

const chartConfig = {
  value: { label: "Patrimônio", color: "var(--ds-accent)" },
} satisfies ChartConfig

export type AtivoView = {
  id: string
  assetName: string
  ticker: string | null
  assetClass: AssetClass
  institution: string
  investedAt: string
  rentabilidade: string | null
  valorInvestido: number
  valorAtual: number
  rendimento: number
  rendimentoPct: number | null
  portfolioPct: number
}

export type MovimentoView = {
  id: string
  date: string
  type: "aporte" | "resgate"
  amount: number
}

type PeriodMonths = 3 | 6 | 12

const PERIODS: { months: PeriodMonths; label: string }[] = [
  { months: 3, label: "3m" },
  { months: 6, label: "6m" },
  { months: 12, label: "12m" },
]

function formatAxisBRL(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `R$ ${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}k`
  }
  return brl(value, false)
}

function formatPct(pct: number) {
  return `${pct >= 0 ? "" : "−"}${Math.abs(pct).toFixed(1)}%`
}

export function InvestimentosClient({
  currentTotal,
  evolution,
  ativos,
  movimentos,
}: {
  currentTotal: number
  evolution: EvolutionPoint[]
  ativos: AtivoView[]
  movimentos: MovimentoView[]
}) {
  const [period, setPeriod] = useState<PeriodMonths>(12)
  const [openId, setOpenId] = useState<string | null>(null)
  const { hidden } = useHideValues()

  const series = useMemo(
    () => sliceEvolution(evolution, period),
    [evolution, period]
  )

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        title="Investimentos"
        subtitle="Patrimônio, ativos e movimentações."
      />

      <DsCard className="gap-2 border-ds-hero-stroke bg-ds-hero p-5 text-ds-on-hero">
        <p className="text-sm text-ds-on-hero-muted">Patrimônio investido</p>
        <p className="text-[32px] leading-none font-semibold">
          <AppMoney value={currentTotal} className="text-ds-on-hero" />
        </p>
      </DsCard>

      <DsCard>
        <div className="flex items-center justify-between gap-3">
          <SectionHead title="Evolução" />
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <button
                key={p.months}
                type="button"
                onClick={() => setPeriod(p.months)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-medium",
                  period === p.months
                    ? "bg-ds-accent-soft font-semibold text-ds-accent"
                    : "text-ds-muted"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {series.some((p) => p.value > 0) ? (
          <ChartContainer config={chartConfig} className="h-64 w-full">
            <AreaChart
              data={series}
              margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
            >
              <defs>
                <linearGradient id="investFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ds-accent)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--ds-accent)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={56}
                tickFormatter={hidden ? () => "••••" : formatAxisBRL}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <AppMoney
                        value={typeof value === "number" ? value : Number(value)}
                        className="font-medium"
                      />
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--ds-accent)"
                fill="url(#investFill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        ) : (
          <p className="py-12 text-center text-sm text-ds-muted">
            Sem dados de evolução. Sincronize investimentos via Open Finance.
          </p>
        )}
      </DsCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <DsCard className="gap-0">
          <div className="pb-3">
            <SectionHead title="Ativos" />
          </div>
          {ativos.map((a) => {
            const open = openId === a.id
            return (
              <div key={a.id} className="border-b border-ds-border last:border-0">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 py-3 text-left"
                  onClick={() => setOpenId(open ? null : a.id)}
                  aria-expanded={open}
                >
                  <IconBadge name="trending" tone="ok" size={40} iconSize={20} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-medium">{a.assetName}</p>
                    <p className="truncate text-sm text-ds-muted">
                      {[a.institution, ASSET_CLASS_LABELS[a.assetClass]]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <AppMoney
                      value={a.valorAtual}
                      className="text-base font-semibold text-ds-pos"
                    />
                    <p className="text-sm text-ds-muted">
                      {formatPct(a.portfolioPct)}
                    </p>
                  </div>
                  <DesignIcon
                    name="chevron"
                    size={18}
                    className={cn(
                      "shrink-0 text-ds-subtle transition-transform",
                      open && "rotate-90"
                    )}
                  />
                </button>
                {open ? (
                  <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3">
                    <Detail label="Data" value={formatDateBR(a.investedAt)} />
                    <Detail
                      label="Classe"
                      value={ASSET_CLASS_LABELS[a.assetClass]}
                    />
                    <Detail label="Rentabilidade" value={a.rentabilidade ?? "—"} />
                    <Detail
                      label="Investido"
                      value={<AppMoney value={a.valorInvestido} />}
                    />
                    <Detail
                      label="Rendimento"
                      value={
                        <span
                          className={
                            a.rendimento >= 0 ? "text-ds-pos" : "text-ds-danger"
                          }
                        >
                          <AppMoney value={a.rendimento} sign />
                          {a.rendimentoPct != null
                            ? ` (${formatPct(a.rendimentoPct)})`
                            : ""}
                        </span>
                      }
                    />
                    <Detail
                      label="Atual"
                      value={<AppMoney value={a.valorAtual} />}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
          {ativos.length === 0 ? (
            <p className="py-6 text-center text-sm text-ds-muted">
              Nenhuma posição. Importe ou sincronize investimentos.
            </p>
          ) : null}
        </DsCard>

        <DsCard className="gap-0">
          <div className="pb-3">
            <SectionHead title="Movimentações" />
          </div>
          {movimentos.map((m) => {
            const isAporte = m.type === "aporte"
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 border-b border-ds-border py-3 last:border-0"
              >
                <IconBadge
                  name={isAporte ? "income" : "trending"}
                  tone={isAporte ? "pos" : "danger"}
                  size={40}
                  iconSize={20}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium">
                    {isAporte ? "Aporte" : "Resgate"}
                  </p>
                  <p className="text-sm text-ds-muted">{formatDateBR(m.date)}</p>
                </div>
                <AppMoney
                  value={Math.abs(m.amount)}
                  className={`text-base font-semibold ${isAporte ? "text-ds-pos" : "text-ds-danger"}`}
                />
              </div>
            )
          })}
          {movimentos.length === 0 ? (
            <p className="py-6 text-center text-sm text-ds-muted">
              Sem movimentações.
            </p>
          ) : null}
        </DsCard>
      </div>
    </div>
  )
}

function Detail({
  label,
  value,
}: {
  label: string
  value: ReactNode
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-sm text-ds-subtle">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}
