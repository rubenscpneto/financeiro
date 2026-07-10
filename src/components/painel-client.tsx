"use client"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell } from "recharts"
import { formatBRL } from "@/lib/format"

const flowConfig = {
  entradas: { label: "Entradas", color: "var(--chart-2)" },
  saidas: { label: "Saídas", color: "var(--chart-1)" },
} satisfies ChartConfig

const catConfig = {
  value: { label: "Valor", color: "var(--chart-1)" },
} satisfies ChartConfig

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function PainelClient({
  netWorth,
  checking,
  creditDebt,
  investments,
  income,
  expense,
  flowByDay,
  topCategories,
  budgets,
  goals,
}: {
  netWorth: number
  checking: number
  creditDebt: number
  investments: number
  income: number
  expense: number
  flowByDay: { day: string; entradas: number; saidas: number }[]
  topCategories: { name: string; value: number; color?: string | null }[]
  budgets: { name: string; spent: number; limit: number }[]
  goals: { name: string; current: number; target: number }[]
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Patrimônio líquido</CardDescription>
            <CardTitle className="text-2xl">{formatBRL(netWorth)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Conta {formatBRL(checking)} − cartão {formatBRL(creditDebt)} + invest.{" "}
            {formatBRL(investments)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Entradas no mês</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">
              {formatBRL(income)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Saídas no mês</CardDescription>
            <CardTitle className="text-2xl text-red-600">
              {formatBRL(expense)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Saldo do mês</CardDescription>
            <CardTitle className="text-2xl">
              {formatBRL(income - expense)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Fluxo diário</CardTitle>
            <CardDescription>Entradas e saídas do mês</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={flowConfig} className="h-64 w-full">
              <BarChart data={flowByDay}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="entradas" fill="var(--color-entradas)" radius={4} />
                <Bar dataKey="saidas" fill="var(--color-saidas)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top categorias</CardTitle>
            <CardDescription>Despesas do mês</CardDescription>
          </CardHeader>
          <CardContent>
            {topCategories.length ? (
              <ChartContainer config={catConfig} className="mx-auto h-64 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={topCategories}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={90}
                  >
                    {topCategories.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sem despesas categorizadas neste mês.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Orçamentos</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {budgets.map((b) => {
              const pct =
                b.limit > 0 ? Math.min(100, (b.spent / b.limit) * 100) : 0
              return (
                <div key={b.name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span>{b.name}</span>
                    <span className="text-muted-foreground">
                      {formatBRL(b.spent)} / {formatBRL(b.limit)}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              )
            })}
            {budgets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Defina orçamentos em Orçamentos.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {goals.map((g) => {
              const pct =
                g.target > 0 ? Math.min(100, (g.current / g.target) * 100) : 0
              return (
                <div key={g.name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-sm">
                    <span>{g.name}</span>
                    <span className="text-muted-foreground">
                      {formatBRL(g.current)} / {formatBRL(g.target)}
                    </span>
                  </div>
                  <Progress value={pct} />
                </div>
              )
            })}
            {goals.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Crie metas em Metas.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
