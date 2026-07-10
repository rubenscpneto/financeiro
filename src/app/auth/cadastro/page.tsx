import { Suspense } from "react"
import { SignupForm } from "@/components/auth-forms"

export default function CadastroPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 p-6">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Finanças
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">C6 Pessoal</h1>
      </div>
      <Suspense>
        <SignupForm />
      </Suspense>
    </div>
  )
}
