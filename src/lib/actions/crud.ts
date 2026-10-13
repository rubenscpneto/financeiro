"use server"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/db"
import {
  adjustments,
  budgets,
  categories,
  categoryRules,
  goals,
  profiles,
  transactions,
} from "@/db/schema"
import { loadUserSettings, saveUserSettings, type UserSettings } from "@/lib/user-settings"
import { todayYmd } from "@/lib/format"
import { requireUser } from "@/lib/auth-session"
import { getOrCreateUserCrypto } from "@/lib/crypto/user-keys"
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
  const crypto = await getOrCreateUserCrypto(userId)
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
      match_pattern: crypto.encrypt("match_pattern", match_pattern),
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
  const crypto = await getOrCreateUserCrypto(userId)
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
        limit_amount: crypto.encryptNum("limit_amount", limit_amount),
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: [budgets.user_id, budgets.category_id, budgets.year_month],
        set: {
          limit_amount: crypto.encryptNum("limit_amount", limit_amount),
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
  const crypto = await getOrCreateUserCrypto(userId)
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
      name: crypto.encrypt("name", name),
      target_amount: crypto.encryptNum("target_amount", target_amount),
      current_amount: crypto.encryptNum("current_amount", current_amount),
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
  const crypto = await getOrCreateUserCrypto(userId)
  const id = String(formData.get("id") ?? "")
  const current_amount = Number(
    String(formData.get("current_amount") ?? "0").replace(",", ".")
  )
  const is_archived = formData.get("is_archived") === "on"

  await db
    .update(goals)
    .set({
      current_amount: crypto.encryptNum("current_amount", current_amount),
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

export async function updateProfileNameAction(
  formData: FormData
): Promise<ActionResult> {
  const { userId } = await requireUser()
  const crypto = await getOrCreateUserCrypto(userId)
  const nome = String(formData.get("nome") ?? "").trim()
  if (!nome) return { error: "Informe o nome." }

  try {
    await db
      .insert(profiles)
      .values({
        id: userId,
        nome: crypto.encrypt("nome", nome),
        updated_at: new Date(),
      })
      .onConflictDoUpdate({
        target: profiles.id,
        set: {
          nome: crypto.encrypt("nome", nome),
          updated_at: new Date(),
        },
      })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao salvar o nome.",
    }
  }
  revalidatePath("/configuracoes")
  revalidatePath("/painel")
  return { ok: true }
}

export async function saveUserSettingsAction(
  patch: Partial<UserSettings>
): Promise<ActionResult> {
  const { userId } = await requireUser()
  const crypto = await getOrCreateUserCrypto(userId)
  const current = await loadUserSettings(crypto)
  const next: UserSettings = {
    ...current,
    ...patch,
    alerts: { ...current.alerts, ...(patch.alerts ?? {}) },
    dismissedWarningKeys: [
      ...new Set([
        ...current.dismissedWarningKeys,
        ...(patch.dismissedWarningKeys ?? []),
      ]),
    ],
  }
  await saveUserSettings(crypto, next)
  revalidatePath("/configuracoes")
  revalidatePath("/assinaturas")
  return { ok: true }
}

export async function writeOffLoanAction(input: {
  loanTxnId: string
  person: string
  remaining: number
  originalDate: string
  originalAmount: number
}): Promise<ActionResult> {
  const { userId } = await requireUser()
  const crypto = await getOrCreateUserCrypto(userId)
  const remaining = Number(input.remaining) || 0
  if (remaining <= 0) return { error: "Nada a registrar." }
  const notes = JSON.stringify({
    person: input.person,
    originalDate: input.originalDate,
    originalAmount: input.originalAmount,
  })
  try {
    await db.insert(adjustments).values({
      user_id: userId,
      date: todayYmd(),
      kind: "family_help",
      category: crypto.encrypt("category", "Ajuda à família"),
      amount: crypto.encryptNum("amount", -Math.abs(remaining)),
      ref_id: input.loanTxnId,
      notes: crypto.encrypt("notes", notes),
    })
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Falha ao registrar.",
    }
  }
  revalidatePath("/transacoes")
  revalidatePath("/metas")
  revalidatePath("/painel")
  return { ok: true }
}

export async function undoWriteOffAction(id: string): Promise<ActionResult> {
  const { userId } = await requireUser()
  await db
    .update(adjustments)
    .set({ undone_at: new Date() })
    .where(and(eq(adjustments.id, id), eq(adjustments.user_id, userId)))
  revalidatePath("/transacoes")
  revalidatePath("/metas")
  revalidatePath("/painel")
  return { ok: true }
}
