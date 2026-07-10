import { createClient } from "@/lib/server"
import { ContasClient } from "@/components/contas-client"
import type { Account } from "@/lib/types"

export default async function ContasPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contas</h1>
        <p className="text-sm text-muted-foreground">
          Gerencie contas corrente, cartão e investimentos do C6.
        </p>
      </div>
      <ContasClient accounts={(data ?? []) as Account[]} />
    </div>
  )
}
