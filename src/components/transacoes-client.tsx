"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { updateTransactionCategoryAction } from "@/lib/actions/crud"
import {
  UNCLASSIFIED_FILTER,
  displayCategoryLabel,
  groupRowsByDateDesc,
  matchesFlowFilter,
  showLoansBlock,
  summarizeFlow,
  sumSpending,
  type FlowFilter,
} from "@/lib/txn-class"
import { EXTRATO_SUMMARY_NOTE } from "@/lib/ui-copy"
import type { Category, Transaction } from "@/lib/types"
import {
  extratoDayHeading,
  formatDateBR,
  monthLabelPt,
  shiftYearMonth,
} from "@/lib/format"
import {
  Chip,
  DsCard,
  Flag,
  IconBadge,
  PageTitle,
  dsControlClass,
} from "@/components/design/primitives"
import { AppMoney } from "@/components/app-money"
import { DesignIcon } from "@/components/design/icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { brl } from "@/components/design/money-display"
import { useHideValues } from "@/components/hide-values-provider"
import type { LoanGroup } from "@/lib/loans"
import {
  LoanActions,
  LoanOriginalLine,
  LoanWriteOffDialog,
  UndoWriteOffButton,
  type LoanWriteOffTarget,
} from "@/components/loan-writeoff"
import { cn } from "@/lib/utils"

type Row = Transaction & {
  accounts?: { name: string } | null
  categories?: { name: string } | null
  _displayLabel?: string | null
  _kind?: string
  _pending?: boolean
  _subLines?: { label: string; amount: number }[]
  _installmentLabel?: string | null
  _incomeDelta?: number
  _expenseDelta?: number
  _virouAjuda?: boolean
}

function pushQuery(
  router: ReturnType<typeof useRouter>,
  base: URLSearchParams,
  patch: Record<string, string | null>
) {
  const q = new URLSearchParams(base.toString())
  for (const [k, v] of Object.entries(patch)) {
    if (v == null || v === "") q.delete(k)
    else q.set(k, v)
  }
  q.delete("account_id")
  const qs = q.toString()
  router.push(qs ? `/transacoes?${qs}` : "/transacoes")
}

const control = `${dsControlClass} w-full min-w-0 max-w-full`

export function TransacoesClient({
  transactions,
  categories,
  yearMonth,
  from,
  to,
  today,
  summary,
  hiddenDuplicates,
  loans,
  helpRows,
}: {
  transactions: Row[]
  categories: Category[]
  yearMonth: string | null
  from: string
  to: string
  today: string
  summary: {
    entrou: number
    saiu: number
    sobrou: number
    cardBill: number
    between: number
    loanOut: number
    loanIn: number
    loanRemaining: number
  }
  hiddenDuplicates: {
    id: string
    description: string
    amount: number
    accountName: string
  }[]
  loans: LoanGroup[]
  helpRows: {
    id: string
    date: string
    person: string
    originalDate: string
    originalAmount: number
    amount: number
  }[]
}) {
  const [pending, start] = useTransition()
  const [qtext, setQtext] = useState("")
  const [flow, setFlow] = useState<FlowFilter>("all")
  const [showHidden, setShowHidden] = useState(false)
  const [openLoan, setOpenLoan] = useState<string | null>(null)
  const [writeOff, setWriteOff] = useState<LoanWriteOffTarget | null>(null)
  const router = useRouter()
  const params = useSearchParams()
  const { hidden } = useHideValues()

  const categoryId = params.get("category_id") ?? ""

  const filtered = useMemo(() => {
    const q = qtext.trim().toLowerCase()
    return transactions.filter((t) => {
      if (
        !matchesFlowFilter(
          {
            amount: Number(t.amount) || 0,
            class: {
              kind: (t._kind as "income") ?? "expense",
              hide: false,
              expenseDelta: t._expenseDelta ?? 0,
              incomeDelta: t._incomeDelta ?? 0,
            },
          },
          flow
        )
      ) {
        return false
      }
      if (!q) return true
      const hay = `${t.description} ${t.merchant ?? ""} ${t.accounts?.name ?? ""} ${t.categories?.name ?? ""}`.toLowerCase()
      return hay.includes(q)
    })
  }, [transactions, qtext, flow])

  const flowSummary = useMemo(() => {
    if (flow === "all") return summary
    if (flow === "out") {
      const saiu = sumSpending(
        transactions.map((t) => ({
          class: { hide: false, expenseDelta: t._expenseDelta ?? 0 },
        }))
      )
      return { ...summary, entrou: 0, saiu, sobrou: -saiu }
    }
    const sums = summarizeFlow(
      filtered.map((t) => ({
        class: {
          hide: false,
          incomeDelta: t._incomeDelta ?? 0,
          expenseDelta: t._expenseDelta ?? 0,
        },
      }))
    )
    return { ...summary, ...sums }
  }, [filtered, flow, summary, transactions])

  const groups = useMemo(
    () => groupRowsByDateDesc(filtered),
    [filtered]
  )

  const periodLabel = yearMonth
    ? monthLabelPt(yearMonth)
    : from && to
      ? `${formatDateBR(from).slice(0, 5)} a ${formatDateBR(to)}`
      : "período"

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <PageTitle subtitle="O que entrou e saiu, sem contar duas vezes." />

      <DsCard className="min-w-0 overflow-x-hidden">
        <label className="relative block">
          <DesignIcon
            name="search"
            size={18}
            className="pointer-events-none absolute top-3.5 left-3 text-ds-muted"
          />
          <Input
            value={qtext}
            onChange={(e) => setQtext(e.target.value)}
            placeholder="Buscar no extrato…"
            className="w-full pl-10"
          />
        </label>

        <div className="flex min-w-0 flex-wrap items-end gap-2">
          <label className="flex min-w-0 flex-[1_1_9rem] flex-col gap-1 text-sm text-ds-muted">
            Categoria
            <select
              className={control}
              value={categoryId}
              onChange={(e) =>
                pushQuery(router, params, {
                  category_id: e.target.value || null,
                })
              }
            >
              <option value="">Todas</option>
              <option value={UNCLASSIFIED_FILTER}>A classificar</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-[1_1_9rem] flex-col gap-1 text-sm text-ds-muted">
            Período
            {yearMonth ? (
              <span className="text-sm font-medium text-ds-ink">
                {monthLabelPt(yearMonth)}
              </span>
            ) : null}
            <Input
              type="month"
              value={yearMonth ?? ""}
              onChange={(e) => {
                const mes = e.target.value
                if (!mes) return
                pushQuery(router, params, { mes, from: null, to: null })
              }}
            />
          </label>
          {yearMonth ? (
            <div className="flex gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  pushQuery(router, params, {
                    mes: shiftYearMonth(yearMonth, -1),
                    from: null,
                    to: null,
                  })
                }
              >
                <DesignIcon name="back" size={18} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() =>
                  pushQuery(router, params, {
                    mes: shiftYearMonth(yearMonth, 1),
                    from: null,
                    to: null,
                  })
                }
              >
                <DesignIcon name="chevron" size={18} />
              </Button>
            </div>
          ) : null}
        </div>

        <div className="inline-flex rounded-full bg-ds-elevated p-1">
          {(
            [
              ["all", "Tudo"],
              ["out", "Saídas"],
              ["in", "Entradas"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFlow(id)}
              className={cn(
                "rounded-full px-4 py-2 text-sm",
                flow === id
                  ? "bg-ds-surface font-semibold text-ds-ink shadow-sm"
                  : "text-ds-muted"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </DsCard>

      <DsCard>
        <p className="text-sm font-semibold text-ds-muted">
          Resumo de {periodLabel}
        </p>
        <div className="grid grid-cols-3 gap-3 lg:grid-cols-4">
          <div>
            <p className="text-sm text-ds-muted">Entrou</p>
            <p className="text-base font-semibold text-ds-pos">
              <AppMoney value={flowSummary.entrou} sign />
            </p>
          </div>
          <div>
            <p className="text-sm text-ds-muted">Saiu</p>
            <p className="text-base font-semibold">
              <AppMoney value={-flowSummary.saiu} sign />
            </p>
          </div>
          <div>
            <p className="text-sm text-ds-muted">Sobrou</p>
            <p
              className={cn(
                "text-base font-semibold",
                flowSummary.sobrou >= 0 ? "text-ds-pos" : "text-ds-danger"
              )}
            >
              <AppMoney value={flowSummary.sobrou} sign />
            </p>
          </div>
          <div className="hidden lg:block">
            <p className="text-sm text-ds-muted">Falta receber</p>
            <p className="text-base font-semibold">
              <AppMoney value={summary.loanRemaining} />
            </p>
          </div>
        </div>
        <p className="text-sm leading-5 text-ds-subtle">
          {EXTRATO_SUMMARY_NOTE}
        </p>
      </DsCard>

      {helpRows.length > 0 ? (
        <DsCard className="border-ds-accent bg-ds-accent-soft" >
          <p className="text-sm font-semibold" role="status">
            Pronto: {brl(Math.abs(helpRows[0].amount), hidden)} de{" "}
            {helpRows[0].person} agora é gasto em Ajuda à família
          </p>
          <UndoWriteOffButton id={helpRows[0].id} />
        </DsCard>
      ) : null}

      <DsCard className="min-w-0 gap-0 overflow-x-hidden p-2 sm:p-[18px]">
        {groups.map(([day, rows]) => (
          <div key={day} className="min-w-0">
            <p className="px-2 pt-4 pb-1 text-sm font-semibold tracking-[0.06em] text-ds-subtle">
              {extratoDayHeading(day, today)}
            </p>
            {rows.map((t) => {
              const amount = Number(t.amount)
              const title = t._displayLabel || t.description
              const isTransfer =
                t._kind === "transfer" ||
                t._kind === "investment_transfer" ||
                t._kind === "card_bill" ||
                t.is_transfer
              const isRefund = t._kind === "refund"
              const loan = t._kind === "loan" ? loans.find((l) => l.firstTxnId === t.id) : null
              return (
                <div
                  key={t.id}
                  className="min-w-0 border-b border-ds-border py-3 last:border-0"
                >
                  <button
                    type="button"
                    className="flex w-full min-w-0 items-start gap-3.5 text-left"
                    onClick={() =>
                      t._kind === "loan"
                        ? setOpenLoan(openLoan === t.id ? null : t.id)
                        : undefined
                    }
                  >
                    <IconBadge
                      name={
                        t._kind === "loan"
                          ? "heart"
                          : isRefund || amount > 0
                            ? "income"
                            : "cart"
                      }
                      tone={
                        isTransfer || isRefund
                          ? "info"
                          : amount > 0
                            ? "pos"
                            : "neutral"
                      }
                    />
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex min-w-0 items-baseline justify-between gap-3">
                        <p className="truncate text-base font-medium text-ds-ink">
                          {title}
                        </p>
                        <AppMoney
                          value={amount}
                          sign
                          className={cn(
                            "shrink-0 text-base font-semibold whitespace-nowrap",
                            isTransfer
                              ? "text-ds-muted"
                              : isRefund
                                ? "text-ds-info"
                                : amount > 0
                                  ? "text-ds-pos"
                                  : "text-ds-ink"
                          )}
                        />
                      </div>
                      <p className="truncate text-sm text-ds-muted">
                        <span className="text-ds-accent">
                          {t.categories?.name ?? displayCategoryLabel({ class: { categoryLabel: t.categories?.name } })}
                        </span>
                        {" · "}
                        {t.accounts?.name ?? "Conta"}
                      </p>
                      {t._subLines?.length ? (
                        <div className="mt-1.5 flex flex-col gap-0.5">
                          {t._subLines.map((line, i) => (
                            <div
                              key={`${t.id}-sub-${i}`}
                              className="flex min-w-0 items-center justify-between gap-2 text-sm text-ds-muted"
                            >
                              <span className="truncate">{line.label}</span>
                              {line.amount ? (
                                <AppMoney
                                  value={line.amount}
                                  sign
                                  className="shrink-0 text-sm text-ds-muted"
                                />
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                        {t._pending ? (
                          <Chip className="bg-ds-warn-soft text-ds-warn">
                            Pendente
                          </Chip>
                        ) : null}
                        {t._installmentLabel ? (
                          <Flag>{t._installmentLabel}</Flag>
                        ) : null}
                        {t._virouAjuda ? (
                          <Chip className="bg-ds-info-soft text-ds-info">
                            Virou ajuda
                          </Chip>
                        ) : null}
                        {t._kind === "investment_transfer" ? (
                          <Chip className="bg-ds-info-soft text-ds-info">
                            Entre suas contas
                          </Chip>
                        ) : null}
                      </div>
                    </div>
                  </button>
                  {openLoan === t.id && loan ? (
                    <div className="mt-3 ml-14 rounded-xl bg-ds-elevated p-3">
                      <p className="font-semibold">Empréstimo para {loan.person}</p>
                      <p className="text-sm text-ds-muted">
                        Falta receber <AppMoney value={loan.remaining} />
                      </p>
                      <LoanOriginalLine
                        date={loan.firstDate}
                        amount={loan.firstAmount}
                      />
                      <p className="text-sm text-ds-muted">
                        Voltou <AppMoney value={loan.returned} /> · Sem data
                        combinada
                      </p>
                      <p className="mt-2 text-sm leading-5 text-ds-subtle">
                        Não conta como gasto enquanto você espera receber. Se não
                        vai voltar, o que falta vira gasto em Ajuda à família na
                        data de hoje; o Pix original ({formatDateBR(loan.firstDate)})
                        fica aqui como referência.
                      </p>
                      {!loan.writtenOff ? (
                        <LoanActions
                          onWriteOff={() =>
                            setWriteOff({
                              loanTxnId: loan.firstTxnId,
                              person: loan.person,
                              remaining: loan.remaining,
                              originalDate: loan.firstDate,
                              originalAmount: loan.firstAmount,
                            })
                          }
                        />
                      ) : null}
                      <div className="mt-2 flex flex-wrap gap-3 text-sm font-semibold text-ds-accent">
                        <label className="flex items-center gap-2">
                          Mudar categoria
                          <select
                            className={`${control} h-9 max-w-52`}
                            defaultValue={t.user_category_id ?? ""}
                            disabled={pending}
                            onChange={(e) => {
                              const fd = new FormData()
                              fd.set("id", t.id)
                              fd.set("category_id", e.target.value)
                              fd.set("is_transfer", String(t.is_transfer))
                              start(async () => {
                                const res = await updateTransactionCategoryAction(fd)
                                if (res.error) toast.error(res.error)
                              })
                            }}
                          >
                            <option value="">A classificar</option>
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <a href="/metas">Ver em Valores a receber</a>
                      </div>
                    </div>
                  ) : t._kind !== "loan" ? (
                    <div className="mt-2 ml-14">
                      <select
                        className={`${control} h-9 max-w-full sm:max-w-52`}
                        defaultValue={t.user_category_id ?? ""}
                        disabled={pending}
                        onChange={(e) => {
                          const fd = new FormData()
                          fd.set("id", t.id)
                          fd.set("category_id", e.target.value)
                          fd.set("is_transfer", String(t.is_transfer))
                          start(async () => {
                            const res = await updateTransactionCategoryAction(fd)
                            if (res.error) toast.error(res.error)
                            else toast.success("Categoria atualizada")
                          })
                        }}
                      >
                        <option value="">A classificar</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        ))}
        {filtered.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-ds-muted">
            {qtext || flow !== "all"
              ? "Nada encontrado com esses filtros · Limpar filtros"
              : "Ainda não há lançamentos neste período"}
          </p>
        ) : null}
      </DsCard>

      {hiddenDuplicates.length > 0 ? (
        <p className="text-sm leading-5 text-ds-subtle">
          {hiddenDuplicates.length} lançamento escondido: “
          {hiddenDuplicates[0].description}” no {hiddenDuplicates[0].accountName}{" "}
          ({brl(hiddenDuplicates[0].amount, hidden)}), porque é a mesma fatura
          paga, vista pelo lado do cartão.{" "}
          <button
            type="button"
            className="font-semibold text-ds-accent"
            onClick={() => setShowHidden((v) => !v)}
          >
            {showHidden ? "Esconder" : "Mostrar"}
          </button>
        </p>
      ) : null}
      {showHidden
        ? hiddenDuplicates.map((t) => (
            <DsCard key={t.id} className="opacity-70">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{t.description}</p>
                  <Chip className="bg-ds-elevated text-ds-muted">Escondido</Chip>
                </div>
                <AppMoney value={t.amount} />
              </div>
            </DsCard>
          ))
        : null}

      {showLoansBlock(categoryId) &&
      loans.some((l) => l.remaining > 0 || l.writtenOff) ? (
        <DsCard>
          <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
            Empréstimos
          </p>
          <p className="text-2xl font-semibold">
            <AppMoney value={summary.loanRemaining} />
          </p>
          {loans.map((l) => (
            <div key={l.key} className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{l.person}</p>
                <p className="text-sm text-ds-muted">
                  emprestou {brl(l.lent, hidden)} · voltou {brl(l.returned, hidden)}
                </p>
              </div>
              <AppMoney value={l.remaining} />
            </div>
          ))}
        </DsCard>
      ) : null}

      <DsCard>
        <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
          Como contamos
        </p>
        <p className="text-sm leading-5 text-ds-muted">
          Fatura paga não é gasto — as compras já entraram. Transferências entre
          suas contas e empréstimos ficam de fora de Entrou/Saiu. Estornos
          diminuem o gasto. Parcelas só contam neste mês. IOF de compra em dólar
          vai na mesma linha.
        </p>
      </DsCard>

      <LoanWriteOffDialog
        target={writeOff}
        monthSpend={summary.saiu}
        receivableTotal={
          summary.loanRemaining +
          (writeOff ? 0 : 0)
        }
        onClose={() => setWriteOff(null)}
      />
    </div>
  )
}
