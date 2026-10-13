# Production image for self-hosting (Docker / Coolify).
# Vercel deploys are unaffected: Vercel ignores this file and `output: "standalone"`.
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
RUN apk add --no-cache libc6-compat su-exec
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
ENV STORAGE_DIR=/data/statements
RUN mkdir -p /data/statements && chown node:node /data/statements
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/drizzle ./drizzle
COPY --from=build --chown=node:node /app/scripts/migrate.mjs ./scripts/migrate.mjs
COPY --from=deps --chown=node:node /app/node_modules/drizzle-orm ./node_modules/drizzle-orm
COPY --from=deps --chown=node:node /app/node_modules/postgres ./node_modules/postgres
# pdfjs-dist createRequire("@napi-rs/canvas") is invisible to NFT; copy natives into standalone.
COPY --from=deps --chown=node:node /app/node_modules/@napi-rs ./node_modules/@napi-rs
COPY --from=deps --chown=node:node /app/node_modules/pdf-parse ./node_modules/pdf-parse
COPY --from=deps --chown=node:node /app/node_modules/pdfjs-dist ./node_modules/pdfjs-dist
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
