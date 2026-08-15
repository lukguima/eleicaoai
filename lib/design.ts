import type { Candidate, Design } from '@/types'
import { DEFAULT_TEMPLATE_ID } from '@/components/templates/registry'

const PHOTO_PLACES = new Set(['auto', 'top', 'left', 'right', 'background'])

/**
 * Monta o Design inicial de uma peça a partir dos dados do candidato.
 * O usuário ajusta tudo no editor; isto é só o ponto de partida.
 */
export function defaultDesignFromCandidate(candidate: Candidate, templateId?: string): Design {
  return {
    template_id: templateId || candidate.visual_style || DEFAULT_TEMPLATE_ID,
    fields: {
      name: candidate.name,
      number: candidate.election_number,
      party: candidate.party,
      slogan: candidate.slogan ?? '',
      cnpj: candidate.campaign_cnpj,
    },
    colors: {
      primary: candidate.primary_color || '#1a56db',
      secondary: candidate.secondary_color || '#ffd21e',
    },
    photo: candidate.base_photo_url
      ? {
          url: candidate.base_photo_url,
          cutout_url: candidate.base_photo_cutout_url || undefined,
          offset_x: 50, offset_y: 50, scale: 1,
        }
      : undefined,
    background: { kind: 'solid', value: candidate.primary_color || '#1a56db' },
    label_position: 'bottom',
    show_ai_label: true,
    show_cnpj: true,
    photo_placement: 'auto',
    show_party_logo: candidate.show_party_logo !== false,
    party_logo_url: candidate.party_logo_url || undefined,
  }
}

/** Copia nome, número, partido, slogan, cores e foto do cadastro para a peça. */
export function applyCandidateToDesign(design: Design, candidate: Candidate): Design {
  return {
    ...design,
    fields: {
      ...design.fields,
      name: candidate.name,
      number: candidate.election_number,
      party: candidate.party,
      slogan: candidate.slogan ?? '',
      cnpj: candidate.campaign_cnpj || design.fields.cnpj,
    },
    colors: {
      ...design.colors,
      primary: candidate.primary_color || design.colors.primary,
      secondary: candidate.secondary_color || design.colors.secondary,
    },
    photo: candidate.base_photo_url
      ? {
          url: candidate.base_photo_url,
          cutout_url: candidate.base_photo_cutout_url || undefined,
          offset_x: design.photo?.offset_x ?? 50,
          offset_y: design.photo?.offset_y ?? 50,
          scale: design.photo?.scale ?? 1,
        }
      : design.photo,
    background: design.background.kind === 'ai'
      ? design.background
      : { kind: 'solid', value: candidate.primary_color || design.background.value },
    show_party_logo: candidate.show_party_logo !== false,
    party_logo_url: candidate.party_logo_url || undefined,
  }
}

/**
 * Validação leve do Design vindo do cliente antes de persistir/renderizar.
 * CNPJ do candidato é preenchido no campo; a exibição no rodapé pode ser desligada.
 */
export function sanitizeDesign(input: unknown, cnpj: string): Design | null {
  if (!input || typeof input !== 'object') return null
  const d = input as Partial<Design>
  if (!d.fields || !d.colors) return null

  const clampStr = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '')
  const color = (v: unknown, fallback: string) =>
    typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : fallback

  return {
    template_id: clampStr(d.template_id, 40) || 'classico',
    fields: {
      name: clampStr(d.fields.name, 150),
      number: clampStr(d.fields.number, 6),
      party: clampStr(d.fields.party, 100),
      slogan: clampStr(d.fields.slogan, 100),
      // CNPJ é sempre o do candidato (compliance) — não confia no cliente
      cnpj,
    },
    colors: {
      primary: color(d.colors.primary, '#1a56db'),
      secondary: color(d.colors.secondary, '#ffd21e'),
      accent: d.colors.accent ? color(d.colors.accent, '#ffffff') : undefined,
    },
    photo: d.photo && typeof d.photo.url === 'string'
      ? {
          url: d.photo.url.slice(0, 2000),
          cutout_url: typeof d.photo.cutout_url === 'string' ? d.photo.cutout_url.slice(0, 2000) : undefined,
          offset_x: Number.isFinite(d.photo.offset_x) ? Number(d.photo.offset_x) : 50,
          offset_y: Number.isFinite(d.photo.offset_y) ? Number(d.photo.offset_y) : 50,
          scale: Number.isFinite(d.photo.scale) ? Number(d.photo.scale) : 1,
        }
      : undefined,
    background: d.background && (d.background.kind === 'solid' || d.background.kind === 'gradient' || d.background.kind === 'ai')
      ? { kind: d.background.kind, value: clampStr(d.background.value, 2000) }
      : { kind: 'solid', value: color(d.colors?.primary, '#1a56db') },
    label_position: d.label_position === 'top' ? 'top' : 'bottom',
    show_ai_label: d.show_ai_label !== false,
    show_cnpj: d.show_cnpj !== false,
    photo_placement: PHOTO_PLACES.has(d.photo_placement as string)
      ? d.photo_placement as Design['photo_placement']
      : 'auto',
    show_party_logo: d.show_party_logo !== false,
    party_logo_url: typeof d.party_logo_url === 'string' && d.party_logo_url
      ? d.party_logo_url.slice(0, 2000)
      : undefined,
  }
}
