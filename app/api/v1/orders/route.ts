import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { createPreference, isPaymentEnabled, isSandboxToken } from '@/lib/mercadopago'
import { priceItems, grantOrderEntitlements } from '@/lib/orders'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types'

// ── POST /api/v1/orders ───────────────────────────────────────
// Cria um pedido (pacote e/ou avulsos). Sem MP (ou STAGE_BYPASS_PAYMENT):
// marca como pago e libera entitlements na hora. Com MP: cria preferência
// e devolve a URL de checkout; a liberação vem pelo webhook.

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }

    const rl = rateLimit(`orders:${user.id}`, { limit: 10, windowMs: 15 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Muitas tentativas. Aguarde alguns minutos.' }, { status: 429 })
    }

    const { candidate_id, items } = await req.json()
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Selecione ao menos um item.' }, { status: 400 })
    }

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('id', candidate_id)
      .eq('user_id', user.id)
      .single()
    if (!candidate) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Cadastre seus dados antes de contratar.' }, { status: 404 })
    }

    const priced = await priceItems(items)
    if (!priced) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Itens inválidos ou indisponíveis.' }, { status: 400 })
    }
    const total = priced.reduce((s, i) => s + i.price_cents, 0)

    // Cria pedido + itens
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({ user_id: user.id, candidate_id, status: 'pending', amount_cents: total })
      .select('id')
      .single()
    if (orderErr || !order) {
      console.error('[orders] insert error:', orderErr)
      return NextResponse.json<ApiResponse>({ success: false, error: 'Erro ao criar pedido.' }, { status: 500 })
    }
    await supabase.from('order_items').insert(
      priced.map(i => ({ order_id: order.id, product_type: i.type, price_cents: i.price_cents })),
    )

    // ── Bypass (dev/staging ou sem MP): paga e libera na hora ──
    const bypass = !isPaymentEnabled() || process.env.STAGE_BYPASS_PAYMENT === 'true'
    if (bypass) {
      await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id)
      await grantOrderEntitlements(order.id, candidate_id)
      return NextResponse.json<ApiResponse>({ success: true, data: { order_id: order.id, skip_payment: true } })
    }

    // ── Produção: cria preferência do Mercado Pago ────────────
    const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ''
    const title = priced.length === 1 ? priced[0].label : `EleiçãoAI — ${priced.length} itens`
    const preference = await createPreference({
      title,
      amount: total / 100,
      externalRef: order.id,
      backUrls: {
        success: `${origin}/payment/success?ref=${order.id}`,
        failure: `${origin}/payment/failure?ref=${order.id}`,
        pending: `${origin}/payment/pending?ref=${order.id}`,
      },
      notificationUrl: `${origin}/api/webhooks/mercadopago`,
    })
    await supabase.from('orders').update({ mp_preference_id: preference.id }).eq('id', order.id)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        order_id: order.id,
        payment_url: isSandboxToken() ? preference.sandbox_init_point : preference.init_point,
      },
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[orders] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: `Erro no pedido: ${detail}` }, { status: 500 })
  }
}
