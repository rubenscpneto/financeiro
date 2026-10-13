import { SPEND_SERIES } from "@/lib/design/mock-data"

const W = 640
const H = 220
const BUDGET = 9000

function x(day: number) {
  return ((day - 1) / 30) * W
}
function y(v: number) {
  return H - (v / BUDGET) * (H - 10)
}

export function SpendChart() {
  const pts = SPEND_SERIES.map((v, i) => `${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(" ")
  const area = `M0,${H} L${SPEND_SERIES.map((v, i) => `${x(i + 1).toFixed(1)},${y(v).toFixed(1)}`).join(" L")} L${x(13).toFixed(1)},${H} Z`
  const grid = [0, 3000, 6000, 9000]

  return (
    <div className="flex gap-3">
      <div className="flex h-[220px] w-10 flex-col justify-between text-right text-[13px] text-ds-subtle">
        <span>9 mil</span>
        <span>6 mil</span>
        <span>3 mil</span>
        <span>0</span>
      </div>
      <div className="min-w-0 flex-1">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-[220px] w-full"
          role="img"
          aria-label="Gastos de outubro"
        >
          {grid.map((v) => (
            <line
              key={v}
              x1="0"
              x2={W}
              y1={y(v)}
              y2={y(v)}
              stroke="var(--ds-track)"
              strokeWidth="1"
            />
          ))}
          <path d={area} fill="var(--ds-accent)" fillOpacity="0.14" />
          <line
            x1="0"
            y1={H}
            x2={W}
            y2={y(BUDGET)}
            stroke="var(--ds-subtle)"
            strokeWidth="2"
            strokeDasharray="6 6"
          />
          <polyline
            points={pts}
            fill="none"
            stroke="var(--ds-accent)"
            strokeWidth="3"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <line
            x1={x(12)}
            x2={x(12)}
            y1={y(6380)}
            y2={y(3105)}
            stroke="var(--ds-danger)"
            strokeWidth="3"
          />
          <circle
            cx={x(13)}
            cy={y(6842)}
            r="6"
            fill="var(--ds-accent)"
            stroke="var(--ds-surface)"
            strokeWidth="2"
          />
          <circle cx={x(12)} cy={y(6380)} r="5" fill="var(--ds-danger)" />
        </svg>
        <div className="mt-2 flex justify-between text-[13px] text-ds-subtle">
          <span>1 out</span>
          <span>8 out</span>
          <span>15 out</span>
          <span>22 out</span>
          <span>31 out</span>
        </div>
      </div>
    </div>
  )
}
