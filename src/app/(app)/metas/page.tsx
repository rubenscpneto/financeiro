import { createClient } from "@/lib/server"
import { MetasClient } from "@/components/metas-client"
import type { Goal } from "@/lib/types"

export default async function MetasPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: false })

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe objetivos e progresso.
        </p>
      </div>
      <MetasClient goals={(data ?? []) as Goal[]} />
    </div>
  )
}
