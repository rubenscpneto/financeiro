"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { upsertBudgetAction, deleteBudgetAction } from "@/lib/actions/crud"
import type { Budget, Category } from "@/lib/types"
import { formatBRL, currentYearMonth } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Progress } from "@/components/ui/progress"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

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
  const expenseCats = categories.filter((c) => c.kind === "expense")

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Definir orçamento</CardTitle>
          <CardDescription>Limite mensal por categoria.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={(fd) => {
              start(async () => {
                const res = await upsertBudgetAction(fd)
                if (res.error) toast.error(res.error)
                else toast.success("Orçamento salvo")
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
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
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
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {budgets.map((b) => {
          const limit = Number(b.limit_amount)
          const spent = Math.abs(b.spent)
          const pct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0
          return (
            <Card key={b.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base">
                    {b.categories?.name ?? "Categoria"}
                  </CardTitle>
                  <CardDescription>{b.year_month}</CardDescription>
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
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <div className="flex justify-between text-sm">
                  <span>{formatBRL(spent)} gastos</span>
                  <span className="text-muted-foreground">
                    de {formatBRL(limit)}
                  </span>
                </div>
                <Progress value={pct} />
              </CardContent>
            </Card>
          )
        })}
        {budgets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum orçamento para {yearMonth || currentYearMonth()}.
          </p>
        ) : null}
      </div>
    </div>
  )
}
