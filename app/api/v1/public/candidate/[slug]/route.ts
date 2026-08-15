import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { officeLabel } from '@/lib/office'
import { captureError, requestIdFrom } from '@/lib/log'
import type { ApiResponse, Office } from '@/types'

export const runtime = 'nodejs'

const PUBLIC_FIELDS = 'name, election_number, party, slogan, biography_summary, primary_color, secondary_color, base_photo_url, base_photo_cutout_url, office, uf, campaign_cnpj, whatsapp, public_slug'

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const request_id = requestIdFrom(req)
  try {
    const { slug } = await params
    if (!slug || slug.length > 80) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Não encontrado.' }, { status: 404 })
    }

    const supabase = createServerClient()
    const { data } = await supabase
      .from('candidates')
      .select(PUBLIC_FIELDS)
      .eq('public_slug', slug)
      .maybeSingle()

    if (!data) {
      return NextResponse.json<ApiResponse>({ success: false, error: 'Não encontrado.' }, { status: 404 })
    }

    return NextResponse.json<ApiResponse>({
      success: true,
      data: {
        ...data,
        office_label: officeLabel(data.office as Office | undefined),
      },
    })
  } catch (err) {
    captureError(err, { request_id }, 'public/candidate: erro')
    return NextResponse.json<ApiResponse>({ success: false, error: 'Não encontrado.' }, { status: 404 })
  }
}
