import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { defaultDesignFromCandidate } from '@/lib/design'
import { getRenderSpec } from '@/components/templates/registry'
import { captureError, requestIdFrom } from '@/lib/log'
import type { ApiResponse, Candidate } from '@/types'

// ── POST /api/v1/designs ──────────────────────────────────────
// Cria um rascunho de peça visual (status 'pending') pré-preenchido
// com os dados do candidato. Não consome entitlement (rascunho é grátis).

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

    const { candidate_id, asset_type, template_id } = await req.json()

    if (!getRenderSpec(asset_type)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Tipo de peça inválido.' }, { status: 400 })
    }

    // Isolamento de tenant
    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidate_id)
      .eq('user_id', user.id)
      .single()
    if (!candidate) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Candidatura não encontrada.' }, { status: 404 })
    }

    // Reaproveita um rascunho pendente do mesmo tipo (evita acúmulo de assets
    // a cada abertura do editor). Só cria um novo se não houver rascunho editável.
    const { data: existing } = await supabase
      .from('assets')
      .select('id, design')
      .eq('candidate_id', candidate_id)
      .eq('asset_type', asset_type)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (existing) {
      return NextResponse.json<ApiResponse>({ success: true, data: { asset_id: existing.id, design: existing.design } })
    }

    const design = defaultDesignFromCandidate(candidate as Candidate, template_id)

    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        candidate_id,
        asset_type,
        status: 'pending',
        design,
        metadata: { editor: true },
      })
      .select('id, design')
      .single()

    if (assetError || !asset) {
      captureError(assetError, { request_id, tenant_id: candidate_id, user_id: user.id }, 'designs: erro ao criar rascunho')
      return NextResponse.json<ApiResponse>({ success: false, error: 'Erro ao criar rascunho.' }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({ success: true, data: { asset_id: asset.id, design: asset.design } }, { status: 201 })
  } catch (err) {
    captureError(err, { request_id }, 'designs: erro inesperado ao criar rascunho')
    return NextResponse.json<ApiResponse>({ success: false, error: 'Erro ao criar rascunho.' }, { status: 500 })
  }
}
