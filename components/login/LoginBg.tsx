'use client';

import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import LoginBgMobile from './LoginBgMobile';

// ⚡ Code Splitting: 3D 컴포넌트는 필요할 때만 로드
// ✅ default export를 확실히 가져오도록 then(m => m.default)로 고정
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
      {isMobile ? <LoginBgMobile /> : <LoginBgDesktop3D />}

      <div className="absolute inset-0 bg-black/0" />

      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </div>
  );
}
