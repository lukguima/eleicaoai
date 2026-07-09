import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

// ── GET /api/v1/campaign ──────────────────────────────────────
// Retorna candidato + entitlements + assets do candidato num só request,
// para montar o painel "Minha Campanha".

export async function GET(req: NextRequest) {
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

    const { data: candidate } = await supabase
      .from('candidates')
      .select('id, name, election_number, party, base_photo_url')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!candidate) {
      return NextResponse.json<ApiResponse>({ success: true, data: { candidate: null, entitlements: [], assets: [] } })
    }

    const [{ data: entitlements }, { data: assets }] = await Promise.all([
      supabase.from('entitlements')
        .select('id, asset_type, status, asset_id, music_regens_left')
        .eq('candidate_id', candidate.id),
      supabase.from('assets')
        .select('id, asset_type, status, output_url, created_at')
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false }),
    ])

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { candidate, entitlements: entitlements ?? [], assets: assets ?? [] },
    })
  } catch (err) {
    console.error('[campaign] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Erro interno.' }, { status: 500 })
  }
}
