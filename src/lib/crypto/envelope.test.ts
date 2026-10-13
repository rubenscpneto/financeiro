import assert from "node:assert/strict"
import { mkdtemp, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { createHmac, randomBytes } from "node:crypto"
import { FileKekProvider } from "./file-kek-provider"
import { blindIndex, deriveBlindIndexKey } from "./blind-index"
import {
  decryptAesGcm,
  encryptAesGcm,
  isEnvelope,
} from "./envelope"

const USER = "11111111-1111-1111-1111-111111111111"
const OTHER = "22222222-2222-2222-2222-222222222222"
const DEK = randomBytes(32)

test("encryptAesGcm roundtrips UTF-8 plaintext", () => {
  const envelope = encryptAesGcm({
    key: DEK,
    plaintext: Buffer.from("R$ 12,34 ifood", "utf8"),
    aad: Buffer.from(`${USER}:description`, "utf8"),
    keyId: "1",
  })
  assert.equal(isEnvelope(envelope), true)
  assert.match(envelope, /^v1:1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/)
  const plain = decryptAesGcm({
    key: DEK,
    envelope,
    aad: Buffer.from(`${USER}:description`, "utf8"),
  })
  assert.equal(plain.toString("utf8"), "R$ 12,34 ifood")
})

test("decryptAesGcm fails when AAD column name does not match", () => {
  const envelope = encryptAesGcm({
    key: DEK,
    plaintext: Buffer.from("42.50", "utf8"),
    aad: Buffer.from(`${USER}:amount`, "utf8"),
    keyId: "1",
  })
  assert.throws(
    () =>
      decryptAesGcm({
        key: DEK,
        envelope,
        aad: Buffer.from(`${USER}:notes`, "utf8"),
      }),
    /Unsupported state or unable to authenticate data|unable to authenticate/i
  )
})

test("decryptAesGcm fails when AAD user_id does not match", () => {
  const envelope = encryptAesGcm({
    key: DEK,
    plaintext: Buffer.from("secret", "utf8"),
    aad: Buffer.from(`${USER}:notes`, "utf8"),
    keyId: "1",
  })
  assert.throws(() =>
    decryptAesGcm({
      key: DEK,
      envelope,
      aad: Buffer.from(`${OTHER}:notes`, "utf8"),
    })
  )
})

test("blind index is deterministic for the same DEK and plaintext", () => {
  const key = deriveBlindIndexKey(DEK)
  const a = blindIndex(key, "pluggy-txn-abc")
  const b = blindIndex(key, "pluggy-txn-abc")
  const expected = createHmac("sha256", key)
    .update("pluggy-txn-abc", "utf8")
    .digest("hex")
  assert.equal(a, b)
  assert.equal(a, expected)
  assert.equal(a.length, 64)
})

test("blind index differs across DEKs and across plaintexts", () => {
  const keyA = deriveBlindIndexKey(DEK)
  const keyB = deriveBlindIndexKey(randomBytes(32))
  assert.notEqual(blindIndex(keyA, "same"), blindIndex(keyB, "same"))
  assert.notEqual(blindIndex(keyA, "one"), blindIndex(keyA, "two"))
})

test("FileKekProvider wraps and unwraps a DEK", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "kek-"))
  const kekPath = path.join(dir, "financeiro_kek")
  await writeFile(kekPath, randomBytes(32))
  const provider = new FileKekProvider(kekPath)
  const wrapped = await provider.wrapDek(DEK, USER)
  assert.equal(wrapped.kekVersion, provider.currentVersion())
  assert.equal(isEnvelope(wrapped.wrapped), true)
  const unwrapped = await provider.unwrapDek(
    wrapped.wrapped,
    wrapped.kekVersion,
    USER
  )
  assert.deepEqual(unwrapped, DEK)
})
