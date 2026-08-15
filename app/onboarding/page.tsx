'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { SantinhoTemplate } from '@/components/templates/SantinhoTemplate'
import { OFFICES, UFS, JINGLE_STYLES, VISUAL_STYLES, palettesForParty } from '@/lib/office'
import { applyPartyToForm, lookupParty } from '@/lib/parties'
import { PartySelect } from '@/components/PartySelect'
import type { Candidate, Design, JingleStyle, Office, VisualStyle } from '@/types'
import '@fontsource/inter/800.css'
import '@fontsource/anton/400.css'

function formatCpf(v: string) {
  return v.replace(/\D/g, '').slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}
function formatCnpj(v: string) {
  return v.replace(/\D/g, '').slice(0, 14)
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

export default function OnboardingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [slogans, setSlogans] = useState<string[]>([])
  const [loadingSlogans, setLoadingSlogans] = useState(false)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '', election_number: '', party: '', office: 'deputado_estadual' as Office, uf: 'SP',
    biography_summary: '', slogan: '', primary_color: '#1a56db', secondary_color: '#ffd21e',
    visual_style: 'classico' as VisualStyle, jingle_style: 'Sertanejo Universitário' as JingleStyle,
    campaign_cnpj: '', cpf: '', whatsapp: '', show_party_logo: true,
  })

  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await createBrowserClient().auth.getSession()
        if (!session) { router.replace('/login'); return }
        const res = await fetch('/api/v1/candidates', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const json = await res.json()
        const c: Candidate | undefined = json.success ? json.data?.[0] : undefined
        if (c) { router.replace('/planos'); return }
      } catch { /* segue */ }
      setChecking(false)
    })()
  }, [router])

  const palettes = useMemo(() => palettesForParty(form.party), [form.party])

  const previewDesign: Design = {
    template_id: form.visual_style,
    fields: { name: form.name, number: form.election_number, party: form.party, slogan: form.slogan, cnpj: form.campaign_cnpj },
    colors: { primary: form.primary_color, secondary: form.secondary_color },
    photo: photoPreview ? { url: photoPreview, offset_x: 50, offset_y: 50, scale: 1 } : undefined,
    background: { kind: 'solid', value: form.primary_color },
    label_position: 'bottom',
    show_party_logo: form.show_party_logo,
    party_logo_url: logoPreview || undefined,
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Use JPEG, PNG ou WebP.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Foto de no máximo 5 MB.'); return }
    setError(null)
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Logo em JPEG, PNG ou WebP.'); return }
    if (file.size > 2 * 1024 * 1024) { setError('Logo de no máximo 2 MB.'); return }
    setError(null)
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setForm(p => ({ ...p, show_party_logo: true }))
  }

  async function loadSlogans() {
    setLoadingSlogans(true); setError(null)
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession()
      if (!session) throw new Error('Sessão expirada.')
      const res = await fetch('/api/v1/slogans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          name: form.name, number: form.election_number, party: form.party,
          office: form.office, bio: form.biography_summary,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setSlogans(json.data.slogans)
      if (!form.slogan && json.data.slogans[0]) setForm(p => ({ ...p, slogan: json.data.slogans[0] }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para sugerir slogan.')
    } finally {
      setLoadingSlogans(false)
    }
  }

  function canNext(): boolean {
    if (step === 1) {
      return form.name.trim().length >= 2 && form.election_number.length >= 2
        && form.party.trim().length >= 2 && form.biography_summary.trim().length >= 20
    }
    return true
  }

  async function goNext() {
    setError(null)
    if (step === 1 && slogans.length === 0) loadSlogans()
    if (step < 4) setStep(s => (s + 1) as 2 | 3 | 4)
  }

  async function handleFinish() {
    setLoading(true); setError(null)
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')
      const auth = { Authorization: `Bearer ${session.access_token}` }

      const res = await fetch('/api/v1/candidates', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      const candidateId = json.data.id

      if (photoFile) {
        const fd = new FormData()
        fd.append('photo', photoFile)
        await fetch(`/api/v1/candidates/${candidateId}/photo`, { method: 'POST', headers: auth, body: fd })
      }
      if (logoFile) {
        const fd = new FormData()
        fd.append('logo', logoFile)
        await fetch(`/api/v1/candidates/${candidateId}/party-logo`, { method: 'POST', headers: auth, body: fd })
      }

      router.push('/planos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar seus dados.')
      setLoading(false)
    }
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400 text-sm">Carregando…</p></div>
  }

  const titles = ['Quem é você', 'Identidade', 'Estilo', 'Pacote']

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-extrabold text-gray-900">Eleição<span className="text-blue-600">AI</span></span>
          <span className="text-xs font-semibold text-gray-400">{step}/4 · {titles[step - 1]}</span>
        </div>
        <div className="h-1 bg-gray-100">
          <div className="h-1 bg-blue-600 transition-all" style={{ width: `${(step / 4) * 100}%` }} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Vamos montar sua campanha</h1>
              <p className="text-gray-500 text-sm mt-1">Nome de urna, número e uma foto. O resto a gente resolve.</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
              <div className="flex items-center gap-4">
                <button type="button" onClick={() => photoRef.current?.click()}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 shrink-0">
                  {photoPreview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={photoPreview} alt="" className="object-cover w-full h-full" />
                    : <span className="text-2xl text-gray-300">📷</span>}
                </button>
                <div>
                  <p className="text-sm font-medium text-gray-800">Foto do candidato</p>
                  <p className="text-xs text-gray-400">Fundo removido automaticamente. JPEG, PNG ou WebP até 5 MB.</p>
                  <button type="button" onClick={() => photoRef.current?.click()} className="text-sm text-blue-600 underline mt-1">
                    {photoPreview ? 'Trocar foto' : 'Enviar ou tirar foto'}
                  </button>
                </div>
                <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="hidden" onChange={handlePhoto} />
              </div>
              <div>
                <label className={labelCls}>Nome de urna *</label>
                <input value={form.name} maxLength={150} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Maria Silva" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Partido *</label>
                <PartySelect
                  value={form.party}
                  onChange={party => setForm(p => applyPartyToForm(p, party))}
                  className={inputCls}
                />
                {lookupParty(form.party) && (
                  <p className="text-xs text-gray-500 mt-1">Cores e modelo do {lookupParty(form.party)!.id} aplicados. Você altera no passo seguinte se quiser.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Número *</label>
                  <input value={form.election_number} maxLength={6} onChange={e => setForm(p => ({ ...p, election_number: e.target.value.replace(/\D/g, '') }))} placeholder="12345" className={inputCls} />
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
                <label className={labelCls}>Em 3 linhas, quem é você? * <span className="text-gray-400 font-normal">— vira slogan e jingle</span></label>
                <textarea minLength={20} maxLength={500} rows={4} value={form.biography_summary}
                  onChange={e => setForm(p => ({ ...p, biography_summary: e.target.value }))}
                  placeholder="Trajetória, o que você defende, por que o eleitor deveria te conhecer…"
                  className={`${inputCls} resize-none`} />
                <p className="text-xs text-gray-400 mt-1">{form.biography_summary.length}/500</p>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Identidade visual</h1>
              <p className="text-gray-500 text-sm mt-1">
                {lookupParty(form.party)
                  ? `Cores e modelo do ${lookupParty(form.party)!.id} já estão aplicados. Altere só se quiser.`
                  : 'Escolha as cores e um slogan. Você pode editar depois.'}
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">Logo do partido nas artes</p>
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                  <input type="checkbox" checked={form.show_party_logo} onChange={e => setForm(p => ({ ...p, show_party_logo: e.target.checked }))} />
                  Mostrar
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => logoRef.current?.click()}
                  className="w-14 h-14 rounded-lg border border-dashed border-gray-300 overflow-hidden bg-gray-50 shrink-0">
                  {logoPreview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={logoPreview} alt="" className="object-contain w-full h-full p-1" />
                    : <span className="text-[10px] text-gray-400">{form.party || 'Logo'}</span>}
                </button>
                <div>
                  <p className="text-xs text-gray-500">PNG com fundo transparente fica melhor. Sem arquivo, a sigla aparece num selo.</p>
                  <button type="button" onClick={() => logoRef.current?.click()} className="text-sm text-blue-600 underline mt-1">
                    {logoPreview ? 'Trocar logo' : 'Enviar logo oficial'}
                  </button>
                </div>
                <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleLogo} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {palettes.map(pal => {
                const active = form.primary_color === pal.primary && form.secondary_color === pal.secondary
                return (
                  <button key={pal.id} type="button" onClick={() => setForm(p => ({ ...p, primary_color: pal.primary, secondary_color: pal.secondary }))}
                    className={`text-left p-4 rounded-xl border-2 ${active ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                    <div className="flex gap-2 mb-2">
                      <span className="w-8 h-8 rounded-full border border-black/10" style={{ background: pal.primary }} />
                      <span className="w-8 h-8 rounded-full border border-black/10" style={{ background: pal.secondary }} />
                    </div>
                    <p className="text-sm font-semibold text-gray-800">{pal.label}</p>
                  </button>
                )
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Ou escolha as suas</label>
                <input type="color" value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} className="h-10 w-full rounded border border-gray-300 cursor-pointer" />
              </div>
              <div>
                <label className={labelCls}>Destaque</label>
                <input type="color" value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))} className="h-10 w-full rounded border border-gray-300 cursor-pointer" />
              </div>
            </div>
            {lookupParty(form.party) && (
              <button type="button" onClick={() => setForm(p => applyPartyToForm(p, p.party))} className="text-sm text-blue-600 underline">
                Voltar às cores e ao modelo do partido
              </button>
            )}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">Slogan</p>
                <button type="button" onClick={loadSlogans} disabled={loadingSlogans} className="text-sm text-blue-600 underline disabled:opacity-50">
                  {loadingSlogans ? 'Sugerindo…' : 'Sugerir com IA'}
                </button>
              </div>
              {slogans.map(s => (
                <button key={s} type="button" onClick={() => setForm(p => ({ ...p, slogan: s }))}
                  className={`block w-full text-left px-3 py-2 rounded-lg text-sm border ${form.slogan === s ? 'border-blue-600 bg-blue-50 text-blue-800' : 'border-gray-200'}`}>
                  {s}
                </button>
              ))}
              <input value={form.slogan} maxLength={100} onChange={e => setForm(p => ({ ...p, slogan: e.target.value }))} placeholder="Ou escreva o seu" className={inputCls} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Estilo das peças e do jingle</h1>
              <p className="text-gray-500 text-sm mt-1">
                {lookupParty(form.party)
                  ? `O modelo ${VISUAL_STYLES.find(s => s.value === form.visual_style)?.label ?? ''} veio do partido. Troque se quiser.`
                  : 'Uma escolha só. Todas as artes seguem essa direção.'}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {VISUAL_STYLES.map(s => (
                <button key={s.value} type="button" onClick={() => setForm(p => ({ ...p, visual_style: s.value }))}
                  className={`text-left p-4 rounded-xl border-2 ${form.visual_style === s.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                  <p className="font-bold text-sm text-gray-900">{s.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
                </button>
              ))}
            </div>
            <p className="text-sm font-semibold text-gray-800">Jingle</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {JINGLE_STYLES.map(s => (
                <button key={s.value} type="button" onClick={() => setForm(p => ({ ...p, jingle_style: s.value }))}
                  className={`flex items-start gap-3 p-4 rounded-xl text-left border-2 ${form.jingle_style === s.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                  <span className="text-2xl">{s.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{s.value}</p>
                    <p className="text-xs text-gray-500">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Seu kit, antes de pagar</h1>
              <p className="text-gray-500 text-sm mt-1">CNPJ e CPF entram no rodapé legal. Não usamos deepfake nem clone de voz.</p>
            </div>
            <div className="flex justify-center">
              <div className="shadow-xl rounded-xl overflow-hidden" style={{ width: 206, height: 295 }}>
                <div style={{ width: 413, height: 590, transform: 'scale(0.5)', transformOrigin: 'top left' }}>
                  <SantinhoTemplate design={previewDesign} />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>CPF *</label>
                <input required value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: formatCpf(e.target.value) }))} placeholder="000.000.000-00" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>CNPJ da campanha *</label>
                <input required value={form.campaign_cnpj} onChange={e => setForm(p => ({ ...p, campaign_cnpj: formatCnpj(e.target.value) }))} placeholder="00.000.000/0000-00" className={inputCls} />
                <p className="text-[11px] text-gray-400 mt-1">Exigido pelo TSE em material impresso. Criptografamos o CPF.</p>
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>WhatsApp <span className="text-gray-400 font-normal">(opcional, vai no mini-site)</span></label>
                <input value={form.whatsapp} maxLength={20} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value.replace(/\D/g, '') }))} placeholder="11999999999" className={inputCls} />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-3">
          {step > 1 && (
            <button type="button" onClick={() => setStep(s => (s - 1) as 1 | 2 | 3)} className="px-4 py-3 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700">
              Voltar
            </button>
          )}
          {step < 4 ? (
            <button type="button" onClick={goNext} disabled={!canNext()} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl">
              Continuar
            </button>
          ) : (
            <button type="button" onClick={handleFinish} disabled={loading || form.cpf.replace(/\D/g, '').length !== 11 || form.campaign_cnpj.replace(/\D/g, '').length !== 14}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl">
              {loading ? 'Salvando…' : 'Ver o pacote e pagar'}
            </button>
          )}
        </div>
        {step === 1 && <Link href="/dashboard" className="block text-center text-xs text-gray-400">Pular por agora</Link>}
      </main>
    </div>
  )
}
