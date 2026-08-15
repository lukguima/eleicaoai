import type { AssetType } from '@/types'

// ============================================================
// Especificação de render por tipo de peça.
// baseW/baseH = tamanho lógico em que o template é desenhado
//   (usado no preview do editor e como canvas do satori).
// printW/printH = tamanho final em px na resolução de gráfica.
// O resvg escala do lógico para o de impressão (zoom = printW / baseW).
// bleedMm = sangria adicionada apenas no PDF (Fase 2.4).
// ============================================================

export interface RenderSpec {
  label: string
  mmW: number | null   // dimensão física (null p/ peças puramente digitais)
  mmH: number | null
  dpi: number
  printW: number       // px finais
  printH: number
  baseW: number        // px lógicos (autoria/preview)
  baseH: number
  bleedMm: number
}

function px(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi)
}

export const RENDER_SPECS: Record<Exclude<AssetType, 'jingle'>, RenderSpec> = {
  santinho: {
    label: 'Santinho',
    mmW: 70, mmH: 100, dpi: 300,
    printW: px(70, 300), printH: px(100, 300),   // 827 × 1181
    baseW: 413, baseH: 590,
    bleedMm: 3,
  },
  banner: {
    label: 'Banner',
    mmW: 800, mmH: 1200, dpi: 150,
    printW: px(800, 150), printH: px(1200, 150),  // 4724 × 7087
    baseW: 472, baseH: 709,
    bleedMm: 3,
  },
  perfurado: {
    label: 'Faixa Perfurada',
    mmW: 1000, mmH: 400, dpi: 150,
    printW: px(1000, 150), printH: px(400, 150),  // 5906 × 2362
    baseW: 590, baseH: 236,
    bleedMm: 3,
  },
  social: {
    label: 'Post para Redes Sociais',
    mmW: null, mmH: null, dpi: 72,
    printW: 1080, printH: 1080,
    baseW: 540, baseH: 540,
    bleedMm: 0,
  },
  stories: {
    label: 'Stories / Reels',
    mmW: null, mmH: null, dpi: 72,
    printW: 1080, printH: 1920,
    baseW: 540, baseH: 960,
    bleedMm: 0,
  },
  colinha: {
    label: 'Colinha de urna',
    mmW: 50, mmH: 70, dpi: 300,
    printW: px(50, 300), printH: px(70, 300),
    baseW: 250, baseH: 350,
    bleedMm: 2,
  },
  adesivo: {
    label: 'Adesivo / Praguinha',
    mmW: 400, mmH: 150, dpi: 150,
    printW: px(400, 150), printH: px(150, 150),
    baseW: 800, baseH: 300,
    bleedMm: 3,
  },
  capa: {
    label: 'Capa Facebook / Thumb',
    mmW: null, mmH: null, dpi: 72,
    printW: 1200, printH: 630,
    baseW: 600, baseH: 315,
    bleedMm: 0,
  },
  status: {
    label: 'Status WhatsApp',
    mmW: null, mmH: null, dpi: 72,
    printW: 1080, printH: 1920,
    baseW: 540, baseH: 960,
    bleedMm: 0,
  },
}

export function getRenderSpec(assetType: string): RenderSpec | null {
  return (RENDER_SPECS as Record<string, RenderSpec>)[assetType] ?? null
}

// ── Variações de template disponíveis por tipo ────────────────
export interface TemplateVariation {
  id: string
  label: string
  description: string
}

export const TEMPLATE_VARIATIONS: Record<Exclude<AssetType, 'jingle'>, TemplateVariation[]> = {
  santinho: [
    { id: 'classico',  label: 'Clássico',  description: 'Foto no topo, faixa de cor com número grande embaixo.' },
    { id: 'moderno',   label: 'Moderno',   description: 'Divisão diagonal, número gigante ao lado da foto.' },
    { id: 'popular',   label: 'Popular',   description: 'Foto em tela cheia com degradê e selo do número.' },
  ],
  banner: [
    { id: 'classico',  label: 'Clássico',  description: 'Layout vertical com foto e número em destaque.' },
    { id: 'moderno',   label: 'Moderno',   description: 'Tipografia dominante, foto lateral.' },
    { id: 'popular',   label: 'Popular',   description: 'Foto em tela cheia, faixa inferior.' },
  ],
  perfurado: [
    { id: 'classico',  label: 'Clássico',  description: 'Faixa horizontal com número à esquerda.' },
    { id: 'moderno',   label: 'Moderno',   description: 'Foto recortada à direita, texto grande.' },
    { id: 'popular',   label: 'Popular',   description: 'Fundo de cor sólida, alto contraste.' },
  ],
  social: [
    { id: 'classico',  label: 'Clássico',  description: 'Quadrado com foto e número centralizados.' },
    { id: 'moderno',   label: 'Moderno',   description: 'Composição assimétrica moderna.' },
    { id: 'popular',   label: 'Popular',   description: 'Foto em tela cheia com degradê.' },
  ],
  stories: [
    { id: 'classico',  label: 'Clássico',  description: 'Foto no topo, número embaixo.' },
    { id: 'moderno',   label: 'Moderno',   description: 'Número lateral, foto cheia.' },
    { id: 'popular',   label: 'Popular',   description: 'Tela cheia com selo do número.' },
  ],
  colinha: [
    { id: 'classico',  label: 'Clássico',  description: 'Foto de fundo, número gigante na faixa de baixo.' },
    { id: 'moderno',   label: 'Moderno',   description: 'Foto de fundo, cola compacta e legível.' },
    { id: 'popular',   label: 'Popular',   description: 'Foto de fundo, alto contraste na urna.' },
  ],
  adesivo: [
    { id: 'classico',  label: 'Clássico',  description: 'Faixa com número à esquerda.' },
    { id: 'moderno',   label: 'Moderno',   description: 'Foto recortada à direita.' },
    { id: 'popular',   label: 'Popular',   description: 'Fundo sólido, alto contraste.' },
  ],
  capa: [
    { id: 'classico',  label: 'Clássico',  description: 'Foto à esquerda, número à direita.' },
    { id: 'moderno',   label: 'Moderno',   description: 'Tipografia dominante.' },
    { id: 'popular',   label: 'Popular',   description: 'Foto em tela cheia.' },
  ],
  status: [
    { id: 'classico',  label: 'Clássico',  description: 'Vertical para WhatsApp.' },
    { id: 'moderno',   label: 'Moderno',   description: 'Número em destaque.' },
    { id: 'popular',   label: 'Popular',   description: 'Foto em tela cheia.' },
  ],
}

export const DEFAULT_TEMPLATE_ID = 'classico'

export type PhotoPlacementId = 'background' | 'top' | 'left' | 'right'

const ALL_PLACES: { id: PhotoPlacementId; label: string }[] = [
  { id: 'background', label: 'Fundo' },
  { id: 'top', label: 'Em cima' },
  { id: 'left', label: 'Esquerda' },
  { id: 'right', label: 'Direita' },
]

const SIDE_PLACES: { id: PhotoPlacementId; label: string }[] = [
  { id: 'background', label: 'Fundo' },
  { id: 'left', label: 'Esquerda' },
  { id: 'right', label: 'Direita' },
]

/** Locais de foto oferecidos no editor, por tipo de peça. */
export const PHOTO_PLACEMENTS: Record<Exclude<AssetType, 'jingle'>, { id: PhotoPlacementId; label: string }[]> = {
  santinho: ALL_PLACES,
  banner: ALL_PLACES,
  social: ALL_PLACES,
  stories: ALL_PLACES,
  status: ALL_PLACES,
  colinha: ALL_PLACES,
  capa: SIDE_PLACES,
  perfurado: SIDE_PLACES,
  adesivo: SIDE_PLACES,
}

export function impliedPhotoPlacement(assetType: Exclude<AssetType, 'jingle'>, templateId: string): PhotoPlacementId | null {
  if (assetType === 'perfurado') {
    if (templateId === 'popular') return null
    if (templateId === 'moderno') return 'right'
    return 'background'
  }
  if (assetType === 'adesivo') {
    return templateId === 'moderno' ? 'right' : null
  }
  if (assetType === 'capa') return templateId === 'popular' ? 'background' : 'left'
  if (assetType === 'social') {
    if (templateId === 'moderno') return 'left'
    if (templateId === 'popular') return 'background'
    return 'top'
  }
  if (assetType === 'stories' || assetType === 'status' || assetType === 'colinha') return 'background'
  if (assetType === 'banner') return templateId === 'popular' ? 'background' : 'top'
  if (templateId === 'moderno') return 'right'
  if (templateId === 'popular') return 'background'
  return 'top'
}
