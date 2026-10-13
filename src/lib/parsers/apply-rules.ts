import type { ParsedTransaction } from './types'

export type CategoryRule = {
  id?: string
  match_pattern: string
  category_id: string
  priority: number
  account_type?: string | null
}

export type CategoryRow = {
  id: string
  name: string
  kind: string
}

function normalizeName(value: string) {
  return value
    .replace(/^\uFEFF/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function isUsableSourceCategory(value: string | null | undefined): value is string {
  if (!value) return false
  const trimmed = value.trim()
  if (!trimmed || trimmed === '-' || trimmed === '—') return false
  return true
}

/** Map description rules → category_id (fills gaps only if caller merges carefully). */
export function applyCategoryRules(
  txns: ParsedTransaction[],
  rules: CategoryRule[],
  accountType?: string,
): Map<string, string> {
  const orderedRules = [...rules].sort(
    (left, right) =>
      left.priority - right.priority ||
      (left.id ?? "").localeCompare(right.id ?? "")
  )
  const categories = new Map<string, string>()

  for (const transaction of txns) {
    const description = transaction.description.toLocaleLowerCase()
    const matchedRule = orderedRules.find((rule) => {
      const accountMatches = !rule.account_type || rule.account_type === accountType
      return accountMatches && description.includes(rule.match_pattern.toLocaleLowerCase())
    })

    if (matchedRule) categories.set(transaction.externalHash, matchedRule.category_id)
  }

  return categories
}

/**
 * Resolve category_id from sourceCategory (CSV / Pluggy).
 * Finds existing category by name (case/accent insensitive) or creates it.
 * Kind: transfer | income (amount > 0) | expense.
 */
export async function resolveCategoriesFromSource(
  txns: ParsedTransaction[],
  existing: CategoryRow[],
  createCategory: (
    name: string,
    kind: 'income' | 'expense' | 'transfer',
  ) => Promise<string | null>,
): Promise<Map<string, string>> {
  const byName = new Map<string, string>()
  for (const category of existing) {
    byName.set(normalizeName(category.name), category.id)
  }

  const result = new Map<string, string>()
  const pendingCreates = new Map<string, Promise<string | null>>()

  async function ensureCategory(
    name: string,
    kind: 'income' | 'expense' | 'transfer',
  ) {
    const key = normalizeName(name)
    const found = byName.get(key)
    if (found) return found

    let pending = pendingCreates.get(key)
    if (!pending) {
      pending = createCategory(name.trim(), kind).then((id) => {
        if (id) byName.set(key, id)
        return id
      })
      pendingCreates.set(key, pending)
    }
    return pending
  }

  for (const transaction of txns) {
    if (!isUsableSourceCategory(transaction.sourceCategory)) continue
    const kind = transaction.isTransfer
      ? 'transfer'
      : transaction.amount > 0
        ? 'income'
        : 'expense'
    const categoryId = await ensureCategory(transaction.sourceCategory, kind)
    if (categoryId) result.set(transaction.externalHash, categoryId)
  }

  return result
}
