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
}

export const DEFAULT_TEMPLATE_ID = 'classico'
