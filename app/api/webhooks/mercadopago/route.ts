import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getPayment, verifyWebhookSignature } from '@/lib/mercadopago'

// ── POST /api/webhooks/mercadopago ────────────────────────────
// Modelo novo: o webhook NÃO gera conteúdo. Ele valida a notificação,
// confirma o pagamento e marca o pedido como pago. A liberação de
// direitos (entitlements) contra `orders` é feita na Fase 4.
// A geração de peças acontece pelo editor/render, no ritmo do usuário.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body?.type !== 'payment' || !body?.data?.id) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const mpPaymentId = String(body.data.id)

    const dataIdQuery = new URL(req.url).searchParams.get('data.id')
    const validSignature = verifyWebhookSignature({
      xSignature: req.headers.get('x-signature'),
      xRequestId: req.headers.get('x-request-id'),
      dataId: dataIdQuery ?? mpPaymentId,
    })
    if (!validSignature) {
      console.error('[mp-webhook] assinatura inválida — requisição rejeitada')
      return NextResponse.json({ error: 'assinatura inválida' }, { status: 401 })
    }

    const supabase = createServerClient()
    const mpPayment = await getPayment(mpPaymentId)

    const statusMap: Record<string, string> = {
      approved: 'approved',
      rejected: 'rejected',
      cancelled: 'expired',
      refunded: 'refunded',
    }
    const mapped = statusMap[mpPayment.status]
    if (mapped) {
      await supabase
        .from('payments')
        .update({ status: mapped, mp_payment_id: mpPaymentId })
        .eq('id', mpPayment.external_reference)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('[mp-webhook] error:', err)
    // Sempre 200 para o MP não retentar indefinidamente
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
