import type { Design } from '@/types'
import { PhotoSlot, ComplianceFooter, PhotoRow, FrameWithPartyMark } from './parts'

// Post quadrado para redes (base 540×540).

export function SocialTemplate({ design }: { design: Design }) {
  return <FrameWithPartyMark design={design} size={52}><SocialInner design={design} /></FrameWithPartyMark>
}

function SocialInner({ design }: { design: Design }) {
  const { fields, colors, template_id, label_position } = design
  const footerTop = label_position === 'top'
  const place = design.photo_placement

  const nameBlock = (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 34, color: 'white', textTransform: 'uppercase', lineHeight: 1 }}>{fields.name || 'Seu Nome'}</div>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: colors.secondary, marginTop: 4 }}>{fields.party}{fields.slogan ? ` · ${fields.slogan}` : ''}</div>
    </div>
  )

  const numberBadge = (
    <div style={{ display: 'flex', width: 110, height: 110, borderRadius: 110, background: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 52, color: colors.primary, lineHeight: 1 }}>{fields.number || '00'}</div>
    </div>
  )

  if (place === 'left' || place === 'right' || ((place === 'auto' || !place) && template_id === 'moderno')) {
    const side = place === 'right' ? 'right' : 'left'
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
        {footerTop && <ComplianceFooter design={design} fontSize={11} />}
        <PhotoRow design={design} side={side} photoWidth="50%" placeholderSize={24}>
          <div style={{ display: 'flex', flexDirection: 'column', padding: 28, justifyContent: 'center', height: '100%' }}>
            {numberBadge}
            <div style={{ display: 'flex', marginTop: 18 }}>{nameBlock}</div>
          </div>
        </PhotoRow>
        {!footerTop && <ComplianceFooter design={design} fontSize={11} />}
      </div>
    )
  }

  if (place === 'background' || ((place === 'auto' || !place) && template_id === 'popular')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', position: 'relative', background: colors.primary }}>
        {footerTop && <ComplianceFooter design={design} fontSize={11} />}
        <div style={{ display: 'flex', position: 'relative', flexGrow: 1 }}>
          <PhotoSlot design={design} placeholderSize={24} />
          <div style={{ display: 'flex', position: 'absolute', inset: 0, backgroundImage: `linear-gradient(to top, ${colors.primary} 8%, rgba(0,0,0,0) 55%)` }} />
          <div style={{ display: 'flex', position: 'absolute', top: 20, right: 20 }}>{numberBadge}</div>
          <div style={{ display: 'flex', position: 'absolute', left: 24, right: 24, bottom: 20 }}>{nameBlock}</div>
        </div>
        {!footerTop && <ComplianceFooter design={design} fontSize={11} />}
      </div>
    )
  }

  // classico / em cima: foto no topo, faixa embaixo
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
      {footerTop && <ComplianceFooter design={design} fontSize={11} />}
      <div style={{ display: 'flex', position: 'relative', flexGrow: 1 }}>
        <PhotoSlot design={design} placeholderSize={24} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 22px', background: colors.primary }}>
        {numberBadge}
        <div style={{ display: 'flex', marginLeft: 18 }}>{nameBlock}</div>
      </div>
      {!footerTop && <ComplianceFooter design={design} fontSize={11} />}
    </div>
  )
}

export default SocialTemplate
