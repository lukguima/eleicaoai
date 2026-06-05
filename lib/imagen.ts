import { createServerClient } from '@/lib/supabase'
import type { Candidate, AssetType } from '@/types'

const MODEL = 'gemini-2.0-flash-preview-image-generation'
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'

function getApiKey(): string {
  const key = process.env.GOOGLE_AI_API_KEY
  if (!key) throw new Error('GOOGLE_AI_API_KEY não configurada')
  return key
}

function buildPrompt(candidate: Candidate, assetType: AssetType): string {
  const lines = [
    `Create a professional Brazilian electoral campaign image, graphic design style.`,
    `Candidate name: ${candidate.name}. Ballot number: ${candidate.election_number}. Party: ${candidate.party}.`,
    candidate.slogan ? `Campaign slogan: "${candidate.slogan}".` : '',
    `Brand colors: primary ${candidate.primary_color}, secondary ${candidate.secondary_color}.`,
    `Style: professional, trustworthy, bold typography, modern layout. No opponents.`,
    `Include footer text: "Conteúdo fabricado com IA | CNPJ: ${candidate.campaign_cnpj}".`,
  ]

  switch (assetType) {
    case 'santinho':
      lines.push('A6 portrait flyer (santinho eleitoral), full bleed, ballot number large and prominent, candidate name bold.')
      break
    case 'banner':
      lines.push('Vertical electoral banner for outdoor display, bold typography, impactful layout.')
      break
    case 'perfurado':
      lines.push('Wide horizontal perforated outdoor banner for fences, high contrast, readable at distance.')
      break
    case 'social':
      lines.push('Square social media post (1:1 ratio), bold typography, campaign colors, Instagram-ready.')
      break
    case 'jingle':
      lines.push('Square album art cover for electoral jingle, musical theme, campaign colors.')
      break
  }

  return lines.filter(Boolean).join(' ')
}

export async function generateImage(candidate: Candidate, assetType: AssetType): Promise<string> {
  const apiKey = getApiKey()
  const prompt = buildPrompt(candidate, assetType)

  const res = await fetch(
    `${API_BASE}/models/${MODEL}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
      }),
    }
  )

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Gemini image erro ${res.status}: ${text}`)
  }

  const json = await res.json()
  const parts: { inlineData?: { mimeType: string; data: string } }[] =
    json.candidates?.[0]?.content?.parts ?? []

  const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'))
  if (!imagePart?.inlineData) throw new Error('Gemini não retornou imagem')

  const { data: imageBytes, mimeType } = imagePart.inlineData
  const ext = mimeType.includes('png') ? 'png' : 'jpg'
  const buffer = Buffer.from(imageBytes, 'base64')

  const supabase = createServerClient()
  const storagePath = `${candidate.id}/${assetType}_${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('generated')
    .upload(storagePath, buffer, { contentType: mimeType, upsert: false })

  if (uploadError) {
    console.warn(`[imagen] Storage upload falhou (${uploadError.message}), usando data URL`)
    return `data:${mimeType};base64,${imageBytes}`
  }

  const { data: { publicUrl } } = supabase.storage.from('generated').getPublicUrl(storagePath)
  return publicUrl
}

export async function waitForImage(resolvedUrl: string): Promise<string> {
  return resolvedUrl
}
