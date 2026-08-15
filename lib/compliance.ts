import { createServerClient } from './supabase'
import type { ComplianceLog } from '@/types'
import { headers } from 'next/headers'
import { AUDIO_COMPLIANCE_INTRO, IMAGE_WATERMARK_TEXT } from './compliance-text'

export { AUDIO_COMPLIANCE_INTRO, IMAGE_WATERMARK_TEXT }

type LogEventType = ComplianceLog['event_type']

interface LogParams {
  event_type: LogEventType
  candidate_id: string
  asset_id?: string
  ai_model?: string
}

/**
 * Registra uma operação no log imutável de compliance (LGPD).
 * Deve ser chamado pelo backend após cada geração.
 * Nunca armazena dados pessoais em texto claro.
 */
export async function logComplianceEvent(params: LogParams): Promise<void> {
  const supabase = createServerClient()

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
  const userAgent = headersList.get('user-agent') ?? null

  await supabase.from('compliance_logs').insert({
    event_type:  params.event_type,
    candidate_id: params.candidate_id,
    asset_id:    params.asset_id ?? null,
    ai_model:    params.ai_model ?? null,
    ip_address:  ip,
    user_agent:  userAgent,
    legal_basis: 'Consentimento e Execução de Campanha',
    timestamp:   new Date().toISOString(),
  })
}

export { validateCpf } from './cpf'

/**
 * Criptografa o CPF antes de persistir no banco.
 * Usa AES-256-GCM via Web Crypto ou Node crypto.
 */
export async function encryptCpf(cpf: string): Promise<string> {
  const key = process.env.CPF_ENCRYPTION_KEY
  if (!key) throw new Error('CPF_ENCRYPTION_KEY não configurada')

  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    Buffer.from(key, 'hex'),
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  )

  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    keyMaterial,
    encoder.encode(cpf)
  )

  const ivHex = Buffer.from(iv).toString('hex')
  const encHex = Buffer.from(encrypted).toString('hex')
  return `${ivHex}:${encHex}`
}

