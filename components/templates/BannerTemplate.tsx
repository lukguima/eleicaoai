import type { Design } from '@/types'
import { PhotoSlot, ComplianceFooter } from './parts'

// Banner vertical (base 472×709). Tipografia grande p/ leitura à distância.

export function BannerTemplate({ design }: { design: Design }) {
  const { fields, colors, template_id, label_position } = design
  const footerTop = label_position === 'top'

  const numberBlock = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 22, letterSpacing: 4, color: colors.secondary }}>VOTE</div>
      <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 150, lineHeight: 0.9, color: colors.secondary }}>{fields.number || '00'}</div>
    </div>
  )

  const nameBlock = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 24px' }}>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 44, color: 'white', textTransform: 'uppercase', lineHeight: 1, textAlign: 'center' }}>{fields.name || 'Seu Nome'}</div>
      <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 18, color: colors.secondary, marginTop: 8 }}>{fields.party}</div>
      {fields.slogan ? <div style={{ display: 'flex', fontFamily: 'Inter', fontStyle: 'italic', fontSize: 16, color: 'white', opacity: 0.9, marginTop: 10, textAlign: 'center' }}>“{fields.slogan}”</div> : null}
    </div>
  )

  if (template_id === 'popular') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', position: 'relative', background: colors.primary }}>
        {footerTop && <ComplianceFooter design={design} fontSize={12} />}
        <div style={{ display: 'flex', position: 'relative', flexGrow: 1 }}>
          <PhotoSlot design={design} placeholderSize={28} />
          <div style={{ display: 'flex', position: 'absolute', inset: 0, backgroundImage: `linear-gradient(to top, ${colors.primary} 12%, rgba(0,0,0,0) 55%)` }} />
          <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: 0, right: 0, bottom: 28, alignItems: 'center' }}>
            {numberBlock}
            {nameBlock}
          </div>
        </div>
        {!footerTop && <ComplianceFooter design={design} fontSize={12} />}
      </div>
    )
  }

  if (template_id === 'moderno') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', position: 'relative', background: colors.primary }}>
        {footerTop && <ComplianceFooter design={design} fontSize={12} />}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 40 }}>{numberBlock}</div>
        <div style={{ display: 'flex', flexGrow: 1, margin: '20px 28px', overflow: 'hidden', borderRadius: 12 }}>
          <PhotoSlot design={design} placeholderSize={28} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 28 }}>{nameBlock}</div>
        {!footerTop && <ComplianceFooter design={design} fontSize={12} />}
      </div>
    )
  }

  // classico
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
      {footerTop && <ComplianceFooter design={design} fontSize={12} />}
      <div style={{ display: 'flex', position: 'relative', flexGrow: 1 }}>
        <PhotoSlot design={design} placeholderSize={28} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, backgroundImage: `linear-gradient(to top, ${colors.primary}, rgba(0,0,0,0))` }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 30px', background: colors.primary }}>
        {numberBlock}
        <div style={{ display: 'flex', marginTop: 10 }}>{nameBlock}</div>
      </div>
      {!footerTop && <ComplianceFooter design={design} fontSize={12} />}
    </div>
  )
}

export default BannerTemplate
