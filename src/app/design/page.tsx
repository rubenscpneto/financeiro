import { HomeScreen } from "@/components/design/home-screen"
import { SettingsScreen } from "@/components/design/settings-screen"
import { DesignFrame } from "@/components/design/chrome"
import { hideValuesFromSearchParam } from "@/lib/design/hide-values"

type Theme = "claro" | "escuro"
type View = "inicio" | "configuracoes"

const THEMES: Theme[] = ["escuro", "claro"]
const SCREENS: { view: View; label: string }[] = [
  { view: "inicio", label: "Início" },
  { view: "configuracoes", label: "Configurações" },
]
const SIZES = [
  { variant: "mobile" as const, width: 390, label: "Mobile 390" },
  { variant: "desktop" as const, width: 1440, label: "Desktop 1440" },
]

function Screen({
  view,
  theme,
  variant,
  hideValues,
}: {
  view: View
  theme: Theme
  variant: "mobile" | "desktop"
  hideValues: boolean
}) {
  if (view === "inicio") {
    return <HomeScreen variant={variant} hideValues={hideValues} />
  }
  return (
    <SettingsScreen
      variant={variant}
      theme={theme}
      hideValuesDefault
      budgetMode="teto"
    />
  )
}

export default async function DesignPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string
    theme?: string
    size?: string
    hidden?: string
  }>
}) {
  const params = await searchParams
  const view =
    params.view === "configuracoes"
      ? "configuracoes"
      : params.view === "inicio"
        ? "inicio"
        : null
  const theme: Theme = params.theme === "claro" ? "claro" : "escuro"
  const variant = params.size === "1440" ? "desktop" : "mobile"
  const hideValues = hideValuesFromSearchParam(params.hidden)

  if (view) {
    return (
      <DesignFrame theme={theme} className="min-h-screen">
        <Screen
          view={view}
          theme={theme}
          variant={variant}
          hideValues={hideValues}
        />
      </DesignFrame>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-200 px-6 py-8 text-zinc-900">
      <h1 className="text-2xl font-semibold tracking-tight">Design</h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-600">
        Galeria interna. Início e Configurações, claro e escuro, 390 e 1440.
        Não aparece no menu.
      </p>
      <div className="mt-8 flex flex-col gap-16">
        {SCREENS.flatMap((screen) =>
          THEMES.flatMap((t) =>
            SIZES.map((size) => (
              <section
                key={`${screen.view}-${t}-${size.width}`}
                className="flex flex-col gap-3"
              >
                <h2 className="text-lg font-semibold">
                  {screen.label} · {t} · {size.label}
                </h2>
                <div
                  className="overflow-hidden rounded-md shadow-sm ring-1 ring-black/10"
                  style={{ width: size.width }}
                >
                  <DesignFrame theme={t}>
                    <Screen
                      view={screen.view}
                      theme={t}
                      variant={size.variant}
                      hideValues={hideValues}
                    />
                  </DesignFrame>
                </div>
              </section>
            ))
          )
        )}
      </div>
    </div>
  )
}
