'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Search, AlertTriangle, X, Loader2, Check, Package, Box } from 'lucide-react';
import { useUI } from '@/context/UIProvider';
import { TX_TYPES, TxCode, getTxTypesByGroup } from '@/constants/transaction'; 
import { useAuth } from "@/context/AuthProvider"; // ✨ [추가]

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

interface SearchCandidate {
  item_key: string;
  item_name: string;
  normalizedName: string;
}

export default function OutboundPage() {
  const router = useRouter();
  const supabase = createClient();
  const { alert, confirm, toast } = useUI();
  const { user } = useAuth(); // ✨ [추가] 유저 정보

  // --- 상태 관리 ---
  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  // 🚀 [신규] 출고 유형 상태 (기본값: 생산 투입)
  const [txCode, setTxCode] = useState<TxCode>('OUT_PROD');

  const [masterCandidates, setMasterCandidates] = useState<SearchCandidate[]>([]);
  const isMasterLoaded = useRef(false);

  const [outQty, setOutQty] = useState("");
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);

  // --- 0. 초기화 (마스터 데이터 로드 - 기존 동일) ---
  useEffect(() => {
    const loadMasterData = async () => {
      if (isMasterLoaded.current) return;
      const { data } = await supabase.from('item_master').select('item_key, item_name').eq('active_flag', 'Y');
      if (data) {
        setMasterCandidates(data.map(d => ({
          item_key: d.item_key,
          item_name: d.item_name,
          normalizedName: (d.item_name || "").replace(/\s+/g, "").toLowerCase()
        })));
        isMasterLoaded.current = true;
      }
    };
    loadMasterData();
  }, [supabase]);

  // --- 1. 스마트 검색 로직 (기존 동일) ---
  const executeSearch = useCallback(async (term: string) => {
    setIsSearching(true);
    setSearchResults([]);
    setSelectedStock(null);

    try {
      const cleanTerm = term.replace(/\s+/g, "").toLowerCase(); 
      const originalTerm = term.trim();

      if (!cleanTerm) {
        setIsSearching(false);
        return;
      }

      const matchedKeys = masterCandidates
        .filter(candidate => candidate.normalizedName.includes(cleanTerm))
        .map(c => c.item_key);

      let inventoryQuery = supabase.from('inventory').select(`
          id, location_code, item_key, lot_no, quantity,
          item_master ( item_name, uom )
        `);

      const orConditions = [];
      if (matchedKeys.length > 0) orConditions.push(`item_key.in.(${matchedKeys.slice(0, 50).join(',')})`);
      orConditions.push(`location_code.ilike.%${originalTerm}%`);
      orConditions.push(`lot_no.ilike.%${originalTerm}%`);
      orConditions.push(`item_key.ilike.%${originalTerm}%`);
      if (cleanTerm.length > 2) orConditions.push(`location_code.ilike.%${cleanTerm}%`);

      const { data, error } = await inventoryQuery.or(orConditions.join(',')).limit(30);

      if (error) throw error;
      setSearchResults(data as any[] || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [supabase, masterCandidates]);

  // --- 2. Debounce (기존 동일) ---
  useEffect(() => {
    const handler = setTimeout(() => {
        if (keyword.trim()) executeSearch(keyword);
        else setSearchResults([]);
    }, 300);
    return () => clearTimeout(handler);
  }, [keyword, executeSearch]);

  const handleSelectStock = (stock: StockItem) => {
    setSelectedStock(stock);
    setOutQty(""); 
    setRemark(""); 
    // 선택 시 기본값 유지
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  // --- 3. 출고 실행 핸들러 (업데이트됨) ---
  const handleOutbound = async () => {
    if (!user) { // ✨ 안전장치
        await alert("로그인 세션이 만료되었습니다.", "error");
        return;
    }
    if (!selectedStock) return;
    const qty = Number(outQty);
    
    if (qty <= 0) return alert("출고 수량은 0보다 커야 합니다.", "error");
    if (qty > selectedStock.quantity) return alert(`출고 가능 수량을 초과했습니다.`, "error");

    // 🚀 확인 메시지에 출고 유형 포함
    const txLabel = TX_TYPES[txCode].label;
    const confirmMsg = `[${txLabel}]\n품목: ${selectedStock.item_master?.item_name}\n수량: ${qty.toLocaleString()}개\n\n출고하시겠습니까?`;
    
    if (!(await confirm(confirmMsg, "warning"))) return;

    setLoading(true);
    try {
      const newQty = selectedStock.quantity - qty;

      // 1. 재고 차감 (0이면 삭제)
      if (newQty === 0) {
        await supabase.from('inventory').delete().eq('id', selectedStock.id);
      } else {
        await supabase.from('inventory').update({ 
            quantity: newQty, 
            updated_at: new Date().toISOString(),
            updated_by: user.id // ✨ 수정자 기록
        }).eq('id', selectedStock.id);
      }

      // 2. 수불 이력 생성 (🚀 tx_code 및 created_by 저장!)
      await supabase.from('stock_tx').insert({
        transaction_type: 'OUTBOUND', 
        io_type: 'OUT',
        tx_code: txCode,               // ✨ 선택한 유형
        location_code: selectedStock.location_code, 
        item_key: selectedStock.item_key, 
        lot_no: selectedStock.lot_no,
        quantity: -qty, 
        remark: remark || txLabel,
        created_by: user.id            // ✨ 작업자 기록
      });

      await toast.success("출고 처리가 완료되었습니다.");
      
      // 초기화
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

        {/* 검색 영역 */}
        {!selectedStock && (
            <div className="mb-6">
                <div className="flex items-center bg-black border border-gray-700 rounded-xl p-4 focus-within:border-blue-500 transition-colors shadow-lg">
                    {isSearching ? <Loader2 className="mr-3 text-blue-500 animate-spin" size={24} /> : <Search className="mr-3 text-gray-500" size={24} />}
                    <input 
                        type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                        placeholder="품목명(띄어쓰기 무관), 위치, 코드..." className="bg-transparent w-full text-white text-lg outline-none placeholder:text-gray-600 font-medium" autoFocus
                    />
                    {keyword && <button onClick={() => setKeyword("")} className="text-gray-500 hover:text-white"><X size={20} /></button>}
                </div>
                <div className="mt-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {searchResults.map(stock => (
                        <div key={stock.id} onClick={() => handleSelectStock(stock)} className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl cursor-pointer hover:border-red-500 hover:bg-gray-800 transition active:scale-[0.98] group flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2 mb-1"><span className="bg-blue-900/30 text-blue-400 text-xs font-bold px-2 py-0.5 rounded border border-blue-800/50">{stock.location_code}</span><span className="text-xs text-gray-500">{stock.item_key}</span></div>
                                <div className="text-lg font-bold text-white group-hover:text-red-400 transition">{stock.item_master?.item_name || "품목명 없음"}</div>
                                <div className="text-xs text-gray-500 font-mono mt-0.5">LOT: {stock.lot_no}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-bold text-white">{stock.quantity.toLocaleString()}</div>
                                <div className="text-xs text-gray-500">{stock.item_master?.uom}</div>
                            </div>
                        </div>
                    ))}
                    {keyword && !isSearching && searchResults.length === 0 && <div className="text-center text-gray-500 py-10">검색 결과가 없습니다.</div>}
                </div>
            </div>
        )}

        {/* 출고 입력 폼 */}
        {selectedStock && (
            <div className="bg-gray-900 border border-red-900/30 rounded-xl p-6 shadow-2xl animate-fade-in-up">
                
                {/* 선택된 재고 정보 */}
                <div className="mb-6 bg-black border border-gray-800 p-5 rounded-xl flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin size={16} className="text-blue-500"/> <span className="text-xl font-bold text-white">{selectedStock.location_code}</span>
                        </div>
                        <div className="text-gray-300 font-medium">{selectedStock.item_master?.item_name}</div>
                        <div className="text-sm text-gray-500 mt-1">LOT: {selectedStock.lot_no}</div>
                    </div>
                    <div className="text-right">
                         <div className="text-xs text-gray-500 uppercase">Current Stock</div>
                         <div className="text-2xl font-bold text-blue-400">{selectedStock.quantity.toLocaleString()}</div>
                    </div>
                </div>

                <div className="space-y-6">
                    
                    {/* 🚀 [신규 UI] 출고 유형 선택 */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-3 font-bold">출고 유형 (Issue Type)</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {getTxTypesByGroup('OUT').map((type) => (
                                <button
                                    key={type.code}
                                    onClick={() => setTxCode(type.code as TxCode)}
                                    className={`relative px-3 py-3 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                                        txCode === type.code
                                            ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/50 ring-1 ring-red-400"
                                            : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                                    }`}
                                >
                                    {txCode === type.code && <Check size={14} className="absolute left-2 text-white/70" />}
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm text-gray-400 mb-2 font-bold">출고 수량</label>
                        <div className="relative">
                            <input 
                                type="number" value={outQty} onChange={(e) => setOutQty(e.target.value)}
                                className="w-full bg-black border border-gray-700 rounded-xl p-4 text-right text-3xl font-bold text-white focus:border-red-500 outline-none"
                                placeholder="0" autoFocus
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-sm bg-gray-900 px-2 py-1 rounded">EA</span>
                        </div>
                    </div>

                    <div>
                         <label className="block text-sm text-gray-400 mb-2">비고 (선택사항)</label>
                         <input 
                            type="text" value={remark} onChange={(e) => setRemark(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-gray-500 placeholder:text-gray-600"
                            placeholder="특이사항이 있을 경우에만 입력하세요."
                          />
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setSelectedStock(null)} className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-xl transition">취소</button>
                        <button onClick={handleOutbound} disabled={loading} className="flex-[2] py-4 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold rounded-xl shadow-lg shadow-red-900/20 disabled:opacity-50 transition transform active:scale-[0.98] flex items-center justify-center gap-2">
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