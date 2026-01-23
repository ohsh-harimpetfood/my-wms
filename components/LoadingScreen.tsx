// components/LoadingScreen.tsx
"use client";

import { useEffect, useState } from "react";
import { Database, Server, Layout, ShieldCheck, Zap } from "lucide-react";

export default function LoadingScreen() {
  // ✨ 화면 표시 여부 상태 (기본값: true)
  const [isVisible, setIsVisible] = useState(true);
  const [currentMsgIndex, setCurrentMsgIndex] = useState(0);

  const loadingMessages = [
    { text: "P2DX WMS 시스템 초기화 중...", icon: <Zap size={18} /> },
    { text: "Supabase 클라우드 데이터베이스 연결...", icon: <Database size={18} /> },
    { text: "사용자 보안 및 권한 검증...", icon: <ShieldCheck size={18} /> },
    { text: "Next.js 서버 사이드 렌더링 구성...", icon: <Server size={18} /> },
    { text: "실시간 재고 트랜잭션 동기화...", icon: <Layout size={18} /> },
    { text: "UI 리소스 및 에셋 로딩 완료.", icon: <Zap size={18} /> },
  ];

  useEffect(() => {
    // 1. 문구 변경 인터벌 (0.4초마다 빠르게)
    const msgInterval = setInterval(() => {
      setCurrentMsgIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 400);

    // ✨ 2. 2.5초 뒤에 로딩 화면 종료 (Self-Destruct)
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2500);

    return () => {
      clearInterval(msgInterval);
      clearTimeout(timer);
    };
  }, []);

  // ✨ 보이지 않게 되면 null을 반환하여 DOM에서 제거
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center font-mono animate-fade-in">
      
      {/* 이중 스피너 애니메이션 */}
      <div className="relative w-24 h-24 mb-8">
        <div className="absolute inset-0 border-4 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-4 border-4 border-t-transparent border-r-blue-400 border-b-transparent border-l-purple-400 rounded-full animate-spin-reverse opacity-70"></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-white font-black text-xs tracking-widest animate-pulse">P2DX</span>
        </div>
      </div>

      {/* 로딩 문구 */}
      <div className="h-8 flex items-center gap-3 text-blue-400 font-bold text-sm md:text-base animate-fade-in transition-all duration-300">
        <span className="animate-bounce">{loadingMessages[currentMsgIndex].icon}</span>
        <span>{loadingMessages[currentMsgIndex].text}</span>
      </div>

      {/* 진행바 */}
      <div className="w-64 h-1 bg-gray-900 rounded-full mt-6 overflow-hidden relative">
        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-600 to-purple-600 animate-progress-loading w-full"></div>
      </div>
      
      <p className="text-gray-600 text-xs mt-2">v1.0.0 Build 20260121</p>
    </div>
  );
}