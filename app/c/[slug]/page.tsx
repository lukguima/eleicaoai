import { notFound } from 'next/navigation'
import { createServerClient } from '@/lib/supabase'
import { officeLabel } from '@/lib/office'
import { IMAGE_WATERMARK_TEXT } from '@/lib/compliance-text'
import type { Office } from '@/types'

export const dynamic = 'force-dynamic'

interface Props { params: Promise<{ slug: string }> }

export default async function CandidateSitePage({ params }: Props) {
  const { slug } = await params
  const supabase = createServerClient()
  const { data } = await supabase
    .from('candidates')
    .select('name, election_number, party, slogan, biography_summary, primary_color, secondary_color, base_photo_url, base_photo_cutout_url, office, uf, campaign_cnpj, whatsapp')
    .eq('public_slug', slug)
    .maybeSingle()

  if (!data) notFound()

  const photo = data.base_photo_cutout_url || data.base_photo_url
  const color = data.primary_color || '#0a1b3d'
  const accent = data.secondary_color || '#fabd00'
  const wa = data.whatsapp?.replace(/\D/g, '')
  const cargo = officeLabel(data.office as Office | undefined)

  return (
    <main className="min-h-screen" style={{ background: color, color: 'white' }}>
      <div className="max-w-lg mx-auto px-6 py-12 space-y-8">
        <p className="text-xs font-semibold tracking-widest uppercase" style={{ color: accent }}>
          {cargo}{data.uf ? ` · ${data.uf}` : ''} · {data.party}
        </p>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="w-40 h-40 rounded-full object-cover border-4 mx-auto" style={{ borderColor: accent }} />
        ) : null}
        <div className="text-center space-y-2">
          <p className="text-sm font-extrabold tracking-[0.3em]" style={{ color: accent }}>VOTE {data.election_number}</p>
          <h1 className="text-4xl font-black uppercase leading-tight">{data.name}</h1>
          {data.slogan ? <p className="text-lg opacity-90 italic">“{data.slogan}”</p> : null}
        </div>
        {data.biography_summary ? (
          <p className="text-sm leading-relaxed opacity-90 text-center">{data.biography_summary}</p>
        ) : null}
        {wa ? (
          <a href={`https://wa.me/55${wa}`} className="block text-center font-bold py-4 rounded-2xl" style={{ background: accent, color }}>
            Falar no WhatsApp
          </a>
        ) : null}
        <p className="text-[11px] text-center opacity-70 leading-relaxed">
          {IMAGE_WATERMARK_TEXT}
          {data.campaign_cnpj ? ` · CNPJ ${data.campaign_cnpj}` : ''}
        </p>
      </div>
    </main>
  )
}
