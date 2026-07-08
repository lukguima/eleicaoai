import { fal } from '@fal-ai/client'
import { uploadToBucket } from '@/lib/storage'

// ============================================================
// fal.ai — usado apenas onde a IA agrega valor às artes:
//   1) remoção de fundo da foto do candidato (rembg)
//   2) geração de FUNDO decorativo (sem texto, sem pessoas)
// A arte em si é montada por template (lib/render.tsx), não por IA.
// ============================================================

function configure() {
  const key = process.env.FAL_KEY
  if (!key) throw new Error('FAL_KEY não configurada')
  fal.config({ credentials: key })
}

async function downloadToBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) })
  if (!res.ok) throw new Error(`Falha ao baixar resultado do fal.ai: ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

/**
 * Remove o fundo da foto do candidato. Recebe uma URL pública (a foto já
 * enviada ao Storage) e devolve a URL do PNG recortado, persistido no bucket.
 */
export async function removeBackground(imageUrl: string, storagePath: string): Promise<string> {
  configure()
  const result = await fal.subscribe('fal-ai/imageutils/rembg', {
    input: { image_url: imageUrl },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outUrl: string | undefined = (result.data as any)?.image?.url
  if (!outUrl) throw new Error('fal.ai (rembg) não retornou imagem')

  const buffer = await downloadToBuffer(outUrl)
  return uploadToBucket(storagePath, buffer, 'image/png')
}

// Proporções de fundo por tipo de peça (para o FLUX gerar no formato certo).
const BG_SIZE: Record<string, string> = {
  santinho: 'portrait_4_3',
  banner: 'portrait_16_9',
  perfurado: 'landscape_16_9',
  social: 'square_hd',
}

/**
 * Gera um FUNDO decorativo (padrão/textura temática, sem texto e sem pessoas)
 * para ser usado atrás do layout. Persiste no bucket e devolve a URL.
 */
export async function generateBackground(
  assetType: string,
  primaryColor: string,
  storagePath: string,
  hint?: string,
): Promise<string> {
  configure()
  const prompt = [
    'Abstract political campaign background texture, subtle geometric shapes and soft gradients',
    `dominant color ${primaryColor}`,
    'clean, professional, modern, NO text, NO letters, NO people, NO faces, NO logos',
    hint ? `theme: ${hint}` : '',
  ].filter(Boolean).join(', ')

  const result = await fal.subscribe('fal-ai/flux/dev', {
    input: {
      prompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      image_size: (BG_SIZE[assetType] ?? 'square_hd') as any,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true,
      output_format: 'jpeg',
    },
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outUrl: string | undefined = (result.data as any)?.images?.[0]?.url
  if (!outUrl) throw new Error('fal.ai (flux) não retornou imagem')

  const buffer = await downloadToBuffer(outUrl)
  return uploadToBucket(storagePath, buffer, 'image/jpeg')
}
