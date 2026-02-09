"use client";

import { useAuth } from "@/context/AuthProvider";
import { useRouter } from "next/navigation";
import { useUI } from "@/context/UIProvider";
import { 
  Package, Truck, LogOut, ArrowRightLeft, 
  FileText, Settings, Loader2, Lock, User, LogIn 
} from "lucide-react";

export default function DashboardPage() {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();
  const { alert } = useUI();

  const ADMIN_CONTACT = "관리자 오승훈 (010-9059-6660)";

  // 🚪 로그아웃 핸들러 (안전장치 포함)
  const handleSignOut = async () => {
    try {
      await signOut(); // AuthProvider의 강력한 signOut 실행
    } catch (error) {
      console.error("로그아웃 중 오류:", error);
      // 에러 시에도 강제 이동
      window.location.href = "/login";
    }
  };

  // 🛡️ 메뉴 클릭 핸들러
  const handleMenuClick = async (title: string, href: string) => {
    if (!profile) return;

    // GUEST 차단 로직 (필요시 role별 세분화 가능)
    if (profile.role === 'GUEST') {
      await alert(
        `[권한 승인 대기]\n'${title}' 기능은 아직 사용할 수 없습니다.\n관리자 승인 후 이용해 주세요.\n\n문의: ${ADMIN_CONTACT}`,
        "warning"
      );
      return;
    }

    router.push(href);
  };

  // 로딩 상태 처리
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  const menus = [
    { title: "재고 현황", desc: "실시간 재고 조회", icon: <Package size={28} />, href: "/inventory", color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "입고 관리", desc: "입고 예정 및 확정", icon: <Truck size={28} />, href: "/inbound", color: "text-green-500", bg: "bg-green-500/10" },
    { title: "출고 관리", desc: "출고 지시 및 확정", icon: <LogOut size={28} />, href: "/outbound", color: "text-red-500", bg: "bg-red-500/10" },
    { title: "재고 이동", desc: "위치 이동 처리", icon: <ArrowRightLeft size={28} />, href: "/inventory/move", color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { title: "수불 이력", desc: "입출고 내역 조회", icon: <FileText size={28} />, href: "/history", color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "기준 정보", desc: "품목 및 위치 관리", icon: <Settings size={28} />, href: "/master", color: "text-gray-400", bg: "bg-gray-500/10" },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 animate-fade-in pb-32">
      
      {/* 👋 1. 환영 배너 및 유저 정보 영역 */}
      <div className="max-w-7xl mx-auto mb-10">
        <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
          
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-full bg-blue-900/20 flex items-center justify-center border border-blue-500/30">
              <User size={32} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">
                MyWMS입니다. 안녕하세요, <span className="text-blue-400">{profile?.user_name || "사용자"}</span>님!
              </h1>
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <span className="bg-gray-800 px-2 py-0.5 rounded text-gray-300 border border-gray-700">
                  {profile?.department || "소속 미정"}
                </span>
                <span className={`px-2 py-0.5 rounded border font-bold ${
                  profile?.role === 'ADMIN' ? 'bg-purple-900/30 text-purple-400 border-purple-500/30' :
                  profile?.role === 'GUEST' ? 'bg-red-900/30 text-red-400 border-red-500/30' :
                  'bg-blue-900/30 text-blue-400 border-blue-500/30'
                }`}>
                  {profile?.role || "GUEST"}
                </span>
              </div>
            </div>
          </div>

          {/* 로그아웃 버튼 (모바일에서도 잘 보이게 배치) */}
          <button 
            onClick={handleSignOut}
            className="flex items-center gap-2 px-5 py-3 bg-gray-800 hover:bg-red-900/30 hover:text-red-400 border border-gray-700 rounded-xl transition-all w-full md:w-auto justify-center font-bold text-gray-300"
          >
            <LogIn size={20} className="rotate-180" />
            로그아웃
          </button>
        </div>
      </div>

      {/* 📦 2. 메인 기능 메뉴 그리드 */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menus.map((menu) => {
          // GUEST일 때 시각적 잠금 처리
          const isLocked = profile?.role === 'GUEST';

          return (
            <div 
              key={menu.title} 
              onClick={() => handleMenuClick(menu.title, menu.href)}
              className="group cursor-pointer relative"
            >
              <div className={`
                h-full bg-gray-900 border border-gray-800 rounded-2xl p-6 
                hover:border-gray-600 hover:bg-gray-800/80 transition-all duration-300 shadow-lg
                flex flex-col justify-between overflow-hidden
                ${isLocked ? 'opacity-60 grayscale-[0.5]' : ''}
              `}>
                <div>
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${menu.bg} ${menu.color} group-hover:scale-110 transition-transform duration-300`}>
                    {menu.icon}
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors flex items-center gap-2">
                    {menu.title}
                    {isLocked && <Lock size={16} className="text-gray-500" />}
                  </h3>
                  <p className="text-gray-500 text-sm">{menu.desc}</p>
                </div>
                
                <div className={`mt-6 flex items-center text-sm font-bold transition-colors ${isLocked ? 'text-gray-600' : 'text-gray-400 group-hover:text-white'}`}>
                  {isLocked ? "접근 제한됨" : "기능 실행"} 
                  {!isLocked && <span className="ml-1 text-lg transform group-hover:translate-x-1 transition-transform">→</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}