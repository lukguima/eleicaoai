import { generateImage as imagenGenerate } from '@/lib/imagen'
import { generateImage as openrouterGenerate } from '@/lib/openrouter'
import { generateImage as openaiGenerate, analyzeImage } from '@/lib/openai'
import type { AssetType, Candidate } from '@/types'

export type { ImageAnalysis } from '@/lib/openai'
export { analyzeImage }

type Provider = 'openai' | 'imagen' | 'openrouter'

// Errors that should trigger fallback to the next provider
const FALLBACK_PATTERNS = [
  /quota/i,
  /rate.?limit/i,
  /too.?many.?request/i,
  /resource.?exhausted/i,
  /429/,
  /404/,
  /503/,
  /OPENAI_API_KEY/i,
  /GOOGLE_AI_API_KEY/i,
  /safety/i,
  /blocked/i,
  /content.?policy/i,
  /not.?return/i,
  /storage/i,
  /billing/i,
  /insufficient_quota/i,
]

function shouldFallback(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return FALLBACK_PATTERNS.some(p => p.test(msg))
}

export async function generateImage(
  candidate: Candidate,
  assetType: AssetType
): Promise<{ url: string; provider: Provider }> {
  // 1. OpenAI DALL-E 3 — direct API, best quality for campaign materials
  if (process.env.OPENAI_API_KEY) {
    try {
      const url = await openaiGenerate(candidate, assetType)
      return { url, provider: 'openai' }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      if (shouldFallback(err)) {
        console.warn(`[image-generator] OpenAI falhou (${reason}), tentando Imagen`)
      } else {
        throw err
      }
    }
  } else {
    console.warn('[image-generator] OPENAI_API_KEY ausente, pulando para próximo provider')
  }

  // 2. Google Imagen 4 — free tier, 1 500 images/day
  if (process.env.GOOGLE_AI_API_KEY) {
    try {
      const url = await imagenGenerate(candidate, assetType)
      return { url, provider: 'imagen' }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      if (shouldFallback(err)) {
        console.warn(`[image-generator] Imagen falhou (${reason}), acionando fallback OpenRouter`)
      } else {
        throw err
      }
    }
  } else {
    console.warn('[image-generator] GOOGLE_AI_API_KEY ausente, usando OpenRouter diretamente')
  }

  // 3. OpenRouter (DALL-E 3 proxy) — final fallback
  const url = await openrouterGenerate(candidate, assetType)
  return { url, provider: 'openrouter' }
}
