'use client';

import { createClient } from '@/utils/supabase/client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Search, AlertTriangle, X, Loader2, Check, Package, Box, Layers } from 'lucide-react';
import { useUI } from '@/context/UIProvider';
import { TX_TYPES, TxCode, getTxTypesByGroup } from '@/constants/transaction'; 
import { useAuth } from "@/context/AuthProvider"; 

interface StockItem {
  id: number;
  location_code: string;
  item_key: string;
  lot_no: string;
  quantity: number;
  item_master: {
    item_name: string;
    uom: string;
    item_type?: string; // 🚀 [추가] 품목 유형 확인을 위해 추가
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
  const { user } = useAuth(); 

  // --- 상태 관리 ---
  const [keyword, setKeyword] = useState("");
  const [searchResults, setSearchResults] = useState<StockItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockItem | null>(null);

  const [txCode, setTxCode] = useState<TxCode>('OUT_PROD');

  const [masterCandidates, setMasterCandidates] = useState<SearchCandidate[]>([]);
  const isMasterLoaded = useRef(false);

  // 🚀 [수정] 입력값을 문자열로 관리하여 소수점 입력 안정성 확보
  const [outQty, setOutQty] = useState("");
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(false);

  // --- 0. 초기화 ---
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

  // --- 1. 스마트 검색 로직 ---
  const executeSearch = useCallback(async (term: string) => {
    setIsSearching(true);
    setSearchResults([]);
    setSelectedStock(null);

    try {
      const cleanTerm = term.trim();
      if (!cleanTerm) {
        setIsSearching(false);
        return;
      }

      const terms = cleanTerm.toLowerCase().split(/\s+/).filter(Boolean);

      const targetItemKeys = masterCandidates
        .filter(c => {
            const name = c.item_name.toLowerCase();
            const code = c.item_key.toLowerCase();
            return terms.every(t => name.includes(t) || code.includes(t));
        })
        .map(c => c.item_key);

      const promises = [];

      const CHUNK_SIZE = 30;
      for (let i = 0; i < targetItemKeys.length; i += CHUNK_SIZE) {
          const chunk = targetItemKeys.slice(i, i + CHUNK_SIZE);
          
          const itemQuery = supabase
              .from('inventory')
              .select(`
                  id, location_code, item_key, lot_no, quantity,
                  item_master!inner ( item_name, uom, item_type ) 
              `)
              .in('item_key', chunk);
          
          promises.push(itemQuery);
      }

      const textConditions: string[] = [];
      terms.forEach(t => {
          textConditions.push(`location_code.ilike.%${t}%`);
          textConditions.push(`lot_no.ilike.%${t}%`);
          textConditions.push(`item_key.ilike.%${t}%`);
      });

      if (textConditions.length > 0) {
          const metaQuery = supabase
              .from('inventory')
              .select(`
                  id, location_code, item_key, lot_no, quantity,
                  item_master!inner ( item_name, uom, item_type )
              `)
              .or(textConditions.join(','))
              .limit(50);
          
          promises.push(metaQuery);
      }

      const responses = await Promise.all(promises);
      
      let allRows: any[] = [];
      responses.forEach(res => {
          if (res.data) allRows = [...allRows, ...res.data];
          if (res.error) console.error(res.error); 
      });

      const uniqueRows = Array.from(new Map(allRows.map(item => [item['id'], item])).values());

      const finalResults = uniqueRows.filter(stock => {
          const targetStr = `
            ${stock.location_code} 
            ${stock.item_key} 
            ${stock.item_master?.item_name || ''} 
            ${stock.lot_no}
          `.toLowerCase();

          return terms.every(t => targetStr.includes(t));
      });

      setSearchResults(finalResults);

    } catch (err) {
      console.error(err);
      toast.error("검색 중 치명적인 오류가 발생했습니다.");
    } finally {
      setIsSearching(false);
    }
  }, [supabase, masterCandidates]);

  // --- 2. Debounce ---
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
    setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 100);
  };

  // 🚀 [추가] 소수점 자릿수 동적 계산 함수
  const getMaxDecimal = () => {
    if (!selectedStock || !selectedStock.item_master) return 0;
    const { uom, item_type } = selectedStock.item_master;
    
    if (uom === 'KM') return 3;
    if (item_type === '원자재' || item_type === '원료') return 2;
    return 0; // 나머지는 정수
  };

  // 🚀 [추가] 소수점 입력 제어 정규식
  const sanitizeDecimalInput = (val: string, maxDec: number) => {
    let sanitized = val.replace(/[^0-9.]/g, ''); 
    if (maxDec === 0) return sanitized.replace(/\./g, ''); 

    const parts = sanitized.split('.');
    if (parts.length > 2) sanitized = parts[0] + '.' + parts.slice(1).join('');
    
    const finalParts = sanitized.split('.');
    if (finalParts.length === 2 && finalParts[1].length > maxDec) {
        sanitized = finalParts[0] + '.' + finalParts[1].slice(0, maxDec);
    }
    return sanitized;
  };

  // 🚀 [추가] 출고 수량 변경 핸들러
  const handleOutQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxDec = getMaxDecimal();
    const val = sanitizeDecimalInput(e.target.value, maxDec);
    
    // 출고 가능 수량을 초과해서 입력하지 못하게 막음 (선택사항 - 불편하면 제거 가능)
    if (Number(val) > (selectedStock?.quantity || 0)) {
        setOutQty(String(selectedStock?.quantity || ""));
        return;
    }
    
    setOutQty(val);
  };

  // --- 3. 출고 실행 핸들러 ---
  const handleOutbound = async () => {
    if (!user) { 
        await alert("로그인 세션이 만료되었습니다.", "error");
        return;
    }
    if (!selectedStock) return;
    
    const qty = Number(outQty);
    
    if (qty <= 0) return alert("출고 수량은 0보다 커야 합니다.", "error");
    if (qty > selectedStock.quantity) return alert(`출고 가능 수량을 초과했습니다.`, "error");

    const txLabel = TX_TYPES[txCode].label;
    const confirmMsg = `[${txLabel}]\n품목: ${selectedStock.item_master?.item_name}\n수량: ${qty.toLocaleString()}\n\n출고하시겠습니까?`;
    
    if (!(await confirm(confirmMsg, "warning"))) return;

    setLoading(true);
    try {
      // 🚀 부동 소수점 오차 방지
      const newQty = Number((selectedStock.quantity - qty).toFixed(4));

      if (newQty <= 0) {
        await supabase.from('inventory').delete().eq('id', selectedStock.id);
      } else {
        await supabase.from('inventory').update({ 
            quantity: newQty, 
            updated_at: new Date().toISOString(),
            updated_by: user.id 
        }).eq('id', selectedStock.id);
      }

      await supabase.from('stock_tx').insert({
        transaction_type: 'OUTBOUND', 
        io_type: 'OUT',
        tx_code: txCode, 
        location_code: selectedStock.location_code, 
        item_key: selectedStock.item_key, 
        lot_no: selectedStock.lot_no,
        quantity: -qty, 
        remark: remark || txLabel,
        created_by: user.id 
      });

      await toast.success("출고 처리가 완료되었습니다.");
      
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

  const currentMaxDec = getMaxDecimal();
  const placeholderValue = currentMaxDec === 3 ? "0.000" : currentMaxDec === 2 ? "0.00" : "0";

  return (
    // 🚀 [톤업] bg-black -> bg-slate-950
    <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-slate-100 font-[family-name:var(--font-geist-sans)] flex justify-center pb-24">
      <div className="w-full max-w-2xl animate-fade-in">
        
        {/* 헤더 영역 */}
        <div className="flex items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
                <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition"><ArrowLeft /></button>
                <h1 className="text-xl md:text-2xl font-bold text-rose-500 flex items-center gap-2">
                    <AlertTriangle /> 단일 출고
                </h1>
            </div>
            
            <div className="flex items-center gap-2">
                {!selectedStock && (
                    <Link 
                        href="/outbound/bulk" 
                        // 🚀 [톤업] bg-red -> bg-rose
                        className="bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 text-rose-400 hover:text-rose-300 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition"
                    >
                        <Layers size={16} /> 대량 할당 출고 ➔
                    </Link>
                )}

                {selectedStock && (
                    <button onClick={() => setSelectedStock(null)} className="text-xs bg-slate-800 px-3 py-1 rounded-full text-slate-300 hover:bg-slate-700 flex items-center gap-1 h-8 transition">
                        <X size={12}/> 선택 취소
                    </button>
                )}
            </div>
        </div>

        {/* 검색 영역 */}
        {!selectedStock && (
            <div className="mb-6">
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-4 focus-within:border-blue-500 transition-colors shadow-lg">
                    {isSearching ? <Loader2 className="mr-3 text-blue-500 animate-spin" size={24} /> : <Search className="mr-3 text-slate-500" size={24} />}
                    <input 
                        type="text" value={keyword} onChange={(e) => setKeyword(e.target.value)}
                        placeholder="품목명(띄어쓰기 무관), 위치, 코드..." className="bg-transparent w-full text-white text-lg outline-none placeholder:text-slate-600 font-medium" autoFocus
                    />
                    {keyword && <button onClick={() => setKeyword("")} className="text-slate-500 hover:text-white"><X size={20} /></button>}
                </div>
                <div className="mt-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {searchResults.map(stock => (
                        <div key={stock.id} onClick={() => handleSelectStock(stock)} className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl cursor-pointer hover:border-rose-500 hover:bg-slate-800 transition active:scale-[0.98] group flex justify-between items-center shadow-sm">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="bg-blue-900/40 text-blue-300 text-xs font-bold px-2 py-0.5 rounded border border-blue-800/50">{stock.location_code}</span>
                                    <span className="text-xs text-slate-500">{stock.item_key}</span>
                                </div>
                                <div className="text-lg font-bold text-slate-200 group-hover:text-rose-400 transition">{stock.item_master?.item_name || "품목명 없음"}</div>
                                <div className="text-xs text-slate-500 font-mono mt-0.5">LOT: {stock.lot_no}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-xl font-bold text-slate-100">{stock.quantity.toLocaleString()}</div>
                                <div className="text-xs text-slate-500">{stock.item_master?.uom}</div>
                            </div>
                        </div>
                    ))}
                    {keyword && !isSearching && searchResults.length === 0 && <div className="text-center text-slate-500 py-10">검색 결과가 없습니다.</div>}
                </div>
            </div>
        )}

        {/* 출고 입력 폼 */}
        {selectedStock && (
            <div className="bg-slate-900 border border-rose-900/30 rounded-xl p-6 shadow-2xl animate-fade-in-up">
                
                {/* 선택된 재고 정보 */}
                <div className="mb-6 bg-slate-950 border border-slate-800 p-5 rounded-xl flex justify-between items-center shadow-inner">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin size={16} className="text-blue-500"/> <span className="text-xl font-bold text-white">{selectedStock.location_code}</span>
                        </div>
                        <div className="text-slate-300 font-medium">{selectedStock.item_master?.item_name}</div>
                        <div className="text-sm text-slate-500 mt-1">LOT: {selectedStock.lot_no}</div>
                    </div>
                    <div className="text-right">
                         <div className="text-xs text-slate-500 uppercase">Current Stock</div>
                         <div className="text-2xl font-bold text-blue-400">{selectedStock.quantity.toLocaleString()}</div>
                    </div>
                </div>

                <div className="space-y-6">
                    
                    {/* 출고 유형 선택 */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-3 font-bold">출고 유형 (Issue Type)</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {getTxTypesByGroup('OUT').map((type) => (
                                <button
                                    key={type.code}
                                    onClick={() => setTxCode(type.code as TxCode)}
                                    className={`relative px-3 py-3 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                                        txCode === type.code
                                            ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-900/50 ring-1 ring-rose-400"
                                            : "bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                    }`}
                                >
                                    {txCode === type.code && <Check size={14} className="absolute left-2 text-white/70" />}
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-end mb-2">
                            <label className="block text-sm text-slate-400 font-bold">출고 수량</label>
                            {/* 🚀 사용자 안내용 제약조건 표시 */}
                            <span className="text-[10px] text-blue-400 font-mono bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-900/50">
                                {currentMaxDec === 0 ? "정수 입력만 가능" : `소수점 ${currentMaxDec}자리까지 허용`}
                            </span>
                        </div>
                        <div className="relative">
                            <input 
                                type="text" inputMode="decimal"
                                value={outQty} onChange={handleOutQtyChange}
                                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-right text-3xl font-bold text-white focus:border-rose-500 outline-none transition placeholder-slate-700"
                                placeholder={placeholderValue} autoFocus
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm bg-slate-900 px-2 py-1 rounded border border-slate-700">
                                {selectedStock.item_master?.uom || 'EA'}
                            </span>
                        </div>
                    </div>

                    <div>
                         <label className="block text-sm text-slate-400 mb-2">비고 (선택사항)</label>
                         <input 
                            type="text" value={remark} onChange={(e) => setRemark(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-slate-500 placeholder:text-slate-600 transition"
                            placeholder="특이사항이 있을 경우에만 입력하세요."
                          />
                    </div>

                    <div className="flex gap-3 mt-4">
                        <button onClick={() => setSelectedStock(null)} className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded-xl transition">취소</button>
                        <button onClick={handleOutbound} disabled={loading} className="flex-[2] py-4 bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold rounded-xl shadow-lg shadow-rose-900/20 disabled:opacity-50 disabled:shadow-none transition transform active:scale-[0.98] flex items-center justify-center gap-2">
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