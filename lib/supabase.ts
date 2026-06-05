import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ── Cliente server-side (service_role — NUNCA expor no frontend) ──
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Supabase server env vars não configuradas')
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

// ── Cliente browser — singleton para evitar múltiplas instâncias ──
let browserClient: SupabaseClient | null = null

export function createBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error('Supabase browser env vars não configuradas')
  }

  browserClient = createClient(url, key)
  return browserClient
}
