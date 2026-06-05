import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { generateImage, analyzeImage, type ImageAnalysis } from '@/lib/image-generator'
import { imageRequestSchema } from '@/lib/validation'
import { consumeCredit, logComplianceEvent } from '@/lib/compliance'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse, Candidate, AssetType } from '@/types'

// POST /api/v1/assets/image
// Dispara geração de imagem em background.
// Pipeline: OpenAI DALL-E 3 → Google Imagen 4 → OpenRouter (DALL-E 3)
// Após geração, analisa a imagem com GPT-4o mini Vision e salva em metadata.

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()

    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Credenciais inválidas.' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Credenciais inválidas.' },
        { status: 401 }
      )
    }

    // Rate limit: 10 gerações por usuário por hora
    const rl = rateLimit(`image-gen:${user.id}`, { limit: 10, windowMs: 60 * 60 * 1000 })
    if (!rl.allowed) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Limite de gerações atingido. Tente novamente em 1 hora.' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)) } }
      )
    }

    const body = await req.json()
    const parsed = imageRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      )
    }

    const { candidate_id, asset_type } = parsed.data

    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidate_id)
      .eq('user_id', user.id)
      .single()

    if (candidateError || !candidate) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Candidatura não encontrada.' },
        { status: 404 }
      )
    }

    const hasCredit = await consumeCredit(candidate_id)
    if (!hasCredit) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Créditos insuficientes. Faça upgrade do seu plano.' },
        { status: 402 }
      )
    }

    const { data: asset, error: assetError } = await supabase
      .from('assets')
      .insert({
        candidate_id,
        asset_type,
        status: 'processing',
        ai_model: process.env.OPENAI_API_KEY ? 'openai/dall-e-3' : process.env.GOOGLE_AI_API_KEY ? 'google/imagen-4' : 'openrouter/dall-e-3',
        metadata: { asset_type },
      })
      .select()
      .single()

    if (assetError || !asset) {
      return NextResponse.json<ApiResponse>(
        { success: false, error: 'Erro ao criar registro de asset.' },
        { status: 500 }
      )
    }

    // Dispara geração em background — não bloqueia a response
    dispatchGeneration(asset.id, candidate_id, candidate as Candidate, asset_type as AssetType).catch(
      err => console.error('[image] dispatch error:', err)
    )

    await logComplianceEvent({
      event_type: 'IMAGE_GENERATION',
      candidate_id,
      asset_id: asset.id,
      ai_model: process.env.OPENAI_API_KEY ? 'openai/dall-e-3' : process.env.GOOGLE_AI_API_KEY ? 'google/imagen-4' : 'openrouter/dall-e-3',
    })

    return NextResponse.json<ApiResponse>(
      {
        success: true,
        data: {
          asset_id: asset.id,
          status: 'processing',
          message: 'Imagem sendo gerada. Isso pode levar até 2 minutos.',
        },
      },
      { status: 202 }
    )
  } catch (err) {
    console.error('[image] error:', err)
    const message =
      err instanceof Error && err.message.includes('bloqueado')
        ? err.message
        : 'Erro interno ao iniciar geração.'
    return NextResponse.json<ApiResponse>({ success: false, error: message }, { status: 500 })
  }
}

const AI_MODEL_LABEL: Record<string, string> = {
  openai:      'openai/dall-e-3',
  imagen:      'google/imagen-4',
  openrouter:  'openrouter/dall-e-3',
}

async function dispatchGeneration(
  assetId: string,
  candidateId: string,
  candidate: Candidate,
  assetType: AssetType
) {
  const supabase = createServerClient()
  console.log(`[image] iniciando geração asset=${assetId} type=${assetType}`)
  try {
    const { url, provider } = await generateImage(candidate, assetType)
    const aiModel = AI_MODEL_LABEL[provider] ?? provider
    console.log(`[image] geração concluída via ${provider} asset=${assetId}`)

    // Vision analysis — runs in parallel-ish but we await before saving
    let analysis: ImageAnalysis | null = null
    if (process.env.OPENAI_API_KEY) {
      try {
        analysis = await analyzeImage(url, assetType, candidate.name)
        console.log(
          `[image] análise vision concluída asset=${assetId} score=${analysis?.quality_score}`
        )
      } catch (vErr) {
        console.warn(`[image] vision analysis falhou (não crítico):`, vErr)
      }
    }

    const { error } = await supabase
      .from('assets')
      .update({
        status: 'done',
        output_url: url,
        ai_model: aiModel,
        ...(analysis ? { metadata: { analysis } } : {}),
      })
      .eq('id', assetId)
      .eq('candidate_id', candidateId)
    if (error) console.error(`[image] erro ao salvar done no DB: ${error.message}`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error(`[image] geração falhou asset=${assetId}:`, msg)
    const { error } = await supabase
      .from('assets')
      .update({ status: 'failed', error_message: msg })
      .eq('id', assetId)
      .eq('candidate_id', candidateId)
    if (error) console.error(`[image] erro ao salvar failed no DB: ${error.message}`)
  }
}
