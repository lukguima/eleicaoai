import { NextRequest, NextResponse } from 'next/server'
import { loadOwnedAsset } from '@/lib/asset-auth'
import { sanitizeDesign } from '@/lib/design'
import { renderDesign, renderDesignToPdf } from '@/lib/render'
import { uploadToBucket, signedUrlFromPublic } from '@/lib/storage'
import { claimEntitlement, consumeEntitlement, releaseEntitlement } from '@/lib/entitlements'
import { logComplianceEvent } from '@/lib/compliance'
import { captureError, requestIdFrom } from '@/lib/log'
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

  const design = sanitizeDesign(asset.design, cnpj)
  if (!design) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'Rascunho vazio ou inválido. Edite a peça antes de gerar.' }, { status: 400 })
  }

  // Entitlement: reivindica só na 1ª finalização; guarda o id no metadata.
  const meta = (asset.metadata ?? {}) as Record<string, unknown>
  let entitlementId = typeof meta.entitlement_id === 'string' ? meta.entitlement_id : null
  const firstFinalization = !entitlementId
  if (firstFinalization) {
    entitlementId = await claimEntitlement(asset.candidate_id, assetType as Exclude<AssetType, 'jingle'>)
    if (!entitlementId) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Você ainda não contratou esta peça. Acesse a página de planos para liberar.' },
        { status: 402 },
      )
    }
  }

  try {
    await supabase.from('assets').update({ status: 'processing', error_message: null }).eq('id', id)

    const { png } = await renderDesign(design, assetType as Exclude<AssetType, 'jingle'>)
    const pngUrl = await uploadToBucket(`${asset.candidate_id}/${assetType}_${id}.png`, png, 'image/png')

    const pdf = await renderDesignToPdf(png, assetType as Exclude<AssetType, 'jingle'>)
    const pdfUrl = pdf ? await uploadToBucket(`${asset.candidate_id}/${assetType}_${id}.pdf`, pdf, 'application/pdf') : null

    await supabase.from('assets').update({
      status: 'done',
      output_url: pngUrl,
      preview_url: pngUrl,
      ai_model: 'template/satori',
      metadata: { ...meta, entitlement_id: entitlementId, pdf_url: pdfUrl },
    }).eq('id', id)

    if (firstFinalization) await consumeEntitlement(entitlementId!, id)

    await logComplianceEvent({
      event_type: 'IMAGE_GENERATION',
      candidate_id: asset.candidate_id,
      asset_id: id,
      ai_model: 'template/satori',
    })

    const media_url = await signedUrlFromPublic(pngUrl)
    const pdf_media_url = pdfUrl ? await signedUrlFromPublic(pdfUrl) : null

    return NextResponse.json<ApiResponse>({ success: true, data: { asset_id: id, media_url, pdf_url: pdf_media_url } })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    captureError(err, { request_id: requestIdFrom(req), tenant_id: asset.candidate_id, asset_id: id }, 'designs/render: falha ao renderizar')
    if (firstFinalization && entitlementId) await releaseEntitlement(entitlementId)
    await supabase.from('assets').update({ status: 'failed', error_message: detail }).eq('id', id)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Não foi possível gerar o arquivo. Tente novamente.' }, { status: 500 })
  }
}
