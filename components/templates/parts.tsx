import type { Design } from '@/types'

// Partes compartilhadas dos templates. CSS restrito ao subconjunto do satori.

const COMPLIANCE_TEXT = 'Conteúdo fabricado com IA'

export function complianceLabel(cnpj: string): string {
  return cnpj ? `${COMPLIANCE_TEXT} · CNPJ ${cnpj}` : COMPLIANCE_TEXT
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
export function PhotoSlot({ design, placeholderSize = 22 }: { design: Design; placeholderSize?: number }) {
  const p = design.photo
  const src = p?.cutout_url || p?.url
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
      {complianceLabel(design.fields.cnpj)}
    </div>
  )
}
