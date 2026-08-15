FROM node:22-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1

# === deps: instala as dependências ===
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# === builder: compila o Next.js ===
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# === runner: imagem final enxuta ===
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# libc6-compat é necessário para os binários nativos (sharp, @resvg/resvg-js) no Alpine/musl
RUN apk add --no-cache libc6-compat

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

RUN mkdir .next && chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
# Fontes usadas pelo motor de render (satori) — lidas em runtime via fs
COPY --from=builder --chown=nextjs:nodejs /app/assets ./assets

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
