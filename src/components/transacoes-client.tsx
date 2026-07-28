"use client"

import { useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import { updateTransactionCategoryAction } from "@/lib/actions/crud"
import type { Account, Category, Transaction } from "@/lib/types"
import {
  formatBRL,
  formatDateBR,
  cnSignClass,
  shiftYearMonth,
} from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

type Row = Transaction & {
  accounts?: { name: string } | null
  categories?: { name: string } | null
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
  const qs = q.toString()
  router.push(qs ? `/transacoes?${qs}` : "/transacoes")
}

export function TransacoesClient({
  transactions,
  accounts,
  categories,
  yearMonth,
  from,
  to,
}: {
  transactions: Row[]
  accounts: Account[]
  categories: Category[]
  yearMonth: string | null
  from: string
  to: string
}) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const params = useSearchParams()

  const accountId = params.get("account_id") ?? ""
  const categoryId = params.get("category_id") ?? ""

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          <div className="flex flex-wrap items-center gap-2">
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
              <ChevronLeft />
            </Button>
            <Input
              type="month"
              className="w-auto"
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
              <ChevronRight />
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
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const account = String(fd.get("account_id") ?? "")
              const category = String(fd.get("category_id") ?? "")
              const rangeFrom = String(fd.get("from") ?? "")
              const rangeTo = String(fd.get("to") ?? "")
              const q = new URLSearchParams()
              if (account) q.set("account_id", account)
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
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Conta
              </label>
              <select
                name="account_id"
                defaultValue={accountId}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="">Todas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.institution ? ` (${a.institution})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Categoria
              </label>
              <select
                name="category_id"
                defaultValue={categoryId}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                De
              </label>
              <Input
                type="date"
                name="from"
                defaultValue={yearMonth ? "" : from}
                className="w-auto"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Até
              </label>
              <Input
                type="date"
                name="to"
                defaultValue={yearMonth ? "" : to}
                className="w-auto"
              />
            </div>
            <Button type="submit" variant="outline">
              Filtrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Valor</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDateBR(t.date)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span>{t.description}</span>
                      <div className="flex gap-1">
                        {t.installment ? (
                          <Badge variant="secondary">{t.installment}</Badge>
                        ) : null}
                        {t.is_transfer ? (
                          <Badge variant="outline">Transferência</Badge>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{t.accounts?.name ?? "—"}</TableCell>
                  <TableCell>
                    <select
                      className="h-8 max-w-44 rounded-lg border border-input bg-transparent px-2 text-sm"
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
                  </TableCell>
                  <TableCell
                    className={`text-right font-medium ${cnSignClass(Number(t.amount))}`}
                  >
                    {formatBRL(Number(t.amount))}
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground"
                  >
                    Nenhuma transação neste período.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
