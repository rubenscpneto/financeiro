import { Suspense } from "react"
import Link from "next/link"
import { ForgotPasswordForm } from "@/components/auth-forms"
import { isPasswordResetEmailEnabled } from "@/lib/auth"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const dynamic = "force-dynamic"

export default function EsqueciSenhaPage() {
  if (!isPasswordResetEmailEnabled()) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 p-6">
        <div className="mb-8 text-center">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
            Finanças
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            Financeiro
          </h1>
        </div>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Redefinição indisponível</CardTitle>
            <CardDescription>
              O envio de e-mail não está configurado. Defina RESEND_API_KEY para
              habilitar a redefinição de senha.
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
      </div>
    )
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 p-6">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Finanças
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Financeiro</h1>
      </div>
      <Suspense>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  )
}
