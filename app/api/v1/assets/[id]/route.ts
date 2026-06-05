import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

// ── GET /api/v1/assets/[id] ───────────────────────────────────
// Busca um asset por ID. Verifica tenant via join com candidates.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createServerClient()

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Credenciais inválidas.' },
        { status: 401 },
      )
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Credenciais inválidas.' },
        { status: 401 },
      )
    }

    const { id: assetId } = await params

    // Busca o asset primeiro
    const { data: asset, error } = await supabase
      .from('assets')
      .select('id, asset_type, status, output_url, preview_url, lyrics, metadata, ai_model, error_message, created_at, updated_at, candidate_id')
      .eq('id', assetId)
      .single()

    if (error || !asset) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Asset não encontrado.' },
        { status: 404 },
      )
    }

    // Verifica isolamento de tenant: candidate deve pertencer ao usuário
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('id', asset.candidate_id)
      .eq('user_id', user.id)
      .single()

    if (!candidate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Asset não encontrado.' },
        { status: 404 },
      )
    }

    return NextResponse.json<ApiResponse>({ success: true, data: asset })
  } catch (err) {
    console.error('[assets/id] GET error:', err)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno.' },
      { status: 500 },
    )
  }
}
