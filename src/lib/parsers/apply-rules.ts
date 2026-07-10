import type { ParsedTransaction } from './types'

export type CategoryRule = {
  match_pattern: string
  category_id: string
  priority: number
  account_type?: string | null
}

export function applyCategoryRules(
  txns: ParsedTransaction[],
  rules: CategoryRule[],
  accountType?: string,
): Map<string, string> {
  const orderedRules = [...rules].sort((left, right) => left.priority - right.priority)
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
