import type { Design } from '@/types'
import { PhotoSlot, PhotoRow, complianceLabel, FrameWithPartyMark } from './parts'
import { isAiLabelOn, isCnpjOn } from '@/lib/compliance-text'

// Adesivo / praginha (base 800×300).

function Footer({ design }: { design: Design }) {
  const text = complianceLabel(design.fields.cnpj, isAiLabelOn(design), isCnpjOn(design))
  if (!text) return null
  return (
    <div style={{ display: 'flex', position: 'absolute', bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', padding: '3px 10px', background: 'rgba(0,0,0,0.55)', color: 'white', fontFamily: 'Inter', fontSize: 8 }}>
      {text}
    </div>
  )
}

export function AdesivoTemplate({ design }: { design: Design }) {
  return <FrameWithPartyMark design={design} size={44}><AdesivoInner design={design} /></FrameWithPartyMark>
}

function AdesivoInner({ design }: { design: Design }) {
  const { fields, colors, template_id } = design
  const place = design.photo_placement

  const numberBlock = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0, paddingLeft: 28 }}>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 16, letterSpacing: 3, color: colors.secondary }}>VOTE</div>
      <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 120, lineHeight: 0.85, color: colors.secondary }}>{fields.number || '00'}</div>
    </div>
  )

  const nameBlock = (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, paddingLeft: 20, paddingRight: 16 }}>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 36, color: 'white', textTransform: 'uppercase', lineHeight: 0.98 }}>{fields.name || 'Seu Nome'}</div>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: colors.secondary, marginTop: 4 }}>{fields.party}</div>
    </div>
  )

  if (place === 'left' || place === 'right' || ((place === 'auto' || !place) && template_id === 'moderno')) {
    const side = place === 'left' ? 'left' : 'right'
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background: colors.primary }}>
        <PhotoRow design={design} side={side} photoWidth={240} placeholderSize={16}>
          <div style={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            {numberBlock}
            {nameBlock}
          </div>
        </PhotoRow>
        <Footer design={design} />
      </div>
    )
  }

  if (place === 'background') {
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background: colors.primary }}>
        <div style={{ display: 'flex', position: 'absolute', inset: 0 }}>
          <PhotoSlot design={design} placeholderSize={16} />
        </div>
        <div style={{ display: 'flex', position: 'absolute', inset: 0, backgroundImage: `linear-gradient(to right, ${colors.primary} 50%, rgba(0,0,0,0.2) 100%)` }} />
        <div style={{ display: 'flex', position: 'relative', alignItems: 'center', width: '100%' }}>
          {numberBlock}
          {nameBlock}
        </div>
        <Footer design={design} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%', position: 'relative', background: colors.primary, alignItems: 'center' }}>
      {numberBlock}
      {nameBlock}
      <Footer design={design} />
    </div>
  )
}

export default AdesivoTemplate
