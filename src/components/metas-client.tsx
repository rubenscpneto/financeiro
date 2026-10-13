"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import {
  createGoalAction,
  updateGoalAction,
  deleteGoalAction,
} from "@/lib/actions/crud"
import type { Goal } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Bar, DsCard, PageTitle } from "@/components/design/primitives"
import { AppMoney } from "@/components/app-money"
import { brl } from "@/components/design/money-display"
import { useHideValues } from "@/components/hide-values-provider"

export function MetasClient({ goals }: { goals: Goal[] }) {
  const [pending, start] = useTransition()
  const { hidden } = useHideValues()

  return (
    <div className="flex flex-col gap-4">
      <PageTitle
        title="Metas"
        subtitle="Objetivos financeiros com progresso."
      />

      <DsCard>
        <h2 className="text-lg font-semibold">Nova meta</h2>
        <form
          action={(fd) => {
            start(async () => {
              const res = await createGoalAction(fd)
              if (res.error) toast.error(res.error)
              else toast.success("Meta criada")
            })
          }}
        >
          <FieldGroup className="md:grid md:grid-cols-4 md:items-end">
            <Field>
              <FieldLabel htmlFor="name">Nome</FieldLabel>
              <Input
                id="name"
                name="name"
                required
                placeholder="Reserva de emergência"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="target_amount">Objetivo (R$)</FieldLabel>
              <Input id="target_amount" name="target_amount" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="current_amount">Atual (R$)</FieldLabel>
              <Input id="current_amount" name="current_amount" defaultValue="0" />
            </Field>
            <Field>
              <FieldLabel htmlFor="deadline">Prazo</FieldLabel>
              <Input id="deadline" name="deadline" type="date" />
            </Field>
            <Button type="submit" disabled={pending} className="md:col-span-4 md:w-fit">
              Criar meta
            </Button>
          </FieldGroup>
        </form>
      </DsCard>

      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((g) => {
          const target = Number(g.target_amount)
          const current = Number(g.current_amount)
          const pct = target > 0 ? current / target : 0
          return (
            <DsCard key={g.id} className={g.is_archived ? "opacity-60" : undefined}>
              <div className="flex items-start justify-between gap-3">
                <p className="text-base font-semibold">{g.name}</p>
                <AppMoney value={current} className="text-base font-semibold" />
              </div>
              <p className="text-sm text-ds-muted">
                de {brl(target, hidden)}
                {g.deadline ? ` · até ${g.deadline}` : ""}
              </p>
              <Bar pct={pct} tone="ok" />
              <form
                className="flex flex-wrap items-end gap-2"
                action={(fd) => {
                  start(async () => {
                    const res = await updateGoalAction(fd)
                    if (res.error) toast.error(res.error)
                    else toast.success("Meta atualizada")
                  })
                }}
              >
                <input type="hidden" name="id" value={g.id} />
                <Field>
                  <FieldLabel htmlFor={`cur-${g.id}`}>Valor atual</FieldLabel>
                  <Input
                    id={`cur-${g.id}`}
                    name="current_amount"
                    defaultValue={String(current)}
                  />
                </Field>
                <label className="flex items-center gap-2 text-sm text-ds-muted">
                  <input
                    type="checkbox"
                    name="is_archived"
                    defaultChecked={g.is_archived}
                  />
                  Arquivada
                </label>
                <Button type="submit" size="sm" disabled={pending}>
                  Salvar
                </Button>
              </form>
              <form
                action={(fd) => {
                  start(async () => {
                    const res = await deleteGoalAction(fd)
                    if (res.error) toast.error(res.error)
                  })
                }}
              >
                <input type="hidden" name="id" value={g.id} />
                <Button type="submit" size="sm" variant="destructive">
                  Excluir
                </Button>
              </form>
            </DsCard>
          )
        })}
      </div>
    </div>
  )
}
