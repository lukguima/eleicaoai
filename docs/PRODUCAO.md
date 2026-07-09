# EleiçãoAI — Checklist de Produção (Fase 5)

Passos operacionais para colocar no ar. Os itens marcados **[você]** exigem suas
credenciais (Supabase, Mercado Pago, Vercel, chaves de IA) e não podem ser feitos pelo agente.

---

## 1. Banco de dados (Supabase) [você]

Rode os SQLs no **SQL Editor**, nesta ordem (só uma vez cada):

1. `supabase/schema.sql` — tabelas base (candidates, assets, compliance_logs). *(já existente)*
2. `supabase/admin_schema.sql` — `products` + `site_content` + seed dos avulsos.
3. `supabase/migrations/20240101_payments.sql` — *(legado; pode pular em instalação nova)*
4. `supabase/migrations/20240102_storage.sql` — bucket `generated`.
5. **`supabase/migrations/20260708_orders_entitlements.sql`** — orders/order_items/entitlements,
   funções `claim_entitlement`/`consume_music_regen`, coluna `assets.design`,
   `candidates.base_photo_cutout_url`, seed do **Pacote Campanha Completa**.

Confira depois:
- `select type, price, active from products;` → deve listar `pacote` + 5 avulsos.
- `assets` tem coluna `design`; `candidates` tem `base_photo_cutout_url`.

## 2. Storage (bucket `generated`) [você]

- O bucket é criado pela migração de storage. Hoje é **público** (simples para lançar).
- Endurecimento recomendado (pós-lançamento): tornar o bucket **privado** e confiar nas
  *signed URLs* — o código já gera `media_url` assinada para player/preview/kit. Antes de
  virar privado, troque no dashboard/onboarding as `<img src=base_photo_url>` por signed URLs
  (hoje usam a URL pública direta). Ver §6.

## 3. Variáveis de ambiente [você]

Na Vercel (Project → Settings → Environment Variables) e no `.env.local` para dev:

| Variável | Onde obter | Obrigatória |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → API | sim |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API (privada) | sim |
| `NEXT_PUBLIC_APP_URL` | URL pública do site (callbacks Suno) | sim |
| `CPF_ENCRYPTION_KEY` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | sim |
| `OPENAI_API_KEY` | platform.openai.com | sim (letra do jingle) |
| `SUNO_API_KEY` | sunoapi.org | sim (música) |
| `SUNO_WEBHOOK_SECRET` | você define (string aleatória) | sim |
| `FAL_KEY` | fal.ai | sim (remover fundo da foto / fundo IA) |
| `MERCADOPAGO_ACCESS_TOKEN` | MP → Credenciais (produção `APP_USR-`) | sim p/ cobrar |
| `MERCADOPAGO_WEBHOOK_SECRET` | MP → Webhooks (chave secreta) | sim p/ cobrar |
| `CRON_SECRET` | você define (string aleatória) | sim (reconciliação) |
| `STAGE_BYPASS_PAYMENT` | **NÃO definir em produção** (só staging/dev = `true`) | não |

## 4. Mercado Pago [você]

- Configure o **Webhook** apontando para `https://SEU_DOMINIO/api/webhooks/mercadopago`,
  evento **Pagamentos**. Copie a chave secreta para `MERCADOPAGO_WEBHOOK_SECRET`.
- O ambiente (sandbox vs produção) é detectado pelo prefixo do token (`TEST-` = sandbox).

## 5. Deploy (Vercel) [você]

- Import do repositório; **Root Directory = `eleicaoai`** (o app fica nessa subpasta).
- Framework: Next.js. O `vercel.json` já agenda o cron `/api/cron/reconcile` (15 min) —
  a Vercel injeta `CRON_SECRET` no header automaticamente.
- `next build` já validado localmente (verde).

## 6. Teste ponta-a-ponta (sandbox) [você]

Com `MERCADOPAGO_ACCESS_TOKEN` de teste (`TEST-`):
1. Conta nova → `/onboarding` (dados + foto) → `/planos` → **Contratar pacote**.
2. Pague com cartão de teste do MP → volta em `/payment/success` → `/dashboard` com kit liberado.
3. Crie cada peça: `/criar/santinho|banner|perfurado|social` (editor) e `/criar/jingle`
   (estilo → letra editável → música).
4. `/dashboard` → **Baixar kit** (.zip com PNGs, PDFs e MP3).

> Em dev sem webhook público, use `STAGE_BYPASS_PAYMENT=true` para liberar o pacote na hora
> e o fallback de polling do jingle finaliza a música sem depender do callback.

## 7. Smoke de conformidade (TSE 23.732/2024)

- [ ] Toda peça visual traz o rodapé “Conteúdo fabricado com IA · CNPJ …” (não removível).
- [ ] O áudio do jingle abre com o aviso falado de IA.
- [ ] `compliance_logs` registra cada geração (IMAGE_GENERATION / JINGLE_GENERATION).

## 8. Limpeza opcional (pós-lançamento)

Vestígios do modelo antigo, sem uso no fluxo novo (deixados para não quebrar o admin):
- Tabelas `subscriptions` e `payments`, função `decrement_credit`.
- `lib/pricing.ts`: `SERVICES`/`getService` (dead code; `formatPrice` continua em uso).
- Página `app/dashboard/visual-identity` e componentes `AssetCard`/`ServiceCard`/`CandidateForm`.
- Antes de dropar `subscriptions`, atualize `app/api/v1/admin/orders` para ler `orders`.
