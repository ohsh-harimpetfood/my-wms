"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PackagePlus, Truck, Boxes } from "lucide-react";

export default function MobileBottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "홈", icon: Home },
    { href: "/inbound", label: "입고", icon: PackagePlus },
    { href: "/outbound", label: "출고", icon: Truck },
    { href: "/inventory", label: "재고", icon: Boxes },
  ];

  return (
    /* ✨ 핵심 수정 사항: lg:hidden 
      - lg(1024px) 이상인 PC 화면에서는 아예 이 컴포넌트가 사라집니다.
      - 폰, 태블릿에서는 보입니다.
    */
    <nav className="fixed bottom-0 left-0 z-50 w-full bg-gray-900 border-t border-gray-800 lg:hidden pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? "text-blue-500" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}