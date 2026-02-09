"use client";

import Link from "next/link";
import { Box, LayoutGrid, ArrowLeft } from "lucide-react";

export default function MasterMenuPage() {
  return (
    <div className="p-8 bg-black min-h-screen text-white animate-fade-in">
      <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4">
        <Link href="/dashboard" className="text-gray-400 hover:text-white"><ArrowLeft /></Link>
        <h1 className="text-2xl font-bold">기준 정보 관리 (Master Data)</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* 품목 관리로 이동 */}
        <Link href="/items" className="group">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl hover:border-yellow-500 transition-all shadow-lg group-hover:shadow-yellow-900/20 h-full">
                <Box size={48} className="text-yellow-500 mb-4 group-hover:scale-110 transition-transform" />
                <h2 className="text-xl font-bold text-white mb-2">품목 기준 정보</h2>
                <p className="text-gray-400 text-sm">
                  품목(Item)의 상세 정보, 규격, 단가, LOT 관리 여부 등을 조회하고 관리합니다.
                </p>
            </div>
        </Link>

        {/* 로케이션 관리로 이동 */}
        <Link href="/location/master" className="group">
            <div className="bg-gray-900 border border-gray-800 p-8 rounded-2xl hover:border-blue-500 transition-all shadow-lg group-hover:shadow-blue-900/20 h-full">
                <LayoutGrid size={48} className="text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
                <h2 className="text-xl font-bold text-white mb-2">로케이션 기준 정보</h2>
                <p className="text-gray-400 text-sm">
                  창고의 물리적 위치(Zone-Rack-Level-Side) 구조를 정의하고 관리합니다.
                </p>
            </div>
        </Link>
      </div>
    </div>
  );
}