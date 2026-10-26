import { NextResponse } from "next/server"
import { desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { accounts, transactions } from "@/db/schema"
import { getSessionUser } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
import { decTransaction } from "@/lib/crypto/rows"

export async function GET() {
  const session = await getSessionUser()
  if (!session) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }
  const userId = session.user.id
  const crypto = await getOrCreateUserCrypto(userId)
  const [txnRows, accountRows] = await Promise.all([
    db
      .select()
      .from(transactions)
      .where(eq(transactions.user_id, userId))
      .orderBy(desc(transactions.date))
      .limit(10000),
    db.select().from(accounts).where(eq(accounts.user_id, userId)),
  ])
  const names = new Map(
    accountRows.map((a) => [
      a.id,
      crypto.decryptFlex("name", a.name) ?? a.name,
    ])
  )
  const lines = ["data,descricao,valor,conta,categoria"]
  for (const row of txnRows) {
    const t = decTransaction(crypto, row)
    const desc = (t.description ?? "").replaceAll('"', '""')
    lines.push(
      [
        t.date,
        `"${desc}"`,
        String(t.amount),
        `"${(names.get(t.account_id) ?? "").replaceAll('"', '""')}"`,
        `"${(t.source_category ?? "").replaceAll('"', '""')}"`,
      ].join(",")
    )
  }
  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="financeiro.csv"',
    },
  })
}
