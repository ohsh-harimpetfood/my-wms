"use client";

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Lock, Mail, Loader2, CheckSquare, Square } from "lucide-react";
// 🚀 [추가] 배경 컴포넌트 Import
import LoginBg from "@/components/login/LoginBg";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberId, setRememberId] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const savedEmail = localStorage.getItem("savedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberId(true);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setErrorMsg("로그인 실패: 아이디 또는 비밀번호를 확인하세요.");
      setLoading(false);
    } else {
      if (rememberId) {
        localStorage.setItem("savedEmail", email);
      } else {
        localStorage.removeItem("savedEmail");
      }
      router.push("/dashboard"); 
      router.refresh();
    }
  };

  return (
    // 🚀 [수정] bg-black 제거 + relative 추가 (배경 컴포넌트 기준점)
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      
      {/* 🚀 [추가] 배경 컴포넌트 삽입 (가장 먼저 렌더링되어 뒤에 깔림) */}
      <LoginBg />

      {/* 🚀 [수정] z-10 추가 (배경 위로 띄우기) */}
      <div className="relative z-10 w-full max-w-md bg-gray-900/80 backdrop-blur-md border border-gray-800 p-8 rounded-2xl shadow-2xl animate-fade-in-up">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Lock className="text-blue-500" /> My WMS Login
          </h1>
          <p className="text-gray-400 text-sm">하림펫푸드 창고 관리 시스템에 접속합니다.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">이메일</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              {/* 인풋 배경도 살짝 투명하게 주면 더 세련됨 (선택사항) */}
              <input 
                type="email" 
                required
                className="w-full bg-black/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-blue-500 transition placeholder-gray-600"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input 
                type="password" 
                required
                className="w-full bg-black/50 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-blue-500 transition placeholder-gray-600"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setRememberId(!rememberId)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition"
            >
              {rememberId ? (
                <CheckSquare size={18} className="text-blue-500" />
              ) : (
                <Square size={18} className="text-gray-600" />
              )}
              아이디 저장
            </button>
            
            <Link 
                href="/forgot-password" 
                className="text-sm text-gray-500 hover:text-blue-400 transition underline-offset-4 hover:underline"
            >
                비밀번호를 잊으셨나요?
            </Link>
          </div>

          {errorMsg && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 py-2 rounded border border-red-900/50">
              {errorMsg}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg shadow-lg shadow-blue-900/20 transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : <><LogIn size={20} /> 로그인</>}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          계정이 없으신가요?{" "}
          <Link href="/signup" className="text-blue-400 hover:underline">
            회원가입 신청
          </Link>
        </div>
        
        {/* 하단 카피라이트 (폼 안에 넣거나 밖으로 빼도 됨) */}
        <p className="mt-8 text-center text-xs text-gray-600/50">
          © 2026 P2DX Corp. All rights reserved.
        </p>
      </div>
    </div>
  );
}