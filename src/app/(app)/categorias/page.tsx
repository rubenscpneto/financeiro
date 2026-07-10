import { createClient } from "@/lib/server"
import { CategoriasClient } from "@/components/categorias-client"
import type { Category, CategoryRule } from "@/lib/types"

export default async function CategoriasPage() {
  const supabase = await createClient()
  const [{ data: categories }, { data: rules }] = await Promise.all([
    supabase.from("categories").select("*").order("name"),
    supabase
      .from("category_rules")
      .select("*, categories(name)")
      .order("priority"),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Categorias</h1>
        <p className="text-sm text-muted-foreground">
          Organize gastos e configure regras automáticas.
        </p>
      </div>
      <CategoriasClient
        categories={(categories ?? []) as Category[]}
        rules={(rules ?? []) as (CategoryRule & {
          categories?: { name: string } | null
        })[]}
      />
    </div>
  )
}
