"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import {
  createCategoryAction,
  deleteCategoryAction,
  createRuleAction,
  deleteRuleAction,
} from "@/lib/actions/crud"
import type { Category, CategoryRule } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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

export function CategoriasClient({
  categories,
  rules,
}: {
  categories: Category[]
  rules: (CategoryRule & { categories?: { name: string } | null })[]
}) {
  const [pending, start] = useTransition()

  return (
    <Tabs defaultValue="categorias">
      <TabsList>
        <TabsTrigger value="categorias">Categorias</TabsTrigger>
        <TabsTrigger value="regras">Regras</TabsTrigger>
      </TabsList>

      <TabsContent value="categorias" className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nova categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              action={(fd) => {
                start(async () => {
                  const res = await createCategoryAction(fd)
                  if (res.error) toast.error(res.error)
                  else toast.success("Categoria criada")
                })
              }}
            >
              <FieldGroup className="md:grid md:grid-cols-4 md:items-end">
                <Field>
                  <FieldLabel htmlFor="name">Nome</FieldLabel>
                  <Input id="name" name="name" required />
                </Field>
                <Field>
                  <FieldLabel htmlFor="kind">Tipo</FieldLabel>
                  <select
                    id="kind"
                    name="kind"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    defaultValue="expense"
                  >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                    <option value="transfer">Transferência</option>
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="color">Cor</FieldLabel>
                  <Input id="color" name="color" type="color" defaultValue="#64748b" />
                </Field>
                <Button type="submit" disabled={pending}>
                  Adicionar
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-full"
                        style={{ background: c.color ?? "#94a3b8" }}
                      />
                      {c.name}
                      {c.is_system ? (
                        <Badge variant="secondary">Sistema</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>{c.kind}</TableCell>
                    <TableCell>
                      {!c.is_system ? (
                        <form
                          action={(fd) => {
                            start(async () => {
                              const res = await deleteCategoryAction(fd)
                              if (res.error) toast.error(res.error)
                              else toast.success("Removida")
                            })
                          }}
                        >
                          <input type="hidden" name="id" value={c.id} />
                          <Button type="submit" size="sm" variant="destructive">
                            Excluir
                          </Button>
                        </form>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="regras" className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Nova regra</CardTitle>
            <CardDescription>
              Se a descrição contiver o padrão, aplica a categoria automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              action={(fd) => {
                start(async () => {
                  const res = await createRuleAction(fd)
                  if (res.error) toast.error(res.error)
                  else toast.success("Regra criada")
                })
              }}
            >
              <FieldGroup className="md:grid md:grid-cols-4 md:items-end">
                <Field>
                  <FieldLabel htmlFor="match_pattern">Padrão</FieldLabel>
                  <Input
                    id="match_pattern"
                    name="match_pattern"
                    placeholder="IFOOD"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="category_id">Categoria</FieldLabel>
                  <select
                    id="category_id"
                    name="category_id"
                    className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="priority">Prioridade</FieldLabel>
                  <Input
                    id="priority"
                    name="priority"
                    type="number"
                    defaultValue={100}
                  />
                </Field>
                <Button type="submit" disabled={pending}>
                  Adicionar
                </Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Padrão</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.match_pattern}</TableCell>
                    <TableCell>
                      {r.categories?.name ?? r.category_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{r.priority}</TableCell>
                    <TableCell>
                      <form
                        action={(fd) => {
                          start(async () => {
                            const res = await deleteRuleAction(fd)
                            if (res.error) toast.error(res.error)
                            else toast.success("Removida")
                          })
                        }}
                      >
                        <input type="hidden" name="id" value={r.id} />
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
      </TabsContent>
    </Tabs>
  )
}
