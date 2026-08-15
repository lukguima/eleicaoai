import { createServerClient } from './supabase'
import { renderDesign, renderDesignToPdf } from './render'
import { uploadToBucket } from './storage'
import { claimEntitlement, consumeEntitlement, releaseEntitlement } from './entitlements'
import { logComplianceEvent } from './compliance'
import { log } from './log'
import type { AssetType, Design } from '@/types'

export type VisualType = Exclude<AssetType, 'jingle'>

/**
 * Rasteriza um design, sobe PNG/PDF e marca o asset como done.
 * Consome entitlement só na primeira finalização.
 */
export async function finalizeVisualAsset(params: {
  assetId: string
  candidateId: string
  assetType: VisualType
  design: Design
  existingMeta?: Record<string, unknown>
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const supabase = createServerClient()
  const meta = params.existingMeta ?? {}
  let entitlementId = typeof meta.entitlement_id === 'string' ? meta.entitlement_id : null
  const firstFinalization = !entitlementId

  if (firstFinalization) {
    entitlementId = await claimEntitlement(params.candidateId, params.assetType)
    if (!entitlementId) {
      return {
        ok: false,
        error: 'Você ainda não contratou esta peça. Acesse a página de planos para liberar.',
        status: 402,
      }
    }
  }

  try {
    await supabase.from('assets').update({ status: 'processing', error_message: null }).eq('id', params.assetId)

    const { png } = await renderDesign(params.design, params.assetType)
    const pngUrl = await uploadToBucket(
      `${params.candidateId}/${params.assetType}_${params.assetId}.png`,
      png,
      'image/png',
    )
    let pdfUrl: string | null = null
    try {
      const pdf = await renderDesignToPdf(png, params.assetType)
      if (pdf) {
        pdfUrl = await uploadToBucket(
          `${params.candidateId}/${params.assetType}_${params.assetId}.pdf`,
          pdf,
          'application/pdf',
        )
      }
    } catch (err) {
      log.warn(
        { tenant_id: params.candidateId, asset_id: params.assetId },
        `finalize: PDF opcional falhou (${err instanceof Error ? err.message : String(err)}) — PNG segue`,
      )
    }

    await supabase.from('assets').update({
      status: 'done',
      output_url: pngUrl,
      preview_url: pngUrl,
      design: params.design,
      ai_model: 'EleiçãoAI · template',
      metadata: { ...meta, entitlement_id: entitlementId, pdf_url: pdfUrl },
    }).eq('id', params.assetId)

    if (firstFinalization) await consumeEntitlement(entitlementId!, params.assetId)

    await logComplianceEvent({
      event_type: 'IMAGE_GENERATION',
      candidate_id: params.candidateId,
      asset_id: params.assetId,
      ai_model: 'EleiçãoAI · template',
    })

    return { ok: true }
  } catch (err) {
    if (firstFinalization && entitlementId) await releaseEntitlement(entitlementId)
    await supabase.from('assets').update({
      status: 'failed',
      error_message: err instanceof Error ? err.message : String(err),
    }).eq('id', params.assetId)
    throw err
  }
}
