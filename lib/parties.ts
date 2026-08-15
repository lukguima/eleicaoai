import type { VisualStyle } from '@/types'

export interface PartyDef {
  id: string
  name: string
  aliases: string[]
  primary: string
  secondary: string
  visual_style: VisualStyle
}

/** Partidos com identidade visual padrão. Cores aproximadas da marca; o candidato pode alterar. */
export const PARTIES: PartyDef[] = [
  { id: 'PT', name: 'Partido dos Trabalhadores', aliases: ['PARTIDO DOS TRABALHADORES'], primary: '#cc0000', secondary: '#ffcc00', visual_style: 'popular' },
  { id: 'PL', name: 'Partido Liberal', aliases: ['PARTIDO LIBERAL'], primary: '#0b3d91', secondary: '#ffcc00', visual_style: 'classico' },
  { id: 'MDB', name: 'Movimento Democrático Brasileiro', aliases: ['MOVIMENTO DEMOCRATICO BRASILEIRO'], primary: '#00843d', secondary: '#ffffff', visual_style: 'classico' },
  { id: 'UNIÃO', name: 'União Brasil', aliases: ['UNIAO', 'UNIAO BRASIL', 'UNIÃO BRASIL'], primary: '#003399', secondary: '#ffcc00', visual_style: 'classico' },
  { id: 'PP', name: 'Progressistas', aliases: ['PROGRESSISTAS'], primary: '#003399', secondary: '#ffcc00', visual_style: 'classico' },
  { id: 'PSD', name: 'Partido Social Democrático', aliases: ['PARTIDO SOCIAL DEMOCRATICO'], primary: '#e87722', secondary: '#003399', visual_style: 'popular' },
  { id: 'REPUBLICANOS', name: 'Republicanos', aliases: ['PRB'], primary: '#00a859', secondary: '#003399', visual_style: 'classico' },
  { id: 'PDT', name: 'Partido Democrático Trabalhista', aliases: ['PARTIDO DEMOCRATICO TRABALHISTA'], primary: '#cc0000', secondary: '#ffffff', visual_style: 'popular' },
  { id: 'PSB', name: 'Partido Socialista Brasileiro', aliases: ['PARTIDO SOCIALISTA BRASILEIRO'], primary: '#ee1c25', secondary: '#ffcc00', visual_style: 'popular' },
  { id: 'PSDB', name: 'Partido da Social Democracia Brasileira', aliases: ['TUCANO', 'TUCANOS'], primary: '#0055a4', secondary: '#ffcc00', visual_style: 'classico' },
  { id: 'PODE', name: 'Podemos', aliases: ['PODEMOS'], primary: '#7b2d8e', secondary: '#ffcc00', visual_style: 'moderno' },
  { id: 'NOVO', name: 'Partido Novo', aliases: ['PARTIDO NOVO'], primary: '#1d1d1b', secondary: '#f7941d', visual_style: 'moderno' },
  { id: 'PSOL', name: 'Partido Socialismo e Liberdade', aliases: ['PARTIDO SOCIALISMO E LIBERDADE'], primary: '#ffcc00', secondary: '#cc0000', visual_style: 'popular' },
  { id: 'PCdoB', name: 'Partido Comunista do Brasil', aliases: ['PC DO B', 'PCdoB', 'PARTIDO COMUNISTA DO BRASIL'], primary: '#cc0000', secondary: '#ffcc00', visual_style: 'popular' },
  { id: 'PV', name: 'Partido Verde', aliases: ['PARTIDO VERDE'], primary: '#009a44', secondary: '#ffd21e', visual_style: 'moderno' },
  { id: 'REDE', name: 'Rede Sustentabilidade', aliases: ['REDE SUSTENTABILIDADE'], primary: '#00a99d', secondary: '#ffd21e', visual_style: 'moderno' },
  { id: 'CIDADANIA', name: 'Cidadania', aliases: ['PPS'], primary: '#e31c79', secondary: '#ffd21e', visual_style: 'moderno' },
  { id: 'SOLIDARIEDADE', name: 'Solidariedade', aliases: ['SD'], primary: '#f26522', secondary: '#003399', visual_style: 'popular' },
  { id: 'AVANTE', name: 'Avante', aliases: ['PTdoB', 'PT DO B'], primary: '#1a4fa0', secondary: '#e31c23', visual_style: 'popular' },
  { id: 'PRD', name: 'Partido Renovação Democrática', aliases: ['PARTIDO RENOVACAO DEMOCRATICA', 'PATRIOTA', 'PTB'], primary: '#0a2e6d', secondary: '#ffcc00', visual_style: 'classico' },
  { id: 'MOBILIZA', name: 'Mobilização Nacional', aliases: ['MOBILIZACAO', 'PMN'], primary: '#c8102e', secondary: '#ffd21e', visual_style: 'popular' },
  { id: 'DC', name: 'Democracia Cristã', aliases: ['DEMOCRACIA CRISTA', 'PSDC'], primary: '#0055a4', secondary: '#ffffff', visual_style: 'classico' },
  { id: 'AGIR', name: 'Agir', aliases: ['PTN'], primary: '#6b2d8b', secondary: '#ffd21e', visual_style: 'moderno' },
  { id: 'PRTB', name: 'Partido Renovador Trabalhista Brasileiro', aliases: ['PARTIDO RENOVADOR TRABALHISTA BRASILEIRO'], primary: '#003399', secondary: '#cc0000', visual_style: 'classico' },
  { id: 'UP', name: 'Unidade Popular', aliases: ['UNIDADE POPULAR'], primary: '#cc0000', secondary: '#111111', visual_style: 'popular' },
]

function normalize(value: string): string {
  return value
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function lookupParty(input: string): PartyDef | null {
  const key = normalize(input)
  if (!key) return null
  for (const party of PARTIES) {
    const ids = [party.id, party.name, ...party.aliases].map(normalize)
    if (ids.includes(key)) return party
    if (key === normalize(party.id.replace('do', ' DO '))) return party
  }
  return null
}

export function partyIdentity(input: string): Pick<PartyDef, 'id' | 'primary' | 'secondary' | 'visual_style'> | null {
  const party = lookupParty(input)
  if (!party) return null
  return {
    id: party.id,
    primary: party.primary,
    secondary: party.secondary,
    visual_style: party.visual_style,
  }
}

export function partyAcronym(input: string): string {
  const found = lookupParty(input)
  if (found) return found.id
  const trimmed = input.trim().toUpperCase()
  if (!trimmed) return ''
  if (trimmed.length <= 6) return trimmed
  const initials = trimmed.split(/\s+/).map(w => w[0]).join('')
  return initials.slice(0, 5) || trimmed.slice(0, 5)
}

export function applyPartyToForm<T extends {
  party: string
  primary_color: string
  secondary_color: string
  visual_style: VisualStyle
}>(form: T, party: string): T {
  const ident = partyIdentity(party)
  if (!ident) return { ...form, party }
  return {
    ...form,
    party: ident.id,
    primary_color: ident.primary,
    secondary_color: ident.secondary,
    visual_style: ident.visual_style,
  }
}
