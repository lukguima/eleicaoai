import type { Design } from '@/types'
import { PhotoSlot, complianceLabel } from './parts'

// Faixa perfurada horizontal (base 590×236). Leitura à distância.

function Footer({ design }: { design: Design }) {
  return (
    <div style={{ display: 'flex', position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', padding: '3px 10px', background: 'rgba(0,0,0,0.55)', color: 'white', fontFamily: 'Inter', fontSize: 8 }}>
      {complianceLabel(design.fields.cnpj)}
    </div>
  )
}

export function PerfuradoTemplate({ design }: { design: Design }) {
  const { fields, colors, template_id } = design

  const numberBlock = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 18, letterSpacing: 3, color: colors.secondary }}>VOTE</div>
      <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 104, lineHeight: 0.85, color: colors.secondary }}>{fields.number || '00'}</div>
    </div>
  )

  const nameBlock = (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, flexShrink: 1, overflow: 'hidden', paddingLeft: 24, paddingRight: 20 }}>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 40, color: 'white', textTransform: 'uppercase', lineHeight: 0.98 }}>{fields.name || 'Seu Nome'}</div>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 17, color: colors.secondary, marginTop: 6 }}>{fields.party}</div>
      {fields.slogan ? <div style={{ display: 'flex', fontFamily: 'Inter', fontStyle: 'italic', fontSize: 15, color: 'white', opacity: 0.85, marginTop: 2 }}>“{fields.slogan}”</div> : null}
    </div>
  )

  // popular: fundo sólido, sem foto (alto contraste para plotagem)
  if (template_id === 'popular') {
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background: colors.primary, alignItems: 'center', padding: '0 28px' }}>
        {numberBlock}
        {nameBlock}
        <Footer design={design} />
      </div>
    )
  }

  // moderno: foto recortada à direita
  if (template_id === 'moderno') {
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background: colors.primary, alignItems: 'center' }}>
        <div style={{ display: 'flex', paddingLeft: 24 }}>{numberBlock}</div>
        {nameBlock}
        <div style={{ display: 'flex', width: 200, height: '100%' }}>
          <PhotoSlot design={design} placeholderSize={18} />
        </div>
        <Footer design={design} />
      </div>
    )
  }

  // classico: foto de fundo com degradê à esquerda; número + nome por cima
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative' }}>
      <div style={{ display: 'flex', position: 'absolute', inset: 0 }}>
        <PhotoSlot design={design} placeholderSize={18} />
      </div>
      <div style={{ display: 'flex', position: 'absolute', inset: 0, backgroundImage: `linear-gradient(to right, ${colors.primary} 45%, rgba(0,0,0,0.15) 100%)` }} />
      <div style={{ display: 'flex', position: 'relative', alignItems: 'center', paddingLeft: 28 }}>{numberBlock}</div>
      <div style={{ display: 'flex', position: 'relative', alignItems: 'center', flexGrow: 1 }}>{nameBlock}</div>
      <Footer design={design} />
    </div>
  )
}

export default PerfuradoTemplate
