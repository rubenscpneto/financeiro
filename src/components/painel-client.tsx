"use client"

import Link from "next/link"
import { DsCard, Bar, PageTitle, SectionHead } from "@/components/design/primitives"
import { AppMoney } from "@/components/app-money"
import { brl } from "@/components/design/money-display"
import { useHideValues } from "@/components/hide-values-provider"
import { budgetStatus } from "@/lib/design/budget-status"
import { currentYearMonth } from "@/lib/format"

export function PainelClient({
  netWorth,
  checking,
  creditDebt,
  investments,
  income,
  expense,
  flowByDay: _flowByDay,
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
  const { hidden } = useHideValues()
  const monthBudget = budgets.reduce((s, b) => s + b.limit, 0)
  const monthLabel = currentYearMonth()
  const spentRatio = monthBudget > 0 ? expense / monthBudget : 0
  void _flowByDay

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        title="Início"
        subtitle={`Visão geral de ${monthLabel} · teto por categoria`}
      />

      <div className="grid gap-3 lg:grid-cols-4">
        <DsCard className="gap-2 border-ds-hero-stroke bg-ds-hero p-5 text-ds-on-hero lg:col-span-1">
          <p className="text-sm text-ds-on-hero-muted">Quanto você tem</p>
          <p className="text-[32px] leading-none font-semibold tracking-tight">
            <AppMoney value={netWorth} className="text-ds-on-hero" />
          </p>
          <p className="text-sm text-ds-on-hero-muted">
            Conta + investimentos − cartão
          </p>
        </DsCard>
        <DsCard className="gap-1.5">
          <p className="text-sm text-ds-muted">Na conta</p>
          <p className="text-2xl font-semibold">
            <AppMoney value={checking} />
          </p>
          <p className="text-sm text-ds-muted">
            Entrou <AppMoney value={income} /> este mês
          </p>
        </DsCard>
        <DsCard className="gap-1.5">
          <p className="text-sm text-ds-muted">Investido</p>
          <p className="text-2xl font-semibold">
            <AppMoney value={investments} />
          </p>
          <Link href="/investimentos" className="text-sm font-semibold text-ds-accent">
            Ver carteira
          </Link>
        </DsCard>
        <DsCard className="gap-1.5">
          <p className="text-sm text-ds-muted">Cartão a pagar</p>
          <p className="text-2xl font-semibold">
            <AppMoney value={creditDebt} />
          </p>
          <p className="text-sm text-ds-muted">Fatura atual</p>
        </DsCard>
      </div>

      <DsCard>
        <p className="text-sm text-ds-muted">Quanto gastou no mês</p>
        <p className="text-[28px] font-semibold">
          <AppMoney value={expense} />
        </p>
        <p className="text-sm text-ds-muted">
          de {brl(monthBudget, hidden)} em tetos de categoria
        </p>
        <Bar pct={spentRatio} tone={spentRatio >= 1 ? "danger" : spentRatio >= 0.85 ? "warn" : "ok"} />
      </DsCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <DsCard>
          <SectionHead title="Limites do mês" action="Ver todos" />
          {budgets.length ? (
            budgets.map((b) => {
              const status = budgetStatus(b.spent, b.limit)
              return (
                <div key={b.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-medium">{b.name}</p>
                    <p
                      className={
                        status.tone === "danger"
                          ? "text-sm font-semibold text-ds-danger"
                          : status.tone === "warn"
                            ? "text-sm font-semibold text-ds-warn"
                            : "text-sm font-semibold text-ds-accent"
                      }
                    >
                      {status.label}
                    </p>
                  </div>
                  <Bar pct={status.pct} tone={status.tone} />
                  <p className="text-sm text-ds-muted">
                    Gastou {brl(b.spent, hidden)} de {brl(b.limit, hidden)}
                  </p>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-ds-muted">
              Defina tetos por categoria em Planejar gastos.
            </p>
          )}
          <Link href="/orcamentos" className="text-[15px] font-semibold text-ds-accent">
            Abrir orçamentos
          </Link>
        </DsCard>

        <DsCard>
          <SectionHead title="Metas" />
          {goals.length ? (
            goals.map((g) => {
              const pct = g.target > 0 ? g.current / g.target : 0
              return (
                <div key={g.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-medium">{g.name}</p>
                    <AppMoney value={g.current} className="text-sm font-semibold" />
                  </div>
                  <Bar pct={pct} tone="ok" />
                  <p className="text-sm text-ds-muted">
                    de {brl(g.target, hidden)}
                  </p>
                </div>
              )
            })
          ) : (
            <p className="text-sm text-ds-muted">Crie metas em Metas.</p>
          )}
          <Link href="/metas" className="text-[15px] font-semibold text-ds-accent">
            Ver metas
          </Link>
        </DsCard>
      </div>

      <DsCard>
        <SectionHead title="Top categorias" />
        {topCategories.length ? (
          topCategories.map((c) => {
            const max = topCategories[0]?.value || 1
            return (
              <div key={c.name} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-medium">{c.name}</p>
                  <AppMoney value={c.value} className="text-sm font-semibold" />
                </div>
                <Bar pct={c.value / max} tone="ink" />
              </div>
            )
          })
        ) : (
          <p className="text-sm text-ds-muted">
            Sem despesas categorizadas neste mês.
          </p>
        )}
      </DsCard>
    </div>
  )
}
