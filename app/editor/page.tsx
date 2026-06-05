'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import type { Candidate } from '@/types'

// ── Santinho Preview ──────────────────────────────────────────────

interface PreviewProps {
  name: string
  number: string
  party: string
  slogan: string
  photoUrl: string
  primaryColor: string
  secondaryColor: string
  cnpj: string
}

function SantinhoPreview({ name, number, party, slogan, photoUrl, primaryColor, secondaryColor, cnpj }: PreviewProps) {
  return (
    <div
      className="relative flex flex-col overflow-hidden shadow-2xl border border-outline-variant"
      style={{ aspectRatio: '3/4', width: '100%', maxWidth: 360, background: primaryColor }}
    >
      {/* Foto */}
      <div className="relative flex-1 overflow-hidden">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={name} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: primaryColor + '33' }}>
            <span className="material-symbols-outlined text-white/40" style={{ fontSize: '6rem' }}>person</span>
          </div>
        )}
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to top, ${primaryColor} 0%, transparent 50%)` }}
        />
      </div>

      {/* Info block */}
      <div className="relative z-10 px-5 pb-3 pt-4" style={{ background: primaryColor }}>
        <div className="flex items-end justify-between border-b border-white/20 pb-3 mb-3">
          <div>
            <p className="font-black text-5xl leading-none" style={{ color: secondaryColor }}>
              VOTE {number}
            </p>
            <p className="font-bold text-lg uppercase mt-1 text-white">{name || 'SEU NOME'}</p>
          </div>
          <div className="text-right">
            <p className="text-sm uppercase text-white/70">{party}</p>
            {slogan && <p className="text-sm text-white/80 italic mt-0.5">"{slogan}"</p>}
          </div>
        </div>

        {/* TSE compliance label */}
        <p className="text-[9px] text-white/50 text-center">
          Conteúdo fabricado com IA{cnpj ? ` | CNPJ: ${cnpj}` : ''}
        </p>
      </div>
    </div>
  )
}

// ── Main Editor ───────────────────────────────────────────────────

function EditorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedId = searchParams.get('candidate')

  const [token, setToken] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  const [name, setName] = useState('SEU NOME')
  const [number, setNumber] = useState('00')
  const [party, setParty] = useState('')
  const [slogan, setSlogan] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#000109')
  const [secondaryColor, setSecondaryColor] = useState('#ffdf9e')
  const [photoUrl, setPhotoUrl] = useState('')
  const [cnpj, setCnpj] = useState('')

  const [assetType, setAssetType] = useState<'santinho' | 'banner' | 'social'>('santinho')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')

  // Auth
  useEffect(() => {
    createBrowserClient().auth.getSession().then(({ data }) => {
      if (data.session) setToken(data.session.access_token)
    })
  }, [])

  // Load candidates
  const loadCandidates = useCallback(async (t: string) => {
    const res = await fetch('/api/v1/candidates', { headers: { Authorization: `Bearer ${t}` } })
    const json = await res.json()
    if (json.success && Array.isArray(json.data)) {
      setCandidates(json.data)
      const id = preselectedId ?? json.data[0]?.id
      if (id) setSelectedId(id)
    }
  }, [preselectedId])

  useEffect(() => {
    if (token) loadCandidates(token)
  }, [token, loadCandidates])

  // Populate fields when candidate changes
  useEffect(() => {
    const c = candidates.find(c => c.id === selectedId)
    if (!c) return
    setName(c.name)
    setNumber(c.election_number)
    setParty(c.party)
    setSlogan(c.slogan ?? '')
    setPrimaryColor(c.primary_color)
    setSecondaryColor(c.secondary_color)
    setPhotoUrl(c.base_photo_url ?? '')
    setCnpj(c.campaign_cnpj)
  }, [selectedId, candidates])

  async function handleGenerate() {
    if (!token || !selectedId) return
    setGenerating(true)
    setGenError('')
    try {
      const res = await fetch('/api/v1/assets/image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate_id: selectedId, asset_type: assetType }),
      })
      const json = await res.json()
      if (!json.success) {
        setGenError(json.error ?? 'Erro ao iniciar geração.')
        return
      }
      router.push(`/orders/${json.data.asset_id}`)
    } catch {
      setGenError('Erro de conexão.')
    } finally {
      setGenerating(false)
    }
  }

  const ASSET_TYPES = [
    { value: 'santinho', label: 'Santinho', icon: 'description' },
    { value: 'banner',   label: 'Banner',   icon: 'image' },
    { value: 'social',   label: 'Social',   icon: 'share' },
  ] as const

  return (
    <div className="bg-surface text-on-surface flex h-screen overflow-hidden">

      {/* Left nav */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-40 bg-white border-r border-outline-variant w-60 shadow-sm">
        <div className="p-5">
          <Link href="/dashboard" className="font-black text-xl text-primary">Eleição<span className="text-secondary">AI</span></Link>
        </div>
        <nav className="flex-1 px-2 space-y-1">
          {[
            { href: '/dashboard', icon: 'dashboard', label: 'Dashboard' },
            { href: '/editor',    icon: 'palette',   label: 'Editor', active: true },
            { href: '/dashboard', icon: 'music_note', label: 'Jingle' },
            { href: '/dashboard', icon: 'folder_open', label: 'Meus materiais' },
          ].map(item => (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-primary/10 text-primary'
                  : 'text-on-surface-variant hover:bg-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4">
          <Link
            href="/order/santinho"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Novo pedido
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 lg:ml-60 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-outline-variant shrink-0">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <span className="material-symbols-outlined text-on-surface-variant">arrow_back</span>
            </Link>
            <div>
              <h1 className="font-bold text-on-surface">Editor de material</h1>
              <p className="text-xs text-on-surface-variant">Preview ao vivo — geração com Imagen 4</p>
            </div>
          </div>

          {/* Asset type toggle */}
          <div className="flex bg-surface-variant rounded-full p-1 gap-1">
            {ASSET_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setAssetType(t.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  assetType === t.value
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleGenerate}
            disabled={generating || !selectedId}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">
              {generating ? 'progress_activity' : 'auto_awesome'}
            </span>
            {generating ? 'Gerando...' : 'Gerar com IA'}
          </button>
        </header>

        {genError && (
          <div className="mx-4 mt-3 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {genError}
          </div>
        )}

        {/* Workspace */}
        <div className="flex-1 flex overflow-hidden">

          {/* Canvas area */}
          <section className="flex-1 flex flex-col items-center justify-center p-8 overflow-auto bg-surface-variant/40">
            <SantinhoPreview
              name={name}
              number={number}
              party={party}
              slogan={slogan}
              photoUrl={photoUrl}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
              cnpj={cnpj}
            />
            <p className="mt-4 text-xs text-on-surface-variant text-center">
              Preview ao vivo · A IA pode ajustar o layout final
            </p>
          </section>

          {/* Right panel */}
          <aside className="w-72 bg-white border-l border-outline-variant flex flex-col overflow-y-auto shrink-0">
            <div className="p-4 border-b border-outline-variant">
              <h2 className="font-bold text-on-surface">Personalização</h2>
            </div>

            <div className="p-4 space-y-5">

              {/* Candidate selector */}
              {candidates.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Candidatura
                  </label>
                  <select
                    value={selectedId}
                    onChange={e => setSelectedId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-outline text-sm focus:outline-none focus:border-primary"
                  >
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>{c.name} — {c.election_number}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  Nome político
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Number */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  Número da urna
                </label>
                <input
                  type="text"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-outline text-sm focus:outline-none focus:border-primary"
                />
              </div>

              {/* Slogan */}
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                  Slogan
                </label>
                <textarea
                  value={slogan}
                  onChange={e => setSlogan(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-outline text-sm focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Cor principal
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={e => setPrimaryColor(e.target.value)}
                      className="w-10 h-9 rounded cursor-pointer border border-outline p-0.5"
                    />
                    <span className="text-xs text-on-surface-variant font-mono">{primaryColor}</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wide mb-1.5">
                    Cor destaque
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={secondaryColor}
                      onChange={e => setSecondaryColor(e.target.value)}
                      className="w-10 h-9 rounded cursor-pointer border border-outline p-0.5"
                    />
                    <span className="text-xs text-on-surface-variant font-mono">{secondaryColor}</span>
                  </div>
                </div>
              </div>

              {/* Generate button (mobile / bottom) */}
              <div className="pt-2">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !selectedId}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-on-primary rounded-xl text-sm font-bold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {generating ? 'progress_activity' : 'auto_awesome'}
                  </span>
                  {generating ? 'Gerando com IA...' : 'Gerar material'}
                </button>
                <p className="text-xs text-on-surface-variant text-center mt-2">
                  A IA irá criar seu material e você poderá baixar em seguida.
                </p>
              </div>

              {/* No candidates state */}
              {candidates.length === 0 && token && (
                <div className="text-center py-6">
                  <span className="material-symbols-outlined text-on-surface-variant text-3xl">person_add</span>
                  <p className="text-sm text-on-surface-variant mt-2">Nenhuma candidatura cadastrada.</p>
                  <Link href="/order/santinho" className="inline-block mt-3 text-sm text-primary font-semibold hover:underline">
                    Criar candidatura →
                  </Link>
                </div>
              )}

            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

export default function EditorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined text-on-surface-variant animate-spin">progress_activity</span>
      </div>
    }>
      <EditorContent />
    </Suspense>
  )
}
