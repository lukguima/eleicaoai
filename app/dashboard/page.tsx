'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { QUIET_PERIOD_MESSAGE } from '@/lib/compliance-text'
import type { AssetType, WeekPost } from '@/types'

interface Entitlement { id: string; asset_type: AssetType; status: string; asset_id: string | null }
interface AssetLite {
  id: string; asset_type: AssetType; status: string
  output_url: string | null; preview_url?: string | null
  lyrics?: string | null; created_at: string
}
interface CandidateLite {
  id: string; name: string; election_number: string; party: string
  base_photo_url: string | null; public_slug?: string | null
  week_plan?: WeekPost[] | null; jingle_lyrics_draft?: string | null
  jingle_style?: string | null
}

const PIECES: { type: AssetType; icon: string; label: string; createHref: string }[] = [
  { type: 'santinho',  icon: '🗳️', label: 'Santinho',         createHref: '/criar/santinho' },
  { type: 'colinha',   icon: '📝', label: 'Colinha de urna',  createHref: '/criar/colinha' },
  { type: 'banner',    icon: '📢', label: 'Banner',           createHref: '/criar/banner' },
  { type: 'perfurado', icon: '🏷️', label: 'Faixa perfurada',  createHref: '/criar/perfurado' },
  { type: 'adesivo',   icon: '🚗', label: 'Adesivo / praginha', createHref: '/criar/adesivo' },
  { type: 'social',    icon: '📱', label: 'Post (feed)',      createHref: '/criar/social' },
  { type: 'stories',   icon: '📲', label: 'Stories',          createHref: '/criar/stories' },
  { type: 'status',    icon: '💬', label: 'Status WhatsApp',  createHref: '/criar/status' },
  { type: 'capa',      icon: '🖼️', label: 'Capa / thumb',     createHref: '/criar/capa' },
  { type: 'jingle',    icon: '🎵', label: 'Jingle',           createHref: '/criar/jingle' },
]

export default function DashboardPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [candidate, setCandidate] = useState<CandidateLite | null>(null)
  const [entitlements, setEntitlements] = useState<Entitlement[]>([])
  const [assets, setAssets] = useState<AssetLite[]>([])
  const [quietPeriod, setQuietPeriod] = useState(false)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const load = useCallback(async (t: string) => {
    const res = await fetch('/api/v1/campaign', { headers: { Authorization: `Bearer ${t}` } })
    const json = await res.json()
    if (json.success) {
      setCandidate(json.data.candidate)
      setEntitlements(json.data.entitlements)
      setAssets(json.data.assets)
      setQuietPeriod(!!json.data.quiet_period)
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

  useEffect(() => {
    if (!token) return
    const anyProcessing = assets.some(a => a.status === 'processing')
    if (!anyProcessing) return
    const iv = setInterval(() => load(token), 5000)
    return () => clearInterval(iv)
  }, [token, assets, load])

  async function generateKit() {
    if (!token || quietPeriod) return
    setGenerating(true); setGenError(null)
    try {
      const res = await fetch('/api/v1/kit/generate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      await load(token)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Não foi possível gerar o kit.')
    } finally {
      setGenerating(false)
    }
  }

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
    const contracted = entitlements.some(e => e.asset_type === type)
    const ofType = assets.filter(a => a.asset_type === type)
    const done = ofType.find(a => a.status === 'done')
    // pending = rascunho do editor, não é geração em andamento
    const processing = done ? undefined : ofType.find(a => a.status === 'processing')
    const draft = done ? undefined : ofType.find(a => a.status === 'pending' || a.status === 'failed')
    return { contracted, done, processing, draft }
  }

  const contractedPieces = PIECES.filter(p => statusOf(p.type).contracted)
  const doneCount = contractedPieces.filter(p => statusOf(p.type).done).length
  const total = Math.max(contractedPieces.length, 1)
  const lyricsReady = !!(candidate?.jingle_lyrics_draft)
  const jingleDone = !!statusOf('jingle').done
  const weekPosts = (candidate?.week_plan ?? []).filter(p => p.day >= 1)
  const cabo = (candidate?.week_plan ?? []).find(p => p.day === 0)
  const sitePath = candidate?.public_slug ? `/c/${candidate.public_slug}` : null

  const nextAction = (() => {
    if (!candidate) return null
    if (entitlements.length === 0) return { href: '/planos', label: 'Contratar o pacote da campanha', hint: 'Libera o kit inteiro de uma vez.' }
    if (quietPeriod) return null
    const unfinishedVisual = contractedPieces.find(p => p.type !== 'jingle' && !statusOf(p.type).done && !statusOf(p.type).processing)
    if (unfinishedVisual && doneCount === 0) return { href: '#gerar', label: 'Gerar meu kit agora', hint: 'A IA monta as artes com a sua foto e o seu número.', action: 'generate' as const }
    if (statusOf('jingle').contracted && lyricsReady && !jingleDone) {
      return { href: '/criar/jingle', label: 'Aprovar a letra do jingle', hint: 'Faltam 2 minutos. A música só sai depois da sua ok.' }
    }
    if (unfinishedVisual) return { href: unfinishedVisual.createHref, label: `Ajustar ${unfinishedVisual.label.toLowerCase()}`, hint: 'O preview já está pronto. Mexa só se quiser.' }
    if (statusOf('jingle').contracted && !jingleDone && !lyricsReady) {
      return { href: '/criar/jingle', label: 'Criar o jingle', hint: 'Escolha o estilo e revise a letra.' }
    }
    return null
  })()

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400 text-sm">Carregando sua campanha…</p></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-extrabold text-gray-900">Eleição<span className="text-blue-600">AI</span></span>
          <div className="flex items-center gap-4">
            <Link href="/dados" className="text-sm text-gray-600 hover:text-gray-900">Meus dados</Link>
            <Link href="/planos" className="text-sm text-blue-600 font-semibold hover:text-blue-800">Planos</Link>
            <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-800">Sair</button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {!candidate ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
            <h1 className="text-xl font-bold text-gray-900">Bem-vindo!</h1>
            <p className="text-gray-500 text-sm">Em 8 minutos você sai com o material da campanha, dentro da lei.</p>
            <Link href="/onboarding" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm">Começar</Link>
          </div>
        ) : (
          <>
            {quietPeriod && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">{QUIET_PERIOD_MESSAGE}</div>
            )}

            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {candidate.base_photo_url
                  // eslint-disable-next-line @next/next/no-img-element
                  ? <img src={candidate.base_photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                  : <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">{candidate.name.charAt(0)}</div>}
                <div>
                  <h1 className="font-bold text-gray-900">{candidate.name}</h1>
                  <p className="text-xs text-gray-500">{candidate.party} · nº {candidate.election_number}</p>
                  <Link href="/dados" className="text-xs text-blue-600 hover:text-blue-800 underline">Editar dados</Link>
                </div>
              </div>
              {doneCount > 0 && (
                <button onClick={downloadKit} disabled={downloading}
                  className="bg-gray-900 hover:bg-black text-white text-sm font-semibold px-4 py-2.5 rounded-xl disabled:opacity-50">
                  {downloading ? 'Preparando…' : `⬇ Baixar kit (${doneCount})`}
                </button>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="font-semibold text-gray-700">Sua campanha está {Math.round((doneCount / total) * 100)}% pronta</span>
                <span className="text-gray-500">{doneCount}/{contractedPieces.length || 0} peças</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${(doneCount / total) * 100}%` }} />
              </div>
            </div>

            {nextAction && (
              <div id="gerar" className="bg-blue-600 text-white rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-blue-100 font-semibold">Próxima ação</p>
                  <p className="font-bold text-lg mt-1">{nextAction.label}</p>
                  <p className="text-sm text-blue-100 mt-1">{nextAction.hint}</p>
                  {genError && <p className="text-sm text-red-100 mt-2">{genError}</p>}
                </div>
                {'action' in nextAction && nextAction.action === 'generate' ? (
                  <button onClick={generateKit} disabled={generating}
                    className="bg-white text-blue-700 font-bold px-6 py-3 rounded-xl text-sm shrink-0 disabled:opacity-60">
                    {generating ? 'Montando o kit…' : 'Gerar agora'}
                  </button>
                ) : (
                  <Link href={nextAction.href} className="bg-white text-blue-700 font-bold px-6 py-3 rounded-xl text-sm shrink-0 text-center">
                    Ir
                  </Link>
                )}
              </div>
            )}

            {entitlements.length > 0 && doneCount === 0 && !generating && nextAction?.href !== '#gerar' && !quietPeriod && (
              <button onClick={generateKit} className="text-sm text-blue-600 underline">Gerar artes automaticamente</button>
            )}

            {sitePath && (
              <p className="text-sm text-gray-600">Mini-site público:{' '}
                <Link href={sitePath} className="text-blue-600 font-semibold underline" target="_blank">{typeof window !== 'undefined' ? window.location.origin : ''}{sitePath}</Link>
              </p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {PIECES.map(piece => {
                const { contracted, done, processing, draft } = statusOf(piece.type)
                if (!contracted && entitlements.length > 0) return null
                const label = done ? 'Pronto'
                  : processing ? 'Em produção…'
                  : draft?.status === 'failed' ? 'Falhou — pode ajustar'
                  : draft ? 'Rascunho'
                  : contracted ? 'Contratado'
                  : 'Não contratado'
                return (
                  <div key={piece.type} className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      {done?.output_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={done.output_url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 bg-gray-100" />
                        : <span className="text-2xl shrink-0">{piece.icon}</span>}
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 text-sm">{piece.label}</p>
                        <p className="text-xs text-gray-400">
                          {label}
                          {piece.type === 'jingle' && lyricsReady && !done ? ' · letra pronta para aprovar' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {!contracted && <Link href="/planos" className="text-sm font-semibold text-gray-500 underline">Contratar</Link>}
                      {contracted && processing && (
                        <div className="flex flex-col items-end gap-1">
                          <Link href={`/orders/${processing.id}`} className="text-sm font-semibold text-blue-600 underline">Acompanhar</Link>
                          {piece.type !== 'jingle' && (
                            <Link href={piece.createHref} className="text-xs text-gray-400 underline">Abrir editor</Link>
                          )}
                        </div>
                      )}
                      {contracted && done && (
                        <div className="flex flex-col items-end gap-1">
                          <Link href={`/orders/${done.id}`} className="text-sm font-semibold text-green-700 underline">Ver / Baixar</Link>
                          <Link
                            href={piece.type === 'jingle' ? `/orders/${done.id}` : `${piece.createHref}?asset=${done.id}`}
                            className="text-xs text-gray-400 underline"
                          >
                            Ajustar
                          </Link>
                        </div>
                      )}
                      {contracted && !done && !processing && (
                        <Link href={piece.createHref} className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg">
                          {piece.type === 'jingle' && lyricsReady ? 'Aprovar letra' : draft ? 'Continuar' : 'Criar'}
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {weekPosts.length > 0 && (
              <section className="space-y-3">
                <h2 className="font-bold text-gray-900">O que postar nesta semana</h2>
                <div className="space-y-3">
                  {weekPosts.map(post => (
                    <div key={post.day} className="bg-white rounded-2xl border border-gray-200 p-5">
                      <p className="text-xs font-semibold text-blue-600 uppercase">Dia {post.day} · {post.theme} · {post.format === 'stories' ? 'Stories' : 'Feed'}</p>
                      <p className="text-sm text-gray-800 mt-2 whitespace-pre-wrap">{post.caption}</p>
                      {post.reel_script && (
                        <p className="text-xs text-gray-500 mt-2"><span className="font-semibold">Roteiro de Reels:</span> {post.reel_script}</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {cabo?.caption && (
              <section className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
                <h2 className="font-bold text-gray-900">Texto para o cabo eleitoral</h2>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{cabo.caption}</p>
              </section>
            )}

            {entitlements.length === 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center space-y-2">
                <p className="text-sm text-blue-800 font-medium">Você ainda não contratou o pacote.</p>
                <Link href="/planos" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm">Ver o pacote</Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
