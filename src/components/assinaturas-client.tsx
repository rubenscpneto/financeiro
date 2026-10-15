"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { saveUserSettingsAction } from "@/lib/actions/crud"
import { formatDateBR } from "@/lib/format"
import {
  Chip,
  DsCard,
  IconBadge,
  PageTitle,
} from "@/components/design/primitives"
import { AppMoney } from "@/components/app-money"
import { brl } from "@/components/design/money-display"
import { useHideValues } from "@/components/hide-values-provider"
import type { RecurrenceSeries, RecurrenceWarning } from "@/lib/recurrences"
import { Button } from "@/components/ui/button"

export function AssinaturasClient({
  series,
  warnings,
  ended,
  monthly,
  aiTotal,
  aiCount,
}: {
  series: RecurrenceSeries[]
  warnings: RecurrenceWarning[]
  ended: RecurrenceSeries[]
  monthly: number
  aiTotal: number
  aiCount: number
}) {
  const { hidden } = useHideValues()
  const [pending, start] = useTransition()

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <PageTitle subtitle="Cobranças que se repetem, detectadas no extrato." />

      {series.length === 0 ? (
        <DsCard>
          <p>Nenhuma cobrança repetida encontrada ainda.</p>
        </DsCard>
      ) : (
        <>
          <DsCard className="gap-2 border-ds-hero-stroke bg-ds-hero p-5 text-ds-on-hero">
            <p className="text-sm text-ds-on-hero-muted">Assinaturas por mês</p>
            <p className="text-[34px] font-semibold leading-none whitespace-nowrap">
              <AppMoney value={monthly} className="text-ds-on-hero" />
            </p>
            <p className="text-sm text-ds-on-hero-muted">
              {brl(monthly * 12, hidden)} por ano · {series.length} cobranças
              todo mês
            </p>
          </DsCard>

          <div className="grid gap-3 sm:grid-cols-2">
            <DsCard>
              <p className="text-sm text-ds-muted">Em dobro</p>
              <p className="text-xl font-semibold text-ds-danger">
                {warnings.length} aviso{warnings.length === 1 ? "" : "s"}
              </p>
            </DsCard>
            <DsCard>
              <p className="text-sm text-ds-muted">Com IA</p>
              <p className="text-xl font-semibold whitespace-nowrap">
                <AppMoney value={aiTotal} />
              </p>
              <p className="text-sm text-ds-muted">
                {aiCount} assinatura{aiCount === 1 ? "" : "s"}
              </p>
            </DsCard>
          </div>

          {warnings.length > 0 ? (
            <DsCard className="border-ds-danger bg-ds-danger-soft">
              {warnings.map((w) => (
                <div key={w.key} className="flex flex-col gap-2">
                  {w.kind === "duplicate_series" ? (
                    <>
                      <p className="font-semibold">{w.name} cobrado 2 vezes</p>
                      <p className="text-sm text-ds-muted">
                        Duas assinaturas de {brl(w.monthly, hidden)} no{" "}
                        {w.accountName || "cartão"}. Cancelando uma, você
                        economiza {brl(w.monthly, hidden)} por mês (
                        {brl(w.yearly, hidden)} por ano).
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold">
                        {w.name}: {w.count}× {brl(w.amount, hidden)} em{" "}
                        {formatDateBR(w.date)}
                      </p>
                      <p className="text-sm text-ds-muted">
                        Cobrança em dobro no mesmo dia — pode pedir o estorno.
                      </p>
                    </>
                  )}
                  <div className="flex flex-wrap gap-2">
                    <a
                      href="/transacoes"
                      className="text-sm font-semibold text-ds-accent"
                    >
                      Ver as duas cobranças
                    </a>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => {
                        start(async () => {
                          const res = await saveUserSettingsAction({
                            dismissedWarningKeys: [w.key],
                          })
                          if (res.error) toast.error(res.error)
                          else toast.success("Marcado como conferido")
                        })
                      }}
                    >
                      Marcar como conferido
                    </Button>
                  </div>
                </div>
              ))}
            </DsCard>
          ) : null}

          <DsCard className="gap-0">
            <p className="pb-2 text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
              Cobranças que se repetem · automático
            </p>
            {series.map((s) => (
              <div
                key={s.key}
                className="flex items-start gap-3 border-t border-ds-border py-3"
              >
                <IconBadge name="repeat" tone={s.duplicate ? "danger" : "neutral"} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="whitespace-nowrap font-semibold">
                      {brl(s.monthly, hidden)}/mês
                    </p>
                  </div>
                  <p className="text-sm text-ds-muted">
                    {s.accountName || "Conta"} · próxima em{" "}
                    {formatDateBR(s.nextDate)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {s.isAi ? <Chip>IA</Chip> : null}
                    {s.duplicate ? (
                      <Chip className="bg-ds-danger-soft text-ds-danger">
                        Em dobro
                      </Chip>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </DsCard>

          {aiCount >= 2 ? (
            <DsCard>
              <p className="font-semibold">Você paga {aiCount} assinaturas de IA</p>
              <p className="text-sm text-ds-muted">
                Elas somam {brl(aiTotal, hidden)} por mês. Precisa das duas?
              </p>
            </DsCard>
          ) : null}

          {ended.length > 0 ? (
            <DsCard className="gap-0 opacity-80">
              <p className="pb-2 text-sm font-semibold tracking-[0.06em] text-ds-subtle uppercase">
                Pararam de cobrar
              </p>
              {ended.map((s) => (
                <div
                  key={s.key}
                  className="flex justify-between gap-3 border-t border-ds-border py-3 text-sm"
                >
                  <span>{s.name}</span>
                  <span className="text-ds-muted">
                    última cobrança em {formatDateBR(s.lastDate)}
                  </span>
                </div>
              ))}
            </DsCard>
          ) : null}
        </>
      )}
    </div>
  )
}
