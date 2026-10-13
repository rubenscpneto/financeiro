"use client"

import {
  DsCard,
  IconBadge,
  PageTitle,
} from "@/components/design/primitives"
import { AppMoney } from "@/components/app-money"
import { brl } from "@/components/design/money-display"
import { useHideValues } from "@/components/hide-values-provider"

export function ContasClient({
  banks,
}: {
  banks: {
    key: string
    name: string
    ok: boolean
    hours: number | null
    stale: boolean
    itemCount: number
    checkingBalance: number
    cards: {
      name: string
      last4: string | null
      fatura: number
      available: number
      limit: number
    }[]
    investmentsNet: number
    investCount: number
    total: number
    statusLabel: string
    sync: "none" | "ok" | "stale" | "error"
  }[]
}) {
  const { hidden } = useHideValues()

  return (
    <div className="flex min-w-0 flex-col gap-4 overflow-x-hidden">
      <PageTitle subtitle="Um cartão por banco conectado no Meu Pluggy. Só você vê os seus bancos." />

      <div className="grid gap-4 lg:grid-cols-2">
        {banks.map((b) => (
          <DsCard key={b.key}>
            <div className="flex items-start gap-3">
              <IconBadge
                name="wallet"
                tone={b.sync === "none" ? "neutral" : b.ok ? "ok" : "warn"}
              />
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">{b.name}</p>
                {b.sync !== "none" ? (
                  <>
                    <p className="flex items-center gap-2 text-sm text-ds-muted">
                      <span
                        className={
                          b.ok ? "size-2 rounded-full bg-ds-ok-dot" : "size-2 rounded-full bg-ds-warn"
                        }
                      />
                      {b.ok
                        ? `Conectado · atualizado${b.hours != null ? ` há ${b.hours < 24 ? `${b.hours} hora${b.hours === 1 ? "" : "s"}` : `${Math.round(b.hours / 24)} dia${Math.round(b.hours / 24) === 1 ? "" : "s"}`}` : ""}`
                        : b.stale
                          ? `Precisa reconectar · última atualização há ${Math.round((b.hours ?? 72) / 24)} dias`
                          : "Erro ao atualizar · tentar de novo"}
                    </p>
                    <p className="text-sm text-ds-subtle">
                      via Meu Pluggy · {b.itemCount} {b.itemCount === 1 ? "item junto" : "itens juntos"}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-ds-muted">Conta manual</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ds-muted">Conta</p>
              <p className="whitespace-nowrap font-semibold">
                <AppMoney value={b.checkingBalance} />
              </p>
            </div>
            {b.cards.map((c) => (
              <div key={c.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-ds-muted">
                    {c.name}
                    {c.last4 ? ` •••• ${c.last4}` : ""}
                  </p>
                  <p className="whitespace-nowrap font-semibold">
                    <AppMoney value={c.fatura} />
                  </p>
                </div>
                {c.limit > 0 ? (
                  <p className="text-sm text-ds-subtle">
                    Limite disponível {brl(c.available, hidden)} de{" "}
                    {brl(c.limit, hidden)}
                  </p>
                ) : null}
              </div>
            ))}
            {b.investCount > 0 ? (
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ds-muted">
                  Investimentos ({b.investCount})
                </p>
                <p className="whitespace-nowrap font-semibold">
                  <AppMoney value={b.investmentsNet} />
                </p>
              </div>
            ) : null}
            {b.investCount > 0 ? (
              <div className="flex items-center justify-between gap-3 border-t border-ds-border pt-3">
                <p className="text-sm font-medium">Conta + investimentos</p>
                <p className="whitespace-nowrap font-semibold">
                  <AppMoney value={b.total} />
                </p>
              </div>
            ) : null}

            {b.sync === "none" ? null : b.ok ? (
              <p className="text-sm text-ds-subtle">
                Próxima atualização perto das 13h. O app só lê os dados; quem
                atualiza é o Meu Pluggy.
              </p>
            ) : (
              <div className="rounded-xl bg-ds-warn-soft p-3 text-sm">
                <p>
                  A autorização pode ter vencido. Renove no Meu Pluggy. Até lá,
                  os valores deste banco podem estar velhos.
                </p>
                <a
                  href="https://my.pluggy.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-block font-semibold text-ds-accent"
                >
                  Abrir Meu Pluggy
                </a>
              </div>
            )}
          </DsCard>
        ))}

        <DsCard className="border-dashed">
          <IconBadge name="wallet" tone="neutral" />
          <p className="font-semibold">Adicionar outro banco</p>
          <p className="text-sm text-ds-muted">
            Autorize no Meu Pluggy. O banco aparece na próxima sincronização.
            Só você vê os seus bancos.
          </p>
          <a
            href="https://my.pluggy.ai"
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-ds-accent"
          >
            Abrir Meu Pluggy
          </a>
        </DsCard>
      </div>
    </div>
  )
}
