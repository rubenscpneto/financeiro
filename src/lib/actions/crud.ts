"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/server"
import type { AccountType } from "@/lib/types"

async function requireUser() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims?.sub) throw new Error("Não autenticado")
  return { supabase, userId: data.claims.sub as string }
}

export async function createAccountAction(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const name = String(formData.get("name") ?? "").trim()
  const type = String(formData.get("type") ?? "checking") as AccountType
  const last4 = String(formData.get("last4") ?? "").trim() || null

  if (!name) return { error: "Informe o nome da conta." }

  const { error } = await supabase.from("accounts").insert({
    user_id: userId,
    name,
    type,
    institution: "C6",
    last4,
  })

  if (error) return { error: error.message }
  revalidatePath("/contas")
  return { ok: true }
}

export async function updateAccountAction(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const name = String(formData.get("name") ?? "").trim()
  const last4 = String(formData.get("last4") ?? "").trim() || null
  const is_active = formData.get("is_active") === "on"

  const { error } = await supabase
    .from("accounts")
    .update({ name, last4, is_active, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId)

  if (error) return { error: error.message }
  revalidatePath("/contas")
  return { ok: true }
}

export async function deleteAccountAction(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const { error } = await supabase
    .from("accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
  if (error) return { error: error.message }
  revalidatePath("/contas")
  return { ok: true }
}

export async function createCategoryAction(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const name = String(formData.get("name") ?? "").trim()
  const kind = String(formData.get("kind") ?? "expense")
  const color = String(formData.get("color") ?? "").trim() || null
  if (!name) return { error: "Informe o nome." }

  const { error } = await supabase.from("categories").insert({
    user_id: userId,
    name,
    kind,
    color,
  })
  if (error) return { error: error.message }
  revalidatePath("/categorias")
  return { ok: true }
}

export async function deleteCategoryAction(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
    .eq("is_system", false)
  if (error) return { error: error.message }
  revalidatePath("/categorias")
  return { ok: true }
}

export async function createRuleAction(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const match_pattern = String(formData.get("match_pattern") ?? "").trim()
  const category_id = String(formData.get("category_id") ?? "")
  const priority = Number(formData.get("priority") ?? 100)
  const account_type = String(formData.get("account_type") ?? "") || null

  if (!match_pattern || !category_id) {
    return { error: "Padrão e categoria são obrigatórios." }
  }

  const { error } = await supabase.from("category_rules").insert({
    user_id: userId,
    match_pattern,
    category_id,
    priority,
    account_type,
  })
  if (error) return { error: error.message }
  revalidatePath("/categorias")
  return { ok: true }
}

export async function deleteRuleAction(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const { error } = await supabase
    .from("category_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
  if (error) return { error: error.message }
  revalidatePath("/categorias")
  return { ok: true }
}

export async function updateTransactionCategoryAction(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const category_id = String(formData.get("category_id") ?? "") || null
  const is_transfer = formData.get("is_transfer") === "true"

  const { error } = await supabase
    .from("transactions")
    .update({
      category_id,
      is_transfer,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)

  if (error) return { error: error.message }
  revalidatePath("/transacoes")
  revalidatePath("/painel")
  return { ok: true }
}

export async function upsertBudgetAction(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const category_id = String(formData.get("category_id") ?? "")
  const year_month = String(formData.get("year_month") ?? "")
  const limit_amount = Number(
    String(formData.get("limit_amount") ?? "").replace(",", ".")
  )

  if (!category_id || !year_month || !limit_amount) {
    return { error: "Preencha categoria, mês e limite." }
  }

  const { error } = await supabase.from("budgets").upsert(
    {
      user_id: userId,
      category_id,
      year_month,
      limit_amount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,category_id,year_month" }
  )

  if (error) return { error: error.message }
  revalidatePath("/orcamentos")
  revalidatePath("/painel")
  return { ok: true }
}

export async function deleteBudgetAction(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
  if (error) return { error: error.message }
  revalidatePath("/orcamentos")
  return { ok: true }
}

export async function createGoalAction(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const name = String(formData.get("name") ?? "").trim()
  const target_amount = Number(
    String(formData.get("target_amount") ?? "").replace(",", ".")
  )
  const current_amount = Number(
    String(formData.get("current_amount") ?? "0").replace(",", ".")
  )
  const deadline = String(formData.get("deadline") ?? "") || null

  if (!name || !target_amount) return { error: "Nome e meta são obrigatórios." }

  const { error } = await supabase.from("goals").insert({
    user_id: userId,
    name,
    target_amount,
    current_amount,
    deadline,
  })
  if (error) return { error: error.message }
  revalidatePath("/metas")
  revalidatePath("/painel")
  return { ok: true }
}

export async function updateGoalAction(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const current_amount = Number(
    String(formData.get("current_amount") ?? "0").replace(",", ".")
  )
  const is_archived = formData.get("is_archived") === "on"

  const { error } = await supabase
    .from("goals")
    .update({
      current_amount,
      is_archived,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId)

  if (error) return { error: error.message }
  revalidatePath("/metas")
  revalidatePath("/painel")
  return { ok: true }
}

export async function deleteGoalAction(formData: FormData) {
  const { supabase, userId } = await requireUser()
  const id = String(formData.get("id") ?? "")
  const { error } = await supabase
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId)
  if (error) return { error: error.message }
  revalidatePath("/metas")
  return { ok: true }
}
