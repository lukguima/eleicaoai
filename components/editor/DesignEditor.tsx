'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@/lib/supabase'
import { TEMPLATE_COMPONENTS } from '@/components/templates'
import { getRenderSpec, TEMPLATE_VARIATIONS, PHOTO_PLACEMENTS, impliedPhotoPlacement } from '@/components/templates/registry'
import { applyCandidateToDesign } from '@/lib/design'
import type { AssetType, Candidate, Design } from '@/types'

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
  const [syncCadastro, setSyncCadastro] = useState(true)
  const [cadastroBusy, setCadastroBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const photoRef = useRef<HTMLInputElement>(null)
  const previewBoxRef = useRef<HTMLDivElement>(null)

  // Escala do preview: no celular cabe na largura/altura disponível; no desktop o zoom é manual.
  const [previewW, setPreviewW] = useState(360)
  const [fitW, setFitW] = useState(360)
  const scale = previewW / spec.baseW

  useEffect(() => {
    const el = previewBoxRef.current
    if (!el) return
    const measure = () => {
      const pad = 32
      const availW = Math.max(140, el.clientWidth - pad)
      const narrow = window.innerWidth < 1024
      const availH = narrow
        ? Math.max(160, window.innerHeight * 0.42)
        : Math.max(200, el.clientHeight - 88)
      const next = Math.min(availW, (availH / spec.baseH) * spec.baseW, 520)
      setFitW(next)
      setPreviewW(w => (narrow ? next : Math.min(w, next) || Math.min(360, next)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [spec.baseW, spec.baseH])

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

  async function applyFromCadastro() {
    setCadastroBusy(true); setError(null)
    try {
      const t = await token()
      const res = await fetch('/api/v1/candidates', { headers: { Authorization: `Bearer ${t}` } })
      const json = await res.json()
      const candidate = json.success ? json.data?.[0] as Candidate | undefined : undefined
      if (!candidate) throw new Error('Cadastro não encontrado.')
      setDesign(d => applyCandidateToDesign(d, candidate))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível puxar o cadastro.')
    } finally {
      setCadastroBusy(false)
    }
  }

  async function saveToCadastro(t: string) {
    const body = {
      name: design.fields.name,
      election_number: design.fields.number,
      party: design.fields.party,
      slogan: design.fields.slogan ?? '',
      primary_color: design.colors.primary,
      secondary_color: design.colors.secondary,
    }
    const res = await fetch(`/api/v1/candidates/${candidateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!json.success) throw new Error(json.error)
  }

  async function handleGenerateFinal() {
    setRendering(true); setError(null)
    try {
      const t = await token()
      if (syncCadastro) await saveToCadastro(t)
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
    <div className="flex flex-col lg:flex-row h-dvh overflow-hidden bg-gray-100">
      {/* Preview: em cima no celular, à esquerda no desktop */}
      <section
        ref={previewBoxRef}
        className="flex flex-col items-center justify-center px-4 py-3 lg:p-6 overflow-auto shrink-0 lg:flex-1 lg:min-h-0 max-h-[48vh] lg:max-h-none"
      >
        <div
          style={{ width: previewW, height: spec.baseH * scale }}
          className="shadow-2xl overflow-hidden bg-white shrink-0 max-w-full"
        >
          <div style={{ width: spec.baseW, height: spec.baseH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
            <Template design={design} />
          </div>
        </div>
        <div className="mt-3 hidden lg:flex items-center gap-2">
          <span className="text-xs text-gray-500">Zoom</span>
          <input type="range" min={240} max={Math.max(240, Math.round(fitW))} value={Math.min(previewW, fitW)} onChange={e => setPreviewW(Number(e.target.value))} />
          <span className="text-xs text-gray-400">{spec.label} · {spec.printW}×{spec.printH}px</span>
        </div>
        <p className="mt-1 text-[11px] lg:text-xs text-gray-400 text-center">
          {spec.label} · preview idêntico ao arquivo final
        </p>
      </section>

      {/* Painel de edição */}
      <aside className="flex-1 min-h-0 lg:flex-none lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col overflow-y-auto">
        <header className="p-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <Link href="/dashboard" className="text-sm text-gray-500 hover:text-gray-800 py-1">← Painel</Link>
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
            <label className="flex items-start gap-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" className="mt-0.5" checked={syncCadastro} onChange={e => setSyncCadastro(e.target.checked)} />
              <span>Atualizar meus dados cadastrados com o nome, número, partido, slogan e cores desta peça.</span>
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={applyFromCadastro} disabled={cadastroBusy}
                className="flex-1 px-2 py-2 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                {cadastroBusy ? 'Puxando…' : 'Usar dados do cadastro'}
              </button>
              <Link href="/dados" className="px-2 py-2 rounded-lg text-xs font-semibold border border-gray-300 text-gray-700 hover:bg-gray-50 text-center">
                Editar cadastro
              </Link>
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
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-[11px] text-gray-500 mb-1.5">Local da foto</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PHOTO_PLACEMENTS[assetType].map(p => {
                      const implied = impliedPhotoPlacement(assetType, design.template_id)
                      const active = (design.photo_placement && design.photo_placement !== 'auto')
                        ? design.photo_placement === p.id
                        : implied === p.id
                      return (
                        <button key={p.id} type="button"
                          onClick={() => setDesign(d => ({ ...d, photo_placement: p.id }))}
                          className={`px-2 py-2 rounded-lg text-xs font-semibold border-2 ${active ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                          {p.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 mb-1.5">Enquadramento do rosto</p>
                  <div className="grid grid-cols-3 gap-1 w-[72px]">
                    {([20, 50, 80] as const).flatMap(y => ([20, 50, 80] as const).map(x => {
                      const on = design.photo!.offset_x === x && design.photo!.offset_y === y
                      return (
                        <button key={`${x}-${y}`} type="button" title={`${x}% ${y}%`}
                          onClick={() => setPhoto({ offset_x: x, offset_y: y })}
                          className={`h-6 rounded border ${on ? 'border-blue-600 bg-blue-600' : 'border-gray-300 bg-gray-100 hover:border-blue-400'}`} />
                      )
                    }))}
                  </div>
                </div>
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
            <label className={labelCls}>Aviso de IA</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDesign(d => ({ ...d, show_ai_label: true }))}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold border-2 ${design.show_ai_label !== false ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                Com aviso
              </button>
              <button type="button" onClick={() => setDesign(d => ({ ...d, show_ai_label: false }))}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold border-2 ${design.show_ai_label === false ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                Sem aviso
              </button>
            </div>
          </div>

          {/* CNPJ */}
          <div>
            <label className={labelCls}>CNPJ na peça</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDesign(d => ({ ...d, show_cnpj: true }))}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold border-2 ${design.show_cnpj !== false ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                Com CNPJ
              </button>
              <button type="button" onClick={() => setDesign(d => ({ ...d, show_cnpj: false }))}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold border-2 ${design.show_cnpj === false ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                Sem CNPJ
              </button>
            </div>
            {(design.show_ai_label !== false || design.show_cnpj !== false) && (
              <div className="flex gap-2 mt-2">
                {(['bottom', 'top'] as const).map(pos => (
                  <button key={pos} type="button" onClick={() => setDesign(d => ({ ...d, label_position: pos }))}
                    className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold border-2 ${design.label_position === pos ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                    {pos === 'bottom' ? 'Embaixo' : 'Em cima'}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-1">
              {design.show_cnpj === false
                ? 'Peça sem o CNPJ no rodapé. A lei eleitoral pede CNPJ/CPF e tiragem no material impresso.'
                : 'O CNPJ cadastrado aparece no rodapé da arte.'}
            </p>
          </div>

          {/* Logo do partido */}
          <div>
            <label className={labelCls}>Logo do partido</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDesign(d => ({ ...d, show_party_logo: true }))}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold border-2 ${design.show_party_logo !== false ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                Com logo
              </button>
              <button type="button" onClick={() => setDesign(d => ({ ...d, show_party_logo: false }))}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-semibold border-2 ${design.show_party_logo === false ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'}`}>
                Sem logo
              </button>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {design.party_logo_url
                ? 'Usa a logo enviada em Meus dados. Sem logo, a sigla entra num selo.'
                : 'Selo com a sigla do partido. Envie a logo oficial em Meus dados.'}
            </p>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 sticky bottom-0 bg-white shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button onClick={handleGenerateFinal} disabled={rendering}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3 rounded-xl text-sm transition-colors min-h-11">
            {rendering ? 'Gerando arquivo…' : 'Gerar arquivo final'}
          </button>
          <p className="text-[11px] text-gray-400 text-center mt-2">PNG em alta resolução + PDF para gráfica</p>
        </div>
      </aside>
    </div>
  )
}
