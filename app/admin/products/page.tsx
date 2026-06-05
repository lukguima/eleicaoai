'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Product {
  id: string
  type: string
  label: string
  description: string
  price: number
  active: boolean
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

export default function ManageProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [editingProduct, setEditingProduct] = useState<Product | null>(null)

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch('/api/v1/admin/products', {
          headers: { Authorization: `Bearer ${getToken()}` }
        })
        const json = await res.json()
        if (json.success) {
          setProducts(json.data)
        } else {
          setError('Erro ao carregar produtos.')
        }
      } catch {
        setError('Erro de conexão.')
      } finally {
        setLoading(false)
      }
    }
    loadProducts()
  }, [])

  async function handleSaveProduct() {
    if (!editingProduct) return
    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch('/api/v1/admin/products', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`
        },
        body: JSON.stringify(editingProduct)
      })

      const json = await res.json()
      if (json.success) {
        setSuccess('Produto atualizado com sucesso!')
        // Atualiza a lista local
        setProducts(products.map(p => p.type === editingProduct.type ? editingProduct : p))
        setEditingProduct(null)
      } else {
        setError(json.error || 'Erro ao atualizar.')
      }
    } catch {
      setError('Erro de conexão.')
    } finally {
      setLoading(false)
    }
  }

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-on-surface-variant font-body-lg">Carregando produtos...</div>
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
          <Link href="/admin/content" className="text-on-surface-variant hover:bg-surface-container-high px-4 py-3 mx-2 flex items-center gap-md transition-all rounded-full">
            <span className="material-symbols-outlined" data-icon="edit">edit</span>
            <span className="font-label-lg text-label-lg">Editar Site</span>
          </Link>
          <Link href="/admin/products" className="bg-secondary-container text-on-secondary-container rounded-full mx-2 flex items-center gap-md px-4 py-3 scale-98 duration-150">
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
          <h2 className="font-headline-md text-headline-md text-on-surface">Gerenciar Produtos e Preços</h2>
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
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Planos e Serviços</h1>
            <p className="text-on-surface-variant font-body-lg mt-1">Altere os preços e descrições dos serviços.</p>
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

          {/* Lista de Produtos */}
          <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-outline-variant font-label-lg text-on-surface-variant">
                  <th className="p-md">Produto</th>
                  <th className="p-md">Preço</th>
                  <th className="p-md">Status</th>
                  <th className="p-md text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-on-surface">
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-outline-variant/30 hover:bg-surface-container-high transition-colors">
                    <td className="p-md">
                      <div className="font-medium">{product.label}</div>
                      <div className="text-on-surface-variant font-label-sm">{product.description}</div>
                    </td>
                    <td className="p-md text-on-surface-variant">
                      {(product.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                    <td className="p-md">
                      <span className={`px-2 py-1 text-label-sm font-semibold rounded-full ${product.active ? 'bg-success-container text-on-success-container' : 'bg-error-container text-on-error-container'}`}>
                        {product.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="p-md text-right">
                      <button
                        onClick={() => setEditingProduct(product)}
                        className="text-primary hover:underline font-label-lg"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Modal/Form de Edição */}
          {editingProduct && (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant p-lg space-y-6">
              <div className="border-b border-outline-variant pb-4">
                <h2 className="font-headline-md text-headline-md text-on-surface">Editando: {editingProduct.label}</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block font-label-lg text-on-surface mb-1">Rótulo</label>
                  <input
                    type="text"
                    value={editingProduct.label}
                    onChange={(e) => setEditingProduct({ ...editingProduct, label: e.target.value })}
                    className="w-full border border-outline-variant rounded-lg px-4 py-2 font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:outline-none bg-surface"
                  />
                </div>

                <div>
                  <label className="block font-label-lg text-on-surface mb-1">Descrição</label>
                  <textarea
                    value={editingProduct.description}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    rows={2}
                    className="w-full border border-outline-variant rounded-lg px-4 py-2 font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:outline-none bg-surface"
                  />
                </div>

                <div>
                  <label className="block font-label-lg text-on-surface mb-1">Preço (em centavos)</label>
                  <input
                    type="number"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseInt(e.target.value) })}
                    className="w-full border border-outline-variant rounded-lg px-4 py-2 font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:outline-none bg-surface"
                  />
                  <p className="font-label-sm text-outline-variant mt-1">Ex: 2900 = R$ 29,00</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingProduct.active}
                    onChange={(e) => setEditingProduct({ ...editingProduct, active: e.target.checked })}
                    className="rounded text-primary focus:ring-primary bg-surface"
                  />
                  <label className="font-label-lg text-on-surface">Produto Ativo</label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
                <button
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 font-label-lg text-on-surface border border-outline-variant rounded-full hover:bg-surface-container-high transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveProduct}
                  disabled={loading}
                  className="bg-primary hover:bg-primary-hover disabled:bg-outline-variant text-on-primary font-label-lg px-6 py-2 rounded-full transition-colors"
                >
                  {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </div>
          )}
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
