import { NextRequest, NextResponse } from 'next/server'
import { loadOwnedAsset } from '@/lib/asset-auth'
import { sanitizeDesign } from '@/lib/design'
import { finalizeVisualAsset } from '@/lib/finalize-design'
import { signedUrlFromPublic } from '@/lib/storage'
import { captureError, requestIdFrom } from '@/lib/log'
import { quietPeriodResponse } from '@/lib/quiet-period'
import type { ApiResponse, AssetType } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60

// ── POST /api/v1/designs/[id]/render ──────────────────────────
// Rasteriza o design em PNG (resolução de gráfica) + PDF e finaliza a peça.
// Consome o entitlement na PRIMEIRA finalização; re-renders (revisões) são livres.

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await loadOwnedAsset(req, id)
  if ('error' in r) return r.error
  const { supabase, asset, cnpj } = r

  const assetType = asset.asset_type as AssetType
  if (assetType === 'jingle') {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Jingle não é renderizado aqui.' }, { status: 400 })
  }

  const blocked = quietPeriodResponse()
  if (blocked) return blocked

  const design = sanitizeDesign(asset.design, cnpj)
  if (!design) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Rascunho vazio ou inválido. Edite a peça antes de gerar.' }, { status: 400 })
  }

  try {
    const result = await finalizeVisualAsset({
      assetId: id,
      candidateId: asset.candidate_id,
      assetType: assetType as Exclude<AssetType, 'jingle'>,
      design,
      existingMeta: (asset.metadata ?? {}) as Record<string, unknown>,
    })
    if (!result.ok) {
      return NextResponse.json<ApiResponse>({ success: false, error: result.error }, { status: result.status })
    }

    const { data: updated } = await supabase.from('assets').select('output_url, metadata').eq('id', id).single()
    const pngUrl = updated?.output_url as string | undefined
    const pdfUrl = (updated?.metadata as Record<string, unknown> | null)?.pdf_url
    const media_url = pngUrl ? await signedUrlFromPublic(pngUrl) : null
    const pdf_media_url = typeof pdfUrl === 'string' ? await signedUrlFromPublic(pdfUrl) : null

    return NextResponse.json<ApiResponse>({ success: true, data: { asset_id: id, media_url, pdf_url: pdf_media_url } })
  } catch (err) {
    captureError(err, { request_id: requestIdFrom(req), tenant_id: asset.candidate_id, asset_id: id }, 'designs/render: falha ao renderizar')
    return NextResponse.json<ApiResponse>({ success: false, error: 'Não foi possível gerar o arquivo. Tente novamente.' }, { status: 500 })
  }
}
