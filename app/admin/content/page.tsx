'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ContentItem {
  id: string
  key: string
  value: any
}

function getToken(): string {
  if (typeof document === 'undefined') return ''
  return (
    document.cookie
      .split(';')
      .find((c) => c.trim().startsWith('sb-access-token='))
      ?.split('=')?.[1] ?? ''
  )
}

export default function EditContentPage() {
  const [content, setContent] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Estados locais para o formulário do Hero
  const [heroTitle, setHeroTitle] = useState('')
  const [heroSubtitle, setHeroSubtitle] = useState('')
  const [heroBadge, setHeroBadge] = useState('')

  useEffect(() => {
    async function loadContent() {
      try {
        const res = await fetch('/api/v1/admin/content', {
          headers: { Authorization: `Bearer ${getToken()}` }
        })
        const json = await res.json()
        if (json.success) {
          setContent(json.data)
          // Preenche os estados locais com o valor do 'hero'
          const hero = json.data.find((item: ContentItem) => item.key === 'hero')
          if (hero && hero.value) {
            setHeroTitle(hero.value.title || '')
            setHeroSubtitle(hero.value.subtitle || '')
            setHeroBadge(hero.value.badge || '')
          }
        } else {
          setError('Erro ao carregar conteúdo.')
        }
      } catch {
        setError('Erro de conexão.')
      } finally {
        setLoading(false)
      }
    }
    loadContent()
  }, [])

  async function handleSaveHero() {
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/v1/admin/content', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify({
          key: 'hero',
          value: {
            title: heroTitle,
            subtitle: heroSubtitle,
            badge: heroBadge
          }
        })
      })

      const json = await res.json()
      if (json.success) {
        setSuccess('Conteúdo atualizado com sucesso!')
      } else {
        setError(json.error || 'Erro ao atualizar.')
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  if (loading && content.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-on-surface-variant font-body-lg">Carregando conteúdo...</div>
      </div>
    )
  }

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex flex-col">
      {/* SideNavBar (Desktop) */}
      <aside className="hidden lg:flex flex-col fixed left-0 top-0 h-full z-40 bg-surface-container-low border-r border-outline-variant w-64 shadow-md">
        <div className="p-lg flex flex-col gap-sm">
          <h1 className="font-headline-md text-headline-md text-primary">Brasil Digital</h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant">Painel Administrativo</p>
        </div>
        <nav className="mt-xl flex flex-col gap-xs flex-grow">
          <Link href="/admin" className="text-on-surface-variant hover:bg-surface-container-high px-4 py-3 mx-2 flex items-center gap-md transition-all rounded-full">
            <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
            <span className="font-label-lg text-label-lg">Visão Geral</span>
          </Link>
          <Link href="/admin/content" className="bg-secondary-container text-on-secondary-container rounded-full mx-2 flex items-center gap-md px-4 py-3 scale-98 duration-150">
            <span className="material-symbols-outlined" data-icon="edit">edit</span>
            <span className="font-label-lg text-label-lg">Editar Site</span>
          </Link>
          <Link href="/admin/products" className="text-on-surface-variant hover:bg-surface-container-high px-4 py-3 mx-2 flex items-center gap-md transition-all rounded-full">
            <span className="material-symbols-outlined" data-icon="shopping_bag">shopping_bag</span>
            <span className="font-label-lg text-label-lg">Produtos/Preços</span>
          </Link>
        </nav>
        <div className="p-lg border-t border-outline-variant">
          <Link href="/dashboard" className="block text-center font-label-lg text-secondary hover:underline">
            Ir para Área do Cliente
          </Link>
        </div>
      </aside>

      {/* TopNavBar */}
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-lg py-sm bg-surface border-b border-outline-variant shadow-sm lg:pl-[280px]">
        <div className="lg:hidden">
          <h1 className="text-headline-md font-headline-md font-bold text-primary">Brasil Digital</h1>
        </div>
        <div className="hidden lg:block">
          <h2 className="font-headline-md text-headline-md text-on-surface">Editar Conteúdo do Site</h2>
        </div>
        <div className="flex items-center gap-md">
          <div className="flex items-center gap-sm bg-surface-container px-md py-xs rounded-full">
            <span className="font-label-lg text-label-lg text-on-surface">Administrador</span>
            <span className="material-symbols-outlined text-primary" data-icon="account_circle" data-weight="fill" style={{ fontVariationSettings: "'FILL' 1" }}>account_circle</span>
          </div>
        </div>
      </header>

      <main className="lg:ml-64 p-lg md:p-xl max-w-container-max mx-auto flex-grow w-full">
        <div className="space-y-8">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Textos da Página de Vendas</h1>
            <p className="text-on-surface-variant font-body-lg mt-1">Altere as mensagens principais que os visitantes visualizam.</p>
          </div>

          {error && (
            <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg text-label-lg border border-error">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-success-container text-on-success-container px-4 py-3 rounded-lg text-label-lg border border-success">
              {success}
            </div>
          )}

          {/* Form Hero */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-lg space-y-6">
            <div className="border-b border-outline-variant pb-4">
              <h2 className="font-headline-md text-headline-md text-on-surface">Seção Principal (Hero)</h2>
              <p className="text-on-surface-variant font-body-md">Os textos que aparecem no topo da página inicial.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block font-label-lg text-on-surface mb-1">Badge (Texto pequeno acima do título)</label>
                <input
                  type="text"
                  value={heroBadge}
                  onChange={(e) => setHeroBadge(e.target.value)}
                  className="w-full border border-outline-variant rounded-lg px-4 py-2 font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:outline-none bg-surface"
                />
              </div>

              <div>
                <label className="block font-label-lg text-on-surface mb-1">Título Principal</label>
                <textarea
                  value={heroTitle}
                  onChange={(e) => setHeroTitle(e.target.value)}
                  rows={3}
                  className="w-full border border-outline-variant rounded-lg px-4 py-2 font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:outline-none bg-surface"
                />
                <p className="font-label-sm text-outline-variant mt-1">Dica: Use `\n` para quebrar linhas se necessário.</p>
              </div>

              <div>
                <label className="block font-label-lg text-on-surface mb-1">Subtítulo</label>
                <textarea
                  value={heroSubtitle}
                  onChange={(e) => setHeroSubtitle(e.target.value)}
                  rows={3}
                  className="w-full border border-outline-variant rounded-lg px-4 py-2 font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:outline-none bg-surface"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-outline-variant">
              <button
                onClick={handleSaveHero}
                disabled={loading}
                className="bg-primary hover:bg-primary-hover disabled:bg-outline-variant text-on-primary font-label-lg px-6 py-2 rounded-full transition-colors"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-xl px-lg mt-auto flex flex-col md:flex-row justify-between items-center gap-md bg-primary lg:pl-[280px]">
        <div className="text-on-primary">
          <h2 className="font-headline-md text-headline-md text-on-primary mb-xs">Brasil Digital</h2>
          <p className="font-label-sm text-label-sm text-outline-variant">© 2024 Brasil Digital Estratégia Política. Todos os direitos reservados.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-lg">
          <Link href="#" className="font-label-sm text-label-sm text-outline-variant hover:text-on-primary transition-all">Termos de Uso</Link>
          <Link href="#" className="font-label-sm text-label-sm text-outline-variant hover:text-on-primary transition-all">Privacidade</Link>
          <Link href="#" className="font-label-sm text-label-sm text-outline-variant hover:text-on-primary transition-all">Suporte</Link>
        </div>
      </footer>
    </div>
  )
}
