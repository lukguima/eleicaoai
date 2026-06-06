import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateJingle } from '@/lib/suno'
import type { ApiResponse, Candidate, JingleStyle } from '@/types'

// ── POST /api/v1/assets/[id]/regen ───────────────────────────
// Salva letra editada e regenera o áudio do jingle.

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id: assetId } = await params
    const { lyrics } = await req.json()

    if (!lyrics || typeof lyrics !== 'string' || lyrics.trim().length < 10) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Letra muito curta.' }, { status: 400 })
    }

    // Busca asset + candidate (verificação de tenant)
    const { data: asset } = await supabase
      .from('assets')
      .select('*, candidates(*)')
      .eq('id', assetId)
      .single()

    if (!asset) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Asset não encontrado.' }, { status: 404 })
    }

    // Verifica se o candidato pertence ao usuário
    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', asset.candidate_id)
      .eq('user_id', user.id)
      .single()

    if (!candidate) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Asset não encontrado.' }, { status: 404 })
    }

    if (asset.asset_type !== 'jingle') {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Este asset não é um jingle.' }, { status: 400 })
    }

    const style = (asset.metadata as Record<string, string>)?.style as JingleStyle ?? 'Sertanejo Universitário'

    // Atualiza a letra e volta para processing
    await supabase
      .from('assets')
      .update({
        lyrics: lyrics.trim(),
        status: 'processing',
        output_url: null,
        error_message: null,
        metadata: { ...(asset.metadata as object), step: 'generating_music', lyrics: lyrics.trim() },
      })
      .eq('id', assetId)

    // Dispara geração de música com a letra editada
    const musicTaskId = await generateJingle(candidate as Candidate, lyrics.trim(), style, assetId)

    await supabase
      .from('assets')
      .update({
        external_task_id: musicTaskId,
        metadata: { ...(asset.metadata as object), step: 'generating_music', music_task_id: musicTaskId, lyrics: lyrics.trim() },
      })
      .eq('id', assetId)

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { asset_id: assetId, status: 'processing', message: 'Regenerando áudio com a nova letra.' },
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[assets/regen] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: `Erro ao regenerar: ${detail}` }, { status: 500 })
  }
}
