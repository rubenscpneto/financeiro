import { cookies } from "next/headers"
import { BANK_FILTER_COOKIE, bankFromParams } from "@/lib/banks"

export async function requestBankKey(
  param: string | undefined
): Promise<string | undefined> {
  const cookieStore = await cookies()
  return (
    bankFromParams(param, cookieStore.get(BANK_FILTER_COOKIE)?.value) ?? undefined
  )
}
