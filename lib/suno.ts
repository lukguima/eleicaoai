import type {
  SunoLyricsRequest,
  SunoGenerateRequest,
  SunoTaskResponse,
  JingleStyle,
  Candidate,
} from '@/types'

const SUNO_BASE_URL = 'https://api.sunoapi.org/api/v1'

function getApiKey(): string {
  const key = process.env.SUNO_API_KEY
  if (!key) throw new Error('SUNO_API_KEY não configurada')
  return key
}

function getCallbackBase(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL
  if (!url) throw new Error('NEXT_PUBLIC_APP_URL não configurada')
  return url
}

async function sunoPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${SUNO_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Suno API erro ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ── Geração de Letra ──────────────────────────────────────────

/**
 * Monta um prompt de letra baseado nos dados do candidato.
 * Máximo 200 caracteres (limite da API).
 */
export function buildLyricsPrompt(candidate: Candidate, style: JingleStyle): string {
  const base = `Jingle eleitoral para ${candidate.name}, número ${candidate.election_number}, ${candidate.party}. Estilo: ${style}. Tema: liderança e esperança. Positivo, sem mencionar adversários.`
  return base.slice(0, 200)
}

/**
 * Dispara a geração de letra no Suno e retorna o taskId.
 * O resultado chega via webhook em /api/webhooks/suno.
 */
export async function generateLyrics(
  candidate: Candidate,
  style: JingleStyle,
  assetId: string
): Promise<string> {
  const payload: SunoLyricsRequest = {
    prompt: buildLyricsPrompt(candidate, style),
    callBackUrl: `${getCallbackBase()}/api/webhooks/suno?asset_id=${assetId}&type=lyrics`,
  }

  const response = await sunoPost<SunoTaskResponse>('/lyrics', payload)
  return response.data.taskId
}

// ── Geração de Jingle ─────────────────────────────────────────

/**
 * Monta o prompt de música usando a letra gerada.
 * Inclui o aviso legal de IA obrigatório no início.
 */
export function buildMusicPrompt(candidate: Candidate, lyrics: string, style: JingleStyle): string {
  const complianceIntro =
    'Este conteúdo foi fabricado utilizando inteligência artificial. '

  const fullPrompt = `${complianceIntro}${lyrics}`

  // Limite de 5000 chars para modelos V5+
  return fullPrompt.slice(0, 5000)
}

/**
 * Dispara a geração de música com a letra pronta.
 * Deve ser chamado apenas após receber a letra via webhook.
 */
export async function generateJingle(
  candidate: Candidate,
  lyrics: string,
  style: JingleStyle,
  assetId: string
): Promise<string> {
  const title = `${candidate.name} ${candidate.election_number} - ${candidate.party}`

  const payload: SunoGenerateRequest = {
    customMode: true,
    instrumental: false,
    model: 'V5_5',
    callBackUrl: `${getCallbackBase()}/api/webhooks/suno?asset_id=${assetId}&type=music`,
    prompt: buildMusicPrompt(candidate, lyrics, style),
    style,
    title: title.slice(0, 100),
    negativeTags: 'propaganda negativa, difamação, agressivo',
  }

  const response = await sunoPost<SunoTaskResponse>('/generate', payload)
  return response.data.taskId
}

// ── Polling de status (fallback para dev sem webhook público) ────

interface LyricsRecord {
  status: 'PENDING' | 'SUCCESS' | 'GENERATE_LYRICS_FAILED' | 'SENSITIVE_WORD_ERROR'
  response?: { data?: Array<{ text?: string; status?: string }> }
}

interface MusicRecord {
  status: 'PENDING' | 'TEXT_SUCCESS' | 'FIRST_SUCCESS' | 'SUCCESS' | string
  response?: { sunoData?: Array<{ audioUrl?: string }> }
}

async function sunoGet<T>(path: string): Promise<T> {
  const res = await fetch(`${SUNO_BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  })
  if (!res.ok) throw new Error(`Suno GET erro ${res.status}`)
  return res.json() as Promise<T>
}

/**
 * Aguarda conclusão da geração de letra por polling.
 * Retorna o texto da letra quando pronto.
 */
export async function waitForLyrics(taskId: string): Promise<string> {
  const MAX_TRIES = 30   // 30 × 6s = 3 minutos
  const INTERVAL  = 6_000

  for (let i = 0; i < MAX_TRIES; i++) {
    await sleep(INTERVAL)

    const res = await sunoGet<{ data?: LyricsRecord }>(`/lyrics/record-info?taskId=${taskId}`)
    const record = res.data

    if (!record) continue

    if (record.status === 'SUCCESS') {
      const text = record.response?.data?.[0]?.text
      if (text) return text
    }

    if (record.status === 'GENERATE_LYRICS_FAILED' || record.status === 'SENSITIVE_WORD_ERROR') {
      throw new Error(`Geração de letra falhou: ${record.status}`)
    }
  }

  throw new Error('Timeout aguardando letra do jingle.')
}

/**
 * Aguarda conclusão da geração de música por polling.
 * Retorna a URL do MP3 quando pronto.
 */
export async function waitForMusic(taskId: string): Promise<string> {
  const MAX_TRIES = 40   // 40 × 8s = ~5 minutos
  const INTERVAL  = 8_000

  for (let i = 0; i < MAX_TRIES; i++) {
    await sleep(INTERVAL)

    const res = await sunoGet<{ data?: MusicRecord }>(`/generate/record-info?taskId=${taskId}`)
    const record = res.data

    if (!record) continue

    if (record.status === 'SUCCESS') {
      const audioUrl = record.response?.sunoData?.[0]?.audioUrl
      if (audioUrl) return audioUrl
    }

    if (record.status?.includes('FAILED') || record.status?.includes('EXCEPTION')) {
      throw new Error(`Geração de música falhou: ${record.status}`)
    }
  }

  throw new Error('Timeout aguardando geração do jingle.')
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Consulta de créditos ──────────────────────────────────────

export async function getSunoCredits(): Promise<number> {
  const res = await fetch(`${SUNO_BASE_URL}/credits`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  })
  const json = (await res.json()) as { data?: { credits?: number } }
  return json.data?.credits ?? 0
}
