export function isDesignGalleryPublic(env: {
  NODE_ENV?: string
  CI?: string
  ALLOW_DESIGN_GALLERY?: string
}): boolean {
  if (env.NODE_ENV !== "production") return true
  return env.CI === "true" || env.ALLOW_DESIGN_GALLERY === "true"
}
