import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import SystemBoot from "@/components/SystemBoot";
import MobileBottomNav from "@/components/MobileBottomNav";

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
        <SystemBoot />

        {/* ✨ PC용 헤더 
          - hidden lg:block : 기본은 숨기고, lg(1024px) 이상일 때만 보이게 함
        */}
        <div className="hidden lg:block">
          <Header />
        </div>

        {/* ✨ 메인 컨텐츠 영역
          - pb-20 : 폰/태블릿에서는 하단 네비게이션에 가려지지 않게 여백을 넉넉히 줌
          - lg:pb-6 : PC에서는 하단 네비게이션이 없으므로 일반 여백으로 줄임
        */}
        <main className="max-w-7xl mx-auto p-6 pb-20 lg:pb-6">
          {children}
        </main>

        {/* ✨ 모바일/태블릿용 하단 네비게이션 
          - 컴포넌트 내부에서 lg:hidden 처리가 되어 있어 PC에선 자동 숨김
        */}
        <MobileBottomNav />
      </body>
    </html>
  );
}