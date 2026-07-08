import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateLyrics, generateJingle, waitForLyrics, waitForMusic } from '@/lib/suno'
import { persistAudio } from '@/lib/storage'
import { jingleRequestSchema } from '@/lib/validation'
import { logComplianceEvent } from '@/lib/compliance'
import { claimEntitlement, consumeEntitlement, releaseEntitlement } from '@/lib/entitlements'
import type { ApiResponse, Candidate, JingleStyle } from '@/types'

// ── POST /api/v1/assets/jingle ────────────────────────────────
// Etapa 1 do fluxo: cria o asset e dispara geração de letra.
// A letra chega via webhook → webhook dispara geração de música.

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()

    // 1. Autenticação
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Credenciais inválidas.' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Credenciais inválidas.' },
        { status: 401 }
      )
    }

    // 2. Validação de input
    const body = await req.json()
    const parsed = jingleRequestSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { candidate_id, style } = parsed.data

    // 3. Verifica que o candidato pertence ao usuário autenticado (isolamento de tenant)
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidate_id)
      .eq('user_id', user.id)   // NUNCA confia no candidate_id sem verificar o user_id
      .single()

    if (candidateError || !candidate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Candidatura não encontrada.' },
        { status: 404 }
      )
    }

    // 4. Reivindica o direito de criar o jingle (pagamento libera entitlements)
    const entitlementId = await claimEntitlement(candidate_id, 'jingle')
    if (!entitlementId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Você ainda não contratou o jingle. Acesse a página de planos para liberar.' },
        { status: 402 }
      )
    }

    // 5. Cria registro do asset com status 'pending'
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        candidate_id,
        asset_type: 'jingle',
        status: 'pending',
        ai_model: 'Suno-V5.5',
        metadata: { style, step: 'awaiting_lyrics' },
      })
      .select()
      .single()

    if (assetError || !asset) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Erro ao criar registro de asset.' },
        { status: 500 }
      )
    }

    // 6. Dispara geração de letra (assíncrono via webhook)
    const taskId = await generateLyrics(candidate as Candidate, style as JingleStyle, asset.id)

    // 7. Atualiza asset com o taskId e muda status para 'processing'
    await supabase
      .from('assets')
      .update({
        status: 'processing',
        external_task_id: taskId,
        metadata: { style, step: 'generating_lyrics', lyrics_task_id: taskId },
      })
      .eq('id', asset.id)
      .eq('candidate_id', candidate_id) // dupla proteção

    // 8. Polling em background — garante atualização mesmo sem webhook público (dev local)
    pollJingleAndUpdate(asset.id, candidate_id, taskId, candidate as Candidate, style as JingleStyle, entitlementId)
      .catch(err => console.error('[jingle] polling error:', err))

    // 9. Registra no log de compliance (LGPD)
    await logComplianceEvent({
      event_type: 'JINGLE_GENERATION',
      candidate_id,
      asset_id: asset.id,
      ai_model: 'Suno-V5.5',
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          asset_id: asset.id,
          status: 'processing',
          message: 'Letra sendo gerada. O jingle ficará pronto em alguns minutos.',
        },
      },
      { status: 202 }
    )
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[jingle] error:', err)
    return NextResponse.json<ApiResponse>(
      { success: false, error: `Erro ao gerar jingle: ${detail}` },
      { status: 500 }
    )
  }
}

// ── Polling background ────────────────────────────────────────
// Fallback para ambientes sem webhook público (dev local).
// Em produção o webhook chega antes e o polling para na 1ª checagem.

async function pollJingleAndUpdate(
  assetId: string,
  candidateId: string,
  lyricsTaskId: string,
  candidate: Candidate,
  style: JingleStyle,
  entitlementId: string,
) {
  const supabase = createServerClient()

  try {
    // Etapa 1: aguarda letra
    const lyrics = await waitForLyrics(lyricsTaskId)

    // Salva letra e dispara geração de música
    const musicTaskId = await generateJingle(candidate, lyrics, style, assetId)

    await supabase
      .from('assets')
      .update({
        lyrics,
        external_task_id: musicTaskId,
        metadata: { style, step: 'generating_music', music_task_id: musicTaskId },
      })
      .eq('id', assetId)
      .eq('candidate_id', candidateId)

    // Etapa 2: aguarda música e persiste no Storage
    const audioUrl = await waitForMusic(musicTaskId)
    const persistedUrl = await persistAudio(audioUrl, candidateId, assetId).catch(() => audioUrl)

    await supabase
      .from('assets')
      .update({ status: 'done', output_url: persistedUrl })
      .eq('id', assetId)
      .eq('candidate_id', candidateId)

    await consumeEntitlement(entitlementId, assetId)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'

    // Só atualiza para 'failed' se ainda não estiver 'done' (webhook pode ter chegado antes)
    const { data } = await supabase
      .from('assets')
      .select('status')
      .eq('id', assetId)
      .single()

    if (data?.status !== 'done') {
      // Devolve o direito ao candidato — falha não deve "gastar" o jingle
      await releaseEntitlement(entitlementId)
      await supabase
        .from('assets')
        .update({ status: 'failed', error_message: msg })
        .eq('id', assetId)
        .eq('candidate_id', candidateId)
    }
  }
}
