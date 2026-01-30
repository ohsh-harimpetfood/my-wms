"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Database, 
  Package, // 그룹 아이콘
  Truck, 
  LogOut, 
  History, 
  ChevronDown,
  Map, // 맵 아이콘
  List, // 리스트 아이콘 (새로 추가)
  Box,
  LayoutGrid,
  Power, 
  AlertTriangle
} from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  // 하위 경로까지 포함하여 활성화 상태 체크
  const isActive = (path: string) => pathname === path || pathname.startsWith(path + "/");

  const [showRebootModal, setShowRebootModal] = useState(false);

  const handleLogoClick = () => {
    setShowRebootModal(true);
  };

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
            <button 
              onClick={handleLogoClick}
              className="group relative focus:outline-none"
              title="System Reboot"
            >
              <div className="h-8 w-auto px-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center text-white font-extrabold text-xs shadow-lg shadow-blue-900/20 tracking-widest transition-transform active:scale-95 group-hover:shadow-blue-500/40">
                P2DX
              </div>
            </button>
            <Link href="/" className="text-xl font-bold text-white tracking-tight hover:text-blue-400 transition-colors">
              My WMS
            </Link>
          </div>

          {/* 네비게이션 메뉴 */}
          <div className="flex items-center gap-1 text-sm font-medium text-gray-400">
            <Link 
              href="/" 
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors 
                ${pathname === "/" ? "bg-gray-800 text-white" : "hover:text-white hover:bg-gray-800/50"}`}
            >
              <LayoutDashboard size={16} />
              메인메뉴
            </Link>

            {/* ✨ [수정됨] 재고 관리 (드롭다운 그룹: 창고 맵 + 재고 목록) */}
            <div className="relative group">
              <button 
                className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors cursor-pointer outline-none
                  ${isActive("/location") || isActive("/inventory") 
                    ? "bg-gray-800 text-white" 
                    : "group-hover:text-white group-hover:bg-gray-800/50"}`}
              >
                <Package size={16} />
                재고 관리
                <ChevronDown size={12} className="group-hover:rotate-180 transition-transform duration-200" />
              </button>

              <div className="absolute left-0 top-full pt-2 w-48 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform translate-y-2 group-hover:translate-y-0">
                <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden flex flex-col p-1">
                  {/* 옵션 1: 창고 맵 */}
                  <Link 
                    href="/location" 
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-md transition
                      ${isActive("/location") ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`}
                  >
                    <Map size={16} className="text-purple-500"/> 창고 맵 (Map)
                  </Link>
                  {/* 옵션 2: 재고 목록 */}
                  <Link 
                    href="/inventory" 
                    className={`flex items-center gap-2 px-3 py-2.5 text-sm rounded-md transition
                      ${isActive("/inventory") ? "bg-gray-800 text-white" : "text-gray-300 hover:bg-gray-800 hover:text-white"}`}
                  >
                    <List size={16} className="text-green-500"/> 재고 목록 (List)
                  </Link>
                </div>
              </div>
            </div>

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

            {/* 입출고 및 이력 */}
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

      {/* 리부트 모달 (기존 코드 유지) */}
      {showRebootModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-sm w-full overflow-hidden transform transition-all scale-100">
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