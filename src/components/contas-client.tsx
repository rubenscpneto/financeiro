"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import {
  createAccountAction,
  updateAccountAction,
  deleteAccountAction,
} from "@/lib/actions/crud"
import type { Account } from "@/lib/types"
import { ACCOUNT_TYPE_LABELS } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export function ContasClient({ accounts }: { accounts: Account[] }) {
  const [pending, start] = useTransition()

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova conta</CardTitle>
          <CardDescription>Contas do C6 Bank (corrente, cartão ou investimentos).</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={(fd) => {
              start(async () => {
                const res = await createAccountAction(fd)
                if (res.error) toast.error(res.error)
                else toast.success("Conta criada")
              })
            }}
          >
            <FieldGroup className="md:grid md:grid-cols-4 md:items-end">
              <Field>
                <FieldLabel htmlFor="name">Nome</FieldLabel>
                <Input id="name" name="name" required placeholder="Conta C6" />
              </Field>
              <Field>
                <FieldLabel htmlFor="type">Tipo</FieldLabel>
                <select
                  id="type"
                  name="type"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  defaultValue="checking"
                >
                  <option value="checking">Conta corrente</option>
                  <option value="credit_card">Cartão de crédito</option>
                  <option value="investment">Investimentos</option>
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="last4">Final (opcional)</FieldLabel>
                <Input id="last4" name="last4" maxLength={4} placeholder="5439" />
              </Field>
              <Button type="submit" disabled={pending}>
                Adicionar
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Suas contas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Final</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <form
                      className="flex items-center gap-2"
                      action={(fd) => {
                        start(async () => {
                          const res = await updateAccountAction(fd)
                          if (res.error) toast.error(res.error)
                          else toast.success("Atualizado")
                        })
                      }}
                    >
                      <input type="hidden" name="id" value={a.id} />
                      <Input name="name" defaultValue={a.name} className="max-w-48" />
                      <Input
                        name="last4"
                        defaultValue={a.last4 ?? ""}
                        className="max-w-20"
                        placeholder="----"
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          name="is_active"
                          defaultChecked={a.is_active}
                        />
                        Ativa
                      </label>
                      <Button type="submit" size="sm" variant="outline" disabled={pending}>
                        Salvar
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{ACCOUNT_TYPE_LABELS[a.type]}</Badge>
                  </TableCell>
                  <TableCell>{a.last4 ?? "—"}</TableCell>
                  <TableCell>{a.is_active ? "Ativa" : "Inativa"}</TableCell>
                  <TableCell>
                    <form
                      action={(fd) => {
                        start(async () => {
                          const res = await deleteAccountAction(fd)
                          if (res.error) toast.error(res.error)
                          else toast.success("Removida")
                        })
                      }}
                    >
                      <input type="hidden" name="id" value={a.id} />
                      <Button type="submit" size="sm" variant="destructive">
                        Excluir
                      </Button>
                    </form>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
