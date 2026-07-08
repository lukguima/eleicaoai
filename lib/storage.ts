import { createServerClient } from '@/lib/supabase'

const BUCKET = 'generated'

/**
 * Extrai o caminho interno do bucket a partir de uma URL pública do Storage.
 * Aceita tanto URLs `/object/public/generated/<path>` quanto `/object/generated/<path>`.
 * Retorna null se a URL não for do bucket `generated`.
 */
export function storagePathFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const marker = `/${BUCKET}/`
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  return decodeURIComponent(url.slice(idx + marker.length).split('?')[0])
}

/**
 * Gera uma signed URL (padrão 1h) para um arquivo do bucket a partir da sua
 * URL pública. Retorna a URL original se não for do bucket ou se falhar —
 * assim o player continua funcionando mesmo com o bucket público.
 */
export async function signedUrlFromPublic(publicUrl: string | null | undefined, expiresIn = 3600): Promise<string | null> {
  if (!publicUrl) return null
  const path = storagePathFromUrl(publicUrl)
  if (!path) return publicUrl
  const supabase = createServerClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) return publicUrl
  return data.signedUrl
}

/**
 * Faz upload de um buffer para o bucket `generated` e devolve a URL pública.
 * (O download sensível deve usar signedUrlFromPublic; a URL pública é o
 * ponteiro estável guardado no banco.)
 */
export async function uploadToBucket(
  storagePath: string,
  buffer: Buffer,
  contentType: string,
): Promise<string> {
  const supabase = createServerClient()
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType, upsert: true })
  if (error) throw new Error(`Falha no upload para o Storage: ${error.message}`)
  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(storagePath)
  return publicUrl
}

/**
 * Baixa um arquivo de áudio de uma URL externa e persiste no Supabase Storage.
 * Se o upload falhar, retorna a URL original como fallback (não quebra o fluxo).
 */
export async function persistAudio(
  audioUrl: string,
  candidateId: string,
  assetId: string
): Promise<string> {
  const res = await fetch(audioUrl, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`Falha ao baixar áudio do Suno: ${res.status}`)

  const buffer = Buffer.from(await res.arrayBuffer())
  const supabase = createServerClient()
  const storagePath = `${candidateId}/jingle_${assetId}.mp3`

  const { error } = await supabase.storage
    .from('generated')
    .upload(storagePath, buffer, { contentType: 'audio/mpeg', upsert: true })

  if (error) {
    console.warn(`[storage] upload áudio falhou (${error.message}), usando URL do Suno`)
    return audioUrl
  }

  const { data: { publicUrl } } = supabase.storage.from('generated').getPublicUrl(storagePath)
  return publicUrl
}
