import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  appEnvLabel,
  appVersionLine,
  resolveAppEnvLabel,
  resolveAppVersionLine,
  resolveCommitSha,
  shortCommitSha,
} from "../app-version.ts"

describe("shortCommitSha", () => {
  it("uses the first 7 characters", () => {
    assert.equal(shortCommitSha("65d39c30ae85327ce63b940b1a6b78b509e4d06d"), "65d39c3")
  })

  it("falls back to dev when missing", () => {
    assert.equal(shortCommitSha(undefined), "dev")
    assert.equal(shortCommitSha(""), "dev")
  })
})

describe("appEnvLabel", () => {
  it("maps production aliases to produção", () => {
    assert.equal(appEnvLabel("production"), "produção")
    assert.equal(appEnvLabel("prod"), "produção")
    assert.equal(appEnvLabel("produção"), "produção")
  })

  it("maps staging/preview to homologação", () => {
    assert.equal(appEnvLabel("staging"), "homologação")
    assert.equal(appEnvLabel("preview"), "homologação")
    assert.equal(appEnvLabel("homologacao"), "homologação")
    assert.equal(appEnvLabel("homologação"), "homologação")
  })

  it("maps development to local", () => {
    assert.equal(appEnvLabel("development"), "local")
    assert.equal(appEnvLabel("dev"), "local")
    assert.equal(appEnvLabel("local"), "local")
  })
})

describe("appVersionLine", () => {
  it("formats the Configurações footer copy", () => {
    assert.equal(
      appVersionLine({
        sha: "65d39c30ae85327ce63b940b1a6b78b509e4d06d",
        env: "staging",
      }),
      "Versão 65d39c3 · homologação"
    )
    assert.equal(
      appVersionLine({ sha: "abc1234deadbeef", env: "production" }),
      "Versão abc1234 · produção"
    )
  })
})

describe("resolveAppVersionLine", () => {
  it("reads Coolify SOURCE_COMMIT and APP_ENV", () => {
    assert.equal(
      resolveAppVersionLine({
        SOURCE_COMMIT: "65d39c30ae85327ce63b940b1a6b78b509e4d06d",
        APP_ENV: "staging",
      }),
      "Versão 65d39c3 · homologação"
    )
  })

  it("uses produção when APP_ENV is production", () => {
    assert.equal(
      resolveAppVersionLine({
        SOURCE_COMMIT: "deadbee",
        APP_ENV: "production",
      }),
      "Versão deadbee · produção"
    )
  })

  it("defaults the label to homologação when NODE_ENV is production and APP_ENV is unset", () => {
    assert.equal(resolveAppEnvLabel({ NODE_ENV: "production" }), "homologação")
    assert.equal(
      resolveAppVersionLine({
        SOURCE_COMMIT: "abc1234",
        NODE_ENV: "production",
      }),
      "Versão abc1234 · homologação"
    )
  })

  it("prefers SOURCE_COMMIT over other sha keys", () => {
    assert.equal(
      resolveCommitSha({
        SOURCE_COMMIT: "1111111aaaaaaaa",
        NEXT_PUBLIC_COMMIT_SHA: "2222222bbbbbbbb",
        VERCEL_GIT_COMMIT_SHA: "3333333cccccccc",
      }),
      "1111111"
    )
  })
})
