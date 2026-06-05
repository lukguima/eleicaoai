import { createServerClient } from './supabase'
import type { ComplianceLog } from '@/types'
import { headers } from 'next/headers'

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

/**
 * Verifica se o candidato tem créditos disponíveis.
 * Usa a função atômica do banco para evitar race condition.
 */
export async function consumeCredit(candidateId: string): Promise<boolean> {
  const supabase = createServerClient()

  const { data, error } = await supabase.rpc('decrement_credit', {
    p_candidate_id: candidateId,
  })

  if (error) throw new Error(`Erro ao consumir crédito: ${error.message}`)
  return data as boolean
}

/**
 * Valida o CPF do candidato (algoritmo oficial).
 * Não persiste o CPF — apenas valida o formato.
 */
export function validateCpf(cpf: string): boolean {
  const clean = cpf.replace(/\D/g, '')
  if (clean.length !== 11 || /^(\d)\1+$/.test(clean)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i)
  let check = (sum * 10) % 11
  if (check === 10 || check === 11) check = 0
  if (check !== parseInt(clean[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i)
  check = (sum * 10) % 11
  if (check === 10 || check === 11) check = 0
  return check === parseInt(clean[10])
}

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

/**
 * Texto do aviso legal obrigatório para jingles.
 */
export const AUDIO_COMPLIANCE_INTRO =
  'Este conteúdo foi fabricado utilizando inteligência artificial.'

/**
 * Texto da marca d'água obrigatória em imagens.
 */
export const IMAGE_WATERMARK_TEXT = 'Conteúdo fabricado com IA'
