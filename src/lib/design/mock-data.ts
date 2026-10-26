export const USER = {
  name: "Rubens",
  fullName: "Rubens Pereira",
  email: "rubens@exemplo.com.br",
  initials: "RP",
  dateLabel: "terça, 13 de outubro",
}

export const SYNC = {
  chip: "Atualizado há 6 h",
  sidebarTitle: "C6 Bank conectado",
  sidebarBody:
    "Atualizado há 6 horas (às 07:02). Próxima atualização perto das 13h.",
  footer: "Banco atualizado há 6 horas · Meu Pluggy",
}

export const TOTALS = {
  netWorth: 184320.55,
  netWorthDelta: 2140.18,
  checking: 8412.3,
  invested: 179195.65,
  cardBill: 3287.4,
  cardDue: "Vence em 25 de outubro",
  cardDueMobile: "Vence em 25 de outubro (daqui a 12 dias)",
  cardLimitUsed: 0.22,
  monthSpent: 6842.1,
  monthBudget: 9000,
  monthSpentRatio: 0.76,
  monthElapsedRatio: 0.42,
  monthIncome: 12650,
  monthOut: 6842,
  overPace: 3068,
}

export const SPEND_SERIES = [
  120, 310, 560, 980, 1210, 1450, 1890, 2240, 2510, 2930, 3105, 6380, 6842,
]

export const TXNS = [
  {
    icon: "cart" as const,
    name: "Pão de Açúcar",
    meta: "Mercado · cartão",
    amount: -287.43,
    date: "Hoje",
  },
  {
    icon: "car" as const,
    name: "Uber",
    meta: "Transporte · cartão",
    amount: -23.9,
    date: "Hoje",
  },
  {
    icon: "cart" as const,
    name: "Mercado Livre",
    meta: "Compras · ontem",
    amount: -3000,
    date: "Ontem",
    flag: "Atenção",
  },
  {
    icon: "income" as const,
    name: "Pix de Ana S.",
    meta: "Dinheiro recebido",
    amount: 250,
    date: "12 out",
  },
  {
    icon: "repeat" as const,
    name: "Spotify",
    meta: "Assinaturas · cartão",
    amount: -34.9,
    date: "11 out",
  },
]

export const BUDGETS = [
  {
    name: "Compras",
    spent: 3412,
    limit: 1500,
    pct: 2.27,
    label: "Passou do limite",
    tone: "danger" as const,
  },
  {
    name: "Restaurantes",
    spent: 1104,
    limit: 1200,
    pct: 0.92,
    label: "Quase no limite",
    tone: "warn" as const,
  },
  {
    name: "Mercado",
    spent: 1420,
    limit: 2000,
    pct: 0.71,
    label: "Tudo certo",
    tone: "ok" as const,
  },
  {
    name: "Transporte",
    spent: 386,
    limit: 600,
    pct: 0.64,
    label: "Tudo certo",
    tone: "ok" as const,
  },
]

export const ALERTS = [
  {
    icon: "alert" as const,
    tone: "danger" as const,
    title: "Compra bem acima do normal",
    desc: "R$ 3.000,00 no Mercado Livre. Suas compras costumam ficar perto de R$ 710.",
    cta: "Vale a pena?",
  },
  {
    icon: "target" as const,
    tone: "warn" as const,
    title: "Restaurantes: quase no limite",
    desc: "Já foram R$ 1.104,60 de R$ 1.200,00, e faltam 18 dias para o mês acabar.",
    cta: "Ver limites",
  },
  {
    icon: "repeat" as const,
    tone: "info" as const,
    title: "Cobrança em dobro?",
    desc: "O Spotify cobrou R$ 34,90 duas vezes este mês.",
    cta: "Conferir",
  },
]

export const MOBILE_NAV = [
  { icon: "house" as const, label: "Início" },
  { icon: "arrows" as const, label: "Extrato" },
  { icon: "trending" as const, label: "Investir" },
  { icon: "target" as const, label: "Planejar" },
  { icon: "grid" as const, label: "Mais" },
]

export const DESKTOP_NAV = [
  { icon: "house" as const, label: "Início" },
  { icon: "arrows" as const, label: "Extrato" },
  { icon: "trending" as const, label: "Investimentos" },
  { icon: "target" as const, label: "Planejar gastos" },
]

export const DESKTOP_MORE = [
  { icon: "tag" as const, label: "Categorias" },
  { icon: "wallet" as const, label: "Contas e bancos" },
  { icon: "sliders" as const, label: "Configurações" },
]
