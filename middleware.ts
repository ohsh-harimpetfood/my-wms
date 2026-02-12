import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // 공개 페이지 목록
  const publicPaths = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth']
  const isPublicPage = publicPaths.some(publicPath => path.startsWith(publicPath))

  // 1. 비로그인 유저 보호
  if (!user && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. 로그인 유저 처리
  if (user) {
    // 🚀 [핵심 수정] 로그인 상태라도 '/reset-password'는 접속 허용!
    // 그 외의 공개 페이지(로그인, 회원가입 등) 접근 시에만 대시보드로 이동
    if (isPublicPage && path !== '/reset-password') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // GUEST 권한 체크 (대시보드 외 접근 제한)
    if (path !== '/dashboard') {
        // 성능을 위해 필요 시 주석 처리하거나 최적화 가능
        const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

        if (profile?.role === 'GUEST') {
            return NextResponse.redirect(new URL('/dashboard', request.url))
        }
    }
  }

  if (path === '/') {
    return NextResponse.redirect(new URL(user ? '/dashboard' : '/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}