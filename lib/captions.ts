import type { WeekPost } from '@/types'
import { chatCompletion } from '@/lib/llm'

const THEMES = ['saúde', 'educação', 'emprego', 'segurança', 'cidade', 'família', 'voto']

function fallbackWeek(name: string, number: string, party: string): WeekPost[] {
  return THEMES.map((theme, i) => ({
    day: i + 1,
    theme,
    format: i % 2 === 0 ? 'feed' : 'stories',
    caption: `${name} ${number} (${party}). ${theme[0].toUpperCase()}${theme.slice(1)} que chega na vida real. Conteúdo fabricado com IA (EleiçãoAI). Vote ${number}.`,
    reel_script: `Abre no número ${number}. Fala em 15s sobre ${theme}. Fecha: “Me chama, vamos juntos. Vote ${number}.”`,
  }))
}

export async function generateWeekPlan(input: {
  name: string
  number: string
  party: string
  office: string
  slogan?: string
  bio: string
}): Promise<WeekPost[]> {
  const fallback = fallbackWeek(input.name, input.number, input.party)
  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content:
            'Você é assessor de conteúdo de campanha no Brasil. Gere 7 posts (uma semana). Tom falado, brasileiro, curto. Nunca cite adversários. Cada caption DEVE terminar com: "Conteúdo fabricado com IA (EleiçãoAI)." Responda SOMENTE JSON: [{"day":1,"theme":"...","format":"feed"|"stories","caption":"...","reel_script":"..."}]',
        },
        {
          role: 'user',
          content: `Candidato: ${input.name} nº ${input.number}, ${input.party}, cargo ${input.office}. Slogan: ${input.slogan || '—'}. Bio: ${input.bio.slice(0, 400)}`,
        },
      ],
      { temperature: 0.7, max_tokens: 1400, timeoutMs: 30_000 },
    )
    const match = raw.match(/\[[\s\S]*\]/)
    const parsed = match ? JSON.parse(match[0]) as unknown : null
    if (!Array.isArray(parsed) || parsed.length < 7) return fallback
    return parsed.slice(0, 7).map((p, i) => ({
      day: i + 1,
      theme: String((p as WeekPost).theme || THEMES[i]).slice(0, 40),
      format: (p as WeekPost).format === 'stories' ? 'stories' : 'feed',
      caption: String((p as WeekPost).caption || fallback[i].caption).slice(0, 500),
      reel_script: String((p as WeekPost).reel_script || fallback[i].reel_script).slice(0, 400),
    }))
  } catch {
    return fallback
  }
}

export function caboApproach(name: string, number: string, slogan?: string, siteUrl?: string): string {
  const line = slogan ? ` “${slogan}”` : ''
  const site = siteUrl ? `\nMini-site: ${siteUrl}` : ''
  return [
    `Oi, tudo bem? Eu sou cabo da campanha do(a) ${name}, número ${number}.${line}`,
    `Se você puder, anota o ${number} na colinha e leva no dia da eleição.`,
    `Qualquer dúvida, me chama no zap.${site}`,
    '',
    'Conteúdo fabricado com IA (EleiçãoAI).',
  ].join('\n')
}
