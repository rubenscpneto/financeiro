"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  loginAction,
  signupAction,
  resetPasswordRequestAction,
  updatePasswordAction,
} from "@/lib/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"

export function LoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  const confirmError = searchParams.get("erro") === "confirmacao"

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>
          Acesse suas finanças de qualquer lugar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(fd) => {
            startTransition(async () => {
              const res = await loginAction(fd)
              if (res?.error) setError(res.error)
            })
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </Field>
            {confirmError ? (
              <Alert variant="destructive">
                <AlertDescription>
                  Não foi possível confirmar a conta. Tente novamente ou peça um
                  novo e-mail.
                </AlertDescription>
              </Alert>
            ) : null}
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Entrando…" : "Entrar"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link
                href="/auth/esqueci-senha"
                className="text-foreground underline"
              >
                Esqueci a senha
              </Link>
            </p>
            <p className="text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link href="/auth/cadastro" className="text-foreground underline">
                Criar conta
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

export function SignupForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const searchParams = useSearchParams()
  const enviado = searchParams.get("enviado") === "1"

  if (enviado) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verifique seu e-mail</CardTitle>
          <CardDescription>
            Enviamos um link para confirmar sua conta. Abra o e-mail e clique em
            confirmar para entrar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            Já confirmou?{" "}
            <Link href="/auth/login" className="text-foreground underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>
          Controle pessoal das suas finanças.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(fd) => {
            startTransition(async () => {
              const res = await signupAction(fd)
              if (res?.error) setError(res.error)
            })
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="nome">Nome</FieldLabel>
              <Input id="nome" name="nome" autoComplete="name" />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password_confirm">Confirmar senha</FieldLabel>
              <Input
                id="password_confirm"
                name="password_confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </Field>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Criando…" : "Criar conta"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link href="/auth/login" className="text-foreground underline">
                Entrar
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [pending, startTransition] = useTransition()

  if (ok) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>E-mail enviado</CardTitle>
          <CardDescription>
            Se existir uma conta com esse e-mail, você receberá um link para
            redefinir a senha.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/login" className="text-foreground underline">
              Voltar ao login
            </Link>
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Esqueci a senha</CardTitle>
        <CardDescription>
          Informe seu e-mail para receber o link de redefinição.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(fd) => {
            startTransition(async () => {
              const res = await resetPasswordRequestAction(fd)
              if (res?.error) {
                setError(res.error)
                return
              }
              setOk(true)
            })
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
              />
            </Field>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Enviando…" : "Enviar link"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link href="/auth/login" className="text-foreground underline">
                Voltar ao login
              </Link>
            </p>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

export function ResetPasswordForm() {
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Redefinir senha</CardTitle>
        <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={(fd) => {
            startTransition(async () => {
              const res = await updatePasswordAction(fd)
              if (res?.error) setError(res.error)
            })
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password">Nova senha</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="password_confirm">Confirmar senha</FieldLabel>
              <Input
                id="password_confirm"
                name="password_confirm"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </Field>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Salvando…" : "Salvar senha"}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}
