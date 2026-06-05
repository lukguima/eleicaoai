'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'

type Service = { type: string; label: string; price: number; icon: string }
interface Props { services: Service[] }

/* ── Preview components ───────────────────────────────────── */

function SantinhoPreview() {
  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <div className="relative w-48 rounded-2xl overflow-hidden shadow-xl">
        <Image
          src="/examples/santinho-example.png"
          alt="Exemplo de santinho eleitoral gerado com IA"
          width={384}
          height={543}
          className="w-full h-auto object-cover"
          unoptimized
        />
      </div>
      <p className="text-on-surface-variant text-xs text-center">Formato A6 · gerado com os dados da sua candidatura</p>
    </div>
  )
}

function JinglePreview() {
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const ctxRef = useRef<AudioContext | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      ctxRef.current?.close().catch(() => {})
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  function toggle() {
    if (playing) {
      ctxRef.current?.close().catch(() => {})
      ctxRef.current = null
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      setPlaying(false)
      setProgress(0)
      return
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new AudioCtx()
    ctxRef.current = ctx
    setPlaying(true)

    // Simple campaign jingle melody: C-E-G-E-C-D-F-D-C-A-C-E-G
    const MELODY = [523.25, 659.25, 783.99, 659.25, 523.25, 587.33, 698.46, 587.33, 523.25, 440.0, 523.25, 659.25, 783.99]
    const beat = 0.32
    const t0 = ctx.currentTime

    MELODY.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.type = 'sine'
      osc.frequency.value = freq
      const t = t0 + i * beat
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.22, t + 0.05)
      gain.gain.linearRampToValueAtTime(0, t + beat * 0.82)
      osc.start(t)
      osc.stop(t + beat)
    })

    const total = MELODY.length * beat
    timerRef.current = setInterval(() => {
      const c = ctxRef.current
      if (!c) return
      const p = Math.min((c.currentTime - t0) / total, 1)
      setProgress(p)
      if (p >= 1) {
        clearInterval(timerRef.current!)
        timerRef.current = null
        c.close().catch(() => {})
        ctxRef.current = null
        setPlaying(false)
        setProgress(0)
      }
    }, 80)
  }

  const bars = [40, 70, 55, 90, 65, 80, 45, 75, 60, 85, 50, 70, 40, 65, 75, 80, 55]

  return (
    <div className="bg-primary-container p-6">
      <div className="bg-white/10 rounded-2xl p-5 space-y-4">
        <p className="text-white font-headline font-bold text-center">♪ Lucas Silva Vereador — Nº 2222 ♪</p>
        <div className="flex items-end justify-center gap-1 h-14">
          {bars.map((h, i) => (
            <div
              key={i}
              className="w-2 rounded-full transition-colors duration-100"
              style={{
                height: `${h}%`,
                background: playing && i / bars.length < progress ? '#a8efc5' : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-white text-sm shrink-0 hover:brightness-110 transition-all"
            aria-label={playing ? 'Parar' : 'Reproduzir demo'}
          >
            {playing ? '■' : '▶'}
          </button>
          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-secondary-container rounded-full"
              style={{ width: `${progress * 100}%`, transition: playing ? 'none' : 'width 0.3s' }}
            />
          </div>
          <span className="text-white/40 text-xs tabular-nums">
            {playing ? `${(progress * 4.2).toFixed(1)}s` : '4s'}
          </span>
        </div>
      </div>
      <p className="text-on-primary-container text-xs text-center mt-3">
        Clique em ▶ para ouvir o demo · Sertanejo, Forró, MPB, Funk · 30–60 segundos
      </p>
    </div>
  )
}

function PerfuradoPreview() {
  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <div className="bg-surface-container-low rounded-2xl p-5 w-full flex flex-col items-center gap-4">
        <span className="text-6xl">🚗</span>
        <div
          className="w-full rounded-xl overflow-hidden"
          style={{ background: 'linear-gradient(90deg, #0a1b3d 0%, #256a49 100%)' }}
        >
          <div className="flex items-center justify-between px-5 py-3">
            <div>
              <p className="text-white font-headline font-bold text-lg">Lucas Silva</p>
              <p className="text-on-primary-container text-xs">Vereador · PL · São Paulo</p>
            </div>
            <p className="font-headline font-black text-4xl" style={{ color: '#ffdf9e' }}>2222</p>
          </div>
          <div className="bg-secondary/60 px-5 py-1">
            <p className="text-white/60 text-[9px]">Conteúdo fabricado com IA · CNPJ</p>
          </div>
        </div>
      </div>
      <p className="text-on-surface-variant text-xs text-center">Alta resolução para plotagem em carros e motos</p>
    </div>
  )
}

function SocialPreview() {
  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <div
        className="w-52 h-52 rounded-2xl overflow-hidden shadow-xl flex flex-col items-center justify-center gap-2 p-5"
        style={{ background: 'linear-gradient(135deg, #0a1b3d 0%, #1a3a7a 50%, #256a49 100%)' }}
      >
        <p className="text-white/50 text-[10px] uppercase tracking-widest">Vote</p>
        <p className="font-headline font-black text-6xl leading-none" style={{ color: '#ffdf9e' }}>2222</p>
        <p className="text-white font-bold text-sm">Lucas Silva</p>
        <p className="text-white/50 text-xs">Vereador · PL · São Paulo</p>
        <div className="w-full h-px bg-white/20 mt-1" />
        <p className="text-white/30 text-[8px]">Conteúdo fabricado com IA · CNPJ</p>
      </div>
      <p className="text-on-surface-variant text-xs text-center">Formato 1:1 · pronto para Instagram e Facebook</p>
    </div>
  )
}

function BannerPreview() {
  return (
    <div className="p-6 flex flex-col gap-4">
      <div
        className="w-full rounded-2xl overflow-hidden shadow-xl"
        style={{ background: 'linear-gradient(90deg, #0a1b3d 0%, #1a3a7a 100%)' }}
      >
        <div className="flex items-center justify-between px-7 py-5">
          <div className="space-y-0.5">
            <p className="text-white/50 text-xs uppercase tracking-widest">Vote</p>
            <p className="text-white font-headline font-bold text-2xl">Lucas Silva</p>
            <p className="text-on-primary-container text-sm">Vereador · PL · São Paulo</p>
          </div>
          <p className="font-headline font-black text-6xl leading-none" style={{ color: '#ffdf9e' }}>2222</p>
        </div>
        <div className="bg-secondary px-7 py-1.5">
          <p className="text-on-secondary text-[9px]">Conteúdo fabricado com IA · CNPJ</p>
        </div>
      </div>
      <p className="text-on-surface-variant text-xs text-center">Alta resolução · horizontal ou vertical · para impressão</p>
    </div>
  )
}

const PREVIEWS: Record<string, React.FC> = {
  santinho:  SantinhoPreview,
  jingle:    JinglePreview,
  perfurado: PerfuradoPreview,
  social:    SocialPreview,
  banner:    BannerPreview,
}

const TITLES: Record<string, string> = {
  santinho:  'Santinho Digital',
  jingle:    'Jingle Profissional',
  perfurado: 'Adesivo Perfurado',
  social:    'Post para Redes Sociais',
  banner:    'Banner e Placa',
}

/* ── Main component ───────────────────────────────────────── */

export default function BentoFeatures({ services }: Props) {
  const [selected, setSelected] = useState<string | null>(null)

  const Preview = selected ? PREVIEWS[selected] : null

  return (
    <>
      <section id="servicos" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-headline text-3xl md:text-4xl font-bold text-primary">
            Tudo que sua campanha precisa
          </h2>
          <p className="text-on-surface-variant mt-3 text-lg">
            Clique em um material para ver um exemplo gerado por IA
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Santinho — wide */}
          <button
            onClick={() => setSelected('santinho')}
            className="md:col-span-2 bg-white rounded-2xl border border-outline-variant shadow-sm hover:shadow-md hover:border-secondary transition-all p-6 flex flex-col md:flex-row gap-6 group text-left cursor-pointer"
          >
            <div className="flex-1 space-y-3">
              <span className="material-symbols-outlined text-secondary text-[36px] block" style={{ fontVariationSettings: "'FILL' 0" }}>contact_page</span>
              <h3 className="font-headline font-bold text-xl text-primary">Santinho Digital</h3>
              <p className="text-on-surface-variant text-sm leading-relaxed">
                Formato A6 pronto para WhatsApp e redes sociais. Número do candidato em destaque, cores da campanha e rótulo TSE. Gerado em segundos.
              </p>
              <span className="inline-flex items-center gap-1 text-secondary font-semibold text-sm group-hover:underline">
                Ver exemplo →
              </span>
            </div>
            <div className="w-full md:w-36 h-48 rounded-xl overflow-hidden shrink-0">
              <Image
                src="/examples/santinho-example.png"
                alt="Exemplo santinho"
                width={288}
                height={407}
                className="w-full h-full object-cover object-top"
                unoptimized
              />
            </div>
          </button>

          {/* Jingle */}
          <button
            onClick={() => setSelected('jingle')}
            className="bg-primary-container rounded-2xl border border-primary/20 shadow-sm p-6 flex flex-col justify-between group hover:shadow-lg hover:border-secondary/40 transition-all text-left cursor-pointer"
          >
            <div className="space-y-3">
              <span className="material-symbols-outlined text-tertiary-fixed text-[36px] block" style={{ fontVariationSettings: "'FILL' 0" }}>music_note</span>
              <h3 className="font-headline font-bold text-xl text-white">Jingle Profissional</h3>
              <p className="text-on-primary-container text-sm leading-relaxed">
                Letra criada por IA e música gerada por síntese neural. Sertanejo, Forró, MPB ou Funk — você escolhe o estilo.
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <div className="bg-white/10 p-3 rounded-xl flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary-container text-[22px]">play_circle</span>
                <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                  <div className="h-full w-2/3 rounded-full" style={{ background: '#a8efc5' }} />
                </div>
                <span className="text-white/40 text-[10px]">1:45</span>
              </div>
              <span className="block text-center text-tertiary-fixed font-semibold text-sm group-hover:underline">
                Ouvir demo →
              </span>
            </div>
          </button>

          {/* Adesivo */}
          <button
            onClick={() => setSelected('perfurado')}
            className="bg-white rounded-2xl border border-outline-variant shadow-sm hover:shadow-md hover:border-secondary transition-all p-6 group text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-secondary text-[36px] block" style={{ fontVariationSettings: "'FILL' 0" }}>directions_car</span>
            <h3 className="font-headline font-bold text-xl text-primary mt-3">Adesivo Perfurado</h3>
            <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">Arte em alta resolução para plotagem em carros, motos e veículos da campanha.</p>
            <span className="inline-flex items-center gap-1 text-secondary font-semibold text-sm mt-4 group-hover:underline">Ver exemplo →</span>
          </button>

          {/* Post Social */}
          <button
            onClick={() => setSelected('social')}
            className="bg-white rounded-2xl border border-outline-variant shadow-sm hover:shadow-md hover:border-secondary transition-all p-6 group text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-secondary text-[36px] block" style={{ fontVariationSettings: "'FILL' 0" }}>photo_library</span>
            <h3 className="font-headline font-bold text-xl text-primary mt-3">Post para Redes Sociais</h3>
            <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">Templates para Instagram, Facebook e WhatsApp Stories. Formato quadrado pronto para publicar.</p>
            <span className="inline-flex items-center gap-1 text-secondary font-semibold text-sm mt-4 group-hover:underline">Ver exemplo →</span>
          </button>

          {/* Banner */}
          <button
            onClick={() => setSelected('banner')}
            className="bg-white rounded-2xl border border-outline-variant shadow-sm hover:shadow-md hover:border-secondary transition-all p-6 group text-left cursor-pointer"
          >
            <span className="material-symbols-outlined text-secondary text-[36px] block" style={{ fontVariationSettings: "'FILL' 0" }}>width_full</span>
            <h3 className="font-headline font-bold text-xl text-primary mt-3">Banner e Placa</h3>
            <p className="text-on-surface-variant text-sm mt-2 leading-relaxed">Alta resolução para impressão em comitês, fachadas e espaços públicos. Horizontal ou vertical.</p>
            <span className="inline-flex items-center gap-1 text-secondary font-semibold text-sm mt-4 group-hover:underline">Ver exemplo →</span>
          </button>
        </div>
      </section>

      {/* ── Modal ─────────────────────────────────────────────── */}
      {selected && Preview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full overflow-hidden"
            style={{ maxWidth: '28rem' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
              <p className="font-headline font-bold text-primary">{TITLES[selected]}</p>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 rounded-full hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Preview */}
            <Preview />

            {/* Footer CTA */}
            <div className="px-6 pb-6 flex gap-3">
              <Link
                href={`/order/${selected}`}
                className="flex-1 bg-secondary text-on-secondary text-center font-headline font-bold py-3 px-4 rounded-xl hover:brightness-110 transition-all text-sm"
              >
                Gerar agora →
              </Link>
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-3 rounded-xl border border-outline-variant text-on-surface-variant hover:bg-surface-container transition-colors text-sm"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
