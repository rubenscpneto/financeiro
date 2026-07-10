"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import {
  commitImportAction,
  parseImportAction,
  type PreviewPayload,
} from "@/lib/actions/import"
import type { Account, Category } from "@/lib/types"
import { ACCOUNT_TYPE_LABELS } from "@/lib/types"
import { formatBRL, formatDateBR, cnSignClass } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel, FieldDescription } from "@/components/ui/field"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"

export function ImportarClient({
  accounts,
  categories,
}: {
  accounts: Account[]
  categories: Category[]
}) {
  const [pending, start] = useTransition()
  const [preview, setPreview] = useState<PreviewPayload | null>(null)

  const filteredAccounts = accounts.filter((a) => a.is_active)

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Importar extrato</CardTitle>
          <CardDescription>
            Prefira CSV. PDF e OFX também são aceitos. Arquivos protegidos do C6
            usam os 4 ou 6 primeiros dígitos do CPF como senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            action={(fd) => {
              start(async () => {
                const res = await parseImportAction(fd)
                if ("error" in res && res.error) {
                  toast.error(res.error)
                  setPreview(null)
                  return
                }
                if ("preview" in res) {
                  setPreview(res.preview)
                  toast.success("Arquivo lido — revise antes de confirmar")
                }
              })
            }}
          >
            <FieldGroup className="max-w-xl">
              <Field>
                <FieldLabel htmlFor="source_type">Tipo de arquivo</FieldLabel>
                <select
                  id="source_type"
                  name="source_type"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  defaultValue="credit_card"
                >
                  <option value="credit_card">Fatura do cartão</option>
                  <option value="checking">Extrato da conta</option>
                  <option value="investment">Investimentos</option>
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="account_id">Conta destino</FieldLabel>
                <select
                  id="account_id"
                  name="account_id"
                  className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                  required
                >
                  {filteredAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({ACCOUNT_TYPE_LABELS[a.type]})
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <FieldLabel htmlFor="file">Arquivo (CSV, PDF ou OFX)</FieldLabel>
                <input
                  id="file"
                  name="file"
                  type="file"
                  accept=".csv,.txt,.pdf,.ofx,.ofc,.zip"
                  required
                  className={cn(
                    "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm",
                    "file:mr-3 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground"
                  )}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Senha do arquivo (se houver)</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="off"
                  placeholder="4 ou 6 dígitos do CPF"
                />
                <FieldDescription>
                  PDF ou CSV protegidos: 4 ou 6 primeiros dígitos do CPF.
                </FieldDescription>
              </Field>
              <Button type="submit" disabled={pending}>
                {pending ? "Lendo…" : "Analisar arquivo"}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {preview ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Pré-visualização</CardTitle>
              <CardDescription>
                Parser: {preview.meta.parser} · Confiança:{" "}
                {preview.meta.confidence}
              </CardDescription>
            </div>
            <Button
              disabled={pending}
              onClick={() => {
                start(async () => {
                  const res = await commitImportAction({
                    importId: preview.importId,
                    accountId: preview.accountId,
                    sourceType: preview.sourceType,
                    transactions: preview.transactions,
                    positions: preview.positions,
                    movements: preview.movements,
                  })
                  if (res.error) toast.error(res.error)
                  else {
                    toast.success(
                      `Importado: ${res.inserted ?? 0} · ignorados (duplicados): ${res.skipped ?? 0}`
                    )
                    setPreview(null)
                  }
                })
              }}
            >
              Confirmar importação
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {preview.meta.warnings?.length ? (
              <Alert>
                <AlertDescription>
                  {preview.meta.warnings.join(" · ")}
                </AlertDescription>
              </Alert>
            ) : null}

            {preview.transactions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.transactions.slice(0, 200).map((t, i) => (
                    <TableRow key={t.externalHash + i}>
                      <TableCell>{formatDateBR(t.date)}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span>{t.description}</span>
                          {t.installment ? (
                            <Badge variant="secondary" className="w-fit">
                              {t.installment}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <select
                          className="h-8 max-w-48 rounded-lg border border-input bg-transparent px-2 text-sm"
                          value={t.category_id ?? ""}
                          onChange={(e) => {
                            const category_id = e.target.value || null
                            setPreview((prev) => {
                              if (!prev) return prev
                              const transactions = [...prev.transactions]
                              transactions[i] = { ...transactions[i], category_id }
                              return { ...prev, transactions }
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
                      <TableCell className={`text-right ${cnSignClass(t.amount)}`}>
                        {formatBRL(t.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}

            {preview.positions.length > 0 ? (
              <div>
                <h3 className="mb-2 font-medium">Posições</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Ativo</TableHead>
                      <TableHead>Classe</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Preço</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.positions.map((p) => (
                      <TableRow key={p.externalHash}>
                        <TableCell>
                          {p.ticker ? `${p.ticker} — ` : ""}
                          {p.assetName}
                        </TableCell>
                        <TableCell>{p.assetClass}</TableCell>
                        <TableCell className="text-right">{p.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatBRL(p.currentPrice)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
