import { redirect } from "next/navigation"
import { createClient } from "@/lib/server"
import { AppShell } from "@/components/app-shell"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  if (!data?.claims) redirect("/auth/login")

  const userId = data.claims.sub as string
  const { data: profile } = await supabase
    .from("profiles")
    .select("nome")
    .eq("id", userId)
    .maybeSingle()

  const label =
    profile?.nome ||
    (typeof data.claims.email === "string" ? data.claims.email : "Usuário")

  return <AppShell userLabel={label}>{children}</AppShell>
}
