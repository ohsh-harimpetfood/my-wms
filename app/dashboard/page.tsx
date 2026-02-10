"use client";

import { useAuth } from "@/context/AuthProvider";
import { useRouter } from "next/navigation";
import { useUI } from "@/context/UIProvider";
import { 
  Package, Truck, LogOut, Map, 
  FileText, Loader2, Lock, User, LogIn 
} from "lucide-react";

export default function DashboardPage() {
  // 🚀 checkPermission 포함 (AuthProvider 업데이트 반영)
  const { profile, loading, signOut, checkPermission } = useAuth();
  const router = useRouter();
  const { alert } = useUI();

  const ADMIN_CONTACT = "관리자 오승훈 (010-9059-6660)";

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      window.location.href = "/login";
    }
  };

  // 🛡️ 동적 권한 체크 핸들러
  const handleMenuClick = async (title: string, href: string, featureKey: string) => {
    if (!profile) return;

    // 1. DB 권한 확인
    const hasPermission = checkPermission(featureKey);

    if (!hasPermission) {
      if (profile.role === 'GUEST') {
        await alert(
          `[권한 승인 대기]\n'${title}' 기능은 아직 사용할 수 없습니다.\n관리자 승인 후 이용해 주세요.\n\n문의: ${ADMIN_CONTACT}`,
          "warning"
        );
      } else {
        await alert(
          `[접근 제한]\n'${title}' 기능을 사용할 권한이 없습니다.\n관리자에게 권한 부여를 요청하세요.`,
          "error"
        );
      }
      return;
    }

    router.push(href);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-black">
        <Loader2 className="animate-spin text-blue-500" size={48} />
      </div>
    );
  }

  // 🚀 메뉴 구성 (아이콘에 반응형 클래스 적용을 위해 size prop 제거하고 className 사용)
  const menus = [
    { 
      title: "재고 현황", 
      desc: "실시간 재고 조회", 
      icon: <Package className="w-6 h-6 md:w-8 md:h-8" />, 
      href: "/inventory", 
      color: "text-blue-500", 
      bg: "bg-blue-500/10",
      key: "inventory_view" 
    },
    { 
      title: "창고 맵", 
      desc: "창고 레이아웃 및 위치 조회", 
      icon: <Map className="w-6 h-6 md:w-8 md:h-8" />, 
      href: "/location", 
      color: "text-purple-500", 
      bg: "bg-purple-500/10",
      key: "inventory_view" 
    },
    { 
      title: "입고 관리", 
      desc: "입고 예정 및 확정", 
      icon: <Truck className="w-6 h-6 md:w-8 md:h-8" />, 
      href: "/inbound", 
      color: "text-green-500", 
      bg: "bg-green-500/10",
      key: "inbound_work" 
    },
    { 
      title: "출고 관리", 
      desc: "출고 지시 및 확정", 
      icon: <LogOut className="w-6 h-6 md:w-8 md:h-8" />, 
      href: "/outbound", 
      color: "text-red-500", 
      bg: "bg-red-500/10",
      key: "outbound_work" 
    },
    { 
      title: "수불 이력", 
      desc: "입출고 내역 조회", 
      icon: <FileText className="w-6 h-6 md:w-8 md:h-8" />, 
      href: "/history", 
      color: "text-yellow-500", 
      bg: "bg-yellow-500/10",
      key: "inventory_view"
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 animate-fade-in pb-32">
      
      {/* 👋 환영 배너 (모바일 컴팩트화) */}
      <div className="max-w-7xl mx-auto mb-6 md:mb-10">
        <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 rounded-2xl p-5 md:p-8 flex items-center justify-between gap-4 shadow-2xl">
          <div className="flex items-center gap-3 md:gap-5">
            <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-blue-900/20 flex items-center justify-center border border-blue-500/30 shrink-0">
              <User className="text-blue-400 w-6 h-6 md:w-8 md:h-8" />
            </div>
            <div>
              <h1 className="text-lg md:text-3xl font-bold text-white mb-1 leading-tight">
                <span className="hidden md:inline">My WMS입니다. 안녕하세요! </span>
                <span className="text-blue-400">{profile?.user_name || "사용자"}</span>님
                <span className="md:hidden"> 안녕하세요! My WMS입니다.</span>
              </h1>
              <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
                <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 border border-gray-700 truncate max-w-[80px] md:max-w-none">
                  {profile?.department || "소속 미정"}
                </span>
                <span className={`px-1.5 py-0.5 rounded border font-bold ${
                  profile?.role === 'ADMIN' ? 'bg-purple-900/30 text-purple-400 border-purple-500/30' :
                  profile?.role === 'GUEST' ? 'bg-red-900/30 text-red-400 border-red-500/30' :
                  'bg-blue-900/30 text-blue-400 border-blue-500/30'
                }`}>
                  {profile?.role || "GUEST"}
                </span>
              </div>
            </div>
          </div>
          <button 
            onClick={handleSignOut}
            className="flex flex-col md:flex-row items-center gap-1 md:gap-2 px-3 py-2 md:px-5 md:py-3 bg-gray-800 hover:bg-red-900/30 hover:text-red-400 border border-gray-700 rounded-xl transition-all font-bold text-gray-300 text-xs md:text-base shrink-0"
          >
            <LogIn className="w-5 h-5 md:w-5 md:h-5 rotate-180" />
            <span className="hidden md:inline">로그아웃</span>
          </button>
        </div>
      </div>

      {/* 📦 메인 기능 메뉴 그리드 */}
      {/* Mobile: 2열 (grid-cols-2) / Desktop: 3열 (lg:grid-cols-3) */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
        {menus.map((menu) => {
          // 🚀 checkPermission으로 잠금 여부 판단
          const hasPermission = checkPermission(menu.key);
          const isLocked = !hasPermission;

          return (
            <div 
              key={menu.title} 
              onClick={() => handleMenuClick(menu.title, menu.href, menu.key)}
              className="group cursor-pointer relative"
            >
              <div className={`
                h-full bg-gray-900 border border-gray-800 rounded-xl md:rounded-2xl 
                p-4 md:p-6 
                hover:border-gray-600 hover:bg-gray-800/80 transition-all duration-300 shadow-lg
                flex flex-col items-center md:items-start text-center md:text-left justify-center md:justify-between
                ${isLocked ? 'opacity-60 grayscale-[0.5]' : ''}
              `}>
                {/* 아이콘 영역 */}
                <div className={`
                    w-10 h-10 md:w-14 md:h-14 rounded-lg md:rounded-xl 
                    flex items-center justify-center 
                    mb-2 md:mb-4 
                    ${menu.bg} ${menu.color} 
                    group-hover:scale-110 transition-transform duration-300
                `}>
                  {menu.icon}
                </div>
                
                {/* 텍스트 영역 */}
                <div className="w-full">
                    <h3 className="text-sm md:text-xl font-bold text-white mb-0 md:mb-1 group-hover:text-blue-400 transition-colors flex items-center justify-center md:justify-start gap-1 md:gap-2">
                        {menu.title}
                        {isLocked && <Lock className="w-3 h-3 md:w-4 md:h-4 text-gray-500" />}
                    </h3>
                    {/* 모바일에서는 설명 숨김 */}
                    <p className="hidden md:block text-gray-500 text-sm">{menu.desc}</p>
                </div>
                
                {/* 하단 화살표 (모바일 숨김) */}
                <div className={`hidden md:flex mt-6 items-center text-sm font-bold transition-colors ${isLocked ? 'text-gray-600' : 'text-gray-400 group-hover:text-white'}`}>
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