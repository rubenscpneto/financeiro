import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { resolveCommitSha } from "@/lib/app-version"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

const commitSha = resolveCommitSha()

export const metadata: Metadata = {
  title: "Financeiro — Finanças",
  description: "Gestão financeira pessoal via Open Finance (Meu Pluggy)",
  other: {
    "app-version": commitSha,
  },
}

const THEME_INIT = `(function(){try{var d=document.documentElement;var t=localStorage.getItem("theme")||"system";var dark=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);d.classList.toggle("dark",dark);d.style.colorScheme=dark?"dark":"light";var h=localStorage.getItem("financeiro-hide-values");d.setAttribute("data-hide-values",h==="0"?"0":"1");}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans text-base">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <TooltipProvider>
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
      </body>
    </html>
  )
}
