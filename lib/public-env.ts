export type PublicEnv = {
  supabaseUrl: string
  supabaseAnon: string
}

declare global {
  interface Window {
    __ELEICAO_PUBLIC__?: PublicEnv
  }
}

function usable(url: string | undefined): url is string {
  return !!url && !url.includes('placeholder.supabase')
}

/** URL/anon do Supabase: no browser usa o valor injetado em runtime; no server lê o env. */
export function publicSupabase(): PublicEnv {
  if (typeof window !== 'undefined') {
    const injected = window.__ELEICAO_PUBLIC__
    if (injected && usable(injected.supabaseUrl) && injected.supabaseAnon) {
      return injected
    }
  }
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  if (!usable(supabaseUrl) || !supabaseAnon) {
    throw new Error('Configuração incompleta: defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no Coolify.')
  }
  return { supabaseUrl, supabaseAnon }
}
