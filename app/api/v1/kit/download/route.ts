import { NextRequest, NextResponse } from 'next/server'
import type { Archiver } from 'archiver'
import { createServerClient } from '@/lib/supabase'

// @types/archiver usa `export =`; require tipado evita problema de default import.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require('archiver') as (format: string, options?: Record<string, unknown>) => Archiver
import { signedUrlFromPublic } from '@/lib/storage'

export const runtime = 'nodejs'
export const maxDuration = 60

// ── GET /api/v1/kit/download ──────────────────────────────────
// Baixa todas as peças prontas do candidato num único .zip.
// Para visuais inclui o PNG; para jingle, o MP3.

const EXT: Record<string, string> = {
  santinho: 'png', banner: 'png', perfurado: 'png', social: 'png', jingle: 'mp3',
}

export async function GET(req: NextRequest) {
  const supabase = createServerClient()

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
  }

  const { data: candidate } = await supabase
    .from('candidates')
    .select('id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!candidate) {
    return NextResponse.json({ success: false, error: 'Candidatura não encontrada.' }, { status: 404 })
  }

  const { data: assets } = await supabase
    .from('assets')
    .select('id, asset_type, output_url, metadata')
    .eq('candidate_id', candidate.id)
    .eq('status', 'done')

  const ready = (assets ?? []).filter(a => a.output_url)
  if (ready.length === 0) {
    return NextResponse.json({ success: false, error: 'Nenhuma peça pronta para baixar.' }, { status: 404 })
  }

  // Monta o zip em memória
  const chunks: Buffer[] = []
  const archive = archiver('zip', { zlib: { level: 9 } })
  archive.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<void>((resolve, reject) => {
    archive.on('end', () => resolve())
    archive.on('error', reject)
  })

  for (const a of ready) {
    const urls: { url: string; name: string }[] = []
    const signed = await signedUrlFromPublic(a.output_url!)
    if (signed) urls.push({ url: signed, name: `${a.asset_type}.${EXT[a.asset_type] ?? 'bin'}` })
    // PDF de gráfica (quando houver)
    const pdfUrl = (a.metadata as Record<string, unknown>)?.pdf_url
    if (typeof pdfUrl === 'string') {
      const signedPdf = await signedUrlFromPublic(pdfUrl)
      if (signedPdf) urls.push({ url: signedPdf, name: `${a.asset_type}-grafica.pdf` })
    }
    for (const u of urls) {
      try {
        const res = await fetch(u.url, { signal: AbortSignal.timeout(30_000) })
        if (res.ok) archive.append(Buffer.from(await res.arrayBuffer()), { name: u.name })
      } catch { /* pula arquivo que falhar */ }
    }
  }

  await archive.finalize()
  await done

  const zip = Buffer.concat(chunks)
  return new NextResponse(new Uint8Array(zip), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="kit-campanha.zip"',
    },
  })
}
