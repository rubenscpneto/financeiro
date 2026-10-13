"use client"

import { useEffect, useTransition } from "react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import {
  saveUserSettingsAction,
  updateProfileNameAction,
} from "@/lib/actions/crud"
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
import type { UserSettings } from "@/lib/user-settings"

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

function applyTextSize(size: UserSettings["textSize"]) {
  document.documentElement.classList.toggle("text-grande", size === "grande")
  try {
    localStorage.setItem("financeiro-text-size", size)
  } catch {
    /* ignore */
  }
}

export function ConfiguracoesClient({
  nome,
  email,
  pluggy,
  settings,
  bankCount,
}: {
  nome: string
  email: string
  pluggy: {
    connected: boolean
    institution: string | null
    statusLabel: string
    detail: string | null
  }
  settings: UserSettings
  bankCount: number
}) {
  const [pending, start] = useTransition()
  const { theme, setTheme } = useTheme()
  const { hidden, setHidden } = useHideValues()
  const currentTheme = theme ?? settings.theme ?? "system"
  const label = nome || email || "Usuário"

  useEffect(() => {
    applyTextSize(settings.textSize)
  }, [settings.textSize])

  function patch(next: Partial<UserSettings>) {
    start(async () => {
      const res = await saveUserSettingsAction(next)
      if (res.error) toast.error(res.error)
    })
  }

  return (
    <div className="mx-auto flex w-full min-w-0 max-w-[1120px] flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start">
      <div className="flex flex-col gap-5">
        <PageTitle subtitle="Só o que muda o app. Cada pessoa da família tem o próprio login." />

        <DsCard>
          <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
            Perfil
          </p>
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
              Editar
            </Button>
          </form>
          <p className="text-sm text-ds-subtle">
            Cada membro da família entra com o próprio login e só vê os próprios
            bancos.
          </p>
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
            onClick={() => {
              setTheme("light")
              patch({ theme: "light" })
            }}
          />
          <ThemeOpt
            icon="moon"
            label="Escuro"
            desc="Fundo escuro, cansa menos a vista à noite"
            on={currentTheme === "dark"}
            onClick={() => {
              setTheme("dark")
              patch({ theme: "dark" })
            }}
          />
          <ThemeOpt
            icon="phone"
            label="Seguir o sistema"
            desc="Muda junto com o celular"
            on={currentTheme === "system"}
            onClick={() => {
              setTheme("system")
              patch({ theme: "system" })
            }}
          />
          <div className="flex items-center justify-between gap-3 py-3.5">
            <p className="text-base font-medium">Tamanho do texto</p>
            <div className="inline-flex rounded-full bg-ds-elevated p-1">
              {(["normal", "grande"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => {
                    applyTextSize(size)
                    patch({ textSize: size })
                  }}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm capitalize",
                    settings.textSize === size
                      ? "bg-ds-surface font-semibold"
                      : "text-ds-muted"
                  )}
                >
                  {size === "normal" ? "Normal" : "Grande"}
                </button>
              ))}
            </div>
          </div>
        </DsCard>

        <DsCard>
          <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
            Privacidade
          </p>
          <button
            type="button"
            className="flex w-full items-start gap-3.5 text-left"
            onClick={() => {
              const next = !hidden
              setHidden(next)
              patch({ hideValuesDefault: next })
            }}
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
                Ao abrir, os valores aparecem como R$ ••••
              </p>
            </div>
            <Toggle on={hidden} />
          </button>
        </DsCard>
      </div>

      <div className="flex flex-col gap-5">
        <DsCard className="gap-0 divide-y divide-ds-border p-0 px-4">
          <p className="px-0 pt-4 pb-2 text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
            Orçamento
          </p>
          {(
            [
              ["teto", "Teto por categoria", "Padrão"],
              ["envelope", "Envelope", "Sobra passa pro próximo mês"],
            ] as const
          ).map(([id, label, desc]) => (
            <button
              key={id}
              type="button"
              className="flex w-full items-center gap-3 py-3.5 text-left"
              onClick={() => patch({ budgetMode: id })}
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{label}</p>
                <p className="text-sm text-ds-muted">{desc}</p>
              </div>
              <Radio on={settings.budgetMode === id} />
            </button>
          ))}
        </DsCard>

        <DsCard>
          <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
            Avisos
          </p>
          {(
            [
              ["faturaDue", "Fatura perto de vencer", "3 dias antes do vencimento"],
              ["unusualSpend", "Compra acima do normal", "Quando o gasto sai do padrão"],
              ["doubleCharge", "Cobrança em dobro", "Duas cobranças iguais no mesmo dia"],
            ] as const
          ).map(([key, label, desc]) => (
            <button
              key={key}
              type="button"
              className="flex w-full items-start gap-3.5 text-left"
              onClick={() =>
                patch({
                  alerts: { ...settings.alerts, [key]: !settings.alerts[key] },
                })
              }
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{label}</p>
                <p className="text-sm text-ds-muted">{desc}</p>
              </div>
              <Toggle on={settings.alerts[key]} />
            </button>
          ))}
        </DsCard>

        <DsCard className="gap-0 divide-y divide-ds-border p-0 px-4">
          <p className="px-0 pt-4 pb-2 text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
            Dados
          </p>
          <a href="/contas" className="flex items-center justify-between py-3.5">
            <span>Contas e bancos</span>
            <span className="text-sm text-ds-muted">{bankCount} bancos</span>
          </a>
          <a href="/categorias" className="flex items-center justify-between py-3.5">
            <span>Categorias e regras</span>
            <span className="text-ds-accent">›</span>
          </a>
          <a href="/api/export" className="flex items-center justify-between py-3.5">
            <span>Exportar meus dados</span>
            <span className="text-sm text-ds-muted">planilha CSV</span>
          </a>
        </DsCard>

        <DsCard>
          <p className="text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
            Segurança
          </p>
          <a
            href="/auth/esqueci-senha"
            className="flex items-center gap-3.5 py-2"
          >
            <IconBadge name="lock" size={40} iconSize={20} radius="lg" />
            <span className="font-medium">Trocar senha</span>
          </a>
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
      </div>
    </div>
  )
}
