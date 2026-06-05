import sharp from 'sharp'
import type { AssetType } from '@/types'

// TSE Resolução 23.732/2024 Art. 9º-B §2 II:
// Logos e vinhetas são isentos da marca d'água de IA.
// Todos os demais tipos de imagem gerada por IA devem ter o rótulo.
const EXEMPT_TYPES = new Set<AssetType>(['jingle']) // capa do jingle é tratada internamente

const WATERMARK_TEXT = 'Conteúdo fabricado com IA'
const FOOTER_HEIGHT = 48
const FONT_SIZE = 14

// Dimensões esperadas por tipo (px @ 96 dpi — base para cálculo do footer)
const ASSET_DIMENSIONS: Record<AssetType, { w: number; h: number }> = {
  santinho:  { w: 900,  h: 1200 },
  banner:    { w: 800,  h: 1200 },
  perfurado: { w: 1200, h: 480  },
  social:    { w: 1080, h: 1080 },
  jingle:    { w: 512,  h: 512  },
}

/**
 * Injeta marca d'água "Conteúdo fabricado com IA" no canto inferior direito
 * e rodapé com CNPJ da campanha — obrigatório pelo Art. 9º-B §1 II TSE 2024.
 *
 * Isenta: tipos em EXEMPT_TYPES (Art. 9º-B §2 II).
 */
export async function injectImageWatermark(
  imageBuffer: Buffer,
  assetType: AssetType,
  campaignCnpj: string,
): Promise<Buffer> {
  if (EXEMPT_TYPES.has(assetType)) return imageBuffer

  const image = sharp(imageBuffer)
  const meta = await image.metadata()
  const width = meta.width ?? ASSET_DIMENSIONS[assetType].w
  const height = meta.height ?? ASSET_DIMENSIONS[assetType].h

  const footerSvg = buildFooterSvg(width, campaignCnpj)
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

function buildFooterSvg(width: number, cnpj: string): string {
  const label = `${WATERMARK_TEXT}  |  CNPJ Campanha: ${cnpj}`
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
