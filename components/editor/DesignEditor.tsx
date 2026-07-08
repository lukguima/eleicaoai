'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { TEMPLATE_COMPONENTS } from '@/components/templates'
import { getRenderSpec, TEMPLATE_VARIATIONS } from '@/components/templates/registry'
import type { AssetType, Design } from '@/types'

// Fontes usadas nos templates — carregadas para o preview bater com o render.
import '@fontsource/inter/400.css'
import '@fontsource/inter/700.css'
import '@fontsource/inter/800.css'
import '@fontsource/anton/400.css'

type VisualType = Exclude<AssetType, 'jingle'>

interface Props {
  assetId: string
  candidateId: string
  assetType: VisualType
  initialDesign: Design
}

export default function DesignEditor({ assetId, candidateId, assetType, initialDesign }: Props) {
  const router = useRouter()
  const spec = getRenderSpec(assetType)!
  const variations = TEMPLATE_VARIATIONS[assetType]
  const Template = TEMPLATE_COMPONENTS[assetType]

  const [design, setDesign] = useState<Design>(initialDesign)
  const [saving, setSaving] = useState(false)
  const [rendering, setRendering] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [genBg, setGenBg] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)

  // Escala do preview para caber na coluna central
  const [previewW, setPreviewW] = useState(360)
  const scale = previewW / spec.baseW

  async function token(): Promise<string> {
    const { data: { session } } = await createBrowserClient().auth.getSession()
    if (!session) throw new Error('Sessão expirada. Faça login novamente.')
    return session.access_token
  }

  // Autosave debounced
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return }
    const handle = setTimeout(async () => {
      try {
        setSaving(true)
        const t = await token()
        await fetch(`/api/v1/designs/${assetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
          body: JSON.stringify({ design }),
        })
      } catch { /* silencioso; próxima edição tenta de novo */ } finally {
        setSaving(false)
      }
    }, 800)
    return () => clearTimeout(handle)
  }, [design, assetId])

  // Helpers de atualização
  const setField = useCallback((k: keyof Design['fields'], v: string) => {
    setDesign(d => ({ ...d, fields: { ...d.fields, [k]: v } }))
  }, [])
  const setColor = useCallback((k: 'primary' | 'secondary', v: string) => {
    setDesign(d => ({ ...d, colors: { ...d.colors, [k]: v } }))
  }, [])
  const setPhoto = useCallback((patch: Partial<NonNullable<Design['photo']>>) => {
    setDesign(d => d.photo ? ({ ...d, photo: { ...d.photo, ...patch } }) : d)
  }, [])

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Use JPEG, PNG ou WebP.'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Máximo 5 MB.'); return }
    setUploadingPhoto(true)
    try {
      const t = await token()
      const fd = new FormData()
      fd.append('photo', file)
      const res = await fetch(`/api/v1/candidates/${candidateId}/photo`, {
        method: 'POST', headers: { Authorization: `Bearer ${t}` }, body: fd,
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setDesign(d => ({
        ...d,
        photo: {
          url: json.data.base_photo_url,
          cutout_url: json.data.base_photo_cutout_url || undefined,
          offset_x: 50, offset_y: 50, scale: 1,
        },
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar foto.')
    } finally {
      setUploadingPhoto(false)
    }
  }

  async function handleGenerateBg() {
    setGenBg(true); setError(null)
    try {
      const t = await token()
      const res = await fetch(`/api/v1/designs/${assetId}/background`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ prompt_hint: design.fields.slogan || '' }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setDesign(json.data.design as Design)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar fundo.')
    } finally {
      setGenBg(false)
    }
  }

  function setSolidBg() {
    setDesign(d => ({ ...d, background: { kind: 'solid', value: d.colors.primary } }))
  }

  async function handleGenerateFinal() {
    setRendering(true); setError(null)
    try {
      const t = await token()
      // garante que o último design foi salvo
      await fetch(`/api/v1/designs/${assetId}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
        body: JSON.stringify({ design }),
      })
      const res = await fetch(`/api/v1/designs/${assetId}/render`, {
        method: 'POST', headers: { Authorization: `Bearer ${t}` },
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      router.push(`/orders/${assetId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar arquivo final.')
      setRendering(false)
    }
  }

  const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none'
  const labelCls = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Preview central */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto">
        <div
          style={{ width: previewW, height: spec.baseH * scale }}
          className="shadow-2xl overflow-hidden bg-white shrink-0"
        >
          <div style={{ width: spec.baseW, height: spec.baseH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <Template design={design} />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-xs text-gray-500">Zoom</span>
          <input type="range" min={240} max={520} value={previewW} onChange={e => setPreviewW(Number(e.target.value))} />
          <span className="text-xs text-gray-400">{spec.label} · {spec.printW}×{spec.printH}px</span>
        </div>
        <p className="mt-1 text-xs text-gray-400">Este preview é idêntico ao arquivo que você vai baixar.</p>
      </section>

      {/* Painel de edição */}
      <aside className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-y-auto shrink-0">
        <header className="p-4 border-b border-gray-200 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800">← Painel</Link>
          <span className="text-xs text-gray-400">{saving ? 'Salvando…' : 'Salvo'}</span>
        </header>

        <div className="p-4 space-y-6">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}

          {/* Modelo */}
          <div>
            <label className={labelCls}>Modelo</label>
            <div className="grid grid-cols-3 gap-2">
              {variations.map(v => (
                <button key={v.id} type="button" title={v.description}
                  onClick={() => setDesign(d => ({ ...d, template_id: v.id }))}
                  className={`px-2 py-2 rounded-lg text-xs font-semibold border-2 transition-colors ${design.template_id === v.id ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* Textos */}
          <div className="space-y-3">
            <div>
              <label className={labelCls}>Nome</label>
              <input className={inputCls} maxLength={150} value={design.fields.name} onChange={e => setField('name', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Número</label>
                <input className={inputCls} maxLength={6} value={design.fields.number} onChange={e => setField('number', e.target.value.replace(/\D/g, ''))} />
              </div>
              <div>
                <label className={labelCls}>Partido</label>
                <input className={inputCls} maxLength={100} value={design.fields.party} onChange={e => setField('party', e.target.value)} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Slogan</label>
              <input className={inputCls} maxLength={100} value={design.fields.slogan ?? ''} onChange={e => setField('slogan', e.target.value)} />
            </div>
          </div>

          {/* Foto */}
          <div>
            <label className={labelCls}>Foto do candidato</label>
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => photoRef.current?.click()} disabled={uploadingPhoto}
                className="text-sm text-blue-600 hover:text-blue-800 underline disabled:text-gray-400">
                {uploadingPhoto ? 'Enviando e recortando…' : design.photo ? 'Trocar foto' : 'Adicionar foto'}
              </button>
              {design.photo?.cutout_url && <span className="text-xs text-green-600">✓ fundo removido</span>}
            </div>
            <input ref={photoRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handlePhoto} />
            {design.photo && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-16">Horizontal</span>
                  <input type="range" min={0} max={100} value={design.photo.offset_x} onChange={e => setPhoto({ offset_x: Number(e.target.value) })} className="flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-16">Vertical</span>
                  <input type="range" min={0} max={100} value={design.photo.offset_y} onChange={e => setPhoto({ offset_y: Number(e.target.value) })} className="flex-1" />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-16">Zoom</span>
                  <input type="range" min={100} max={200} value={Math.round((design.photo.scale ?? 1) * 100)} onChange={e => setPhoto({ scale: Number(e.target.value) / 100 })} className="flex-1" />
                </div>
              </div>
            )}
          </div>

          {/* Cores */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Cor principal</label>
              <input type="color" value={design.colors.primary} onChange={e => setColor('primary', e.target.value)} className="h-10 w-full rounded border border-gray-300 cursor-pointer" />
            </div>
            <div>
              <label className={labelCls}>Cor de destaque</label>
              <input type="color" value={design.colors.secondary} onChange={e => setColor('secondary', e.target.value)} className="h-10 w-full rounded border border-gray-300 cursor-pointer" />
            </div>
          </div>

          {/* Fundo */}
          <div>
            <label className={labelCls}>Fundo (atrás da foto)</label>
            <div className="flex gap-2">
              <button type="button" onClick={setSolidBg}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold border-2 ${design.background.kind !== 'ai' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                Cor sólida
              </button>
              <button type="button" onClick={handleGenerateBg} disabled={genBg}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold border-2 ${design.background.kind === 'ai' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'} disabled:opacity-50`}>
                {genBg ? 'Gerando…' : '✨ Fundo IA'}
              </button>
            </div>
          </div>

          {/* Rótulo IA */}
          <div>
            <label className={labelCls}>Aviso de IA (obrigatório · TSE)</label>
            <div className="flex gap-2">
              {(['bottom', 'top'] as const).map(pos => (
                <button key={pos} type="button" onClick={() => setDesign(d => ({ ...d, label_position: pos }))}
                  className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold border-2 ${design.label_position === pos ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                  {pos === 'bottom' ? 'Embaixo' : 'Em cima'}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-1">O aviso “Conteúdo fabricado com IA” não pode ser removido.</p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 mt-auto">
          <button onClick={handleGenerateFinal} disabled={rendering}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl text-sm transition-colors">
            {rendering ? 'Gerando arquivo…' : 'Gerar arquivo final'}
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-2">PNG em alta resolução + PDF para gráfica</p>
        </div>
      </aside>
    </div>
  )
}
