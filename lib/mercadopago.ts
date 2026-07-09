// Mercado Pago REST v1 — sem SDK, usando fetch direto
// Configure MERCADOPAGO_ACCESS_TOKEN no .env.local para ativar pagamentos.
// Sem o token, o sistema usa bypass (gera sem cobrança — ideal para dev).

import crypto from 'crypto'

const BASE = 'https://api.mercadopago.com'

export function isPaymentEnabled(): boolean {
  return !!process.env.MERCADOPAGO_ACCESS_TOKEN
}

/**
 * Ambiente é definido pelo TIPO do token, não pelo NODE_ENV.
 * Tokens de teste do Mercado Pago começam com "TEST-".
 * Em sandbox o checkout usa `sandbox_init_point`; em produção, `init_point`.
 */
export function isSandboxToken(): boolean {
  return (process.env.MERCADOPAGO_ACCESS_TOKEN ?? '').startsWith('TEST-')
}

/**
 * Valida a assinatura do webhook do Mercado Pago (cabeçalho `x-signature`).
 * Manifesto assinado: `id:<dataId>;request-id:<x-request-id>;ts:<ts>;`
 * (o dataId é minúsculo quando alfanumérico). HMAC-SHA256 com o segredo
 * configurado no painel do MP (MERCADOPAGO_WEBHOOK_SECRET).
 *
 * Se o segredo não estiver configurado, retorna false (falha fechada).
 */
export function verifyWebhookSignature(params: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
}): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET
  if (!secret) {
    console.error('[mercadopago] MERCADOPAGO_WEBHOOK_SECRET não configurado — webhook rejeitado')
    return false
  }
  const { xSignature, xRequestId, dataId } = params
  if (!xSignature || !dataId) return false

  // x-signature: "ts=1699999999,v1=abc123..."
  const parts = Object.fromEntries(
    xSignature.split(',').map(kv => {
      const [k, v] = kv.split('=')
      return [k?.trim(), v?.trim()]
    }),
  )
  const ts = parts['ts']
  const v1 = parts['v1']
  if (!ts || !v1) return false

  const id = /[a-zA-Z]/.test(dataId) ? dataId.toLowerCase() : dataId
  const manifest = `id:${id};request-id:${xRequestId ?? ''};ts:${ts};`

  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')

  // Comparação em tempo constante
  const a = Buffer.from(expected)
  const b = Buffer.from(v1)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}

function auth(): string {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN não configurado')
  return `Bearer ${token}`
}

// ── Preference (checkout) ────────────────────────────────────

export interface MpPreferenceInput {
  title: string
  amount: number          // valor em Reais (ex: 29.90)
  externalRef: string     // nosso payment.id no banco
  backUrls: {
    success: string
    failure: string
    pending: string
  }
  notificationUrl: string
}

export interface MpPreferenceOutput {
  id: string
  init_point: string        // URL de produção
  sandbox_init_point: string
}

export async function createPreference(
  input: MpPreferenceInput,
): Promise<MpPreferenceOutput> {
  const res = await fetch(`${BASE}/checkout/preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: auth() },
    body: JSON.stringify({
      items: [{ id: '1', title: input.title, quantity: 1, currency_id: 'BRL', unit_price: input.amount }],
      external_reference: input.externalRef,
      back_urls: input.backUrls,
      auto_return: 'approved',
      notification_url: input.notificationUrl,
      payment_methods: { installments: 1 },
    }),
  })
  if (!res.ok) throw new Error(`MP preference error ${res.status}: ${await res.text()}`)
  return res.json() as Promise<MpPreferenceOutput>
}

// ── Payment detail ───────────────────────────────────────────

export interface MpPayment {
  id: number
  status: 'approved' | 'pending' | 'rejected' | 'cancelled' | 'refunded' | 'charged_back'
  external_reference: string
  transaction_amount: number
}

export async function getPayment(mpPaymentId: string): Promise<MpPayment> {
  const res = await fetch(`${BASE}/v1/payments/${mpPaymentId}`, {
    headers: { Authorization: auth() },
  })
  if (!res.ok) throw new Error(`MP getPayment error ${res.status}`)
  return res.json() as Promise<MpPayment>
}

/**
 * Busca o pagamento mais relevante de um pedido pela referência externa
 * (usado na reconciliação, quando o webhook não chegou). Retorna null se
 * não houver nenhum.
 */
export async function searchPaymentByRef(externalRef: string): Promise<MpPayment | null> {
  const res = await fetch(`${BASE}/v1/payments/search?external_reference=${encodeURIComponent(externalRef)}`, {
    headers: { Authorization: auth() },
  })
  if (!res.ok) return null
  const json = (await res.json()) as { results?: MpPayment[] }
  const results = json.results ?? []
  if (results.length === 0) return null
  // Prioriza um pagamento aprovado, senão o primeiro
  return results.find(p => p.status === 'approved') ?? results[0]
}
