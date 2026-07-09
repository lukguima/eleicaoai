import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServerClient } from '@/lib/supabase'
import { persistAudio } from '@/lib/storage'
import { consumeEntitlement, releaseEntitlement } from '@/lib/entitlements'
import { log, captureError, requestIdFrom } from '@/lib/log'
import type { SunoCallback, SunoCallbackTrack } from '@/types'

// ── POST /api/webhooks/suno?asset_id=..&type=music&s=SECRET ───
// Recebe o callback de música pronta do Suno. A letra é gerada por LLM
// antes (não passa mais pelo Suno), então aqui só tratamos música.

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb)
}

export async function POST(req: NextRequest) {
  const request_id = requestIdFrom(req)
  try {
    const { searchParams } = new URL(req.url)
    const assetId = searchParams.get('asset_id')
    const secret = searchParams.get('s') ?? ''

    if (!assetId) {
      return NextResponse.json({ error: 'asset_id ausente.' }, { status: 400 })
    }

    // Valida o segredo do callback (defesa além do UUID opaco)
    const expected = process.env.SUNO_WEBHOOK_SECRET ?? ''
    if (expected && !safeEqual(secret, expected)) {
      log.warn({ request_id, asset_id: assetId }, 'webhook/suno: segredo inválido')
      return NextResponse.json({ error: 'não autorizado' }, { status: 401 })
    }

    const body: SunoCallback = await req.json()
    if (body.data?.callbackType !== 'complete') {
      return NextResponse.json({ ok: true })
    }

    const supabase = createServerClient()
    const { data: asset } = await supabase
      .from('assets')
      .select('id, candidate_id, metadata, status')
      .eq('id', assetId)
      .single()

    if (!asset) {
      log.warn({ request_id, asset_id: assetId }, 'webhook/suno: asset não encontrado')
      return NextResponse.json({ error: 'asset não encontrado' }, { status: 404 })
    }
    if (asset.status === 'done') {
      return NextResponse.json({ ok: true }) // idempotência
    }

    const meta = (asset.metadata ?? {}) as Record<string, unknown>
    const entitlementId = typeof meta.entitlement_id === 'string' ? meta.entitlement_id : ''
    const tracks = body.data.data as SunoCallbackTrack[]

    if (!tracks || tracks.length === 0) {
      if (entitlementId) await releaseEntitlement(entitlementId)
      await supabase.from('assets').update({ status: 'failed', error_message: 'Nenhuma faixa gerada.' }).eq('id', assetId)
      return NextResponse.json({ ok: true })
    }

    const track = tracks[0]
    const persistedUrl = await persistAudio(track.audio_url, asset.candidate_id, assetId).catch(() => track.audio_url)

    await supabase.from('assets').update({
      status: 'done',
      output_url: persistedUrl,
      preview_url: track.stream_audio_url,
      metadata: { ...meta, step: 'done', track_title: track.title, duration: track.duration, cover_url: track.image_url },
    }).eq('id', assetId)

    if (entitlementId) await consumeEntitlement(entitlementId, assetId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    captureError(err, { request_id }, 'webhook/suno: erro ao processar callback')
    return NextResponse.json({ ok: true }) // evita retries infinitos
  }
}
