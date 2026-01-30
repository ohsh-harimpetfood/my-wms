"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layers, LogIn, LogOut, History } from "lucide-react"; // ✨ History 아이콘 추가

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "홈", icon: Home },
    { href: "/inventory", label: "재고", icon: Layers },
    { href: "/inbound", label: "입고", icon: LogIn },
    { href: "/outbound", label: "출고", icon: LogOut },
    // ✨ [추가] 수불이력 메뉴
    { href: "/history", label: "이력", icon: History },
  ];

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#0a0a0a] border-t border-gray-800 md:hidden z-50 pb-safe">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
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