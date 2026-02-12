"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RotateCcw, Calendar, Filter } from "lucide-react";

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
    <div className="max-w-4xl mx-auto mt-4 md:mt-10 p-5 md:p-6 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl animate-fade-in">
      
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-6 md:mb-8 border-b border-gray-800 pb-4">
        <Filter className="text-blue-500" size={28} />
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">수불 이력 조회</h1>
          <p className="text-gray-400 text-xs md:text-sm">조회 조건을 설정하고 실행 버튼을 눌러주세요.</p>
        </div>
      </div>

      <div className="space-y-6">
        
        {/* 1. 날짜 범위 선택 (모바일: 세로, PC: 가로) */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
            <Calendar size={16} /> 조회 기간 (Date Range)
          </label>
          
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
            {/* 시작일 */}
            <div className="w-full relative">
                 <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert h-12 text-center md:text-left"
                />
            </div>

            {/* 구분자 (~): 모바일에서는 회전하여 세로 표시 */}
            <span className="text-gray-500 transform rotate-90 md:rotate-0">~</span>

            {/* 종료일 */}
            <div className="w-full relative">
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-black border border-gray-700 text-white rounded-lg px-4 py-3 w-full focus:ring-2 focus:ring-blue-500 outline-none [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert h-12 text-center md:text-left"
                />
            </div>
          </div>
        </div>

        {/* 2. 입출고 구분 & 검색어 (그리드 레이아웃) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6">
          {/* 입출고 구분 */}
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">입출고 구분 (Type)</label>
            <div className="relative">
                <select 
                  value={txType}
                  onChange={(e) => setTxType(e.target.value)}
                  className="w-full bg-black border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none appearance-none h-12"
                >
                  <option value="ALL">전체 (All Transactions)</option>
                  <option value="INBOUND">입고 (Inbound)</option>
                  <option value="OUTBOUND">출고 (Outbound)</option>
                  <option value="MOVE">이동 (Move)</option>
                  <option value="ADJUST">조정 (Adjust)</option>
                </select>
                {/* 커스텀 화살표 아이콘 (선택 사항) */}
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
            </div>
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
              className="w-full bg-black border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-600 h-12"
            />
          </div>
        </div>

        {/* 3. 버튼 영역 (모바일: 세로, PC: 가로) */}
        <div className="pt-2 flex flex-col md:flex-row gap-3 justify-end">
          <button 
            onClick={handleReset}
            className="w-full md:w-auto px-6 py-3 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition font-bold flex items-center justify-center gap-2 h-14 md:h-auto border border-gray-700"
          >
            <RotateCcw size={18} /> 초기화
          </button>
          
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 h-14 md:h-auto text-lg active:scale-[0.98]"
          >
            {loading ? <span className="animate-spin">⟳</span> : <Search size={20} />}
            조회 실행 (Execute)
          </button>
        </div>

      </div>
    </div>
  );
}