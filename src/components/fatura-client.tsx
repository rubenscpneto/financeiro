"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDateBR, monthLabelPt } from "@/lib/format"
import {
  Bar,
  DsCard,
  PageTitle,
} from "@/components/design/primitives"
import { AppMoney } from "@/components/app-money"
import { brl } from "@/components/design/money-display"
import { useHideValues } from "@/components/hide-values-provider"
import type { CardCycle, CycleItem } from "@/lib/card-cycles"
import { cn } from "@/lib/utils"

export function FaturaClient({
  cards,
  selectedId,
  cycles,
  items,
  future,
  aVista,
  parcelas,
  currentTotal,
  futureTotal,
  limit,
  available,
  used,
  closeDay,
  dueDate,
  daysToDue,
  lastPaid,
}: {
  cards: {
    id: string
    name: string
    last4: string | null
    brand: string | null
    institution: string
    amount: number
  }[]
  selectedId: string | null
  cycles: CardCycle[]
  items: CycleItem[]
  future: { dueYm: string; items: CycleItem[] }[]
  aVista: number
  parcelas: number
  currentTotal: number
  futureTotal: number
  limit: number
  available: number
  used: number
  closeDay: number
  dueDate: string | null
  daysToDue: number | null
  lastPaid: { date: string; amount: number; accountName: string } | null
}) {
  const router = useRouter()
  const { hidden } = useHideValues()
  const [tab, setTab] = useState(0)
  const current = cycles[tab] ?? cycles[0]
  const shownItems = tab === 0 ? items : future.find((f) => f.dueYm === current?.dueYm)?.items ?? []
  const overdue = daysToDue != null && daysToDue < 0
  const soon = daysToDue != null && daysToDue <= 3 && daysToDue >= 0

  if (cards.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <PageTitle subtitle="Fatura do cartão por ciclo." />
        <DsCard>
          <p>Nenhum cartão conectado ainda.</p>
          <a href="/contas" className="text-sm font-semibold text-ds-accent">
            Ver contas
          </a>
        </DsCard>
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <PageTitle subtitle="Fatura por ciclo, parcelas futuras e alerta de vencimento." />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {cards.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => router.push(`/fatura?card=${c.id}`)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-2 text-sm",
              c.id === selectedId
                ? "border-ds-accent bg-ds-accent-soft font-semibold text-ds-accent"
                : "border-ds-border text-ds-muted"
            )}
          >
            {c.institution} {c.last4 ? `•••• ${c.last4}` : c.name}
          </button>
        ))}
      </div>

      {dueDate && daysToDue != null ? (
        <DsCard
          className={
            overdue || soon
              ? "border-ds-danger bg-ds-danger-soft"
              : "border-ds-warn bg-ds-warn-soft"
          }
        >
          <p className="font-semibold">
            {overdue
              ? `Fatura venceu há ${Math.abs(daysToDue)} dia${Math.abs(daysToDue) === 1 ? "" : "s"} (${formatDateBR(dueDate)})`
              : `Fatura vence em ${formatDateBR(dueDate).slice(0, 5)} (daqui a ${daysToDue} dia${daysToDue === 1 ? "" : "s"})`}
          </p>
          <p className="text-sm text-ds-muted">
            Ela fecha no dia {String(closeDay).padStart(2, "0")}: compras depois
            disso vão para a próxima fatura.
          </p>
          <p className="text-sm text-ds-muted">
            Débito automático: conferir no banco. Atraso gera multa e juros.
          </p>
        </DsCard>
      ) : null}

      <div className="inline-flex rounded-full bg-ds-elevated p-1">
        {cycles.map((c, i) => (
          <button
            key={c.dueYm}
            type="button"
            onClick={() => setTab(i)}
            className={cn(
              "rounded-full px-4 py-2 text-sm capitalize",
              tab === i
                ? "bg-ds-surface font-semibold text-ds-ink"
                : "text-ds-muted"
            )}
          >
            {c.label}
            {i === 0 ? " (atual)" : ""}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <DsCard>
          <p className="text-sm text-ds-muted">Fatura atual</p>
          <p className="text-xl font-semibold whitespace-nowrap">
            <AppMoney value={currentTotal} />
          </p>
          <p className="text-sm text-ds-subtle">
            {dueDate ? `vence ${formatDateBR(dueDate).slice(0, 5)}` : "aberta"}
          </p>
        </DsCard>
        <DsCard>
          <p className="text-sm text-ds-muted">Próxima</p>
          <p className="text-xl font-semibold whitespace-nowrap">
            <AppMoney
              value={
                future[0]
                  ? future[0].items.reduce((s, i) => s + Math.abs(i.amount), 0)
                  : 0
              }
            />
          </p>
        </DsCard>
        <DsCard>
          <p className="text-sm text-ds-muted">Parcelas futuras</p>
          <p className="text-xl font-semibold whitespace-nowrap">
            <AppMoney value={futureTotal} />
          </p>
        </DsCard>
        <DsCard>
          <p className="text-sm text-ds-muted">Limite disponível</p>
          <p className="text-xl font-semibold whitespace-nowrap">
            <AppMoney value={available} />
          </p>
          {limit > 0 ? (
            <>
              <Bar pct={limit > 0 ? used / limit : 0} tone="warn" />
              <p className="text-sm text-ds-subtle">
                Usado {brl(used, hidden)} de {brl(limit, hidden)} (
                {limit ? ((used / limit) * 100).toFixed(1) : "0"}%)
              </p>
            </>
          ) : null}
        </DsCard>
      </div>

      <DsCard className="gap-0">
        <p className="pb-2 text-sm font-semibold">
          {shownItems.length} {shownItems.length === 1 ? "item" : "itens"}
        </p>
        {shownItems.map((i) => (
          <div
            key={i.id}
            className="flex items-start justify-between gap-3 border-t border-ds-border py-3"
          >
            <div className="min-w-0">
              <p className="font-medium">
                {i.date.slice(8, 10)} · {i.name}
              </p>
              <p className="text-sm text-ds-muted">
                {i.category}
                {i.installmentLabel
                  ? ` · ${i.installmentLabel}${i.installmentTotal ? ` · total` : ""}`
                  : ""}
              </p>
            </div>
            <AppMoney value={i.amount} className="whitespace-nowrap font-semibold" />
          </div>
        ))}
        {tab === 0 ? (
          <div className="flex justify-between gap-3 border-t border-ds-border pt-3 text-sm">
            <span>À vista {brl(aVista, hidden)}</span>
            <span>Parcelas {brl(parcelas, hidden)}</span>
          </div>
        ) : null}
      </DsCard>

      {future.length > 0 && tab === 0 ? (
        <DsCard>
          <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
            Parcelas futuras
          </p>
          {future.map((g) => (
            <div key={g.dueYm} className="flex flex-col gap-2">
              <p className="font-medium capitalize">{monthLabelPt(g.dueYm)}</p>
              {g.items.map((i) => (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="min-w-0 truncate">
                    {i.name} · faltam {i.remainingAfter} × {brl(Math.abs(i.amount), hidden)}
                  </span>
                  <span className="whitespace-nowrap font-medium">
                    {brl(Math.abs(i.amount) * i.remainingAfter, hidden)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </DsCard>
      ) : null}

      {lastPaid ? (
        <DsCard>
          <p className="text-sm text-ds-muted">Última fatura</p>
          <p>
            paga em {formatDateBR(lastPaid.date)}
            {lastPaid.accountName ? ` pelo ${lastPaid.accountName}` : ""}
          </p>
          <p className="font-semibold whitespace-nowrap">
            <AppMoney value={lastPaid.amount} />
          </p>
        </DsCard>
      ) : null}
    </div>
  )
}
