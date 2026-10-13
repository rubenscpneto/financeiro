"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { APIError } from "better-auth/api"
import { auth, isPasswordResetEmailEnabled } from "@/lib/auth"
import { getSiteUrl } from "@/lib/site-url"

function authMessage(error: unknown, fallback: string) {
  if (error instanceof APIError) return error.message || fallback
  if (error instanceof Error && error.message) return error.message
  return fallback
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!email || !password) {
    return { error: "Informe e-mail e senha." }
  }

  try {
    await auth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    })
  } catch {
    return { error: "E-mail ou senha inválidos." }
  }

  redirect("/painel")
}

export async function logoutAction() {
  await auth.api.signOut({
    headers: await headers(),
  })
  redirect("/auth/login")
}

export async function resetPasswordRequestAction(formData: FormData) {
  if (!isPasswordResetEmailEnabled()) {
    return { error: "Redefinição de senha por e-mail não está configurada." }
  }

  const email = String(formData.get("email") ?? "").trim()
  if (!email) {
    return { error: "Informe o e-mail." }
  }

  try {
    await auth.api.requestPasswordReset({
      body: {
        email,
        redirectTo: `${getSiteUrl()}/auth/redefinir-senha`,
      },
      headers: await headers(),
    })
  } catch (error) {
    return { error: authMessage(error, "Não foi possível enviar o e-mail.") }
  }

  return { ok: true as const }
}

export async function updatePasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "")
  const passwordConfirm = String(formData.get("password_confirm") ?? "")
  const token = String(formData.get("token") ?? "").trim()

  if (!password) {
    return { error: "Informe a nova senha." }
  }
  if (password.length < 6) {
    return { error: "A senha precisa ter pelo menos 6 caracteres." }
  }
  if (password !== passwordConfirm) {
    return { error: "As senhas não coincidem." }
  }
  if (!token) {
    return { error: "Link de redefinição inválido ou expirado." }
  }

  try {
    await auth.api.resetPassword({
      body: { newPassword: password, token },
      headers: await headers(),
    })
  } catch (error) {
    return { error: authMessage(error, "Não foi possível atualizar a senha.") }
  }

  redirect("/auth/login")
}
