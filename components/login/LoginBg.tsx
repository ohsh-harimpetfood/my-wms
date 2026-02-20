'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import LoginBgMobile from './LoginBgMobile';

// ⚡ Code Splitting
const LoginBgDesktop3D = dynamic(
  () => import('./LoginBgDesktop3D').then((m) => m.default),
  {
    ssr: false,
    loading: () => <LoginBgMobile />,
  }
);

export default function LoginBg() {
  const [isMobile, setIsMobile] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => {
      const isTouch = window.matchMedia('(pointer: coarse)').matches;
      const isSmall = window.innerWidth < 768;
      setIsMobile(isTouch || isSmall);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!mounted) return <div className="absolute inset-0 bg-black" />;

  return (
    <div className="absolute inset-0 -z-10 bg-black overflow-hidden">
      {/* 1. 배경 컴포넌트 렌더링 */}
      {isMobile ? <LoginBgMobile /> : <LoginBgDesktop3D />}

      {/* 2. 전체 오버레이 (완전 투명하게 설정됨) */}
      <div className="absolute inset-0 bg-black/0" />

      {/* 3. 비네팅 (가장자리 어둡게 하기) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isMobile
            ? // 🚀 [수정] 모바일: 가장자리를 훨씬 연하게 (0.4) 하여 배경이 잘 보이게 함
              'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.1) 70%, rgba(0,0,0,0.4) 100%)'
            : // 데스크탑: 기존대로 깊이감 유지
              'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </div>
  );
}