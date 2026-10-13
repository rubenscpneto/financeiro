import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { DesignIcon, type DesignIconName } from "@/components/design/icons"

export function PageTitle({
  title,
  subtitle,
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <div>
      {title ? (
        <h1 className="text-2xl font-semibold tracking-tight text-ds-ink">
          {title}
        </h1>
      ) : null}
      {subtitle ? (
        <p className={title ? "mt-1 text-sm text-ds-muted" : "text-sm text-ds-muted"}>
          {subtitle}
        </p>
      ) : null}
    </div>
  )
}

export function DsCard({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3.5 rounded-2xl border border-ds-border bg-ds-surface p-[18px]",
        className
      )}
    >
      {children}
    </div>
  )
}

export function IconBadge({
  name,
  tone = "neutral",
  size = 44,
  iconSize = 22,
  radius = "full",
}: {
  name: DesignIconName
  tone?: "neutral" | "danger" | "warn" | "info" | "ok" | "pos" | "hero"
  size?: number
  iconSize?: number
  radius?: "full" | "lg"
}) {
  const tones = {
    neutral: "bg-ds-icon-bg text-ds-muted",
    danger: "bg-ds-danger-soft text-ds-danger",
    warn: "bg-ds-warn-soft text-ds-warn",
    info: "bg-ds-info-soft text-ds-info",
    ok: "bg-ds-accent-soft text-ds-accent",
    pos: "bg-ds-accent-soft text-ds-pos",
    hero: "bg-ds-hero text-ds-on-hero",
  }
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        radius === "full" ? "rounded-full" : "rounded-xl",
        tones[tone]
      )}
      style={{ width: size, height: size }}
    >
      <DesignIcon name={name} size={iconSize} />
    </span>
  )
}

export function Avatar({
  initials,
  size = 44,
}: {
  initials: string
  size?: number
}) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-ds-btn font-semibold text-ds-on-btn"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {initials}
    </span>
  )
}

export function Chip({
  children,
  className,
  dot,
}: {
  children: ReactNode
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-ds-accent-soft px-3 py-1.5 text-sm font-medium text-ds-accent",
        className
      )}
    >
      {dot ? (
        <span className="size-2 rounded-full bg-ds-ok-dot" />
      ) : null}
      {children}
    </span>
  )
}

export function Flag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-ds-danger-soft px-2.5 py-0.5 text-sm font-medium text-ds-danger">
      {children}
    </span>
  )
}

export function SectionHead({
  title,
  action,
}: {
  title: string
  action?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-lg font-semibold tracking-tight text-ds-ink">
        {title}
      </h2>
      {action ? (
        <span className="text-[15px] font-semibold text-ds-accent">
          {action}
        </span>
      ) : null}
    </div>
  )
}

export function Bar({
  pct,
  tone = "ok",
  className,
}: {
  pct: number
  tone?: "danger" | "warn" | "ok" | "ink"
  className?: string
}) {
  const colors = {
    danger: "bg-ds-danger",
    warn: "bg-ds-warn",
    ok: "bg-ds-accent",
    ink: "bg-ds-ink",
  }
  const width = `${Math.min(Math.max(pct, 0) * 100, 100)}%`
  return (
    <div
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-ds-track",
        className
      )}
    >
      <div
        className={cn("h-full rounded-full", colors[tone])}
        style={{ width }}
      />
    </div>
  )
}

export const dsControlClass =
  "h-10 rounded-xl border border-ds-border bg-ds-surface px-3 text-sm text-ds-ink"

export function EyeButton({
  onClick,
}: {
  hidden?: boolean
  onClick?: () => void
}) {
  const className =
    "inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-ds-border bg-ds-surface px-3.5 py-2.5 text-[15px] font-medium text-ds-ink"
  const inner = (
    <>
      <span className="inline-flex items-center gap-2 values-shown:hidden">
        <DesignIcon name="eye" size={20} />
        Mostrar valores
      </span>
      <span className="hidden items-center gap-2 values-shown:inline-flex">
        <DesignIcon name="eyeoff" size={20} />
        Esconder valores
      </span>
    </>
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    )
  }
  return <span className={className}>{inner}</span>
}

export function IconSquare({ name }: { name: DesignIconName }) {
  return (
    <span className="inline-flex size-12 items-center justify-center rounded-xl border border-ds-border bg-ds-surface text-ds-ink">
      <DesignIcon name={name} size={22} />
    </span>
  )
}
