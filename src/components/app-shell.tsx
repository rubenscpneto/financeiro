"use client"

import { Suspense, useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname, useSearchParams } from "next/navigation"
import { BankFilter } from "@/components/bank-filter"
import { bankFromParams, hrefWithBank, type BankGroup } from "@/lib/banks"
import { SP_TZ } from "@/lib/format"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import { DesignIcon, type DesignIconName } from "@/components/design/icons"
import {
  Avatar,
  EyeButton,
  IconBadge,
} from "@/components/design/primitives"
import { useHideValues } from "@/components/hide-values-provider"
import { LogoutButton } from "@/components/logout-button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

const MOBILE_NAV: { href?: string; more?: boolean; icon: DesignIconName; label: string }[] =
  [
    { href: "/painel", icon: "house", label: "Início" },
    { href: "/transacoes", icon: "arrows", label: "Extrato" },
    { href: "/investimentos", icon: "trending", label: "Investir" },
    { href: "/metas", icon: "target", label: "Planejar" },
    { more: true, icon: "grid", label: "Mais" },
  ]

const DESKTOP_NAV: { href: string; icon: DesignIconName; label: string }[] = [
  { href: "/painel", icon: "house", label: "Início" },
  { href: "/transacoes", icon: "arrows", label: "Extrato" },
  { href: "/fatura", icon: "card", label: "Fatura do cartão" },
  { href: "/investimentos", icon: "trending", label: "Investimentos" },
]

const PLANEJAR_NAV: { href: string; icon: DesignIconName; label: string }[] = [
  { href: "/metas", icon: "target", label: "Metas" },
  { href: "/assinaturas", icon: "repeat", label: "Assinaturas" },
]

const MORE_NAV: { href: string; icon: DesignIconName; label: string }[] = [
  { href: "/contas", icon: "wallet", label: "Contas e bancos" },
  { href: "/configuracoes", icon: "sliders", label: "Configurações" },
  { href: "/categorias", icon: "tag", label: "Categorias" },
  { href: "/orcamentos", icon: "target", label: "Orçamentos" },
]

const MOBILE_MORE: { href: string; icon: DesignIconName; label: string }[] = [
  { href: "/fatura", icon: "card", label: "Fatura do cartão" },
  { href: "/assinaturas", icon: "repeat", label: "Assinaturas" },
  ...MORE_NAV,
]

const PAGE_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/transacoes", title: "Extrato" },
  { prefix: "/investimentos", title: "Investimentos" },
  { prefix: "/fatura", title: "Fatura do cartão" },
  { prefix: "/assinaturas", title: "Assinaturas" },
  { prefix: "/orcamentos", title: "Planejar gastos" },
  { prefix: "/categorias", title: "Categorias" },
  { prefix: "/metas", title: "Metas" },
  { prefix: "/configuracoes", title: "Configurações" },
  { prefix: "/contas", title: "Contas e bancos" },
]

function pageTitle(pathname: string) {
  return PAGE_TITLES.find((p) => pathname === p.prefix || pathname.startsWith(`${p.prefix}/`))
    ?.title ?? "Financeiro"
}

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function initialsFrom(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return label.slice(0, 2).toUpperCase() || "EU"
}

function firstName(label: string) {
  return label.split(/[\s@]/)[0] || label
}

function todayLabel() {
  const raw = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: SP_TZ,
  }).format(new Date())
  return raw.charAt(0).toLowerCase() + raw.slice(1)
}

function NavRow({
  icon,
  label,
  active,
}: {
  icon: DesignIconName
  label: string
  active?: boolean
}) {
  return (
    <span
      className={cn(
        "flex w-full items-center gap-3 rounded-[10px] px-3 py-3",
        active && "bg-ds-accent-soft"
      )}
    >
      <DesignIcon
        name={icon}
        size={22}
        className={active ? "text-ds-accent" : "text-ds-muted"}
      />
      <span
        className={cn(
          "text-base",
          active ? "font-semibold text-ds-accent" : "font-medium text-ds-ink"
        )}
      >
        {label}
      </span>
    </span>
  )
}

export function AppShell({
  children,
  userLabel,
  banks = [],
}: {
  children: ReactNode
  userLabel: string
  banks?: Pick<BankGroup, "key" | "name">[]
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { hidden, toggle } = useHideValues()
  const { setTheme } = useTheme()
  const [moreOpen, setMoreOpen] = useState(false)
  const greet = pathname === "/painel"
  const bank = bankFromParams(searchParams.get("bank"))

  function toggleTheme() {
    const isDark = document.documentElement.classList.contains("dark")
    setTheme(isDark ? "light" : "dark")
  }

  useEffect(() => {
    try {
      const size = localStorage.getItem("financeiro-text-size")
      document.documentElement.classList.toggle("text-grande", size === "grande")
    } catch {
      /* ignore */
    }
  }, [])

  return (
    <div className="min-h-full bg-ds-bg font-sans text-base text-ds-ink antialiased">
      <div className="flex min-h-dvh">
        <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-ds-border bg-ds-surface px-4 py-6 lg:flex">
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-4">
            <div className="flex min-h-0 flex-col gap-1 overflow-y-auto">
              <Link href={hrefWithBank("/painel", bank)} className="mb-5 flex items-center gap-2.5 px-2">
                <IconBadge
                  name="wallet"
                  tone="hero"
                  size={36}
                  iconSize={20}
                  radius="lg"
                />
                <span className="text-[19px] font-semibold text-ds-ink">
                  Financeiro
                </span>
              </Link>
              {DESKTOP_NAV.map((item) => (
                <Link key={item.href} href={hrefWithBank(item.href, bank)}>
                  <NavRow
                    icon={item.icon}
                    label={item.label}
                    active={isActive(pathname, item.href)}
                  />
                </Link>
              ))}
              <p className="px-3 pb-1.5 pt-5 text-sm font-semibold tracking-[0.06em] text-ds-subtle">
                PLANEJAR
              </p>
              {PLANEJAR_NAV.map((item) => (
                <Link key={item.href} href={hrefWithBank(item.href, bank)}>
                  <NavRow
                    icon={item.icon}
                    label={item.label}
                    active={isActive(pathname, item.href)}
                  />
                </Link>
              ))}
              <p className="px-3 pb-1.5 pt-5 text-sm font-semibold tracking-[0.06em] text-ds-subtle">
                MAIS
              </p>
              {MORE_NAV.map((item) => (
                <Link key={item.href} href={hrefWithBank(item.href, bank)}>
                  <NavRow
                    icon={item.icon}
                    label={item.label}
                    active={isActive(pathname, item.href)}
                  />
                </Link>
              ))}
            </div>
            <div className="flex shrink-0 flex-col gap-3">
              <div className="flex items-center gap-3 px-1.5">
                <Avatar initials={initialsFrom(userLabel)} size={40} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ds-ink">
                    {firstName(userLabel)}
                  </p>
                  <LogoutButton className="text-sm font-medium text-ds-accent">
                    Sair
                  </LogoutButton>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
          <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-2 lg:px-8">
            <div className="flex min-w-0 flex-1 flex-col gap-2 lg:flex-row lg:items-center lg:gap-3">
              <div className="min-w-0">
                {greet ? (
                  <>
                    <p className="text-[28px] leading-tight font-semibold tracking-tight lg:text-[32px]">
                      Olá, {firstName(userLabel)}
                    </p>
                    <p className="mt-1 text-sm text-ds-muted" suppressHydrationWarning>
                      Suas finanças · {todayLabel()}
                    </p>
                  </>
                ) : (
                  <p className="text-2xl font-semibold tracking-tight text-ds-ink">
                    {pageTitle(pathname)}
                  </p>
                )}
              </div>
              <Suspense>
                <BankFilter banks={banks} />
              </Suspense>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <EyeButton hidden={hidden} onClick={toggle} />
              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex size-11 items-center justify-center rounded-full border border-ds-border bg-ds-surface text-ds-ink"
                aria-label="Alternar tema"
              >
                <DesignIcon name="moon" size={20} className="dark:hidden" />
                <DesignIcon name="sun" size={20} className="hidden dark:block" />
              </button>
            </div>
          </header>

          <main className="flex min-w-0 flex-1 flex-col gap-5 overflow-x-hidden px-5 pt-2 pb-28 lg:px-8 lg:pb-8">
            {children}
          </main>

          <nav className="fixed right-0 bottom-0 left-0 z-40 flex items-start justify-between border-t border-ds-border bg-ds-surface px-2 pt-2 pb-7 lg:hidden">
            {MOBILE_NAV.map((item) => {
              const on = item.href
                ? item.href === "/metas"
                  ? pathname.startsWith("/metas") ||
                    pathname.startsWith("/assinaturas")
                  : isActive(pathname, item.href)
                : moreOpen
              const inner = (
                <span className="flex w-[72px] flex-col items-center gap-1 pt-0.5">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-[18px] py-1.5",
                      on && "bg-ds-accent-soft"
                    )}
                  >
                    <DesignIcon
                      name={item.icon}
                      size={24}
                      className={on ? "text-ds-accent" : "text-ds-subtle"}
                    />
                  </span>
                  <span
                    className={cn(
                      "text-sm",
                      on
                        ? "font-semibold text-ds-accent"
                        : "font-medium text-ds-subtle"
                    )}
                  >
                    {item.label}
                  </span>
                </span>
              )
              if (item.more) {
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setMoreOpen(true)}
                  >
                    {inner}
                  </button>
                )
              }
              return (
                <Link key={item.href} href={hrefWithBank(item.href!, bank)}>
                  {inner}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl border-ds-border bg-ds-surface text-ds-ink"
        >
          <SheetHeader>
            <SheetTitle className="text-ds-ink">Mais</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-1 px-2 pb-6">
            {MOBILE_MORE.map((item) => (
              <Link
                key={item.href}
                href={hrefWithBank(item.href, bank)}
                onClick={() => setMoreOpen(false)}
              >
                <NavRow
                  icon={item.icon}
                  label={item.label}
                  active={isActive(pathname, item.href)}
                />
              </Link>
            ))}
            <button type="button" onClick={toggleTheme}>
              <span className="dark:hidden">
                <NavRow icon="moon" label="Tema escuro" />
              </span>
              <span className="hidden dark:block">
                <NavRow icon="sun" label="Tema claro" />
              </span>
            </button>
            <LogoutButton className="w-full">
              <NavRow icon="logout" label="Sair" />
            </LogoutButton>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
