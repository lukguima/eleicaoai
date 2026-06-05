'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import AssetCard from '@/components/AssetCard'
import CandidateForm from '@/components/CandidateForm'
import type { Asset, Candidate } from '@/types'

/* ── helpers ─────────────────────────────────────────────────── */

async function getToken(): Promise<string | null> {
  const { data: { session } } = await createBrowserClient().auth.getSession()
  return session?.access_token ?? null
}

function CandidateAvatar({ candidate }: { candidate: Candidate }) {
  const initials = candidate.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')

  if (candidate.base_photo_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={candidate.base_photo_url}
        alt={candidate.name}
        className="w-full h-full object-cover rounded-full"
      />
    )
  }
  return (
    <span className="font-headline font-bold text-on-primary text-sm">{initials}</span>
  )
}

/* ── quick action cards ──────────────────────────────────────── */

const SERVICES = [
  { type: 'santinho',  icon: '🗳️', label: 'Santinho',     desc: '70×100mm · WhatsApp' },
  { type: 'jingle',   icon: '🎵', label: 'Jingle',        desc: 'Sertanejo, Forró...' },
  { type: 'banner',   icon: '📋', label: 'Banner',        desc: 'Impressão em rua' },
  { type: 'social',   icon: '📱', label: 'Post Social',   desc: 'Instagram, Stories' },
  { type: 'perfurado',icon: '🚗', label: 'Perfurado',     desc: 'Arte para plotagem' },
]

/* ── icon component (Material Symbols) ──────────────────────── */

function Icon({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span
      className={`material-symbols-outlined select-none ${className}`}
      style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
    >
      {name}
    </span>
  )
}

/* ── stat card ───────────────────────────────────────────────── */

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-lg flex items-center gap-lg">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-on-surface-variant text-xs font-semibold uppercase tracking-wide">{label}</p>
        <p className="font-headline font-bold text-2xl text-on-surface leading-none mt-0.5">{value}</p>
      </div>
    </div>
  )
}

/* ── main component ──────────────────────────────────────────── */

export default function DashboardPage() {
  const router = useRouter()
  const [token, setToken]                 = useState<string | null>(null)
  const [candidates, setCandidates]       = useState<Candidate[]>([])
  const [selectedId, setSelectedId]       = useState<string | null>(null)
  const [assets, setAssets]               = useState<Asset[]>([])
  const [loadingCandidates, setLoadingCandidates] = useState(true)
  const [sidebarOpen, setSidebarOpen]     = useState(false)

  async function handleLogout() {
    await createBrowserClient().auth.signOut()
    router.push('/')
  }

  // Auth
  useEffect(() => {
    getToken().then(setToken)
  }, [])

  // Candidatos
  useEffect(() => {
    if (!token) return
    setLoadingCandidates(true)
    fetch('/api/v1/candidates', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setCandidates(j.data)
          if (j.data.length > 0) setSelectedId(j.data[0].id)
        }
      })
      .finally(() => setLoadingCandidates(false))
  }, [token])

  // Assets + polling
  const loadAssets = useCallback(async () => {
    if (!token || !selectedId) return
    const r = await fetch(`/api/v1/assets?candidate_id=${selectedId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const j = await r.json()
    if (j.success) setAssets(j.data)
  }, [token, selectedId])

  useEffect(() => {
    loadAssets()
    const interval = setInterval(loadAssets, 8000)
    return () => clearInterval(interval)
  }, [loadAssets])

  const candidate      = candidates.find(c => c.id === selectedId)
  const totalAssets    = assets.length
  const doneAssets     = assets.filter(a => a.status === 'done').length
  const pendingAssets  = assets.filter(a => a.status === 'processing' || a.status === 'pending').length
  const recentAssets   = [...assets].sort((a, b) =>
    new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
  ).slice(0, 8)

  /* ── sidebar ─────────────────────────────────────────────── */
  const Sidebar = (
    <aside
      className={`
        fixed left-0 top-0 h-full z-40 w-64 flex flex-col
        bg-[#0f1a2e] border-r-4 border-[#22c55e]
        shadow-[6px_0_32px_rgba(0,0,0,0.35)]
        transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
      `}
    >
      {/* Branding */}
      <div className="px-lg pt-xl pb-lg border-b border-white/10">
        <span className="font-headline font-extrabold text-xl tracking-tight">
          <span className="text-white">Eleição</span><span className="text-[#4ade80]">AI</span>
        </span>
        <p className="text-white/40 text-xs mt-0.5">Portal do Candidato</p>
      </div>

      {/* Candidate info */}
      {candidate && (
        <div className="px-lg py-md border-b border-white/10">
          <div className="flex items-center gap-md">
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0 overflow-hidden ring-2 ring-white/20">
              <CandidateAvatar candidate={candidate} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-white text-sm truncate leading-tight">{candidate.name}</p>
              <p className="text-white/50 text-xs">Nº {candidate.election_number} · {candidate.party}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-sm py-md overflow-y-auto space-y-1">
        <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest px-3 mb-2 mt-1">Menu</p>

        <Link
          href="/dashboard"
          className="flex items-center gap-md px-3 py-2.5 rounded-xl bg-white/15 text-white font-semibold text-sm"
        >
          <Icon name="dashboard" className="text-[20px]" />
          Dashboard
        </Link>

        <div className="pt-md">
          <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest px-3 mb-2">Criar material</p>
          {SERVICES.map(s => (
            <Link
              key={s.type}
              href={`/order/${s.type}`}
              className="flex items-center gap-md px-3 py-2.5 rounded-xl text-white/60 hover:bg-white/10 hover:text-white transition-all text-sm"
            >
              <span className="text-base">{s.icon}</span>
              {s.label}
            </Link>
          ))}
        </div>

      </nav>

      {/* Bottom actions */}
      <div className="p-lg border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-white/40 hover:text-white/80 py-2 text-xs transition-colors"
        >
          <Icon name="logout" className="text-[16px]" />
          Sair
        </button>
      </div>
    </aside>
  )

  /* ── no session state ────────────────────────────────────── */
  if (!loadingCandidates && !token) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-4 max-w-[28rem] px-6">
          <p className="font-headline font-bold text-3xl text-primary">EleiçãoAI</p>
          <p className="text-on-surface-variant">Você ainda não tem nenhum material criado.</p>
          <Link
            href="/order/santinho"
            className="inline-block bg-primary text-on-primary font-bold px-8 py-4 rounded-xl hover:opacity-90 transition-all"
          >
            Criar meu primeiro material →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface text-on-surface font-sans">
      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {Sidebar}

      {/* ── Top nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm border-b border-outline-variant lg:pl-64">
        <div className="flex items-center justify-between px-xl py-sm">
          <div className="flex items-center gap-md">
            <button
              className="lg:hidden p-2 rounded-full hover:bg-surface-container transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Icon name="menu" />
            </button>
            <h2 className="font-headline font-bold text-on-surface text-lg hidden lg:block">Visão Geral</h2>
          </div>

          <div className="flex items-center gap-md">
            {candidate && (
              <span className="hidden sm:inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container text-xs font-semibold px-3 py-1.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-secondary inline-block" />
                {candidate.name}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-surface-container transition-colors text-on-surface-variant hover:text-error"
              title="Sair"
            >
              <Icon name="logout" className="text-[20px]" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="lg:pl-64 py-xl">
        <div style={{ maxWidth: '72rem' }} className="mx-auto space-y-12 px-xl md:px-xxl">

          {/* Welcome */}
          <div>
            <h1 className="font-headline font-bold text-3xl text-on-surface">
              {loadingCandidates
                ? 'Carregando…'
                : candidate
                  ? `Olá, ${candidate.name.split(' ')[0]} 👋`
                  : 'Bem-vindo ao EleiçãoAI'}
            </h1>
            <p className="text-on-surface-variant mt-1">
              {candidate
                ? `Candidato nº ${candidate.election_number} · ${candidate.party}`
                : 'Crie seu primeiro candidato para começar a gerar materiais.'}
            </p>
          </div>

          {/* Form de cadastro inicial */}
          {!loadingCandidates && candidates.length === 0 && (
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant p-lg shadow-sm">
              <h3 className="font-headline font-bold text-on-surface mb-lg">Cadastre seu candidato</h3>
              <CandidateForm
                onSuccess={id => {
                  setSelectedId(id)
                  if (!token) return
                  fetch('/api/v1/candidates', { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.json())
                    .then(j => j.success && setCandidates(j.data))
                }}
              />
            </div>
          )}

          {candidate && (
            <>
              {/* Stats */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
                <StatCard icon="🗂️" label="Total gerado"     value={totalAssets}   color="bg-primary-container" />
                <StatCard icon="✅" label="Prontos"           value={doneAssets}    color="bg-secondary-container" />
                <StatCard icon="⚙️" label="Em processo"      value={pendingAssets} color="bg-surface-container-high" />
                <StatCard icon="🗳️" label="Nº candidato"     value={parseInt(candidate.election_number) || 0} color="bg-tertiary-container" />
              </div>

              {/* Quick actions */}
              <div>
                <h3 className="font-headline font-bold text-on-surface pb-sm mb-md border-b border-outline-variant">Criar novo material</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-md">
                  {SERVICES.map(s => (
                    <Link
                      key={s.type}
                      href={`/order/${s.type}`}
                      className="group bg-surface-container-lowest rounded-2xl border border-outline-variant p-md hover:border-primary hover:shadow-lg transition-all flex flex-col gap-2"
                    >
                      <span className="text-3xl">{s.icon}</span>
                      <div>
                        <p className="font-semibold text-on-surface text-sm">{s.label}</p>
                        <p className="text-on-surface-variant text-xs">{s.desc}</p>
                      </div>
                      <span className="text-secondary text-xs font-semibold group-hover:underline mt-auto">Criar →</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Materials gallery */}
              <div>
                <div className="flex items-center justify-between pb-sm mb-md border-b border-outline-variant">
                  <h3 className="font-headline font-bold text-on-surface">Meus materiais</h3>
                  {assets.length > 8 && (
                    <span className="text-secondary text-sm font-medium hover:underline cursor-pointer">
                      Ver todos ({assets.length})
                    </span>
                  )}
                </div>

                {recentAssets.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
                    {recentAssets.map(asset => (
                      <AssetCard key={asset.id} asset={asset} />
                    ))}
                  </div>
                ) : (
                  <div className="bg-surface-container-low border border-outline-variant rounded-2xl p-12 text-center">
                    <p className="text-4xl mb-3">🎨</p>
                    <p className="text-on-surface font-semibold">Nenhum material ainda</p>
                    <p className="text-on-surface-variant text-sm mt-1">
                      Use os atalhos acima para gerar seu primeiro material
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-surface border-t border-outline-variant flex justify-around items-center py-2 z-20 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <Link href="/dashboard" className="flex flex-col items-center gap-0.5 text-secondary px-3 py-1">
          <Icon name="dashboard" className="text-[22px]" />
          <span className="text-[10px] font-bold">Dashboard</span>
        </Link>
        <Link href="/order/santinho" className="flex flex-col items-center gap-0.5 text-on-surface-variant px-3 py-1">
          <span className="text-[22px] leading-none">🗳️</span>
          <span className="text-[10px]">Santinho</span>
        </Link>
        <Link href="/order/jingle" className="flex flex-col items-center gap-0.5 text-on-surface-variant px-3 py-1">
          <span className="text-[22px] leading-none">🎵</span>
          <span className="text-[10px]">Jingle</span>
        </Link>
        <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 text-on-surface-variant px-3 py-1">
          <Icon name="logout" className="text-[22px]" />
          <span className="text-[10px]">Sair</span>
        </button>
      </nav>
    </div>
  )
}
