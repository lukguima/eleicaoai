# EleiçãoAI — Diagnóstico e Plano de Reestruturação
**Data:** 08/07/2026 · **Objetivo:** colocar no ar um produto onde o candidato contrata um pacote, cria jingle (com letra editável), santinho e banner (editáveis), e sai com o kit completo da campanha.

---

## 1. Diagnóstico do estado atual

### 1.1 O que existe na pasta
| Pasta | O que é | Situação |
|---|---|---|
| `eleicaoai/` | **O produto real** — Next.js 16 + Supabase + Tailwind 4, com APIs, schema SQL, integrações (Suno, DALL-E/Imagen, Mercado Pago) | Base a manter |
| `landpage1/`, `portal-do-candidato/`, `página editor de artes/`, `página jingle-generator/` | Protótipos Vite/React exportados do AI Studio, desconectados do produto | Só referência visual — arquivar |
| `stitch_kit_de_campanha_eleitoral/` | Referência de design (HTML estático) | Referência — arquivar |
| PDFs TSE (Res. 23.732/2024) e PRD | Documentação | Manter |

### 1.2 Por que "não estou conseguindo criar no site" — causas-raiz

**A. As artes são geradas como uma imagem única de IA (DALL-E 3 / Imagen)**
- `lib/openai.ts` manda um prompt de texto pedindo o santinho inteiro, incluindo nome, número e CNPJ *escritos pela IA dentro da imagem*. Modelos de imagem não escrevem português confiável → nome e número saem ilegíveis/errados.
- A **foto real do candidato nunca é usada** na arte (o upload existe, mas a geração é 100% text-to-image). Além de ruim, viola a regra do próprio PRD e do TSE (foto do candidato deve ser real).
- O resultado é uma imagem fechada: **impossível de editar**.

**B. O "Editor" (`app/editor/page.tsx`) é desconectado da geração**
- O preview HTML (que é bonito e correto!) é só decorativo: ao clicar "Gerar com IA", os campos editados são ignorados e a rota `/api/v1/assets/image` gera outra coisa via DALL-E usando os dados do cadastro.

**C. Letra do jingle não é revisável antes da música**
- Fluxo atual: letra (Suno) → música (Suno) **automaticamente**, sem parada para o usuário aprovar/editar. Só existe edição *depois* que a música ficou pronta (`orders/[id]` → "Editar letra" → regenera), ou seja, paga-se o custo da música duas vezes para ajustar uma palavra.

**D. Pagamento e execução não se conversam (dois modelos conflitantes)**
1. **Modelo créditos/assinatura** (PRD + `subscriptions` + `decrement_credit`): as rotas de geração consomem crédito (3 de trial). Esgotou → erro "Créditos insuficientes. Faça upgrade" — **mas não existe nenhuma página/fluxo para comprar créditos ou plano**. Beco sem saída.
2. **Modelo avulso Mercado Pago** (`payments` + webhook): cobra por item (R$ 19–49), mas a página de pedido mostra no resumo **"Combo Completo — R$ 599"** enquanto cobra o preço avulso. Cliente não sabe o que está comprando.
3. No caminho pago, o webhook MP dispara a geração **fire-and-forget dentro da função serverless** (`dispatchJingle`/`dispatchImage` com polling de até 8 min). Na Vercel a função morre após a resposta → **cliente paga e o material nunca fica pronto**.

**E. Bugs pontuais que quebram o uso**
- Player de áudio do jingle: `<audio src="/api/v1/assets/export/{id}">` sem header de autenticação → 401 → player não toca (`app/orders/[id]/page.tsx:212`).
- Webhook MP sem validação de assinatura (`x-signature`) — qualquer um com um payment_id válido pode acionar.
- Sandbox vs produção do MP decidido por `NODE_ENV`, não pelo tipo do token.
- Webhook Suno protegido apenas pelo UUID do asset na URL.
- `payments` sem policy de UPDATE p/ usuário (ok), mas rotas usam `service_role` para tudo — RLS vira decoração.
- 3 provedores de imagem em cascata (OpenAI → Imagen → OpenRouter) + `lib/fal.ts` e `lib/higgsfield.ts` órfãos — complexidade morta.

---

## 2. Decisão de produto (norte da reestruturação)

**Produto = Kit de Campanha.** O candidato:
1. Entra na landing → cria conta → preenche perfil (nome, número, partido, cores, foto).
2. **Contrata o Pacote Campanha** (pagamento único via Mercado Pago; avulsos opcionais).
3. No painel "Minha Campanha", cria cada peça no seu ritmo:
   - **Jingle:** escolhe estilo → IA gera a letra → **usuário edita/aprova a letra** → gera a música.
   - **Santinho / Banner / Perfurado / Post:** editor WYSIWYG com templates — o que se vê é o que se baixa.
4. Baixa o kit completo (MP3 + PNGs/PDFs prontos para gráfica, com rótulo TSE e rodapé legal automáticos).

**Modelo de cobrança único:** pedido pago → *entitlements* (direitos de criar cada peça, com N revisões). Fim do sistema de créditos/assinatura. Pagamento **libera** a criação; não dispara geração automática (resolve a fragilidade serverless e dá controle ao usuário).

---

## 3. Arquitetura alvo

### 3.1 Motor de artes: template HTML → imagem (não mais DALL-E para a arte inteira)
- Renderizar os templates (como o `SantinhoPreview` atual) **server-side** em resolução de impressão: `satori` + `@resvg/resvg-js` (ou Puppeteer) → PNG 300dpi → PDF (sangria 3mm) via `sharp`/`pdf-lib`.
- Texto sempre perfeito (é texto de verdade), foto real do candidato, cores exatas do partido.
- IA entra onde agrega: remoção de fundo da foto (fal.ai — `lib/fal.ts` já existe), fundos decorativos opcionais, sugestão de slogan.
- O editor atual vira o produto: mesmo componente de template no preview e no render final. 3–5 templates por peça.

### 3.2 Fluxo do jingle em duas etapas com aprovação
```
escolher estilo → POST /jingle/lyrics (Suno lyrics ou LLM, ~10s)
  → tela "Revise sua letra" (editar texto, regenerar letra, trocar estilo)
  → POST /jingle/music { lyrics aprovada } → Suno V5 (callback)
  → player + download MP3 (com aviso legal de IA na abertura)
```
- Limite de regravações de música por entitlement (ex.: 3), regeneração de **letra** ilimitada (barata).

### 3.3 Pagamento → liberação (não geração)
```
checkout → orders (order_items) → Mercado Pago (preference)
webhook MP (com validação x-signature) → order.status = paid
  → cria entitlements (1 por peça do pacote)
dashboard lê entitlements → habilita botões "Criar"
geração consome entitlement (função atômica no banco, reaproveita padrão do decrement_credit)
```
- Página de retorno (`/payment/success`) só consulta status; reconciliação por cron (Vercel Cron 1×/h) para webhooks perdidos e assets presos em `processing`.

### 3.4 Simplificações
- **Um** provedor de imagem para fundos (manter OpenAI OU Imagen; apagar OpenRouter, Higgsfield e cascata de fallback).
- Apagar `subscriptions`, `consumeCredit`, tabela de créditos; migração SQL nova para `orders`/`order_items`/`entitlements`.
- Apagar os 4 protótipos Vite da raiz (mover para `_referencias/`).
- Polling longo (`waitForLyrics`/`waitForMusic`) sai das rotas; fica só callback Suno + polling do **cliente** (a página de status já faz isso) + cron de reconciliação.

---

## 4. Plano de execução por fases

### Fase 1 — Fundação e limpeza (1–2 dias)
- [ ] Mover protótipos para `_referencias/`; `git init` no repositório.
- [ ] Nova migração: `orders`, `order_items`, `entitlements` (+ RLS); remover uso de `subscriptions`.
- [ ] Unificar preços: tabela `products` como fonte única (pacote + avulsos); remover "Combo R$ 599" hardcoded.
- [ ] Corrigir bugs pontuais: player de áudio (signed URL do Storage), sandbox MP por tipo de token, assinatura do webhook MP.

### Fase 2 — Motor de artes editável (3–4 dias) ← maior valor
- [ ] Componentes de template (santinho, banner, perfurado, social) parametrizados: foto, nome, número, partido, slogan, cores, template escolhido.
- [ ] Rota `POST /api/v1/assets/render`: mesmo template → satori/resvg → PNG 300dpi + PDF; rodapé legal + rótulo IA automáticos (reaproveitar `lib/watermark.ts`).
- [ ] Editor conectado: preview = render final; salvar rascunho no asset (`metadata.design`); botão "Gerar arquivo final" consome entitlement.
- [ ] Remoção de fundo da foto via fal.ai no upload.
- [ ] Apagar `lib/openrouter.ts`, `lib/higgsfield.ts`, cascata em `image-generator.ts` (manter 1 provedor só para fundos opcionais).

### Fase 3 — Jingle com letra editável (2 dias)
- [ ] Separar rotas: `POST /jingle/lyrics` e `POST /jingle/music`.
- [ ] Página `/jingle/[assetId]`: revisão/edição da letra (textarea + regenerar + trocar estilo) antes de gerar música.
- [ ] Música só por callback Suno; contador de regravações no entitlement.

### Fase 4 — Checkout do pacote (2–3 dias)
- [ ] Página de planos (Pacote Completo + avulsos) → checkout MP.
- [ ] Webhook: validar assinatura → marcar pago → criar entitlements (idempotente).
- [ ] Dashboard "Minha Campanha": progresso do kit (Jingle ✓, Santinho ✓, …), bloqueio elegante quando não pago, download em lote (zip).
- [ ] Cron de reconciliação (pagamentos e assets presos).

### Fase 5 — Produção (1–2 dias)
- [ ] Deploy: Vercel (app) + Supabase (managed). Checklist de env vars (`SUNO_API_KEY`, `MERCADOPAGO_ACCESS_TOKEN`, `OPENAI_API_KEY` ou `GOOGLE_AI_API_KEY`, `FAL_KEY`, `CPF_ENCRYPTION_KEY`, `NEXT_PUBLIC_APP_URL`).
- [ ] `BYPASS_PAYMENT` removido do caminho de produção (guardado atrás de env explícita de staging).
- [ ] Teste ponta-a-ponta com pagamento sandbox real: contratar → criar 5 peças → baixar kit.
- [ ] Smoke test de conformidade: rótulo IA, rodapé CNPJ, aviso de áudio.

**Total estimado: ~2 semanas de trabalho focado.**

---

## 5. Critérios de aceite (o mínimo para lançar)
1. Candidato consegue pagar o pacote no MP e ver o kit liberado em < 1 min (webhook + fallback de reconciliação).
2. Jingle: letra visível e editável **antes** da música; MP3 final com aviso legal.
3. Santinho/banner: o download é idêntico ao preview editado; nome/número 100% legíveis; PNG 300dpi + PDF.
4. Nenhum beco sem saída: sem créditos ocultos, sem erro "faça upgrade" sem link de upgrade.
5. Rótulo "Conteúdo fabricado com IA" + CNPJ em todas as peças aplicáveis (Res. TSE 23.732/2024).
