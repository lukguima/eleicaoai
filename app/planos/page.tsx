'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { formatPrice } from '@/lib/pricing'
import type { Candidate } from '@/types'

interface Product { type: string; label: string; description: string; price: number }

const PACKAGE_INCLUDES = [
  { icon: '🗳️', label: 'Santinho' },
  { icon: '📢', label: 'Banner' },
  { icon: '🏷️', label: 'Faixa perfurada' },
  { icon: '📱', label: 'Post para redes' },
  { icon: '🎵', label: 'Jingle' },
]

export default function PlanosPage() {
  const router = useRouter()
  const [candidateId, setCandidateId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const supabase = createBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { router.replace('/login'); return }
        const auth = { Authorization: `Bearer ${session.access_token}` }

        const candRes = await fetch('/api/v1/candidates', { headers: auth })
        const candJson = await candRes.json()
        const c: Candidate | undefined = candJson.success ? candJson.data?.[0] : undefined
        if (!c) { router.replace('/onboarding'); return }
        setCandidateId(c.id)

        const prodRes = await fetch('/api/v1/products')
        const prodJson = await prodRes.json()
        if (prodJson.success) setProducts(prodJson.data as Product[])
      } catch {
        setError('Erro ao carregar os planos.')
      } finally {
        setLoading(false)
      }
    })()
  }, [router])

  async function buy(items: string[], key: string) {
    if (!candidateId) return
    setBuying(key); setError(null)
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession()
      if (!session) throw new Error('Sessão expirada.')
      const res = await fetch('/api/v1/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ candidate_id: candidateId, items }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      if (json.data.skip_payment) router.push('/dashboard')
      else window.location.href = json.data.payment_url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao processar o pedido.')
      setBuying(null)
    }
  }

  const pacote = products.find(p => p.type === 'pacote')
  const avulsos = products.filter(p => p.type !== 'pacote')

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><p className="text-gray-400 text-sm">Carregando planos…</p></div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-xl font-extrabold text-gray-900">Eleição<span className="text-blue-600">AI</span></span>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Painel</Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Escolha seu plano</h1>
          <p className="text-gray-500 mt-2">Contrate o pacote completo ou peças avulsas. Você cria cada material no seu ritmo.</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        {/* Pacote completo */}
        {pacote && (
          <div className="bg-white rounded-2xl border-2 border-blue-600 p-8 relative overflow-hidden">
            <span className="absolute top-4 right-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">MAIS ESCOLHIDO</span>
            <h2 className="text-2xl font-bold text-gray-900">{pacote.label}</h2>
            <p className="text-gray-500 text-sm mt-1">{pacote.description}</p>
            <ul className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5">
              {PACKAGE_INCLUDES.map(i => (
                <li key={i.label} className="flex flex-col items-center gap-1 text-center bg-blue-50 rounded-xl py-3">
                  <span className="text-2xl">{i.icon}</span>
                  <span className="text-xs font-semibold text-gray-700">{i.label}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
              <div>
                <p className="text-3xl font-extrabold text-gray-900">{formatPrice(pacote.price)}</p>
                <p className="text-xs text-gray-400">Pagamento único · sem mensalidade</p>
              </div>
              <button onClick={() => buy(['pacote'], 'pacote')} disabled={!!buying}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold px-8 py-4 rounded-xl text-base transition-colors">
                {buying === 'pacote' ? 'Processando…' : 'Contratar pacote'}
              </button>
            </div>
          </div>
        )}

        {/* Avulsos */}
        <div>
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Ou compre avulso</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {avulsos.map(p => (
              <div key={p.type} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="font-bold text-gray-900 text-sm">{p.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{p.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-extrabold text-gray-900">{formatPrice(p.price)}</p>
                  <button onClick={() => buy([p.type], p.type)} disabled={!!buying}
                    className="mt-1 text-sm text-blue-600 hover:text-blue-800 font-semibold underline disabled:text-gray-400">
                    {buying === p.type ? '...' : 'Comprar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          Todas as peças saem com o rótulo “Conteúdo fabricado com IA” exigido pela Res. TSE nº 23.732/2024.
        </p>
      </main>
    </div>
  )
}
