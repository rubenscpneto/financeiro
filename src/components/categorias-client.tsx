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
  DsCard,
  PageTitle,
  dsControlClass,
} from "@/components/design/primitives"
import { categoryLabelPt } from "@/lib/pluggy-categories-pt"

const KIND_LABEL: Record<string, string> = {
  expense: "Despesa",
  income: "Receita",
  transfer: "Transferência",
}

export function CategoriasClient({
  categories,
  rules,
}: {
  categories: Category[]
  rules: (CategoryRule & { categories?: { name: string } | null })[]
}) {
  const [pending, start] = useTransition()

  return (
    <div className="flex flex-col gap-4">
      <PageTitle subtitle="Organize gastos e regras automáticas." />
      <Tabs defaultValue="categorias">
        <TabsList>
          <TabsTrigger value="categorias">Categorias</TabsTrigger>
          <TabsTrigger value="regras">Regras</TabsTrigger>
        </TabsList>

        <TabsContent value="categorias" className="flex flex-col gap-4">
          <DsCard>
            <h2 className="text-lg font-semibold">Nova categoria</h2>
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
                    className={`${dsControlClass} w-full`}
                    defaultValue="expense"
                  >
                    <option value="expense">Despesa</option>
                    <option value="income">Receita</option>
                    <option value="transfer">Transferência</option>
                  </select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="color">Cor</FieldLabel>
                  <Input id="color" name="color" type="color" defaultValue="#1e6b47" />
                </Field>
                <Button type="submit" disabled={pending}>
                  Adicionar
                </Button>
              </FieldGroup>
            </form>
          </DsCard>

          <DsCard className="gap-0">
            {categories.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-3 border-b border-ds-border py-3 last:border-0"
              >
                <span
                  className="size-3.5 shrink-0 rounded-full"
                  style={{ background: c.color ?? "#94a3b8" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">
                    {categoryLabelPt(c.name)}
                  </p>
                  <p className="text-sm text-ds-muted">
                    {KIND_LABEL[c.kind] ?? c.kind}
                    {c.is_system ? " · Sistema" : ""}
                  </p>
                </div>
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
              </div>
            ))}
          </DsCard>
        </TabsContent>

        <TabsContent value="regras" className="flex flex-col gap-4">
          <DsCard>
            <h2 className="text-lg font-semibold">Nova regra</h2>
            <p className="text-sm text-ds-muted">
              Se a descrição contiver o padrão, aplica a categoria automaticamente.
            </p>
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
                    className={`${dsControlClass} w-full`}
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {categoryLabelPt(c.name)}
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
          </DsCard>

          <DsCard className="gap-0">
            {rules.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 border-b border-ds-border py-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-medium">{r.match_pattern}</p>
                  <p className="text-sm text-ds-muted">
                    {categoryLabelPt(r.categories?.name ?? "Categoria")} ·
                    prioridade {r.priority}
                  </p>
                </div>
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
              </div>
            ))}
            {rules.length === 0 ? (
              <p className="py-6 text-center text-sm text-ds-muted">
                Nenhuma regra ainda.
              </p>
            ) : null}
          </DsCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}
