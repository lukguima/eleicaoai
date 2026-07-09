import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

// ── GET /api/v1/orders/[id] ───────────────────────────────────
// Status do pedido + entitlements liberados (para a página de sucesso e dashboard).

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { id } = await params
    const { data: order } = await supabase
      .from('orders')
      .select('id, status, amount_cents, candidate_id, created_at, order_items(product_type, price_cents)')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!order) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Pedido não encontrado.' }, { status: 404 })
    }

    const { data: entitlements } = await supabase
      .from('entitlements')
      .select('asset_type, status')
      .eq('order_id', id)

    return NextResponse.json<ApiResponse>({ success: true, data: { ...order, entitlements: entitlements ?? [] } })
  } catch (err) {
    console.error('[orders/id] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Erro interno.' }, { status: 500 })
  }
}
