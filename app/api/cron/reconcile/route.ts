import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { searchPaymentByRef, isPaymentEnabled } from '@/lib/mercadopago'
import { grantOrderEntitlements } from '@/lib/orders'
import { checkMusic } from '@/lib/suno'
import { persistAudio } from '@/lib/storage'
import { consumeEntitlement, releaseEntitlement } from '@/lib/entitlements'
import { captureError } from '@/lib/log'

export const runtime = 'nodejs'
export const maxDuration = 60

// ── GET /api/cron/reconcile ───────────────────────────────────
// Rede de segurança (Vercel Cron): reconcilia pedidos cujo webhook não
// chegou e finaliza/marca como falha peças presas em "processing".
// Protegido por CRON_SECRET (Authorization: Bearer ...).

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000).toISOString()

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const auth = req.headers.get('authorization')
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
  }

  const supabase = createServerClient()
  const report = { orders: 0, jingles_done: 0, jingles_failed: 0, visuals_failed: 0 }

  // 1. Pedidos pendentes há mais de 10 min → consulta o MP
  if (isPaymentEnabled()) {
    const { data: orders } = await supabase
      .from('orders')
      .select('id, candidate_id')
      .eq('status', 'pending')
      .lt('created_at', minutesAgo(10))
      .limit(50)

    for (const order of orders ?? []) {
      try {
        const payment = await searchPaymentByRef(order.id)
        if (!payment) continue
        if (payment.status === 'approved') {
          await supabase.from('orders').update({ status: 'paid', mp_payment_id: String(payment.id) }).eq('id', order.id)
          await grantOrderEntitlements(order.id, order.candidate_id)
          report.orders++
        } else if (['rejected', 'cancelled'].includes(payment.status)) {
          await supabase.from('orders').update({ status: payment.status === 'rejected' ? 'rejected' : 'expired' }).eq('id', order.id)
        }
      } catch (e) {
        captureError(e, { request_id: 'cron-reconcile', order_id: order.id }, 'reconcile: falha ao reconciliar pedido')
      }
    }
  }

  // 2. Jingles presos em processing há mais de 15 min → checa Suno
  const { data: jingles } = await supabase
    .from('assets')
    .select('id, candidate_id, external_task_id, metadata')
    .eq('asset_type', 'jingle')
    .eq('status', 'processing')
    .lt('updated_at', minutesAgo(15))
    .limit(50)

  for (const a of jingles ?? []) {
    const entId = (a.metadata as Record<string, unknown>)?.entitlement_id as string | undefined
    if (!a.external_task_id) continue
    try {
      const r = await checkMusic(a.external_task_id)
      if (r.status === 'done' && r.audioUrl) {
        const persisted = await persistAudio(r.audioUrl, a.candidate_id, a.id).catch(() => r.audioUrl!)
        await supabase.from('assets').update({ status: 'done', output_url: persisted, preview_url: persisted }).eq('id', a.id)
        if (entId) await consumeEntitlement(entId, a.id)
        report.jingles_done++
      } else if (r.status === 'failed') {
        if (entId) await releaseEntitlement(entId)
        await supabase.from('assets').update({ status: 'failed', error_message: 'Falha na geração da música.' }).eq('id', a.id)
        report.jingles_failed++
      }
    } catch (e) {
      captureError(e, { request_id: 'cron-reconcile', tenant_id: a.candidate_id, asset_id: a.id }, 'reconcile: falha ao reconciliar jingle')
    }
  }

  // 3. Visuais presos em processing há mais de 5 min (render é síncrono) → falha
  const { data: visuals } = await supabase
    .from('assets')
    .select('id, metadata')
    .in('asset_type', ['santinho', 'banner', 'perfurado', 'social'])
    .eq('status', 'processing')
    .lt('updated_at', minutesAgo(5))
    .limit(50)

  for (const a of visuals ?? []) {
    const entId = (a.metadata as Record<string, unknown>)?.entitlement_id as string | undefined
    if (entId) await releaseEntitlement(entId)
    await supabase.from('assets').update({ status: 'failed', error_message: 'A geração foi interrompida. Tente novamente.' }).eq('id', a.id)
    report.visuals_failed++
  }

  return NextResponse.json({ ok: true, report })
}
