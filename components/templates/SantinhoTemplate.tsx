import type { Design } from '@/types'
import { PhotoSlot, ComplianceFooter } from './parts'

// SantinhoTemplate — usado IDÊNTICO no preview (browser) e no render final
// (satori/servidor). Só usa CSS que o satori entende (flexbox, absolute).

interface Props {
  design: Design
}

export function SantinhoTemplate({ design }: Props) {
  const { template_id } = design
  if (template_id === 'moderno') return <Moderno design={design} />
  if (template_id === 'popular') return <Popular design={design} />
  return <Classico design={design} />
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
