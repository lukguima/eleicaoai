export function publicSlug(name: string, number: string): string {
  const base = name
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  const num = number.replace(/\D/g, '').slice(0, 6)
  return `${base || 'candidato'}-${num || '00'}`
}
