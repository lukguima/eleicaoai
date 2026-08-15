import { chatCompletion } from '@/lib/llm'

function fallbackSlogans(name: string, number: string): string[] {
  const n = name.split(' ')[0] || 'Vamos'
  return [
    `${n} ${number} — trabalho de verdade`,
    `Vote ${number}. Gente que resolve.`,
    `${number}: a mudança que a gente vê`,
  ]
}

export async function generateSlogans(input: {
  name: string
  number: string
  party: string
  office: string
  bio: string
}): Promise<string[]> {
  const fallback = fallbackSlogans(input.name, input.number)
  try {
    const raw = await chatCompletion(
      [
        {
          role: 'system',
          content:
            'Você cria slogans eleitorais brasileiros curtos (máx. 8 palavras). Tom positivo. Nunca cite adversários. Responda SOMENTE um JSON array com 3 strings.',
        },
        {
          role: 'user',
          content: `Candidato: ${input.name}. Número: ${input.number}. Partido: ${input.party}. Cargo: ${input.office}. Bio: ${input.bio.slice(0, 400)}`,
        },
      ],
      { temperature: 0.8, max_tokens: 200, timeoutMs: 20_000 },
    )
    const match = raw.match(/\[[\s\S]*\]/)
    const parsed = match ? JSON.parse(match[0]) as unknown : null
    if (Array.isArray(parsed) && parsed.every(s => typeof s === 'string') && parsed.length >= 3) {
      return parsed.slice(0, 3).map(s => s.slice(0, 100))
    }
  } catch {
    /* fallback */
  }
  return fallback
}
