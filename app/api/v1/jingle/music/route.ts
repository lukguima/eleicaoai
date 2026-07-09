import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateJingle, waitForMusic } from '@/lib/suno'
import { persistAudio } from '@/lib/storage'
import { claimEntitlement, consumeEntitlement, releaseEntitlement, consumeMusicRegen, BYPASS_ENTITLEMENT } from '@/lib/entitlements'
import { logComplianceEvent } from '@/lib/compliance'
import type { ApiResponse, Candidate, JingleStyle } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const STYLES: JingleStyle[] = ['Sertanejo Universitário', 'Forró', 'Funk Gospel', 'MPB', 'Pagode', 'Rap Político']

// ── POST /api/v1/jingle/music ─────────────────────────────────
// Gera a MÚSICA a partir da letra aprovada.
//  - Sem asset_id: 1ª geração → reivindica o entitlement do jingle.
//  - Com asset_id: regravação → consome uma cota music_regens_left.

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

    const { candidate_id, style, lyrics, asset_id } = await req.json()
    if (!STYLES.includes(style)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Estilo musical inválido.' }, { status: 400 })
    }
    if (typeof lyrics !== 'string' || lyrics.trim().length < 10) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Letra muito curta.' }, { status: 400 })
    }

    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidate_id)
      .eq('user_id', user.id)
      .single()
    if (!candidate) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Candidatura não encontrada.' }, { status: 404 })
    }

    let assetId: string
    let entitlementId: string
    let isRegen = false

    if (asset_id) {
      // ── Regravação de um jingle existente ────────────────────
      const { data: asset } = await supabase
        .from('assets')
        .select('id, candidate_id, metadata')
        .eq('id', asset_id)
        .eq('candidate_id', candidate_id)
        .single()
      if (!asset) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'Jingle não encontrado.' }, { status: 404 })
      }
      const meta = (asset.metadata ?? {}) as Record<string, unknown>
      entitlementId = typeof meta.entitlement_id === 'string' ? meta.entitlement_id : BYPASS_ENTITLEMENT

      const hasRegen = await consumeMusicRegen(entitlementId)
      if (!hasRegen) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'Você atingiu o limite de regravações deste jingle.' }, { status: 429 })
      }
      assetId = asset.id
      isRegen = true
      await supabase.from('assets').update({
        status: 'processing', lyrics: lyrics.trim(), output_url: null, error_message: null,
        metadata: { ...meta, style, step: 'generating_music' },
      }).eq('id', assetId)
    } else {
      // ── Primeira geração ─────────────────────────────────────
      const claimed = await claimEntitlement(candidate_id, 'jingle')
      if (!claimed) {
        return NextResponse.json<ApiResponse>(
          { success: false, error: 'Você ainda não contratou o jingle. Acesse a página de planos para liberar.' },
          { status: 402 },
        )
      }
      entitlementId = claimed
      const { data: asset, error } = await supabase
        .from('assets')
        .insert({
          candidate_id, asset_type: 'jingle', status: 'processing', ai_model: 'Suno-V5.5',
          lyrics: lyrics.trim(), metadata: { style, step: 'generating_music', entitlement_id: entitlementId },
        })
        .select('id').single()
      if (error || !asset) {
        await releaseEntitlement(entitlementId)
        return NextResponse.json<ApiResponse>({ success: false, error: 'Erro ao criar o jingle.' }, { status: 500 })
      }
      assetId = asset.id
    }

    // Dispara a música (callback do Suno finaliza; polling é fallback p/ dev)
    const taskId = await generateJingle(candidate as Candidate, lyrics.trim(), style as JingleStyle, assetId)
    await supabase.from('assets').update({ external_task_id: taskId }).eq('id', assetId)

    pollMusicFallback(assetId, candidate_id, taskId, entitlementId, isRegen)
      .catch(err => console.error('[jingle/music] poll error:', err))

    await logComplianceEvent({ event_type: 'JINGLE_GENERATION', candidate_id, asset_id: assetId, ai_model: 'Suno-V5.5' })

    return NextResponse.json<ApiResponse>(
      { success: true, data: { asset_id: assetId, status: 'processing' } },
      { status: 202 },
    )
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[jingle/music] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: detail }, { status: 500 })
  }
}

// Fallback para ambientes sem webhook público (dev). Em produção o webhook
// do Suno chega antes e marca 'done'; aqui só agimos se ainda estiver pendente.
async function pollMusicFallback(
  assetId: string, candidateId: string, taskId: string, entitlementId: string, isRegen: boolean,
) {
  const supabase = createServerClient()
  try {
    const audioUrl = await waitForMusic(taskId)
    const { data } = await supabase.from('assets').select('status').eq('id', assetId).single()
    if (data?.status === 'done') return // webhook já finalizou

    const persisted = await persistAudio(audioUrl, candidateId, assetId).catch(() => audioUrl)
    await supabase.from('assets').update({ status: 'done', output_url: persisted, preview_url: persisted }).eq('id', assetId)
    if (!isRegen) await consumeEntitlement(entitlementId, assetId)
  } catch (err) {
    const { data } = await supabase.from('assets').select('status').eq('id', assetId).single()
    if (data?.status !== 'done') {
      if (!isRegen) await releaseEntitlement(entitlementId)
      await supabase.from('assets').update({ status: 'failed', error_message: err instanceof Error ? err.message : 'Erro' }).eq('id', assetId)
    }
  }
}
