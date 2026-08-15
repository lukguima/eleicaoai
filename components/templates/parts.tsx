import type { ReactNode } from 'react'
import type { Design } from '@/types'
import { complianceLabel as labelFromCnpj, isAiLabelOn, isCnpjOn } from '@/lib/compliance-text'
import { partyAcronym } from '@/lib/parties'

// Partes compartilhadas dos templates. CSS restrito ao subconjunto do satori.

export function complianceLabel(cnpj: string, showAi = true, showCnpj = true): string {
  return labelFromCnpj(cnpj, showAi, showCnpj)
}

/** Camada de fundo do slot da foto: cor sólida, gradiente ou imagem de IA. */
function Backdrop({ design }: { design: Design }) {
  const bg = design.background
  if (bg?.kind === 'ai' && bg.value) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={bg.value} alt="" width="100%" height="100%" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
    )
  }
  const fill = bg?.kind === 'gradient' && bg.value
    ? { backgroundImage: bg.value }
    : { background: bg?.value || design.colors.primary }
  return <div style={{ display: 'flex', position: 'absolute', inset: 0, ...fill }} />
}

/**
 * Slot da foto: backdrop (cor/gradiente/IA) + foto do candidato por cima.
 * Com foto recortada (cutout), o backdrop aparece nas áreas transparentes.
 */
export function PhotoSlot({ design, placeholderSize = 22, preferFull = false }: { design: Design; placeholderSize?: number; preferFull?: boolean }) {
  const p = design.photo
  const src = preferFull ? (p?.url || p?.cutout_url) : (p?.cutout_url || p?.url)
  return (
    <div style={{ display: 'flex', position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Backdrop design={design} />
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width="100%"
          height="100%"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${p?.offset_x ?? 50}% ${p?.offset_y ?? 50}%`,
            transform: `scale(${p?.scale ?? 1})`,
          }}
        />
      ) : (
        <div style={{ display: 'flex', position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: placeholderSize, letterSpacing: 4, color: 'rgba(255,255,255,0.4)' }}>FOTO</div>
        </div>
      )}
    </div>
  )
}

export function ComplianceFooter({ design, fontSize = 9 }: { design: Design; fontSize?: number }) {
  const text = complianceLabel(design.fields.cnpj, isAiLabelOn(design), isCnpjOn(design))
  if (!text) return null
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5px 10px',
        background: 'rgba(0,0,0,0.55)',
        color: 'white',
        fontFamily: 'Inter',
        fontSize,
        letterSpacing: 0.2,
        textAlign: 'center',
      }}
    >
      {text}
    </div>
  )
}

export function isPartyLogoOn(design: Design): boolean {
  return design.show_party_logo !== false
}

/** Marca do partido no canto — logo enviada ou selo com a sigla. */
export function PartyMark({ design, size = 48 }: { design: Design; size?: number }) {
  if (!isPartyLogoOn(design)) return null
  const url = design.party_logo_url
  const acronym = partyAcronym(design.fields.party)
  if (!url && !acronym) return null
  const fontSize = acronym.length > 4 ? Math.round(size * 0.22) : acronym.length > 2 ? Math.round(size * 0.28) : Math.round(size * 0.36)
  return (
    <div style={{ display: 'flex', position: 'absolute', top: 10, left: 10, width: size, height: size, zIndex: 4 }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: 'contain' }} />
      ) : (
        <div style={{
          display: 'flex',
          width: size,
          height: size,
          borderRadius: size,
          background: design.colors.secondary,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderStyle: 'solid',
          borderColor: 'rgba(255,255,255,0.9)',
        }}>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize, color: design.colors.primary, lineHeight: 1 }}>{acronym}</div>
        </div>
      )}
    </div>
  )
}

export function FrameWithPartyMark({ design, children, size = 48 }: { design: Design; children: ReactNode; size?: number }) {
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}>
        {children}
      </div>
      <PartyMark design={design} size={size} />
    </div>
  )
}

/** Foto à esquerda ou à direita; o restante da peça fica na outra coluna. */
export function PhotoRow({
  design,
  side,
  photoWidth,
  children,
  placeholderSize = 22,
  preferFull = false,
}: {
  design: Design
  side: 'left' | 'right'
  photoWidth: number | string
  children: ReactNode
  placeholderSize?: number
  preferFull?: boolean
}) {
  const photo = (
    <div style={{ display: 'flex', width: photoWidth, height: '100%', flexShrink: 0 }}>
      <PhotoSlot design={design} placeholderSize={placeholderSize} preferFull={preferFull} />
    </div>
  )
  const body = (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, height: '100%' }}>
      {children}
    </div>
  )
  return (
    <div style={{ display: 'flex', flexGrow: 1, width: '100%', height: '100%' }}>
      {side === 'left' ? photo : body}
      {side === 'left' ? body : photo}
    </div>
  )
}
