import { fal } from '@fal-ai/client'
import { createServerClient } from '@/lib/supabase'
import type { AssetType, Candidate } from '@/types'

// Modelo padrão. Alternativas: 'fal-ai/flux/schnell' (mais rápido) ou 'fal-ai/flux-pro/v1.1' (melhor qualidade)
const MODEL = 'fal-ai/flux/dev'

function getApiKey(): string {
  const key = process.env.FAL_KEY
  if (!key) throw new Error('FAL_KEY não configurada')
  return key
}

const IMAGE_SIZE_MAP: Record<AssetType, string> = {
  santinho:  'portrait_4_3',    // 768 × 1024 — santinho eleitoral
  banner:    'portrait_4_3',    // 768 × 1024 — banner vertical
  perfurado: 'landscape_4_3',   // 1024 × 768 — faixa horizontal
  social:    'square_hd',       // 1024 × 1024 — post redes sociais
  jingle:    'square_hd',       // 1024 × 1024 — capa do jingle
}

function buildPrompt(candidate: Candidate, assetType: AssetType): string {
  const lines = [
    `Brazilian electoral campaign material, professional graphic design, high quality print.`,
    `Candidate: ${candidate.name}, ballot number ${candidate.election_number}, party ${candidate.party}.`,
    candidate.slogan ? `Slogan: "${candidate.slogan}".` : '',
    `Brand colors: primary ${candidate.primary_color}, secondary ${candidate.secondary_color}.`,
    `Style: professional, trustworthy, patriotic, modern. No references to opponents or rival parties.`,
    `Mandatory footer text: "Conteúdo fabricado com IA | CNPJ: ${candidate.campaign_cnpj}".`,
  ]

  switch (assetType) {
    case 'santinho':
      lines.push('A6 portrait electoral flyer (santinho brasileiro), full bleed, candidate photo placeholder, bold number display.')
      break
    case 'banner':
      lines.push('Tall vertical electoral banner for outdoor display, bold typography, impactful layout.')
      break
    case 'perfurado':
      lines.push('Wide horizontal perforated outdoor banner for fences and walls, high contrast, readable at distance.')
      break
    case 'social':
      lines.push('Square social media post (Instagram/Facebook/WhatsApp), 1:1 ratio, bold typography, campaign colors.')
      break
    case 'jingle':
      lines.push('Square album art cover for electoral jingle, musical theme, campaign colors, no text.')
      break
  }

  return lines.filter(Boolean).join(' ')
}

export async function generateImage(candidate: Candidate, assetType: AssetType): Promise<string> {
  fal.config({ credentials: getApiKey() })

  const prompt = buildPrompt(candidate, assetType)

  const result = await fal.subscribe(MODEL, {
    input: {
      prompt,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      image_size: IMAGE_SIZE_MAP[assetType] as any,
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1,
      enable_safety_checker: true,
      output_format: 'jpeg',
    },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const imageUrl: string | undefined = (result.data as any)?.images?.[0]?.url
  if (!imageUrl) throw new Error('fal.ai não retornou imagem')

  // Baixa a imagem e faz upload para o Supabase Storage (URLs do fal.ai são temporárias)
  const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) })
  if (!imageRes.ok) throw new Error(`Falha ao baixar imagem do fal.ai: ${imageRes.status}`)

  const buffer = Buffer.from(await imageRes.arrayBuffer())
  const supabase = createServerClient()
  const storagePath = `${candidate.id}/${assetType}_${Date.now()}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('generated')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: false })

  if (uploadError) throw new Error(`Storage upload falhou: ${uploadError.message}`)

  const { data: { publicUrl } } = supabase.storage.from('generated').getPublicUrl(storagePath)
  return publicUrl
}
