'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase'
import Link from 'next/link'

type Stage = 'loading' | 'waiting' | 'ready' | 'error'

const MAX_ATTEMPTS = 100 // ~5 minutos a 3s por tentativa

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ref = searchParams.get('ref')

  const [stage, setStage] = useState<Stage>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const attemptsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stoppedRef = useRef(false)

  async function poll() {
    if (stoppedRef.current) return

    if (!ref) {
      setErrorMsg('Referência de pagamento não encontrada.')
      setStage('error')
      return
    }

    try {
      const { data: { session } } = await createBrowserClient().auth.getSession()
      if (!session?.access_token) {
        setErrorMsg('Sessão expirada. Faça login e verifique seu painel.')
        setStage('error')
        return
      }

      const res = await fetch(`/api/v1/orders/${ref}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      const json = await res.json()

      if (!json.success) {
        setErrorMsg(json.error ?? 'Erro ao verificar pagamento.')
        setStage('error')
        return
      }

      const { status } = json.data as { status: string }

      if (status === 'paid') {
        setStage('ready')
        router.replace(`/dashboard`)
        return
      }

      if (status === 'rejected' || status === 'expired') {
        setErrorMsg('Pagamento não foi aprovado pelo Mercado Pago.')
        setStage('error')
        return
      }

      // Ainda pendente — agenda próxima tentativa
      attemptsRef.current += 1
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setErrorMsg('Tempo limite atingido. Verifique o status no painel.')
        setStage('error')
        return
      }

      setStage('waiting')
      timerRef.current = setTimeout(poll, 3000)
    } catch {
      setErrorMsg('Erro de conexão. Verifique sua internet e tente novamente.')
      setStage('error')
    }
  }

  useEffect(() => {
    poll()
    return () => {
      stoppedRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const progress = Math.min((attemptsRef.current / MAX_ATTEMPTS) * 100, 90)

  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant p-8 text-center w-full" style={{ maxWidth: '26rem' }}>
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-red-400" style={{ fontSize: '2rem' }}>error_outline</span>
          </div>
          <h1 className="text-xl font-bold text-on-surface mb-2">Problema no pagamento</h1>
          <p className="text-on-surface-variant text-sm mb-6">{errorMsg}</p>
          <div className="flex flex-col gap-3">
            <Link
              href="/dashboard"
              className="block text-center py-3 px-6 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Ir para o painel
            </Link>
            <Link
              href="/dashboard"
              className="text-sm text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Ir para o painel
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6">
      <div className="text-center w-full" style={{ maxWidth: '26rem' }}>
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-green-500" style={{ fontSize: '2.5rem' }}>
            {stage === 'ready' ? 'check_circle' : 'pending'}
          </span>
        </div>

        <h1 className="text-2xl font-bold text-on-surface mb-2">
          {stage === 'ready' ? 'Pronto!' : 'Pagamento aprovado!'}
        </h1>

        <p className="text-on-surface-variant mb-8 text-sm leading-relaxed">
          {stage === 'loading'
            ? 'Verificando seu pagamento...'
            : stage === 'ready'
            ? 'Tudo liberado! Redirecionando para o seu painel...'
            : 'Confirmando o pagamento junto ao Mercado Pago...'}
        </p>

        <div className="w-full bg-surface-variant rounded-full h-1.5 mb-3">
          <div
            className="bg-primary h-1.5 rounded-full transition-all duration-1000"
            style={{ width: stage === 'loading' ? '5%' : `${progress}%` }}
          />
        </div>

        <p className="text-xs text-on-surface-variant">
          Não feche essa página. Você será redirecionado automaticamente.
        </p>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <span className="material-symbols-outlined text-on-surface-variant animate-spin">progress_activity</span>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
