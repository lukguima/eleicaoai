import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { candidateSchema } from '@/lib/validation'
import { encryptCpf, validateCpf, logComplianceEvent } from '@/lib/compliance'
import { captureError, requestIdFrom } from '@/lib/log'
import type { ApiResponse } from '@/types'

// ── POST /api/v1/candidates ───────────────────────────────────

export async function POST(req: NextRequest) {
  const request_id = requestIdFrom(req)
  try {
    const supabase = createServerClient()

    // 1. Autenticação — extrai user do JWT do cookie (nunca do body)
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

    // 2. Validação de schema + limites de tamanho (Zod)
    const body = await req.json()
    const parsed = candidateSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const input = parsed.data

    // 3. Validação de CPF (algoritmo)
    if (!validateCpf(input.cpf)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'CPF inválido.' },
        { status: 400 }
      )
    }

    // 4. Criptografa CPF — NUNCA persiste em plain text
    const cpf_encrypted = await encryptCpf(input.cpf)

    // 5. Verifica se o usuário já tem um candidato (1 conta = 1 candidato)
    const { count } = await supabase
      .from('candidates')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) > 0) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Você já possui um candidato cadastrado.' },
        { status: 409 }
      )
    }

    // 6. Insere candidate — candidate_id vem do user autenticado (NÃO do body)
    const { data: candidate, error: insertError } = await supabase
      .from('candidates')
      .insert({
        user_id:           user.id,       // injetado pelo backend
        name:              input.name,
        election_number:   input.election_number,
        party:             input.party,
        campaign_cnpj:     input.campaign_cnpj,
        slogan:            input.slogan ?? null,
        biography_summary: input.biography_summary,
        cpf_encrypted,
        primary_color:     input.primary_color ?? '#1a56db',
        secondary_color:   input.secondary_color ?? '#ffffff',
      })
      .select()
      .single()

    if (insertError || !candidate) {
      captureError(insertError, { request_id, user_id: user.id }, 'candidates: erro ao inserir candidatura')
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Erro ao criar candidatura.' },
        { status: 500 }
      )
    }

    // Os direitos de criação (entitlements) são liberados quando um pedido é pago
    // (webhook do Mercado Pago). O cadastro do candidato não concede nada por si só.

    return NextResponse.json<ApiResponse>({ success: true, data: { id: candidate.id } }, { status: 201 })
  } catch (err) {
    captureError(err, { request_id }, 'candidates: erro inesperado no cadastro')
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro ao criar candidatura.' },
      { status: 500 }
    )
  }
}

// ── GET /api/v1/candidates ────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()

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

    // Filtra SEMPRE por user_id — nunca retorna lista sem filtro de tenant
    const { data, error } = await supabase
      .from('candidates')
      .select('id, name, election_number, party, campaign_cnpj, slogan, biography_summary, primary_color, secondary_color, base_photo_url, base_photo_cutout_url, created_at')
      .eq('user_id', user.id)   // dupla proteção: app + RLS
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Erro ao buscar candidaturas.' },
        { status: 500 }
      )
    }

    return NextResponse.json<ApiResponse>({ success: true, data })
  } catch (err) {
    captureError(err, { request_id: requestIdFrom(req) }, 'candidates: erro ao listar candidaturas')
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro ao buscar candidaturas.' },
      { status: 500 }
    )
  }
}
