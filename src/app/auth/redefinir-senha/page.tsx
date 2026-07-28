import { Suspense } from "react"
import { redirect } from "next/navigation"
import { ResetPasswordForm } from "@/components/auth-forms"
import { createClient } from "@/lib/server"

export default async function RedefinirSenhaPage() {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) {
    redirect("/auth/esqueci-senha")
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
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
