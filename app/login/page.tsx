'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'

type Mode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const supabase = createBrowserClient()

    try {
      if (mode === 'signup') {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        })
        if (signUpError) throw signUpError
        setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
        router.replace('/dashboard')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro desconhecido'
      if (msg.includes('Invalid login credentials')) {
        setError('E-mail ou senha incorretos.')
      } else if (msg.includes('Email not confirmed')) {
        setError('Confirme seu e-mail antes de entrar.')
      } else if (msg.includes('User already registered')) {
        setError('Esse e-mail já possui uma conta. Faça login.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-primary p-12 text-on-primary">
        <Link href="/" className="font-black text-2xl">
          Eleição<span style={{ color: '#ffdf9e' }}>AI</span>
        </Link>
        <div>
          <blockquote className="text-2xl font-bold leading-snug mb-4">
            "Material eleitoral profissional gerado em minutos, não em dias."
          </blockquote>
          <div className="flex gap-4 text-sm opacity-75">
            <span>✅ Conforme TSE Res. 23.732/2024</span>
            <span>✅ Entrega em até 2 min</span>
          </div>
        </div>
        <p className="text-sm opacity-50">© 2025 EleiçãoAI. Todos os direitos reservados.</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full" style={{ maxWidth: '26rem' }}>

          <Link href="/" className="lg:hidden font-black text-xl text-primary block mb-8">
            Eleição<span className="text-secondary">AI</span>
          </Link>

          <h1 className="text-2xl font-bold text-on-surface mb-1">
            {mode === 'login' ? 'Entrar na conta' : 'Criar conta grátis'}
          </h1>
          <p className="text-sm text-on-surface-variant mb-8">
            {mode === 'login'
              ? 'Acesse seu painel e seus materiais.'
              : 'Comece a gerar materiais eleitorais hoje.'}
          </p>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">E-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl border border-outline text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5">Senha</label>
              <input
                type="password"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-outline text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              />
              {mode === 'signup' && (
                <p className="text-xs text-on-surface-variant mt-1">Mínimo 6 caracteres.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-on-primary font-bold rounded-xl text-sm hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {loading
                ? 'Aguarde...'
                : mode === 'login'
                ? 'Entrar'
                : 'Criar conta'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-on-surface-variant">
            {mode === 'login' ? 'Não tem conta?' : 'Já tem conta?'}{' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); setSuccess('') }}
              className="text-primary font-semibold hover:underline"
            >
              {mode === 'login' ? 'Criar agora' : 'Fazer login'}
            </button>
          </p>

          <p className="mt-4 text-center text-xs text-on-surface-variant">
            Ao criar uma conta você concorda com os{' '}
            <Link href="#" className="hover:underline">Termos de Uso</Link>
            {' '}e a{' '}
            <Link href="#" className="hover:underline">Política de Privacidade</Link>.
          </p>
        </div>
      </div>
    </div>
  )
}
