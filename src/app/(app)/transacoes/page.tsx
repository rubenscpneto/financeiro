import { Suspense } from "react"
import { createClient } from "@/lib/server"
import { TransacoesClient } from "@/components/transacoes-client"
import type { Account, Category, Transaction } from "@/lib/types"

export default async function TransacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from("transactions")
    .select("*, accounts(name), categories(name)")
    .order("date", { ascending: false })
    .limit(500)

  if (params.account_id) query = query.eq("account_id", params.account_id)
  if (params.category_id) query = query.eq("category_id", params.category_id)
  if (params.from) query = query.gte("date", params.from)
  if (params.to) query = query.lte("date", params.to)

  const [{ data: transactions }, { data: accounts }, { data: categories }] =
    await Promise.all([
      query,
      supabase.from("accounts").select("*").order("name"),
      supabase.from("categories").select("*").order("name"),
    ])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transações</h1>
        <p className="text-sm text-muted-foreground">
          Filtre e ajuste categorias das movimentações.
        </p>
      </div>
      <Suspense>
        <TransacoesClient
          transactions={(transactions ?? []) as (Transaction & {
            accounts?: { name: string } | null
            categories?: { name: string } | null
          })[]}
          accounts={(accounts ?? []) as Account[]}
          categories={(categories ?? []) as Category[]}
        />
      </Suspense>
    </div>
  )
}
