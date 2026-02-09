import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import SystemBoot from "@/components/SystemBoot";
import MobileBottomNav from "@/components/MobileBottomNav";
import { UIProvider } from "@/context/UIProvider";
import { AuthProvider } from "@/context/AuthProvider"; // ✨ [추가] 인증 상태 관리자 임포트

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
        {/* ✨ [수정] AuthProvider를 최상위에 배치합니다.
            이제 앱 전체에서 로그인 유저 정보(user)와 권한 정보(profile)를 사용할 수 있습니다.
        */}
        <AuthProvider>
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
        </AuthProvider>
      </body>
    </html>
  );
}