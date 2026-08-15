import type { Design } from '@/types'
import { PhotoSlot, ComplianceFooter, PhotoRow, FrameWithPartyMark } from './parts'

// SantinhoTemplate — usado IDÊNTICO no preview (browser) e no render final
// (satori/servidor). Só usa CSS que o satori entende (flexbox, absolute).

interface Props {
  design: Design
}

export function SantinhoTemplate({ design }: Props) {
  const place = design.photo_placement
  let inner = <Classico design={design} />
  if (place === 'background') inner = <Popular design={design} />
  else if (place === 'top') inner = <Classico design={design} />
  else if (place === 'left' || place === 'right') inner = <Split design={design} side={place} />
  else if (design.template_id === 'moderno') inner = <Moderno design={design} />
  else if (design.template_id === 'popular') inner = <Popular design={design} />
  return <FrameWithPartyMark design={design} size={48}>{inner}</FrameWithPartyMark>
}

function Split({ design, side }: { design: Design; side: 'left' | 'right' }) {
  const { fields, colors, label_position } = design
  const footerTop = label_position === 'top'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
      {footerTop && <ComplianceFooter design={design} />}
      <PhotoRow design={design} side={side} photoWidth="48%">
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '16px 14px', height: '100%' }}>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 13, letterSpacing: 2, color: colors.secondary }}>VOTE</div>
          <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 72, lineHeight: 0.9, color: colors.secondary }}>{fields.number || '00'}</div>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 20, color: 'white', textTransform: 'uppercase', lineHeight: 1.05, marginTop: 8 }}>{fields.name || 'Seu Nome'}</div>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontSize: 12, color: 'white', opacity: 0.8, marginTop: 4 }}>{fields.party}</div>
        </div>
      </PhotoRow>
      {!footerTop && <ComplianceFooter design={design} />}
    </div>
  )
}

// ── Clássico: foto no topo; faixa de cor com número gigante embaixo ──
function Classico({ design }: Props) {
  const { fields, colors, label_position } = design
  const footerTop = label_position === 'top'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary, position: 'relative' }}>
      {footerTop && <ComplianceFooter design={design} />}
      <div style={{ display: 'flex', position: 'relative', flexGrow: 1 }}>
        <PhotoSlot design={design} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundImage: `linear-gradient(to top, ${colors.primary}, rgba(0,0,0,0))` }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 20px 18px', background: colors.primary }}>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 82, lineHeight: 1, color: colors.secondary }}>{fields.number || '00'}</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 14, paddingBottom: 8 }}>
            <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 13, letterSpacing: 2, color: colors.secondary, opacity: 0.85 }}>VOTE</div>
            <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 22, lineHeight: 1.05, color: 'white', textTransform: 'uppercase' }}>{fields.name || 'Seu Nome'}</div>
            <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 400, fontSize: 12, color: 'white', opacity: 0.8 }}>{fields.party}</div>
          </div>
        </div>
        {fields.slogan ? <div style={{ display: 'flex', fontFamily: 'Inter', fontStyle: 'italic', fontSize: 12, color: 'white', opacity: 0.9, marginTop: 8 }}>“{fields.slogan}”</div> : null}
      </div>
      {!footerTop && <ComplianceFooter design={design} />}
    </div>
  )
}

// ── Moderno: barra lateral de cor com número; foto ao lado ──
function Moderno({ design }: Props) {
  const { fields, colors, label_position } = design
  const footerTop = label_position === 'top'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.secondary, position: 'relative' }}>
      {footerTop && <ComplianceFooter design={design} />}
      <div style={{ display: 'flex', position: 'relative', flexGrow: 1 }}>
        <PhotoSlot design={design} />
        <div style={{ display: 'flex', position: 'absolute', top: 0, bottom: 0, left: 0, width: 118, background: colors.primary, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 92, lineHeight: 0.9, color: colors.secondary, transform: 'rotate(-90deg)' }}>{fields.number || '00'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 18px', background: colors.primary }}>
        <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 24, color: 'white', textTransform: 'uppercase', lineHeight: 1.05 }}>{fields.name || 'Seu Nome'}</div>
        <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 400, fontSize: 12, color: colors.secondary, marginTop: 2 }}>{fields.party}{fields.slogan ? ` · ${fields.slogan}` : ''}</div>
      </div>
      {!footerTop && <ComplianceFooter design={design} />}
    </div>
  )
}

// ── Popular: foto em tela cheia com degradê; selo circular do número ──
function Popular({ design }: Props) {
  const { fields, colors, label_position } = design
  const footerTop = label_position === 'top'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', position: 'relative', background: colors.primary }}>
      {footerTop && <ComplianceFooter design={design} />}
      <div style={{ display: 'flex', position: 'relative', flexGrow: 1 }}>
        <PhotoSlot design={design} />
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `linear-gradient(to top, ${colors.primary} 8%, rgba(0,0,0,0) 55%)` }} />
        <div style={{ display: 'flex', position: 'absolute', top: 16, right: 16, width: 96, height: 96, borderRadius: 96, background: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 44, color: colors.primary, lineHeight: 1 }}>{fields.number || '00'}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: 20, right: 20, bottom: 18 }}>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 30, color: 'white', textTransform: 'uppercase', lineHeight: 1.02 }}>{fields.name || 'Seu Nome'}</div>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: colors.secondary, marginTop: 4 }}>{fields.party}{fields.slogan ? ` · ${fields.slogan}` : ''}</div>
        </div>
      </div>
      {!footerTop && <ComplianceFooter design={design} />}
    </div>
  )
}

export default SantinhoTemplate
