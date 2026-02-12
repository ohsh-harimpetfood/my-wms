import { NextResponse } from 'next/server'
// utils/supabase/server 경로가 맞는지 확인하세요.
// 만약 ssr 패키지를 직접 쓴다면 import { createServerClient } ... 로 변경해야 합니다.
import { createClient } from '@/utils/supabase/server' 

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // next 파라미터가 있으면 거기로 가고, 없으면 홈(/)으로 이동
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    
    // 🚀 여기서 일회용 코드를 진짜 세션으로 교환합니다.
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // 성공하면 지정된 페이지(reset-password)로 이동
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 실패하면 에러 페이지로 이동
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}