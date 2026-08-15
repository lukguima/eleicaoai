// Cliente LLM — DeepSeek (API compatível com OpenAI chat completions).

const API = 'https://api.deepseek.com/v1/chat/completions'
const MODEL = 'deepseek-chat'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[]
  error?: { message?: string }
}

export function llmApiKey(): string {
  const k = process.env.DEEPSEEK_API_KEY
  if (!k) throw new Error('DEEPSEEK_API_KEY não configurada')
  return k
}

export async function chatCompletion(
  messages: ChatMessage[],
  opts: { temperature?: number; max_tokens?: number; timeoutMs?: number } = {},
): Promise<string> {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${llmApiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: opts.temperature ?? 0.8,
      max_tokens: opts.max_tokens ?? 500,
    }),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 45_000),
  })

  const json = (await res.json()) as ChatResponse
  if (!res.ok || json.error) {
    const raw = json.error?.message ?? `HTTP ${res.status}`
    if (res.status === 401 || /incorrect api key|invalid api key|authentication|unauthorized/i.test(raw)) {
      throw new Error('A chave da DeepSeek está inválida ou expirada. Atualize DEEPSEEK_API_KEY no .env.local e reinicie o servidor.')
    }
    throw new Error(`Erro no gerador de texto: ${raw}`)
  }
  const text = json.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('O gerador de texto não retornou conteúdo.')
  return text
}
