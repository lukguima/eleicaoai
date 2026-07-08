# EleiçãoAI — Planejamento Detalhado de Execução
**Data:** 08/07/2026 · **Complementa:** [PLANO-REESTRUTURACAO.md](PLANO-REESTRUTURACAO.md) (diagnóstico)
**Meta:** candidato entra → contrata pacote → cria jingle (letra editável), santinho, banner, perfurado e post (editáveis) → baixa o kit completo, em conformidade com a Res. TSE 23.732/2024.

---

## 0. Decisões de produto (fixadas para este plano)

| # | Decisão | Escolha | Justificativa |
|---|---------|---------|---------------|
| D1 | Oferta principal | **Pacote Campanha Completa** (5 peças) + avulsos | É o objetivo declarado: "contrata um pacote e sai com o conjunto" |
| D2 | Preço (editável no admin via `products`) | Pacote R$ 499 · avulsos mantêm preços atuais (R$ 19–49) | Pacote < soma dos avulsos (R$ 155) não faz sentido; pacote precisa parecer "kit profissional". Ajustável depois |
| D3 | Modelo de cobrança | Pagamento único → **entitlements** (direitos de criação) | Elimina o beco sem saída dos créditos; pagamento libera, usuário cria quando quiser |
| D4 | Motor das artes | **Template HTML/SVG renderizado no servidor** (satori + resvg + sharp), não mais text-to-image | Texto 100% correto, foto real, totalmente editável, custo ~zero por render |
| D5 | IA nas artes | Só onde agrega: remoção de fundo da foto (fal.ai rembg) e fundo decorativo opcional (1 provedor) | DALL-E/Imagen/OpenRouter em cascata sai |
| D6 | Letra do jingle | Gerada por **LLM (OpenAI, gpt-4o-mini já configurado)** com resposta imediata, editável antes da música | Remove webhook/polling de letra; o limite de 200 chars do Suno /lyrics é ruim; LLM dá letra estruturada (verso/refrão) com nome, número e slogan corretos |
| D7 | Música | Suno V5 customMode com a letra aprovada; **1 música + 3 regravações** por entitlement | Regravação de letra é grátis (LLM), música é o custo real |
| D8 | Revisões visuais | Ilimitadas (render local é barato); fundo IA limitado a 10 gerações por peça | Protege o único custo variável |
| D9 | Geração pós-pagamento | Webhook **só marca pago e cria entitlements**; nunca gera conteúdo | Resolve a morte da função serverless; usuário cria pelo painel |
| D10 | Candidato por conta | 1 (já implementado) | Simplifica tenancy |

> Alterar D1/D2 muda apenas a Fase 4 (checkout) e o seed de `products`.

---

## 1. Arquitetura alvo

### 1.1 Fluxo do usuário
```
Landing (/) ─ CTA ─→ /login (Supabase Auth)
  └→ /onboarding ..... perfil do candidato (nome, número, partido, CNPJ, CPF,
  │                    slogan, bio, cores, foto → rembg automático)
  └→ /planos ......... Pacote Completo | avulsos → checkout Mercado Pago
  └→ /dashboard ...... "Minha Campanha": progresso do kit + entitlements
        ├→ /criar/jingle ........ estilo → letra (editar/regenerar) → música → player/download
        ├→ /criar/santinho ...... template → editor WYSIWYG → arquivo final (PNG 300dpi + PDF)
        ├→ /criar/banner ........ idem
        ├→ /criar/perfurado ..... idem
        ├→ /criar/social ........ idem (PNG 1080×1080)
        └→ Baixar kit completo (.zip)
```

### 1.2 Fluxo de pagamento
```
POST /api/v1/orders          → cria order + order_items (pending) → preference MP → redirect
POST /api/webhooks/mercadopago (valida x-signature HMAC)
  → consulta pagamento na API MP → order.status = 'paid'
  → INSERT entitlements (idempotente: unique order_id+product_type)
/payment/success             → polling GET /api/v1/orders/[id] até 'paid'
/api/cron/reconcile (1×/15min, CRON_SECRET)
  → orders pending > 10min: reconsulta MP
  → assets processing > 15min com external_task_id: consulta Suno 1× e finaliza/falha
```

### 1.3 Fluxo do jingle
```
POST /api/v1/jingle/lyrics { style }        ← consome nada; LLM síncrono (~5s)
  → retorna { lyrics } estruturada          ← usuário edita no textarea / regenera à vontade
POST /api/v1/jingle/music { asset_id, lyrics } ← consome entitlement (ou regravação)
  → Suno /generate customMode (callback) → asset 'processing'
POST /api/webhooks/suno?type=music          → persiste MP3 no Storage → 'done'
UI: polling do cliente já existente (orders/[id]) reaproveitado
```

### 1.4 Fluxo das artes visuais
```
GET  /criar/[tipo]           → editor client-side: componente <TemplateRenderer/> (React)
PUT  /api/v1/designs/[id]    → salva rascunho (JSON de design em assets.metadata.design)
POST /api/v1/designs/[id]/render
  → servidor renderiza o MESMO template (satori → SVG → resvg → PNG na resolução alvo)
  → aplica rodapé legal + rótulo IA (lib/watermark.ts, já pronto)
  → gera PDF com sangria 3mm (pdf-lib)
  → salva no Storage → asset 'done'
```
**Regra de ouro:** um único componente de template por peça, usado no preview do editor **e** no render do servidor (mesmos props). O que se vê é o que se baixa.

---

## 2. Modelo de dados — migração `20260708_orders_entitlements.sql`

```sql
-- Pedidos (substitui 'payments' como conceito central)
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  candidate_id     UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','paid','rejected','expired','refunded')),
  amount_cents     INT NOT NULL,
  mp_preference_id TEXT UNIQUE,
  mp_payment_id    TEXT UNIQUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE order_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,          -- 'pacote' | 'santinho' | ... | 'jingle'
  price_cents  INT NOT NULL
);

-- Direitos de criação liberados por pagamento
CREATE TABLE entitlements (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id       UUID NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  order_id           UUID NOT NULL REFERENCES orders(id),
  asset_type         TEXT NOT NULL CHECK (asset_type IN ('santinho','banner','perfurado','social','jingle')),
  status             TEXT NOT NULL DEFAULT 'available'
                       CHECK (status IN ('available','in_use','consumed')),
  music_regens_left  INT NOT NULL DEFAULT 3,   -- só relevante para jingle
  ai_bg_gens_left    INT NOT NULL DEFAULT 10,  -- só relevante para visuais
  asset_id           UUID REFERENCES assets(id),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (order_id, asset_type)                -- idempotência do webhook
);

-- Função atômica: reivindicar entitlement (mesmo padrão do decrement_credit)
CREATE OR REPLACE FUNCTION claim_entitlement(p_candidate_id UUID, p_asset_type TEXT)
RETURNS UUID AS $$
DECLARE v_id UUID;
BEGIN
  SELECT id INTO v_id FROM entitlements
   WHERE candidate_id = p_candidate_id AND asset_type = p_asset_type
     AND status = 'available'
   ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED;
  IF v_id IS NULL THEN RETURN NULL; END IF;
  UPDATE entitlements SET status = 'in_use' WHERE id = v_id;
  RETURN v_id;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

-- + RLS (select por dono via candidate→user_id; insert/update só service_role)
-- + products: INSERT ('pacote', 'Pacote Campanha Completa', ..., 49900)
-- + assets: coluna design JSONB (rascunho do editor) — ou usar metadata.design
-- + DROP das políticas/uso de subscriptions (tabela mantida até Fase 5, sem uso)
```

**Apagar/desativar:** `subscriptions` (uso no código), `decrement_credit`, `consumeCredit()`, tabela `payments` substituída por `orders` (migrar dados se houver produção; hoje não há).

---

## 3. Contratos de API (alvo)

| Rota | Método | Body → Resposta | Notas |
|------|--------|-----------------|-------|
| `/api/v1/orders` | POST | `{ items: ['pacote'] \| AssetType[] }` → `{ order_id, payment_url }` ou `{ skip_payment: true, entitlements }` | Preços SEMPRE do banco (`products`); bypass só com `STAGE_BYPASS_PAYMENT=true` |
| `/api/v1/orders/[id]` | GET | → `{ status, items, entitlements }` | Polling da página de sucesso |
| `/api/webhooks/mercadopago` | POST | valida `x-signature` (HMAC-SHA256, `MERCADOPAGO_WEBHOOK_SECRET`) | Só marca pago + cria entitlements; 200 sempre |
| `/api/v1/jingle/lyrics` | POST | `{ style, extra_instructions? }` → `{ lyrics }` | LLM síncrono; ilimitado; rate limit 20/h |
| `/api/v1/jingle/music` | POST | `{ lyrics, style, asset_id? }` → `{ asset_id }` 202 | 1ª vez: `claim_entitlement('jingle')`; regravação: decrementa `music_regens_left` |
| `/api/webhooks/suno` | POST | callback música (letra sai do fluxo) | Persiste MP3 no Storage; secret na query (`&s=WEBHOOK_SECRET`) |
| `/api/v1/designs` | POST | `{ asset_type, template_id }` → `{ asset_id, design }` | Cria rascunho (status `pending`), pré-preenchido do candidato |
| `/api/v1/designs/[id]` | PUT | `{ design }` → `{ ok }` | Salva JSON do editor (debounced) |
| `/api/v1/designs/[id]/render` | POST | `{}` → `{ output_url, pdf_url }` | satori→resvg→sharp→pdf-lib; `maxDuration = 60`; consome entitlement na 1ª finalização |
| `/api/v1/designs/[id]/background` | POST | `{ prompt_hint? }` → `{ bg_url }` | fal.ai FLUX (fundo sem texto/pessoa); decrementa `ai_bg_gens_left` |
| `/api/v1/candidates/[id]/photo` | POST | multipart → `{ photo_url, photo_cutout_url }` | + rembg fal.ai; salva os dois |
| `/api/v1/kit/download` | GET | → zip (todas as peças `done`) | streaming com `archiver` |
| `/api/cron/reconcile` | GET | header `Authorization: Bearer CRON_SECRET` | Vercel Cron */15min |

**JSON de design (contrato do editor):**
```ts
interface Design {
  template_id: string            // 'classico' | 'moderno' | 'popular' ...
  fields: { name, number, party, slogan, cnpj }   // textos editáveis
  colors: { primary, secondary, accent? }
  photo: { url, cutout_url?, offset_x, offset_y, scale }
  background: { kind: 'solid'|'gradient'|'ai', value: string }
  label_position: 'bottom'|'top'   // rótulo IA: posição ajustável, nunca removível
}
```

---

## 4. Estrutura de arquivos alvo (dentro de `eleicaoai/`)

```
app/
  page.tsx                       [manter]  landing
  login/page.tsx                 [manter]
  onboarding/page.tsx            [NOVO]    perfil do candidato (sai da página de pedido)
  planos/page.tsx                [NOVO]    pacote + avulsos → checkout
  dashboard/page.tsx             [REFAZER] hub "Minha Campanha" com progresso do kit
  criar/jingle/page.tsx          [NOVO]    wizard 3 passos (estilo → letra → música)
  criar/[tipo]/page.tsx          [NOVO]    editor visual (tipo ∈ santinho|banner|perfurado|social)
  payment/{success,failure,pending}/page.tsx [ajustar p/ orders]
  api/v1/orders/...              [NOVO]
  api/v1/jingle/{lyrics,music}/route.ts [NOVO]
  api/v1/designs/...             [NOVO]
  api/v1/kit/download/route.ts   [NOVO]
  api/cron/reconcile/route.ts    [NOVO]
  api/webhooks/mercadopago/route.ts [REFAZER: assinatura + só liberar]
  api/webhooks/suno/route.ts     [SIMPLIFICAR: só música + secret]
  editor/, order/, orders/       [APAGAR após migrar: orders/[id] vira base do status do jingle]
components/
  templates/
    SantinhoTemplate.tsx         [NOVO] ← evolução do SantinhoPreview atual
    BannerTemplate.tsx           [NOVO]
    PerfuradoTemplate.tsx        [NOVO]
    SocialTemplate.tsx           [NOVO]
    registry.ts                  [NOVO] mapa tipo→variações de template (3+ por tipo)
  editor/
    DesignEditor.tsx             [NOVO] canvas + painel (campos, cores, foto, fundo, template)
  KitProgress.tsx                [NOVO] progresso do kit no dashboard
lib/
  render.ts                      [NOVO] satori + resvg + sharp + pdf-lib (usa templates/)
  lyrics.ts                      [NOVO] geração de letra via OpenAI (estrutura verso/refrão)
  suno.ts                        [SIMPLIFICAR: remover waitForLyrics/waitForMusic/polling]
  mercadopago.ts                 [+ verifyWebhookSignature()]
  entitlements.ts                [NOVO] claim/regen helpers
  fal.ts                         [REFAZER: removeBackground() + generateBackground(); apagar arte completa]
  openai.ts                      [ENXUGAR: manter client; apagar geração de arte DALL-E]
  openrouter.ts, imagen.ts, higgsfield.ts, image-generator.ts [APAGAR]
  pricing.ts                     [vira fallback de exibição; preço real = banco]
supabase/migrations/
  20260708_orders_entitlements.sql [NOVO]
```

**Dependências novas:** `satori`, `@resvg/resvg-js`, `pdf-lib`, `archiver` (kit zip). Já instalados: `sharp`, `zod`, `@fal-ai/client`.

---

## 5. Fases e tarefas

### FASE 1 — Fundação (est. 1–2 dias)
| # | Tarefa | Arquivos | Aceite |
|---|--------|----------|--------|
| 1.1 | `git init` + `.gitignore` + commit inicial; mover 4 protótipos e stitch p/ `_referencias/` | raiz | repo limpo, `eleicaoai/` intocado |
| 1.2 | Migração `orders`/`order_items`/`entitlements` + `claim_entitlement` + RLS + seed `pacote` em products | `supabase/migrations/` | SQL roda limpo no Supabase |
| 1.3 | `lib/entitlements.ts` + tipos em `types/index.ts` (Order, Entitlement, Design); remover `consumeCredit` das rotas | lib, types | `tsc` verde |
| 1.4 | `verifyWebhookSignature()` no MP (x-signature: `ts` + `id` HMAC) | `lib/mercadopago.ts` | teste unitário com exemplo da doc MP |
| 1.5 | Corrigir player: export de áudio passa a redirecionar p/ **signed URL** do Storage (1h) quando `output_url` é do bucket; `<audio>` usa a signed URL vinda do GET do asset | `api/v1/assets/export`, `orders/[id]` | jingle toca no navegador |
| 1.6 | Sandbox MP por prefixo do token (`TEST-`) e não `NODE_ENV` | `payments/create` (até Fase 4), `lib/mercadopago.ts` | checkout abre no ambiente certo |

### FASE 2 — Motor de artes editável (est. 3–4 dias) ← coração do produto
| # | Tarefa | Arquivos | Aceite |
|---|--------|----------|--------|
| 2.1 | `SantinhoTemplate` parametrizado (props = `Design`) com 3 variações; rodapé legal fixo (CNPJ + rótulo IA não removível) | `components/templates/` | preview fiel no browser |
| 2.2 | `lib/render.ts`: mesmo componente → satori (fontes embarcadas: Inter/Archivo) → resvg em px de impressão → sharp | lib | PNG santinho 827×1181 @300dpi com texto nítido |
| 2.3 | Dimensões/DPI por tipo: santinho 70×100mm/300dpi (827×1181 + sangria 71px), banner 80×120cm/150dpi (4724×7087), perfurado 100×40cm/150dpi (5906×2362), social 1080×1080 | `lib/render.ts` | arquivos nas medidas exatas |
| 2.4 | PDF pronto p/ gráfica: pdf-lib, página em mm + sangria 3mm, PNG embutido | `lib/render.ts` | PDF abre no tamanho certo |
| 2.5 | Rotas `designs` (POST/PUT/render) com claim de entitlement na 1ª finalização; `maxDuration=60` no render | `api/v1/designs/` | fluxo cria→edita→rende completo via API |
| 2.6 | `DesignEditor.tsx`: preview central + painel (textos, cores, foto com zoom/posição, seletor de template, posição do rótulo); autosave debounced | `components/editor/`, `app/criar/[tipo]/` | edição reflete 1:1 no arquivo final |
| 2.7 | Upload de foto + rembg fal.ai (`fal-ai/birefnet` ou `imageutils/rembg`); salva original + recorte | `candidates/[id]/photo`, `lib/fal.ts` | foto sem fundo no template |
| 2.8 | Fundo IA opcional (FLUX via fal.ai, prompt sem texto/sem pessoas, só padrão/gradiente temático); decrementa `ai_bg_gens_left` | `designs/[id]/background`, `lib/fal.ts` | fundo aplicado atrás do layout |
| 2.9 | Repetir 2.1 para Banner/Perfurado/Social (layouts próprios, tipografia gigante p/ leitura à distância) | templates | 4 tipos rendem corretamente |
| 2.10 | Apagar `openrouter.ts`, `imagen.ts`, `higgsfield.ts`, `image-generator.ts`, rota `assets/image`, arte DALL-E em `openai.ts`, tipos Higgsfield | lib, api, types | `tsc` + `next build` verdes |

### FASE 3 — Jingle com aprovação de letra (est. 2 dias)
| # | Tarefa | Arquivos | Aceite |
|---|--------|----------|--------|
| 3.1 | `lib/lyrics.ts`: prompt estruturado (nome, número cantado, partido, slogan, bio, estilo) → letra com [Verso]/[Refrão]; sanitização anti-prompt-injection dos campos | lib | letra coerente em <10s, número sempre presente |
| 3.2 | `POST /jingle/lyrics` (síncrono, rate limit 20/h) e `POST /jingle/music` (claim/regen + Suno customMode + callback) | `api/v1/jingle/` | 202 com asset_id; regravação decrementa contador |
| 3.3 | Wizard `/criar/jingle`: passo 1 estilo (cards atuais), passo 2 letra (textarea grande, "regenerar", "trocar estilo"), passo 3 status+player+download; contador de regravações visível | app | usuário edita a letra ANTES de gastar música |
| 3.4 | Simplificar `webhooks/suno` (só música; secret `s=` na query; comparação constante) e `lib/suno.ts` (apagar waitFor*/lyrics API) | api, lib | callback processa e persiste MP3 |
| 3.5 | Aviso legal de IA: manter intro no prompt + exibir aviso textual obrigatório junto ao player/download | ui | conformidade audível/visível |

### FASE 4 — Checkout do pacote (est. 2–3 dias)
| # | Tarefa | Arquivos | Aceite |
|---|--------|----------|--------|
| 4.1 | `/planos`: card Pacote (destaque) + avulsos; preços do banco | app | página pública |
| 4.2 | `POST /orders` + preference MP (itens múltiplos); apagar `payments/create` e página `order/[service]` (o form de candidato já migrou p/ onboarding na 4.4) | api | redirect ao MP funciona em sandbox |
| 4.3 | Webhook MP refeito: assinatura → `getPayment` → `order.paid` → entitlements idempotentes → **fim** (sem geração) | api/webhooks | pagar em sandbox libera kit em <1min |
| 4.4 | `/onboarding` (form de candidato extraído de `order/[service]`), obrigatório antes de `/planos`; `/dashboard` refeito: KitProgress + botões Criar/Continuar/Baixar por peça + estado "não contratado" com CTA | app | fluxo completo sem becos |
| 4.5 | `/payment/success|failure|pending` consultando `orders/[id]`; `/api/cron/reconcile` + `vercel.json` (cron 15min) | app, api | webhook desligado → cron reconcilia sozinho |
| 4.6 | `GET /kit/download`: zip com MP3 + PNGs + PDFs | api | zip completo baixa |

### FASE 5 — Produção (est. 1–2 dias)
| # | Tarefa | Aceite |
|---|--------|--------|
| 5.1 | Rodar migrações no Supabase de produção; bucket `generated` privado + signed URLs em todo o app | nenhum asset público |
| 5.2 | Deploy Vercel; env vars: `SUPABASE_*`, `SUNO_API_KEY`, `SUNO_WEBHOOK_SECRET`, `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET`, `OPENAI_API_KEY`, `FAL_KEY`, `CPF_ENCRYPTION_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_APP_URL` | build verde, webhooks alcançáveis |
| 5.3 | Remover `BYPASS_PAYMENT` do caminho de produção (só `STAGE_BYPASS_PAYMENT` em preview) | impossível gerar sem pagar em prod |
| 5.4 | E2E com MP sandbox: conta nova → onboarding → pacote → 5 peças → kit.zip | roteiro passa inteiro |
| 5.5 | Smoke de conformidade TSE: rótulo IA em todas as peças visuais, CNPJ no rodapé, aviso no jingle, compliance_logs registrando | checklist 100% |
| 5.6 | Apagar tabela `subscriptions` + `payments` legada; limpar `pricing.ts` | schema final enxuto |

---

## 6. Riscos e mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| satori não suporta CSS complexo (só flexbox subset) | Templates limitados | Desenhar templates já dentro do subset (flex/absolute, sem grid); validar na tarefa 2.2 antes de escalar p/ 4 tipos. Plano B: `puppeteer-core + @sparticuz/chromium` (mais pesado, CSS completo) |
| Banner 4724×7087px pode estourar memória/tempo no render serverless | Render falha | resvg renderiza SVG vetorial direto na resolução (rápido); `maxDuration=60`; se falhar, render em 2 tiles + composição sharp |
| Suno callback não chega (URL errada/instável) | Jingle preso em processing | Cron reconcile consulta `record-info` e finaliza; contador de 15min |
| MP webhook em localhost não testável | Fluxo pago não validado em dev | `STAGE_BYPASS_PAYMENT` cria order paga + entitlements direto (mesmo caminho de dados, sem MP) |
| Qualidade da letra do LLM | Jingle fraco | Prompt com exemplos de jingle brasileiro real (rima simples, número repetido no refrão); usuário sempre pode editar — é o ponto do fluxo |
| Foto ruim do usuário (baixa resolução) | Arte final ruim | Validar min 800px no upload; aviso no editor |

## 7. Ordem de execução e dependências
```
F1 (fundação) → F2 (artes) → F3 (jingle) → F4 (checkout) → F5 (produção)
                 └─ F2 e F3 são independentes entre si (podem inverter/paralelizar)
```
F4 depende de F1 (orders/entitlements) e só faz sentido com F2+F3 prontos (é o que o pagamento libera).

## 8. Definição de pronto (lançamento)
1. Conta nova consegue: onboarding → pagar pacote (sandbox) → criar as 5 peças → baixar kit — sem nenhum erro ou beco sem saída.
2. Santinho/banner: arquivo final idêntico ao preview, texto perfeito, medidas/DPI de gráfica, PDF com sangria.
3. Jingle: letra editada pelo usuário antes da música; player funciona; MP3 baixável.
4. Pagamento: webhook assinado, idempotente, reconciliado por cron; nada é gerado dentro do webhook.
5. Conformidade TSE: rótulo IA (não removível), CNPJ no rodapé, aviso no áudio, logs LGPD.
6. `next build` limpo, RLS ativa em todas as tabelas, bucket privado, zero chave no client.
