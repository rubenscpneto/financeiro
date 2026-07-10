import { createClient } from "@/lib/server"
import { ImportarClient } from "@/components/importar-client"
import type { Account, Category } from "@/lib/types"

export default async function ImportarPage() {
  const supabase = await createClient()
  const [{ data: accounts }, { data: categories }] = await Promise.all([
    supabase.from("accounts").select("*").order("name"),
    supabase.from("categories").select("*").order("name"),
  ])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importar</h1>
        <p className="text-sm text-muted-foreground">
          Envie extratos e faturas do C6 (CSV preferencial).
        </p>
      </div>
      <ImportarClient
        accounts={(accounts ?? []) as Account[]}
        categories={(categories ?? []) as Category[]}
      />
    </div>
  )
}
