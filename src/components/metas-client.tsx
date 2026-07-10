"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import {
  createGoalAction,
  updateGoalAction,
  deleteGoalAction,
} from "@/lib/actions/crud"
import type { Goal } from "@/lib/types"
import { formatBRL } from "@/lib/format"
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

export function MetasClient({ goals }: { goals: Goal[] }) {
  const [pending, start] = useTransition()

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova meta</CardTitle>
          <CardDescription>Objetivos financeiros com progresso.</CardDescription>
        </CardHeader>
        <CardContent>
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
                <Input id="name" name="name" required placeholder="Reserva de emergência" />
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
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {goals.map((g) => {
          const target = Number(g.target_amount)
          const current = Number(g.current_amount)
          const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0
          return (
            <Card key={g.id} className={g.is_archived ? "opacity-60" : undefined}>
              <CardHeader>
                <CardTitle className="text-base">{g.name}</CardTitle>
                <CardDescription>
                  {formatBRL(current)} de {formatBRL(target)}
                  {g.deadline ? ` · até ${g.deadline}` : ""}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <Progress value={pct} />
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
                  <label className="flex items-center gap-1 text-xs">
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
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
