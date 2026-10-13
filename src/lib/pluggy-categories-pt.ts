/** Pluggy (and similar) English category names → pt-BR labels. */

const CATEGORY_PT: Record<string, string> = {
  "food": "Alimentação",
  "food and drink": "Alimentação",
  "food & drink": "Alimentação",
  "groceries": "Mercado",
  "supermarket": "Mercado",
  "restaurant": "Restaurante",
  "restaurants": "Restaurante",
  "eating out": "Restaurante",
  "transportation": "Transporte",
  "transport": "Transporte",
  "travel": "Viagem",
  "shopping": "Compras",
  "online shopping": "Compras",
  "entertainment": "Lazer",
  "recreation": "Lazer",
  "health": "Saúde",
  "healthcare": "Saúde",
  "pharmacy": "Farmácia",
  "education": "Educação",
  "housing": "Moradia",
  "accommodation": "Hospedagem",
  "lodging": "Hospedagem",
  "hotel": "Hospedagem",
  "hotels": "Hospedagem",
  "rent": "Aluguel",
  "utilities": "Contas da casa",
  "bills": "Contas",
  "services": "Serviços",
  "transfer": "Transferência",
  "transfers": "Transferência",
  "same person transfer": "Transferência própria",
  "same-person transfer": "Transferência própria",
  "internal transfer": "Transferência interna",
  "income": "Receita",
  "salary": "Salário",
  "investments": "Investimentos",
  "investment": "Investimentos",
  "loans": "Empréstimos",
  "loan": "Empréstimos",
  "taxes": "Impostos",
  "tax": "Impostos",
  "insurance": "Seguro",
  "donations": "Doações",
  "donation": "Doações",
  "fees": "Tarifas",
  "fee": "Tarifas",
  "atm": "Saque",
  "withdrawal": "Saque",
  "deposit": "Depósito",
  "credit card payment": "Fatura paga",
  "credit card": "Cartão de crédito",
  "other": "Outros",
  "others": "Outros",
  "uncategorized": "Sem categoria",
  "personal care": "Cuidados pessoais",
  "subscriptions": "Assinaturas",
  "subscription": "Assinaturas",
  "pets": "Pets",
  "kids": "Filhos",
  "gifts": "Presentes",
  "charity": "Doações",
  "fuel": "Combustível",
  "gas": "Combustível",
  "parking": "Estacionamento",
  "telecom": "Telefonia",
  "phone": "Telefonia",
  "internet": "Internet",
  "cash": "Dinheiro",
  "leisure": "Lazer",
  "wellbeing": "Bem-estar",
  "wellness": "Bem-estar",
  "electronics": "Eletrônicos",
  "clothing": "Vestuário",
  "clothes": "Vestuário",
  "apparel": "Vestuário",
  "beauty": "Beleza",
  "sports": "Esporte",
  "games": "Jogos",
  "streaming": "Streaming",
  "alcohol": "Bebidas",
  "finances": "Finanças",
  "business": "Negócios",
  "government": "Governo",
}

function normalizeKey(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[_/]+/g, " ")
    .replace(/\s+/g, " ")
}

/** Display label for a stored or Pluggy category name. */
export function categoryLabelPt(name: string | null | undefined): string {
  if (!name) return "Sem categoria"
  const key = normalizeKey(name)
  if (CATEGORY_PT[key]) return CATEGORY_PT[key]
  const hyphen = key.replace(/-/g, " ")
  if (CATEGORY_PT[hyphen]) return CATEGORY_PT[hyphen]
  return name
}

/** Name to persist when creating a category from a Pluggy source string. */
export function categoryNamePt(source: string): string {
  return categoryLabelPt(source)
}
