import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { ApiResponse } from '@/types'

const ADMIN_EMAIL = 'lucasguimasilva02@gmail.com'

// GET /api/v1/admin/content
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()

    // Autenticação
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }

    // Verificação de Admin
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Acesso negado.' }, { status: 403 })
    }

    const { data, error } = await supabase.from('site_content').select('*')

    if (error) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Erro ao buscar conteúdo.' }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({ success: true, data })
  } catch (err) {
    console.error('[admin/content] GET error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Erro interno.' }, { status: 500 })
  }
}

// PUT /api/v1/admin/content
export async function PUT(req: NextRequest) {
  try {
    const supabase = createServerClient()

    // Autenticação
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }

    // Verificação de Admin
    if (user.email !== ADMIN_EMAIL) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Acesso negado.' }, { status: 403 })
    }

    const body = await req.json()
    const { key, value } = body

    if (!key || value === undefined) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Chave e valor são obrigatórios.' }, { status: 400 })
    }

    const { error } = await supabase
      .from('site_content')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' })

    if (error) {
      console.error('[admin/content] upsert error:', error)
      return NextResponse.json<ApiResponse>({ success: false, error: 'Erro ao atualizar conteúdo.' }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({ success: true, data: { key, value } })
  } catch (err) {
    console.error('[admin/content] PUT error:', err)
    return NextResponse.json<ApiResponse>({ success: false, error: 'Erro interno.' }, { status: 500 })
  }
}
