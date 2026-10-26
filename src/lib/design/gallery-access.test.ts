import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { isDesignGalleryPublic } from "./gallery-access.ts"

describe("isDesignGalleryPublic", () => {
  it("is public outside production", () => {
    assert.equal(isDesignGalleryPublic({ NODE_ENV: "development" }), true)
    assert.equal(isDesignGalleryPublic({ NODE_ENV: "test" }), true)
  })

  it("is public in production when CI or ALLOW_DESIGN_GALLERY is set", () => {
    assert.equal(
      isDesignGalleryPublic({ NODE_ENV: "production", CI: "true" }),
      true
    )
    assert.equal(
      isDesignGalleryPublic({
        NODE_ENV: "production",
        ALLOW_DESIGN_GALLERY: "true",
      }),
      true
    )
  })

  it("is private in production without CI or allow flag", () => {
    assert.equal(isDesignGalleryPublic({ NODE_ENV: "production" }), false)
    assert.equal(
      isDesignGalleryPublic({ NODE_ENV: "production", CI: "false" }),
      false
    )
  })
})
