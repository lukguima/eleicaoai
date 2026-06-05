import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

// O e-mail do administrador para controle de acesso simples
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

    // 3. Busca TODOS os candidatos (clientes)
    const { data, error } = await supabase
      .from('candidates')
      .select('id, name, election_number, party, campaign_cnpj, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Erro ao buscar clientes.' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse>({ success: true, data })
  } catch (err) {
    console.error('[admin/candidates] GET error:', err)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno.' },
      { status: 500 }
    )
  }
}
