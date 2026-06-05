import { createClient } from '@supabase/supabase-js'
import { createBrowserClient as ssrBrowserClient } from '@supabase/ssr'

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

// ── Cliente browser — usa @supabase/ssr para gestão correta de cookies/sessão ──
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return ssrBrowserClient(url, key)
}
