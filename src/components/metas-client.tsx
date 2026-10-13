"use client"

import { useState, useTransition } from "react"
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
import { Bar, Chip, DsCard, PageTitle } from "@/components/design/primitives"
import { AppMoney } from "@/components/app-money"
import { brl } from "@/components/design/money-display"
import { useHideValues } from "@/components/hide-values-provider"
import { formatDateBR } from "@/lib/format"
import type { ReserveView } from "@/lib/reserve"
import { receivablesTotal, type LoanGroup } from "@/lib/loans"
import { goalMonthlyPace, goalPaceCopy } from "@/lib/ui-copy"
import {
  LoanActions,
  LoanOriginalLine,
  LoanWriteOffDialog,
  UndoWriteOffButton,
  type LoanWriteOffTarget,
} from "@/components/loan-writeoff"

export function MetasClient({
  goals,
  reserve,
  loans,
  refunds,
  helpRows,
  monthSpend,
}: {
  goals: Goal[]
  reserve: ReserveView
  loans: LoanGroup[]
  refunds: { id: string; name: string; amount: number }[]
  helpRows: {
    id: string
    date: string
    person: string
    originalDate: string
    originalAmount: number
    amount: number
  }[]
  monthSpend: number
}) {
  const [pending, start] = useTransition()
  const [writeOff, setWriteOff] = useState<LoanWriteOffTarget | null>(null)
  const { hidden } = useHideValues()
  const openLoans = loans.filter((l) => l.remaining > 0 && !l.writtenOff)
  const loanTotal = openLoans.reduce((s, l) => s + l.remaining, 0)
  const refundTotal = refunds.reduce((s, r) => s + Math.abs(r.amount), 0)
  const receivable = receivablesTotal(loans, refunds)

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_400px] lg:items-start">
      <div className="flex flex-col gap-4">
        <PageTitle subtitle="Metas e valores a receber." />

        {helpRows[0] ? (
          <DsCard className="bg-ds-accent-soft" >
            <p role="status" className="font-semibold">
              Pronto: {brl(Math.abs(helpRows[0].amount), hidden)} de{" "}
              {helpRows[0].person} agora é gasto em Ajuda à família
            </p>
            <p className="text-sm text-ds-muted">
              Saiu de Valores a receber e entrou nos gastos do mês (
              {formatDateBR(helpRows[0].date)}). Seus gastos passam a{" "}
              {brl(monthSpend, hidden)}.
            </p>
            <UndoWriteOffButton id={helpRows[0].id} />
          </DsCard>
        ) : null}

        <DsCard>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">Reserva de emergência</p>
              <p className="text-sm text-ds-muted">
                Meta: 6 meses do gasto que se repete ·{" "}
                {reserve.monthsLivre.toFixed(1)} de 6 meses
              </p>
            </div>
            <Chip>{Math.round(reserve.progress * 100)}%</Chip>
          </div>
          <p className="text-sm text-ds-subtle">
            Reserva livre: disponível hoje menos as faturas abertas
          </p>
          <p className="text-xl font-semibold whitespace-nowrap">
            <AppMoney value={reserve.livre} />
            <span className="text-sm font-medium text-ds-muted">
              {" "}
              de {brl(reserve.target, hidden)}
            </span>
          </p>
          <Bar pct={reserve.progress} />
          <p className="text-sm text-ds-subtle">
            Disponível hoje {brl(reserve.disponivel, hidden)} ·{" "}
            {reserve.monthsDisponivel.toFixed(1)} meses
          </p>
          {reserve.excluded > 0 ? (
            <p className="text-sm text-ds-muted">
              Fora da reserva {brl(reserve.excluded, hidden)}
            </p>
          ) : null}
          <p className="text-sm leading-5 text-ds-muted">
            Vem sozinho dos investimentos com liquidez diária, já descontando as
            faturas abertas ({brl(reserve.openBills, hidden)}
            {reserve.excluded > 0
              ? `) e o que está fora da reserva (${brl(reserve.excluded, hidden)}`
              : ""}
            ). Gasto que se repete: {brl(reserve.recurringSpend, hidden)} por mês.
            Faltam {brl(reserve.falta, hidden)}.
          </p>
        </DsCard>

        {goals.length === 0 ? (
          <p className="text-sm text-ds-muted">Crie sua primeira meta</p>
        ) : null}

        {goals.map((g) => {
          const target = Number(g.target_amount)
          const current = Number(g.current_amount)
          const pct = target > 0 ? current / target : 0
          const pace = goalMonthlyPace({
            current,
            target,
            deadline: g.deadline,
            createdAt: g.created_at ?? null,
          })
          const behind = pace.savedPerMonth < pace.requiredPerMonth
          return (
            <DsCard key={g.id} className={g.is_archived ? "opacity-60" : undefined}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold">{g.name}</p>
                  {g.deadline ? (
                    <p className="text-sm text-ds-muted">
                      Até {formatDateBR(g.deadline).slice(3)}
                    </p>
                  ) : null}
                </div>
                {pct >= 1 ? (
                  <Chip className="bg-ds-accent-soft text-ds-pos">Chegou lá!</Chip>
                ) : (
                  <Chip>{Math.round(pct * 100)}%</Chip>
                )}
              </div>
              <p className="whitespace-nowrap">
                <AppMoney value={current} className="font-semibold" />
                <span className="text-sm text-ds-muted"> de {brl(target, hidden)}</span>
              </p>
              <Bar pct={pct} tone={behind ? "warn" : "ok"} />
              {pct >= 1 ? null : (
                <p className="text-sm leading-5 text-ds-muted">
                  {goalPaceCopy(pace.savedPerMonth, pace.requiredPerMonth, (n) =>
                    brl(n, hidden)
                  )}
                </p>
              )}
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
                <Button type="submit" variant="ghost" size="sm" className="text-ds-danger">
                  Excluir
                </Button>
              </form>
            </DsCard>
          )
        })}

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
            <FieldGroup className="md:grid md:grid-cols-2 md:items-end">
              <Field>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <Input id="name" name="name" required placeholder="Viagem" />
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
              <Button type="submit" disabled={pending} className="md:col-span-2 md:w-fit">
                Nova meta
              </Button>
            </FieldGroup>
          </form>
        </DsCard>
      </div>

      <div className="flex flex-col gap-4">
        <DsCard>
          <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
            Valores a receber
          </p>
          <p className="text-2xl font-semibold whitespace-nowrap">
            <AppMoney value={receivable} />
          </p>

          {openLoans.length > 0 ? (
            <>
              <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
                Empréstimos · {brl(loanTotal, hidden)}
              </p>
              {openLoans.map((l) => (
                <div key={l.key} className="flex flex-col gap-2 border-t border-ds-border pt-3">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold">{l.person}</p>
                    <p>
                      falta <AppMoney value={l.remaining} />
                    </p>
                  </div>
                  <Bar pct={l.lent > 0 ? l.returned / l.lent : 0} />
                  <p className="text-sm text-ds-muted">
                    Emprestou {brl(l.lent, hidden)} em {formatDateBR(l.firstDate)} ·
                    voltou {brl(l.returned, hidden)}
                  </p>
                  <LoanOriginalLine date={l.firstDate} amount={l.firstAmount} />
                  <LoanActions
                    onWriteOff={() =>
                      setWriteOff({
                        loanTxnId: l.firstTxnId,
                        person: l.person,
                        remaining: l.remaining,
                        originalDate: l.firstDate,
                        originalAmount: l.firstAmount,
                      })
                    }
                  />
                </div>
              ))}
            </>
          ) : null}

          {refunds.length > 0 ? (
            <>
              <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
                Estornos pendentes · {brl(refundTotal, hidden)}
              </p>
              {refunds.map((r) => (
                <div key={r.id} className="flex justify-between gap-3 text-sm">
                  <span>{r.name}</span>
                  <AppMoney value={r.amount} />
                </div>
              ))}
            </>
          ) : null}

          <p className="text-sm leading-5 text-ds-subtle">
            Empréstimos não entram em gastos enquanto você espera receber. Se não
            vai voltar, o restante vira Ajuda à família na data de hoje; o Pix
            original fica no extrato.
          </p>
        </DsCard>

        {helpRows.length > 0 ? (
          <DsCard>
            <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
              Virou ajuda à família
            </p>
            {helpRows.map((h) => (
              <div key={h.id} className="flex flex-col gap-1 border-t border-ds-border pt-3">
                <div className="flex justify-between gap-3">
                  <p className="font-medium">{h.person}</p>
                  <AppMoney value={Math.abs(h.amount)} />
                </div>
                <p className="text-sm text-ds-muted">
                  Pix original: {formatDateBR(h.originalDate)} · virou gasto em
                  Ajuda à família em {formatDateBR(h.date)}
                </p>
                <UndoWriteOffButton id={h.id} />
              </div>
            ))}
          </DsCard>
        ) : null}
      </div>

      <LoanWriteOffDialog
        target={writeOff}
        monthSpend={monthSpend}
        receivableTotal={receivable}
        onClose={() => setWriteOff(null)}
      />
    </div>
  )
}
