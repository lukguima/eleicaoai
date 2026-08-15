'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import { OFFICES, UFS, VISUAL_STYLES, JINGLE_STYLES, palettesForParty } from '@/lib/office'
import { applyPartyToForm, lookupParty } from '@/lib/parties'
import { PartySelect } from '@/components/PartySelect'
import type { Candidate, JingleStyle, Office, VisualStyle } from '@/types'

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

function formatCpf(value: string) {
  return value.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatCnpj(value: string) {
  return value.replace(/\D/g, '').slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

export default function DadosPage() {
  const router = useRouter()
  const photoRef = useRef<HTMLInputElement>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const [token, setToken] = useState<string | null>(null)
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    election_number: '',
    party: '',
    office: 'deputado_estadual' as Office,
    uf: 'SP',
    biography_summary: '',
    slogan: '',
    campaign_cnpj: '',
    cpf: '',
    whatsapp: '',
    primary_color: '#1a56db',
    secondary_color: '#ffd21e',
    visual_style: 'classico' as VisualStyle,
    jingle_style: 'Sertanejo Universitário' as JingleStyle,
    show_party_logo: true,
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.replace('/login'); return }
        if (cancelled) return
        setToken(session.access_token)
        const res = await fetch('/api/v1/campaign', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const json = await res.json()
        const c: Candidate | undefined = json.success ? json.data?.candidate : undefined
        if (cancelled) return
        if (!c) { setLoading(false); return }
        setCandidateId(c.id)
        setPhotoUrl(c.base_photo_url ?? null)
        setLogoUrl(c.party_logo_url ?? null)
        setForm({
          name: c.name,
          election_number: c.election_number,
          party: c.party,
          office: (c.office as Office) || 'deputado_estadual',
          uf: c.uf || 'SP',
          biography_summary: c.biography_summary || '',
          slogan: c.slogan || '',
          campaign_cnpj: c.campaign_cnpj || '',
          cpf: '',
          whatsapp: c.whatsapp || '',
          primary_color: c.primary_color || '#1a56db',
          secondary_color: c.secondary_color || '#ffd21e',
          visual_style: (c.visual_style as VisualStyle) || 'classico',
          jingle_style: (c.jingle_style as JingleStyle) || 'Sertanejo Universitário',
          show_party_logo: c.show_party_logo !== false,
        })
      } catch {
        if (!cancelled) setError('Não foi possível carregar seus dados. Atualize a página.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [router])

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !token || !candidateId) return
    setError(null)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Use JPEG, PNG ou WebP.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Foto de no máximo 5 MB.'); return }
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await fetch(`/api/v1/candidates/${candidateId}/photo`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setPhotoUrl(json.data.base_photo_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar foto.')
    } finally {
      setUploading(false)
    }
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !token || !candidateId) return
    setError(null)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Use JPEG, PNG ou WebP.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Logo de no máximo 2 MB.'); return }
    setUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch(`/api/v1/candidates/${candidateId}/party-logo`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setLogoUrl(json.data.party_logo_url)
      setForm(p => ({ ...p, show_party_logo: true }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function removeLogo() {
    if (!token || !candidateId) return
    setUploadingLogo(true); setError(null)
    try {
      const res = await fetch(`/api/v1/candidates/${candidateId}/party-logo`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setLogoUrl(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao remover logo.')
    } finally {
      setUploadingLogo(false)
    }
  }

  async function handleSave() {
    if (!token || !candidateId) return
    if (form.name.trim().length < 2 || form.election_number.length < 2) {
      setError('Preencha nome e número.'); return
    }
    if (form.biography_summary.trim().length < 20) {
      setError('A apresentação precisa ter pelo menos 20 caracteres.'); return
    }
    setSaving(true); setError(null); setOk(false)
    try {
      const body: Record<string, unknown> = {
        name: form.name.trim(),
        election_number: form.election_number,
        party: form.party.trim(),
        office: form.office,
        uf: form.uf,
        biography_summary: form.biography_summary.trim(),
        slogan: form.slogan.trim(),
        whatsapp: form.whatsapp,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        visual_style: form.visual_style,
        jingle_style: form.jingle_style,
        show_party_logo: form.show_party_logo,
      }
      if (form.campaign_cnpj.replace(/\D/g, '').length === 14) body.campaign_cnpj = form.campaign_cnpj
      if (form.cpf.replace(/\D/g, '').length === 11) body.cpf = form.cpf
      const res = await fetch(`/api/v1/candidates/${candidateId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setOk(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400 text-sm">Carregando seus dados…</p></div>
  }

  if (!candidateId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <p className="text-gray-600">Cadastre a campanha antes de editar os dados.</p>
          <Link href="/onboarding" className="text-blue-600 underline text-sm">Começar cadastro</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Painel</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">Meus dados</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dados da campanha</h1>
          <p className="text-gray-500 text-sm mt-1">Altere nome, número, foto e o restante. As próximas peças usam o que estiver salvo aqui.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
        {ok && <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">Dados salvos. Abra uma peça e toque em “Usar dados do cadastro” se ela já estava aberta.</div>}

        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => photoRef.current?.click()} disabled={uploading}
              className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
              {photoUrl
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={photoUrl} alt="" className="object-cover w-full h-full" />
                : <span className="text-gray-400 text-xs">Foto</span>}
            </button>
            <div>
              <p className="text-sm font-medium text-gray-800">Foto</p>
              <button type="button" onClick={() => photoRef.current?.click()} className="text-sm text-blue-600 underline">
                {uploading ? 'Enviando…' : 'Trocar foto'}
              </button>
            </div>
            <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhoto} />
          </div>

          <div>
            <label className={labelCls}>Nome de urna</label>
            <input value={form.name} maxLength={150} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>Partido</label>
            <PartySelect
              value={form.party}
              onChange={party => setForm(p => applyPartyToForm(p, party))}
              className={inputCls}
            />
            {lookupParty(form.party) && (
              <p className="text-xs text-gray-500 mt-1">Cores e modelo do {lookupParty(form.party)!.id} preenchidos. Altere abaixo se quiser.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Número</label>
              <input value={form.election_number} maxLength={6} onChange={e => setForm(p => ({ ...p, election_number: e.target.value.replace(/\D/g, '') }))} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Cargo</label>
              <select value={form.office} onChange={e => setForm(p => ({ ...p, office: e.target.value as Office }))} className={inputCls}>
                {OFFICES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>UF</label>
              <select value={form.uf} onChange={e => setForm(p => ({ ...p, uf: e.target.value }))} className={inputCls}>
                {UFS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Quem é você</label>
            <textarea rows={4} maxLength={500} value={form.biography_summary} onChange={e => setForm(p => ({ ...p, biography_summary: e.target.value }))} className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className={labelCls}>Slogan</label>
            <input value={form.slogan} maxLength={100} onChange={e => setForm(p => ({ ...p, slogan: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>CNPJ da campanha</label>
              <input value={form.campaign_cnpj} onChange={e => setForm(p => ({ ...p, campaign_cnpj: formatCnpj(e.target.value) }))} placeholder="00.000.000/0000-00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>CPF <span className="text-gray-400 font-normal">(só se for trocar)</span></label>
              <input value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: formatCpf(e.target.value) }))} placeholder="Deixe em branco para manter" className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>WhatsApp</label>
            <input value={form.whatsapp} maxLength={20} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value.replace(/\D/g, '') }))} placeholder="11999999999" className={inputCls} />
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800">Logo do partido nas artes</p>
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.show_party_logo} onChange={e => setForm(p => ({ ...p, show_party_logo: e.target.checked }))} />
                Mostrar
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => logoRef.current?.click()} disabled={uploadingLogo}
                className="w-14 h-14 rounded-lg border border-gray-200 overflow-hidden bg-gray-50 shrink-0">
                {logoUrl
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={logoUrl} alt="" className="object-contain w-full h-full p-1" />
                  : <span className="text-[10px] text-gray-400">{form.party || 'Logo'}</span>}
              </button>
              <div>
                <button type="button" onClick={() => logoRef.current?.click()} className="text-sm text-blue-600 underline">
                  {uploadingLogo ? 'Enviando…' : logoUrl ? 'Trocar logo' : 'Enviar logo oficial'}
                </button>
                {logoUrl && (
                  <button type="button" onClick={removeLogo} className="block text-xs text-gray-500 underline mt-1">Remover logo (volta o selo da sigla)</button>
                )}
                <p className="text-xs text-gray-400 mt-1">PNG transparente, até 2 MB. Sem arquivo, a sigla entra num selo.</p>
              </div>
              <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogo} />
            </div>
          </div>

          <p className="text-sm font-semibold text-gray-800 pt-2">Cores e modelo</p>
          {lookupParty(form.party) && (
            <button type="button" onClick={() => setForm(p => applyPartyToForm(p, p.party))} className="text-sm text-blue-600 underline">
              Restaurar cores e modelo do partido
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            {palettesForParty(form.party).map(pal => {
              const active = form.primary_color === pal.primary && form.secondary_color === pal.secondary
              return (
                <button key={pal.id} type="button" onClick={() => setForm(p => ({ ...p, primary_color: pal.primary, secondary_color: pal.secondary }))}
                  className={`text-left p-3 rounded-xl border-2 ${active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                  <div className="flex gap-2 mb-1">
                    <span className="w-6 h-6 rounded-full border border-black/10" style={{ background: pal.primary }} />
                    <span className="w-6 h-6 rounded-full border border-black/10" style={{ background: pal.secondary }} />
                  </div>
                  <p className="text-xs font-semibold text-gray-800">{pal.label}</p>
                </button>
              )
            })}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cor principal</label>
              <input type="color" value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} className="h-10 w-full rounded border border-gray-300 cursor-pointer" />
            </div>
            <div>
              <label className={labelCls}>Cor de destaque</label>
              <input type="color" value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))} className="h-10 w-full rounded border border-gray-300 cursor-pointer" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Estilo visual padrão</label>
            <select value={form.visual_style} onChange={e => setForm(p => ({ ...p, visual_style: e.target.value as VisualStyle }))} className={inputCls}>
              {VISUAL_STYLES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Estilo do jingle</label>
            <select value={form.jingle_style} onChange={e => setForm(p => ({ ...p, jingle_style: e.target.value as JingleStyle }))} className={inputCls}>
              {JINGLE_STYLES.map(s => <option key={s.value} value={s.value}>{s.value}</option>)}
            </select>
          </div>
        </div>

        <button type="button" onClick={handleSave} disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl text-sm">
          {saving ? 'Salvando…' : 'Salvar dados'}
        </button>
      </main>
    </div>
  )
}
