// components/Header.tsx
"use client";

import { useState } from "react"; // ✨ useState 추가
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Database, 
  Package, 
  Truck, 
  LogOut, 
  History, 
  ChevronDown,
  Map,
  Box,
  LayoutGrid,
  Power, // ✨ 전원 아이콘 추가
  AlertTriangle
} from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  // ✨ 모달 표시 상태 관리
  const [showRebootModal, setShowRebootModal] = useState(false);

  // 로고 클릭 시 모달 열기
  const handleLogoClick = () => {
    setShowRebootModal(true);
  };

  // 재부팅 실행 (확인 버튼)
  const executeReboot = () => {
    sessionStorage.removeItem("p2dx_booted");
    window.location.href = "/";
  };

  return (
    <>
      <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* 로고 영역 */}
          <div className="flex items-center gap-3">
            
            {/* 1. 히든 버튼: P2DX 로고 (클릭 시 커스텀 모달 오픈) */}
            <button 
              onClick={handleLogoClick}
              className="group relative focus:outline-none"
              title="System Reboot"
            >
              <div className="h-8 w-auto px-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shadow-lg shadow-blue-900/20 tracking-widest transition-transform active:scale-95 group-hover:shadow-blue-500/40">
                P2DX
              </div>
            </button>

            {/* 2. 일반 링크: My WMS 텍스트 */}
            <Link href="/" className="text-xl font-bold text-white tracking-tight hover:text-blue-400 transition-colors">
              My WMS
            </Link>
          </div>

          {/* 네비게이션 메뉴 (기존 유지) */}
          <div className="flex items-center gap-1 text-sm font-medium text-gray-400">
            <Link 
              href="/" 
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors 
                ${pathname === "/" ? "bg-gray-800 text-white" : "hover:text-white hover:bg-gray-800/50"}`}
            >
              <LayoutDashboard size={16} />
              메인메뉴
            </Link>

            <Link 
              href="/location" 
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors
                ${pathname === "/location" ? "bg-gray-800 text-white" : "hover:text-white hover:bg-gray-800/50"}`}
            >
              <Map size={16} />
              창고 맵
            </Link>

            {/* 기준 정보 (드롭다운) */}
            <div className="relative group">
              <button 
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors cursor-pointer outline-none
                  ${isActive("/items") || isActive("/location/master") 
                    ? "bg-gray-800 text-white" 
                    : "group-hover:text-white group-hover:bg-gray-800/50"}`}
              >
                <Database size={16} />
                기준정보
                <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-200" />
              </button>

              <div className="absolute left-0 top-full pt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col p-1">
                  <Link 
                    href="/items" 
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition"
                  >
                    <Box size={16} className="text-yellow-500"/> 품목 관리
                  </Link>
                  <Link 
                    href="/location/master" 
                    className="flex items-center gap-2 px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-800 hover:text-white rounded-md transition"
                  >
                    <LayoutGrid size={16} className="text-blue-500"/> 로케이션 관리
                  </Link>
                </div>
              </div>
            </div>

            <Link 
              href="/inventory" 
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors
                ${isActive("/inventory") ? "bg-gray-800 text-white" : "hover:text-white hover:bg-gray-800/50"}`}
            >
              <Package size={16} />
              재고현황
            </Link>

            <Link 
              href="/inbound" 
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors
                ${isActive("/inbound") ? "bg-gray-800 text-white" : "hover:text-white hover:bg-gray-800/50"}`}
            >
              <Truck size={16} />
              입고등록
            </Link>

            <Link 
              href="/outbound/new" 
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors
                ${isActive("/outbound") ? "bg-gray-800 text-white" : "hover:text-white hover:bg-gray-800/50"}`}
            >
              <LogOut size={16} />
              출고등록
            </Link>

            <Link 
              href="/history" 
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors
                ${isActive("/history") ? "bg-gray-800 text-white" : "hover:text-white hover:bg-gray-800/50"}`}
            >
              <History size={16} />
              수불이력
            </Link>

          </div>
        </div>
      </nav>

      {/* ✨ 커스텀 리부트 모달 (Portal 없이 조건부 렌더링) */}
      {showRebootModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
            
            {/* 모달 헤더 */}
            <div className="p-6 pb-4 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                <Power size={32} className="text-red-500 animate-pulse" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">시스템 재부팅</h3>
              <p className="text-gray-400 text-sm">
                시스템 초기화 화면을 다시 실행하시겠습니까? 
                <br/>현재 작업 중인 내용은 저장되지 않을 수 있습니다.
              </p>
            </div>

            {/* 모달 버튼 */}
            <div className="flex border-t border-gray-800">
              <button 
                onClick={() => setShowRebootModal(false)}
                className="flex-1 py-4 text-gray-400 hover:bg-gray-800 hover:text-white transition font-bold text-sm"
              >
                취소
              </button>
              <div className="w-[1px] bg-gray-800"></div>
              <button 
                onClick={executeReboot}
                className="flex-1 py-4 text-red-400 hover:bg-red-900/20 hover:text-red-300 transition font-bold text-sm"
              >
                재부팅 실행
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}