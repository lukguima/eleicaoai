'use client'

import { useState, useRef, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { getService, formatPrice } from '@/lib/pricing'
import { createBrowserClient } from '@/lib/supabase'
import type { JingleStyle } from '@/types'

const JINGLE_STYLES: { value: JingleStyle; emoji: string; desc: string }[] = [
  { value: 'Sertanejo Universitário', emoji: '🤠', desc: 'Batida moderna, voz emotiva, ideal para interior e agro' },
  { value: 'Forró',                   emoji: '🪗', desc: 'Animado e dançante, forte no Nordeste' },
  { value: 'Funk Gospel',             emoji: '🎤', desc: 'Energia alta, letras positivas, impacto nas periferias' },
  { value: 'MPB',                     emoji: '🎸', desc: 'Sofisticado e cultural, bom para público urbano' },
  { value: 'Pagode',                  emoji: '🥁', desc: 'Descontraído e popular, forte no Sudeste' },
  { value: 'Rap Político',            emoji: '✊', desc: 'Direto e combativo, conecta com jovens' },
]

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

export default function OrderPage({ params }: { params: Promise<{ service: string }> }) {
  const { service: serviceType } = use(params)
  const router = useRouter()
  const service = getService(serviceType)

  const [form, setForm] = useState({
    name: '',
    election_number: '',
    party: '',
    campaign_cnpj: '',
    cpf: '',
    slogan: '',
    biography_summary: '',
    primary_color: '#1a56db',
    secondary_color: '#ffffff',
    jingle_style: 'Sertanejo Universitário' as JingleStyle,
  })

  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'form' | 'confirm'>('form')

  const COMBO_PRICE = 59900 // R$ 599 — combo completo (todos os serviços)

  if (!service) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Serviço não encontrado.</p>
          <Link href="/dashboard" className="text-blue-600 underline mt-2 block">Voltar ao painel</Link>
        </div>
      </div>
    )
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm(p => ({ ...p, [name]: value }))
  }

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = e.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoError('Use JPEG, PNG ou WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Máximo 5 MB.')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function getToken(): Promise<string> {
    const supabase = createBrowserClient()
    const { data: { session } } = await supabase.auth.getSession()
    if (session) return session.access_token

    // Cria sessão anônima para o usuário não precisar se cadastrar
    // Requer "Anonymous sign-ins" ativo em Authentication → Sign In Methods no Supabase
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw new Error(`Erro de autenticação: ${error.message}. Verifique as configurações do Supabase.`)
    if (!data.session) throw new Error('Sessão não iniciada. Verifique se "Anonymous sign-ins" está ativo no Supabase.')
    return data.session.access_token
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 'form') { setStep('confirm'); return }

    setLoading(true)
    setError(null)

    try {
      const token = await getToken()

      // 1. Cria candidato
      const candRes = await fetch('/api/v1/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const candJson = await candRes.json()
      if (!candJson.success) throw new Error(candJson.error)
      const candidateId: string = candJson.data.id

      // 2. Upload de foto (se houver)
      if (photoFile) {
        const fd = new FormData()
        fd.append('photo', photoFile)
        await fetch(`/api/v1/candidates/${candidateId}/photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
      }

      // 3. Cria preferência de pagamento (ou bypass em dev)
      const payRes = await fetch('/api/v1/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidate_id: candidateId, service_type: serviceType, jingle_style: form.jingle_style }),
      })
      const payJson = await payRes.json()
      if (!payJson.success) throw new Error(payJson.error ?? 'Erro ao processar pagamento.')

      if (payJson.data.skip_payment) {
        // ── Dev / bypass: gera imediatamente ────────────────
        const endpoint = serviceType === 'jingle' ? '/api/v1/assets/jingle' : '/api/v1/assets/image'
        const genBody = serviceType === 'jingle'
          ? { candidate_id: candidateId, style: form.jingle_style }
          : { candidate_id: candidateId, asset_type: serviceType }

        const genRes = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(genBody),
        })
        const genJson = await genRes.json()
        if (!genJson.success) throw new Error(genJson.error)
        router.push(`/orders/${genJson.data.asset_id}`)
      } else {
        // ── Produção: redireciona para Mercado Pago ──────────
        window.location.href = payJson.data.payment_url
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar pedido.')
      setStep('form')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
            ← Dashboard
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">{service.label}</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Formulário */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {service.icon} {service.label}
              </h1>
              <p className="text-gray-500 text-sm mt-1">{service.description}</p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Dados do candidato */}
            <fieldset className="space-y-4 bg-white rounded-2xl border border-gray-200 p-6">
              <legend className="text-sm font-bold text-gray-700 uppercase tracking-wide px-1">
                Dados do candidato
              </legend>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo *</label>
                  <input name="name" required maxLength={150} value={form.name} onChange={handleChange}
                    placeholder="Rafael Costa"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Número eleitoral *</label>
                  <input name="election_number" required maxLength={6} pattern="\d{2,6}" value={form.election_number} onChange={handleChange}
                    placeholder="12345"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Partido *</label>
                  <input name="party" required maxLength={100} value={form.party} onChange={handleChange}
                    placeholder="PT, PL, MDB..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CPF *</label>
                  <input required value={form.cpf}
                    onChange={e => setForm(p => ({ ...p, cpf: formatCpf(e.target.value) }))}
                    placeholder="000.000.000-00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ da campanha *</label>
                  <input required value={form.campaign_cnpj}
                    onChange={e => setForm(p => ({ ...p, campaign_cnpj: formatCnpj(e.target.value) }))}
                    placeholder="00.000.000/0000-00"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slogan <span className="text-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input name="slogan" maxLength={100} value={form.slogan} onChange={handleChange}
                    placeholder="Experiência que transforma"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Biografia resumida *
                    <span className="text-gray-400 font-normal ml-1">— a IA usa esse texto para criar seu material</span>
                  </label>
                  <textarea name="biography_summary" required minLength={20} maxLength={500} rows={4}
                    value={form.biography_summary} onChange={handleChange}
                    placeholder="Descreva sua trajetória, principais conquistas e propostas..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" />
                  <p className="text-xs text-gray-400 mt-1">{form.biography_summary.length}/500</p>
                </div>
              </div>
            </fieldset>

            {/* Visual */}
            <fieldset className="space-y-5 bg-white rounded-2xl border border-gray-200 p-6">
              <legend className="text-sm font-bold text-gray-700 uppercase tracking-wide px-1">
                Identidade visual
              </legend>

              {/* Foto */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Foto do candidato <span className="text-gray-400 font-normal">(recomendado)</span>
                </label>
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => photoRef.current?.click()}
                    className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-blue-400 transition-colors flex-shrink-0"
                  >
                    {photoPreview
                      ? <Image src={photoPreview} alt="Foto" width={80} height={80} className="object-cover w-full h-full rounded-full" unoptimized />
                      : <span className="text-2xl text-gray-300">📷</span>
                    }
                  </div>
                  <div>
                    <button type="button" onClick={() => photoRef.current?.click()}
                      className="text-sm text-blue-600 hover:text-blue-800 underline">
                      {photoPreview ? 'Trocar foto' : 'Adicionar foto'}
                    </button>
                    <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG ou WebP · máx. 5 MB</p>
                    {photoError && <p className="text-xs text-red-600 mt-0.5">{photoError}</p>}
                  </div>
                </div>
                <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhoto} />
              </div>

              {/* Cores */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor principal</label>
                  <div className="flex items-center gap-2">
                    <input name="primary_color" type="color" value={form.primary_color} onChange={handleChange}
                      className="h-10 w-14 rounded border border-gray-300 cursor-pointer" />
                    <span className="text-sm text-gray-500 font-mono">{form.primary_color}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cor secundária</label>
                  <div className="flex items-center gap-2">
                    <input name="secondary_color" type="color" value={form.secondary_color} onChange={handleChange}
                      className="h-10 w-14 rounded border border-gray-300 cursor-pointer" />
                    <span className="text-sm text-gray-500 font-mono">{form.secondary_color}</span>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Estilo do jingle (só aparece se for jingle) */}
            {serviceType === 'jingle' && (
              <fieldset className="bg-white rounded-2xl border border-gray-200 p-6">
                <legend className="text-sm font-bold text-gray-700 uppercase tracking-wide px-1 mb-4">
                  Estilo musical
                </legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {JINGLE_STYLES.map(({ value, emoji, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, jingle_style: value }))}
                      className={`flex items-start gap-3 p-4 rounded-xl text-left border-2 transition-all ${
                        form.jingle_style === value
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-2xl shrink-0">{emoji}</span>
                      <div>
                        <p className={`text-sm font-bold ${form.jingle_style === value ? 'text-blue-700' : 'text-gray-900'}`}>
                          {value}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                      </div>
                      {form.jingle_style === value && (
                        <span className="ml-auto text-blue-600 shrink-0">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            {/* LGPD */}
            <p className="text-xs text-gray-400">
              Seus dados são tratados conforme a LGPD. O CPF é criptografado e nunca compartilhado.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl text-base transition-colors"
            >
              {loading
                ? 'Processando...'
                : step === 'form'
                  ? `Revisar pedido →`
                  : `Confirmar e gerar — ${formatPrice(COMBO_PRICE)}`
              }
            </button>
          </form>
        </div>

        {/* Resumo lateral */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
            <h2 className="font-bold text-gray-900">Resumo do pedido</h2>

            <div className="flex items-center gap-3 py-3 border-b border-gray-100">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Combo Completo</p>
                <p className="text-xs text-gray-400">Todos os 5 materiais incluídos</p>
              </div>
            </div>

            <ul className="space-y-1.5">
              {[
                { icon: '🗳️', label: 'Santinho Digital' },
                { icon: '📢', label: 'Banner / Placa' },
                { icon: '🏷️', label: 'Faixa Perfurada' },
                { icon: '📱', label: 'Post para Redes Sociais' },
                { icon: '🎵', label: 'Jingle de Campanha' },
              ].map(item => (
                <li key={item.label} className="flex items-center gap-2 text-xs text-gray-600">
                  <span>{item.icon}</span>
                  <span className={item.label === service.label ? 'font-semibold text-blue-700' : ''}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ul>

            <div className="border-t border-gray-100 pt-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total</span>
                <span className="text-xl font-extrabold text-gray-900">{formatPrice(COMBO_PRICE)}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">⏱ {service.deliveryTime}</p>
            </div>

            <div className="rounded-lg bg-green-50 border border-green-200 p-3">
              <p className="text-xs text-green-800 font-medium">
                ✅ Inclui rótulo de IA obrigatório (Res. TSE 23.732/2024)
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
