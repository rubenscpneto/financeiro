import { eq } from "drizzle-orm"
import { db } from "@/db"
import { userSettings } from "@/db/schema"
import type { UserCrypto } from "@/lib/crypto/codec"

export type UserSettings = {
  hideValuesDefault: boolean
  theme: "light" | "dark" | "system"
  textSize: "normal" | "grande"
  budgetMode: "teto" | "envelope"
  alerts: {
    faturaDue: boolean
    unusualSpend: boolean
    doubleCharge: boolean
  }
  dismissedWarningKeys: string[]
}

export const DEFAULT_SETTINGS: UserSettings = {
  hideValuesDefault: true,
  theme: "system",
  textSize: "normal",
  budgetMode: "teto",
  alerts: {
    faturaDue: true,
    unusualSpend: true,
    doubleCharge: true,
  },
  dismissedWarningKeys: [],
}

export function parseSettings(raw: string | null | undefined): UserSettings {
  if (!raw) return { ...DEFAULT_SETTINGS, alerts: { ...DEFAULT_SETTINGS.alerts } }
  try {
    const parsed = JSON.parse(raw) as Partial<UserSettings>
    return {
      hideValuesDefault: parsed.hideValuesDefault ?? true,
      theme: parsed.theme === "light" || parsed.theme === "dark" ? parsed.theme : "system",
      textSize: parsed.textSize === "grande" ? "grande" : "normal",
      budgetMode: parsed.budgetMode === "envelope" ? "envelope" : "teto",
      alerts: {
        faturaDue: parsed.alerts?.faturaDue ?? true,
        unusualSpend: parsed.alerts?.unusualSpend ?? true,
        doubleCharge: parsed.alerts?.doubleCharge ?? true,
      },
      dismissedWarningKeys: Array.isArray(parsed.dismissedWarningKeys)
        ? parsed.dismissedWarningKeys.map(String)
        : [],
    }
  } catch {
    return { ...DEFAULT_SETTINGS, alerts: { ...DEFAULT_SETTINGS.alerts } }
  }
}

export async function loadUserSettings(
  crypto: UserCrypto
): Promise<UserSettings> {
  try {
    const [row] = await db
      .select()
      .from(userSettings)
      .where(eq(userSettings.user_id, crypto.userId))
      .limit(1)
    const plain = row ? crypto.decryptFlex("payload", row.payload) : null
    return parseSettings(plain)
  } catch {
    return parseSettings(null)
  }
}

export async function saveUserSettings(
  crypto: UserCrypto,
  next: UserSettings
): Promise<void> {
  const payload = crypto.encrypt("payload", JSON.stringify(next))
  await db
    .insert(userSettings)
    .values({
      user_id: crypto.userId,
      payload,
      updated_at: new Date(),
    })
    .onConflictDoUpdate({
      target: userSettings.user_id,
      set: { payload, updated_at: new Date() },
    })
}
