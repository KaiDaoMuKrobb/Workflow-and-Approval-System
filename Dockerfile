# ==============================================================================
# ExpenseFlow - Unified Production Dockerfile (Next.js 14 Standalone + Prisma)
# ==============================================================================
# Builds one container image used by:
#   1. Cloud Run Service / local Docker Compose `app` (`node server.js` on $PORT)
#   2. Cloud Run Job / Compose `migrate` (`npx prisma migrate deploy && npm run db:seed`)
#
# Non-root `USER node` runs the runtime container. Secrets are NEVER baked into
# the image; they are injected at runtime from env / GCP Secret Manager.
# ==============================================================================

FROM node:24-alpine AS deps
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV TZ=Asia/Bangkok
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/tsconfig.json ./tsconfig.json
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/prisma ./prisma

USER node

EXPOSE 3000

CMD ["node", "server.js"]

