"use client";

import { createClient } from "@/utils/supabase/client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { UserPlus, User, Mail, Lock, Loader2, Users } from "lucide-react";

// ✨ 부서 목록 정의
const DEPARTMENT_OPTIONS = [
  "생산1팀",
  "생산2팀",
  "생산본부",
  "물류지원팀",
  "품질보증팀"
];

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState(""); // ✨ 부서 상태 추가
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!department) {
      setMessage({ text: "소속 팀을 선택해주세요.", type: "error" });
      return;
    }

    setLoading(true);
    setMessage({ text: "", type: "" });

    // ✨ 메타데이터에 department 추가
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          department: department, 
        },
      },
    });

    if (error) {
      setMessage({ text: "가입 실패: " + error.message, type: "error" });
    } else {
      setMessage({ text: "가입 신청이 완료되었습니다! 로그인 페이지로 이동합니다.", type: "success" });
      setTimeout(() => router.push("/login"), 2000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 p-8 rounded-2xl shadow-2xl animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
            <UserPlus className="text-green-500" /> 회원가입
          </h1>
          <p className="text-gray-400 text-sm">WMS 사용 승인을 요청합니다.</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          
          {/* 1. 이름 입력 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">이름 (실명)</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input 
                type="text" required
                className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-green-500 transition placeholder-gray-600"
                placeholder="예: 홍길동"
                value={name} onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {/* 2. ✨ 부서 선택 (드롭다운) */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">소속 팀</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <select 
                required
                className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-green-500 transition appearance-none cursor-pointer"
                value={department} 
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="" disabled className="text-gray-500">팀을 선택하세요</option>
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              {/* 드롭다운 화살표 커스텀 */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                ▼
              </div>
            </div>
          </div>

          {/* 3. 이메일 입력 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">이메일</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input 
                type="email" required
                className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-green-500 transition placeholder-gray-600"
                placeholder="user@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* 4. 비밀번호 입력 */}
          <div>
            <label className="block text-sm text-gray-400 mb-2">비밀번호</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
              <input 
                type="password" required
                className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white outline-none focus:border-green-500 transition placeholder-gray-600"
                placeholder="6자리 이상 입력"
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {message.text && (
            <div className={`text-sm text-center py-2 rounded border ${message.type === 'error' ? 'text-red-400 bg-red-900/20 border-red-900' : 'text-green-400 bg-green-900/20 border-green-900'}`}>
              {message.text}
            </div>
          )}

          <button 
            type="submit" disabled={loading}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg shadow-lg shadow-green-900/20 transition active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "가입 신청하기"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-green-400 hover:underline">
            로그인하기
          </Link>
        </div>
      </div>
    </div>
  );
}