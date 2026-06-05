import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { getPayment } from '@/lib/mercadopago'
import { generateImage } from '@/lib/image-generator'
import { generateLyrics, generateJingle, waitForLyrics, waitForMusic } from '@/lib/suno'
import { logComplianceEvent } from '@/lib/compliance'
import type { Candidate, AssetType, JingleStyle } from '@/types'

// POST /api/webhooks/mercadopago
// Recebe notificações do Mercado Pago. Ao confirmar pagamento,
// dispara a geração do material e atualiza o registro no banco.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // MP envia { type: "payment", data: { id: "12345" } }
    if (body?.type !== 'payment' || !body?.data?.id) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const mpPaymentId = String(body.data.id)
    const supabase = createServerClient()

    // 1. Busca detalhes do pagamento no MP
    const mpPayment = await getPayment(mpPaymentId)

    if (mpPayment.status !== 'approved') {
      // Atualiza status no banco se for rejected/cancelled
      if (['rejected', 'cancelled'].includes(mpPayment.status)) {
        await supabase
          .from('payments')
          .update({ status: mpPayment.status === 'rejected' ? 'rejected' : 'expired', mp_payment_id: mpPaymentId })
          .eq('id', mpPayment.external_reference)
      }
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // 2. Busca o registro de pagamento pelo external_reference
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', mpPayment.external_reference)
      .single()

    if (!payment || payment.status === 'approved') {
      // Não encontrado ou já processado (idempotência)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // 3. Busca o candidato
    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', payment.candidate_id)
      .single()

    if (!candidate) {
      console.error('[mp-webhook] candidato não encontrado:', payment.candidate_id)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // 4. Cria asset em processamento
    const { data: asset } = await supabase
      .from('assets')
      .insert({
        candidate_id: payment.candidate_id,
        asset_type: payment.service_type,
        status: 'processing',
        ai_model: payment.service_type === 'jingle' ? 'Suno-V4' : 'imagen/openrouter',
        metadata: { triggered_by_payment: payment.id },
      })
      .select()
      .single()

    if (!asset) {
      console.error('[mp-webhook] erro ao criar asset')
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // 5. Atualiza payment com asset_id e status approved
    await supabase
      .from('payments')
      .update({ status: 'approved', mp_payment_id: mpPaymentId, asset_id: asset.id })
      .eq('id', payment.id)

    // 6. Dispara geração em background
    if (payment.service_type === 'jingle') {
      dispatchJingle(asset.id, payment.candidate_id, candidate as Candidate, (payment.jingle_style ?? 'Sertanejo Universitário') as JingleStyle).catch(
        err => console.error('[mp-webhook] jingle dispatch error:', err)
      )
    } else {
      dispatchImage(asset.id, payment.candidate_id, candidate as Candidate, payment.service_type).catch(
        err => console.error('[mp-webhook] image dispatch error:', err)
      )
    }

    // 7. Compliance log
    await logComplianceEvent({
      event_type: payment.service_type === 'jingle' ? 'JINGLE_GENERATION' : 'IMAGE_GENERATION',
      candidate_id: payment.candidate_id,
      asset_id: asset.id,
      ai_model: payment.service_type === 'jingle' ? 'Suno-V4' : 'Imagen-4',
    })

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('[mp-webhook] error:', err)
    // Sempre 200 para o MP não retentar indefinidamente
    return NextResponse.json({ received: true }, { status: 200 })
  }
}

// ── Dispatch helpers ─────────────────────────────────────────

async function dispatchImage(assetId: string, candidateId: string, candidate: Candidate, assetType: string) {
  const supabase = createServerClient()
  try {
    const { url, provider } = await generateImage(candidate, assetType as AssetType)
    const aiModel = provider === 'imagen' ? 'google/imagen-4' : 'openrouter/dall-e-3'
    await supabase.from('assets')
      .update({ status: 'done', output_url: url, ai_model: aiModel })
      .eq('id', assetId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    await supabase.from('assets')
      .update({ status: 'failed', error_message: msg })
      .eq('id', assetId)
  }
}

async function dispatchJingle(assetId: string, candidateId: string, candidate: Candidate, style: JingleStyle) {
  const supabase = createServerClient()
  try {
    // Etapa 1: letra
    await supabase.from('assets').update({ metadata: { step: 'generating_lyrics' } }).eq('id', assetId)
    const lyricsTaskId = await generateLyrics(candidate, style, assetId)
    const lyrics = await waitForLyrics(lyricsTaskId)

    // Etapa 2: música
    await supabase.from('assets').update({ lyrics, metadata: { step: 'generating_music' } }).eq('id', assetId)
    const musicTaskId = await generateJingle(candidate, lyrics, style, assetId)
    const audioUrl = await waitForMusic(musicTaskId)

    await supabase.from('assets')
      .update({ status: 'done', output_url: audioUrl, preview_url: audioUrl })
      .eq('id', assetId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    await supabase.from('assets')
      .update({ status: 'failed', error_message: msg })
      .eq('id', assetId)
  }
}
