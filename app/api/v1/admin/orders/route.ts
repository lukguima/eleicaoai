import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

const ADMIN_EMAIL = 'lucasguimasilva02@gmail.com'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()

    // 1. Autenticação
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Credenciais inválidas.' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Credenciais inválidas.' },
        { status: 401 }
      )
    }

    // 2. Verificação de Admin
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Acesso negado. Você não é um administrador.' },
        { status: 403 }
      )
    }

    // 3. Busca TODAS as inscrições/compras com dados do candidato
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        id,
        plan,
        credits_remaining,
        created_at,
        candidates (
          name,
          party
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[admin/orders] fetch error:', error)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Erro ao buscar pedidos.' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse>({ success: true, data })
  } catch (err) {
    console.error('[admin/orders] GET error:', err)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno.' },
      { status: 500 }
    )
  }
}
