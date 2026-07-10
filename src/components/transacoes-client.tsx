"use client"

import { useTransition } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { updateTransactionCategoryAction } from "@/lib/actions/crud"
import type { Account, Category, Transaction } from "@/lib/types"
import { formatBRL, formatDateBR, cnSignClass } from "@/lib/format"
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

export function TransacoesClient({
  transactions,
  accounts,
  categories,
}: {
  transactions: Row[]
  accounts: Account[]
  categories: Category[]
}) {
  const [pending, start] = useTransition()
  const router = useRouter()
  const params = useSearchParams()

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-6">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              const q = new URLSearchParams()
              const account = String(fd.get("account_id") ?? "")
              const category = String(fd.get("category_id") ?? "")
              const from = String(fd.get("from") ?? "")
              const to = String(fd.get("to") ?? "")
              if (account) q.set("account_id", account)
              if (category) q.set("category_id", category)
              if (from) q.set("from", from)
              if (to) q.set("to", to)
              router.push(`/transacoes?${q.toString()}`)
            }}
          >
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Conta</label>
              <select
                name="account_id"
                defaultValue={params.get("account_id") ?? ""}
                className="h-8 rounded-lg border border-input bg-transparent px-2 text-sm"
              >
                <option value="">Todas</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
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
                defaultValue={params.get("category_id") ?? ""}
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
              <label className="mb-1 block text-xs text-muted-foreground">De</label>
              <Input
                type="date"
                name="from"
                defaultValue={params.get("from") ?? ""}
                className="w-auto"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Até</label>
              <Input
                type="date"
                name="to"
                defaultValue={params.get("to") ?? ""}
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
                  <TableCell className={`text-right font-medium ${cnSignClass(Number(t.amount))}`}>
                    {formatBRL(Number(t.amount))}
                  </TableCell>
                </TableRow>
              ))}
              {transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    Nenhuma transação. Importe um extrato para começar.
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
