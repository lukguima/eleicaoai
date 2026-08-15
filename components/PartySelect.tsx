'use client'

import { PARTIES, lookupParty } from '@/lib/parties'

const OTHER = '__outro__'

interface Props {
  value: string
  onChange: (party: string) => void
  className?: string
}

export function PartySelect({ value, onChange, className }: Props) {
  const known = lookupParty(value)
  const selected = known ? known.id : (value.trim() ? OTHER : '')

  return (
    <div className="space-y-2">
      <select
        value={selected}
        onChange={e => {
          const next = e.target.value
          if (!next) onChange('')
          else if (next === OTHER) onChange(known ? '' : value)
          else onChange(next)
        }}
        className={className}
      >
        <option value="">Selecione o partido</option>
        {PARTIES.map(p => (
          <option key={p.id} value={p.id}>{p.id} — {p.name}</option>
        ))}
        <option value={OTHER}>Outro</option>
      </select>
      {selected === OTHER && (
        <input
          value={value}
          maxLength={100}
          onChange={e => onChange(e.target.value)}
          placeholder="Sigla ou nome do partido"
          className={className}
        />
      )}
    </div>
  )
}
