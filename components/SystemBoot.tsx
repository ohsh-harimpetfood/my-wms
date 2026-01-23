// components/SystemBoot.tsx
"use client";

import { useEffect, useState } from "react";
import { Zap, Database, ShieldCheck, Server, Globe, Cpu, Layers } from "lucide-react";

export default function SystemBoot() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // 1. 세션 스토리지 체크
    const hasBooted = sessionStorage.getItem("p2dx_booted");

    if (!hasBooted) {
      setShow(true);
      
      // ✨ 7.2초(7200ms) 동안 꽉 채운 시퀀스
      const steps = [
        setTimeout(() => setStep(1), 800),  // Core Init
        setTimeout(() => setStep(2), 2000), // Secure Handshake
        setTimeout(() => setStep(3), 3500), // DB Connect (조금 오래 걸리는 척)
        setTimeout(() => setStep(4), 4800), // WMS Modules
        setTimeout(() => setStep(5), 6000), // Integrity Check
        setTimeout(() => setStep(6), 6800), // UI Rendering
        
        // 종료 및 플래그 저장 (7.2초)
        setTimeout(() => {
          setShow(false);
          sessionStorage.setItem("p2dx_booted", "true");
        }, 7200),
      ];

      return () => steps.forEach(clearTimeout);
    }
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center font-mono text-white animate-fade-in">
      {/* 중앙 로고 애니메이션 */}
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-blue-600 blur-3xl opacity-20 animate-pulse"></div>
        <Zap size={72} className="text-blue-500 animate-bounce relative z-10" />
      </div>

      <h1 className="text-4xl font-black tracking-[0.5em] mb-10 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 animate-pulse">
        SYSTEM BOOT
      </h1>

      {/* ✨ 단계별 시스템 메시지 */}
      <div className="space-y-4 w-96">
        <BootMessage label="Core Kernel Init" status="OK" active={step >= 0} icon={<Cpu size={14}/>} />
        <BootMessage label="Security Protocols" status="VERIFIED" active={step >= 1} icon={<ShieldCheck size={14}/>} />
        <BootMessage label="Cloud DB Connection" status="CONNECTED" active={step >= 2} icon={<Database size={14}/>} />
        <BootMessage label="WMS Modules Load" status="DONE" active={step >= 3} icon={<Layers size={14}/>} />
        <BootMessage label="Data Integrity Check" status="PASSED" active={step >= 4} icon={<Server size={14}/>} />
        <BootMessage label="User Interface" status="RENDERING..." active={step >= 5} icon={<Globe size={14}/>} />
      </div>

      {/* 하단 진행바 (7.2초 설정) */}
      <div className="w-80 h-1.5 bg-gray-900 rounded-full mt-12 overflow-hidden border border-gray-800">
        {/* duration을 7.2s로 설정 */}
        <div className="h-full bg-gradient-to-r from-blue-600 to-purple-600 animate-[progress_7.2s_ease-in-out_forwards] w-full origin-left transform scale-x-0"></div>
      </div>
      
      <div className="mt-4 text-xs text-gray-600 font-mono">
        INITIALIZING P2DX ENVIRONMENT...
      </div>
    </div>
  );
}

// ✨ 메시지 스타일 수정 (파랑 -> 녹색)
function BootMessage({ label, status, active, icon }: any) {
  return (
    <div className={`flex justify-between items-center text-sm border-b border-gray-800 pb-1 transition-all duration-700 ${active ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}>
      <span className="text-gray-400 flex items-center gap-3 font-medium">{icon} {label}</span>
      {/* 상태 텍스트 색상 변경: text-blue-400 -> text-green-500 */}
      <span className={`${status === 'RENDERING...' ? 'text-yellow-500 animate-pulse' : 'text-green-500 font-bold tracking-wider'}`}>
        {status}
      </span>
    </div>
  );
}