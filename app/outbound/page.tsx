'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Search, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useUI } from '@/context/UIProvider';

// 재고 타입 정의
interface StockItem {
  id: number;
  location_code: string;
  item_key: string;
  lot_no: string;
  quantity: number;
  item_master: {
    item_name: string;
    uom: string;
  } | null;
}

// 가벼운 검색용 아이템 타입
interface SearchCandidate {
  item_key: string;
  item_name: string;
  normalizedName: string; // 띄어쓰기 제거된 이름
}

export default function OutboundPage() {
  const router = useRouter();
  const supabase = createClient();
  const { alert, confirm, toast } = useUI();

  // --- 상태 관리 ---
  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  // 🚀 [신규] 검색 성능을 위한 마스터 데이터 캐시
  const [masterCandidates, setMasterCandidates] = useState<SearchCandidate[]>([]);
  const isMasterLoaded = useRef(false);

  // 출고 입력 폼
  const [outQty, setOutQty] = useState("");
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);

  // --- 0. 초기화: 품목 마스터 미리 로드 (Lightweight) ---
  useEffect(() => {
    const loadMasterData = async () => {
      if (isMasterLoaded.current) return;
      
      // 이름과 키만 가져오므로 데이터가 많아도 매우 빠릅니다.
      const { data } = await supabase
        .from('item_master')
        .select('item_key, item_name')
        .eq('active_flag', 'Y'); // 활성 품목만

      if (data) {
        // 검색 속도를 위해 미리 "공백 제거된 이름"을 만들어둡니다.
        const candidates = data.map(d => ({
          item_key: d.item_key,
          item_name: d.item_name,
          normalizedName: (d.item_name || "").replace(/\s+/g, "").toLowerCase() // "닭 안심" -> "닭안심"
        }));
        setMasterCandidates(candidates);
        isMasterLoaded.current = true;
      }
    };
    loadMasterData();
  }, [supabase]);

  // --- 1. 스마트 검색 로직 ---
  const executeSearch = useCallback(async (term: string) => {
    setIsSearching(true);
    setSearchResults([]);
    setSelectedStock(null);

    try {
      // 1. 검색어 정규화 (모든 공백 제거)
      // 예: "필렛 닭" -> "필렛닭"
      const cleanTerm = term.replace(/\s+/g, "").toLowerCase(); 
      const originalTerm = term.trim();

      if (!cleanTerm) {
        setIsSearching(false);
        return;
      }

      // ---------------------------------------------------------
      // Step A. [메모리 검색] 품목 이름 매칭 (띄어쓰기 완전 무시)
      // ---------------------------------------------------------
      // DB가 아닌 메모리에서 찾으므로 "닭 안심" vs "닭안심" 문제 완벽 해결
      const matchedKeys = masterCandidates
        .filter(candidate => candidate.normalizedName.includes(cleanTerm))
        .map(c => c.item_key);

      // ---------------------------------------------------------
      // Step B. [DB 검색] 인벤토리 조회
      // ---------------------------------------------------------
      let inventoryQuery = supabase
        .from('inventory')
        .select(`
          id, location_code, item_key, lot_no, quantity,
          item_master ( item_name, uom )
        `);

      const orConditions = [];

      // 1. 이름으로 찾은 품목 키들 (매칭된 게 있으면)
      if (matchedKeys.length > 0) {
        // 너무 많으면 URL 길이 제한 걸릴 수 있으므로 50개만 자름 (충분함)
        const targetKeys = matchedKeys.slice(0, 50).join(',');
        orConditions.push(`item_key.in.(${targetKeys})`);
      }

      // 2. 위치 코드 (공백 무시하고 찾기는 어려우므로 like 검색)
      orConditions.push(`location_code.ilike.%${originalTerm}%`);
      
      // 3. LOT 번호
      orConditions.push(`lot_no.ilike.%${originalTerm}%`);
      
      // 4. 품목 코드 직접 입력
      orConditions.push(`item_key.ilike.%${originalTerm}%`);

      // 5. 위치 코드 (공백 제거 버전도 시도 - 예: "M A 1 1" -> "MA11")
      if (cleanTerm.length > 2) { // 너무 짧으면 비효율적
          orConditions.push(`location_code.ilike.%${cleanTerm}%`);
      }

      // 최종 쿼리 실행
      const { data, error } = await inventoryQuery
        .or(orConditions.join(','))
        .limit(30);

      if (error) throw error;
      setSearchResults(data as any[] || []);

    } catch (err: any) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [supabase, masterCandidates]); // masterCandidates가 로드된 후 작동

  // --- 2. 타이핑 감지 (Debounce) ---
  useEffect(() => {
    const handler = setTimeout(() => {
        if (keyword.trim()) {
            executeSearch(keyword); // 원본 검색어 전달
        } else {
            setSearchResults([]);
        }
    }, 300);

    return () => clearTimeout(handler);
  }, [keyword, executeSearch]);

  // --- 3. 재고 선택 핸들러 ---
  const handleSelectStock = (stock: StockItem) => {
    setSelectedStock(stock);
    setOutQty(""); 
    setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }, 100);
  };

  // --- 4. 출고 실행 핸들러 ---
  const handleOutbound = async () => {
    if (!selectedStock) return;
    const qty = Number(outQty);
    
    if (qty <= 0) return alert("출고 수량은 0보다 커야 합니다.", "error");
    if (qty > selectedStock.quantity) return alert(`출고 가능 수량을 초과했습니다.`, "error");

    if (!(await confirm(`[${selectedStock.item_master?.item_name || selectedStock.item_key}] ${qty}개 출고하시겠습니까?`, "warning"))) return;

    setLoading(true);
    try {
      const newQty = selectedStock.quantity - qty;

      if (newQty === 0) {
        await supabase.from('inventory').delete().eq('id', selectedStock.id);
      } else {
        await supabase.from('inventory').update({ quantity: newQty, updated_at: new Date().toISOString() }).eq('id', selectedStock.id);
      }

      await supabase.from('stock_tx').insert({
        transaction_type: 'OUTBOUND', io_type: 'OUT',
        location_code: selectedStock.location_code, item_key: selectedStock.item_key, lot_no: selectedStock.lot_no,
        quantity: -qty, remark: remark || '수기 출고 (Live Search)'
      });

      toast.success("출고 처리 완료");
      setSelectedStock(null);
      setOutQty("");
      setRemark("");
      setKeyword("");
      setSearchResults([]);

    } catch (err: any) {
      console.error(err);
      await alert(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)] flex justify-center pb-24">
      <div className="w-full max-w-2xl animate-fade-in">
        
        {/* 헤더 */}
        <div className="flex items-center justify-between gap-4 mb-6 border-b border-gray-800 pb-4">
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition"><ArrowLeft /></button>
                <h1 className="text-xl md:text-2xl font-bold text-red-500 flex items-center gap-2">
                    <AlertTriangle /> 재고 검색 출고
                </h1>
            </div>
            {selectedStock && (
                <button onClick={() => setSelectedStock(null)} className="text-xs bg-gray-800 px-3 py-1 rounded-full text-gray-300 hover:bg-gray-700 flex items-center gap-1">
                    <X size={12}/> 선택 취소
                </button>
            )}
        </div>

        {/* 1. 검색 영역 */}
        {!selectedStock && (
            <div className="mb-6">
                <div className="flex items-center bg-black border border-gray-700 rounded-xl p-4 focus-within:border-blue-500 transition-colors shadow-lg">
                    {isSearching ? (
                        <Loader2 className="mr-3 text-blue-500 animate-spin" size={24} />
                    ) : (
                        <Search className="mr-3 text-gray-500" size={24} />
                    )}
                    <input 
                        type="text" 
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="품목명(띄어쓰기 무관), 위치, 코드..." 
                        className="bg-transparent w-full text-white text-lg outline-none placeholder:text-gray-600 font-medium"
                        autoFocus
                    />
                    {keyword && (
                        <button onClick={() => setKeyword("")} className="text-gray-500 hover:text-white transition">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="mt-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {searchResults.length > 0 ? (
                        searchResults.map(stock => (
                            <div 
                                key={stock.id} 
                                onClick={() => handleSelectStock(stock)}
                                className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl cursor-pointer hover:border-red-500 hover:bg-gray-800 transition active:scale-[0.98] group flex justify-between items-center"
                            >
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="bg-blue-900/30 text-blue-400 text-xs font-bold px-2 py-0.5 rounded border border-blue-800/50">{stock.location_code}</span>
                                        <span className="text-xs text-gray-500">{stock.item_key}</span>
                                    </div>
                                    <div className="text-lg font-bold text-white group-hover:text-red-400 transition">{stock.item_master?.item_name || "품목명 없음"}</div>
                                    <div className="text-xs text-gray-500 font-mono mt-0.5">LOT: {stock.lot_no}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-white">{stock.quantity.toLocaleString()}</div>
                                    <div className="text-xs text-gray-500">{stock.item_master?.uom}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        keyword && !isSearching && (
                            <div className="text-center text-gray-500 py-10 border border-dashed border-gray-800 rounded-xl">
                                검색 결과가 없습니다.
                            </div>
                        )
                    )}
                </div>
            </div>
        )}

        {/* 2. 출고 입력 폼 (기존 유지) */}
        {selectedStock && (
            <div className="bg-gray-900 border border-red-900/30 rounded-xl p-6 shadow-2xl animate-fade-in-up">
                <div className="mb-6 bg-black border border-gray-800 p-5 rounded-xl flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin size={16} className="text-blue-500"/> 
                            <span className="text-xl font-bold text-white">{selectedStock.location_code}</span>
                        </div>
                        <div className="text-gray-300 font-medium">{selectedStock.item_master?.item_name}</div>
                        <div className="text-sm text-gray-500 mt-1">LOT: {selectedStock.lot_no}</div>
                    </div>
                    <div className="text-right">
                         <div className="text-xs text-gray-500 uppercase">Current Stock</div>
                         <div className="text-2xl font-bold text-blue-400">{selectedStock.quantity.toLocaleString()}</div>
                         <div className="text-xs text-gray-500">{selectedStock.item_master?.uom}</div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2 font-bold">출고 수량 (Out Qty)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={outQty}
                                onChange={(e) => setOutQty(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded-xl p-4 text-right text-3xl font-bold text-white focus:border-red-500 outline-none"
                                placeholder="0"
                                autoFocus
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-sm bg-gray-900 px-2 py-1 rounded border border-gray-800">EA</span>
                        </div>
                    </div>

                    <div>
                         <label className="block text-sm text-gray-400 mb-2">비고 (Remark)</label>
                         <input 
                            type="text" 
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-gray-500"
                            placeholder="출고 사유 입력"
                         />
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button 
                            onClick={() => setSelectedStock(null)}
                            className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition"
                        >
                            취소
                        </button>
                        <button 
                            onClick={handleOutbound}
                            disabled={loading}
                            className="flex-[2] py-4 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 disabled:opacity-50 transition transform active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" /> : '출고 확정'}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}