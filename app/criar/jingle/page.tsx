'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import type { Candidate, JingleStyle } from '@/types'

const STYLES: { value: JingleStyle; emoji: string; desc: string }[] = [
  { value: 'Sertanejo Universitário', emoji: '🤠', desc: 'Batida moderna, voz emotiva — forte no interior e agro' },
  { value: 'Forró', emoji: '🪗', desc: 'Animado e dançante, forte no Nordeste' },
  { value: 'Funk Gospel', emoji: '🎤', desc: 'Energia alta, letras positivas' },
  { value: 'MPB', emoji: '🎸', desc: 'Sofisticado e cultural, público urbano' },
  { value: 'Pagode', emoji: '🥁', desc: 'Descontraído e popular, forte no Sudeste' },
  { value: 'Rap Político', emoji: '✊', desc: 'Direto e combativo, conecta com jovens' },
]

export default function CriarJinglePage() {
  const router = useRouter()
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)

  const [step, setStep] = useState<1 | 2>(1)
  const [style, setStyle] = useState<JingleStyle>('Sertanejo Universitário')
  const [extra, setExtra] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [genLyrics, setGenLyrics] = useState(false)
  const [genMusic, setGenMusic] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const supabase = createBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setLoadErr('Faça login para criar o jingle.'); return }
        const res = await fetch('/api/v1/candidates', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const json = await res.json()
        const c: Candidate | undefined = json.success ? json.data?.[0] : undefined
        if (!c) { setLoadErr('Cadastre seus dados antes de criar o jingle.'); return }
        setCandidateId(c.id)
      } catch {
        setLoadErr('Erro ao carregar seus dados.')
      }
    })()
  }, [])

  async function token(): Promise<string> {
    const { data: { session } } = await createBrowserClient().auth.getSession()
    if (!session) throw new Error('Sessão expirada.')
    return session.access_token
  }

  async function handleGenerateLyrics() {
    if (!candidateId) return
    setGenLyrics(true); setError(null)
    try {
      const t = await token()
      const res = await fetch('/api/v1/jingle/lyrics', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ candidate_id: candidateId, style, extra }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setLyrics(json.data.lyrics)
      setStep(2)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar letra.')
    } finally {
      setGenLyrics(false)
    }
  }

  async function handleGenerateMusic() {
    if (!candidateId || lyrics.trim().length < 10) return
    setGenMusic(true); setError(null)
    try {
      const t = await token()
      const res = await fetch('/api/v1/jingle/music', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ candidate_id: candidateId, style, lyrics }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      router.push(`/orders/${json.data.asset_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar música.')
      setGenMusic(false)
    }
  }

  if (loadErr) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <p className="text-gray-600">{loadErr}</p>
          <Link href="/dashboard" className="text-blue-600 underline text-sm">Voltar ao painel</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Painel</Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-medium text-gray-900">🎵 Jingle de campanha</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Passos */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={step === 1 ? 'text-blue-600' : 'text-gray-400'}>1. Estilo</span>
          <span className="text-gray-300">→</span>
          <span className={step === 2 ? 'text-blue-600' : 'text-gray-400'}>2. Letra</span>
          <span className="text-gray-300">→</span>
          <span className="text-gray-400">3. Música</span>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Escolha o estilo musical</h1>
              <p className="text-gray-500 text-sm mt-1">A IA cria a letra e você poderá editá-la antes de gerar a música.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {STYLES.map(s => (
                <button key={s.value} type="button" onClick={() => setStyle(s.value)}
                  className={`flex items-start gap-3 p-4 rounded-xl text-left border-2 transition-all ${style === s.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                  <span className="text-2xl shrink-0">{s.emoji}</span>
                  <div>
                    <p className={`text-sm font-bold ${style === s.value ? 'text-blue-700' : 'text-gray-900'}`}>{s.value}</p>
                    <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instruções extras <span className="text-gray-400 font-normal">(opcional)</span></label>
              <input value={extra} onChange={e => setExtra(e.target.value)} maxLength={200}
                placeholder="Ex.: citar saúde e educação; refrão bem animado"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <button onClick={handleGenerateLyrics} disabled={genLyrics || !candidateId}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-4 rounded-xl text-base transition-colors">
              {genLyrics ? 'Criando a letra…' : 'Criar letra com IA'}
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Revise a letra</h1>
                <p className="text-gray-500 text-sm mt-1">Edite à vontade. A música só é gerada quando você aprovar.</p>
              </div>
              <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-gray-800 underline">← Trocar estilo</button>
            </div>

            <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} rows={16}
              className="w-full text-sm text-gray-800 leading-relaxed font-mono border border-gray-300 rounded-xl p-4 resize-y focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" />

            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleGenerateLyrics} disabled={genLyrics}
                className="px-4 py-3 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">
                {genLyrics ? 'Gerando…' : '↻ Gerar outra letra'}
              </button>
              <button onClick={handleGenerateMusic} disabled={genMusic || lyrics.trim().length < 10}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                {genMusic ? 'Enviando para geração…' : '🎵 Gerar música com esta letra'}
              </button>
            </div>

            <p className="text-xs text-gray-400">
              O áudio final começa com o aviso “Este conteúdo foi fabricado utilizando inteligência artificial”, obrigatório pela Resolução TSE nº 23.732/2024.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
