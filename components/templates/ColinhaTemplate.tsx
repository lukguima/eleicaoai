import type { Design } from '@/types'
import { PhotoSlot, ComplianceFooter, PhotoRow, FrameWithPartyMark } from './parts'

// Colinha de urna (base 250×350) — número ilegível à distância não vale.

export function ColinhaTemplate({ design }: { design: Design }) {
  return <FrameWithPartyMark design={design} size={32}><ColinhaInner design={design} /></FrameWithPartyMark>
}

function ColinhaInner({ design }: { design: Design }) {
  const { fields, colors, label_position } = design
  const footerTop = label_position === 'top'
  const place = design.photo_placement
  const hasPhoto = Boolean(design.photo?.url || design.photo?.cutout_url)

  const cola = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 12, letterSpacing: 3, color: colors.secondary }}>VOTE</div>
      <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 72, lineHeight: 0.85, color: colors.secondary }}>{fields.number || '00'}</div>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 14, color: 'white', textTransform: 'uppercase', textAlign: 'center', marginTop: 4 }}>{fields.name || 'Seu Nome'}</div>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontSize: 10, color: 'white', opacity: 0.85, marginTop: 2 }}>{fields.party}</div>
    </div>
  )

  if (hasPhoto && (place === 'left' || place === 'right')) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
        {footerTop && <ComplianceFooter design={design} fontSize={7} />}
        <PhotoRow design={design} side={place} photoWidth="42%" placeholderSize={14} preferFull>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: 8 }}>{cola}</div>
        </PhotoRow>
        {!footerTop && <ComplianceFooter design={design} fontSize={7} />}
      </div>
    )
  }

  if (hasPhoto && place === 'top') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
        {footerTop && <ComplianceFooter design={design} fontSize={7} />}
        <div style={{ display: 'flex', height: 110 }}>
          <PhotoSlot design={design} placeholderSize={14} preferFull />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: '8px 10px' }}>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 12, letterSpacing: 3, color: colors.secondary }}>VOTE</div>
          <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 92, lineHeight: 0.85, color: colors.secondary }}>{fields.number || '00'}</div>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 16, color: 'white', textTransform: 'uppercase', textAlign: 'center', marginTop: 4 }}>{fields.name || 'Seu Nome'}</div>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontSize: 10, color: 'white', opacity: 0.85, marginTop: 2 }}>{fields.party}</div>
        </div>
        {!footerTop && <ComplianceFooter design={design} fontSize={7} />}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary, position: 'relative' }}>
      {hasPhoto ? (
        <div style={{ display: 'flex', position: 'absolute', inset: 0 }}>
          <PhotoSlot design={design} placeholderSize={14} preferFull />
        </div>
      ) : null}
      {hasPhoto ? (
        <div
          style={{
            display: 'flex',
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            height: 210,
            backgroundImage: `linear-gradient(to top, ${colors.primary} 58%, rgba(0,0,0,0))`,
          }}
        />
      ) : null}
      {footerTop && <ComplianceFooter design={design} fontSize={7} />}
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, alignItems: 'center', justifyContent: 'flex-end', padding: '8px 10px 12px' }}>
        <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 12, letterSpacing: 3, color: colors.secondary }}>VOTE</div>
        <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 92, lineHeight: 0.85, color: colors.secondary }}>{fields.number || '00'}</div>
        <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 16, color: 'white', textTransform: 'uppercase', textAlign: 'center', marginTop: 4 }}>{fields.name || 'Seu Nome'}</div>
        <div style={{ display: 'flex', fontFamily: 'Inter', fontSize: 10, color: 'white', opacity: 0.85, marginTop: 2 }}>{fields.party}</div>
      </div>
      {!footerTop && <ComplianceFooter design={design} fontSize={7} />}
    </div>
  )
}

export default ColinhaTemplate
