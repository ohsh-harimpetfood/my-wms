// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import SystemBoot from "@/components/SystemBoot"; // ✨ 인트로 컴포넌트 임포트

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
        {/* ✨ 시스템 부팅 인트로 (최초 접속 시 1회 실행) */}
        <SystemBoot />

        {/* 네비게이션 헤더 */}
        <Header />

        <main className="max-w-7xl mx-auto p-6">
          {children}
        </main>
      </body>
    </html>
  );
}