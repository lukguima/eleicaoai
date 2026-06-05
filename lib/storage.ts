import { createServerClient } from '@/lib/supabase'

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
