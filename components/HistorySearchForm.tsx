"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RotateCcw, Calendar, Filter } from "lucide-react";

export default function HistorySearchForm() {
  const router = useRouter();
  
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = getTodayString();
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
    <div className="max-w-4xl mx-auto mt-4 md:mt-10 p-4 md:p-6 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl animate-fade-in">
      
      {/* 헤더 */}
      <div className="flex items-center gap-3 mb-4 md:mb-8 border-b border-gray-800 pb-3 md:pb-4">
        <Filter className="text-blue-500" size={24} />
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-white">수불 이력 조회</h1>
          <p className="text-gray-400 text-xs md:text-sm">조건 설정 후 조회 버튼을 눌러주세요.</p>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        
        {/* 1. 날짜 범위 (모바일에서도 가로 배치) */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
            <Calendar size={16} /> 조회 기간
          </label>
          {/* 🔴 [수정] grid-cols-2로 한 줄에 배치 + gap 줄임 */}
          <div className="grid grid-cols-2 gap-2 md:gap-4 items-center">
             <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              // 🔴 [수정] appearance-none 추가 및 padding 조정
              className="w-full bg-black border border-gray-700 text-white rounded-lg px-2 md:px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none appearance-none h-12 text-sm md:text-base text-center [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-black border border-gray-700 text-white rounded-lg px-2 md:px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none appearance-none h-12 text-sm md:text-base text-center [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>

        {/* 2. 입출고 구분 & 검색어 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">구분 (Type)</label>
            <div className="relative">
                <select 
                  value={txType}
                  onChange={(e) => setTxType(e.target.value)}
                  className="w-full bg-black border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none appearance-none h-12 text-sm md:text-base"
                >
                  <option value="ALL">전체 (All)</option>
                  <option value="INBOUND">입고 (In)</option>
                  <option value="OUTBOUND">출고 (Out)</option>
                  <option value="MOVE">이동 (Move)</option>
                  <option value="ADJUST">조정 (Adjust)</option>
                </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">검색어 (Keyword)</label>
            <input 
              type="text" 
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="품목명, 코드, 위치 등"
              className="w-full bg-black border border-gray-700 text-white rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 outline-none placeholder:text-gray-600 h-12 text-sm md:text-base"
            />
          </div>
        </div>

        {/* 3. 버튼 영역 */}
        <div className="pt-2 flex flex-col md:flex-row gap-3 justify-end">
          <button 
            onClick={handleReset}
            className="w-full md:w-auto px-6 py-3 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition font-bold flex items-center justify-center gap-2 h-12 md:h-auto border border-gray-700 text-sm md:text-base"
          >
            <RotateCcw size={16} /> 초기화
          </button>
          
          <button
            onClick={handleSearch}
            disabled={loading}
            className="w-full md:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 h-12 md:h-auto text-base md:text-lg active:scale-[0.98]"
          >
            {loading ? <span className="animate-spin">⟳</span> : <Search size={18} />}
            조회 실행
          </button>
        </div>

      </div>
    </div>
  );
}