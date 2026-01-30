"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RotateCcw, Calendar, Filter, Box } from "lucide-react";

export default function HistorySearchForm() {
  const router = useRouter();
  
  // 오늘 날짜 구하기 (YYYY-MM-DD 포맷)
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayString();

  // 시작일과 종료일 모두 오늘 날짜로 초기화
  const [startDate, setStartDate] = useState(todayStr); 
  const [endDate, setEndDate] = useState(todayStr);
  
  const [txType, setTxType] = useState("ALL");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSearch = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("search", "true");
    
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    if (txType && txType !== "ALL") params.set("txType", txType);
    if (keyword) params.set("keyword", keyword);

    router.push(`/history?${params.toString()}`);
  };

  const handleReset = () => {
    setStartDate(todayStr); 
    setEndDate(todayStr);
    setTxType("ALL");
    setKeyword("");
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-8 border-b border-gray-800 pb-4">
        <Filter className="text-blue-500" size={32} />
        <div>
          <h1 className="text-2xl font-bold text-white">수불 이력 조회 (Transaction History)</h1>
          <p className="text-gray-400 text-sm">조회 조건을 설정하고 실행 버튼을 눌러주세요.</p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* 날짜 범위 선택 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
            <Calendar size={16} /> 조회 기간 (Date Range)
          </label>
          <div className="flex items-center gap-4">
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              // ✨ [수정] 아이콘 색상 반전 클래스 추가 ([&::-webkit...]:invert)
              className="bg-black border border-gray-700 text-white rounded-lg px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            />
            <span className="text-gray-500">~</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              // ✨ [수정] 아이콘 색상 반전 클래스 추가
              className="bg-black border border-gray-700 text-white rounded-lg px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 입출고 구분 */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">입출고 구분 (Type)</label>
            <select 
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="w-full bg-black border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
            >
              <option value="ALL">전체 (All Transactions)</option>
              <option value="INBOUND">입고 (Inbound)</option>
              <option value="OUTBOUND">출고 (Outbound)</option>
              <option value="MOVE">이동 (Move)</option>
              <option value="ADJUST">조정 (Adjust)</option>
            </select>
          </div>

          {/* 검색어 */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">검색어 (Keyword)</label>
            <input 
              type="text" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="품목명, 코드, 위치, 비고 등"
              className="w-full bg-black border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-600"
            />
          </div>
        </div>

        {/* 버튼 */}
        <div className="pt-4 flex gap-3 justify-end">
          <button 
            onClick={handleReset}
            className="px-6 py-3 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition font-bold flex items-center gap-2"
          >
            <RotateCcw size={18} /> 초기화
          </button>
          
          <button
            onClick={handleSearch}
            disabled={loading}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/30 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <span className="animate-spin">⟳</span> : <Search size={20} />}
            조회 (Execute)
          </button>
        </div>

      </div>
    </div>
  );
}