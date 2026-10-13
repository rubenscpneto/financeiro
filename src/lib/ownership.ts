import { and, eq } from "drizzle-orm"
import { db } from "@/db"
import {
  accounts,
  categories,
  imports,
  investmentPositions,
} from "@/db/schema"

type Owned = { ok: true } | { ok: false; error: string }

export async function assertAccountOwned(
  userId: string,
  accountId: string
): Promise<Owned> {
  const [row] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.id, accountId), eq(accounts.user_id, userId)))
    .limit(1)
  if (!row) return { ok: false, error: "Conta inválida." }
  return { ok: true }
}

export async function assertCategoryOwned(
  userId: string,
  categoryId: string
): Promise<Owned> {
  const [row] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.id, categoryId), eq(categories.user_id, userId)))
    .limit(1)
  if (!row) return { ok: false, error: "Categoria inválida." }
  return { ok: true }
}

export async function assertImportOwned(
  userId: string,
  importId: string
): Promise<Owned> {
  const [row] = await db
    .select({ id: imports.id })
    .from(imports)
    .where(and(eq(imports.id, importId), eq(imports.user_id, userId)))
    .limit(1)
  if (!row) return { ok: false, error: "Importação inválida." }
  return { ok: true }
}

export async function assertPositionOwned(
  userId: string,
  positionId: string
): Promise<Owned> {
  const [row] = await db
    .select({ id: investmentPositions.id })
    .from(investmentPositions)
    .where(
      and(
        eq(investmentPositions.id, positionId),
        eq(investmentPositions.user_id, userId)
      )
    )
    .limit(1)
  if (!row) return { ok: false, error: "Posição inválida." }
  return { ok: true }
}
