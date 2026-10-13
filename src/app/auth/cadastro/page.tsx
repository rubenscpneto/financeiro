import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function CadastroPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-muted/40 p-6">
      <div className="mb-8 text-center">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          Finanças
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Financeiro</h1>
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Cadastro desabilitado</CardTitle>
          <CardDescription>
            Novas contas não podem ser criadas neste aplicativo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{" "}
            <Link href="/auth/login" className="text-foreground underline">
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
