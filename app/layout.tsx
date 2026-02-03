import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import SystemBoot from "@/components/SystemBoot";
import MobileBottomNav from "@/components/MobileBottomNav";
import { UIProvider } from "@/context/UIProvider"; // ✨ [추가] UI 통합 관리자 임포트

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My WMS",
  description: "Warehouse Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} antialiased bg-gray-950 text-white`}
        suppressHydrationWarning={true}
      >
        {/* ✨ [수정] UIProvider로 전체 앱을 감쌉니다. 
            이제 모든 컴포넌트에서 useUI()를 사용할 수 있습니다. 
        */}
        <UIProvider>
          <SystemBoot />

          {/* PC용 헤더 */}
          <div className="hidden lg:block">
            <Header />
          </div>

          {/* 메인 컨텐츠 영역 */}
          <main className="max-w-7xl mx-auto p-6 pb-20 lg:pb-6">
            {children}
          </main>

          {/* 모바일 하단 네비게이션 */}
          <MobileBottomNav />
        </UIProvider>
      </body>
    </html>
  );
}