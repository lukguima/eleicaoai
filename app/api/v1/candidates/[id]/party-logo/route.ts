import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { validateMagicBytes } from '@/lib/validation'
import { uploadToBucket } from '@/lib/storage'
import { captureError, requestIdFrom } from '@/lib/log'
import type { ApiResponse } from '@/types'

export const runtime = 'nodejs'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const

export async function POST(
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

    const { id: candidateId } = await params
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('id', candidateId)
      .eq('user_id', user.id)
      .single()
    if (!candidate) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Candidatura não encontrada.' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('logo')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Campo "logo" obrigatório.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Logo deve ter no máximo 2 MB.' }, { status: 400 })
    }
    const mime = file.type as (typeof ALLOWED_MIME)[number]
    if (!ALLOWED_MIME.includes(mime)) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Formato inválido. Use JPEG, PNG ou WebP.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    try {
      validateMagicBytes(buffer, mime)
    } catch {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Arquivo inválido ou corrompido.' }, { status: 400 })
    }

    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
    const url = await uploadToBucket(`${candidateId}/party_logo_${Date.now()}.${ext}`, buffer, mime)
    await supabase
      .from('candidates')
      .update({ party_logo_url: url, show_party_logo: true })
      .eq('id', candidateId)
      .eq('user_id', user.id)

    return NextResponse.json<ApiResponse>({ success: true, data: { party_logo_url: url } })
  } catch (err) {
    captureError(err, { request_id }, 'party-logo: erro ao enviar logo')
    return NextResponse.json<ApiResponse>({ success: false, error: 'Não foi possível enviar a logo.' }, { status: 500 })
  }
}

export async function DELETE(
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

    const { id: candidateId } = await params
    const { data: candidate } = await supabase
      .from('candidates')
      .select('id')
      .eq('id', candidateId)
      .eq('user_id', user.id)
      .single()
    if (!candidate) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Candidatura não encontrada.' }, { status: 404 })
    }

    await supabase
      .from('candidates')
      .update({ party_logo_url: null })
      .eq('id', candidateId)
      .eq('user_id', user.id)

    return NextResponse.json<ApiResponse>({ success: true, data: { party_logo_url: null } })
  } catch (err) {
    captureError(err, { request_id }, 'party-logo: erro ao remover logo')
    return NextResponse.json<ApiResponse>({ success: false, error: 'Não foi possível remover a logo.' }, { status: 500 })
  }
}
