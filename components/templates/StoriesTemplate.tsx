import type { Design } from '@/types'
import { PhotoSlot, ComplianceFooter, PhotoRow, FrameWithPartyMark } from './parts'

// Stories / Status 9:16 (base 540×960).

export function StoriesTemplate({ design }: { design: Design }) {
  return <FrameWithPartyMark design={design} size={56}><StoriesInner design={design} /></FrameWithPartyMark>
}

function StoriesInner({ design }: { design: Design }) {
  const { fields, colors, template_id, label_position } = design
  const footerTop = label_position === 'top'
  const place = design.photo_placement
  const badgeSize = template_id === 'moderno' ? 140 : 120

  const copy = (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 14, letterSpacing: 3, color: colors.secondary }}>VOTE</div>
      <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 64, lineHeight: 0.9, color: colors.secondary }}>{fields.number || '00'}</div>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 32, color: 'white', textTransform: 'uppercase', lineHeight: 1.02, marginTop: 8 }}>{fields.name || 'Seu Nome'}</div>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: colors.secondary, marginTop: 6 }}>{fields.party}{fields.slogan ? ` · ${fields.slogan}` : ''}</div>
    </div>
  )

  if (place === 'left' || place === 'right') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
        {footerTop && <ComplianceFooter design={design} fontSize={10} />}
        <PhotoRow design={design} side={place} photoWidth="48%" placeholderSize={28}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 24, height: '100%' }}>{copy}</div>
        </PhotoRow>
        {!footerTop && <ComplianceFooter design={design} fontSize={10} />}
      </div>
    )
  }

  if (place === 'top') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
        {footerTop && <ComplianceFooter design={design} fontSize={10} />}
        <div style={{ display: 'flex', height: '52%' }}>
          <PhotoSlot design={design} placeholderSize={28} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center', padding: 28 }}>{copy}</div>
        {!footerTop && <ComplianceFooter design={design} fontSize={10} />}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary, position: 'relative' }}>
      {footerTop && <ComplianceFooter design={design} fontSize={10} />}
      <div style={{ display: 'flex', position: 'relative', flexGrow: 1 }}>
        <PhotoSlot design={design} placeholderSize={28} />
        <div style={{ display: 'flex', position: 'absolute', inset: 0, backgroundImage: `linear-gradient(to top, ${colors.primary} 12%, rgba(0,0,0,0) 50%)` }} />
        <div style={{
          display: 'flex', position: 'absolute', top: 28, right: 24,
          width: badgeSize, height: badgeSize,
          borderRadius: 140, background: colors.secondary, alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 52, color: colors.primary, lineHeight: 1 }}>{fields.number || '00'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: 28, right: 28, bottom: 28 }}>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 14, letterSpacing: 3, color: colors.secondary }}>VOTE</div>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 42, color: 'white', textTransform: 'uppercase', lineHeight: 1.02 }}>{fields.name || 'Seu Nome'}</div>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 16, color: colors.secondary, marginTop: 6 }}>{fields.party}{fields.slogan ? ` · ${fields.slogan}` : ''}</div>
        </div>
      </div>
      {!footerTop && <ComplianceFooter design={design} fontSize={10} />}
    </div>
  )
}

export default StoriesTemplate
