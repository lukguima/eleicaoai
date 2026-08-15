// Textos de rótulo TSE — arquivo sem dependência de servidor
// (usado no preview do editor e no render).
// Res. TSE nº 23.610/2019 art. 9º-B, com redação da Res. 23.755/2026:
// informar que o conteúdo foi fabricado/manipulado E qual tecnologia.

export const IMAGE_WATERMARK_TEXT = 'Conteúdo fabricado com IA (EleiçãoAI · template)'
export const AUDIO_COMPLIANCE_INTRO =
  'Este conteúdo foi fabricado utilizando inteligência artificial, tecnologia EleiçãoAI com Suno.'

export function isAiLabelOn(design: { show_ai_label?: boolean } | null | undefined): boolean {
  return design?.show_ai_label !== false
}

export function isCnpjOn(design: { show_cnpj?: boolean } | null | undefined): boolean {
  return design?.show_cnpj !== false
}

export function complianceLabel(cnpj?: string, showAi = true, showCnpj = true): string {
  const parts: string[] = []
  if (showAi) parts.push(IMAGE_WATERMARK_TEXT)
  if (showCnpj && cnpj) parts.push(`CNPJ ${cnpj}`)
  return parts.join(' · ')
}

export const QUIET_PERIOD_MESSAGE =
  'A legislação eleitoral veda gerar conteúdo sintético novo nas 72 horas anteriores e 24 horas posteriores ao pleito (Res. TSE nº 23.755/2026). Você ainda pode baixar o que já está pronto.'
