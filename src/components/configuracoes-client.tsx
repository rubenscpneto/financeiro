"use client"

import { useTransition } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { updateProfileNameAction } from "@/lib/actions/crud"
import { cn } from "@/lib/utils"
import { type DesignIconName } from "@/components/design/icons"
import {
  Avatar,
  DsCard,
  IconBadge,
  PageTitle,
} from "@/components/design/primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useHideValues } from "@/components/hide-values-provider"
import { LogoutButton } from "@/components/logout-button"

function initialsFrom(label: string) {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return label.slice(0, 2).toUpperCase() || "EU"
}

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

function ThemeOpt({
  icon,
  label,
  desc,
  on,
  onClick,
}: {
  icon: DesignIconName
  label: string
  desc: string
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3.5 py-3.5 text-left"
    >
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
    </button>
  )
}

export function ConfiguracoesClient({
  nome,
  email,
  pluggy,
}: {
  nome: string
  email: string
  pluggy: {
    connected: boolean
    institution: string | null
    statusLabel: string
    detail: string | null
  }
}) {
  const [pending, start] = useTransition()
  const { theme, setTheme } = useTheme()
  const { hidden, setHidden } = useHideValues()
  const currentTheme = theme ?? "system"
  const label = nome || email || "Usuário"

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[720px] flex-col gap-5">
      <PageTitle subtitle="Perfil, aparência, privacidade e conexão bancária." />

      <DsCard>
        <div className="flex items-center gap-3.5">
          <Avatar initials={initialsFrom(label)} size={56} />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-semibold">{label}</p>
            <p className="text-sm text-ds-muted">{email}</p>
          </div>
        </div>
        <form
          className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end"
          action={(fd) => {
            start(async () => {
              const res = await updateProfileNameAction(fd)
              if (res.error) toast.error(res.error)
              else toast.success("Nome salvo")
            })
          }}
        >
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm text-ds-muted">
            Nome
            <Input
              name="nome"
              defaultValue={nome}
              required
              maxLength={80}
              placeholder="Seu nome"
            />
          </label>
          <Button type="submit" disabled={pending}>
            Salvar
          </Button>
        </form>
      </DsCard>

      <DsCard className="gap-0 divide-y divide-ds-border p-0 px-4">
        <p className="px-0 pt-4 pb-2 text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
          Aparência
        </p>
        <ThemeOpt
          icon="sun"
          label="Claro"
          desc="Fundo branco, bom para lugares iluminados"
          on={currentTheme === "light"}
          onClick={() => setTheme("light")}
        />
        <ThemeOpt
          icon="moon"
          label="Escuro"
          desc="Fundo escuro, cansa menos a vista à noite"
          on={currentTheme === "dark"}
          onClick={() => setTheme("dark")}
        />
        <ThemeOpt
          icon="phone"
          label="Seguir o sistema"
          desc="Muda junto com o celular"
          on={currentTheme === "system"}
          onClick={() => setTheme("system")}
        />
      </DsCard>

      <DsCard>
        <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
          Privacidade
        </p>
        <button
          type="button"
          className="flex w-full items-start gap-3.5 text-left"
          onClick={() => setHidden(!hidden)}
        >
          <IconBadge
            name="eyeoff"
            tone={hidden ? "ok" : "neutral"}
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
          <Toggle on={hidden} />
        </button>
      </DsCard>

      <DsCard>
        <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
          Open Finance
        </p>
        <div className="flex items-start gap-3.5">
          <IconBadge
            name="wallet"
            tone={pluggy.connected ? "ok" : "warn"}
            size={40}
            iconSize={20}
            radius="lg"
          />
          <div className="min-w-0 flex-1">
            <p className="text-base font-semibold">
              {pluggy.institution ?? "Pluggy"}
            </p>
            <p className="text-sm text-ds-muted">{pluggy.statusLabel}</p>
            {pluggy.detail ? (
              <p className="mt-1 text-sm text-ds-subtle">{pluggy.detail}</p>
            ) : null}
            <a
              href="https://my.pluggy.ai"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-semibold text-ds-accent"
            >
              Reconectar no Meu Pluggy
            </a>
          </div>
        </div>
      </DsCard>

      <DsCard>
        <LogoutButton className="flex w-full items-center gap-3.5 text-left">
          <IconBadge
            name="logout"
            tone="danger"
            size={40}
            iconSize={20}
            radius="lg"
          />
          <span className="text-base font-medium text-ds-danger">
            Sair do app
          </span>
        </LogoutButton>
      </DsCard>
    </div>
  )
}
