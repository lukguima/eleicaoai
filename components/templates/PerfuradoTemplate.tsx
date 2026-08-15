import type { Design } from '@/types'
import { PhotoSlot, PhotoRow, complianceLabel, FrameWithPartyMark } from './parts'
import { isAiLabelOn, isCnpjOn } from '@/lib/compliance-text'

// Faixa perfurada horizontal (base 590×236). Leitura à distância.

function Footer({ design }: { design: Design }) {
  const text = complianceLabel(design.fields.cnpj, isAiLabelOn(design), isCnpjOn(design))
  if (!text) return null
  return (
    <div style={{ display: 'flex', position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', padding: '3px 10px', background: 'rgba(0,0,0,0.55)', color: 'white', fontFamily: 'Inter', fontSize: 8 }}>
      {text}
    </div>
  )
}

export function PerfuradoTemplate({ design }: { design: Design }) {
  return <FrameWithPartyMark design={design} size={48}><PerfuradoInner design={design} /></FrameWithPartyMark>
}

function PerfuradoInner({ design }: { design: Design }) {
  const { fields, colors, template_id } = design
  const place = design.photo_placement

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

  if (place === 'left' || place === 'right' || ((place === 'auto' || !place) && template_id === 'moderno')) {
    const side = place === 'left' ? 'left' : 'right'
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background: colors.primary }}>
        <PhotoRow design={design} side={side} photoWidth={200} placeholderSize={18}>
          <div style={{ display: 'flex', alignItems: 'center', height: '100%', paddingLeft: 24 }}>
            {numberBlock}
            {nameBlock}
          </div>
        </PhotoRow>
        <Footer design={design} />
      </div>
    )
  }

  if (place === 'background' || ((place === 'auto' || !place) && template_id === 'classico')) {
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

  // popular / sem foto: fundo sólido
  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background: colors.primary, alignItems: 'center', padding: '0 28px' }}>
      {numberBlock}
      {nameBlock}
      <Footer design={design} />
    </div>
  )
}

export default PerfuradoTemplate
