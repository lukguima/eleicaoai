import { fal } from '@fal-ai/client'
import sharp from 'sharp'
import { uploadToBucket } from '@/lib/storage'
import { log } from '@/lib/log'

// ============================================================
// fal.ai — usado apenas onde a IA agrega valor às artes:
//   1) remoção de fundo da foto do candidato (rembg)
//   2) geração de FUNDO decorativo (sem texto, sem pessoas)
// A arte em si é montada por template (lib/render.tsx), não por IA.
// ============================================================

function falKey(): string | undefined {
  return process.env.FAL_KEY || process.env.FAL_API_KEY || undefined
}

function configure() {
  const key = falKey()
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
  stories: 'portrait_16_9',
  colinha: 'portrait_4_3',
  adesivo: 'landscape_16_9',
  capa: 'landscape_16_9',
  status: 'portrait_16_9',
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
  const prompt = [
    'Abstract political campaign background texture, subtle geometric shapes and soft gradients',
    `dominant color ${primaryColor}`,
    'clean, professional, modern, NO text, NO letters, NO people, NO faces, NO logos',
    hint ? `theme: ${hint}` : '',
  ].filter(Boolean).join(', ')

  if (falKey()) {
    try {
      configure()
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
      if (outUrl) {
        const buffer = await downloadToBuffer(outUrl)
        return uploadToBucket(storagePath, buffer, 'image/jpeg')
      }
    } catch (err) {
      log.warn({}, `fal: fundo IA falhou (${err instanceof Error ? err.message : String(err)})`)
    }
  }

  const google = process.env.GOOGLE_AI_API_KEY
  if (google) {
    try {
      const buf = await generateBackgroundGoogle(prompt, google)
      if (buf) return uploadToBucket(storagePath, buf, 'image/png')
    } catch (err) {
      log.warn({}, `google: fundo IA falhou (${err instanceof Error ? err.message : String(err)})`)
    }
  }

  const buf = await decorativeGradient(primaryColor)
  return uploadToBucket(storagePath, buf, 'image/png')
}

async function generateBackgroundGoogle(prompt: string, apiKey: string): Promise<Buffer | null> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '3:4' },
      }),
      signal: AbortSignal.timeout(45_000),
    },
  )
  const json = await res.json() as { predictions?: { bytesBase64Encoded?: string }[] }
  const b64 = json.predictions?.[0]?.bytesBase64Encoded
  if (!b64) return null
  return Buffer.from(b64, 'base64')
}

async function decorativeGradient(primary: string): Promise<Buffer> {
  const hex = /^#[0-9a-fA-F]{6}$/.test(primary) ? primary : '#1a56db'
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1440">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${hex}"/>
        <stop offset="55%" stop-color="#0a1b3d"/>
        <stop offset="100%" stop-color="${hex}"/>
      </linearGradient>
    </defs>
    <rect width="1080" height="1440" fill="url(#g)"/>
    <circle cx="900" cy="220" r="260" fill="#ffffff" fill-opacity="0.08"/>
    <circle cx="160" cy="1180" r="320" fill="#fabd00" fill-opacity="0.12"/>
    <rect x="-80" y="640" width="700" height="18" fill="#ffffff" fill-opacity="0.06" transform="rotate(-18 270 649)"/>
  </svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}
