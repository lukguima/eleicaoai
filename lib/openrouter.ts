import { createServerClient } from '@/lib/supabase'
import type { AssetType, Candidate } from '@/types'

// Modelo padrão no OpenRouter para imagens.
// Alternativas: 'google/gemini-2.0-flash-exp:free', 'amazon/nova-canvas-v1:0'
const MODEL = 'openai/dall-e-3'
const API_BASE = 'https://openrouter.ai/api/v1'

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY não configurada')
  return key
}

// DALL-E 3 suporta 3 tamanhos. Mapeamos cada tipo de peça para o mais adequado.
const SIZE_MAP: Record<AssetType, '1024x1024' | '1024x1792' | '1792x1024'> = {
  santinho:  '1024x1792',  // retrato — santinho eleitoral
  banner:    '1024x1792',  // retrato — banner vertical
  perfurado: '1792x1024',  // paisagem — faixa horizontal
  social:    '1024x1024',  // quadrado — post redes sociais
  jingle:    '1024x1024',  // quadrado — capa do jingle
}

function buildPrompt(candidate: Candidate, assetType: AssetType): string {
  const lines = [
    `Brazilian electoral campaign material, professional graphic design, high quality print.`,
    `Candidate: ${candidate.name}, ballot number ${candidate.election_number}, party ${candidate.party}.`,
    candidate.slogan ? `Slogan: "${candidate.slogan}".` : '',
    `Brand colors: primary ${candidate.primary_color}, secondary ${candidate.secondary_color}.`,
    `Style: professional, trustworthy, patriotic, modern. No opponents or rival parties.`,
    `Mandatory footer: "Conteúdo fabricado com IA | CNPJ: ${candidate.campaign_cnpj}".`,
  ]

  switch (assetType) {
    case 'santinho':
      lines.push('A6 portrait electoral flyer (santinho brasileiro), full bleed, bold number display, candidate name prominent.')
      break
    case 'banner':
      lines.push('Tall vertical electoral banner for outdoor display, bold typography, impactful layout.')
      break
    case 'perfurado':
      lines.push('Wide horizontal perforated outdoor banner for fences and walls, high contrast, readable at distance.')
      break
    case 'social':
      lines.push('Square social media post (Instagram/Facebook/WhatsApp), bold typography, campaign colors, ready to publish.')
      break
    case 'jingle':
      lines.push('Square album art cover for electoral jingle, musical theme, campaign colors, no text overlay.')
      break
  }

  return lines.filter(Boolean).join(' ')
}

interface OpenRouterImageResponse {
  data: { url: string; revised_prompt?: string }[]
  error?: { message: string; code?: string }
}

export async function generateImage(candidate: Candidate, assetType: AssetType): Promise<string> {
  const apiKey = getApiKey()
  const prompt = buildPrompt(candidate, assetType)

  const res = await fetch(`${API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://eleicaoai.com.br',
      'X-Title': 'EleiçãoAI',
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      n: 1,
      size: SIZE_MAP[assetType],
      quality: 'standard',
    }),
    signal: AbortSignal.timeout(120_000),
  })

  const json = await res.json() as OpenRouterImageResponse

  if (!res.ok || json.error) {
    throw new Error(`OpenRouter erro ${res.status}: ${json.error?.message ?? 'resposta inválida'}`)
  }

  const imageUrl = json.data?.[0]?.url
  if (!imageUrl) throw new Error('OpenRouter não retornou URL de imagem')

  // URLs do DALL-E expiram — baixa e salva no Supabase Storage
  const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) })
  if (!imageRes.ok) throw new Error(`Falha ao baixar imagem do OpenRouter: ${imageRes.status}`)

  const buffer = Buffer.from(await imageRes.arrayBuffer())
  const supabase = createServerClient()
  const storagePath = `${candidate.id}/${assetType}_${Date.now()}.png`

  const { error: uploadError } = await supabase.storage
    .from('generated')
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: false })

  if (uploadError) {
    console.warn(`[openrouter] Storage upload falhou (${uploadError.message}), usando data URL`)
    return `data:image/png;base64,${buffer.toString('base64')}`
  }

  const { data: { publicUrl } } = supabase.storage.from('generated').getPublicUrl(storagePath)
  return publicUrl
}
