"use client";

import { useEffect, useState } from "react";
import { Database, Server, Layout, ShieldCheck, Zap, Trash2, LogOut, RefreshCcw } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";

interface LoadingScreenProps {
  mode?: 'initial' | 'reboot';
  onFinished?: () => void;
}

export default function LoadingScreen({ mode = 'initial', onFinished }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [currentMsgIndex, setCurrentMsgIndex] = useState(0);
  const { signOut } = useAuth();

  const initialMessages = [
    { text: "P2DX WMS 시스템 초기화 중...", icon: <Zap size={18} /> },
    { text: "Supabase 클라우드 데이터베이스 연결...", icon: <Database size={18} /> },
    { text: "사용자 보안 및 권한 검증...", icon: <ShieldCheck size={18} /> },
    { text: "Next.js 서버 사이드 렌더링 구성...", icon: <Server size={18} /> },
    { text: "실시간 재고 트랜잭션 동기화...", icon: <Layout size={18} /> },
    { text: "UI 리소스 및 에셋 로딩 완료.", icon: <Zap size={18} /> },
  ];

  const rebootMessages = [
    { text: "시스템 재부팅 시퀀스 가동...", icon: <RefreshCcw size={18} /> },
    { text: "로컬 캐시 및 세션 스토리지 정리 중...", icon: <Trash2 size={18} /> },
    { text: "데이터베이스 연결 해제 중...", icon: <LogOut size={18} /> },
    { text: "보안 토큰 파기 및 사용자 로그아웃...", icon: <ShieldCheck size={18} /> },
    { text: "시스템 재시작 중...", icon: <Zap size={18} /> },
  ];

  const messages = mode === 'reboot' ? rebootMessages : initialMessages;

  useEffect(() => {
    // 1. 메시지 롤링
    const msgInterval = setInterval(() => {
      setCurrentMsgIndex((prev) => (prev + 1) % messages.length);
    }, 400);

    // 2. 종료 로직 (3초 후 실행)
    const timer = setTimeout(() => {
      if (mode === 'reboot') {
        // 🚀 [수정] await 제거: 응답을 기다리지 않고 즉시 실행 (멈춤 방지)
        try {
          sessionStorage.clear();
          localStorage.clear();
          signOut(); // 요청만 보내고 결과는 무시
        } catch (e) {
          console.error("Cleanup error", e);
        }
        
        // 🚀 [핵심] 무조건 로그인 페이지로 이동
        window.location.href = "/login";
      } else {
        setIsVisible(false);
        if (onFinished) onFinished();
      }
    }, 3000);

    return () => {
      clearInterval(msgInterval);
      clearTimeout(timer);
    };
  }, [mode, messages.length, onFinished, signOut]);

  if (!isVisible) return null;

  // 모드별 디자인 분기
  const subColor = mode === 'reboot' ? 'border-t-red-500 border-b-orange-500' : 'border-t-blue-500 border-b-purple-500';
  const progressGradient = mode === 'reboot' ? 'bg-gradient-to-r from-red-600 to-orange-600' : 'bg-gradient-to-r from-blue-600 to-purple-600';

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center font-mono animate-fade-in cursor-wait">
      <div className="relative w-24 h-24 mb-8">
        <div className={`absolute inset-0 border-4 ${subColor} border-r-transparent border-l-transparent rounded-full animate-spin`}></div>
        <div className={`absolute inset-4 border-4 border-t-transparent border-r-gray-600 border-l-gray-600 border-b-transparent rounded-full animate-spin-reverse opacity-70`}></div>
        <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-black text-xs tracking-widest animate-pulse ${mode === 'reboot' ? 'text-red-500' : 'text-white'}`}>
                {mode === 'reboot' ? 'RESET' : 'P2DX'}
            </span>
        </div>
      </div>

      <div className={`h-8 flex items-center gap-3 font-bold text-sm md:text-base animate-fade-in transition-all duration-300 ${mode === 'reboot' ? 'text-red-400' : 'text-blue-400'}`}>
        <span className="animate-bounce">{messages[currentMsgIndex].icon}</span>
        <span>{messages[currentMsgIndex].text}</span>
      </div>

      <div className="w-64 h-1 bg-gray-900 rounded-full mt-6 overflow-hidden relative">
        <div className={`absolute top-0 left-0 h-full w-full animate-progress-loading ${progressGradient}`}></div>
      </div>
      
      <p className="text-gray-600 text-xs mt-2">v1.0.0 Build 20260121</p>
    </div>
  );
}