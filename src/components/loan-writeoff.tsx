"use client"

import { useEffect, useRef, useTransition } from "react"
import { toast } from "sonner"
import { undoWriteOffAction, writeOffLoanAction } from "@/lib/actions/crud"
import { AppMoney } from "@/components/app-money"
import { DesignIcon } from "@/components/design/icons"
import { Button } from "@/components/ui/button"
import { formatDateBR } from "@/lib/format"
import { brl } from "@/components/design/money-display"
import { useHideValues } from "@/components/hide-values-provider"

export type LoanWriteOffTarget = {
  loanTxnId: string
  person: string
  remaining: number
  originalDate: string
  originalAmount: number
}

export function LoanWriteOffDialog({
  target,
  monthSpend,
  receivableTotal,
  onClose,
}: {
  target: LoanWriteOffTarget | null
  monthSpend: number
  receivableTotal: number
  onClose: () => void
}) {
  const [pending, start] = useTransition()
  const cancelRef = useRef<HTMLButtonElement>(null)
  const { hidden } = useHideValues()

  useEffect(() => {
    if (!target) return
    cancelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [target, onClose])

  if (!target) return null
  const today = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date())

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 lg:items-center lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="writeoff-title"
    >
      <div className="flex w-full max-w-[520px] flex-col gap-4 rounded-t-3xl border border-ds-border bg-ds-surface p-5 lg:rounded-2xl">
        <h2 id="writeoff-title" className="text-lg font-semibold">
          {target.person} não vai devolver?
        </h2>
        <p className="text-sm leading-5 text-ds-muted">
          Os {brl(target.remaining, hidden)} que faltam do Pix de{" "}
          {formatDateBR(target.originalDate)} saem de Valores a receber e viram
          gasto na categoria Ajuda à família, em {today}.
        </p>
        <div className="rounded-xl bg-ds-elevated px-3 py-3 text-sm">
          <p>
            Valores a receber {brl(receivableTotal, hidden)} →{" "}
            {brl(receivableTotal - target.remaining, hidden)}
          </p>
          <p>
            Gastos do mês {brl(monthSpend, hidden)} →{" "}
            {brl(monthSpend + target.remaining, hidden)}
          </p>
        </div>
        <p className="text-sm text-ds-subtle">
          O Pix de {formatDateBR(target.originalDate)} continua no extrato. Se o
          dinheiro voltar depois, é só desfazer.
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-ds-border px-4 text-sm font-medium"
            onClick={onClose}
          >
            Cancelar
          </button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              start(async () => {
                const res = await writeOffLoanAction(target)
                if (res.error) toast.error(res.error)
                else {
                  toast.success("Pronto: virou ajuda à família")
                  onClose()
                }
              })
            }}
          >
            Sim, virou ajuda
          </Button>
        </div>
      </div>
    </div>
  )
}

export function UndoWriteOffButton({
  id,
  className,
}: {
  id: string
  className?: string
}) {
  const [pending, start] = useTransition()
  return (
    <button
      type="button"
      className={className ?? "text-sm font-semibold text-ds-accent"}
      disabled={pending}
      onClick={() => {
        start(async () => {
          const res = await undoWriteOffAction(id)
          if (res.error) toast.error(res.error)
          else toast.success("Desfeito")
        })
      }}
    >
      Desfazer
    </button>
  )
}

export function LoanActions({
  onWriteOff,
}: {
  onWriteOff: () => void
}) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" disabled>
        Registrar devolução
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="text-ds-danger"
        onClick={onWriteOff}
      >
        <DesignIcon name="heart" size={16} />
        Não vai voltar
      </Button>
    </div>
  )
}

export function LoanOriginalLine({
  date,
  amount,
}: {
  date: string
  amount: number
}) {
  return (
    <p className="text-sm text-ds-muted">
      Pix original: {formatDateBR(date)} · <AppMoney value={amount} />
    </p>
  )
}
