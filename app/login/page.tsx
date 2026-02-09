"use client";

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Lock, Mail, Loader2, CheckSquare, Square } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberId, setRememberId] = useState(false); // ✨ 아이디 저장 상태
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ✨ 초기 로드 시 저장된 이메일 확인
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
      // ✨ 로그인 성공 시 아이디 저장 처리
      if (rememberId) {
        localStorage.setItem("savedEmail", email);
      } else {
        localStorage.removeItem("savedEmail");
      }

     // ✨ 여기 수정됨: 로그인 성공 시 대시보드로 이동
      router.push("/dashboard"); 
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <Lock className="text-blue-500" /> WMS Login
          </h1>
          <p className="text-gray-400 text-sm">창고 관리 시스템에 접속합니다.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-2">이메일</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input 
                type="email" 
                required
                className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-blue-500 transition placeholder-gray-600"
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
                className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-blue-500 transition placeholder-gray-600"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* ✨ 아이디 저장 체크박스 */}
          <div className="flex items-center">
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
      </div>
    </div>
  );
}