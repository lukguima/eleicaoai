import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateJingle } from '@/lib/suno'
import { logComplianceEvent } from '@/lib/compliance'
import type { SunoCallback, SunoLyricsCallbackData, SunoCallbackTrack, Candidate, JingleStyle } from '@/types'

// ── POST /api/webhooks/suno ───────────────────────────────────
// Recebe callbacks do Suno para:
//   - type=lyrics  → letra pronta → dispara geração de música
//   - type=music   → música pronta → atualiza asset com URL final

export async function POST(req: NextRequest) {
  try {
    // Extrai parâmetros da URL: ?asset_id=xxx&type=lyrics|music
    const { searchParams } = new URL(req.url)
    const assetId = searchParams.get('asset_id')
    const type    = searchParams.get('type')

    if (!assetId || !type) {
      return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 })
    }

    const body: SunoCallback = await req.json()

    // Ignora callbacks que não são de conclusão
    if (body.data?.callbackType !== 'complete') {
      return NextResponse.json({ ok: true })
    }

    const supabase = createServerClient()

    // Busca o asset sem filtrar por user (webhook é chamado pelo Suno, não pelo usuário)
    // A segurança aqui é o assetId ser opaco (UUID) — impossível de adivinhar
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('*, candidates(*)')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      console.error('[webhook/suno] asset não encontrado:', assetId)
      return NextResponse.json({ error: 'Asset não encontrado.' }, { status: 404 })
    }

    // ── Letra pronta → dispara música ─────────────────────────
    if (type === 'lyrics') {
      const lyricsData = body.data.data[0] as SunoLyricsCallbackData

      if (lyricsData.status === 'failed') {
        await supabase
          .from('assets')
          .update({ status: 'failed', error_message: lyricsData.errorMessage ?? 'Erro na geração de letra' })
          .eq('id', assetId)

        return NextResponse.json({ ok: true })
      }

      const lyrics = lyricsData.text
      const style  = (asset.metadata as Record<string, string>).style as JingleStyle ?? 'Sertanejo Universitário'

      // Salva a letra no asset
      await supabase
        .from('assets')
        .update({
          lyrics,
          metadata: { ...(asset.metadata as object), step: 'generating_music', lyrics },
        })
        .eq('id', assetId)

      // Registra a geração de letra no log LGPD
      await logComplianceEvent({
        event_type:   'LYRICS_GENERATION',
        candidate_id: asset.candidate_id,
        asset_id:     assetId,
        ai_model:     'Suno-V5.5',
      })

      // Dispara geração de música com a letra
      const musicTaskId = await generateJingle(
        asset.candidates as Candidate,
        lyrics,
        style,
        assetId
      )

      await supabase
        .from('assets')
        .update({
          external_task_id: musicTaskId,
          metadata: { ...(asset.metadata as object), step: 'generating_music', music_task_id: musicTaskId },
        })
        .eq('id', assetId)

      return NextResponse.json({ ok: true })
    }

    // ── Música pronta → salva URL final ──────────────────────
    if (type === 'music') {
      const tracks = body.data.data as SunoCallbackTrack[]

      if (!tracks || tracks.length === 0) {
        await supabase
          .from('assets')
          .update({ status: 'failed', error_message: 'Nenhuma faixa gerada.' })
          .eq('id', assetId)

        return NextResponse.json({ ok: true })
      }

      // Usa a primeira faixa gerada
      const track = tracks[0]

      await supabase
        .from('assets')
        .update({
          status:      'done',
          output_url:  track.audio_url,
          preview_url: track.stream_audio_url,
          metadata: {
            ...(asset.metadata as object),
            step:        'done',
            track_title: track.title,
            duration:    track.duration,
            cover_url:   track.image_url,
          },
        })
        .eq('id', assetId)

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook/suno] error:', err)
    // Retorna 200 para evitar retries infinitos do Suno
    return NextResponse.json({ ok: true })
  }
}
