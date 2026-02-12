"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Mail, ArrowLeft, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  const supabase = createClient();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      // 🚀 현재 사이트 주소 (localhost 또는 vercel 주소)
      const origin = window.location.origin;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        // 이메일 링크를 클릭하면 -> auth/callback을 거쳐 -> reset-password 페이지로 이동
        redirectTo: `${origin}/auth/callback?next=/reset-password`,
      });

      if (error) throw error;
      setSuccess(true);
    } catch (error: any) {
      setErrorMsg(error.message || "이메일 전송에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">비밀번호 찾기</h1>
          <p className="text-gray-400 text-sm">가입하신 이메일로 재설정 링크를 보내드립니다.</p>
        </div>

        {success ? (
          <div className="text-center py-8 animate-fade-in">
            <div className="flex justify-center mb-4">
              <CheckCircle className="text-green-500 w-16 h-16" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">메일 발송 완료!</h3>
            <p className="text-gray-400 mb-6">
              메일함을 확인하여 링크를 클릭해주세요.<br/>
              (스팸함도 확인해주세요)
            </p>
            <Link href="/login" className="text-blue-500 hover:underline font-bold">
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">이메일</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Mail size={20} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@company.com"
                  className="w-full bg-black border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-900/30 border border-red-800 rounded text-red-400 text-sm text-center">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" /> : "재설정 링크 보내기"}
            </button>
            
            <div className="text-center">
                <Link href="/login" className="text-sm text-gray-500 hover:text-white flex items-center justify-center gap-1 transition">
                    <ArrowLeft size={14}/> 로그인 페이지로
                </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}