"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { Search, Calendar, Loader2, FileSpreadsheet } from "lucide-react";
import { useUI } from "@/context/UIProvider";

interface MasterItem {
  item_key: string;
  item_name: string;
  uom: string;
  active_flag: string;
}

interface DailyRecord {
  date: string;       // YYYY-MM-DD (KST)
  carryover: number;  // 이월수량 (전일 기말)
  inbound: number;    // 당일 입고 (+)
  outbound: number;   // 당일 출고 (-) -> 양수로 표기
  adjustment: number; // 당일 조정 (±)
  closing: number;    // 당일 기말수량 (이월 + 입고 - 출고 + 조정)
}

export default function DailyHistoryClient({ masterItems }: { masterItems: MasterItem[] }) {
  const supabase = createClient();
  const { alert: uiAlert } = useUI();

  // 날짜 기본값 세팅 (오늘부터 1달 전)
  const today = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(today.getMonth() - 1);

  const [startDate, setStartDate] = useState(oneMonthAgo.toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(today.toISOString().split("T")[0]);
  
  // 스마트 검색 상태
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<MasterItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<MasterItem | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);

  // 결과 데이터 상태
  const [dailyData, setDailyData] = useState<DailyRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🚀 1. 스마트 서치 로직 (품목명 또는 코드로 마스터 데이터 검색)
  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
    setSelectedItem(null);
    
    if (!term.trim()) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    const terms = term.toLowerCase().split(/\s+/).filter(Boolean);
    
    // 마스터 데이터에서 필터링 (메모리 검색으로 매우 빠름)
    const filtered = masterItems.filter(item => {
      const targetStr = `${item.item_key} ${item.item_name}`.toLowerCase();
      return terms.every(t => targetStr.includes(t));
    }).slice(0, 50); // 최대 50개만 표시

    setSearchResults(filtered);
    setIsDropdownOpen(true);
    setIsSearching(false);
  };

  const handleSelectItem = (item: MasterItem) => {
    setSelectedItem(item);
    setSearchTerm(`${item.item_name} (${item.item_key})`);
    setIsDropdownOpen(false);
  };

  // 🚀 2. 데이터 조회 및 KST 기준 일자별 수불 엔진
  const executeDailyQuery = async () => {
    if (!selectedItem) {
      uiAlert("조회할 품목을 먼저 선택해 주세요.", "warning");
      return;
    }
    if (!startDate || !endDate) {
      uiAlert("조회 기간을 설정해 주세요.", "warning");
      return;
    }

    setIsLoadingData(true);
    setHasSearched(true);
    setDailyData([]);

    try {
      // ✅ KST 날짜를 UTC 기준으로 변환하여 DB 조회용 Boundary 생성
      // 시작일 00:00:00 KST -> 전날 15:00:00 UTC
      const startKST = new Date(`${startDate}T00:00:00+09:00`); 
      // 종료일 23:59:59 KST -> 당일 14:59:59 UTC
      const endKST = new Date(`${endDate}T23:59:59+09:00`); 
      
      const startUTCStr = startKST.toISOString();
      const endUTCStr = endKST.toISOString();

      // [Query 1] 조회 시작일 '이전'의 모든 수량 합산 (이월수량 기초값)
      const { data: pastData, error: pastError } = await supabase
        .from('stock_tx')
        .select('quantity')
        .eq('item_key', selectedItem.item_key)
        .lt('transaction_date', startUTCStr);

      if (pastError) throw pastError;
      
      let initialCarryover = 0;
      pastData?.forEach(tx => {
        initialCarryover += Number(tx.quantity);
      });

      // [Query 2] 조회 기간 내의 트랜잭션 가져오기
      const { data: periodData, error: periodError } = await supabase
        .from('stock_tx')
        .select('transaction_date, transaction_type, quantity')
        .eq('item_key', selectedItem.item_key)
        .gte('transaction_date', startUTCStr)
        .lte('transaction_date', endUTCStr)
        .order('transaction_date', { ascending: true });

      if (periodError) throw periodError;

      // 트랜잭션을 KST 날짜(YYYY-MM-DD) 기준으로 그룹핑
      const groupedByDate: Record<string, { in: number, out: number, adj: number }> = {};

      periodData?.forEach(tx => {
        // UTC 시간문자열을 JS Date 객체로 변환하면 브라우저 로컬 타임존(한국)으로 자동 적용됨
        const kstDate = new Date(tx.transaction_date);
        // YYYY-MM-DD 포맷 추출
        const dateKey = `${kstDate.getFullYear()}-${String(kstDate.getMonth() + 1).padStart(2, '0')}-${String(kstDate.getDate()).padStart(2, '0')}`;
        
        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = { in: 0, out: 0, adj: 0 };
        }

        const qty = Number(tx.quantity);
        if (tx.transaction_type === 'INBOUND') {
          groupedByDate[dateKey].in += qty;
        } else if (tx.transaction_type === 'OUTBOUND') {
          groupedByDate[dateKey].out += Math.abs(qty); // 출고는 양수로 표시하기 위해 절댓값
        } else if (tx.transaction_type === 'ADJUSTMENT') {
          groupedByDate[dateKey].adj += qty;
        }
        // MOVE는 수불 집계에서 무시
      });

      // 날짜 오름차순 정렬 및 폭포수(Waterfall) 계산
      const sortedDates = Object.keys(groupedByDate).sort();
      const result: DailyRecord[] = [];
      let currentCarryover = initialCarryover;

      sortedDates.forEach(date => {
        const d = groupedByDate[date];
        // 기말 = 이월 + 입고 - 출고 + 조정
        const closing = currentCarryover + d.in - d.out + d.adj;
        
        result.push({
          date,
          carryover: currentCarryover,
          inbound: d.in,
          outbound: d.out,
          adjustment: d.adj,
          closing: closing
        });

        // 당일 기말이 다음날 이월로 넘어감
        currentCarryover = closing;
      });

      // 오름차순으로 정렬
      setDailyData(result);

    } catch (err: any) {
      console.error(err);
      uiAlert("수불 데이터를 불러오는 중 오류가 발생했습니다.", "error");
    } finally {
      setIsLoadingData(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 🚀 검색 필터 영역 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 md:p-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* 품목 검색 (스마트 서치) */}
          <div className="md:col-span-6 relative" ref={searchRef}>
            <label className="block text-xs font-bold text-gray-400 mb-2">대상 품목 (필수)</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={18} />
              <input 
                type="text" 
                placeholder="품목명 또는 코드를 입력하세요..." 
                value={searchTerm}
                onChange={handleSearchInput}
                onClick={() => { if(searchTerm && searchResults.length > 0) setIsDropdownOpen(true); }}
                className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* 드롭다운 결과 */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl max-h-60 overflow-y-auto custom-scrollbar">
                {searchResults.map((item) => (
                  <div 
                    key={item.item_key} 
                    onClick={() => handleSelectItem(item)}
                    className="px-4 py-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700/50 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{item.item_name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${item.active_flag === 'Y' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                        {item.active_flag === 'Y' ? '사용중' : '중지됨'}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 font-mono mt-1">{item.item_key} | {item.uom}</div>
                  </div>
                ))}
              </div>
            )}
            {isDropdownOpen && searchTerm && searchResults.length === 0 && !isSearching && (
              <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg p-4 text-center text-sm text-gray-400 shadow-xl">
                검색 결과가 없습니다.
              </div>
            )}
          </div>

          {/* 기간 선택 */}
          <div className="md:col-span-6 flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-400 mb-2">조회 시작일</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-400 mb-2">조회 종료일</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" size={16} />
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-black border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 실행 버튼 */}
        <div className="mt-6 flex justify-end">
          <button 
            onClick={executeDailyQuery}
            disabled={isLoadingData || !selectedItem}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isLoadingData ? <Loader2 className="animate-spin" size={18}/> : <FileSpreadsheet size={18} />}
            장부 조회 실행
          </button>
        </div>
      </div>

      {/* 🚀 결과 테이블 영역 */}
      {hasSearched && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-sm">
          {selectedItem && (
            <div className="bg-gray-800/50 p-4 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">{selectedItem.item_name}</h3>
                <p className="text-xs text-blue-400 font-mono mt-0.5">코드: {selectedItem.item_key} | 단위: {selectedItem.uom}</p>
              </div>
              <div className="text-sm text-gray-400 bg-black px-3 py-1.5 rounded-lg border border-gray-700">
                {startDate} ~ {endDate}
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right text-gray-300">
              <thead className="bg-gray-800 text-gray-400 uppercase border-b border-gray-700 text-xs">
                <tr>
                  <th className="px-6 py-4 text-center font-bold">일자 (Date)</th>
                  <th className="px-6 py-4 font-bold text-gray-400">이월수량 (기초)</th>
                  <th className="px-6 py-4 font-bold text-blue-400">입고수량 (+)</th>
                  <th className="px-6 py-4 font-bold text-red-400">출고수량 (-)</th>
                  <th className="px-6 py-4 font-bold text-yellow-500">조정수량 (±)</th>
                  <th className="px-6 py-4 font-bold text-white text-base">당일 기말재고</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {dailyData.length > 0 ? (
                  dailyData.map((row) => (
                    <tr key={row.date} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4 text-center font-mono text-gray-400">{row.date}</td>
                      <td className="px-6 py-4 text-gray-500">{row.carryover.toLocaleString()}</td>
                      <td className="px-6 py-4 text-blue-300">{row.inbound > 0 ? row.inbound.toLocaleString() : '-'}</td>
                      <td className="px-6 py-4 text-red-300">{row.outbound > 0 ? row.outbound.toLocaleString() : '-'}</td>
                      <td className="px-6 py-4 text-yellow-400/80">{row.adjustment !== 0 ? row.adjustment.toLocaleString() : '-'}</td>
                      <td className="px-6 py-4 font-black text-white text-base">{row.closing.toLocaleString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <p className="text-base mb-1">해당 기간 동안 수불 발생 내역이 없습니다.</p>
                      <p className="text-xs">움직임이 없는 날짜는 표시되지 않습니다.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}