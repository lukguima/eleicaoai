import type { Design } from '@/types'

// ============================================================
// SantinhoTemplate — usado IDÊNTICO no preview (browser) e no
// render final (satori/servidor). Por isso usa apenas o subconjunto
// de CSS que o satori entende: flexbox, position absolute, inline styles.
// Nada de grid, gap arriscado ou seletores. "O que se vê é o que se baixa."
// ============================================================

const COMPLIANCE_TEXT = 'Conteúdo fabricado com IA'

interface Props {
  design: Design
}

function complianceLabel(cnpj: string): string {
  return cnpj ? `${COMPLIANCE_TEXT} · CNPJ ${cnpj}` : COMPLIANCE_TEXT
}

// Foto do candidato, preenchendo o slot, com posição/zoom do editor.
function Photo({ design, style }: { design: Design; style?: React.CSSProperties }) {
  const p = design.photo
  const src = p?.cutout_url || p?.url
  if (!src) {
    return (
      <div style={{ display: 'flex', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.08)', ...style }}>
        <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 20, letterSpacing: 3, color: 'rgba(255,255,255,0.35)' }}>FOTO</div>
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width="100%"
      height="100%"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        objectPosition: `${p?.offset_x ?? 50}% ${p?.offset_y ?? 50}%`,
        transform: `scale(${p?.scale ?? 1})`,
        ...style,
      }}
    />
  )
}

function ComplianceFooter({ design }: { design: Design }) {
  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '5px 10px',
        background: 'rgba(0,0,0,0.55)',
        color: 'white',
        fontFamily: 'Inter',
        fontSize: 9,
        letterSpacing: 0.2,
        textAlign: 'center',
      }}
    >
      {complianceLabel(design.fields.cnpj)}
    </div>
  )
}

export function SantinhoTemplate({ design }: Props) {
  const { template_id } = design
  if (template_id === 'moderno') return <Moderno design={design} />
  if (template_id === 'popular') return <Popular design={design} />
  return <Classico design={design} />
}

// ── Variação 1: Clássico ──────────────────────────────────────
// Foto ocupa o topo; faixa de cor embaixo com VOTE + número gigante.
function Classico({ design }: Props) {
  const { fields, colors, label_position } = design
  const footerTop = label_position === 'top'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.primary, position: 'relative' }}>
      {footerTop && <ComplianceFooter design={design} />}

      <div style={{ display: 'flex', position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
        <Photo design={design} />
        <div style={{ display: 'flex', position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, backgroundImage: `linear-gradient(to top, ${colors.primary}, rgba(0,0,0,0))` }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 20px 18px', background: colors.primary }}>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 82, lineHeight: 1, color: colors.secondary }}>
            {fields.number || '00'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', marginLeft: 14, paddingBottom: 8 }}>
            <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 13, letterSpacing: 2, color: colors.secondary, opacity: 0.85 }}>VOTE</div>
            <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 22, lineHeight: 1.05, color: 'white', textTransform: 'uppercase' }}>
              {fields.name || 'Seu Nome'}
            </div>
            <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 400, fontSize: 12, color: 'white', opacity: 0.8 }}>{fields.party}</div>
          </div>
        </div>
        {fields.slogan ? (
          <div style={{ display: 'flex', fontFamily: 'Inter', fontStyle: 'italic', fontSize: 12, color: 'white', opacity: 0.9, marginTop: 8 }}>
            “{fields.slogan}”
          </div>
        ) : null}
      </div>

      {!footerTop && <ComplianceFooter design={design} />}
    </div>
  )
}

// ── Variação 2: Moderno ───────────────────────────────────────
// Metade superior com foto; número gigante vertical sobreposto.
function Moderno({ design }: Props) {
  const { fields, colors, label_position } = design
  const footerTop = label_position === 'top'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', background: colors.secondary, position: 'relative' }}>
      {footerTop && <ComplianceFooter design={design} />}

      <div style={{ display: 'flex', position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
        <Photo design={design} />
        {/* Barra lateral de cor com número */}
        <div style={{ display: 'flex', position: 'absolute', top: 0, bottom: 0, left: 0, width: 118, background: colors.primary, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 92, lineHeight: 0.9, color: colors.secondary, transform: 'rotate(-90deg)' }}>
            {fields.number || '00'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', padding: '14px 18px', background: colors.primary }}>
        <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 24, color: 'white', textTransform: 'uppercase', lineHeight: 1.05 }}>
          {fields.name || 'Seu Nome'}
        </div>
        <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 400, fontSize: 12, color: colors.secondary, marginTop: 2 }}>
          {fields.party}{fields.slogan ? ` · ${fields.slogan}` : ''}
        </div>
      </div>

      {!footerTop && <ComplianceFooter design={design} />}
    </div>
  )
}

// ── Variação 3: Popular ───────────────────────────────────────
// Foto em tela cheia com degradê forte; selo circular do número.
function Popular({ design }: Props) {
  const { fields, colors, label_position } = design
  const footerTop = label_position === 'top'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', position: 'relative', background: colors.primary }}>
      {footerTop && <ComplianceFooter design={design} />}

      <div style={{ display: 'flex', position: 'relative', flexGrow: 1, overflow: 'hidden' }}>
        <Photo design={design} />
        <div style={{ display: 'flex', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `linear-gradient(to top, ${colors.primary} 8%, rgba(0,0,0,0) 55%)` }} />

        {/* Selo do número */}
        <div style={{ display: 'flex', position: 'absolute', top: 16, right: 16, width: 96, height: 96, borderRadius: 96, background: colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', fontFamily: 'Anton', fontSize: 44, color: colors.primary, lineHeight: 1 }}>{fields.number || '00'}</div>
        </div>

        {/* Nome e slogan sobre o degradê */}
        <div style={{ display: 'flex', flexDirection: 'column', position: 'absolute', left: 20, right: 20, bottom: 18 }}>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 800, fontSize: 30, color: 'white', textTransform: 'uppercase', lineHeight: 1.02 }}>
            {fields.name || 'Seu Nome'}
          </div>
          <div style={{ display: 'flex', fontFamily: 'Inter', fontWeight: 700, fontSize: 13, color: colors.secondary, marginTop: 4 }}>
            {fields.party}{fields.slogan ? ` · ${fields.slogan}` : ''}
          </div>
        </div>
      </div>

      {!footerTop && <ComplianceFooter design={design} />}
    </div>
  )
}

export default SantinhoTemplate
