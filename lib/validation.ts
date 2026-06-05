import { z } from 'zod'

// ── Candidato ─────────────────────────────────────────────────

export const candidateSchema = z.object({
  name:              z.string().min(2).max(150),
  election_number:   z.string().min(2).max(6).regex(/^\d+$/, 'Apenas números'),
  party:             z.string().min(2).max(100),
  campaign_cnpj:     z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
  cpf:               z.string().regex(/^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF inválido'),
  slogan:            z.string().max(100).optional(),
  biography_summary: z.string().min(20).max(500),
  primary_color:     z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  secondary_color:   z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  jingle_style: z
    .enum([
      'Sertanejo Universitário',
      'Forró',
      'Funk Gospel',
      'MPB',
      'Pagode',
      'Rap Político',
    ])
    .optional(),
})

export type CandidateInput = z.infer<typeof candidateSchema>

// ── Jingle ────────────────────────────────────────────────────

export const jingleRequestSchema = z.object({
  candidate_id: z.string().uuid(),
  style: z
    .enum([
      'Sertanejo Universitário',
      'Forró',
      'Funk Gospel',
      'MPB',
      'Pagode',
      'Rap Político',
    ])
    .default('Sertanejo Universitário'),
  duration_seconds: z.number().int().min(15).max(60).default(30),
})

// ── Imagem ───────────────────────────────────────────────────

export const imageRequestSchema = z.object({
  candidate_id: z.string().uuid(),
  asset_type: z.enum(['santinho', 'banner', 'perfurado', 'social']),
})

// ── Upload de foto ────────────────────────────────────────────

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

export function validateUploadMime(mime: string): void {
  if (!ALLOWED_MIME_TYPES.includes(mime)) {
    throw new Error(`Tipo de arquivo não permitido: ${mime}`)
  }
}

// Magic bytes para validação real (não confiar apenas no MIME do header)
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png':  [[0x89, 0x50, 0x4e, 0x47]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]],
}

export function validateMagicBytes(buffer: Buffer, mime: string): void {
  const signatures = MAGIC_BYTES[mime]
  if (!signatures) throw new Error('MIME type não suportado')

  const matches = signatures.some((sig) =>
    sig.every((byte, i) => buffer[i] === byte)
  )

  if (!matches) {
    throw new Error('Arquivo inválido: magic bytes não correspondem ao tipo declarado')
  }
}
