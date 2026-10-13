import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { DesignIcon } from "@/components/design/icons"
import { Avatar, IconBadge } from "@/components/design/primitives"
import {
  DESKTOP_MORE,
  DESKTOP_NAV,
  MOBILE_NAV,
  SYNC,
  USER,
} from "@/lib/design/mock-data"

export function BottomNav({ active }: { active: string }) {
  return (
    <nav className="flex w-full items-start justify-between border-t border-ds-border bg-ds-surface px-2 pb-7 pt-2">
      {MOBILE_NAV.map((item) => {
        const on = item.label === active
        return (
          <div
            key={item.label}
            className="flex w-[72px] flex-col items-center gap-1 pt-0.5"
          >
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
                "text-[13px]",
                on
                  ? "font-semibold text-ds-accent"
                  : "font-medium text-ds-subtle"
              )}
            >
              {item.label}
            </span>
          </div>
        )
      })}
    </nav>
  )
}

function NavItem({
  icon,
  label,
  active,
}: {
  icon: (typeof DESKTOP_NAV)[number]["icon"] | (typeof DESKTOP_MORE)[number]["icon"]
  label: string
  active?: boolean
}) {
  return (
    <div
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
    </div>
  )
}

export function DesktopSidebar({ active }: { active: string }) {
  return (
    <aside className="flex w-[264px] shrink-0 flex-col justify-between border-r border-ds-border bg-ds-surface px-4 py-6">
      <div className="flex flex-col gap-1">
        <div className="mb-5 flex items-center gap-2.5 px-2">
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
        </div>
        {DESKTOP_NAV.map((item) => (
          <NavItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={item.label === active}
          />
        ))}
        <p className="px-3 pb-1.5 pt-5 text-[13px] font-semibold tracking-[0.06em] text-ds-subtle">
          MAIS
        </p>
        {DESKTOP_MORE.map((item) => (
          <NavItem
            key={item.label}
            icon={item.icon}
            label={item.label}
            active={item.label === active}
          />
        ))}
      </div>
      <div className="flex flex-col gap-3">
        <div className="rounded-xl border border-ds-border bg-ds-bg px-3.5 py-3.5">
          <div className="flex items-center gap-2">
            <span className="size-2.5 rounded-full bg-ds-ok-dot" />
            <p className="text-[15px] font-semibold text-ds-ink">
              {SYNC.sidebarTitle}
            </p>
          </div>
          <p className="mt-1.5 text-sm leading-[1.35] text-ds-muted">
            {SYNC.sidebarBody}
          </p>
        </div>
        <div className="flex items-center gap-3 px-1.5">
          <Avatar initials={USER.initials} size={40} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ds-ink">
              {USER.fullName}
            </p>
            <p className="text-sm font-medium text-ds-accent">Sair</p>
          </div>
        </div>
      </div>
    </aside>
  )
}

export function DesignFrame({
  theme,
  children,
  className,
}: {
  theme: "claro" | "escuro"
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn(theme === "escuro" && "dark", className)}>
      <div className="min-h-full bg-ds-bg font-sans text-base text-ds-ink antialiased">
        {children}
      </div>
    </div>
  )
}
