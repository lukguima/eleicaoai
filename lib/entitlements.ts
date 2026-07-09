import { createServerClient } from './supabase'
import { log } from './log'
import type { AssetType } from '@/types'

// ============================================================
// Entitlements — direito de criar UMA peça de um tipo.
// Substitui o antigo modelo de créditos/assinatura.
// Um pedido pago gera entitlements; a geração os consome.
// ============================================================

/** Os 5 tipos de peça incluídos no Pacote Campanha Completa. */
export const PACKAGE_ASSET_TYPES: AssetType[] = [
  'santinho', 'banner', 'perfurado', 'social', 'jingle',
]

/** Sentinela retornada quando a cobrança está desativada (dev/staging). */
export const BYPASS_ENTITLEMENT = 'bypass'

/** Em dev/staging pula a exigência de pagamento. Nunca definir em produção. */
function isBypass(): boolean {
  return process.env.STAGE_BYPASS_PAYMENT === 'true'
}

/**
 * Reivindica atomicamente um entitlement disponível para o tipo pedido.
 * Retorna o id do entitlement, BYPASS_ENTITLEMENT (dev) ou null (sem direito).
 */
export async function claimEntitlement(
  candidateId: string,
  assetType: AssetType,
): Promise<string | null> {
  if (isBypass()) return BYPASS_ENTITLEMENT

  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('claim_entitlement', {
    p_candidate_id: candidateId,
    p_asset_type: assetType,
  })

  if (error) {
    log.error({ tenant_id: candidateId, asset_type: assetType }, `entitlements: erro no claim — ${error.message}`)
    return null
  }
  return (data as string | null) ?? null
}

/**
 * Devolve um entitlement para 'available' (ex.: geração falhou antes de concluir).
 * No-op quando é o sentinela de bypass.
 */
export async function releaseEntitlement(entitlementId: string): Promise<void> {
  if (!entitlementId || entitlementId === BYPASS_ENTITLEMENT) return
  const supabase = createServerClient()
  await supabase
    .from('entitlements')
    .update({ status: 'available', asset_id: null })
    .eq('id', entitlementId)
}

/**
 * Marca o entitlement como consumido e associa o asset final gerado.
 * No-op quando é o sentinela de bypass.
 */
export async function consumeEntitlement(entitlementId: string, assetId: string): Promise<void> {
  if (!entitlementId || entitlementId === BYPASS_ENTITLEMENT) return
  const supabase = createServerClient()
  await supabase
    .from('entitlements')
    .update({ status: 'consumed', asset_id: assetId })
    .eq('id', entitlementId)
}

/**
 * Decrementa a cota de regravação de música de um jingle, de forma atômica.
 * Retorna true se havia cota disponível.
 */
export async function consumeMusicRegen(entitlementId: string): Promise<boolean> {
  if (isBypass()) return true
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('consume_music_regen', {
    p_entitlement_id: entitlementId,
  })
  if (error) {
    log.error({ entitlement_id: entitlementId }, `entitlements: erro ao consumir regravação — ${error.message}`)
    return false
  }
  return data as boolean
}

/**
 * Cria entitlements para um pedido pago, de forma idempotente.
 * Chamado pelo webhook do Mercado Pago. A constraint UNIQUE(order_id, asset_type)
 * garante que reentregas do webhook não dupliquem direitos.
 */
export async function grantEntitlements(
  orderId: string,
  candidateId: string,
  assetTypes: AssetType[],
): Promise<void> {
  if (assetTypes.length === 0) return
  const supabase = createServerClient()
  const rows = assetTypes.map(t => ({
    order_id: orderId,
    candidate_id: candidateId,
    asset_type: t,
  }))
  await supabase
    .from('entitlements')
    .upsert(rows, { onConflict: 'order_id,asset_type', ignoreDuplicates: true })
}

/** Lista os entitlements de um candidato (usado pelo dashboard "Minha Campanha"). */
export async function listEntitlements(candidateId: string) {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('entitlements')
    .select('*')
    .eq('candidate_id', candidateId)
    .order('created_at')
  return data ?? []
}
