# Deploy no Coolify (Contabo)

Guia para publicar o EleiçãoAI no seu servidor Contabo via Coolify. O app usa
Supabase (banco + storage) e APIs externas — o servidor só roda o Next.js.

Repositório: `github.com/lukguima/eleicaoai` · branch `master` · **Dockerfile** incluso.

---

## 1. Criar a aplicação no Coolify

1. **+ New → Application → Public/Private Repository** → conecte `lukguima/eleicaoai`.
2. **Branch:** `master`.
3. **Build Pack:** `Dockerfile` (o repositório já tem um otimizado para Next standalone).
4. **Port (Ports Exposes):** `3000`.
5. **Domínio:** configure seu domínio/subdomínio; o Coolify provê HTTPS (Let's Encrypt).

> O `.dockerignore` já exclui `.env*`, `node_modules` e `.next` — a imagem sai enxuta e sem segredos.

## 2. Variáveis de ambiente

Em **Environment Variables**. Atenção ao tipo:

### Build-time (marque como "Build Variable" / disponível no build)
As `NEXT_PUBLIC_*` são embutidas no bundle durante o `npm run build`, então precisam
existir **no build**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL` (ex.: `https://seudominio.com`)
- `NEXT_PUBLIC_SITE_URL` (mesmo domínio)

### Runtime (secretas — só no servidor)
- `SUPABASE_SERVICE_ROLE_KEY`
- `CPF_ENCRYPTION_KEY`
- `OPENAI_API_KEY`
- `SUNO_API_KEY`
- `SUNO_WEBHOOK_SECRET`
- `FAL_KEY`
- `MERCADOPAGO_ACCESS_TOKEN`
- `MERCADOPAGO_WEBHOOK_SECRET`
- `CRON_SECRET`
- **Não** defina `STAGE_BYPASS_PAYMENT` em produção (só em ambiente de teste).

> A lista completa e onde obter cada chave está em `docs/PRODUCAO.md`.

## 3. Banco e Storage (Supabase)

Feito uma vez, fora do Coolify — ver `docs/PRODUCAO.md §1 e §2`. O servidor não guarda
arquivos: PNG/PDF/MP3 vão para o Supabase Storage.

## 4. Webhooks apontando para o domínio do Coolify

- **Mercado Pago:** `https://seudominio.com/api/webhooks/mercadopago` (evento Pagamentos).
- **Suno:** o callback é montado automaticamente a partir de `NEXT_PUBLIC_APP_URL`
  (`/api/webhooks/suno`). Garanta que `NEXT_PUBLIC_APP_URL` = seu domínio público.

## 5. Cron de reconciliação (substitui o Vercel Cron)

O `vercel.json` só funciona na Vercel. No Coolify, crie um **Scheduled Task** na aplicação:

- **Frequency:** `*/15 * * * *`
- **Command:**
  ```sh
  node -e "fetch('http://127.0.0.1:3000/api/cron/reconcile',{headers:{authorization:'Bearer '+process.env.CRON_SECRET}}).then(r=>r.text()).then(t=>console.log(t))"
  ```
  (Node 22 tem `fetch` nativo e o container já tem a env `CRON_SECRET`.)

Alternativa: um cron no host Contabo com `curl -H "Authorization: Bearer <CRON_SECRET>" https://seudominio.com/api/cron/reconcile`.

## 6. Deploy e verificação

1. **Deploy**. Acompanhe o log — o build roda `npm ci` + `npm run build` no Alpine
   (instala os binários `sharp`/`@resvg/resvg-js` corretos para Linux musl).
2. Abra o domínio → landing carrega.
3. Rode o teste ponta-a-ponta do `docs/PRODUCAO.md §6` (sandbox do Mercado Pago).
4. Confirme uma geração de santinho (valida fontes/render no container) e um jingle.

## 7. Notas

- **Recursos:** o render do banner (4724×7087px) usa memória; um plano Contabo com
  ≥2 GB de RAM é confortável. O `maxDuration` das rotas de render/jingle é 60s.
- **Escala:** 1 instância atende o piloto. Como o estado fica no Supabase, dá para
  subir réplicas sem sessão sticky se precisar.
- **Download do kit (.zip):** funcionalidade secundária; se apresentar erro no
  container, baixar peça a peça (página de cada pedido) continua funcionando.
