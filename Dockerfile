FROM node:22-alpine AS base

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

# NEXT_PUBLIC_* entram no JS do browser no `next build`.
# Sem build-arg real o cadastro/login aponta para um Supabase falso.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_SITE_URL

ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || echo "$NEXT_PUBLIC_SUPABASE_URL" | grep -q placeholder; then \
      echo "ERRO: passe NEXT_PUBLIC_SUPABASE_URL real como Build Variable no Coolify e faça rebuild." >&2; \
      exit 1; \
    fi \
 && if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ] || [ "$NEXT_PUBLIC_SUPABASE_ANON_KEY" = "placeholder" ]; then \
      echo "ERRO: passe NEXT_PUBLIC_SUPABASE_ANON_KEY real como Build Variable no Coolify e faça rebuild." >&2; \
      exit 1; \
    fi

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
