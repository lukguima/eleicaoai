'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import type { CandidateFormData, JingleStyle } from '@/types'

const JINGLE_STYLES: JingleStyle[] = [
  'Sertanejo Universitário',
  'Forró',
  'Funk Gospel',
  'MPB',
  'Pagode',
  'Rap Político',
]

interface Props {
  onSuccess: (candidateId: string) => void
}

export default function CandidateForm({ onSuccess }: Props) {
  const [form, setForm] = useState<CandidateFormData>({
    name: '',
    election_number: '',
    party: '',
    campaign_cnpj: '',
    cpf: '',
    slogan: '',
    biography_summary: '',
    primary_color: '#1a56db',
    secondary_color: '#ffffff',
    jingle_style: 'Sertanejo Universitário',
  })

  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  // Máscara simples de CPF no campo (apenas visual — validação real no backend)
  function formatCpf(value: string) {
    return value
      .replace(/\D/g, '')
      .slice(0, 11)
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }

  // Máscara simples de CNPJ no campo
  function formatCnpj(value: string) {
    return value
      .replace(/\D/g, '')
      .slice(0, 14)
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1/$2')
      .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = e.target.files?.[0]
    if (!file) return

    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp']
    if (!ALLOWED.includes(file.type)) {
      setPhotoError('Use JPEG, PNG ou WebP.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Máximo 5 MB.')
      return
    }
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Pega token do cookie de sessão do Supabase
      const token = document.cookie
        .split(';')
        .find((c) => c.trim().startsWith('sb-access-token='))
        ?.split('=')?.[1]

      const res = await fetch('/api/v1/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(form),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        setError(json.error ?? 'Erro ao criar candidatura.')
        return
      }

      const candidateId: string = json.data.id

      // Upload da foto base, se informada
      if (photoFile) {
        const fd = new FormData()
        fd.append('photo', photoFile)
        await fetch(`/api/v1/candidates/${candidateId}/photo`, {
          method: 'POST',
          headers: { Authorization: token ? `Bearer ${token}` : '' },
          body: fd,
        })
        // Não bloqueia o cadastro se upload falhar — pode reenviar depois
      }

      onSuccess(candidateId)
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6 bg-white rounded-2xl shadow-md">
      <h2 className="text-2xl font-bold text-gray-900">Cadastrar Candidatura</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Dados pessoais */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Dados do Candidato
        </legend>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Nome completo *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={150}
              value={form.name}
              onChange={handleChange}
              placeholder="Rafael Costa"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="election_number" className="block text-sm font-medium text-gray-700 mb-1">
              Número eleitoral *
            </label>
            <input
              id="election_number"
              name="election_number"
              type="text"
              required
              maxLength={6}
              pattern="\d{2,6}"
              value={form.election_number}
              onChange={handleChange}
              placeholder="99"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="party" className="block text-sm font-medium text-gray-700 mb-1">
              Partido *
            </label>
            <input
              id="party"
              name="party"
              type="text"
              required
              maxLength={100}
              value={form.party}
              onChange={handleChange}
              placeholder="Partido da Tecnologia"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="cpf" className="block text-sm font-medium text-gray-700 mb-1">
              CPF *
            </label>
            <input
              id="cpf"
              name="cpf"
              type="text"
              required
              value={form.cpf}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, cpf: formatCpf(e.target.value) }))
              }
              placeholder="000.000.000-00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="campaign_cnpj" className="block text-sm font-medium text-gray-700 mb-1">
              CNPJ da campanha *
            </label>
            <input
              id="campaign_cnpj"
              name="campaign_cnpj"
              type="text"
              required
              value={form.campaign_cnpj}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, campaign_cnpj: formatCnpj(e.target.value) }))
              }
              placeholder="00.000.000/0000-00"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </fieldset>

      {/* Campanha */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Campanha
        </legend>

        <div>
          <label htmlFor="slogan" className="block text-sm font-medium text-gray-700 mb-1">
            Slogan
          </label>
          <input
            id="slogan"
            name="slogan"
            type="text"
            maxLength={100}
            value={form.slogan ?? ''}
            onChange={handleChange}
            placeholder="Experiência que transforma"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="biography_summary" className="block text-sm font-medium text-gray-700 mb-1">
            Biografia resumida * <span className="text-gray-400 font-normal">(alimenta a IA para criar letra e imagens)</span>
          </label>
          <textarea
            id="biography_summary"
            name="biography_summary"
            required
            minLength={20}
            maxLength={500}
            rows={4}
            value={form.biography_summary}
            onChange={handleChange}
            placeholder="Descreva sua trajetória, principais conquistas e propostas. Esse texto é a base para a IA criar seu jingle e materiais visuais."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
          />
          <p className="text-xs text-gray-400 mt-1">{form.biography_summary.length}/500 caracteres</p>
        </div>
      </fieldset>

      {/* Visual */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Identidade Visual
        </legend>

        {/* Foto base */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Foto oficial do candidato
            <span className="text-gray-400 font-normal"> (usada nas peças geradas pela IA)</span>
          </label>
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 cursor-pointer hover:border-blue-400 transition-colors"
              onClick={() => photoInputRef.current?.click()}
            >
              {photoPreview ? (
                <Image
                  src={photoPreview}
                  alt="Foto do candidato"
                  width={80}
                  height={80}
                  className="object-cover w-full h-full rounded-full"
                  unoptimized
                />
              ) : (
                <span className="text-2xl text-gray-400">📷</span>
              )}
            </div>
            <div>
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                {photoPreview ? 'Trocar foto' : 'Adicionar foto'}
              </button>
              <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG ou WebP · máx. 5 MB</p>
              {photoError && (
                <p className="text-xs text-red-600 mt-0.5">{photoError}</p>
              )}
            </div>
          </div>
          <input
            ref={photoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handlePhotoChange}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700 mb-1">
              Cor principal
            </label>
            <div className="flex items-center gap-2">
              <input
                id="primary_color"
                name="primary_color"
                type="color"
                value={form.primary_color}
                onChange={handleChange}
                className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
              />
              <span className="text-sm text-gray-500">{form.primary_color}</span>
            </div>
          </div>

          <div>
            <label htmlFor="secondary_color" className="block text-sm font-medium text-gray-700 mb-1">
              Cor secundária
            </label>
            <div className="flex items-center gap-2">
              <input
                id="secondary_color"
                name="secondary_color"
                type="color"
                value={form.secondary_color}
                onChange={handleChange}
                className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
              />
              <span className="text-sm text-gray-500">{form.secondary_color}</span>
            </div>
          </div>
        </div>
      </fieldset>

      {/* Jingle */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Jingle
        </legend>

        <div>
          <label htmlFor="jingle_style" className="block text-sm font-medium text-gray-700 mb-1">
            Estilo musical
          </label>
          <select
            id="jingle_style"
            name="jingle_style"
            value={form.jingle_style}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {JINGLE_STYLES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </fieldset>

      {/* Aviso LGPD */}
      <p className="text-xs text-gray-400 border-t pt-4">
        Seus dados são tratados conforme a LGPD. O CPF é criptografado e nunca compartilhado.
        Ao continuar, você consente com os{' '}
        <a href="/termos" className="underline">Termos de Uso</a>.
      </p>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors"
      >
        {loading ? 'Salvando...' : 'Cadastrar candidatura'}
      </button>
    </form>
  )
}
