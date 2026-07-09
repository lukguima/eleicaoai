import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateLyrics } from '@/lib/lyrics'
import { rateLimit } from '@/lib/rate-limit'
import { captureError, requestIdFrom } from '@/lib/log'
import type { ApiResponse, Candidate, JingleStyle } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const STYLES: JingleStyle[] = ['Sertanejo Universitário', 'Forró', 'Funk Gospel', 'MPB', 'Pagode', 'Rap Político']

// ── POST /api/v1/jingle/lyrics ────────────────────────────────
// Gera a letra do jingle (LLM, síncrono). Não consome nada — o usuário
// revisa/edita/regenera à vontade antes de gastar a música.

export async function POST(req: NextRequest) {
  const request_id = requestIdFrom(req)
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

    const rl = rateLimit(`lyrics:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Muitas gerações de letra. Aguarde alguns minutos.' }, { status: 429 })
    }

    const { candidate_id, style, extra } = await req.json()
    if (!STYLES.includes(style)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Estilo musical inválido.' }, { status: 400 })
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

    const lyrics = await generateLyrics(candidate as Candidate, style as JingleStyle, typeof extra === 'string' ? extra : undefined)
    return NextResponse.json<ApiResponse>({ success: true, data: { lyrics } })
  } catch (err) {
    captureError(err, { request_id }, 'jingle/lyrics: erro ao gerar letra')
    return NextResponse.json<ApiResponse>({ success: false, error: 'Não foi possível gerar a letra. Tente novamente.' }, { status: 500 })
  }
}
