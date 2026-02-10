"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, LogIn, LogOut, History } from "lucide-react"; // 🚀 Layers 대신 Map 아이콘 사용 추천

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    // 🚀 [수정] 홈 경로를 대시보드로 명시적 지정
    { href: "/dashboard", label: "홈", icon: Home },
    
    // 🚀 [수정] '재고' 클릭 시 '재고 맵(/location)'으로 이동
    { href: "/location", label: "재고", icon: Map }, 
    
    { href: "/inbound", label: "입고", icon: LogIn },
    { href: "/outbound", label: "출고", icon: LogOut },
    { href: "/history", label: "이력", icon: History },
  ];

  // 로그인 페이지 등에서는 네비바 숨김 처리 (필요 시 주석 해제하여 사용)
  // if (pathname === "/login" || pathname === "/") return null;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#0a0a0a] border-t border-gray-800 md:hidden z-50 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          // 현재 경로가 해당 메뉴의 href로 시작하면 활성화
          const isActive = pathname.startsWith(item.href);
          
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? "text-blue-500" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}