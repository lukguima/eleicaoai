import type { JingleStyle, Office, VisualStyle } from '@/types'
import { lookupParty } from '@/lib/parties'

export const OFFICES: { value: Office; label: string }[] = [
  { value: 'deputado_estadual', label: 'Deputado estadual' },
  { value: 'deputado_federal', label: 'Deputado federal' },
  { value: 'deputado_distrital', label: 'Deputado distrital' },
  { value: 'senador', label: 'Senador' },
  { value: 'governador', label: 'Governador' },
  { value: 'presidente', label: 'Presidente' },
]

export const UFS = [
  'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MG', 'MS', 'MT', 'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN',
  'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
] as const

export type UF = (typeof UFS)[number]

export const JINGLE_STYLES: { value: JingleStyle; emoji: string; desc: string }[] = [
  { value: 'Sertanejo Universitário', emoji: '🤠', desc: 'Batida moderna — interior e agro' },
  { value: 'Forró', emoji: '🪗', desc: 'Animado e dançante — Nordeste' },
  { value: 'Funk Gospel', emoji: '🎤', desc: 'Energia alta, letra positiva' },
  { value: 'MPB', emoji: '🎸', desc: 'Urbano e sofisticado' },
  { value: 'Pagode', emoji: '🥁', desc: 'Popular — Sudeste' },
  { value: 'Rap Político', emoji: '✊', desc: 'Direto — conecta com jovens' },
]

export const VISUAL_STYLES: { value: VisualStyle; label: string; description: string }[] = [
  { value: 'classico', label: 'Clássico', description: 'Foto no topo, número grande embaixo.' },
  { value: 'moderno', label: 'Moderno', description: 'Tipografia dominante, composição assimétrica.' },
  { value: 'popular', label: 'Popular', description: 'Foto em tela cheia, alto contraste.' },
]

export interface Palette {
  id: string
  label: string
  primary: string
  secondary: string
}

export function palettesForParty(party: string): Palette[] {
  const fromParty = lookupParty(party)
  const partyPalette: Palette = fromParty
    ? { id: 'partido', label: `Cores do ${fromParty.id}`, primary: fromParty.primary, secondary: fromParty.secondary }
    : { id: 'partido', label: 'Azul campanha', primary: '#1a56db', secondary: '#ffd21e' }

  return [
    partyPalette,
    { id: 'navy', label: 'Marinho e ouro', primary: '#0a1b3d', secondary: '#fabd00' },
    { id: 'verde', label: 'Verde e amarelo', primary: '#0b5c2e', secondary: '#ffd21e' },
    { id: 'escuro', label: 'Preto e branco', primary: '#111111', secondary: '#ffffff' },
  ]
}

export function officeLabel(office?: Office | null): string {
  return OFFICES.find(o => o.value === office)?.label ?? 'Candidato'
}
