'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import DesignEditor from '@/components/editor/DesignEditor'
import { getRenderSpec } from '@/components/templates/registry'
import type { AssetType, Candidate, Design } from '@/types'

type VisualType = Exclude<AssetType, 'jingle'>

export default function CriarPage({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = use(params)
  const searchParams = useSearchParams()
  const existingAsset = searchParams.get('asset')

  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'ready'; assetId: string; candidateId: string; design: Design }
  >({ kind: 'loading' })

  const valid = !!getRenderSpec(tipo)

  useEffect(() => {
    if (!valid) { setState({ kind: 'error', message: 'Tipo de peça inválido.' }); return }

    let cancelled = false
    ;(async () => {
      try {
        const supabase = createBrowserClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setState({ kind: 'error', message: 'Faça login para criar peças.' }); return }
        const auth = { Authorization: `Bearer ${session.access_token}` }

        // Candidato do usuário
        const candRes = await fetch('/api/v1/candidates', { headers: auth })
        const candJson = await candRes.json()
        const candidate: Candidate | undefined = candJson.success ? candJson.data?.[0] : undefined
        if (!candidate) {
          setState({ kind: 'error', message: 'Você precisa cadastrar seus dados antes de criar peças.' })
          return
        }

        // Carrega rascunho existente ou cria um novo
        if (existingAsset) {
          const res = await fetch(`/api/v1/designs/${existingAsset}`, { headers: auth })
          const json = await res.json()
          if (json.success && json.data?.design) {
            if (!cancelled) setState({ kind: 'ready', assetId: existingAsset, candidateId: candidate.id, design: json.data.design })
            return
          }
        }

        const res = await fetch('/api/v1/designs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...auth },
          body: JSON.stringify({ candidate_id: candidate.id, asset_type: tipo }),
        })
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        if (!cancelled) setState({ kind: 'ready', assetId: json.data.asset_id, candidateId: candidate.id, design: json.data.design })
      } catch (err) {
        if (!cancelled) setState({ kind: 'error', message: err instanceof Error ? err.message : 'Erro ao abrir o editor.' })
      }
    })()

    return () => { cancelled = true }
  }, [tipo, valid, existingAsset])

  if (state.kind === 'loading') {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100"><p className="text-gray-400 text-sm">Abrindo o editor…</p></div>
  }
  if (state.kind === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center space-y-3">
          <p className="text-gray-600">{state.message}</p>
          <Link href="/dashboard" className="text-blue-600 underline text-sm">Voltar ao painel</Link>
        </div>
      </div>
    )
  }

  return (
    <DesignEditor
      assetId={state.assetId}
      candidateId={state.candidateId}
      assetType={tipo as VisualType}
      initialDesign={state.design}
    />
  )
}
