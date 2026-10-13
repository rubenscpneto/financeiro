"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { upsertBudgetAction, deleteBudgetAction } from "@/lib/actions/crud"
import type { Budget, Category } from "@/lib/types"
import { currentYearMonth } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Bar,
  DsCard,
  PageTitle,
  dsControlClass,
} from "@/components/design/primitives"
import { brl } from "@/components/design/money-display"
import { useHideValues } from "@/components/hide-values-provider"
import { budgetStatus } from "@/lib/design/budget-status"

type BudgetRow = Budget & {
  categories?: { name: string; color: string | null } | null
  spent: number
}

export function OrcamentosClient({
  budgets,
  categories,
  yearMonth,
}: {
  budgets: BudgetRow[]
  categories: Category[]
  yearMonth: string
}) {
  const [pending, start] = useTransition()
  const { hidden } = useHideValues()
  const expenseCats = categories.filter((c) => c.kind === "expense")

  return (
    <div className="flex flex-col gap-4">
      <PageTitle subtitle="Teto mensal por categoria." />

      <DsCard>
        <h2 className="text-lg font-semibold">Definir teto</h2>
        <form
          action={(fd) => {
            start(async () => {
              const res = await upsertBudgetAction(fd)
              if (res.error) toast.error(res.error)
              else toast.success("Teto salvo")
            })
          }}
        >
          <FieldGroup className="md:grid md:grid-cols-4 md:items-end">
            <Field>
              <FieldLabel htmlFor="year_month">Mês</FieldLabel>
              <Input
                id="year_month"
                name="year_month"
                type="month"
                defaultValue={yearMonth}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="category_id">Categoria</FieldLabel>
              <select
                id="category_id"
                name="category_id"
                className={`${dsControlClass} w-full`}
                required
              >
                {expenseCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor="limit_amount">Limite (R$)</FieldLabel>
              <Input
                id="limit_amount"
                name="limit_amount"
                inputMode="decimal"
                placeholder="500"
                required
              />
            </Field>
            <Button type="submit" disabled={pending}>
              Salvar
            </Button>
          </FieldGroup>
        </form>
      </DsCard>

      <div className="grid gap-4 md:grid-cols-2">
        {budgets.map((b) => {
          const limit = Number(b.limit_amount)
          const spent = Math.abs(b.spent)
          const status = budgetStatus(spent, limit)
          return (
            <DsCard key={b.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">
                    {b.categories?.name ?? "Categoria"}
                  </p>
                  <p className="text-sm text-ds-muted">{b.year_month}</p>
                </div>
                <form
                  action={(fd) => {
                    start(async () => {
                      const res = await deleteBudgetAction(fd)
                      if (res.error) toast.error(res.error)
                    })
                  }}
                >
                  <input type="hidden" name="id" value={b.id} />
                  <Button type="submit" size="sm" variant="ghost">
                    Excluir
                  </Button>
                </form>
              </div>
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
              <Bar pct={status.pct} tone={status.tone} />
              <p className="text-sm text-ds-muted">
                Gastou {brl(spent, hidden)} de {brl(limit, hidden)}
              </p>
            </DsCard>
          )
        })}
        {budgets.length === 0 ? (
          <p className="text-sm text-ds-muted">
            Nenhum teto para {yearMonth || currentYearMonth()}.
          </p>
        ) : null}
      </div>
    </div>
  )
}
