import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { validateMagicBytes } from '@/lib/validation'
import type { ApiResponse } from '@/types'

// ── POST /api/v1/candidates/[id]/photo ────────────────────────
// Recebe multipart/form-data com campo "photo" (JPEG/PNG/WebP),
// valida magic bytes server-side, faz upload no Supabase Storage
// e atualiza base_photo_url do candidato.

const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createServerClient()

    // 1. Autenticação
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Credenciais inválidas.' },
        { status: 401 },
      )
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Credenciais inválidas.' },
        { status: 401 },
      )
    }

    const { id: candidateId } = await params

    // 2. Verifica tenant
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id')
      .eq('id', candidateId)
      .eq('user_id', user.id)
      .single()

    if (candidateError || !candidate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Candidatura não encontrada.' },
        { status: 404 },
      )
    }

    // 3. Extrai arquivo do multipart
    const formData = await req.formData()
    const file = formData.get('photo')

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Campo "photo" obrigatório.' },
        { status: 400 },
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Foto deve ter no máximo 5 MB.' },
        { status: 400 },
      )
    }

    const mime = file.type as (typeof ALLOWED_MIME)[number]
    if (!ALLOWED_MIME.includes(mime)) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Formato inválido. Use JPEG, PNG ou WebP.' },
        { status: 400 },
      )
    }

    // 4. Valida magic bytes (não confia no MIME header do cliente)
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    try {
      validateMagicBytes(buffer, mime)
    } catch {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Arquivo inválido ou corrompido.' },
        { status: 400 },
      )
    }

    // 5. Upload para Supabase Storage (bucket: candidate-photos)
    const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'
    const storagePath = `${user.id}/${candidateId}/base_photo.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('candidate-photos')
      .upload(storagePath, buffer, {
        contentType: mime,
        upsert: true,       // permite re-upload
      })

    if (uploadError) {
      console.error('[photo] upload error:', uploadError)
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Erro ao fazer upload da foto.' },
        { status: 500 },
      )
    }

    // 6. Busca URL pública e atualiza candidato
    const { data: publicUrlData } = supabase.storage
      .from('candidate-photos')
      .getPublicUrl(storagePath)

    const photoUrl = publicUrlData.publicUrl

    await supabase
      .from('candidates')
      .update({ base_photo_url: photoUrl })
      .eq('id', candidateId)
      .eq('user_id', user.id)

    return NextResponse.json<ApiResponse>(
      { success: true, data: { base_photo_url: photoUrl } },
      { status: 200 },
    )
  } catch (err) {
    console.error('[photo] error:', err)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno ao processar foto.' },
      { status: 500 },
    )
  }
}
