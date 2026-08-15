'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import type { JingleStyle } from '@/types'

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
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [party, setParty] = useState('')
  const [syncCadastro, setSyncCadastro] = useState(true)

  const [step, setStep] = useState<1 | 2>(1)
  const [style, setStyle] = useState<JingleStyle>('Sertanejo Universitário')
  const [extra, setExtra] = useState('')
  const [lyrics, setLyrics] = useState('')
  const [genLyrics, setGenLyrics] = useState(false)
  const [genMusic, setGenMusic] = useState(false)
  const [includeAiIntro, setIncludeAiIntro] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const supabase = createBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setLoadErr('Faça login para criar o jingle.'); return }
        const res = await fetch('/api/v1/campaign', { headers: { Authorization: `Bearer ${session.access_token}` } })
        const json = await res.json()
        const c = json.success ? json.data?.candidate : undefined
        if (!c) { setLoadErr('Cadastre seus dados antes de criar o jingle.'); return }
        setCandidateId(c.id)
        setName(c.name || '')
        setNumber(c.election_number || '')
        setParty(c.party || '')
        if (c.jingle_style) setStyle(c.jingle_style as JingleStyle)
        if (c.jingle_lyrics_draft) {
          setLyrics(c.jingle_lyrics_draft)
          setStep(2)
        }
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
      if (syncCadastro) {
        const up = await fetch(`/api/v1/candidates/${candidateId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({ name, election_number: number, party }),
        })
        const upJson = await up.json()
        if (!upJson.success) throw new Error(upJson.error)
      }
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
        body: JSON.stringify({ candidate_id: candidateId, style, lyrics, include_ai_intro: includeAiIntro }),
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
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-800">Seus dados nesta criação</p>
                <Link href="/dados" className="text-xs text-blue-600 underline">Editar cadastro completo</Link>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                <input value={name} maxLength={150} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Número</label>
                  <input value={number} maxLength={6} onChange={e => setNumber(e.target.value.replace(/\D/g, ''))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Partido</label>
                  <input value={party} maxLength={100} onChange={e => setParty(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
              <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={syncCadastro} onChange={e => setSyncCadastro(e.target.checked)} />
                <span>Atualizar o cadastro com estes dados ao gerar a letra.</span>
              </label>
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

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Ritmo musical</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {STYLES.map(s => (
                  <button key={s.value} type="button" onClick={() => setStyle(s.value)}
                    className={`flex items-start gap-2 p-3 rounded-xl text-left border-2 transition-all ${style === s.value ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                    <span className="text-xl shrink-0">{s.emoji}</span>
                    <div>
                      <p className={`text-sm font-bold ${style === s.value ? 'text-blue-700' : 'text-gray-900'}`}>{s.value}</p>
                      <p className="text-xs text-gray-500">{s.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <textarea value={lyrics} onChange={e => setLyrics(e.target.value)} rows={16}
              className="w-full text-sm text-gray-800 leading-relaxed font-mono border border-gray-300 rounded-xl p-4 resize-y focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white" />

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Aviso de IA no áudio</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setIncludeAiIntro(true)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border-2 ${includeAiIntro ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                  Com aviso
                </button>
                <button type="button" onClick={() => setIncludeAiIntro(false)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold border-2 ${!includeAiIntro ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                  Sem aviso
                </button>
              </div>
            </div>

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
              {includeAiIntro
                ? 'O áudio começa com o aviso de conteúdo fabricado com IA (EleiçãoAI · Suno). A Resolução TSE nº 23.755/2026 pede esse rótulo em conteúdo sintético. Não usamos clone de voz de terceiros.'
                : 'A música será gerada só com a letra, sem o aviso falado no início. Não usamos clone de voz de terceiros.'}
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
