// ============================================================
// EleiçãoAI — Tipos centrais
// ============================================================

export type AssetType = 'santinho' | 'banner' | 'perfurado' | 'social' | 'jingle'
export type AssetStatus = 'pending' | 'processing' | 'done' | 'failed'
export type SubscriptionPlan = 'starter' | 'pro' | 'completo'

export interface Candidate {
  id: string
  user_id: string
  name: string
  election_number: string
  party: string
  campaign_cnpj: string
  slogan?: string
  biography_summary: string
  cpf_encrypted: string
  base_photo_url?: string
  primary_color: string
  secondary_color: string
  created_at: string
  updated_at: string
}

export interface CandidateFormData {
  name: string
  election_number: string
  party: string
  campaign_cnpj: string
  cpf: string            // plain text apenas em memória, nunca persiste assim
  slogan?: string
  biography_summary: string
  primary_color?: string
  secondary_color?: string
  jingle_style?: JingleStyle
}

export type JingleStyle =
  | 'Sertanejo Universitário'
  | 'Forró'
  | 'Funk Gospel'
  | 'MPB'
  | 'Pagode'
  | 'Rap Político'

export interface Asset {
  id: string
  candidate_id: string
  asset_type: AssetType
  status: AssetStatus
  external_task_id?: string
  output_url?: string
  preview_url?: string
  metadata: Record<string, unknown>
  ai_model?: string
  lyrics?: string
  error_message?: string
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  candidate_id: string
  plan: SubscriptionPlan
  credits_remaining: number
  valid_until?: string
}

export interface ComplianceLog {
  id: string
  event_type: 'IMAGE_GENERATION' | 'JINGLE_GENERATION' | 'LYRICS_GENERATION' | 'EXPORT'
  candidate_id: string
  asset_id?: string
  timestamp: string
  ai_model?: string
  legal_basis: string
}

// ── Suno API ────────────────────────────────────────────────

export interface SunoLyricsRequest {
  prompt: string       // max 200 chars
  callBackUrl: string
}

export interface SunoGenerateRequest {
  customMode: boolean
  instrumental: boolean
  callBackUrl: string
  model: 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5' | 'V5_5'
  prompt: string
  style?: string
  title?: string
  negativeTags?: string
  vocalGender?: 'm' | 'f'
}

export interface SunoTaskResponse {
  code: number
  msg: string
  data: { taskId: string }
}

export interface SunoCallbackTrack {
  id: string
  audio_url: string
  stream_audio_url: string
  image_url: string
  title: string
  tags: string
  duration: number
  createTime: string
}

export interface SunoLyricsCallbackData {
  text: string
  title: string
  status: 'complete' | 'failed'
  errorMessage?: string
}

export interface SunoCallback {
  code: number
  msg: string
  data: {
    callbackType: 'complete' | 'error'
    task_id?: string
    taskId?: string
    data: SunoCallbackTrack[] | SunoLyricsCallbackData[]
  }
}

// ── Higgsfield API ───────────────────────────────────────────

export interface HiggsfieldRequest {
  prompt: string
  aspect_ratio: string
  resolution?: string
}

export interface HiggsfieldResponse {
  request_id: string
  status_url: string
  cancel_url: string
}

export type HiggsfieldStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'nsfw'

export interface HiggsfieldStatusResponse {
  status: HiggsfieldStatus
  output?: { url: string }[]
  error?: string
}

// ── API responses internas ───────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}
