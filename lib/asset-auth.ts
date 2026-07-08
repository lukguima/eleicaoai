import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface OwnedAsset {
  supabase: SupabaseClient
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asset: any
  userId: string
  cnpj: string
}

/**
 * Autentica pelo Bearer token e confirma que o asset pertence ao usuário
 * (via candidate.user_id). Retorna { error } com a resposta pronta, ou os dados.
 */
export async function loadOwnedAsset(
  req: NextRequest,
  assetId: string,
): Promise<{ error: NextResponse } | OwnedAsset> {
  const supabase = createServerClient()

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 }) }
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { error: NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 }) }
  }

  const { data: asset } = await supabase
    .from('assets')
    .select('*, candidates!inner(user_id, campaign_cnpj)')
    .eq('id', assetId)
    .single()

  const cand = asset ? (Array.isArray(asset.candidates) ? asset.candidates[0] : asset.candidates) : null
  if (!asset || !cand || cand.user_id !== user.id) {
    return { error: NextResponse.json<ApiResponse>({ success: false, error: 'Peça não encontrada.' }, { status: 404 }) }
  }

  return { supabase, asset, userId: user.id, cnpj: cand.campaign_cnpj as string }
}
