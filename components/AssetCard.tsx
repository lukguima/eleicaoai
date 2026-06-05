'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import type { Asset } from '@/types'

const ASSET_LABELS: Record<string, string> = {
  santinho:  'Santinho',
  banner:    'Banner',
  perfurado: 'Perfurado',
  social:    'Redes Sociais',
  jingle:    'Jingle',
}

const STATUS_COLORS: Record<string, string> = {
  pending:    'text-on-surface-variant',
  processing: 'text-tertiary-fixed-dim',
  done:       'text-secondary',
  failed:     'text-error',
}

const STATUS_LABELS: Record<string, string> = {
  pending:    'Na fila',
  processing: 'Gerando...',
  done:       'Pronto',
  failed:     'Falhou',
}

interface Props {
  asset: Asset
  onRetry?: (assetId: string) => void
}

export default function AssetCard({ asset, onRetry }: Props) {
  const [retrying, setRetrying]       = useState(false)
  const [retryError, setRetryError]   = useState<string | null>(null)
  const [localStatus, setLocalStatus] = useState(asset.status)

  const isJingle = asset.asset_type === 'jingle'
  const isDone   = localStatus === 'done'
  const isFailed = localStatus === 'failed'
  const step     = (asset.metadata as Record<string, string>)?.step

  const [isStuck, setIsStuck] = useState(false)
  useEffect(() => {
    if (localStatus !== 'processing') { setIsStuck(false); return }
    const elapsed = Date.now() - new Date(asset.created_at).getTime()
    if (elapsed > 3 * 60 * 1000) { setIsStuck(true); return }
    const remaining = 3 * 60 * 1000 - elapsed
    const t = setTimeout(() => setIsStuck(true), remaining)
    return () => clearTimeout(t)
  }, [localStatus, asset.created_at])

  async function handleRetry() {
    setRetrying(true)
    setRetryError(null)
    try {
      const { data: { session } } = await createBrowserClient().auth.getSession()
      if (!session) throw new Error('Sessão expirada.')

      const res = await fetch(`/api/v1/assets/${asset.id}/retry`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error ?? 'Erro ao reprocessar.')

      setLocalStatus('processing')
      onRetry?.(asset.id)
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : 'Erro ao tentar novamente.')
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl hover:shadow-lg transition-all group">
      <div className="flex items-center justify-between mb-sm">
        <span className="font-label-lg text-on-surface">{ASSET_LABELS[asset.asset_type]}</span>
        <span className={`font-label-sm font-bold ${STATUS_COLORS[localStatus]}`}>
          {STATUS_LABELS[localStatus]}
        </span>
      </div>

      {/* Preview de imagem */}
      {!isJingle && isDone && asset.output_url && (
        <div className="aspect-square bg-surface-container rounded-lg mb-md overflow-hidden">
          <img
            src={asset.output_url}
            alt={`${ASSET_LABELS[asset.asset_type]} gerado`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        </div>
      )}

      {/* Placeholder para processamento ou jingle (quando não tem preview) */}
      {(!isDone || (isJingle && !asset.preview_url)) && (
        <div className="aspect-square bg-surface-container rounded-lg mb-md overflow-hidden flex items-center justify-center relative">
          {isJingle ? (
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant" data-icon="music_note">music_note</span>
          ) : (
            <span className="material-symbols-outlined text-[48px] text-on-surface-variant" data-icon="image">image</span>
          )}
          {localStatus === 'processing' && (
            <div className="absolute inset-0 flex items-center justify-center bg-surface/50">
              <span className="bg-surface/80 px-md py-xs rounded-full font-label-sm text-on-surface">Processando IA</span>
            </div>
          )}
        </div>
      )}

      {/* Progresso do jingle em etapas */}
      {isJingle && localStatus === 'processing' && (
        <div className="text-sm text-on-surface-variant mb-sm">
          {step === 'generating_lyrics' && '📝 Criando letra...'}
          {step === 'generating_music'  && '🎵 Compondo música...'}
        </div>
      )}

      {/* Letra gerada */}
      {isJingle && asset.lyrics && (
        <details className="text-sm mb-sm">
          <summary className="cursor-pointer text-secondary hover:underline text-label-sm">
            Ver letra gerada
          </summary>
          <pre className="mt-2 text-xs text-on-surface bg-surface-container-low rounded p-3 whitespace-pre-wrap font-sans">
            {asset.lyrics}
          </pre>
        </details>
      )}

      {/* Player de áudio */}
      {isJingle && isDone && asset.preview_url && (
        <audio controls className="w-full mb-sm">
          <source src={asset.preview_url} type="audio/mpeg" />
        </audio>
      )}

      {/* Retry para travado em processing */}
      {isStuck && !isFailed && (
        <div className="mb-sm">
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full flex items-center justify-center gap-2 border border-outline-variant text-on-surface-variant hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed font-label-sm py-1.5 rounded-xl transition-all text-xs"
          >
            {retrying ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Reprocessando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">refresh</span>
                Está demorando? Tentar novamente
              </>
            )}
          </button>
        </div>
      )}

      {/* Erro + Retry */}
      {isFailed && (
        <div className="space-y-sm mb-sm">
          {asset.error_message && (
            <p className="text-xs text-error leading-snug">{asset.error_message}</p>
          )}
          {retryError && (
            <p className="text-xs text-error leading-snug">{retryError}</p>
          )}
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full flex items-center justify-center gap-2 border border-error text-error hover:bg-error hover:text-on-error disabled:opacity-50 disabled:cursor-not-allowed font-label-lg py-2 rounded-xl transition-all text-sm"
          >
            {retrying ? (
              <>
                <span className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                Reprocessando...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-base">refresh</span>
                Tentar novamente
              </>
            )}
          </button>
        </div>
      )}

      {/* Botão de download */}
      {isDone && (
        <Link
          href={`/orders/${asset.id}`}
          className="block text-center text-label-lg bg-primary hover:opacity-90 text-on-primary py-2 rounded-xl transition-all mb-sm"
        >
          Ver e baixar →
        </Link>
      )}

      <p className="text-label-sm text-outline-variant">
        {new Date(asset.created_at).toLocaleString('pt-BR')}
      </p>
    </div>
  )
}
