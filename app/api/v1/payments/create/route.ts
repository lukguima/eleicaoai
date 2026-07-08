import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createPreference, isPaymentEnabled, isSandboxToken } from '@/lib/mercadopago'
import { SERVICES } from '@/lib/pricing'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types'

// ── POST /api/v1/payments/create ──────────────────────────────
// Sem MERCADOPAGO_ACCESS_TOKEN ou com BYPASS_PAYMENT=true:
// retorna { skip_payment: true } e gera direto (fase de testes).

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()

    // Auth
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }

    // Rate limit: 5 tentativas por usuário a cada 15 minutos
    const rl = rateLimit(`payment:${user.id}`, { limit: 5, windowMs: 15 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Muitas tentativas. Aguarde alguns minutos.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const { candidate_id, service_type, jingle_style } = await req.json()

    // Verifica candidato
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('id', candidate_id)
      .eq('user_id', user.id)
      .single()
    if (!candidate) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Candidatura não encontrada.' }, { status: 404 })
    }

    const staticService = SERVICES[service_type as keyof typeof SERVICES]
    if (!staticService) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Serviço inválido.' }, { status: 400 })
    }

    // Busca preço e label atuais do banco (admin pode ter atualizado)
    const { data: productRow } = await supabase
      .from('products')
      .select('price, label, active')
      .eq('type', service_type)
      .single()

    if (productRow && !productRow.active) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Serviço indisponível no momento.' }, { status: 410 })
    }

    // ── Bypass: sem token MP ou modo de testes ────────────────
    const bypass = !isPaymentEnabled() || process.env.BYPASS_PAYMENT === 'true'
    if (bypass) {
      return NextResponse.json<ApiResponse>({ success: true, data: { skip_payment: true } })
    }

    // ── Produção: cria registro + preferência MP ─────────────
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || 'https://eleicaoai.com.br'

    const service = {
      ...staticService,
      price: productRow?.price ?? staticService.price,
      label: productRow?.label ?? staticService.label,
    }

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        candidate_id,
        service_type,
        jingle_style: jingle_style ?? null,
        status: 'pending',
        amount_cents: service.price,
      })
      .select()
      .single()

    if (paymentError || !payment) {
      console.error('[payments/create] DB error:', paymentError)
      return NextResponse.json<ApiResponse>({ success: false, error: 'Erro ao registrar pagamento.' }, { status: 500 })
    }

    const preference = await createPreference({
      title: service.label,
      amount: service.price / 100,
      externalRef: payment.id,
      backUrls: {
        success: `${origin}/payment/success?ref=${payment.id}`,
        failure: `${origin}/payment/failure?ref=${payment.id}`,
        pending: `${origin}/payment/pending?ref=${payment.id}`,
      },
      notificationUrl: `${origin}/api/webhooks/mercadopago`,
    })

    await supabase
      .from('payments')
      .update({ mp_preference_id: preference.id })
      .eq('id', payment.id)

    const isSandbox = isSandboxToken()

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        payment_id: payment.id,
        payment_url: isSandbox ? preference.sandbox_init_point : preference.init_point,
      },
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[payments/create] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: `Erro no pagamento: ${detail}` }, { status: 500 })
  }
}
