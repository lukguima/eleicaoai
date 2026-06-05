import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

// GET /api/v1/products?type=santinho
// Endpoint público — retorna produtos ativos. Nenhuma autenticação necessária.
// (A tabela products tem RLS: FOR SELECT USING (true))

export async function GET(req: NextRequest) {
  try {
    const type = req.nextUrl.searchParams.get('type')
    const supabase = createServerClient()

    let query = supabase
      .from('products')
      .select('type, label, description, price, active')
      .eq('active', true)

    if (type) query = query.eq('type', type)

    const { data, error } = await query

    if (error) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Erro ao buscar produtos.' }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({ success: true, data })
  } catch (err) {
    console.error('[products] GET error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Erro interno.' }, { status: 500 })
  }
}
