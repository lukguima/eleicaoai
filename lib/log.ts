// ============================================================
// Log estruturado em JSON (padrão de engenharia RNF02).
// Proibido console.log em produção — use este logger.
// Campos mínimos: timestamp, level, service, tenant_id, user_id,
// request_id, message. tenant_id ~ candidate_id neste produto.
// ============================================================

type Level = 'INFO' | 'WARN' | 'ERROR'

const SERVICE = process.env.SERVICE_NAME ?? 'eleicaoai'

export interface LogContext {
  request_id?: string
  tenant_id?: string   // = candidate_id neste app
  user_id?: string
  [key: string]: unknown
}

function emit(level: Level, ctx: LogContext, message: string) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    service: SERVICE,
    tenant_id: ctx.tenant_id ?? null,
    user_id: ctx.user_id ?? null,
    request_id: ctx.request_id ?? null,
    ...ctx,
    message,
  })
  if (level === 'ERROR') process.stderr.write(line + '\n')
  else process.stdout.write(line + '\n')
}

export const log = {
  info: (ctx: LogContext, message: string) => emit('INFO', ctx, message),
  warn: (ctx: LogContext, message: string) => emit('WARN', ctx, message),
  error: (ctx: LogContext, message: string) => emit('ERROR', ctx, message),
}

/**
 * Captura um erro: registra em JSON estruturado e é o ponto de integração
 * com o Sentry (quando o DSN for configurado — ver docs/PADROES-GAP.md).
 * Nunca inclua PII/segredos no contexto.
 */
export function captureError(err: unknown, ctx: LogContext, message: string) {
  const detail = err instanceof Error ? { err_name: err.name, err_message: err.message } : { err: String(err) }
  emit('ERROR', { ...ctx, ...detail }, message)
  // Integração Sentry (opcional): se @sentry/nextjs estiver instalado e SENTRY_DSN
  // configurado, capture aqui. Mantido desacoplado para não exigir a dependência.
}

/** Lê o X-Request-ID propagado (client/middleware) ou gera um novo para a requisição. */
export function requestIdFrom(req: Request): string {
  return req.headers.get('x-request-id') ?? crypto.randomUUID()
}
