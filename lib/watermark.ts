import sharp from 'sharp'
import type { AssetType } from '@/types'
import { IMAGE_WATERMARK_TEXT } from './compliance-text'

// TSE Res. 23.610/2019 art. 9º-B (redação 23.755/2026): rótulo em conteúdo sintético.
const EXEMPT_TYPES = new Set<AssetType>(['jingle'])

const WATERMARK_TEXT = IMAGE_WATERMARK_TEXT
const FOOTER_HEIGHT = 48
const FONT_SIZE = 13

const ASSET_DIMENSIONS: Record<AssetType, { w: number; h: number }> = {
  santinho:  { w: 900,  h: 1200 },
  banner:    { w: 800,  h: 1200 },
  perfurado: { w: 1200, h: 480  },
  social:    { w: 1080, h: 1080 },
  jingle:    { w: 512,  h: 512  },
  stories:   { w: 1080, h: 1920 },
  colinha:   { w: 591,  h: 827  },
  adesivo:   { w: 2362, h: 886  },
  capa:      { w: 1200, h: 630  },
  status:    { w: 1080, h: 1920 },
}

/**
 * Injeta marca d'água de IA e rodapé com CNPJ no download.
 * Se showAiLabel for false, devolve a imagem como está (o template já tratou o rodapé).
 */
export async function injectImageWatermark(
  imageBuffer: Buffer,
  assetType: AssetType,
  campaignCnpj: string,
  showAiLabel = true,
  showCnpj = true,
): Promise<Buffer> {
  if (EXEMPT_TYPES.has(assetType)) return imageBuffer
  // Sem aviso de IA: a peça já saiu do template; não recoloca o texto no download.
  if (!showAiLabel) return imageBuffer

  const image = sharp(imageBuffer)
  const meta = await image.metadata()
  const width = meta.width ?? ASSET_DIMENSIONS[assetType].w
  const height = meta.height ?? ASSET_DIMENSIONS[assetType].h

  const footerSvg = buildFooterSvg(width, campaignCnpj, showCnpj)
  const watermarkSvg = buildCornerWatermarkSvg(width)

  const result = await sharp(imageBuffer)
    .composite([
      // Rodapé legal (CNPJ + obrigação TSE)
      {
        input: Buffer.from(footerSvg),
        top: height - FOOTER_HEIGHT,
        left: 0,
        blend: 'over',
      },
      // Marca d'água diagonal semitransparente
      {
        input: Buffer.from(watermarkSvg),
        top: 0,
        left: 0,
        blend: 'over',
      },
    ])
    .toBuffer()

  return result
}

// ── SVG helpers ────────────────────────────────────────────────

function buildFooterSvg(width: number, cnpj: string, showCnpj: boolean): string {
  const parts = [WATERMARK_TEXT]
  if (showCnpj && cnpj) parts.push(`CNPJ Campanha: ${cnpj}`)
  const label = parts.join('  |  ')
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${FOOTER_HEIGHT}">
  <rect width="${width}" height="${FOOTER_HEIGHT}" fill="rgba(0,0,0,0.65)" rx="0"/>
  <text
    x="${width / 2}"
    y="${FOOTER_HEIGHT / 2 + FONT_SIZE / 3}"
    font-family="Arial, sans-serif"
    font-size="${FONT_SIZE}"
    fill="white"
    text-anchor="middle"
    dominant-baseline="middle"
    font-weight="bold"
    opacity="0.95"
  >${escapeXml(label)}</text>
</svg>`.trim()
}

function buildCornerWatermarkSvg(width: number): string {
  // Faixa diagonal semitransparente no canto superior direito
  const size = Math.round(width * 0.38)
  const fontSize = Math.max(11, Math.round(width * 0.018))
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${size}">
  <g transform="translate(${width}, 0) rotate(45, 0, 0)">
    <rect x="-${size / 2}" y="-8" width="${size}" height="${fontSize + 10}" fill="rgba(0,0,0,0.30)" rx="4"/>
    <text
      x="0"
      y="${fontSize}"
      font-family="Arial, sans-serif"
      font-size="${fontSize}"
      fill="white"
      text-anchor="middle"
      opacity="0.75"
      letter-spacing="1"
    >${escapeXml(WATERMARK_TEXT)}</text>
  </g>
</svg>`.trim()
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Converte URL pública em Buffer (fetch server-side).
 * Usado pelo endpoint de export antes de injetar watermark.
 */
export async function fetchImageAsBuffer(url: string): Promise<Buffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) })
  if (!res.ok) throw new Error(`Falha ao buscar imagem: ${res.status}`)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
