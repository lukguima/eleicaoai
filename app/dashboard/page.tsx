'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import type { AssetType } from '@/types'

interface Entitlement { id: string; asset_type: AssetType; status: string; asset_id: string | null }
interface AssetLite { id: string; asset_type: AssetType; status: string; output_url: string | null; created_at: string }
interface CandidateLite { id: string; name: string; election_number: string; party: string; base_photo_url: string | null }

const PIECES: { type: AssetType; icon: string; label: string; createHref: string }[] = [
  { type: 'santinho',  icon: '🗳️', label: 'Santinho',        createHref: '/criar/santinho' },
  { type: 'banner',    icon: '📢', label: 'Banner',           createHref: '/criar/banner' },
  { type: 'perfurado', icon: '🏷️', label: 'Faixa perfurada',  createHref: '/criar/perfurado' },
  { type: 'social',    icon: '📱', label: 'Post para redes',   createHref: '/criar/social' },
  { type: 'jingle',    icon: '🎵', label: 'Jingle',            createHref: '/criar/jingle' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [candidate, setCandidate] = useState<CandidateLite | null>(null)
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [assets, setAssets] = useState<AssetLite[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)

  const load = useCallback(async (t: string) => {
    const res = await fetch('/api/v1/campaign', { headers: { Authorization: `Bearer ${t}` } })
    const json = await res.json()
    if (json.success) {
      setCandidate(json.data.candidate)
      setEntitlements(json.data.entitlements)
      setAssets(json.data.assets)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    createBrowserClient().auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/login'); return }
      setToken(data.session.access_token)
      load(data.session.access_token)
    })
  }, [router, load])

  // Polling enquanto houver peça em produção
  useEffect(() => {
    if (!token) return
    const anyProcessing = assets.some(a => a.status === 'processing' || a.status === 'pending')
    if (!anyProcessing) return
    const iv = setInterval(() => load(token), 5000)
    return () => clearInterval(iv)
  }, [token, assets, load])

  async function handleLogout() {
    await createBrowserClient().auth.signOut()
    router.push('/')
  }

  async function downloadKit() {
    if (!token) return
    setDownloading(true)
    try {
      const res = await fetch('/api/v1/kit/download', { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = 'kit-campanha.zip'; a.click()
      URL.revokeObjectURL(url)
    } catch { /* ignore */ } finally { setDownloading(false) }
  }

  function statusOf(type: AssetType) {
    const ents = entitlements.filter(e => e.asset_type === type)
    const contracted = ents.length > 0
    const done = assets.find(a => a.asset_type === type && a.status === 'done')
    const processing = assets.find(a => a.asset_type === type && (a.status === 'processing' || a.status === 'pending'))
    return { contracted, done, processing }
  }

  const doneCount = PIECES.filter(p => statusOf(p.type).done).length

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400 text-sm">Carregando sua campanha…</p></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-extrabold text-gray-900">Eleição<span className="text-blue-600">AI</span></span>
          <div className="flex items-center gap-4">
            <Link href="/planos" className="text-sm text-blue-600 font-semibold hover:text-blue-800">Planos</Link>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-800">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {!candidate ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
            <h1 className="text-xl font-bold text-gray-900">Bem-vindo!</h1>
            <p className="text-gray-500 text-sm">Cadastre seus dados de campanha para começar.</p>
            <Link href="/onboarding" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm">Começar</Link>
          </div>
        ) : (
          <>
            {/* Cabeçalho da campanha */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {candidate.base_photo_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={candidate.base_photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  : <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">{candidate.name.charAt(0)}</div>}
                <div>
                  <h1 className="font-bold text-gray-900">{candidate.name}</h1>
                  <p className="text-xs text-gray-500">{candidate.party} · nº {candidate.election_number}</p>
                </div>
              </div>
              {doneCount > 0 && (
                <button onClick={downloadKit} disabled={downloading}
                  className="bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50">
                  {downloading ? 'Preparando…' : `⬇ Baixar kit (${doneCount})`}
                </button>
              )}
            </div>

            {/* Progresso */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-semibold text-gray-700">Progresso do kit</span>
                <span className="text-gray-500">{doneCount}/5 prontos</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${(doneCount / 5) * 100}%` }} />
              </div>
            </div>

            {/* Peças */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PIECES.map(piece => {
                const { contracted, done, processing } = statusOf(piece.type)
                return (
                  <div key={piece.type} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{piece.icon}</span>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{piece.label}</p>
                        <p className="text-xs text-gray-400">
                          {done ? '✅ Pronto' : processing ? '⚙️ Em produção…' : contracted ? 'Contratado' : 'Não contratado'}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {!contracted && (
                        <Link href="/planos" className="text-sm font-semibold text-gray-500 hover:text-gray-800 underline">Contratar</Link>
                      )}
                      {contracted && processing && (
                        <Link href={`/orders/${processing.id}`} className="text-sm font-semibold text-blue-600 hover:text-blue-800 underline">Acompanhar</Link>
                      )}
                      {contracted && done && (
                        <div className="flex flex-col items-end gap-1">
                          <Link href={`/orders/${done.id}`} className="text-sm font-semibold text-green-700 hover:text-green-900 underline">Ver / Baixar</Link>
                          {piece.type !== 'jingle' && (
                            <Link href={`${piece.createHref}?asset=${done.id}`} className="text-xs text-gray-400 hover:text-gray-600 underline">Editar</Link>
                          )}
                        </div>
                      )}
                      {contracted && !done && !processing && (
                        <Link href={piece.createHref} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg">Criar</Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {entitlements.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center space-y-2">
                <p className="text-sm text-blue-800 font-medium">Você ainda não contratou nenhuma peça.</p>
                <Link href="/planos" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm">Ver planos</Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
