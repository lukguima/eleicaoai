import { NextResponse } from 'next/server'

// ── GET /api/health ───────────────────────────────────────────
// Health check para o Coolify (container health) e testes de carga (K6).
// Leve e sem dependências externas — não consulta banco para não falhar
// o health por lentidão transitória do Supabase.

export const runtime = 'nodejs'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: process.env.SERVICE_NAME ?? 'eleicaoai',
    timestamp: new Date().toISOString(),
  })
}
