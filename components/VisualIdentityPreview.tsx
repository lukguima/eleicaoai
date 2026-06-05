'use client'

import { useMemo } from 'react'
import type { Candidate } from '@/types'

interface Props {
  candidate: Candidate
}

const ASSET_LABELS: Record<string, { label: string; ratio: string; w: number; h: number }> = {
  santinho:  { label: 'Santinho',  ratio: '3:4',  w: 90,  h: 120 },
  banner:    { label: 'Banner',    ratio: '2:3',  w: 80,  h: 120 },
  perfurado: { label: 'Perfurado', ratio: '5:2',  w: 150, h: 60  },
  social:    { label: 'Social',    ratio: '1:1',  w: 100, h: 100 },
  jingle:    { label: 'Jingle',   ratio: '1:1',  w: 80,  h: 80  },
}

export default function VisualIdentityPreview({ candidate }: Props) {
  const { primary_color, secondary_color, name, election_number, party, slogan } = candidate

  const contrast = useMemo(() => getContrastColor(primary_color), [primary_color])

  return (
    <div className="space-y-6">
      {/* Paleta de cores */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Identidade Visual
        </h3>
        <div className="flex gap-4 items-center">
          <ColorSwatch color={primary_color} label="Cor Primária" />
          <ColorSwatch color={secondary_color} label="Cor Secundária" />
          <ColorSwatch color={contrast} label="Contraste (calculado)" />
        </div>
      </section>

      {/* Preview do "santinho" mockup */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Mockup de Santinho
        </h3>
        <div
          className="relative rounded-lg overflow-hidden shadow-lg flex flex-col items-center justify-between p-4"
          style={{
            background: `linear-gradient(160deg, ${primary_color} 60%, ${secondary_color})`,
            width: 160,
            height: 210,
            color: contrast,
          }}
        >
          {/* Foto placeholder */}
          <div
            className="rounded-full flex items-center justify-center text-2xl font-bold mt-2"
            style={{
              width: 72,
              height: 72,
              background: secondary_color,
              color: primary_color,
              border: `3px solid ${contrast}`,
            }}
          >
            {initials(name)}
          </div>

          <div className="text-center mt-2 flex-1 flex flex-col justify-center gap-1">
            <p className="font-extrabold text-sm leading-tight">{name}</p>
            <p className="text-xs opacity-80">{party}</p>
            {slogan && (
              <p className="text-xs italic opacity-70 mt-1 leading-tight">&ldquo;{slogan}&rdquo;</p>
            )}
          </div>

          {/* Número */}
          <div
            className="w-full rounded py-1 text-center font-black text-lg tracking-widest"
            style={{ background: secondary_color, color: primary_color }}
          >
            {election_number}
          </div>

          {/* Rodapé TSE */}
          <div
            className="w-full text-center text-[7px] mt-1 opacity-50 leading-tight"
            style={{ color: contrast }}
          >
            Conteúdo fabricado com IA
          </div>
        </div>
      </section>

      {/* Grid de proporções por tipo */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Formatos de Peças
        </h3>
        <div className="flex flex-wrap gap-4 items-end">
          {Object.entries(ASSET_LABELS).map(([type, info]) => (
            <div key={type} className="flex flex-col items-center gap-1">
              <div
                className="rounded border-2 flex items-center justify-center text-[9px] font-semibold"
                style={{
                  width: info.w,
                  height: info.h,
                  background: `linear-gradient(135deg, ${primary_color}33, ${secondary_color}66)`,
                  borderColor: primary_color,
                  color: primary_color,
                }}
              >
                {info.ratio}
              </div>
              <span className="text-xs text-gray-600">{info.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Tipografia */}
      <section>
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Tipografia de Campanha
        </h3>
        <div className="space-y-1">
          <p
            className="text-2xl font-extrabold leading-none"
            style={{ color: primary_color }}
          >
            {name}
          </p>
          <p className="text-base font-bold text-gray-700">{party} · #{election_number}</p>
          {slogan && (
            <p className="text-sm italic text-gray-500">&ldquo;{slogan}&rdquo;</p>
          )}
        </div>
      </section>
    </div>
  )
}

// ── helpers ─────────────────────────────────────────────────────

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-12 h-12 rounded-full border border-gray-200 shadow-sm"
        style={{ background: color }}
        title={color}
      />
      <span className="text-[10px] text-gray-500 text-center leading-tight max-w-[56px]">
        {label}
      </span>
      <span className="text-[10px] font-mono text-gray-400">{color}</span>
    </div>
  )
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

/** Retorna #000 ou #fff baseado no luminance da cor de fundo. */
function getContrastColor(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  // Relative luminance (WCAG 2.1)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}
