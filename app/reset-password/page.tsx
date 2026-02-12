"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Lock, Loader2, CheckCircle } from "lucide-react";
// 🚀 1. UIProvider import 추가
import { useUI } from "@/context/UIProvider";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(""); // 에러 메시지용 (인라인 표시)
  
  const router = useRouter();
  const supabase = createClient();
  
  // 🚀 2. useUI 훅 사용
  const { alert } = useUI();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
        setMsg("비밀번호가 일치하지 않습니다.");
        return;
    }
    
    setLoading(true);
    setMsg("");

    try {
      // 비밀번호 업데이트
      const { error } = await supabase.auth.updateUser({ password: password });

      if (error) throw error;

      // 🚀 3. 브라우저 기본 alert -> UIProvider alert로 변경
      // await를 사용하여 사용자가 '확인'을 누를 때까지 기다림
      await alert(
        "비밀번호가 성공적으로 변경되었습니다.\n다시 로그인해주세요.", 
        "success"
      );
      
      // 로그아웃 후 로그인 페이지로 이동
      await supabase.auth.signOut();
      router.replace("/login");

    } catch (error: any) {
      // 에러는 폼 하단에 텍스트로 보여주거나, 필요하면 여기서도 alert("...", "error") 사용 가능
      setMsg("변경 실패: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl animate-fade-in">
        <h1 className="text-2xl font-bold text-white mb-6 text-center">새 비밀번호 설정</h1>
        
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">새 비밀번호</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock size={20} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상 입력"
                  className="w-full bg-black border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">비밀번호 확인</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <CheckCircle size={20} />
                </div>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호 재입력"
                  className="w-full bg-black border border-gray-700 text-white rounded-lg pl-10 pr-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
          </div>

          {msg && (
            <div className="p-3 bg-red-900/30 border border-red-800 rounded text-red-400 text-sm text-center">
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition flex items-center justify-center gap-2 disabled:opacity-50 mt-4"
          >
            {loading ? <Loader2 className="animate-spin" /> : "비밀번호 변경 완료"}
          </button>
        </form>
      </div>
    </div>
  );
}