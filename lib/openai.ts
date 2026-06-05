import { createServerClient } from '@/lib/supabase'
import type { AssetType, Candidate } from '@/types'

const API_BASE = 'https://api.openai.com/v1'

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY não configurada')
  return key
}

// DALL-E 3 supports 3 sizes — mapped per asset type
const SIZE_MAP: Record<AssetType, '1024x1024' | '1024x1792' | '1792x1024'> = {
  santinho:  '1024x1792',
  banner:    '1024x1792',
  perfurado: '1792x1024',
  social:    '1024x1024',
  jingle:    '1024x1024',
}

function buildPrompt(candidate: Candidate, assetType: AssetType): string {
  const lines = [
    `Brazilian electoral campaign material, professional graphic design, high quality print.`,
    `Candidate: ${candidate.name}, ballot number ${candidate.election_number}, party ${candidate.party}.`,
    candidate.slogan ? `Campaign slogan: "${candidate.slogan}".` : '',
    `Brand colors: primary ${candidate.primary_color}, secondary ${candidate.secondary_color}.`,
    `Style: professional, trustworthy, patriotic, modern. No opponents or rival parties mentioned.`,
    `Mandatory footer text (must appear exactly): "Conteúdo fabricado com IA | CNPJ: ${candidate.campaign_cnpj}".`,
  ]

  switch (assetType) {
    case 'santinho':
      lines.push(
        'A6 portrait electoral flyer (santinho brasileiro). Full bleed background. Ballot number large and prominent at center. Candidate name bold. Campaign colors dominant. Polished, print-ready.'
      )
      break
    case 'banner':
      lines.push(
        'Tall vertical electoral outdoor banner. Bold typography. High contrast. Impactful layout. Suitable for print on vinyl or lona.'
      )
      break
    case 'perfurado':
      lines.push(
        'Wide horizontal perforated outdoor banner for fences, walls and scaffolding. High contrast, readable at distance. Horizontal layout.'
      )
      break
    case 'social':
      lines.push(
        'Square social media post (1:1 ratio). Instagram/Facebook/WhatsApp ready. Bold typography. Campaign colors. Clean, modern layout.'
      )
      break
    case 'jingle':
      lines.push(
        'Square album art cover for electoral campaign jingle. Musical theme with subtle notes or instruments. Campaign colors. No text overlay required.'
      )
      break
  }

  return lines.filter(Boolean).join(' ')
}

interface DalleResponse {
  data: { url: string; revised_prompt?: string }[]
  error?: { message: string; code?: string; type?: string }
}

export async function generateImage(candidate: Candidate, assetType: AssetType): Promise<string> {
  const apiKey = getApiKey()
  const prompt = buildPrompt(candidate, assetType)

  const res = await fetch(`${API_BASE}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: SIZE_MAP[assetType],
      quality: 'standard',
    }),
    signal: AbortSignal.timeout(120_000),
  })

  const json = (await res.json()) as DalleResponse

  if (!res.ok || json.error) {
    throw new Error(
      `OpenAI DALL-E erro ${res.status}: ${json.error?.message ?? 'resposta inválida'}`
    )
  }

  const imageUrl = json.data?.[0]?.url
  if (!imageUrl) throw new Error('OpenAI DALL-E não retornou URL de imagem')

  // DALL-E URLs expire after 1h — download and persist to Supabase Storage
  const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) })
  if (!imageRes.ok) throw new Error(`Falha ao baixar imagem do OpenAI: ${imageRes.status}`)

  const buffer = Buffer.from(await imageRes.arrayBuffer())
  const supabase = createServerClient()
  const storagePath = `${candidate.id}/${assetType}_${Date.now()}.png`

  const { error: uploadError } = await supabase.storage
    .from('generated')
    .upload(storagePath, buffer, { contentType: 'image/png', upsert: false })

  if (uploadError) {
    console.warn(`[openai] Storage upload falhou (${uploadError.message}), usando data URL`)
    return `data:image/png;base64,${buffer.toString('base64')}`
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('generated').getPublicUrl(storagePath)
  return publicUrl
}

// ── Vision analysis ───────────────────────────────────────────

export interface ImageAnalysis {
  description: string        // Portuguese description of the material
  has_compliance_label: boolean  // whether "Conteúdo fabricado com IA" is present
  quality_score: number      // 1–10
  suggestions: string[]      // improvement tips in Portuguese
}

interface ChatResponse {
  choices: { message: { content: string } }[]
  error?: { message: string }
}

export async function analyzeImage(
  imageUrl: string,
  assetType: AssetType,
  candidateName: string
): Promise<ImageAnalysis> {
  const apiKey = getApiKey()

  const typeLabels: Record<AssetType, string> = {
    santinho:  'santinho eleitoral (flyer A6)',
    banner:    'banner eleitoral vertical',
    perfurado: 'adesivo perfurado horizontal',
    social:    'post para redes sociais',
    jingle:    'capa de jingle eleitoral',
  }

  const res = await fetch(`${API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Você é especialista em marketing eleitoral brasileiro. Analise materiais de campanha e responda SOMENTE com JSON válido, sem markdown, sem texto extra.',
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'low' },
            },
            {
              type: 'text',
              text: `Analise este ${typeLabels[assetType]} para o candidato "${candidateName}".

Retorne JSON com exatamente estes campos:
{
  "description": "descrição em pt-BR do material (1-2 frases)",
  "has_compliance_label": true/false (se contém "Conteúdo fabricado com IA"),
  "quality_score": número de 1 a 10,
  "suggestions": ["sugestão 1 em pt-BR", "sugestão 2 em pt-BR"]
}`,
            },
          ],
        },
      ],
      max_tokens: 400,
      response_format: { type: 'json_object' },
    }),
    signal: AbortSignal.timeout(30_000),
  })

  const json = (await res.json()) as ChatResponse

  if (!res.ok || json.error) {
    throw new Error(
      `OpenAI Vision erro ${res.status}: ${json.error?.message ?? 'resposta inválida'}`
    )
  }

  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error('OpenAI Vision não retornou análise')

  try {
    return JSON.parse(content) as ImageAnalysis
  } catch {
    return {
      description: 'Material eleitoral gerado com IA.',
      has_compliance_label: false,
      quality_score: 7,
      suggestions: [],
    }
  }
}
