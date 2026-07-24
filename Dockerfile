# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

# ---- deps -------------------------------------------------------------
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Generates the Prisma client (src/generated/prisma) before the Next.js build,
# since app code imports it.
RUN npx prisma generate
RUN npm run build

# ---- runner (slim, what actually ships) ---------------------------------
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN apk add --no-cache libc6-compat

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Next.js standalone server output (output: 'standalone' in next.config.ts):
# a pruned node_modules + server.js containing only what the server needs.
# (The Postgres driver adapter's code is bundled directly into these compiled
# chunks by Next's output tracing — it does not need to exist as a separate
# node_modules entry for the server itself.)
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# The Prisma CLI (for `prisma migrate deploy` on boot, see entrypoint.sh) is a
# separate concern from the Next server above and needs its OWN full set of
# production dependencies — hand-picking individual node_modules folders is
# fragile (its transitive deps, e.g. `effect`, aren't obvious or stable across
# versions) and previously caused a `Cannot find module 'effect'` crash at
# boot. A real `npm ci --omit=dev` guarantees every transitive dependency
# resolves correctly, the same way it does in the builder stage.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
