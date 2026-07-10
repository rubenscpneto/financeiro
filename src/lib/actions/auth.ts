"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"
import { getSiteUrl } from "@/lib/site-url"

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "Informe e-mail e senha." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: "E-mail ou senha inválidos." }
  }

  redirect("/painel")
}

export async function signupAction(formData: FormData) {
  const nome = String(formData.get("nome") ?? "").trim()
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const passwordConfirm = String(formData.get("password_confirm") ?? "")

  if (!email || !password) {
    return { error: "Informe e-mail e senha." }
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." }
  }
  if (password !== passwordConfirm) {
    return { error: "As senhas não coincidem." }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome },
      emailRedirectTo: `${getSiteUrl()}/auth/confirmar`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  if (!data.session) {
    redirect("/auth/cadastro?enviado=1")
  }

  redirect("/painel")
}

export async function logoutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/auth/login")
}

export async function resetPasswordRequestAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()

  if (!email) {
    return { error: "Informe o e-mail." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/confirmar?next=/auth/redefinir-senha`,
  })

  if (error) {
    return { error: error.message }
  }

  return { ok: true as const }
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "")
  const passwordConfirm = String(formData.get("password_confirm") ?? "")

  if (!password) {
    return { error: "Informe a nova senha." }
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." }
  }
  if (password !== passwordConfirm) {
    return { error: "As senhas não coincidem." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: error.message }
  }

  redirect("/painel")
}
