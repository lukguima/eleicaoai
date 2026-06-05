'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Candidate {
  id: string
  name: string
  party: string
  created_at: string
}

interface Order {
  id: string
  plan: string
  credits_remaining: number
  created_at: string
  candidates: {
    name: string
    party: string
  }
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

export default function AdminDashboard() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      try {
        const token = getToken()
        const headers = { Authorization: `Bearer ${token}` }

        const [candRes, orderRes] = await Promise.all([
          fetch('/api/v1/admin/candidates', { headers }),
          fetch('/api/v1/admin/orders', { headers })
        ])

        const candJson = await candRes.json()
        const orderJson = await orderRes.json()

        if (candJson.success) setCandidates(candJson.data)
        if (orderJson.success) setOrders(orderJson.data)

        if (!candJson.success || !orderJson.success) {
          setError('Erro ao carregar alguns dados. Verifique se você é admin.')
        }
      } catch (err) {
        setError('Erro de conexão.')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-on-surface-variant font-body-lg">Carregando painel...</div>
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
          <Link href="/admin" className="bg-secondary-container text-on-secondary-container rounded-full mx-2 flex items-center gap-md px-4 py-3 scale-98 duration-150">
            <span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
            <span className="font-label-lg text-label-lg">Visão Geral</span>
          </Link>
          <Link href="/admin/content" className="text-on-surface-variant hover:bg-surface-container-high px-4 py-3 mx-2 flex items-center gap-md transition-all rounded-full">
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
          <h2 className="font-headline-md text-headline-md text-on-surface">Visão Geral do Sistema</h2>
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
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Controle de Clientes e Vendas</h1>
            <p className="text-on-surface-variant font-body-lg mt-1">Monitore o desempenho da plataforma.</p>
          </div>

          {error && (
            <div className="bg-error-container text-on-error-container px-4 py-3 rounded-lg text-label-lg border border-error">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-lg">
            <div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant">
              <p className="font-label-sm text-on-surface-variant uppercase">Total de Clientes (Candidatos)</p>
              <p className="font-display-lg text-primary mt-2">{candidates.length}</p>
            </div>
            <div className="bg-surface-container-lowest p-lg rounded-xl shadow-sm border border-outline-variant">
              <p className="font-label-sm text-on-surface-variant uppercase">Total de Pedidos/Planos</p>
              <p className="font-display-lg text-primary mt-2">{orders.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
            {/* Clientes Recentes */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-lg">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-lg">Clientes Recentes</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant font-label-lg text-on-surface-variant">
                      <th className="pb-md">Nome</th>
                      <th className="pb-md">Partido</th>
                      <th className="pb-md">Data</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-on-surface">
                    {candidates.slice(0, 5).map((c) => (
                      <tr key={c.id} className="border-b border-outline-variant/30 hover:bg-surface-container-high transition-colors">
                        <td className="py-md font-medium">{c.name}</td>
                        <td className="py-md text-on-surface-variant">{c.party}</td>
                        <td className="py-md text-on-surface-variant">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                    {candidates.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-lg text-center text-on-surface-variant">Nenhum cliente cadastrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vendas Recentes */}
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-lg">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-lg">Vendas Recentes</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-outline-variant font-label-lg text-on-surface-variant">
                      <th className="pb-md">Cliente</th>
                      <th className="pb-md">Plano</th>
                      <th className="pb-md">Créditos</th>
                    </tr>
                  </thead>
                  <tbody className="font-body-md text-on-surface">
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id} className="border-b border-outline-variant/30 hover:bg-surface-container-high transition-colors">
                        <td className="py-md font-medium">{o.candidates?.name || 'N/A'}</td>
                        <td className="py-md text-on-surface-variant uppercase">{o.plan}</td>
                        <td className="py-md text-on-surface-variant">{o.credits_remaining}</td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-lg text-center text-on-surface-variant">Nenhuma venda realizada.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
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
