'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase'
import VisualIdentityPreview from '@/components/VisualIdentityPreview'
import type { Candidate } from '@/types'

export default function VisualIdentityPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [selected, setSelected] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const supabase = createBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setError('Não autenticado.'); return }

        const res = await fetch('/api/v1/candidates', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)

        setCandidates(json.data ?? [])
        if (json.data?.length) setSelected(json.data[0])
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Erro ao carregar candidaturas.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm">
        {error}
      </div>
    )
  }

  if (!candidates.length) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg font-medium">Nenhuma candidatura cadastrada.</p>
        <p className="text-sm mt-1">
          Crie uma candidatura no{' '}
          <a href="/dashboard" className="text-blue-600 underline">
            painel principal
          </a>{' '}
          para visualizar sua identidade visual.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Identidade Visual</h1>
        <p className="text-sm text-gray-500 mt-1">
          Pré-visualização das cores, tipografia e formatos de peças da campanha.
        </p>
      </div>

      {/* Seletor de candidato */}
      {candidates.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-colors ${
                selected?.id === c.id
                  ? 'border-blue-600 bg-blue-600 text-white'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-blue-400'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900">{selected.name}</h2>
              <p className="text-sm text-gray-500">
                {selected.party} · Número {selected.election_number}
              </p>
            </div>
            <a
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Editar candidatura →
            </a>
          </div>

          <VisualIdentityPreview candidate={selected} />
        </div>
      )}

      {/* Nota legal */}
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
        <p className="text-xs text-amber-800 leading-relaxed">
          <strong>Conformidade TSE — Resolução nº 23.732/2024:</strong> Todas as imagens
          exportadas recebem automaticamente o rótulo{' '}
          <em>"Conteúdo fabricado com IA"</em> e o CNPJ da campanha (Art. 9º-B §1 II).
          Áudios incluem declaração de conformidade no início da faixa (Art. 9º-B §1 I).
          Logos e vinhetas são isentos (Art. 9º-B §2 II).
        </p>
      </div>
    </div>
  )
}
