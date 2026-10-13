"use client"

import { useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { updateTransactionCategoryAction } from "@/lib/actions/crud"
import type { Category, Transaction } from "@/lib/types"
import { formatDateBR, shiftYearMonth } from "@/lib/format"
import {
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

type Row = Transaction & {
  accounts?: { name: string } | null
  categories?: { name: string } | null
  _displayLabel?: string | null
  _kind?: string
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
  banks,
  categories,
  yearMonth,
  from,
  to,
}: {
  transactions: Row[]
  banks: { key: string; name: string }[]
  categories: Category[]
  yearMonth: string | null
  from: string
  to: string
}) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const params = useSearchParams()

  const bankKey = params.get("bank") ?? ""
  const categoryId = params.get("category_id") ?? ""

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <PageTitle subtitle="Filtre por banco, categoria, mês ou intervalo." />

      <DsCard className="min-w-0 overflow-x-hidden">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!yearMonth}
            onClick={() => {
              if (!yearMonth) return
              pushQuery(router, params, {
                mes: shiftYearMonth(yearMonth, -1),
                from: null,
                to: null,
              })
            }}
          >
            <DesignIcon name="back" size={18} />
          </Button>
          <Input
            type="month"
            className="min-w-0 max-w-full flex-[1_1_10rem]"
            value={yearMonth ?? ""}
            onChange={(e) => {
              const mes = e.target.value
              if (!mes) return
              pushQuery(router, params, {
                mes,
                from: null,
                to: null,
              })
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={!yearMonth}
            onClick={() => {
              if (!yearMonth) return
              pushQuery(router, params, {
                mes: shiftYearMonth(yearMonth, 1),
                from: null,
                to: null,
              })
            }}
          >
            <DesignIcon name="chevron" size={18} />
          </Button>
          {!yearMonth ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                pushQuery(router, params, {
                  mes: null,
                  from: null,
                  to: null,
                })
              }
            >
              Voltar ao mês atual
            </Button>
          ) : null}
        </div>

        <form
          className="flex w-full min-w-0 flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            const fd = new FormData(e.currentTarget)
            const bank = String(fd.get("bank") ?? "")
            const category = String(fd.get("category_id") ?? "")
            const rangeFrom = String(fd.get("from") ?? "")
            const rangeTo = String(fd.get("to") ?? "")
            const q = new URLSearchParams()
            if (bank) q.set("bank", bank)
            if (category) q.set("category_id", category)
            if (rangeFrom || rangeTo) {
              if (rangeFrom) q.set("from", rangeFrom)
              if (rangeTo) q.set("to", rangeTo)
            } else if (yearMonth) {
              q.set("mes", yearMonth)
            }
            router.push(`/transacoes?${q.toString()}`)
          }}
        >
          <label className="flex min-w-0 flex-[1_1_10rem] flex-col gap-1 text-sm text-ds-muted">
            Banco
            <select name="bank" defaultValue={bankKey} className={control}>
              <option value="">Todos</option>
              {banks.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-[1_1_10rem] flex-col gap-1 text-sm text-ds-muted">
            Categoria
            <select
              name="category_id"
              defaultValue={categoryId}
              className={control}
            >
              <option value="">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-[1_1_10rem] flex-col gap-1 text-sm text-ds-muted">
            De
            <Input
              type="date"
              name="from"
              className="min-w-0 max-w-full"
              defaultValue={yearMonth ? "" : from}
            />
          </label>
          <label className="flex min-w-0 flex-[1_1_10rem] flex-col gap-1 text-sm text-ds-muted">
            Até
            <Input
              type="date"
              name="to"
              className="min-w-0 max-w-full"
              defaultValue={yearMonth ? "" : to}
            />
          </label>
          <Button type="submit" className="flex-[1_1_8rem]">
            Filtrar
          </Button>
        </form>
      </DsCard>

      <DsCard className="min-w-0 gap-0 overflow-x-hidden p-2 sm:p-[18px]">
        {transactions.map((t) => {
          const amount = Number(t.amount)
          const title = t._displayLabel || t.description
          const isTransfer =
            t._kind === "transfer" ||
            t._kind === "investment_transfer" ||
            t._kind === "card_bill" ||
            t.is_transfer
          return (
            <div
              key={t.id}
              className="flex min-w-0 items-start gap-3.5 border-b border-ds-border py-3 last:border-0"
            >
              <IconBadge
                name={amount > 0 ? "income" : "cart"}
                tone={isTransfer ? "info" : amount > 0 ? "pos" : "neutral"}
              />
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-base font-medium text-ds-ink">
                  {title}
                </p>
                <p className="truncate text-sm text-ds-muted">
                  {t.accounts?.name ?? "Conta"} · {formatDateBR(t.date)}
                </p>
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-2">
                  {t.installment ? <Flag>{t.installment}</Flag> : null}
                  {t._kind === "card_bill" ? (
                    <span className="text-sm font-medium text-ds-info">
                      Fatura paga
                    </span>
                  ) : t._kind === "loan" ? (
                    <span className="text-sm font-medium text-ds-info">
                      Empréstimos
                    </span>
                  ) : isTransfer ? (
                    <span className="text-sm font-medium text-ds-info">
                      Transferência
                    </span>
                  ) : null}
                  <select
                    className={`${control} h-9 max-w-full sm:max-w-52`}
                    defaultValue={t.category_id ?? ""}
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
                    <option value="">Sem categoria</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <AppMoney
                value={amount}
                sign
                className={`shrink-0 text-base font-semibold ${amount > 0 ? "text-ds-pos" : "text-ds-ink"}`}
              />
            </div>
          )
        })}
        {transactions.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-ds-muted">
            Nenhuma transação neste período.
          </p>
        ) : null}
      </DsCard>
    </div>
  )
}
