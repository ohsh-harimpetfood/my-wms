"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, Database, Package, Truck, LogOut, History, 
  ChevronDown, Map, List, Box, LayoutGrid, Power, User, LogIn, Loader2, Settings 
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider"; 
import { useUI } from "@/context/UIProvider"; // 🚀 UIProvider 추가
import LoadingScreen from "@/components/LoadingScreen"; 

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  
  const { user, profile, signOut, loading } = useAuth(); 
  const { alert: customAlert } = useUI(); // 🚀 커스텀 alert 가져오기 (이름 충돌 방지를 위해 별칭 사용)

  const [showRebootModal, setShowRebootModal] = useState(false);
  const [isRebooting, setIsRebooting] = useState(false);

  // 권한 상태
  const isAdmin = !loading && profile?.role === 'ADMIN';
  const isGuest = !loading && profile?.role === 'GUEST';

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  if (pathname === '/login' || pathname === '/signup') return null;

  // 🛡️ UX 보완: 커스텀 Alert을 사용한 권한 체크 핸들러
  const handleNavClick = async (e: React.MouseEvent, href: string) => {
    if (isGuest) {
      e.preventDefault();
      // 🚀 UIProvider의 Promise 기반 alert 사용
      await customAlert(
        "권한 승인 대기 중입니다.\n관리자에게 승인을 요청해 주세요.", 
        "warning"
      );
      return;
    }
    router.push(href);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/login"); 
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <>
      {isRebooting && <LoadingScreen mode="reboot" />}

      <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-8">
            {/* 로고 영역 */}
            <div className="flex items-center gap-3">
              <button onClick={() => setShowRebootModal(true)} className="group focus:outline-none">
                <div className="h-8 w-auto px-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shadow-lg tracking-widest transition-transform active:scale-95 group-hover:shadow-blue-500/40">
                  P2DX
                </div>
              </button>
              <Link href="/dashboard" className="text-xl font-bold text-white tracking-tight hover:text-blue-400 transition-colors">
                My WMS
              </Link>
            </div>

            {/* 네비게이션 메뉴 */}
            {!loading && user && (
              <div className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-400">
                <Link 
                  href="/dashboard" 
                  className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors 
                    ${pathname === "/dashboard" ? "bg-gray-800 text-white" : "hover:text-white hover:bg-gray-800/50"}`}
                >
                  <LayoutDashboard size={16} /> 메인메뉴
                </Link>

                {/* 재고 관리 드롭다운 (GUEST 클릭 차단) */}
                <div className="relative group">
                  <button 
                    onClick={(e) => handleNavClick(e, '#')}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors outline-none
                    ${isActive("/location") || isActive("/inventory") ? "bg-gray-800 text-white" : "group-hover:text-white group-hover:bg-gray-800/50"}`}
                  >
                    <Package size={16} /> 재고 관리
                    <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-200" />
                  </button>

                  {!isGuest && (
                    <div className="absolute left-0 top-full pt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-1">
                        <Link href="/location" className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-md ${isActive("/location") ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`}>
                          <Map size={16} className="text-purple-500"/> 창고 맵 (Map)
                        </Link>
                        <Link href="/inventory" className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-md ${isActive("/inventory") ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`}>
                          <List size={16} className="text-green-500"/> 재고 목록 (List)
                        </Link>
                      </div>
                    </div>
                  )}
                </div>

                {/* 기준정보: ADMIN 전용 */}
                {isAdmin && (
                  <div className="relative group">
                    <button className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${isActive("/items") || isActive("/location/master") ? "bg-gray-800 text-white" : "group-hover:text-white group-hover:bg-gray-800/50"}`}>
                      <Database size={16} /> 기준정보
                      <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-200" />
                    </button>
                    <div className="absolute left-0 top-full pt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-1">
                        <Link href="/items" className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-md">
                          <Box size={16} className="text-yellow-500"/> 품목 관리
                        </Link>
                        <Link href="/location/master" className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-md">
                          <LayoutGrid size={16} className="text-blue-500"/> 로케이션 관리
                        </Link>
                      </div>
                    </div>
                  </div>
                )}

                {/* 단일 링크들 (GUEST 체크 적용) */}
                <button onClick={(e) => handleNavClick(e, '/inbound')} className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${isActive("/inbound") ? "bg-gray-800 text-white" : "hover:text-white hover:bg-gray-800/50"}`}>
                  <Truck size={16} /> 입고등록
                </button>
                <button onClick={(e) => handleNavClick(e, '/outbound')} className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${isActive("/outbound") ? "bg-gray-800 text-white" : "hover:text-white hover:bg-gray-800/50"}`}>
                  <LogOut size={16} /> 출고등록
                </button>
                <button onClick={(e) => handleNavClick(e, '/history')} className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${isActive("/history") ? "bg-gray-800 text-white" : "hover:text-white hover:bg-gray-800/50"}`}>
                  <History size={16} /> 수불이력
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* 관리자 설정 아이콘 */}
            {!loading && user && isAdmin && (
              <Link href="/admin/users" className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-full transition" title="시스템 관리">
                <Settings size={20} />
              </Link>
            )}

            {loading ? (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 rounded-full border border-gray-800">
                <Loader2 size={14} className="animate-spin text-blue-500" />
                <span className="text-xs text-gray-500 font-medium">인증 확인 중...</span>
              </div>
            ) : user ? (
              <>
                <div className="hidden md:flex items-center gap-2 text-sm text-gray-300 bg-gray-900 py-1.5 px-3 rounded-full border border-gray-800">
                  <User size={14} className="text-blue-500" />
                  <span className="font-bold text-white">{profile?.user_name || "Guest"}</span>
                  <span className="text-xs text-gray-500">|</span>
                  <span className="text-xs text-blue-400 font-medium">{profile?.department || "소속 없음"}</span>
                </div>
                <button onClick={handleSignOut} className="text-gray-400 hover:text-red-400 transition p-2 hover:bg-gray-800 rounded-full">
                  <LogIn size={20} className="rotate-180" /> 
                </button>
              </>
            ) : (
              <Link href="/login" className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition">
                <LogIn size={16} /> 로그인
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* 시스템 재부팅 모달 */}
      {showRebootModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-sm w-full overflow-hidden">
            <div className="p-6 pb-4 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <Power size={32} className="text-red-500 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">시스템 재부팅</h3>
              <p className="text-gray-400 text-sm">시스템 초기화 화면을 다시 실행하시겠습니까?</p>
            </div>
            <div className="flex border-t border-gray-800">
              <button onClick={() => setShowRebootModal(false)} className="flex-1 py-4 text-gray-400 hover:bg-gray-800 font-bold text-sm">취소</button>
              <button onClick={() => { setShowRebootModal(false); setIsRebooting(true); }} className="flex-1 py-4 text-red-400 hover:bg-red-900/20 font-bold text-sm">재부팅 실행</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}