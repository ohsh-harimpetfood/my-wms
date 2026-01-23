// components/HistorySearchForm.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, RotateCcw, Filter, CalendarDays } from "lucide-react";

export default function HistorySearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 날짜 기본값 설정 (이번 달 1일 ~ 오늘)
  const today = new Date().toISOString().split("T")[0];
  const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(searchParams.get("startDate") || firstDay);
  const [endDate, setEndDate] = useState(searchParams.get("endDate") || today);
  const [txType, setTxType] = useState(searchParams.get("txType") || "ALL");
  const [keyword, setKeyword] = useState(searchParams.get("keyword") || "");

  // 조회 실행 (URL 변경 -> 페이지 이동)
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (txType !== "ALL") params.set("txType", txType);
    if (keyword) params.set("keyword", keyword);
    
    // ✨ 화면 전환의 핵심 키
    params.set("search", "true");

    router.push(`/history?${params.toString()}`);
  };

  const handleReset = () => {
    setStartDate(firstDay);
    setEndDate(today);
    setTxType("ALL");
    setKeyword("");
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 animate-fade-in">
      {/* 타이틀 영역 */}
      <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
        <Filter className="text-blue-500" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-white">수불 이력 조회 (Transaction History)</h1>
          <p className="text-gray-400 text-sm">조회 조건을 설정하고 실행 버튼을 눌러주세요.</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* 1. 조회 기간 (Date Range) - 개선된 UI */}
          <div className="col-span-2">
            <label className="block text-sm text-gray-300 mb-2 font-bold flex items-center gap-2">
              <CalendarDays size={16} className="text-blue-400"/> 조회 기간 (Date Range)
            </label>
            <div className="flex items-center gap-4">
              {/* 시작일 */}
              <div className="relative flex-1 group">
                <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>
              <span className="text-gray-500 font-bold">~</span>
              {/* 종료일 */}
              <div className="relative flex-1 group">
                <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition cursor-pointer [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                />
              </div>
            </div>
          </div>

          {/* 2. 입출고 구분 */}
          <div>
            <label className="block text-sm text-gray-300 mb-2 font-bold">입출고 구분 (Type)</label>
            <select 
                value={txType} 
                onChange={(e) => setTxType(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none appearance-none"
            >
                <option value="ALL">전체 (All Transactions)</option>
                <option value="INBOUND">입고 (Inbound)</option>
                <option value="OUTBOUND">출고 (Outbound)</option>
                <option value="MOVE">재고이동 (Move)</option>
            </select>
          </div>

          {/* 3. 검색어 */}
          <div>
            <label className="block text-sm text-gray-300 mb-2 font-bold">검색어 (Keyword)</label>
            <input 
                type="text" 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="품목명, 코드, 위치, 비고 등"
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none placeholder-gray-600"
            />
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="flex justify-end gap-3 mt-10 border-t border-gray-800 pt-6">
          <button 
              onClick={handleReset}
              className="flex items-center gap-2 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition text-sm font-bold"
          >
              <RotateCcw size={18} /> 초기화
          </button>
          <button 
              onClick={handleSearch}
              className="flex items-center gap-2 px-10 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition text-sm font-bold shadow-lg shadow-blue-900/30"
          >
              <Search size={18} /> 조회 (Execute)
          </button>
        </div>
      </div>
    </div>
  );
}