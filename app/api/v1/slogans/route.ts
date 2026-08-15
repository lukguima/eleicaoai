import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateSlogans } from '@/lib/slogans'
import { quietPeriodResponse } from '@/lib/quiet-period'
import { rateLimit } from '@/lib/rate-limit'
import { captureError, requestIdFrom } from '@/lib/log'
import { officeLabel } from '@/lib/office'
import type { ApiResponse, Office } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const request_id = requestIdFrom(req)
  const blocked = quietPeriodResponse()
  if (blocked) return blocked

  try {
    const supabase = createServerClient()
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }
    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Credenciais inválidas.' }, { status: 401 })
    }

    const rl = rateLimit(`slogans:${user.id}`, { limit: 20, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Muitas gerações. Aguarde alguns minutos.' }, { status: 429 })
    }

    const body = await req.json() as { name?: string; number?: string; party?: string; office?: Office; bio?: string }
    const name = String(body.name || '').slice(0, 80)
    const number = String(body.number || '').replace(/\D/g, '').slice(0, 6)
    const party = String(body.party || '').slice(0, 60)
    const bio = String(body.bio || '').slice(0, 500)
    if (name.length < 2 || number.length < 2 || bio.length < 20) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Preencha nome, número e uma bio curta antes.' }, { status: 400 })
    }

    const slogans = await generateSlogans({
      name, number, party, bio,
      office: officeLabel(body.office),
    })
    return NextResponse.json<ApiResponse>({ success: true, data: { slogans } })
  } catch (err) {
    captureError(err, { request_id }, 'slogans: erro ao gerar')
    return NextResponse.json<ApiResponse>({ success: false, error: 'Não foi possível sugerir slogans.' }, { status: 500 })
  }
}
