import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import SystemBoot from "@/components/SystemBoot";
import MobileBottomNav from "@/components/MobileBottomNav";
import { UIProvider } from "@/context/UIProvider";
import { AuthProvider } from "@/context/AuthProvider";

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
        className={`${inter.className} antialiased bg-gray-950 text-white print:bg-white print:text-black`}
        suppressHydrationWarning={true}
      >
        <AuthProvider>
          <UIProvider>
            <SystemBoot />

            {/* PC용 헤더 */}
            <div className="hidden lg:block print:hidden">
              <Header />
            </div>

            {/* 메인 컨텐츠 영역 */}
            <main className="max-w-7xl mx-auto p-6 pb-20 lg:pb-6 print:p-0 print:m-0 print:max-w-none">
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