import type { Design } from '@/types'

// Post quadrado para redes (base 540×540). CSS compatível com satori.

const COMPLIANCE_TEXT = 'Conteúdo fabricado com IA'
const label = (cnpj: string) => (cnpj ? `${COMPLIANCE_TEXT} · CNPJ ${cnpj}` : COMPLIANCE_TEXT)

function Photo({ design }: { design: Design }) {
  const src = design.photo?.cutout_url || design.photo?.url
  if (!src) {
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 26, letterSpacing: 4, color: 'rgba(255,255,255,0.35)' }}>FOTO</div>
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width="100%" height="100%" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${design.photo?.offset_x ?? 50}% ${design.photo?.offset_y ?? 50}%`, transform: `scale(${design.photo?.scale ?? 1})` }} />
  )
}

function Footer({ design }: { design: Design }) {
  return (
    <div style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', padding: '6px 12px', background: 'rgba(0,0,0,0.55)', color: 'white', fontFamily: 'Inter', fontSize: 11 }}>
      {label(design.fields.cnpj)}
    </div>
  )
}

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

  // moderno: metade foto / metade cor
  if (template_id === 'moderno') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
        {footerTop && <Footer design={design} />}
        <div style={{ display: 'flex', flexGrow: 1 }}>
          <div style={{ display: 'flex', width: '50%', overflow: 'hidden' }}><Photo design={design} /></div>
          <div style={{ display: 'flex', flexDirection: 'column', width: '50%', padding: 28, justifyContent: 'center' }}>
            {numberBadge}
            <div style={{ display: 'flex', marginTop: 18 }}>{nameBlock}</div>
          </div>
        </div>
        {!footerTop && <Footer design={design} />}
      </div>
    )
  }

  // popular: foto em tela cheia + degradê
  if (template_id === 'popular') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', position: 'relative', background: colors.primary }}>
        {footerTop && <Footer design={design} />}
        <div style={{ display: 'flex', position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
          <Photo design={design} />
          <div style={{ display: 'flex', position: 'absolute', inset: 0, backgroundImage: `linear-gradient(to top, ${colors.primary} 8%, rgba(0,0,0,0) 55%)` }} />
          <div style={{ display: 'flex', position: 'absolute', top: 20, right: 20 }}>{numberBadge}</div>
          <div style={{ display: 'flex', position: 'absolute', left: 24, right: 24, bottom: 20 }}>{nameBlock}</div>
        </div>
        {!footerTop && <Footer design={design} />}
      </div>
    )
  }

  // classico: foto no topo, faixa embaixo
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary }}>
      {footerTop && <Footer design={design} />}
      <div style={{ display: 'flex', position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
        <Photo design={design} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', padding: '18px 22px', background: colors.primary }}>
        {numberBadge}
        <div style={{ display: 'flex', marginLeft: 18 }}>{nameBlock}</div>
      </div>
      {!footerTop && <Footer design={design} />}
    </div>
  )
}

export default SocialTemplate
