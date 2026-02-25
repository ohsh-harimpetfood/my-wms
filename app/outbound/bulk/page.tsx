"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Search, Plus, Trash2, Package, Check, Loader2, RefreshCw, MapPin, AlertCircle, X, Sparkles } from "lucide-react";
import { TxCode, getTxTypesByGroup } from '@/constants/transaction'; 
import { useAuth } from "@/context/AuthProvider";
import { useUI } from "@/context/UIProvider";
import LocationMapSelector from "@/components/LocationMapSelector";

interface Item {
  item_key: string;
  item_name: string;
  uom?: string;
  item_type?: string;
}

// 🚀 [수정] required_qty를 string으로 변경하여 소수점 입력 안정성 확보
interface CartItem {
  item: Item;
  required_qty: string;
}

interface Allocation {
  id: string; 
  inventory_id: number;
  item_key: string;
  item_name: string;
  location_code: string;
  lot_no: string;
  current_qty: number;
  allocated_qty: number;
}

export default function BulkOutboundPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const { toast, confirm, alert: uiAlert } = useUI();
  
  const [txCode, setTxCode] = useState<TxCode>("OUT_PROD");
  const [remark, setRemark] = useState("");
  
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [allocations, setAllocations] = useState<Allocation[]>([]);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [allocatingItem, setAllocatingItem] = useState<string | null>(null);
  
  const [showLocModal, setShowLocModal] = useState(false);
  const [activeItemForLoc, setActiveItemForLoc] = useState<string | null>(null);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase.from("item_master").select("*").eq("active_flag", "Y");
      if (data) setAllItems(data as Item[]);
    };
    fetchItems();
  }, [supabase]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean); 
    return allItems.filter(item => {
        const targetText = `${item.item_name} ${item.item_key}`.toLowerCase();
        return terms.every(term => targetText.includes(term));
    }).slice(0, 10); 
  }, [searchTerm, allItems]);

  // --- 0. 🚀 [추가] 소수점 제어 로직 ---
  const getMaxDecimal = (item: Item) => {
    if (item.uom === 'KM') return 3;
    if (item.item_type === '원자재' || item.item_type === '원료') return 2;
    return 0;
  };

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

  // --- 1. 장바구니 핸들러 ---
  const addToCart = (item: Item) => {
    if (cart.find(c => c.item.item_key === item.item_key)) {
        toast.warning("이미 추가된 품목입니다.");
        setSearchTerm("");
        setShowDropdown(false);
        return;
    }
    // 🚀 초기값을 빈 문자열로 설정
    setCart([...cart, { item, required_qty: "" }]);
    setSearchTerm("");
    setShowDropdown(false);
  };

  // 🚀 [수정] 수량 업데이트 시 정규식 필터 통과
  const updateCartQty = (index: number, val: string) => {
    const item = cart[index].item;
    const maxDec = getMaxDecimal(item);
    const sanitized = sanitizeDecimalInput(val, maxDec);
    
    const newCart = [...cart];
    newCart[index].required_qty = sanitized;
    setCart(newCart);
  };

  const removeFromCart = (index: number) => {
    const removedItemKey = cart[index].item.item_key;
    setCart(cart.filter((_, i) => i !== index));
    setAllocations(allocations.filter(a => a.item_key !== removedItemKey));
  };

  // --- 2. 개별 품목 FIFO 자동 제안 ---
  const handleAutoAllocateItem = async (c: CartItem) => {
    const reqQtyNum = Number(c.required_qty);
    if (!reqQtyNum || reqQtyNum <= 0) return uiAlert("지시 수량을 먼저 올바르게 입력해주세요.", "warning");

    const hasExisting = allocations.some(a => a.item_key === c.item.item_key);
    if (hasExisting) {
        const ok = await confirm(`[${c.item.item_name}]\n이미 할당된 내역이 있습니다.\n기존 내역을 초기화하고 FIFO 기준으로 다시 덮어씌우시겠습니까?`, "warning");
        if (!ok) return;
    }

    setAllocatingItem(c.item.item_key);
    try {
        let needed = reqQtyNum;
        let newAllocations: Allocation[] = [];
        
        const { data: inv } = await supabase
            .from('inventory')
            .select('*')
            .eq('item_key', c.item.item_key)
            .gt('quantity', 0)
            .order('inbound_date', { ascending: true }); 

        if (!inv || inv.length === 0) {
            uiAlert(`[${c.item.item_name}] 재고가 전혀 없습니다.`, "error");
            setAllocatingItem(null);
            return;
        }

        for (const row of inv) {
            if (needed <= 0) break;
            const take = row.quantity; 
            
            newAllocations.push({
                id: crypto.randomUUID(),
                inventory_id: row.id,
                item_key: row.item_key,
                item_name: c.item.item_name,
                location_code: row.location_code,
                lot_no: row.lot_no,
                current_qty: row.quantity,
                allocated_qty: take 
            });
            // 🚀 부동소수점 오차 방지
            needed = Number((needed - take).toFixed(4));
        }

        const otherAllocations = allocations.filter(a => a.item_key !== c.item.item_key);
        setAllocations([...otherAllocations, ...newAllocations]);

        if (needed > 0) uiAlert(`재고가 ${needed.toLocaleString()} 모자랍니다.`, "warning");
        else toast.success("최적의 위치(FIFO)로 제안되었습니다.");

    } catch (e: any) {
        uiAlert("제안 중 오류: " + e.message, "error");
    } finally {
        setAllocatingItem(null);
    }
  };

  const removeAllocation = (id: string) => {
      setAllocations(allocations.filter(a => a.id !== id));
  };

  // --- 3. 수동 맵 선택 ---
  const handleManualLocationsMulti = async (locIds: string[]) => {
      if (!activeItemForLoc || locIds.length === 0) return;
      
      const targetItem = cart.find(c => c.item.item_key === activeItemForLoc)?.item;
      if (!targetItem) return;

      const { data: invData } = await supabase
          .from('inventory')
          .select('*')
          .in('location_code', locIds)
          .eq('item_key', activeItemForLoc)
          .gt('quantity', 0);

      if (!invData || invData.length === 0) {
          uiAlert("선택하신 위치들에 해당 품목의 재고가 없습니다.", "warning");
          return;
      }

      const manualAllocations = invData.map(row => ({
          id: crypto.randomUUID(),
          inventory_id: row.id,
          item_key: row.item_key,
          item_name: targetItem.item_name,
          location_code: row.location_code,
          lot_no: row.lot_no,
          current_qty: row.quantity,
          allocated_qty: row.quantity 
      }));

      const existingIds = allocations.map(a => a.inventory_id);
      const newAdditions = manualAllocations.filter(ma => !existingIds.includes(ma.inventory_id));

      if (newAdditions.length === 0) {
          toast.info("이미 할당 리스트에 추가된 위치입니다.");
      } else {
          setAllocations([...allocations, ...newAdditions]);
          toast.success(`${newAdditions.length}개의 파렛트가 추가되었습니다.`);
      }
  };

  // --- 4. 최종 확정 ---
  const executeBulkOutbound = async () => {
      if (!user) return toast.error("로그인 정보가 없습니다.");
      
      const validAllocations = allocations.filter(a => a.allocated_qty > 0);
      if (validAllocations.length === 0) return uiAlert("출고할 할당 데이터가 없습니다.", "warning");

      let isMismatch = false;
      for (const c of cart) {
          const totalAllocated = validAllocations.filter(a => a.item_key === c.item.item_key).reduce((sum, a) => sum + a.allocated_qty, 0);
          // 🚀 Number()로 변환해서 비교
          if (totalAllocated < Number(c.required_qty)) isMismatch = true;
      }

      const confirmMsg = isMismatch 
        ? `[주의] 할당된 총량이 지시 수량보다 부족한 품목이 있습니다.\n\n이대로 ${validAllocations.length}개 톤백(셀)을 일괄 출고하시겠습니까?`
        : `총 ${validAllocations.length}개 톤백(셀)을 전량 일괄 출고하시겠습니까?`;

      if (!(await confirm(confirmMsg, "info"))) return;

      setLoading(true);
      try {
          const nowISO = new Date().toISOString();

          await Promise.all(validAllocations.map(async (alloc) => {
              await supabase.from("inventory").delete().eq("id", alloc.inventory_id);
              await supabase.from("stock_tx").insert({
                  transaction_type: 'OUTBOUND',
                  io_type: 'OUT',
                  tx_code: txCode, 
                  location_code: alloc.location_code,
                  item_key: alloc.item_key,
                  lot_no: alloc.lot_no,
                  quantity: -alloc.allocated_qty, 
                  remark: remark || `대량벌크출고 (전량)`,
                  created_by: user.id 
              });
          }));

          await toast.success("대량 출고가 완벽하게 처리되었습니다.");
          router.push("/outbound"); 
          router.refresh();

      } catch (err: any) {
          console.error(err);
          uiAlert("출고 처리 중 오류가 발생했습니다: " + err.message, "error");
      } finally {
          setLoading(false);
      }
  };

  return (
    // 🚀 [톤업] bg-black -> bg-slate-950
    <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-slate-100 font-[family-name:var(--font-geist-sans)] pb-32">
      <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-4 sticky top-0 bg-slate-950/90 backdrop-blur-sm z-30 pt-2">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"><ArrowLeft /></button>
        <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Package className="text-blue-500" /> 대량 벌크 출고 (Bulk Issue)
        </h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 animate-fade-in">
        
        {/* 좌측: 지시서 영역 */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-sm">
                <h2 className="text-sm font-bold text-slate-400 mb-3">1. 출고 유형 설정</h2>
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {getTxTypesByGroup('OUT').map((type) => (
                        <button
                            key={type.code} onClick={() => setTxCode(type.code as TxCode)}
                            className={`p-2.5 rounded-lg text-xs md:text-sm font-bold border transition-all ${
                                txCode === type.code ? "bg-blue-600 border-blue-500 text-white shadow-md shadow-blue-900/30" : "bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
                            }`}
                        >
                            {type.label}
                        </button>
                    ))}
                </div>
                <input 
                    type="text" value={remark} onChange={(e) => setRemark(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500 placeholder-slate-600 transition"
                    placeholder="비고 (선택사항)"
                />
            </div>

            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex-1 flex flex-col min-h-[400px] shadow-sm">
                <h2 className="text-sm font-bold text-slate-400 mb-3">2. 출고 지시 (Plan)</h2>
                
                <div className="relative mb-4">
                    <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-2 focus-within:border-blue-500 transition">
                        <Search className="text-slate-500 mx-2" size={18} />
                        <input 
                            type="text" placeholder="품목명 검색..."
                            className="w-full bg-transparent text-white outline-none placeholder-slate-600 text-sm py-1"
                            value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setShowDropdown(true); }}
                            onFocus={() => setShowDropdown(true)}
                        />
                    </div>
                    {showDropdown && searchTerm && (
                        <>
                            <div className="absolute top-full left-0 w-full bg-slate-800 border border-slate-700 rounded-b-lg mt-1 z-30 shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                                {filteredItems.map(item => (
                                    <div key={item.item_key} onClick={() => addToCart(item)} className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 flex justify-between items-center group transition">
                                        <div>
                                            <div className="font-bold text-white text-sm group-hover:text-blue-400 transition">{item.item_name}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5">{item.item_key}</div>
                                        </div>
                                        <Plus size={16} className="text-blue-400 group-hover:text-white transition"/>
                                    </div>
                                ))}
                            </div>
                            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                        </>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                    {cart.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 text-sm text-center opacity-80">
                            품목을 검색하여 추가하세요.<br/>(부분 출고 불가, 파렛트 전량 출고)
                        </div>
                    ) : (
                        cart.map((c, idx) => {
                            // 🚀 [추가] 제한 안내용 텍스트
                            const maxDec = getMaxDecimal(c.item);
                            
                            return (
                                <div key={idx} className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col gap-3 shadow-inner">
                                    <div className="flex justify-between items-start">
                                        <div className="font-bold text-base text-white truncate pr-2">{c.item.item_name}</div>
                                        <button onClick={() => removeFromCart(idx)} className="text-slate-500 hover:text-red-500 transition"><Trash2 size={16}/></button>
                                    </div>
                                    
                                    <div className="flex items-center justify-between mb-1">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-slate-400 whitespace-nowrap">지시 총량:</span>
                                            <span className="text-[9px] text-blue-400 font-mono mt-0.5">{maxDec === 0 ? "정수 입력" : `소수점 ${maxDec}자리`}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input 
                                                type="text" inputMode="decimal"
                                                className="w-24 md:w-32 bg-slate-900 border border-slate-700 rounded p-1.5 md:p-2 text-white text-right font-bold text-base md:text-lg outline-none focus:border-blue-500 transition-all placeholder-slate-700"
                                                value={c.required_qty}
                                                onChange={(e) => updateCartQty(idx, e.target.value)}
                                                placeholder={maxDec === 3 ? "0.000" : maxDec === 2 ? "0.00" : "0"}
                                            />
                                            <span className="text-xs text-slate-500 w-6 font-bold">{c.item.uom}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                                        <button 
                                            onClick={() => handleAutoAllocateItem(c)}
                                            disabled={allocatingItem === c.item.item_key}
                                            className="py-2 bg-blue-950/40 text-blue-400 border border-blue-900/50 hover:bg-blue-600 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                                        >
                                            {allocatingItem === c.item.item_key ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>}
                                            FIFO 제안
                                        </button>
                                        <button 
                                            onClick={() => { setActiveItemForLoc(c.item.item_key); setShowLocModal(true); }}
                                            className="py-2 bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1"
                                        >
                                            <MapPin size={14}/>
                                            직접 선택
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>

        {/* 우측: 할당 결과 */}
        <div className="w-full lg:w-2/3">
            <div className="bg-slate-900 border border-slate-800 p-5 md:p-8 rounded-xl shadow-xl min-h-[600px] flex flex-col h-full">
                
                <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                    <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                        <MapPin className="text-emerald-500"/> 출고 대상 셀 (Action List)
                    </h2>
                    <span className="bg-slate-800 border border-slate-700 text-slate-300 text-xs px-3 py-1 rounded-full font-bold">총 {allocations.length} 파렛트</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar pr-2 pb-6">
                    {allocations.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 gap-3 opacity-60">
                            <AlertCircle size={40} className="opacity-50"/>
                            <p className="text-sm">좌측에서 [FIFO 제안] 또는 [직접 선택]을 진행하세요.</p>
                        </div>
                    ) : (
                        cart.map(c => {
                            const myAllocations = allocations.filter(a => a.item_key === c.item.item_key);
                            if (myAllocations.length === 0) return null;

                            const totalAllocated = myAllocations.reduce((sum, a) => sum + a.allocated_qty, 0);
                            const reqQtyNum = Number(c.required_qty) || 0;
                            // 🚀 소수점 오차 무시하고 목표량 이상인지 확인 (여유있게 크면 만족)
                            const isSatisfied = totalAllocated >= reqQtyNum - 0.0001; 

                            return (
                                <div key={c.item.item_key} className="bg-slate-950/50 border border-slate-800 rounded-xl overflow-hidden mb-6 shadow-sm">
                                    <div className="bg-slate-800/50 px-4 py-3 flex justify-between items-center border-b border-slate-700">
                                        <div className="font-bold text-white text-sm md:text-base">{c.item.item_name}</div>
                                        <div className="text-xs text-slate-400 flex items-center gap-2">
                                            <span>지시: <span className="font-bold text-slate-200">{reqQtyNum.toLocaleString()}</span></span>
                                            <span className="text-slate-600">|</span>
                                            <span>할당: <span className={`font-bold ${isSatisfied ? 'text-emerald-400' : 'text-rose-400'}`}>{totalAllocated.toLocaleString()}</span></span>
                                        </div>
                                    </div>

                                    <div className="p-3 space-y-2">
                                        {myAllocations.map(alloc => (
                                            <div key={alloc.id} className="bg-slate-900 border border-slate-700 rounded-lg p-3 flex flex-wrap md:flex-nowrap items-center gap-3 md:gap-4 hover:border-slate-500 transition group">
                                                <div className="w-full md:w-40 shrink-0">
                                                    <div className="text-[10px] text-slate-500">Location</div>
                                                    <div className="font-mono text-blue-400 font-bold text-lg md:text-xl leading-none">{alloc.location_code}</div>
                                                    <div className="text-[10px] text-slate-500 mt-1 truncate">LOT: {alloc.lot_no}</div>
                                                </div>
                                                <div className="flex-1 flex justify-end items-center w-full md:w-auto">
                                                    <div className="flex items-center gap-3 bg-rose-950/30 p-2 rounded-lg border border-rose-900/30">
                                                        <div className="text-xs text-rose-400 font-bold">출고 수량</div>
                                                        <div className="text-white font-bold text-xl md:text-2xl tracking-tight">
                                                            {alloc.current_qty.toLocaleString()} 
                                                            <span className="text-[10px] text-slate-500 ml-1">전량</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeAllocation(alloc.id)} className="p-2 text-slate-600 hover:text-rose-500 bg-slate-950 border border-slate-800 rounded-lg transition shrink-0 ml-2">
                                                    <X size={18}/>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="pt-4 border-t border-slate-800 mt-auto">
                    <button 
                        onClick={executeBulkOutbound}
                        disabled={loading || allocations.length === 0}
                        className="w-full py-4 md:py-5 bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:shadow-none transition transform active:scale-[0.98] text-lg flex justify-center items-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin"/> : <><Check size={24}/> 최종 일괄 출고 확정 (SAVE)</>}
                    </button>
                </div>
            </div>
        </div>
      </div>

      {showLocModal && (
        <LocationMapSelector 
            isMultiMode={true} 
            onClose={() => { setShowLocModal(false); setActiveItemForLoc(null); }}
            onSelectMulti={(locIds) => {
                handleManualLocationsMulti(locIds);
                setShowLocModal(false);
                setActiveItemForLoc(null);
            }}
        />
      )}
    </div>
  );
}