import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { defaultDesignFromCandidate } from '@/lib/design'
import { finalizeVisualAsset, type VisualType } from '@/lib/finalize-design'
import { VISUAL_ASSET_TYPES } from '@/lib/entitlements'
import { generateLyrics } from '@/lib/lyrics'
import { generateWeekPlan, caboApproach } from '@/lib/captions'
import { quietPeriodResponse } from '@/lib/quiet-period'
import { officeLabel } from '@/lib/office'
import { captureError, requestIdFrom, log } from '@/lib/log'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse, Candidate, JingleStyle } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 300

// ── POST /api/v1/kit/generate ─────────────────────────────────
// Gera as artes contratadas em lote + letra do jingle + calendário da semana.
// Idempotente: peças já prontas são puladas. Música do jingle NÃO é gerada.

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

    const rl = rateLimit(`kit:${user.id}`, { limit: 6, windowMs: 10 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Aguarde alguns minutos para gerar o kit de novo.' }, { status: 429 })
    }

    const { data: candidate } = await supabase
      .from('candidates')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (!candidate) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Cadastre seus dados antes de gerar o kit.' }, { status: 404 })
    }

    const [{ data: entitlements }, { data: assets }] = await Promise.all([
      supabase.from('entitlements').select('asset_type, status').eq('candidate_id', candidate.id),
      supabase.from('assets').select('id, asset_type, status, design, metadata, lyrics').eq('candidate_id', candidate.id),
    ])

    const entitled = new Set((entitlements ?? []).map(e => e.asset_type as string))
    if (entitled.size === 0) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Contrate um pacote para gerar o kit.' }, { status: 402 })
    }

    const doneTypes = new Set((assets ?? []).filter(a => a.status === 'done').map(a => a.asset_type as string))
    const generated: string[] = []
    const skipped: string[] = []
    const failed: string[] = []

    const cand = candidate as Candidate
    const design = defaultDesignFromCandidate(cand)

    for (const assetType of VISUAL_ASSET_TYPES) {
      if (!entitled.has(assetType)) continue
      if (doneTypes.has(assetType)) { skipped.push(assetType); continue }

      try {
        const existing = (assets ?? []).find(a => a.asset_type === assetType && a.status !== 'done')
        let assetId = existing?.id as string | undefined
        if (!assetId) {
          const { data: created, error } = await supabase.from('assets').insert({
            candidate_id: candidate.id,
            asset_type: assetType,
            status: 'pending',
            design,
            metadata: { editor: true, kit: true },
          }).select('id').single()
          if (error || !created) throw error ?? new Error('insert')
          assetId = created.id
        }
        if (!assetId) throw new Error('insert')

        const result = await finalizeVisualAsset({
          assetId,
          candidateId: candidate.id,
          assetType: assetType as VisualType,
          design: (existing?.design as typeof design) || design,
          existingMeta: (existing?.metadata as Record<string, unknown>) ?? { kit: true },
        })
        if (!result.ok) { failed.push(assetType); continue }
        generated.push(assetType)
      } catch (err) {
        captureError(err, { request_id, tenant_id: candidate.id, asset_type: assetType }, 'kit/generate: falha em peça visual')
        failed.push(assetType)
      }
    }

    let lyrics: string | null = candidate.jingle_lyrics_draft ?? null
    if (entitled.has('jingle') && !lyrics) {
      try {
        const style = (candidate.jingle_style as JingleStyle) || 'Sertanejo Universitário'
        lyrics = await generateLyrics(cand, style)
        await supabase.from('candidates').update({ jingle_lyrics_draft: lyrics }).eq('id', candidate.id)
      } catch (err) {
        captureError(err, { request_id, tenant_id: candidate.id }, 'kit/generate: falha na letra do jingle')
      }
    }

    let week_plan = candidate.week_plan
    if (!week_plan) {
      try {
        week_plan = await generateWeekPlan({
          name: cand.name,
          number: cand.election_number,
          party: cand.party,
          office: officeLabel(cand.office),
          slogan: cand.slogan,
          bio: cand.biography_summary,
        })
        const origin = process.env.NEXT_PUBLIC_APP_URL || ''
        const site = cand.public_slug && origin ? `${origin.replace(/\/$/, '')}/c/${cand.public_slug}` : undefined
        const cabo = caboApproach(cand.name, cand.election_number, cand.slogan, site)
        await supabase.from('candidates').update({
          week_plan: [...week_plan, { day: 0, theme: 'cabo', format: 'feed', caption: cabo, reel_script: '' }],
        }).eq('id', candidate.id)
      } catch (err) {
        captureError(err, { request_id, tenant_id: candidate.id }, 'kit/generate: falha no calendário')
      }
    }

    log.info({ request_id, tenant_id: candidate.id, generated, skipped, failed }, 'kit/generate: lote concluído')

    return NextResponse.json<ApiResponse>({
      success: true,
      data: { generated, skipped, failed, has_lyrics: !!lyrics },
    })
  } catch (err) {
    captureError(err, { request_id }, 'kit/generate: erro inesperado')
    return NextResponse.json<ApiResponse>({ success: false, error: 'Não foi possível montar o kit. Tente de novo pelo painel.' }, { status: 500 })
  }
}
