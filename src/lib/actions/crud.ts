"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import {
  budgets,
  categories,
  categoryRules,
  goals,
  transactions,
} from "@/db/schema"
import { requireUser } from "@/lib/auth-session"
import { assertCategoryOwned } from "@/lib/ownership"

export type ActionResult = { ok?: true; error?: string }

export async function createCategoryAction(
  formData: FormData
): Promise<ActionResult> {
  const { userId } = await requireUser()
  const name = String(formData.get("name") ?? "").trim()
  const kind = String(formData.get("kind") ?? "expense") as
    | "income"
    | "expense"
    | "transfer"
  const color = String(formData.get("color") ?? "").trim() || null
  if (!name) return { error: "Informe o nome." }

  try {
    await db.insert(categories).values({
      user_id: userId,
      name,
      kind,
      color,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao criar." }
  }
  revalidatePath("/categorias")
  return { ok: true }
}

export async function deleteCategoryAction(
  formData: FormData
): Promise<ActionResult> {
  const { userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  await db
    .delete(categories)
    .where(
      and(
        eq(categories.id, id),
        eq(categories.user_id, userId),
        eq(categories.is_system, false)
      )
    )
  revalidatePath("/categorias")
  return { ok: true }
}

export async function createRuleAction(formData: FormData): Promise<ActionResult> {
  const { userId } = await requireUser()
  const match_pattern = String(formData.get("match_pattern") ?? "").trim()
  const category_id = String(formData.get("category_id") ?? "")
  const priority = Number(formData.get("priority") ?? 100)
  const account_type =
    (String(formData.get("account_type") ?? "") as
      | "checking"
      | "credit_card"
      | "investment"
      | "") || null

  if (!match_pattern || !category_id) {
    return { error: "Padrão e categoria são obrigatórios." }
  }

  const owned = await assertCategoryOwned(userId, category_id)
  if (!owned.ok) return { error: owned.error }

  try {
    await db.insert(categoryRules).values({
      user_id: userId,
      match_pattern,
      category_id,
      priority,
      account_type,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao criar." }
  }
  revalidatePath("/categorias")
  return { ok: true }
}

export async function deleteRuleAction(formData: FormData): Promise<ActionResult> {
  const { userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  await db
    .delete(categoryRules)
    .where(and(eq(categoryRules.id, id), eq(categoryRules.user_id, userId)))
  revalidatePath("/categorias")
  return { ok: true }
}

export async function updateTransactionCategoryAction(
  formData: FormData
): Promise<ActionResult> {
  const { userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const category_id = String(formData.get("category_id") ?? "") || null
  const is_transfer = formData.get("is_transfer") === "true"

  if (category_id) {
    const owned = await assertCategoryOwned(userId, category_id)
    if (!owned.ok) return { error: owned.error }
  }

  await db
    .update(transactions)
    .set({
      category_id,
      is_transfer,
      updated_at: new Date(),
    })
    .where(and(eq(transactions.id, id), eq(transactions.user_id, userId)))

  revalidatePath("/transacoes")
  revalidatePath("/painel")
  return { ok: true }
}

export async function upsertBudgetAction(
  formData: FormData
): Promise<ActionResult> {
  const { userId } = await requireUser()
  const category_id = String(formData.get("category_id") ?? "")
  const year_month = String(formData.get("year_month") ?? "")
  const limit_amount = Number(
    String(formData.get("limit_amount") ?? "").replace(",", ".")
  )

  if (!category_id || !year_month || !limit_amount) {
    return { error: "Preencha categoria, mês e limite." }
  }

  const owned = await assertCategoryOwned(userId, category_id)
  if (!owned.ok) return { error: owned.error }

  try {
    await db
      .insert(budgets)
      .values({
        user_id: userId,
        category_id,
        year_month,
        limit_amount: String(limit_amount),
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [budgets.user_id, budgets.category_id, budgets.year_month],
        set: {
          limit_amount: String(limit_amount),
          updated_at: new Date(),
        },
      })
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao salvar." }
  }
  revalidatePath("/orcamentos")
  revalidatePath("/painel")
  return { ok: true }
}

export async function deleteBudgetAction(
  formData: FormData
): Promise<ActionResult> {
  const { userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  await db
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.user_id, userId)))
  revalidatePath("/orcamentos")
  return { ok: true }
}

export async function createGoalAction(formData: FormData): Promise<ActionResult> {
  const { userId } = await requireUser()
  const name = String(formData.get("name") ?? "").trim()
  const target_amount = Number(
    String(formData.get("target_amount") ?? "").replace(",", ".")
  )
  const current_amount = Number(
    String(formData.get("current_amount") ?? "0").replace(",", ".")
  )
  const deadline = String(formData.get("deadline") ?? "") || null

  if (!name || !target_amount) return { error: "Nome e meta são obrigatórios." }

  try {
    await db.insert(goals).values({
      user_id: userId,
      name,
      target_amount: String(target_amount),
      current_amount: String(current_amount),
      deadline,
    })
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Falha ao criar." }
  }
  revalidatePath("/metas")
  revalidatePath("/painel")
  return { ok: true }
}

export async function updateGoalAction(formData: FormData): Promise<ActionResult> {
  const { userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const current_amount = Number(
    String(formData.get("current_amount") ?? "0").replace(",", ".")
  )
  const is_archived = formData.get("is_archived") === "on"

  await db
    .update(goals)
    .set({
      current_amount: String(current_amount),
      is_archived,
      updated_at: new Date(),
    })
    .where(and(eq(goals.id, id), eq(goals.user_id, userId)))

  revalidatePath("/metas")
  revalidatePath("/painel")
  return { ok: true }
}

export async function deleteGoalAction(formData: FormData): Promise<ActionResult> {
  const { userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.user_id, userId)))
  revalidatePath("/metas")
  return { ok: true }
}
