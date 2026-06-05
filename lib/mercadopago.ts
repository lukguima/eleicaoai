// Mercado Pago REST v1 — sem SDK, usando fetch direto
// Configure MERCADOPAGO_ACCESS_TOKEN no .env.local para ativar pagamentos.
// Sem o token, o sistema usa bypass (gera sem cobrança — ideal para dev).

const BASE = 'https://api.mercadopago.com'

export function isPaymentEnabled(): boolean {
  return !!process.env.MERCADOPAGO_ACCESS_TOKEN
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
