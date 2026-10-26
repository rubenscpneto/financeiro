export function budgetStatus(spent: number, limit: number) {
  const pct = limit > 0 ? spent / limit : 0
  if (limit <= 0) {
    return { pct: 0, tone: "ok" as const, label: "Sem teto" }
  }
  if (pct >= 1) {
    return { pct, tone: "danger" as const, label: "Passou do limite" }
  }
  if (pct >= 0.85) {
    return { pct, tone: "warn" as const, label: "Quase no limite" }
  }
  return { pct, tone: "ok" as const, label: "Tudo certo" }
}
