import { NextRequest, NextResponse } from 'next/server'
import { sanitizeDesign } from '@/lib/design'
import { loadOwnedAsset } from '@/lib/asset-auth'
import type { ApiResponse } from '@/types'

// ── GET /api/v1/designs/[id] ──────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await loadOwnedAsset(req, id)
  if ('error' in r) return r.error
  return NextResponse.json<ApiResponse>({ success: true, data: r.asset })
}

// ── PUT /api/v1/designs/[id] ──────────────────────────────────
// Salva o rascunho do editor (design JSON). Autosave debounced no cliente.
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const r = await loadOwnedAsset(req, id)
    if ('error' in r) return r.error
    const { supabase, cnpj } = r

    const { design } = await req.json()
    const clean = sanitizeDesign(design, cnpj)
    if (!clean) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Design inválido.' }, { status: 400 })
    }

    const { error } = await supabase.from('assets').update({ design: clean }).eq('id', id)
    if (error) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Erro ao salvar.' }, { status: 500 })
    }
    return NextResponse.json<ApiResponse>({ success: true, data: { saved: true } })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    return NextResponse.json<ApiResponse>({ success: false, error: `Erro ao salvar: ${detail}` }, { status: 500 })
  }
}
