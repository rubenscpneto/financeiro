import { betterAuth } from "better-auth"
import { drizzleAdapter } from "@better-auth/drizzle-adapter"
import { nextCookies } from "better-auth/next-js"
import { hashPassword, verifyPassword } from "better-auth/crypto"
import { compare as bcryptCompare } from "bcryptjs"
import { db } from "@/db"
import { account, session, user, verification } from "@/db/schema"
import { getSiteUrl } from "@/lib/site-url"

const siteUrl = getSiteUrl()

export const auth = betterAuth({
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "dev-only-placeholder-secret-min-32-chars",
  baseURL: process.env.BETTER_AUTH_URL ?? siteUrl,
  trustedOrigins: [siteUrl],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: { user, session, account, verification },
  }),
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 6,
    password: {
      hash: hashPassword,
      verify: async ({ hash, password }) => {
        if (hash.startsWith("$2")) {
          return bcryptCompare(password, hash)
        }
        return verifyPassword({ hash, password })
      },
    },
    ...(process.env.RESEND_API_KEY
      ? {
          sendResetPassword: async ({
            user: resetUser,
            url,
          }: {
            user: { email: string }
            url: string
          }) => {
            const from =
              process.env.EMAIL_FROM ?? "Financeiro <noreply@localhost>"
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from,
                to: resetUser.email,
                subject: "Redefinir senha",
                html: `<p>Clique para redefinir sua senha:</p><p><a href="${url}">${url}</a></p>`,
              }),
            })
            if (!res.ok) {
              const body = await res.text()
              throw new Error(`Failed to send reset email: ${body}`)
            }
          },
        }
      : {}),
  },
  plugins: [nextCookies()],
})

export function isPasswordResetEmailEnabled() {
  return Boolean(process.env.RESEND_API_KEY)
}
