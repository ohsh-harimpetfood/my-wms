import type { Metadata } from "next";
import { Inter } from "next/font/google"; // 👈 자동 폰트(Inter) 가져오기
import "./globals.css";
import Link from "next/link";

// 폰트 설정 (파일 경로 걱정 없음)
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
      {/* inter.className을 적용하여 폰트 적용 */}
      <body
        className={`${inter.className} antialiased bg-gray-950 text-white`}
        suppressHydrationWarning={true}
      >
        {/* ✅ 상단 네비게이션 메뉴바 */}
        <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            {/* 로고 / 홈 버튼 */}
            <div className="font-bold text-xl tracking-tighter">
              <Link href="/" className="hover:text-blue-400 transition-colors">
                🏭 My WMS
              </Link>
            </div>

            {/* 메뉴 링크들 */}
            <div className="flex gap-8 text-sm font-medium text-gray-400">
              <Link href="/" className="hover:text-white transition-colors">
                📍 위치 관리
              </Link>
              <Link href="/items" className="hover:text-white transition-colors">
                📦 품목 관리
              </Link>
              <Link href="/inventory" className="hover:text-green-400 transition-colors">
                📊 재고 현황
              </Link>
              <Link href="/inbound" className="hover:text-blue-400 transition-colors text-blue-200">
                📥 입고 등록
              </Link>
              <Link href="/outbound" className="hover:text-red-400 transition-colors text-red-200">
                📤 출고 등록
              </Link>
              <Link href="/history" className="hover:text-yellow-400 transition-colors text-gray-400">
                📜 수불 이력
              </Link>
            </div>
          </div>
        </nav>

        {/* 페이지 본문 영역 */}
        <main className="max-w-6xl mx-auto p-6">
          {children}
        </main>
      </body>
    </html>
  );
}