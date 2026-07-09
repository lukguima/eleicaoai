# EleiçãoAI — Aderência aos Padrões de Engenharia

Status da aplicação dos padrões globais (`~/.claude/skills/padroes-engenharia`) neste projeto.

## ✅ Aplicado

- **Log estruturado (RNF02)** — `lib/log.ts` (`log.info/warn/error` + `captureError`) em JSON com
  `timestamp, level, service, tenant_id (=candidate_id), user_id, request_id, message`.
- **X-Request-ID (RNF02)** — gerado/propagado no `proxy.ts` (páginas) e via `requestIdFrom(req)`
  nas rotas de API; devolvido no header da resposta.
- **console.* convertido nos caminhos críticos** — webhooks (Mercado Pago e Suno), `orders`,
  `jingle/music`, `designs/[id]/render`, `cron/reconcile` e libs compartilhadas
  (`entitlements`, `storage`, `mercadopago`).
- **Erros genéricos ao usuário (RF04 / erro)** — rotas críticas pararam de vazar `err.message`
  na payload; retornam mensagem limpa e registram o detalhe no log.
- **Anti-enumeração (RF04)** — login usa Supabase Auth com mensagem genérica.
- **ORM/sem SQLi (RNF01)** — acesso via Supabase query builder (parametrizado); sem SQL concatenado.
- **Webhook assinado + idempotente** — Mercado Pago valida `x-signature`; Suno valida segredo.

## ⚠️ Pendente — código (retrofit, baixo risco)

`console.*` já convertido em **todas as rotas de escrita/externas** (candidates, photo,
designs POST, jingle/lyrics, designs/background) além dos caminhos críticos.
Restam apenas **rotas de leitura** (`campaign`, `orders/[id]`, `products`, `assets/*`) e o
**painel admin** (`admin/*`) — baixo risco, converter conforme forem tocados.
> Features novas já nascem com log estruturado (a skill `padroes-engenharia` exige).

Extras já aplicados: **`/api/health`** (health check p/ Coolify e K6) e **reaproveitamento
de rascunho pendente** em `POST /designs` (evita acúmulo de assets a cada abertura do editor).

**DTO / data minimization (RNF01):** trocar `select('*')` por seleção explícita nas rotas que
devolvem dados ao client (`designs`, `jingle/*` buscam candidato inteiro para uso interno — ok;
`admin/*` retornam linhas — revisar campos expostos).

## ⛔ Pendente — infraestrutura (não é código do app)

- **Rate limit distribuído (RF01):** hoje `lib/rate-limit.ts` é **em memória** — só vale para
  instância única. Em produção multi-instância exige **Redis**. Idem para a **blacklist de logout (RF02)**.
  Enquanto for 1 instância no Coolify, funciona; ao escalar, migrar para Redis.
- **JWT próprio / RTR / blacklist (RF02):** a auth é Supabase (rotação e cookies geridos por
  `@supabase/ssr`). Se algum dia usarmos tokens próprios, implementar RTR + blacklist explícitos.
- **Sentry (RNF01 / Done #4):** `captureError` já é o ponto de integração; falta instalar
  `@sentry/nextjs`, configurar `SENTRY_DSN` e ligar dentro de `captureError`.
- **SLI/SLO/Error Budget (RNF03):** definir SLO do checkout/geração e painel do SLI (ex.: Better Stack).
- **FinOps (RNF04):** alarmes de orçamento em OpenAI, fal.ai, Suno e no provedor, com alertas 50/75/90%.
- **CORS allowlist (RF03):** app é same-origin (API interna do Next); se abrir API a terceiros,
  aplicar allowlist via `.env`.
- **Testes (Playwright/K6):** criar E2E do fluxo pacote→criação→kit e teste de carga do checkout.
- **Runbooks + Postmortem (seção 5):** criar `docs/runbooks/` e vincular aos alertas.

## Como validar antes de subir
Rode a skill **`checklist-deploy`** contra o diff da feature. Qualquer "Não" bloqueia o deploy.
