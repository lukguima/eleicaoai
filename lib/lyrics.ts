import type { Candidate, JingleStyle } from '@/types'
import { chatCompletion } from '@/lib/llm'

// ============================================================
// Geração de LETRA do jingle via DeepSeek.
// Síncrono e barato — o usuário revisa/edita antes de gastar a música.
// A letra sai estruturada (verso/refrão) com nome, número e slogan corretos.
// ============================================================

/** Remove quebras/instruções que poderiam ser usadas para prompt injection. */
function clean(v: string, max = 160): string {
  return v
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1f\x7f]/g, ' ')            // caracteres de controle
    .replace(/[`{}<>]/g, ' ')                     // delimitadores comuns
    .replace(/\b(system|assistant|user)\s*:/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
}

const STYLE_HINT: Record<JingleStyle, string> = {
  'Sertanejo Universitário': 'ritmo sertanejo animado, linguagem do interior, emocional',
  'Forró': 'forró pé de serra animado, nordestino, dançante',
  'Funk Gospel': 'funk melódico positivo, batida marcante, mensagem de esperança',
  'MPB': 'MPB leve e poética, urbana, sofisticada',
  'Pagode': 'pagode descontraído, alto-astral, popular',
  'Rap Político': 'rap direto e ritmado, engajado, versos com atitude',
}

/**
 * Gera a letra do jingle. `extra` são instruções livres opcionais do usuário.
 * Nunca menciona adversários; sempre inclui o número cantado no refrão.
 */
export async function generateLyrics(
  candidate: Candidate,
  style: JingleStyle,
  extra?: string,
  currentLyrics?: string,
): Promise<string> {
  const name = clean(candidate.name, 80)
  const number = clean(candidate.election_number, 6)
  const party = clean(candidate.party, 60)
  const slogan = candidate.slogan ? clean(candidate.slogan, 100) : ''
  const bio = clean(candidate.biography_summary ?? '', 300)
  const userExtra = extra ? clean(extra, 200) : ''

  const system = [
    'Você é um compositor brasileiro especialista em jingles eleitorais.',
    'Escreva letras curtas, com rima simples e refrão grudento que repita o NÚMERO do candidato.',
    'Regras obrigatórias: tom positivo; NUNCA cite adversários, outros candidatos ou partidos rivais;',
    'nada ofensivo; foque em esperança, trabalho e propostas. Responda em português do Brasil.',
    'Estruture com marcações [Introdução], [Verso], [Refrão], [Verso], [Refrão].',
    'Não escreva aviso de IA, disclaimer legal nem a frase "conteúdo fabricado".',
    'Não escreva nada além da letra (sem explicações).',
  ].join(' ')

  const user = [
    `Candidato: ${name}.`,
    `Número: ${number} (deve ser cantado e repetido no refrão).`,
    `Partido: ${party}.`,
    slogan ? `Slogan: "${slogan}".` : '',
    bio ? `Trajetória: ${bio}.` : '',
    `Estilo musical: ${style} — ${STYLE_HINT[style]}.`,
    userExtra ? `Pedido extra do candidato: ${userExtra}.` : '',
    currentLyrics
      ? `A letra atual (só como referência do que melhorar — escreva uma versão NOVA, mais grudenta, sem copiar verso a verso):\n${clean(currentLyrics, 700)}`
      : '',
    'Gere a letra completa do jingle (30 a 60 segundos de música).',
  ].filter(Boolean).join('\n')

  return chatCompletion(
    [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    { temperature: 0.9, max_tokens: 500, timeoutMs: 45_000 },
  )
}
