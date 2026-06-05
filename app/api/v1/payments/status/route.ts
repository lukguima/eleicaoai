import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

// GET /api/v1/payments/status?ref={paymentId}
// Usado pela página de sucesso para saber quando a geração foi disparada.

export async function GET(req: NextRequest) {
  const ref = req.nextUrl.searchParams.get('ref')
  if (!ref) {
    return NextResponse.json<ApiResponse>({ success: false, error: 'ref obrigatório.' }, { status: 400 })
  }

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

    const { data: payment } = await supabase
      .from('payments')
      .select('id, status, asset_id')
      .eq('id', ref)
      .eq('user_id', user.id)
      .single()

    if (!payment) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Pagamento não encontrado.' }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { status: payment.status, asset_id: payment.asset_id ?? null },
    })
  } catch (err) {
    console.error('[payments/status] error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Erro interno.' }, { status: 500 })
  }
}
