function firstPresent(...values: Array<string | undefined | null>) {
  for (const value of values) {
    const trimmed = value?.trim()
    if (trimmed) return trimmed
  }
  return ""
}

export function shortCommitSha(raw?: string | null): string {
  const sha = (raw ?? "").trim()
  if (!sha) return "dev"
  return sha.slice(0, 7)
}

export function appEnvLabel(raw?: string | null): string {
  const v = (raw ?? "").trim().toLowerCase()
  if (v === "production" || v === "prod" || v === "produção" || v === "producao") {
    return "produção"
  }
  if (v === "development" || v === "dev" || v === "local") return "local"
  if (
    v === "staging" ||
    v === "preview" ||
    v === "homologacao" ||
    v === "homologação" ||
    v === "homolog"
  ) {
    return "homologação"
  }
  if (v) return v
  return "homologação"
}

export function resolveCommitSha(env: NodeJS.ProcessEnv = process.env): string {
  return shortCommitSha(
    firstPresent(
      env.SOURCE_COMMIT,
      env.NEXT_PUBLIC_COMMIT_SHA,
      env.VERCEL_GIT_COMMIT_SHA,
      env.GIT_COMMIT
    )
  )
}

export function resolveAppEnvLabel(env: NodeJS.ProcessEnv = process.env): string {
  return appEnvLabel(
    firstPresent(
      env.NEXT_PUBLIC_APP_ENV,
      env.APP_ENV,
      env.VERCEL_ENV,
      env.NODE_ENV === "development" ? "local" : ""
    )
  )
}

export function appVersionLine(opts: {
  sha?: string | null
  env?: string | null
}): string {
  return `Versão ${shortCommitSha(opts.sha)} · ${appEnvLabel(opts.env)}`
}

export function resolveAppVersionLine(
  env: NodeJS.ProcessEnv = process.env
): string {
  return `Versão ${resolveCommitSha(env)} · ${resolveAppEnvLabel(env)}`
}
