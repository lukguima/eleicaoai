import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Rotas que exigem login
const PROTECTED = ['/dashboard', '/order', '/orders', '/editor', '/payment']

// Rotas que usuários JÁ logados não devem ver (landing page de vendas)
const AUTH_ONLY = ['/']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  // Cria cliente Supabase com cookies do request
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Usuário logado acessa "/" → manda para o dashboard
  if (session && AUTH_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Usuário não logado acessa rota protegida → manda para login
  const isProtected = PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (!session && isProtected) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  // Exclui arquivos estáticos, API routes e imagens para não criar overhead
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|examples|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.webp$).*)',
  ],
}
