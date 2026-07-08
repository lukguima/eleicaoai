import type { Design } from '@/types'
import { PhotoSlot, ComplianceFooter } from './parts'

// Post quadrado para redes (base 540×540).

export function SocialTemplate({ design }: { design: Design }) {
  const { fields, colors, template_id, label_position } = design
  const footerTop = label_position === 'top'

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

  if (template_id === 'moderno') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
        {footerTop && <ComplianceFooter design={design} fontSize={11} />}
        <div style={{ display: 'flex', flexGrow: 1 }}>
          <div style={{ display: 'flex', width: '50%' }}><PhotoSlot design={design} placeholderSize={24} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', width: '50%', padding: 28, justifyContent: 'center' }}>
            {numberBadge}
            <div style={{ display: 'flex', marginTop: 18 }}>{nameBlock}</div>
          </div>
        </div>
        {!footerTop && <ComplianceFooter design={design} fontSize={11} />}
      </div>
    )
  }

  if (template_id === 'popular') {
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

  // classico: foto no topo, faixa embaixo
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
