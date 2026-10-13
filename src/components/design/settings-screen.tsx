import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { SYNC, USER } from "@/lib/design/mock-data"
import { DesignIcon, type DesignIconName } from "@/components/design/icons"
import { Avatar, Chip, IconBadge } from "@/components/design/primitives"
import { BottomNav, DesktopSidebar } from "@/components/design/chrome"

function Radio({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex size-[26px] shrink-0 items-center justify-center rounded-full border-2",
        on ? "border-ds-btn" : "border-ds-subtle"
      )}
    >
      {on ? <span className="size-3 rounded-full bg-ds-btn" /> : null}
    </span>
  )
}

function Toggle({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 w-14 shrink-0 items-center rounded-full p-0.5",
        on ? "justify-end bg-ds-btn" : "justify-start bg-ds-track"
      )}
    >
      <span
        className={cn(
          "size-[26px] rounded-full",
          on ? "bg-ds-on-btn" : "bg-ds-knob-off"
        )}
      />
    </span>
  )
}

function Group({
  title,
  note,
  children,
}: {
  title: string
  note?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
        {title}
      </p>
      <div className="divide-y divide-ds-border overflow-hidden rounded-2xl border border-ds-border bg-ds-surface px-4">
        {children}
      </div>
      {note ? (
        <p className="text-sm leading-[1.35] text-ds-muted">{note}</p>
      ) : null}
    </div>
  )
}

function ThemeOpt({
  icon,
  label,
  desc,
  on,
}: {
  icon: DesignIconName
  label: string
  desc: string
  on: boolean
}) {
  return (
    <div className="flex items-center gap-3.5 py-3.5">
      <IconBadge
        name={icon}
        tone={on ? "ok" : "neutral"}
        size={40}
        iconSize={20}
        radius="lg"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("text-base", on ? "font-semibold" : "font-medium")}>
          {label}
        </p>
        <p className="text-sm text-ds-muted">{desc}</p>
      </div>
      <Radio on={on} />
    </div>
  )
}

function BudgetOpt({
  label,
  badge,
  desc,
  on,
}: {
  label: string
  badge?: string
  desc: string
  on: boolean
}) {
  return (
    <div className="flex items-start gap-3.5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-base font-semibold">{label}</p>
          {badge ? (
            <Chip className="px-2.5 py-0.5 text-sm">{badge}</Chip>
          ) : null}
        </div>
        <p className="mt-1 text-sm leading-[1.35] text-ds-muted">{desc}</p>
      </div>
      <Radio on={on} />
    </div>
  )
}

function LinkRow({
  icon,
  label,
  value,
  danger,
}: {
  icon: DesignIconName
  label: string
  value?: string
  danger?: boolean
}) {
  return (
    <div className="flex items-center gap-3.5 py-3.5">
      <IconBadge
        name={icon}
        tone={danger ? "danger" : "neutral"}
        size={40}
        iconSize={20}
        radius="lg"
      />
      <p
        className={cn(
          "min-w-0 flex-1 text-base font-medium",
          danger ? "text-ds-danger" : "text-ds-ink"
        )}
      >
        {label}
      </p>
      {value ? (
        <span className="text-sm text-ds-subtle">{value}</span>
      ) : null}
      {danger ? null : (
        <DesignIcon name="chevron" size={20} className="text-ds-subtle" />
      )}
    </div>
  )
}

function SettingsBody({
  theme,
  hideValuesDefault = true,
  budgetMode = "teto",
}: {
  theme: "claro" | "escuro"
  hideValuesDefault?: boolean
  budgetMode?: "teto" | "envelope"
}) {
  const isDark = theme === "escuro"
  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex items-center gap-3.5 rounded-2xl border border-ds-border bg-ds-surface p-4">
        <Avatar initials={USER.initials} size={56} />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">{USER.fullName}</p>
          <p className="text-sm text-ds-muted">{USER.email}</p>
        </div>
        <span className="text-[15px] font-semibold text-ds-accent">Editar</span>
      </div>

      <Group title="Aparência">
        <ThemeOpt
          icon="sun"
          label="Claro"
          desc="Fundo branco, bom para lugares iluminados"
          on={!isDark}
        />
        <ThemeOpt
          icon="moon"
          label="Escuro"
          desc="Fundo escuro, cansa menos a vista à noite"
          on={isDark}
        />
        <ThemeOpt
          icon="phone"
          label="Seguir o sistema"
          desc="Muda junto com o celular"
          on={false}
        />
        <LinkRow icon="textsize" label="Tamanho do texto" value="Grande" />
      </Group>

      <Group title="Privacidade">
        <div className="flex items-start gap-3.5 py-4">
          <IconBadge
            name="eyeoff"
            tone="ok"
            size={40}
            iconSize={20}
            radius="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold">
              Começar com valores escondidos
            </p>
            <p className="mt-1 text-sm leading-[1.35] text-ds-muted">
              Ao abrir o app, os valores aparecem como R$ ••••. Toque em
              &quot;Mostrar valores&quot; para ver.
            </p>
          </div>
          <Toggle on={hideValuesDefault} />
        </div>
      </Group>

      <Group
        title="Orçamento"
        note="Você pode trocar quando quiser. Os gastos já feitos não mudam."
      >
        <BudgetOpt
          label="Teto por categoria"
          badge="Padrão"
          desc="Você define quanto pode gastar por mês em cada categoria. Todo mês começa do zero."
          on={budgetMode === "teto"}
        />
        <BudgetOpt
          label="Envelope"
          desc="O que sobrar de uma categoria passa para o próximo mês."
          on={budgetMode === "envelope"}
        />
      </Group>

      <Group title="Conta e dados">
        <LinkRow icon="lock" label="Trocar senha" />
        <LinkRow icon="wallet" label="Contas e bancos" value="C6 Bank" />
        <LinkRow icon="tag" label="Categorias e regras" />
        <LinkRow icon="download" label="Exportar meus dados" value="CSV" />
        <LinkRow icon="logout" label="Sair do app" danger />
      </Group>

      <div className="flex flex-col items-center gap-0.5 pt-1">
        <p className="text-sm text-ds-subtle">{SYNC.footer}</p>
        <p className="text-sm text-ds-subtle">
          Financeiro · versão de exemplo
        </p>
      </div>
    </div>
  )
}

function MobileSettings({
  theme,
  hideValuesDefault,
  budgetMode,
}: {
  theme: "claro" | "escuro"
  hideValuesDefault: boolean
  budgetMode: "teto" | "envelope"
}) {
  return (
    <div className="flex w-full flex-col bg-ds-bg">
      <header className="flex items-center gap-2 px-3 pb-2 pt-5">
        <span className="inline-flex size-12 shrink-0 items-center justify-center text-ds-ink">
          <DesignIcon name="back" size={24} />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
      </header>
      <div className="px-4 pb-6 pt-2">
        <SettingsBody
          theme={theme}
          hideValuesDefault={hideValuesDefault}
          budgetMode={budgetMode}
        />
      </div>
      <BottomNav active="Mais" />
    </div>
  )
}

function DesktopSettings({
  theme,
  hideValuesDefault,
  budgetMode,
}: {
  theme: "claro" | "escuro"
  hideValuesDefault: boolean
  budgetMode: "teto" | "envelope"
}) {
  return (
    <div className="flex min-h-full w-full bg-ds-bg">
      <DesktopSidebar active="Configurações" />
      <main className="flex min-w-0 flex-1 flex-col px-8 pb-10 pt-7">
        <h1 className="mb-6 text-[30px] font-semibold tracking-tight">
          Configurações
        </h1>
        <div className="max-w-[720px]">
          <SettingsBody
            theme={theme}
            hideValuesDefault={hideValuesDefault}
            budgetMode={budgetMode}
          />
        </div>
      </main>
    </div>
  )
}

export function SettingsScreen({
  variant,
  theme,
  hideValuesDefault = true,
  budgetMode = "teto",
}: {
  variant: "mobile" | "desktop"
  theme: "claro" | "escuro"
  hideValuesDefault?: boolean
  budgetMode?: "teto" | "envelope"
}) {
  return variant === "mobile" ? (
    <MobileSettings
      theme={theme}
      hideValuesDefault={hideValuesDefault}
      budgetMode={budgetMode}
    />
  ) : (
    <DesktopSettings
      theme={theme}
      hideValuesDefault={hideValuesDefault}
      budgetMode={budgetMode}
    />
  )
}
