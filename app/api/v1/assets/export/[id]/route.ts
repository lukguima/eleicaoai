import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { injectImageWatermark, fetchImageAsBuffer } from '@/lib/watermark'
import { logComplianceEvent } from '@/lib/compliance'
import type { ApiResponse, AssetType } from '@/types'

// ── GET /api/v1/assets/export/[id] ───────────────────────────
// Único ponto de download autorizado. Nunca expõe a URL bruta
// do Higgsfield ao cliente — watermark é injetado server-side.
//
// Zero Trust: auth → tenant isolation → watermark → stream.

export async function GET(
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

    const { id: assetId } = await params

    // 2. Busca asset + verifica tenant (asset → candidate → user_id)
    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .select('id, asset_type, status, output_url, candidate_id, ai_model, candidates(user_id, campaign_cnpj, name)')
      .eq('id', assetId)
      .single()

    if (assetError || !asset) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Asset não encontrado.' },
        { status: 404 },
      )
    }

    // Isolamento de tenant: verifica se o candidato pertence ao usuário
    // Supabase retorna array para relações — pegamos o primeiro elemento
    const candidateRaw = Array.isArray(asset.candidates) ? asset.candidates[0] : asset.candidates
    const candidate = candidateRaw as { user_id: string; campaign_cnpj: string; name: string } | null
    if (!candidate || candidate.user_id !== user.id) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Asset não encontrado.' },
        { status: 404 },
      )
    }

    // 3. Valida que o asset está pronto
    if (asset.status !== 'done') {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Asset ainda não está pronto para download.' },
        { status: 409 },
      )
    }

    if (!asset.output_url) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'URL de saída não disponível.' },
        { status: 500 },
      )
    }

    // 4. Jingle: redireciona diretamente (áudio não passa por Sharp)
    //    A conformidade de áudio já foi injetada em lib/suno.ts (AUDIO_COMPLIANCE_INTRO)
    if (asset.asset_type === 'jingle') {
      await logComplianceEvent({
        event_type: 'EXPORT',
        candidate_id: asset.candidate_id,
        asset_id: asset.id,
        ai_model: 'Suno-V5.5',
      })
      // Proxy do arquivo de áudio para não vazar a URL da Suno
      const audioRes = await fetch(asset.output_url, { signal: AbortSignal.timeout(30_000) })
      if (!audioRes.ok) throw new Error('Falha ao buscar áudio')
      const audioBuffer = await audioRes.arrayBuffer()
      return new NextResponse(audioBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Content-Disposition': `attachment; filename="${sanitizeFilename(candidate.name)}_jingle.mp3"`,
          'Cache-Control': 'private, no-store',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    }

    // 5. Imagem: fetch → injetar watermark TSE → retornar buffer
    const rawBuffer = await fetchImageAsBuffer(asset.output_url)
    const watermarked = await injectImageWatermark(
      rawBuffer,
      asset.asset_type as AssetType,
      candidate.campaign_cnpj,
    )

    // 6. Registra export no log de compliance (LGPD / rastreabilidade)
    await logComplianceEvent({
      event_type: 'EXPORT',
      candidate_id: asset.candidate_id,
      asset_id: asset.id,
      ai_model: asset.ai_model ?? 'fal-ai/flux/dev',
    })

    const filename = `${sanitizeFilename(candidate.name)}_${asset.asset_type}.jpg`

    return new NextResponse(watermarked.buffer as ArrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(watermarked.length),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (err) {
    console.error('[export] error:', err)
    return NextResponse.json<ApiResponse>(
      { success: false, error: 'Erro interno ao exportar asset.' },
      { status: 500 },
    )
  }
}

function sanitizeFilename(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove acentos
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .slice(0, 50)
}
