'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createBrowserClient } from '@/lib/supabase'
import { JINGLE_STYLES } from '@/lib/office'
import type { Asset, JingleStyle } from '@/types'

type AssetWithMedia = Asset & { media_url?: string | null }

type Status = 'pending' | 'processing' | 'done' | 'failed'

const STATUS_CONFIG: Record<Status, { label: string; color: string; icon: string }> = {
  pending:    { label: 'Aguardando',    color: 'text-gray-500 bg-gray-100',   icon: '⏳' },
  processing: { label: 'Gerando...',    color: 'text-blue-700 bg-blue-100',   icon: '⚙️' },
  done:       { label: 'Pronto!',       color: 'text-green-700 bg-green-100', icon: '✅' },
  failed:     { label: 'Falhou',        color: 'text-red-700 bg-red-100',     icon: '❌' },
}

export default function OrderResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: assetId } = use(params)
  const [asset, setAsset] = useState<AssetWithMedia | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [editingLyrics, setEditingLyrics] = useState(false)
  const [editedLyrics, setEditedLyrics] = useState('')
  const [style, setStyle] = useState<JingleStyle | null>(null)
  const [regenLoading, setRegenLoading] = useState(false)
  const [lyricsLoading, setLyricsLoading] = useState(false)
  const [regenError, setRegenError] = useState<string | null>(null)

  // Obtém token da sessão
  useEffect(() => {
    createBrowserClient()
      .auth.getSession()
      .then(({ data }) => { if (data.session) setToken(data.session.access_token) })
  }, [])

  const fetchAsset = useCallback(async (t: string) => {
    const res = await fetch(`/api/v1/assets?candidate_id=any`, {
      headers: { Authorization: `Bearer ${t}` },
    })
    const json = await res.json()
    if (!json.success) return

    const found = (json.data as Asset[]).find(a => a.id === assetId)
    if (!found) { setNotFound(true); return }
    setAsset(found)
  }, [assetId])

  // Busca direta por asset (mais eficiente que listar todos)
  const fetchAssetDirect = useCallback(async (t: string) => {
    const res = await fetch(`/api/v1/assets/${assetId}`, {
      headers: { Authorization: `Bearer ${t}` },
    })
    if (res.status === 404) { setNotFound(true); return }
    const json = await res.json()
    if (json.success) setAsset(json.data)
  }, [assetId])

  useEffect(() => {
    if (!token) return
    fetchAssetDirect(token)
  }, [token, fetchAssetDirect])

  // Polling: continua até ter status final (cobre asset null e processing)
  useEffect(() => {
    if (!token) return
    if (asset?.status === 'done' || asset?.status === 'failed') return

    const interval = setInterval(() => fetchAssetDirect(token), 5000)
    return () => clearInterval(interval)
  }, [token, asset, fetchAssetDirect])

  function styleFromAsset(a: Asset): JingleStyle {
    const raw = (a.metadata as Record<string, unknown> | null)?.style
    return JINGLE_STYLES.some(s => s.value === raw) ? raw as JingleStyle : 'Sertanejo Universitário'
  }

  const selectedStyle = style ?? (asset ? styleFromAsset(asset) : 'Sertanejo Universitário')

  async function handleRegen() {
    if (!token || !asset) return
    const lyrics = (editingLyrics ? editedLyrics : asset.lyrics ?? '').trim()
    if (lyrics.length < 10) return
    setRegenLoading(true)
    setRegenError(null)
    try {
      const res = await fetch(`/api/v1/jingle/music`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidate_id: asset.candidate_id, asset_id: assetId, style: selectedStyle, lyrics }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setEditingLyrics(false)
      setAsset(prev => prev ? { ...prev, status: 'processing', output_url: undefined, media_url: null } : prev)
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : 'Erro ao regenerar.')
    } finally {
      setRegenLoading(false)
    }
  }

  async function handleNewLyrics() {
    if (!token || !asset) return
    setLyricsLoading(true)
    setRegenError(null)
    try {
      const current = (editingLyrics ? editedLyrics : asset.lyrics ?? '').trim()
      const res = await fetch('/api/v1/jingle/lyrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          candidate_id: asset.candidate_id,
          style: selectedStyle,
          extra: `Reescreva no ritmo de ${selectedStyle}: letra nova, refrão mais forte, mais fácil de cantar, mesmo nome e número.`,
          current_lyrics: current,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setEditedLyrics(json.data.lyrics)
      setEditingLyrics(true)
    } catch (err) {
      setRegenError(err instanceof Error ? err.message : 'Erro ao criar nova letra.')
    } finally {
      setLyricsLoading(false)
    }
  }

  const status = (asset?.status ?? 'processing') as Status
  const config = STATUS_CONFIG[status]
  const isJingle = asset?.asset_type === 'jingle'

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-gray-500">Pedido não encontrado.</p>
          <Link href="/dashboard" className="text-blue-600 underline text-sm">Voltar ao dashboard</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-extrabold text-gray-900">
            Eleição<span className="text-blue-600">AI</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">

        {/* Status card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-4">
          <div className="text-5xl">{config.icon}</div>
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${config.color}`}>
              {config.label}
            </span>
          </div>

          {status === 'processing' && (
            <div className="space-y-2">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-2 bg-blue-500 rounded-full animate-pulse w-3/4" />
              </div>
              <p className="text-sm text-gray-500">
                A IA está trabalhando no seu material. Esta página atualiza automaticamente.
              </p>
            </div>
          )}

          {status === 'done' && asset && (
            <p className="text-gray-600 text-sm">
              Seu {isJingle ? 'jingle' : 'material visual'} está pronto para download.
            </p>
          )}

          {status === 'failed' && (
            <div className="space-y-2">
              <p className="text-sm text-red-600">{asset?.error_message ?? 'Ocorreu um erro durante a geração.'}</p>
              <Link href="/dashboard" className="inline-block text-sm text-blue-600 underline">
                Tentar novamente
              </Link>
            </div>
          )}
        </div>

        {/* Preview + Download (só quando done) */}
        {status === 'done' && asset && token && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            {isJingle ? (
              <div className="p-8 space-y-4">
                <h2 className="font-bold text-gray-900">🎵 Seu jingle está pronto</h2>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ritmo musical</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {JINGLE_STYLES.map(s => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => setStyle(s.value)}
                        disabled={regenLoading || lyricsLoading}
                        className={`flex items-start gap-2 p-3 rounded-xl text-left border-2 transition-all disabled:opacity-50 ${
                          selectedStyle === s.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <span className="text-xl shrink-0">{s.emoji}</span>
                        <div>
                          <p className={`text-sm font-bold ${selectedStyle === s.value ? 'text-blue-700' : 'text-gray-900'}`}>{s.value}</p>
                          <p className="text-xs text-gray-500">{s.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400">
                    Troque o ritmo e regenere o áudio. Se quiser, peça também uma letra nova no estilo escolhido.
                  </p>
                </div>
                {asset.lyrics && (
                  <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Letra gerada</p>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={handleNewLyrics}
                          disabled={lyricsLoading || regenLoading}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline disabled:opacity-50"
                        >
                          {lyricsLoading ? 'Criando letra…' : '✨ Nova letra com IA'}
                        </button>
                        {!editingLyrics && (
                          <button
                            type="button"
                            onClick={() => { setEditedLyrics(asset.lyrics ?? ''); setEditingLyrics(true); setRegenError(null) }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
                          >
                            ✏️ Editar letra
                          </button>
                        )}
                      </div>
                    </div>

                    {editingLyrics ? (
                      <div className="space-y-3">
                        <textarea
                          value={editedLyrics}
                          onChange={e => setEditedLyrics(e.target.value)}
                          rows={14}
                          className="w-full text-sm text-gray-700 leading-relaxed font-mono border border-gray-300 rounded-lg p-3 resize-y focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
                        />
                        {regenError && (
                          <p className="text-xs text-red-600">{regenError}</p>
                        )}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            onClick={handleNewLyrics}
                            disabled={lyricsLoading || regenLoading}
                            className="px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                          >
                            {lyricsLoading ? 'Criando…' : '✨ Pedir outra letra à IA'}
                          </button>
                          <button
                            type="button"
                            onClick={handleRegen}
                            disabled={regenLoading || lyricsLoading || editedLyrics.trim().length < 10}
                            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
                          >
                            {regenLoading ? 'Gerando...' : '🎵 Regenerar áudio com esta letra'}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingLyrics(false); setRegenError(null) }}
                            className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{asset.lyrics}</pre>
                        {regenError && (
                          <p className="text-xs text-red-600">{regenError}</p>
                        )}
                        <button
                          type="button"
                          onClick={handleRegen}
                          disabled={regenLoading || lyricsLoading || !(asset.lyrics ?? '').trim()}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
                        >
                          {regenLoading ? 'Gerando...' : '🎵 Regenerar áudio com esta letra'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {asset.media_url ? (
                  <audio controls className="w-full" src={asset.media_url}>
                    Seu navegador não suporta áudio.
                  </audio>
                ) : (
                  <p className="text-sm text-gray-400">Preparando o áudio…</p>
                )}
                {Boolean((asset.metadata as Record<string, unknown> | null)?.include_ai_intro) ? (
                  <p className="text-xs text-gray-400">
                    O áudio começa com o aviso de conteúdo fabricado com IA (EleiçãoAI · Suno).
                  </p>
                ) : (
                  <p className="text-xs text-gray-400">
                    Áudio gerado a partir da letra, sem aviso falado no início.
                  </p>
                )}
              </div>
            ) : (
              <div>
                {(asset.media_url ?? asset.output_url) && (
                  <div className="relative bg-gray-100 flex items-center justify-center" style={{ minHeight: 300 }}>
                    <Image
                      src={asset.media_url ?? asset.output_url!}
                      alt="Material gerado"
                      width={600}
                      height={400}
                      className="object-contain max-h-96 w-auto"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            )}

            <div className="p-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Download com rótulo TSE incluído
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Conteúdo fabricado com IA (EleiçãoAI · template) + CNPJ da campanha — obrigatório pela Res. 23.755/2026
                </p>
              </div>
              <a
                href={`/api/v1/assets/export/${asset.id}`}
                download
                onClick={async e => {
                  // Passa o token via fetch para não expor na URL
                  e.preventDefault()
                  const res = await fetch(`/api/v1/assets/export/${asset.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  })
                  if (!res.ok) return
                  const blob = await res.blob()
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `eleicaoai_${asset.asset_type}.${isJingle ? 'mp3' : 'jpg'}`
                  a.click()
                  URL.revokeObjectURL(url)
                }}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors"
              >
                ⬇ Baixar arquivo
              </a>
            </div>
          </div>
        )}

        {/* Novo pedido */}
        {status === 'done' && (
          <div className="text-center">
            <Link
              href="/dashboard"
              className="inline-block border border-gray-300 hover:border-blue-400 hover:bg-blue-50 text-gray-700 font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Criar outro material
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
