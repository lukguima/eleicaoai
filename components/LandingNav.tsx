'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-outline-variant shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-headline font-extrabold text-xl text-primary tracking-tight">
          Eleição<span className="text-secondary">AI</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          <a href="#como-funciona" className="text-on-surface-variant text-sm font-medium hover:text-primary transition-colors">Como funciona</a>
          <a href="#servicos" className="text-on-surface-variant text-sm font-medium hover:text-primary transition-colors">Serviços</a>
          <a href="#depoimentos" className="text-on-surface-variant text-sm font-medium hover:text-primary transition-colors">Depoimentos</a>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors px-2 py-1.5">
            Entrar
          </Link>
          <Link
            href="/order/santinho"
            className="bg-primary text-on-primary text-sm font-semibold px-5 py-2.5 rounded-lg hover:opacity-90 transition-all shadow-sm"
          >
            Criar material →
          </Link>
        </div>

        <button
          className="md:hidden p-2 text-on-surface rounded-lg hover:bg-surface-container transition-colors"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          )}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-outline-variant bg-white">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-1">
            <a href="#como-funciona" className="text-sm text-on-surface py-2.5 border-b border-outline-variant/40" onClick={() => setOpen(false)}>Como funciona</a>
            <a href="#servicos" className="text-sm text-on-surface py-2.5 border-b border-outline-variant/40" onClick={() => setOpen(false)}>Serviços</a>
            <a href="#depoimentos" className="text-sm text-on-surface py-2.5 border-b border-outline-variant/40" onClick={() => setOpen(false)}>Depoimentos</a>
            <Link href="/login" className="text-sm text-on-surface py-2.5 border-b border-outline-variant/40">Entrar</Link>
            <Link
              href="/order/santinho"
              className="mt-2 bg-primary text-on-primary text-sm font-semibold px-5 py-3 rounded-lg text-center"
              onClick={() => setOpen(false)}
            >
              Criar material agora →
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
