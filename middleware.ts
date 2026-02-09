import { createServerClient, type CookieOptions } from '@supabase/ssr'
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

  // 1. 유저 인증 정보 확인
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  const isPublicPage = path === '/login' || path === '/signup'

  // 2. 비로그인 유저 보호
  if (!user && !isPublicPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 3. 로그인 유저 권한 기반 보호 (GUEST 제한)
  if (user) {
    if (isPublicPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // ✨ [추가] DB에서 프로필 정보를 가져와 권한 확인
    // 서버 사이드에서 직접 profiles 테이블을 확인합니다.
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // 🚫 GUEST 권한 제한 로직
    // 대시보드 외의 기능 페이지(/inventory, /inbound, /outbound, /master, /admin 등) 접근 시도 시
    const isDashboard = path === '/dashboard'
    const isGuest = profile?.role === 'GUEST'

    if (isGuest && !isDashboard) {
      // 게스트는 대시보드 외에는 접근 불가 -> 대시보드로 강제 리다이렉트
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // 4. 루트('/') 접속 처리
  if (path === '/') {
    return NextResponse.redirect(new URL(user ? '/dashboard' : '/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}