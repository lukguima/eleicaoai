import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

// ── GET /api/v1/assets?candidate_id=xxx ───────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()

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

    const candidateId = req.nextUrl.searchParams.get('candidate_id')

    if (!candidateId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'candidate_id obrigatório.' },
        { status: 400 }
      )
    }

    // Verifica que o candidato pertence ao usuário autenticado (isolamento de tenant)
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('id', candidateId)
      .eq('user_id', user.id)
      .single()

    if (!candidate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Candidatura não encontrada.' },
        { status: 404 }
      )
    }

    // Busca assets filtrando por candidate_id (dupla proteção: app + RLS)
    const { data, error } = await supabase
      .from('assets')
      .select('id, asset_type, status, output_url, preview_url, lyrics, metadata, ai_model, error_message, created_at, updated_at')
      .eq('candidate_id', candidateId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Erro ao buscar assets.' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse>({ success: true, data })
  } catch (err) {
    console.error('[assets] GET error:', err)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno.' },
      { status: 500 }
    )
  }
}
