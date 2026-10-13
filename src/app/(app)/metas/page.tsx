import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { goals } from "@/db/schema"
import { requireUserOrRedirect } from "@/lib/auth-session"
import { MetasClient } from "@/components/metas-client"
import type { Goal } from "@/lib/types"

export default async function MetasPage() {
  const { userId } = await requireUserOrRedirect()
  const data = await db
    .select()
    .from(goals)
    .where(eq(goals.user_id, userId))
    .orderBy(desc(goals.created_at))

  const mapped = data.map((g) => ({
    ...g,
    target_amount: Number(g.target_amount),
    current_amount: Number(g.current_amount),
  }))

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Metas</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe objetivos e progresso.
        </p>
      </div>
      <MetasClient goals={mapped as Goal[]} />
    </div>
  )
}
