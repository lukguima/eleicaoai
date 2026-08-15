import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { candidateUpdateSchema } from '@/lib/validation'
import { encryptCpf, validateCpf } from '@/lib/compliance'
import { captureError, requestIdFrom } from '@/lib/log'
import { publicSlug } from '@/lib/slug'
import type { ApiResponse } from '@/types'

const PUBLIC_FIELDS =
  'id, name, election_number, party, campaign_cnpj, slogan, biography_summary, primary_color, secondary_color, base_photo_url, base_photo_cutout_url, office, uf, visual_style, jingle_style, public_slug, whatsapp, party_logo_url, show_party_logo, created_at'

// ── PATCH /api/v1/candidates/[id] ─────────────────────────────
// Atualiza os dados cadastrais do candidato do próprio usuário.

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const request_id = requestIdFrom(req)
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
    const { data: existing } = await supabase
      .from('candidates')
      .select('id, name, election_number, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()
    if (!existing) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Candidatura não encontrada.' }, { status: 404 })
    }

    const parsed = candidateUpdateSchema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>({ success: false, error: parsed.error.issues[0].message }, { status: 400 })
    }
    const input = parsed.data
    const patch: Record<string, unknown> = {}

    if (input.name !== undefined) patch.name = input.name
    if (input.election_number !== undefined) patch.election_number = input.election_number
    if (input.party !== undefined) patch.party = input.party
    if (input.campaign_cnpj) patch.campaign_cnpj = input.campaign_cnpj
    if (input.slogan !== undefined) patch.slogan = input.slogan || null
    if (input.biography_summary !== undefined) patch.biography_summary = input.biography_summary
    if (input.primary_color !== undefined) patch.primary_color = input.primary_color
    if (input.secondary_color !== undefined) patch.secondary_color = input.secondary_color
    if (input.office !== undefined) patch.office = input.office
    if (input.uf !== undefined) patch.uf = input.uf
    if (input.visual_style !== undefined) patch.visual_style = input.visual_style
    if (input.jingle_style !== undefined) patch.jingle_style = input.jingle_style
    if (input.whatsapp !== undefined) patch.whatsapp = input.whatsapp.replace(/\D/g, '').slice(0, 13) || null
    if (input.show_party_logo !== undefined) patch.show_party_logo = input.show_party_logo

    if (input.cpf) {
      if (!validateCpf(input.cpf)) {
        return NextResponse.json<ApiResponse>({ success: false, error: 'CPF inválido.' }, { status: 400 })
      }
      patch.cpf_encrypted = await encryptCpf(input.cpf)
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Nada para atualizar.' }, { status: 400 })
    }

    const nextName = (patch.name as string) ?? existing.name
    const nextNumber = (patch.election_number as string) ?? existing.election_number
    if (patch.name !== undefined || patch.election_number !== undefined) {
      patch.public_slug = publicSlug(nextName, nextNumber)
    }

    let { data: updated, error } = await supabase
      .from('candidates')
      .update(patch)
      .eq('id', id)
      .eq('user_id', user.id)
      .select(PUBLIC_FIELDS)
      .single()

    if (error?.code === '23505' && patch.public_slug) {
      patch.public_slug = `${publicSlug(nextName, nextNumber)}-${user.id.slice(0, 6)}`
      const retry = await supabase
        .from('candidates')
        .update(patch)
        .eq('id', id)
        .eq('user_id', user.id)
        .select(PUBLIC_FIELDS)
        .single()
      updated = retry.data
      error = retry.error
    }

    if (error || !updated) {
      captureError(error, { request_id, tenant_id: id, user_id: user.id }, 'candidates: erro ao atualizar')
      return NextResponse.json<ApiResponse>({ success: false, error: 'Não foi possível salvar os dados.' }, { status: 500 })
    }

    return NextResponse.json<ApiResponse>({ success: true, data: updated })
  } catch (err) {
    captureError(err, { request_id }, 'candidates: erro inesperado ao atualizar')
    return NextResponse.json<ApiResponse>({ success: false, error: 'Não foi possível salvar os dados.' }, { status: 500 })
  }
}
