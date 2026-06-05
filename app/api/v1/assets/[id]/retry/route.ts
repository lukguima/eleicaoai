import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateImage } from '@/lib/image-generator'
import { generateLyrics, generateJingle, waitForLyrics, waitForMusic } from '@/lib/suno'
import type { ApiResponse, Candidate, AssetType, JingleStyle } from '@/types'

// POST /api/v1/assets/[id]/retry
// Reprocessa um asset com status 'failed' sem consumir crédito adicional.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createServerClient()
    const { id: assetId } = await params

    // 1. Autenticação
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }

    // 2. Busca asset + verifica tenant via candidate
    const { data: asset } = await supabase
      .from('assets')
      .select('*, candidates!inner(user_id, name, election_number, party, campaign_cnpj, slogan, biography_summary, primary_color, secondary_color, base_photo_url, id)')
      .eq('id', assetId)
      .single()

    if (!asset) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Asset não encontrado.' }, { status: 404 })
    }

    const candidateRaw = Array.isArray(asset.candidates) ? asset.candidates[0] : asset.candidates
    if (!candidateRaw || candidateRaw.user_id !== user.id) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Asset não encontrado.' }, { status: 404 })
    }

    // 3. Permite retry para failed, pending e processing (travado)
    if (!['failed', 'pending', 'processing'].includes(asset.status)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Apenas assets com falha ou em processamento podem ser reprocessados.' },
        { status: 409 },
      )
    }

    // 4. Reseta para processing
    await supabase
      .from('assets')
      .update({ status: 'processing', error_message: null, metadata: {} })
      .eq('id', assetId)

    const candidate = { ...candidateRaw, id: candidateRaw.id } as Candidate

    // 5. Dispara reprocessamento em background
    if (asset.asset_type === 'jingle') {
      const style = ((asset.metadata as Record<string, string>)?.jingle_style ?? 'Sertanejo Universitário') as JingleStyle
      dispatchJingle(assetId, candidate, style).catch(err => console.error('[retry] jingle error:', err))
    } else {
      dispatchImage(assetId, candidate, asset.asset_type as AssetType).catch(err => console.error('[retry] image error:', err))
    }

    return NextResponse.json<ApiResponse>({ success: true, data: { asset_id: assetId, status: 'processing' } }, { status: 202 })
  } catch (err) {
    console.error('[retry] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Erro interno.' }, { status: 500 })
  }
}

// ── Dispatch helpers ────────────────────────────────────────────

async function dispatchImage(assetId: string, candidate: Candidate, assetType: AssetType) {
  const supabase = createServerClient()
  try {
    const { url, provider } = await generateImage(candidate, assetType)
    const aiModel = provider === 'imagen' ? 'google/imagen-4' : 'openrouter/dall-e-3'
    await supabase.from('assets')
      .update({ status: 'done', output_url: url, ai_model: aiModel })
      .eq('id', assetId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    await supabase.from('assets').update({ status: 'failed', error_message: msg }).eq('id', assetId)
  }
}

async function dispatchJingle(assetId: string, candidate: Candidate, style: JingleStyle) {
  const supabase = createServerClient()
  try {
    await supabase.from('assets').update({ metadata: { step: 'generating_lyrics' } }).eq('id', assetId)
    const lyricsTaskId = await generateLyrics(candidate, style, assetId)
    const lyrics = await waitForLyrics(lyricsTaskId)

    await supabase.from('assets').update({ lyrics, metadata: { step: 'generating_music' } }).eq('id', assetId)
    const musicTaskId = await generateJingle(candidate, lyrics, style, assetId)
    const audioUrl = await waitForMusic(musicTaskId)

    await supabase.from('assets')
      .update({ status: 'done', output_url: audioUrl, preview_url: audioUrl })
      .eq('id', assetId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    await supabase.from('assets').update({ status: 'failed', error_message: msg }).eq('id', assetId)
  }
}
