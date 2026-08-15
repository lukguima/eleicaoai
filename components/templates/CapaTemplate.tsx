import type { Design } from '@/types'
import { PhotoSlot, ComplianceFooter, PhotoRow, FrameWithPartyMark } from './parts'

// Capa Facebook / thumb YouTube (base 600×315).

export function CapaTemplate({ design }: { design: Design }) {
  return <FrameWithPartyMark design={design} size={40}><CapaInner design={design} /></FrameWithPartyMark>
}

function CapaInner({ design }: { design: Design }) {
  const { fields, colors, template_id, label_position } = design
  const footerTop = label_position === 'top'
  const place = design.photo_placement

  const copy = (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '12px 16px', height: '100%' }}>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 12, letterSpacing: 3, color: colors.secondary }}>VOTE</div>
      <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 64, lineHeight: 0.9, color: colors.secondary }}>{fields.number || '00'}</div>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 20, color: 'white', textTransform: 'uppercase', lineHeight: 1.05 }}>{fields.name || 'Seu Nome'}</div>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 12, color: colors.secondary, marginTop: 4 }}>{fields.party}{fields.slogan ? ` · ${fields.slogan}` : ''}</div>
    </div>
  )

  if (place === 'left' || place === 'right') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
        {footerTop && <ComplianceFooter design={design} fontSize={8} />}
        <PhotoRow design={design} side={place} photoWidth="40%" placeholderSize={18}>
          {copy}
        </PhotoRow>
        {!footerTop && <ComplianceFooter design={design} fontSize={8} />}
      </div>
    )
  }

  if (place === 'background' || ((place === 'auto' || !place) && template_id === 'popular')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
        {footerTop && <ComplianceFooter design={design} fontSize={8} />}
        <div style={{ display: 'flex', flexGrow: 1, position: 'relative' }}>
          <PhotoSlot design={design} placeholderSize={18} />
          <div style={{ display: 'flex', position: 'absolute', inset: 0, backgroundImage: `linear-gradient(to right, ${colors.primary} 35%, rgba(0,0,0,0.15) 100%)` }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'absolute', left: 24, right: 20, top: 0, bottom: 0 }}>
            <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 12, letterSpacing: 3, color: colors.secondary }}>VOTE</div>
            <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 72, lineHeight: 0.9, color: colors.secondary }}>{fields.number || '00'}</div>
            <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 22, color: 'white', textTransform: 'uppercase', lineHeight: 1.05 }}>{fields.name || 'Seu Nome'}</div>
            <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 12, color: colors.secondary, marginTop: 4 }}>{fields.party}{fields.slogan ? ` · ${fields.slogan}` : ''}</div>
          </div>
        </div>
        {!footerTop && <ComplianceFooter design={design} fontSize={8} />}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
      {footerTop && <ComplianceFooter design={design} fontSize={8} />}
      <div style={{ display: 'flex', flexGrow: 1, position: 'relative' }}>
        <div style={{ display: 'flex', width: template_id === 'moderno' ? '38%' : '42%' }}>
          <PhotoSlot design={design} placeholderSize={18} />
        </div>
        <div style={{ display: 'flex', flexGrow: 1 }} />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'absolute', left: '44%', right: 20, top: 0, bottom: 0 }}>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 12, letterSpacing: 3, color: colors.secondary }}>VOTE</div>
          <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 72, lineHeight: 0.9, color: colors.secondary }}>{fields.number || '00'}</div>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 22, color: 'white', textTransform: 'uppercase', lineHeight: 1.05 }}>{fields.name || 'Seu Nome'}</div>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 12, color: colors.secondary, marginTop: 4 }}>{fields.party}{fields.slogan ? ` · ${fields.slogan}` : ''}</div>
        </div>
      </div>
      {!footerTop && <ComplianceFooter design={design} fontSize={8} />}
    </div>
  )
}

export default CapaTemplate
