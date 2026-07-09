'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import type { Candidate } from '@/types'

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

export default function OnboardingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '', election_number: '', party: '', campaign_cnpj: '', cpf: '',
    slogan: '', biography_summary: '', primary_color: '#1a56db', secondary_color: '#ffd21e',
  })

  // Se já tem candidato, pula direto para planos
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await createBrowserClient().auth.getSession()
        if (!session) { router.replace('/login'); return }
        const res = await fetch('/api/v1/candidates', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const json = await res.json()
        const c: Candidate | undefined = json.success ? json.data?.[0] : undefined
        if (c) { router.replace('/planos'); return }
      } catch { /* segue para o form */ }
      setChecking(false)
    })()
  }, [router])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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

      router.push('/planos')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar seus dados.')
      setLoading(false)
    }
  }

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400 text-sm">Carregando…</p></div>
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
  const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-extrabold text-gray-900">Eleição<span className="text-blue-600">AI</span></span>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">Pular por agora</Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900">Seus dados de campanha</h1>
        <p className="text-gray-500 text-sm mt-1">Usamos essas informações em todas as peças. Você preenche uma vez só.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <fieldset className="bg-white rounded-2xl border border-gray-200 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nome completo *</label>
              <input name="name" required maxLength={150} value={form.name} onChange={handleChange} placeholder="Rafael Costa" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Número eleitoral *</label>
              <input name="election_number" required maxLength={6} value={form.election_number}
                onChange={e => setForm(p => ({ ...p, election_number: e.target.value.replace(/\D/g, '') }))} placeholder="12345" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Partido *</label>
              <input name="party" required maxLength={100} value={form.party} onChange={handleChange} placeholder="PT, PL, MDB..." className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>CPF *</label>
              <input required value={form.cpf} onChange={e => setForm(p => ({ ...p, cpf: formatCpf(e.target.value) }))} placeholder="000.000.000-00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>CNPJ da campanha *</label>
              <input required value={form.campaign_cnpj} onChange={e => setForm(p => ({ ...p, campaign_cnpj: formatCnpj(e.target.value) }))} placeholder="00.000.000/0000-00" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Slogan <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input name="slogan" maxLength={100} value={form.slogan} onChange={handleChange} placeholder="Experiência que transforma" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Biografia resumida * <span className="text-gray-400 font-normal">— a IA usa para o jingle</span></label>
              <textarea name="biography_summary" required minLength={20} maxLength={500} rows={4} value={form.biography_summary} onChange={handleChange}
                placeholder="Sua trajetória, conquistas e propostas..." className={`${inputCls} resize-none`} />
              <p className="text-xs text-gray-400 mt-1">{form.biography_summary.length}/500</p>
            </div>
          </fieldset>

          <fieldset className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <div>
              <label className={labelCls}>Foto do candidato <span className="text-gray-400 font-normal">(recomendado — o fundo é removido automaticamente)</span></label>
              <div className="flex items-center gap-4">
                <div onClick={() => photoRef.current?.click()}
                  className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-blue-400">
                  {photoPreview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={photoPreview} alt="Foto" className="object-cover w-full h-full rounded-full" />
                    : <span className="text-2xl text-gray-300">📷</span>}
                </div>
                <button type="button" onClick={() => photoRef.current?.click()} className="text-sm text-blue-600 hover:text-blue-800 underline">
                  {photoPreview ? 'Trocar foto' : 'Adicionar foto'}
                </button>
              </div>
              <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhoto} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Cor principal</label>
                <input type="color" value={form.primary_color} onChange={e => setForm(p => ({ ...p, primary_color: e.target.value }))} className="h-10 w-full rounded border border-gray-300 cursor-pointer" />
              </div>
              <div>
                <label className={labelCls}>Cor de destaque</label>
                <input type="color" value={form.secondary_color} onChange={e => setForm(p => ({ ...p, secondary_color: e.target.value }))} className="h-10 w-full rounded border border-gray-300 cursor-pointer" />
              </div>
            </div>
          </fieldset>

          <p className="text-xs text-gray-400">Seus dados são tratados conforme a LGPD. O CPF é criptografado e nunca compartilhado.</p>

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl text-base transition-colors">
            {loading ? 'Salvando…' : 'Continuar para os planos'}
          </button>
        </form>
      </main>
    </div>
  )
}
