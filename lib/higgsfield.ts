import type {
  HiggsfieldRequest,
  HiggsfieldResponse,
  HiggsfieldStatusResponse,
  HiggsfieldStatus,
  AssetType,
  Candidate,
} from '@/types'

const HIGGSFIELD_BASE_URL = 'https://platform.higgsfield.ai'

// Modelo padrão para fotos de candidatos
const DEFAULT_MODEL = 'higgsfield-ai/soul/standard'

function getAuth(): string {
  const key = process.env.HIGGSFIELD_API_KEY
  const secret = process.env.HIGGSFIELD_API_SECRET
  if (!key || !secret) throw new Error('HIGGSFIELD_API_KEY ou HIGGSFIELD_API_SECRET não configurados')
  return `Key ${key}:${secret}`
}

// ── Presets de dimensão por tipo de asset ─────────────────────

const ASPECT_RATIO_MAP: Record<AssetType, string> = {
  santinho:  '3:4',    // 70x100 mm → portrait
  banner:    '2:3',    // 800x1200 mm → portrait
  perfurado: '5:2',    // 1000x400 mm → landscape
  social:    '1:1',    // 1080x1080 px → square
  jingle:    '1:1',    // capa do jingle
}

const RESOLUTION_MAP: Record<AssetType, string> = {
  santinho:  '1024p',
  banner:    '1024p',
  perfurado: '720p',
  social:    '720p',
  jingle:    '720p',
}

// ── Filtro anti-deepfake ──────────────────────────────────────

const BLOCKED_TERMS = [
  'substituir rosto',
  'imitar voz',
  'parecer com',
  'clone',
  'deepfake',
  'trocar rosto',
  'replace face',
  'voice clone',
]

export function validatePrompt(prompt: string): void {
  const lower = prompt.toLowerCase()
  const found = BLOCKED_TERMS.find((term) => lower.includes(term))
  if (found) {
    throw new Error(`Prompt bloqueado: conteúdo de deepfake detectado ("${found}")`)
  }
}

// ── Construção do prompt ──────────────────────────────────────

export function buildImagePrompt(candidate: Candidate, assetType: AssetType): string {
  const base = [
    `[ESTILO ELEITORAL BRASILEIRO]`,
    `Candidato ${candidate.name}, número ${candidate.election_number}, ${candidate.party}.`,
    candidate.slogan ? `Slogan: "${candidate.slogan}".` : '',
    `Cores principais: ${candidate.primary_color} e ${candidate.secondary_color}.`,
    `Estilo profissional, confiável, otimista.`,
    `Sem referência a adversários ou partidos concorrentes.`,
    assetType === 'santinho' ? 'Formato santinho eleitoral brasileiro.' : '',
    assetType === 'social' ? 'Formato quadrado para redes sociais.' : '',
    assetType === 'perfurado' ? 'Formato banner horizontal com furos.' : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Valida antes de retornar
  validatePrompt(base)

  return base
}

// ── Geração de imagem ─────────────────────────────────────────

export async function generateImage(
  candidate: Candidate,
  assetType: AssetType
): Promise<HiggsfieldResponse> {
  const prompt = buildImagePrompt(candidate, assetType)

  const body: HiggsfieldRequest = {
    prompt,
    aspect_ratio: ASPECT_RATIO_MAP[assetType],
    resolution: RESOLUTION_MAP[assetType],
  }

  const res = await fetch(`${HIGGSFIELD_BASE_URL}/${DEFAULT_MODEL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: getAuth(),
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Higgsfield erro ${res.status}: ${text}`)
  }

  return res.json() as Promise<HiggsfieldResponse>
}

// ── Polling de status ─────────────────────────────────────────

export async function pollImageStatus(requestId: string): Promise<HiggsfieldStatusResponse> {
  const res = await fetch(`${HIGGSFIELD_BASE_URL}/requests/${requestId}/status`, {
    headers: { Authorization: getAuth() },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Higgsfield status erro ${res.status}: ${text}`)
  }

  return res.json() as Promise<HiggsfieldStatusResponse>
}

/**
 * Faz polling até a imagem estar pronta ou falhar.
 * Intervalos: 5s × 24 tentativas = max 2 minutos.
 */
export async function waitForImage(requestId: string): Promise<string> {
  const INTERVAL_MS = 5000
  const MAX_TRIES = 24

  for (let i = 0; i < MAX_TRIES; i++) {
    await new Promise((r) => setTimeout(r, INTERVAL_MS))

    const result = await pollImageStatus(requestId)

    if (result.status === 'completed' && result.output?.[0]?.url) {
      return result.output[0].url
    }

    if (result.status === 'failed') {
      throw new Error(`Higgsfield geração falhou: ${result.error ?? 'erro desconhecido'}`)
    }

    if (result.status === 'nsfw') {
      throw new Error('Higgsfield bloqueou o conteúdo: detectado como NSFW')
    }
  }

  throw new Error('Higgsfield timeout: imagem não ficou pronta em 2 minutos')
}
