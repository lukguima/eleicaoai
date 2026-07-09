import { createServerClient } from '@/lib/supabase'
import { grantEntitlements, PACKAGE_ASSET_TYPES } from '@/lib/entitlements'
import type { AssetType, ProductType } from '@/types'

// ============================================================
// Helpers de pedido: preços (fonte = tabela products), expansão de
// itens em tipos de peça e concessão de entitlements ao pagar.
// ============================================================

export const AVULSO_TYPES: AssetType[] = ['santinho', 'banner', 'perfurado', 'social', 'jingle']

export function isValidProductType(t: string): t is ProductType {
  return t === 'pacote' || (AVULSO_TYPES as string[]).includes(t)
}

/** Expande os itens do pedido nos tipos de peça que cada um libera. */
export function expandToAssetTypes(itemTypes: string[]): AssetType[] {
  const set = new Set<AssetType>()
  for (const t of itemTypes) {
    if (t === 'pacote') PACKAGE_ASSET_TYPES.forEach(a => set.add(a))
    else if ((AVULSO_TYPES as string[]).includes(t)) set.add(t as AssetType)
  }
  return [...set]
}

export interface PricedItem {
  type: ProductType
  label: string
  price_cents: number
}

/** Busca preços/labels atuais no banco para os tipos pedidos (só ativos). */
export async function priceItems(itemTypes: string[]): Promise<PricedItem[] | null> {
  const types = [...new Set(itemTypes)].filter(isValidProductType)
  if (types.length === 0) return null

  const supabase = createServerClient()
  const { data } = await supabase
    .from('products')
    .select('type, label, price, active')
    .in('type', types)

  const byType = new Map((data ?? []).map(p => [p.type, p]))
  const items: PricedItem[] = []
  for (const t of types) {
    const p = byType.get(t)
    if (!p || !p.active) return null // item indisponível → pedido inválido
    items.push({ type: t, label: p.label, price_cents: p.price })
  }
  return items
}

/** Concede os entitlements de um pedido pago (idempotente). */
export async function grantOrderEntitlements(orderId: string, candidateId: string): Promise<void> {
  const supabase = createServerClient()
  const { data: items } = await supabase
    .from('order_items')
    .select('product_type')
    .eq('order_id', orderId)
  const assetTypes = expandToAssetTypes((items ?? []).map(i => i.product_type))
  await grantEntitlements(orderId, candidateId, assetTypes)
}
