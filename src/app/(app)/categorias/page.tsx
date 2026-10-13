import { eq } from "drizzle-orm"
import { db } from "@/db"
import { categories, categoryRules } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { CategoriasClient } from "@/components/categorias-client"
import type { Category, CategoryRule } from "@/lib/types"

export default async function CategoriasPage() {
  const { userId } = await requireUserOrRedirect()
  const [categoryRows, ruleRows] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(eq(categories.user_id, userId))
      .orderBy(categories.name),
    db
      .select({
        rule: categoryRules,
        category_name: categories.name,
      })
      .from(categoryRules)
      .leftJoin(categories, eq(categoryRules.category_id, categories.id))
      .where(eq(categoryRules.user_id, userId))
      .orderBy(categoryRules.priority),
  ])

  const rules = ruleRows.map((row) => ({
    ...row.rule,
    categories: row.category_name ? { name: row.category_name } : null,
  }))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
        <p className="text-sm text-muted-foreground">
          Organize gastos e configure regras automáticas.
        </p>
      </div>
      <CategoriasClient
        categories={categoryRows as Category[]}
        rules={rules as (CategoryRule & {
          categories?: { name: string } | null
        })[]}
      />
    </div>
  )
}
