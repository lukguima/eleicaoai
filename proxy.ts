import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED = ['/dashboard', '/onboarding', '/planos', '/criar', '/orders', '/payment']
const AUTH_ONLY = ['/']

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

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

  if (session && AUTH_ONLY.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  const isProtected = PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/'))
  if (!session && isProtected) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|examples|.*\\.svg$|.*\\.png$|.*\\.jpg$|.*\\.webp$).*)',
  ],
}
