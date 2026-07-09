import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getPayment, verifyWebhookSignature } from '@/lib/mercadopago'
import { grantOrderEntitlements } from '@/lib/orders'

// ── POST /api/webhooks/mercadopago ────────────────────────────
// Valida a assinatura, confirma o pagamento e marca o PEDIDO como pago,
// liberando os entitlements (idempotente). NÃO gera conteúdo — a criação
// das peças é feita pelo usuário no editor/wizard.

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
    const orderId = mpPayment.external_reference

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, candidate_id')
      .eq('id', orderId)
      .single()

    if (!order) {
      console.error('[mp-webhook] pedido não encontrado:', orderId)
      return NextResponse.json({ received: true }, { status: 200 })
    }
    if (order.status === 'paid') {
      return NextResponse.json({ received: true }, { status: 200 }) // idempotência
    }

    if (mpPayment.status === 'approved') {
      await supabase.from('orders').update({ status: 'paid', mp_payment_id: mpPaymentId }).eq('id', order.id)
      await grantOrderEntitlements(order.id, order.candidate_id)
    } else if (['rejected', 'cancelled', 'refunded'].includes(mpPayment.status)) {
      const map: Record<string, string> = { rejected: 'rejected', cancelled: 'expired', refunded: 'refunded' }
      await supabase.from('orders').update({ status: map[mpPayment.status], mp_payment_id: mpPaymentId }).eq('id', order.id)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('[mp-webhook] error:', err)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
