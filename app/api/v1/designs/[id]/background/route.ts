import { NextRequest, NextResponse } from 'next/server'
import { loadOwnedAsset } from '@/lib/asset-auth'
import { sanitizeDesign } from '@/lib/design'
import { generateBackground } from '@/lib/fal'
import { signedUrlFromPublic } from '@/lib/storage'
import type { ApiResponse, AssetType } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

const isBypass = () => process.env.STAGE_BYPASS_PAYMENT === 'true'

// ── POST /api/v1/designs/[id]/background ──────────────────────
// Gera um fundo decorativo por IA (sem texto/pessoas) e o grava no design.
// Consome cota ai_bg_gens_left do entitlement da peça (protege o custo de IA).

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await loadOwnedAsset(req, id)
  if ('error' in r) return r.error
  const { supabase, asset, cnpj } = r

  const assetType = asset.asset_type as AssetType
  if (assetType === 'jingle') {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Jingle não tem fundo visual.' }, { status: 400 })
  }

  const design = sanitizeDesign(asset.design, cnpj)
  if (!design) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Rascunho inválido.' }, { status: 400 })
  }

  const { prompt_hint } = await req.json().catch(() => ({ prompt_hint: undefined }))

  // Cota de gerações de fundo (pula em dev/staging)
  let entitlementForQuota: { id: string; ai_bg_gens_left: number } | null = null
  if (!isBypass()) {
    const { data: ent } = await supabase
      .from('entitlements')
      .select('id, ai_bg_gens_left')
      .eq('candidate_id', asset.candidate_id)
      .eq('asset_type', assetType)
      .in('status', ['available', 'in_use'])
      .order('created_at')
      .limit(1)
      .maybeSingle()

    if (!ent) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Contrate esta peça para usar fundos por IA.' },
        { status: 402 },
      )
    }
    if (ent.ai_bg_gens_left <= 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Você atingiu o limite de fundos por IA para esta peça.' },
        { status: 429 },
      )
    }
    entitlementForQuota = ent
  }

  try {
    const bgUrl = await generateBackground(
      assetType,
      design.colors.primary,
      `${asset.candidate_id}/bg_${assetType}_${id}_${Date.now()}.jpg`,
      typeof prompt_hint === 'string' ? prompt_hint.slice(0, 120) : undefined,
    )

    const newDesign = { ...design, background: { kind: 'ai' as const, value: bgUrl } }
    await supabase.from('assets').update({ design: newDesign }).eq('id', id)

    if (entitlementForQuota) {
      await supabase
        .from('entitlements')
        .update({ ai_bg_gens_left: entitlementForQuota.ai_bg_gens_left - 1 })
        .eq('id', entitlementForQuota.id)
    }

    const bg_media_url = await signedUrlFromPublic(bgUrl)
    return NextResponse.json<ApiResponse>({ success: true, data: { background_url: bg_media_url, design: newDesign } })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[designs/background] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: `Erro ao gerar fundo: ${detail}` }, { status: 500 })
  }
}
