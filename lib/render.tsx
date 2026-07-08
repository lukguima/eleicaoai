import { readFileSync } from 'fs'
import path from 'path'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'
import { PDFDocument } from 'pdf-lib'
import type { AssetType, Design } from '@/types'
import { getRenderSpec } from '@/components/templates/registry'
import { SantinhoTemplate } from '@/components/templates/SantinhoTemplate'
import { BannerTemplate } from '@/components/templates/BannerTemplate'
import { PerfuradoTemplate } from '@/components/templates/PerfuradoTemplate'
import { SocialTemplate } from '@/components/templates/SocialTemplate'

// ============================================================
// Motor de render: template React → satori (SVG) → resvg (PNG).
// O MESMO template é usado no preview do editor; aqui ele é
// rasterizado na resolução de gráfica.
// ============================================================

type FontDef = { name: string; data: Buffer; weight: 400 | 700 | 800; style: 'normal' }
let FONTS: FontDef[] | null = null

function loadFonts(): FontDef[] {
  if (FONTS) return FONTS
  const dir = path.join(process.cwd(), 'assets', 'fonts')
  FONTS = [
    { name: 'Inter', data: readFileSync(path.join(dir, 'inter-400.woff')), weight: 400, style: 'normal' },
    { name: 'Inter', data: readFileSync(path.join(dir, 'inter-700.woff')), weight: 700, style: 'normal' },
    { name: 'Inter', data: readFileSync(path.join(dir, 'inter-800.woff')), weight: 800, style: 'normal' },
    { name: 'Anton', data: readFileSync(path.join(dir, 'anton-400.woff')), weight: 400, style: 'normal' },
  ]
  return FONTS
}

const TEMPLATES: Record<Exclude<AssetType, 'jingle'>, (props: { design: Design }) => React.ReactElement> = {
  santinho: SantinhoTemplate,
  banner: BannerTemplate,
  perfurado: PerfuradoTemplate,
  social: SocialTemplate,
}

/** Baixa uma imagem e devolve como data URI (satori não busca URLs remotas de forma confiável). */
async function toDataUri(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? 'image/jpeg'
    const buf = Buffer.from(await res.arrayBuffer())
    return `data:${type};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

/** Prepara o design para render server-side: embute a foto como data URI. */
async function prepareDesign(design: Design): Promise<Design> {
  if (!design.photo) return design
  const src = design.photo.cutout_url || design.photo.url
  if (!src || src.startsWith('data:')) return design
  const dataUri = await toDataUri(src)
  if (!dataUri) return design
  return {
    ...design,
    photo: {
      ...design.photo,
      url: dataUri,
      cutout_url: design.photo.cutout_url ? dataUri : undefined,
    },
  }
}

export interface RenderResult {
  png: Buffer
  width: number
  height: number
}

/** Renderiza um design em PNG na resolução de impressão do tipo. */
export async function renderDesign(design: Design, assetType: Exclude<AssetType, 'jingle'>): Promise<RenderResult> {
  const spec = getRenderSpec(assetType)
  if (!spec) throw new Error(`Tipo de peça sem especificação de render: ${assetType}`)

  const Template = TEMPLATES[assetType]
  if (!Template) throw new Error(`Template não encontrado para: ${assetType}`)

  const prepared = await prepareDesign(design)

  const svg = await satori(<Template design={prepared} />, {
    width: spec.baseW,
    height: spec.baseH,
    fonts: loadFonts(),
  })

  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: spec.printW } })
  const png = Buffer.from(resvg.render().asPng())

  return { png, width: spec.printW, height: spec.printH }
}

const MM_TO_PT = 72 / 25.4

/**
 * Gera um PDF pronto para gráfica a partir do PNG renderizado.
 * A página tem o tamanho de corte + sangria (bleed) nas quatro bordas;
 * como os layouts são full-bleed (fundo cobre tudo), a arte é ampliada
 * para preencher a sangria, evitando filete branco no corte.
 * Retorna null para peças sem dimensão física (ex.: social/digital).
 */
export async function renderDesignToPdf(png: Buffer, assetType: Exclude<AssetType, 'jingle'>): Promise<Buffer | null> {
  const spec = getRenderSpec(assetType)
  if (!spec || spec.mmW == null || spec.mmH == null) return null

  const bleed = spec.bleedMm
  const pageWpt = (spec.mmW + bleed * 2) * MM_TO_PT
  const pageHpt = (spec.mmH + bleed * 2) * MM_TO_PT

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([pageWpt, pageHpt])
  const img = await pdf.embedPng(png)

  // Preenche a página inteira (corte + sangria).
  page.drawImage(img, { x: 0, y: 0, width: pageWpt, height: pageHpt })

  pdf.setTitle(`EleicaoAI — ${spec.label}`)
  pdf.setProducer('EleicaoAI')

  const bytes = await pdf.save()
  return Buffer.from(bytes)
}
