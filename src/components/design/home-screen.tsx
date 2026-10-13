import { maskMoneyInText } from "@/lib/design/money"
import {
  ALERTS,
  BUDGETS,
  SYNC,
  TOTALS,
  TXNS,
  USER,
} from "@/lib/design/mock-data"
import { DesignIcon, type DesignIconName } from "@/components/design/icons"
import {
  Bar,
  Chip,
  DsCard,
  EyeButton,
  Flag,
  IconBadge,
  IconSquare,
  SectionHead,
  Avatar,
} from "@/components/design/primitives"
import { BottomNav, DesktopSidebar } from "@/components/design/chrome"
import { Money, brl } from "@/components/design/money-display"
import { SpendChart } from "@/components/design/spend-chart"

function toneColor(tone: "danger" | "warn" | "ok" | "info") {
  if (tone === "danger") return "text-ds-danger"
  if (tone === "warn") return "text-ds-warn"
  if (tone === "info") return "text-ds-info"
  return "text-ds-accent"
}

function TxnRow({
  t,
  hidden,
}: {
  t: (typeof TXNS)[number]
  hidden: boolean
}) {
  const tone =
    t.flag ? "danger" : t.amount > 0 ? "pos" : "neutral"
  return (
    <div className="flex items-center gap-3.5 py-3">
      <IconBadge name={t.icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-medium text-ds-ink">{t.name}</p>
        <p className="truncate text-sm text-ds-muted">{t.meta}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        <Money
          value={t.amount}
          hidden={hidden}
          sign
          className={`text-base font-semibold ${t.amount > 0 ? "text-ds-pos" : "text-ds-ink"}`}
        />
        {t.flag ? (
          <Flag>{t.flag}</Flag>
        ) : (
          <span className="text-sm text-ds-subtle">{t.date}</span>
        )}
      </div>
    </div>
  )
}

function BudgetRow({
  b,
  hidden,
}: {
  b: (typeof BUDGETS)[number]
  hidden: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-medium text-ds-ink">{b.name}</p>
        <p className={`text-sm font-semibold ${toneColor(b.tone)}`}>{b.label}</p>
      </div>
      <Bar pct={b.pct} tone={b.tone === "ok" ? "ok" : b.tone} />
      <p className="text-sm text-ds-muted">
        Gastou {brl(b.spent, hidden, { compact: true })} de{" "}
        {brl(b.limit, hidden, { compact: true })}
      </p>
    </div>
  )
}

function AlertRow({
  a,
  hidden,
}: {
  a: (typeof ALERTS)[number]
  hidden: boolean
}) {
  return (
    <div className="flex items-start gap-3.5 py-1">
      <IconBadge
        name={a.icon as DesignIconName}
        tone={a.tone}
        size={40}
        iconSize={20}
        radius="lg"
      />
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-ds-ink">{a.title}</p>
        <p className="mt-1 text-[15px] leading-[1.35] text-ds-muted">
          {maskMoneyInText(a.desc, hidden)}
        </p>
        <p className={`mt-1 text-[15px] font-semibold ${toneColor(a.tone)}`}>
          {a.cta} →
        </p>
      </div>
    </div>
  )
}

function MobileHome({ hideValues }: { hideValues: boolean }) {
  return (
    <div className="flex w-full flex-col bg-ds-bg">
      <header className="flex flex-col gap-3.5 px-5 pb-1 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar initials={USER.initials} size={48} />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-ds-ink">
                Olá, {USER.name}
              </h1>
              <p className="text-sm leading-tight text-ds-muted">
                Suas finanças · {USER.dateLabel}
              </p>
            </div>
          </div>
          <IconBadge name="bell" tone="neutral" size={48} iconSize={22} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <Chip dot>{SYNC.chip}</Chip>
          <EyeButton hidden={hideValues} />
        </div>
      </header>

      <div className="flex flex-col gap-4 px-4 pb-6 pt-3">
        <div className="flex flex-col gap-3.5 rounded-[20px] border border-ds-hero-stroke bg-ds-hero px-5 py-[22px]">
          <div>
            <p className="text-base font-medium text-ds-on-hero-muted">
              Quanto você tem
            </p>
            <p className="text-4xl font-semibold tracking-tight text-ds-on-hero">
              <Money value={TOTALS.netWorth} hidden={hideValues} />
            </p>
            <p className="mt-1 text-[15px] font-medium text-ds-hero-pos">
              ▲ Cresceu <Money value={TOTALS.netWorthDelta} hidden={hideValues} />{" "}
              em outubro
            </p>
          </div>
          <div className="h-px bg-ds-hero-divider" />
          {(
            [
              ["Na conta", TOTALS.checking, false],
              ["Investido", TOTALS.invested, false],
              ["Cartão a pagar", -TOTALS.cardBill, true],
            ] as const
          ).map(([label, value, signed]) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-[15px] text-ds-on-hero-muted">{label}</span>
              <span className="text-base font-semibold text-ds-on-hero">
                <Money value={value} hidden={hideValues} sign={signed} />
              </span>
            </div>
          ))}
        </div>

        <DsCard className="gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DesignIcon name="card" size={20} className="text-ds-muted" />
              <span className="text-[15px] font-medium text-ds-muted">
                Fatura do cartão
              </span>
            </div>
            <span className="text-sm text-ds-subtle">C6 Carbon</span>
          </div>
          <p className="text-[26px] font-semibold tracking-tight">
            <Money value={TOTALS.cardBill} hidden={hideValues} />
          </p>
          <p className="text-[15px] text-ds-muted">{TOTALS.cardDueMobile}</p>
          <Bar pct={TOTALS.cardLimitUsed} tone="ink" />
          <p className="text-sm text-ds-subtle">
            Você usou 22% do limite do cartão
          </p>
        </DsCard>

        <DsCard className="gap-2">
          <div className="flex items-center gap-2">
            <DesignIcon name="wallet" size={20} className="text-ds-muted" />
            <span className="text-[15px] font-medium text-ds-muted">
              Quanto gastou em outubro
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-[26px] font-semibold tracking-tight">
              <Money value={TOTALS.monthSpent} hidden={hideValues} />
            </p>
            <p className="text-[15px] text-ds-muted">
              de <Money value={TOTALS.monthBudget} hidden={hideValues} />
            </p>
          </div>
          <Bar pct={TOTALS.monthSpentRatio} tone="warn" />
          <p className="text-sm font-medium text-ds-warn">
            Já usou 76% do planejado, e o mês só passou de 42%.
          </p>
        </DsCard>

        <DsCard>
          <SectionHead title="Avisos de hoje" />
          {ALERTS.map((a) => (
            <AlertRow key={a.title} a={a} hidden={hideValues} />
          ))}
        </DsCard>

        <DsCard className="border-ds-accent-soft-border bg-ds-accent-soft">
          <div className="flex items-center gap-2">
            <DesignIcon name="sparkles" size={22} className="text-ds-accent" />
            <h2 className="text-lg font-semibold">Pensando em comprar algo?</h2>
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-ds-accent-soft-border bg-ds-surface py-1.5 pr-1.5 pl-3.5">
            <span className="min-w-0 flex-1 text-base text-ds-subtle">
              Ex.: tênis por {hideValues ? "R$ ••••" : "R$ 600"}
            </span>
            <span className="rounded-[10px] bg-ds-btn px-4 py-3 text-[15px] font-semibold text-ds-on-btn">
              Perguntar
            </span>
          </div>
          <p className="text-sm leading-[1.35] text-ds-muted">
            {maskMoneyInText(
              "Última pergunta: fone Sony de R$ 1.299. Resposta: melhor esperar, o limite de Compras já passou.",
              hideValues
            )}
          </p>
        </DsCard>

        <DsCard>
          <SectionHead title="Limites de outubro" action="Ver todos" />
          {BUDGETS.map((b) => (
            <BudgetRow key={b.name} b={b} hidden={hideValues} />
          ))}
        </DsCard>

        <DsCard className="gap-0">
          <div className="mb-1">
            <SectionHead title="Últimas movimentações" action="Ver extrato" />
          </div>
          {TXNS.map((t) => (
            <TxnRow key={t.name} t={t} hidden={hideValues} />
          ))}
        </DsCard>
      </div>

      <BottomNav active="Início" />
    </div>
  )
}

function DesktopHome({ hideValues }: { hideValues: boolean }) {
  return (
    <div className="flex min-h-full w-full bg-ds-bg">
      <DesktopSidebar active="Início" />
      <main className="flex min-w-0 flex-1 flex-col gap-5 px-8 pb-10 pt-7">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[30px] font-semibold tracking-tight text-ds-ink">
              Olá, {USER.name}
            </h1>
            <p className="text-[15px] text-ds-muted">
              Suas finanças · {USER.dateLabel} · exemplo
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-12 w-[260px] items-center gap-2.5 rounded-xl border border-ds-border bg-ds-surface px-3.5">
              <DesignIcon name="search" size={20} className="text-ds-subtle" />
              <span className="text-base text-ds-subtle">
                Buscar no extrato…
              </span>
            </div>
            <EyeButton hidden={hideValues} />
            <IconSquare name="bell" />
            <span className="inline-flex h-12 items-center gap-2 rounded-xl bg-ds-btn px-[18px] text-base font-semibold text-ds-on-btn">
              <DesignIcon name="sparkles" size={20} />
              Vale a pena?
            </span>
          </div>
        </header>

        <div className="grid grid-cols-4 gap-4">
          <DsCard className="border-ds-hero-stroke bg-ds-hero p-[22px]">
            <p className="text-base font-medium text-ds-on-hero-muted">
              Quanto você tem
            </p>
            <p className="text-[30px] font-semibold tracking-tight text-ds-on-hero">
              <Money value={TOTALS.netWorth} hidden={hideValues} />
            </p>
            <p className="text-[15px] font-medium text-ds-hero-pos">
              ▲ Cresceu <Money value={TOTALS.netWorthDelta} hidden={hideValues} />{" "}
              em outubro
            </p>
            <p className="text-sm text-ds-on-hero-muted">
              Conta + investimentos − cartão
            </p>
          </DsCard>
          <DsCard className="p-[22px]">
            <div className="flex items-center gap-2">
              <DesignIcon name="wallet" size={20} className="text-ds-muted" />
              <span className="text-base font-medium text-ds-muted">
                Na conta
              </span>
            </div>
            <p className="text-[26px] font-semibold tracking-tight">
              <Money value={TOTALS.checking} hidden={hideValues} />
            </p>
            <p className="text-sm text-ds-muted">
              Entrou <Money value={TOTALS.monthIncome} hidden={hideValues} compact /> e
              saiu <Money value={TOTALS.monthOut} hidden={hideValues} compact /> este
              mês
            </p>
          </DsCard>
          <DsCard className="p-[22px]">
            <div className="flex items-center gap-2">
              <DesignIcon name="card" size={20} className="text-ds-muted" />
              <span className="text-base font-medium text-ds-muted">
                Fatura do cartão
              </span>
            </div>
            <p className="text-[26px] font-semibold tracking-tight">
              <Money value={TOTALS.cardBill} hidden={hideValues} />
            </p>
            <p className="text-sm text-ds-muted">{TOTALS.cardDue}</p>
            <Bar pct={TOTALS.cardLimitUsed} tone="ink" />
            <p className="text-sm text-ds-subtle">Usou 22% do limite</p>
          </DsCard>
          <DsCard className="p-[22px]">
            <div className="flex items-center gap-2">
              <DesignIcon name="target" size={20} className="text-ds-muted" />
              <span className="text-base font-medium text-ds-muted">
                Gastou em outubro
              </span>
            </div>
            <p className="text-[26px] font-semibold tracking-tight">
              <Money value={TOTALS.monthSpent} hidden={hideValues} />
            </p>
            <p className="text-sm text-ds-muted">
              de <Money value={TOTALS.monthBudget} hidden={hideValues} /> planejados
            </p>
            <Bar pct={TOTALS.monthSpentRatio} tone="warn" />
            <p className="text-sm font-semibold text-ds-warn">
              76% usado · mês em 42%
            </p>
          </DsCard>
        </div>

        <div className="grid grid-cols-[1fr_400px] gap-4">
          <DsCard className="gap-4 p-6">
            <div>
              <h2 className="text-lg font-semibold">
                Como estão os gastos de outubro
              </h2>
              <p className="mt-1 text-[15px] text-ds-muted">
                Você gastou{" "}
                <Money value={TOTALS.overPace} hidden={hideValues} /> a mais do
                que o planejado para o dia 13.
              </p>
            </div>
            <div className="flex flex-wrap gap-5 text-sm text-ds-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-4 rounded-full bg-ds-accent" />
                Quanto já gastou
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-4 rounded-full bg-ds-subtle" />
                Ritmo planejado
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-0.5 w-4 rounded-full bg-ds-danger" />
                Compra fora do normal
              </span>
            </div>
            <SpendChart />
          </DsCard>
          <DsCard className="gap-4 p-5">
            <SectionHead title="Avisos de hoje" />
            {ALERTS.map((a) => (
              <AlertRow key={a.title} a={a} hidden={hideValues} />
            ))}
          </DsCard>
        </div>

        <div className="grid grid-cols-[1fr_400px] gap-4">
          <DsCard className="gap-0 px-6 pt-[22px] pb-[18px]">
            <div className="mb-1.5 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Últimas movimentações</h2>
              <span className="text-[15px] font-semibold text-ds-accent">
                Ver extrato completo
              </span>
            </div>
            {TXNS.map((t) => (
              <TxnRow key={t.name} t={t} hidden={hideValues} />
            ))}
          </DsCard>
          <div className="flex flex-col gap-4">
            <DsCard className="gap-3.5 p-5">
              <SectionHead title="Limites de outubro" action="Ver todos" />
              {BUDGETS.map((b) => (
                <BudgetRow key={b.name} b={b} hidden={hideValues} />
              ))}
            </DsCard>
            <DsCard className="gap-2 border-ds-accent-soft-border bg-ds-accent-soft p-5">
              <div className="flex items-center gap-2">
                <DesignIcon
                  name="sparkles"
                  size={20}
                  className="text-ds-accent"
                />
                <p className="text-base font-semibold">
                  Última pergunta: vale a pena?
                </p>
              </div>
              <p className="text-[15px] font-medium">
                Fone Sony WH-1000XM5 ·{" "}
                <Money value={1299} hidden={hideValues} />
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-ds-warn-soft px-3 py-1 text-[13px] font-medium text-ds-warn">
                  Melhor esperar
                </span>
                <span className="text-sm text-ds-muted">
                  O limite de Compras já passou
                </span>
              </div>
            </DsCard>
          </div>
        </div>
      </main>
    </div>
  )
}

export function HomeScreen({
  variant,
  hideValues = false,
}: {
  variant: "mobile" | "desktop"
  hideValues?: boolean
}) {
  return variant === "mobile" ? (
    <MobileHome hideValues={hideValues} />
  ) : (
    <DesktopHome hideValues={hideValues} />
  )
}
