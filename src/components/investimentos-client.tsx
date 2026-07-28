"use client"

import { useMemo, useState, type ReactNode } from "react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts"
import { ChevronDown, LineChart, ArrowDownLeft, ArrowUpRight } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { formatBRL, formatDateBR, cnSignClass } from "@/lib/format"
import { ASSET_CLASS_LABELS, type AssetClass } from "@/lib/types"
import {
  sliceEvolution,
  type EvolutionPoint,
} from "@/lib/investments/evolution"
import { cn } from "@/lib/utils"

const chartConfig = {
  value: { label: "Patrimônio", color: "var(--chart-2)" },
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
  return formatBRL(value)
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

  const series = useMemo(
    () => sliceEvolution(evolution, period),
    [evolution, period]
  )

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardDescription className="flex items-center gap-1.5 text-xs tracking-wide uppercase">
              <LineChart className="size-3.5" />
              Evolução do patrimônio
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {formatBRL(currentTotal)}
            </CardTitle>
          </div>
          <div className="flex gap-1">
            {PERIODS.map((p) => (
              <Button
                key={p.months}
                type="button"
                size="xs"
                variant={period === p.months ? "secondary" : "ghost"}
                onClick={() => setPeriod(p.months)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {series.some((p) => p.value > 0) ? (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <AreaChart
                data={series}
                margin={{ left: 4, right: 8, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="investFill" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="0%"
                      stopColor="var(--color-value)"
                      stopOpacity={0.35}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--color-value)"
                      stopOpacity={0.02}
                    />
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
                  tickFormatter={formatAxisBRL}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => (
                        <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                          <span className="text-muted-foreground">
                            Patrimônio
                          </span>
                          <span className="font-mono font-medium text-foreground tabular-nums">
                            {formatBRL(
                              typeof value === "number"
                                ? value
                                : Number(value)
                            )}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  fill="url(#investFill)"
                  strokeWidth={2}
                  dot={{
                    r: 3,
                    fill: "var(--color-value)",
                    strokeWidth: 0,
                  }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ChartContainer>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Sem dados de evolução. Sincronize investimentos via Open Finance.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ativos</CardTitle>
            <CardDescription>
              Posições ativas e rendimento líquido
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {ativos.map((a) => {
              const open = openId === a.id
              return (
                <div
                  key={a.id}
                  className="border-b border-border/60 last:border-0"
                >
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 py-3 text-left"
                    onClick={() => setOpenId(open ? null : a.id)}
                    aria-expanded={open}
                  >
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted">
                      <LineChart className="size-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">
                        {a.assetName}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        {[a.institution, ASSET_CLASS_LABELS[a.assetClass]]
                          .filter(Boolean)
                          .join(" · ")}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-medium text-emerald-600 dark:text-emerald-400">
                        {formatBRL(a.valorAtual)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatPct(a.portfolioPct)}
                      </div>
                    </div>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-muted-foreground transition-transform",
                        open && "rotate-180"
                      )}
                    />
                  </button>
                  {open ? (
                    <div className="grid grid-cols-2 gap-3 pb-4 sm:grid-cols-3">
                      <Detail
                        label="Data do investimento"
                        value={formatDateBR(a.investedAt)}
                      />
                      <Detail
                        label="Classe"
                        value={ASSET_CLASS_LABELS[a.assetClass]}
                      />
                      <Detail
                        label="Rentabilidade"
                        value={a.rentabilidade ?? "—"}
                      />
                      <Detail
                        label="Valor investido"
                        value={formatBRL(a.valorInvestido)}
                      />
                      <Detail
                        label="Rendimento"
                        value={
                          <span className={cnSignClass(a.rendimento)}>
                            {formatBRL(a.rendimento)}
                            {a.rendimentoPct != null
                              ? ` (${formatPct(a.rendimentoPct)})`
                              : ""}
                          </span>
                        }
                      />
                      <Detail
                        label="Valor atual"
                        value={formatBRL(a.valorAtual)}
                      />
                    </div>
                  ) : null}
                </div>
              )
            })}
            {ativos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma posição. Importe ou sincronize investimentos.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimentações</CardTitle>
            <CardDescription>Aportes e resgates</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1">
            {movimentos.map((m) => {
              const isAporte = m.type === "aporte"
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 border-b border-border/60 py-3 last:border-0"
                >
                  <div
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-md",
                      isAporte
                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        : "bg-red-500/15 text-red-600 dark:text-red-400"
                    )}
                  >
                    {isAporte ? (
                      <ArrowDownLeft className="size-4" />
                    ) : (
                      <ArrowUpRight className="size-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">
                      {isAporte ? "Aporte" : "Resgate"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateBR(m.date)}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "shrink-0 font-medium",
                      isAporte
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    )}
                  >
                    {formatBRL(Math.abs(m.amount))}
                  </div>
                </div>
              )
            })}
            {movimentos.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sem movimentações.
              </p>
            ) : null}
          </CardContent>
        </Card>
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
    <div className="space-y-0.5">
      <div className="text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}
