import type {
  SunoGenerateRequest,
  SunoTaskResponse,
  JingleStyle,
  Candidate,
} from '@/types'
import { AUDIO_COMPLIANCE_INTRO } from '@/lib/compliance'

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
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getApiKey()}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Suno API erro ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// ── Geração de Música ─────────────────────────────────────────
// A letra vem pronta (gerada por LLM e aprovada/editada pelo usuário).
// O aviso legal de IA é embutido no início do conteúdo cantado.

export function buildMusicPrompt(lyrics: string): string {
  const full = `${AUDIO_COMPLIANCE_INTRO} ${lyrics}`
  return full.slice(0, 5000) // limite de modelos V5+
}

/**
 * Dispara a geração de música com a letra aprovada. Resultado chega via
 * webhook (/api/webhooks/suno?type=music). Retorna o taskId.
 */
export async function generateJingle(
  candidate: Candidate,
  lyrics: string,
  style: JingleStyle,
  assetId: string,
): Promise<string> {
  const title = `${candidate.name} ${candidate.election_number} - ${candidate.party}`
  const secret = process.env.SUNO_WEBHOOK_SECRET ?? ''

  const payload: SunoGenerateRequest = {
    customMode: true,
    instrumental: false,
    model: 'V5_5',
    callBackUrl: `${getCallbackBase()}/api/webhooks/suno?asset_id=${assetId}&type=music&s=${encodeURIComponent(secret)}`,
    prompt: buildMusicPrompt(lyrics),
    style,
    title: title.slice(0, 100),
    negativeTags: 'propaganda negativa, difamação, agressivo',
  }

  const response = await sunoPost<SunoTaskResponse>('/generate', payload)
  return response.data.taskId
}

// ── Polling de música (fallback p/ dev sem webhook público) ──────
// Em produção o webhook chega antes; em dev local isso garante a conclusão.

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

export async function waitForMusic(taskId: string): Promise<string> {
  const MAX_TRIES = 40 // 40 × 8s = ~5 minutos
  const INTERVAL = 8_000

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

/** Checagem única do status da música (usada pela reconciliação por cron). */
export async function checkMusic(taskId: string): Promise<{ status: 'done' | 'failed' | 'pending'; audioUrl?: string }> {
  const res = await sunoGet<{ data?: MusicRecord }>(`/generate/record-info?taskId=${taskId}`)
  const record = res.data
  if (!record) return { status: 'pending' }
  if (record.status === 'SUCCESS') {
    const audioUrl = record.response?.sunoData?.[0]?.audioUrl
    if (audioUrl) return { status: 'done', audioUrl }
  }
  if (record.status?.includes('FAILED') || record.status?.includes('EXCEPTION')) {
    return { status: 'failed' }
  }
  return { status: 'pending' }
}

export async function getSunoCredits(): Promise<number> {
  const res = await fetch(`${SUNO_BASE_URL}/credits`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  })
  const json = (await res.json()) as { data?: { credits?: number } }
  return json.data?.credits ?? 0
}
