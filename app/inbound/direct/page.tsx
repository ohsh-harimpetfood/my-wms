"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
// 🚀 [수정] Calculator 아이콘 추가
import { ArrowLeft, Search, Package, Check, Calendar, Hash, Layers, Calculator } from "lucide-react";
import LocationMapSelector from "@/components/LocationMapSelector"; 
// 🚀 [추가] 스마트 계산기 컴포넌트 임포트
import SubMaterialHelperSheet, { PackingDetail } from "@/components/SubMaterialHelperSheet";
import { TX_TYPES, TxCode, getTxTypesByGroup } from '@/constants/transaction';
import { useAuth } from "@/context/AuthProvider";
import { useUI } from "@/context/UIProvider";

export interface Item {
  item_key: string;
  item_name: string;
  remark?: string;
  active_flag: string;
  lot_required: 'Y' | 'N';
  item_type?: string; 
  uom?: string; 
}

export default function DirectInboundPage() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast, confirm, alert: uiAlert } = useUI();

  const SUB_MATERIAL_TYPE = '부자재'; 

  const autoLoc = searchParams.get("loc") || "";
  const autoItem = searchParams.get("item") || "";

  // 1. 데이터 상태
  const [items, setItems] = useState<Item[]>([]);
  const [searchedLocations, setSearchedLocations] = useState<any[]>([]); 

  // 2. 입력 폼 상태
  const [inboundType, setInboundType] = useState<TxCode>("IN_PURCHASE");
  
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [unitQty, setUnitQty] = useState("");
  const [selectedLocs, setSelectedLocs] = useState<string[]>([]);
  const [locationCode, setLocationCode] = useState(autoLoc);

  const [qty, setQty] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [expDate, setExpDate] = useState("");
  
  // 3. 품목 검색 및 선택 상태
  const [itemSearchTerm, setItemSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  // 4. UI 제어 상태
  const [showLocDropdown, setShowLocDropdown] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // 🚀 [추가] 스마트 계산기 상태 관리
  const [showHelperSheet, setShowHelperSheet] = useState(false);
  const [packingDetails, setPackingDetails] = useState<PackingDetail[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: itemData } = await supabase.from("item_master").select("*").eq("active_flag", "Y");
      if (itemData) {
        setItems(itemData as Item[]);
        if (autoItem) {
          const target = (itemData as Item[]).find(i => i.item_key === autoItem);
          if (target) handleSelectItem(target);
        }
      }
    };
    fetchData();
  }, [autoItem]);

  useEffect(() => {
    if (!locationCode) {
      setSearchedLocations([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase.from("loc_master").select("loc_id, zone").ilike("loc_id", `%${locationCode}%`).eq("active_flag", "Y").range(0, 9);
      if (data) setSearchedLocations(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [locationCode]);

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setItemSearchTerm("");
    
    setQty("");
    setUnitQty("");
    setSelectedLocs([]);
    setIsMultiMode(false);
    // 🚀 [추가] 품목이 바뀌면 계산기 데이터 초기화
    setPackingDetails([]);
    
    if (item.item_type === SUB_MATERIAL_TYPE || item.lot_required === 'N') {
      setLotNo('N/A');
      setExpDate(''); 
    } else {
      setLotNo('');
      setExpDate('');
    }
  };

  const getMaxDecimal = () => {
    if (!selectedItem) return 0;
    if (selectedItem.uom === 'KM') return 3;
    if (selectedItem.item_type === '원자재' || selectedItem.item_type === '원료') return 2;
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

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQty(sanitizeDecimalInput(e.target.value, getMaxDecimal()));
    // 🚀 [추가] 사용자가 직접 수량을 수정하면 기존 계산기 데이터 무효화
    setPackingDetails([]);
  };

  const handleUnitQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUnitQty(sanitizeDecimalInput(e.target.value, getMaxDecimal()));
  };

  const handleExpDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, ""); 
    if (val.length > 8) val = val.slice(0, 8); 

    let formatted = val;
    if (val.length > 6) {
        formatted = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6)}`;
    } else if (val.length > 4) {
        formatted = `${val.slice(0, 4)}-${val.slice(4)}`;
    }
    
    setExpDate(formatted);
  };

  const totalInputQty = Number(qty) || 0;
  const unitQtyNum = Number(unitQty) || 0;
  const requiredCells = (isMultiMode && unitQtyNum > 0 && totalInputQty > 0) 
    ? Math.ceil(totalInputQty / unitQtyNum) 
    : 0;

  const handleSelectLocation = (locId: string) => {
    setLocationCode(locId);
    setShowLocDropdown(false);
    setShowLocModal(false);
  };

  const handleSave = async () => {
    if (!user) return toast.error("로그인 정보가 없습니다.");
    if (!selectedItem) return toast.error("품목을 선택해주세요.");
    
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) return toast.error("유효한 수량을 입력해주세요.");

    if (isMultiMode) {
        if (!unitQtyNum || unitQtyNum <= 0) return toast.error("기준 단위 수량을 입력해주세요.");
        if (selectedLocs.length === 0) return toast.error("적치할 위치를 선택해주세요.");
        if (selectedLocs.length !== requiredCells) return uiAlert(`위치 ${requiredCells}개를 정확히 선택해주세요.\n현재 ${selectedLocs.length}개 선택됨.`, "warning");
    } else {
        if (!locationCode) return toast.error("적치할 위치를 입력해주세요.");
    }

    const isSubMaterial = selectedItem.item_type === SUB_MATERIAL_TYPE || selectedItem.lot_required === 'N';
    
    if (!isSubMaterial) {
        if (!lotNo) return toast.warning("LOT 번호를 입력해주세요.");
        if (!expDate) return toast.warning("유통기한을 입력해주세요.");
    }
    
    const msg = isMultiMode 
      ? `[다중 분할 입고 확정]\n품목: ${selectedItem.item_name}\n총 수량: ${qtyNum}\n분배 위치: ${selectedLocs.length}개 셀\n\n진행하시겠습니까?`
      : `[입고 확정]\n품목: ${selectedItem.item_name}\n수량: ${qtyNum}\n위치: ${locationCode}\n\n진행하시겠습니까?`;
      
    const confirmed = await confirm(msg, "info");
    if (!confirmed) return;

    setLoading(true);
    try {
      const distribution = isMultiMode 
        ? selectedLocs.map((loc, idx) => {
            const isLast = idx === selectedLocs.length - 1;
            const remain = Number((qtyNum - (unitQtyNum * idx)).toFixed(4));
            const allocQty = isLast ? remain : unitQtyNum;
            return { locId: loc, qty: allocQty };
          })
        : [{ locId: locationCode, qty: qtyNum }];

      const nowISO = new Date().toISOString();

      await Promise.all(distribution.map(async (dist) => {
          const { data: locInfo, error: locError } = await supabase.from("loc_master").select("loc_id").eq("loc_id", dist.locId).single();
          if (locError || !locInfo) throw new Error(`유효하지 않은 위치 코드입니다: ${dist.locId}`);

          const { data: existInven } = await supabase.from("inventory").select("id, quantity")
            .eq("location_code", dist.locId)
            .eq("item_key", selectedItem.item_key)
            .eq("lot_no", lotNo || 'DEFAULT')
            .maybeSingle();

          let currentInvenId = existInven?.id;

          if (existInven) {
            await supabase.from("inventory").update({ 
                quantity: existInven.quantity + dist.qty, 
                updated_at: nowISO,
                updated_by: user.id 
            }).eq("id", existInven.id);
          } else {
            // 🚀 [수정] id 반환받도록 select("id") 추가
            const { data: newInven } = await supabase.from("inventory").insert({
                location_code: dist.locId, 
                item_key: selectedItem.item_key, 
                quantity: dist.qty, 
                lot_no: lotNo || 'DEFAULT', 
                status: 'AVAILABLE', 
                exp_date: expDate || null, 
                inbound_date: nowISO, 
                updated_at: nowISO,
                updated_by: user.id 
            }).select("id").single();
            if (newInven) currentInvenId = newInven.id;
          }

          // 📦 [추가] 부자재 박스 상세 정보 저장 로직 (단일 모드일 때만 적용)
          if (currentInvenId && packingDetails.length > 0 && !isMultiMode) {
            const packingInserts = packingDetails.map(p => ({
               inventory_id: currentInvenId,
               pack_type: p.pack_type,
               unit_qty: p.unit_qty,
               pack_count: p.pack_count,
               total_qty: p.total_qty,
               updated_by: user.id
            }));
            await supabase.from("inventory_packing_info").insert(packingInserts);
         }

          await supabase.from("stock_tx").insert({
            transaction_type: 'INBOUND',
            io_type: 'IN',
            tx_code: inboundType,
            location_code: dist.locId, 
            item_key: selectedItem.item_key, 
            quantity: dist.qty, 
            lot_no: lotNo || 'DEFAULT', 
            remark: isMultiMode ? `분할 즉시 입고 (${TX_TYPES[inboundType].label})` : `즉시 입고 (${TX_TYPES[inboundType].label})`,
            created_by: user.id
          });
      }));

      toast.success("입고 처리가 완료되었습니다.");
      router.push("/location");
      router.refresh();

    } catch (e: any) {
      toast.error(e.message || "입고 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(i => {
    const terms = itemSearchTerm.toLowerCase().trim().split(/\s+/); 
    const targetText = `${i.item_name || ''} ${i.item_key || ''} ${i.remark || ''}`.toLowerCase();
    return terms.every(term => targetText.includes(term));
  }).slice(0, 10);

  const isSubMaterial = selectedItem?.item_type === SUB_MATERIAL_TYPE || selectedItem?.lot_required === 'N';
  const currentMaxDec = getMaxDecimal();
  const placeholderValue = currentMaxDec === 3 ? "0.000" : currentMaxDec === 2 ? "0.00" : "0";

  return (
    <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-slate-100 font-[family-name:var(--font-geist-sans)] pb-40">
      
      <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-4 sticky top-0 bg-slate-950/90 backdrop-blur-sm z-30 pt-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"><ArrowLeft /></button>
        <h1 className="text-2xl font-bold text-yellow-500">⚡ 즉시 입고</h1>
      </div>

      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
            <label className="block text-sm text-slate-400 mb-3 font-bold">입고 유형</label>
            <div className="grid grid-cols-2 gap-2">
                {getTxTypesByGroup('IN').map((type) => (
                    <button
                        key={type.code}
                        onClick={() => setInboundType(type.code as TxCode)}
                        className={`relative p-3 text-sm rounded border flex items-center justify-center gap-2 transition-all h-12 ${
                            inboundType === type.code
                                ? 'bg-yellow-600 border-yellow-500 text-white shadow-lg font-bold'
                                : 'bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800'
                        }`}
                    >
                        {inboundType === type.code && <Check size={14} className="absolute left-3" />}
                        {type.label}
                    </button>
                ))}
            </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <label className="block text-sm text-slate-400 mb-2 font-bold">품목 선택</label>
          {selectedItem ? (
            <div className="flex justify-between items-center gap-4 bg-blue-900/20 border border-blue-500 p-4 rounded-lg">
                <div className="flex-1 min-w-0"> 
                    <div className="font-bold text-lg md:text-xl text-white break-keep leading-snug">
                        {selectedItem.item_name}
                    </div>
                    <div className="text-sm text-slate-400 mt-2 flex flex-wrap gap-2 items-center">
                      <span className="bg-blue-900/50 text-blue-200 px-1.5 py-0.5 rounded text-xs whitespace-nowrap">
                        {selectedItem.item_key}
                      </span>
                      {selectedItem.item_type && (
                        <span className="bg-slate-800 px-1.5 py-0.5 rounded text-xs whitespace-nowrap">
                            {selectedItem.item_type}
                        </span>
                      )}
                    </div>
                </div>
                <button 
                    onClick={() => setSelectedItem(null)} 
                    className="shrink-0 text-sm text-red-400 font-bold border border-red-900 px-3 py-2 rounded hover:bg-red-900/30 transition"
                >
                    변경
                </button>
            </div>
          ) : (
            <div className="relative">
                <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-1 focus-within:border-blue-500 transition h-14">
                    <div className="pl-4 pr-2 text-slate-500"><Search size={20} /></div>
                    <input 
                        type="text" 
                        placeholder="품목명 검색..."
                        className="w-full h-full bg-transparent text-white outline-none text-lg placeholder-slate-600"
                        value={itemSearchTerm}
                        onChange={(e) => setItemSearchTerm(e.target.value)}
                    />
                </div>
                {itemSearchTerm && (
                    <div className="absolute top-full left-0 w-full bg-slate-800 border border-slate-700 rounded-b mt-1 z-20 shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                      {filteredItems.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-sm">검색 결과가 없습니다.</div>
                      ) : (
                        filteredItems.map(item => (
                            <div key={item.item_key} onClick={() => handleSelectItem(item)} className="p-4 hover:bg-slate-700 cursor-pointer border-b border-slate-700 last:border-0 transition text-sm flex items-center justify-between group min-h-[4rem]"> 
                                <div className="flex-1 pr-2"> 
                                  <div className="font-bold text-white group-hover:text-blue-400 transition break-keep">
                                    {item.item_name}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-1 flex gap-2">
                                    <span>{item.item_key}</span>
                                    {item.item_type && <span className="text-slate-400">| {item.item_type}</span>}
                                  </div>
                                </div>
                                <Package size={16} className="text-slate-600 group-hover:text-white shrink-0"/>
                            </div>
                        ))
                      )}
                    </div>
                )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4">
            <div className="flex-1 bg-slate-900 border border-slate-800 p-6 rounded-xl relative z-10">
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <label className="block text-sm text-slate-400 font-bold">수량 (Qty)</label>
                        <span className="text-[10px] text-blue-400 font-mono bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-900/50 mt-1 inline-block">
                            {currentMaxDec === 0 ? "정수 입력만 가능" : `소수점 ${currentMaxDec}자리까지 허용`}
                        </span>
                    </div>
                    {/* 🚀 [추가] 스마트 계산기 버튼 (품목이 선택되었을 때만 노출) */}
                    {selectedItem && (
                        <button 
                            onClick={() => setShowHelperSheet(true)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 text-blue-400 rounded-lg text-xs font-bold transition shadow-sm"
                        >
                            <Calculator size={14} /> 스마트 계산기
                        </button>
                    )}
                </div>
                <input 
                    type="text" inputMode="decimal"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-4 text-white outline-none focus:border-blue-500 font-bold text-right text-2xl h-14 placeholder-slate-700 transition"
                    placeholder={placeholderValue}
                    value={qty}
                    onChange={handleQtyChange}
                />
                {/* 🚀 [추가] 계산기 적용 성공 메시지 */}
                {packingDetails.length > 0 && (
                    <p className="text-xs text-emerald-400 mt-2 text-right">✓ 박스/잔량 상세정보가 적용되었습니다.</p>
                )}
            </div>

            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-full mb-2">
                <button 
                    onClick={() => setIsMultiMode(false)} 
                    className={`flex-1 py-2 rounded text-xs md:text-sm font-bold transition-all ${!isMultiMode ? 'bg-slate-800 text-white shadow border border-slate-700' : 'text-slate-500 hover:text-white'}`}
                >
                    단일 위치 적재
                </button>
                <button 
                    onClick={() => setIsMultiMode(true)} 
                    className={`flex-1 flex items-center justify-center gap-1 py-2 rounded text-xs md:text-sm font-bold transition-all ${isMultiMode ? 'bg-blue-600 text-white shadow shadow-blue-900/30' : 'text-slate-500 hover:text-white'}`}
                >
                    <Layers size={14}/> 다중 분할 적재
                </button>
            </div>

            {isMultiMode ? (
                <div className="space-y-3 bg-blue-950/20 border border-blue-900/30 p-4 rounded-xl animate-fade-in shadow-inner">
                    <div>
                        <label className="block text-xs text-blue-300 mb-1 font-bold">단위 수량 (1개 위치당 적재량)</label>
                        <input 
                            type="text" inputMode="decimal"
                            className="w-full bg-slate-950 border border-blue-900/50 rounded-lg p-2.5 text-blue-100 focus:border-blue-500 outline-none text-xl font-bold text-right transition" 
                            value={unitQty} 
                            onChange={handleUnitQtyChange}
                            placeholder={`예: 50${currentMaxDec > 0 ? '.5' : ''}`} 
                        />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>필요한 위치 수:</span>
                        <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{requiredCells} 개</span>
                    </div>

                    <button 
                        onClick={() => {
                            if (requiredCells > 0) setShowLocModal(true);
                            else uiAlert("총 수량과 단위 수량을 먼저 입력해주세요.", "warning");
                        }}
                        className="w-full py-3 bg-slate-950 border border-slate-700 hover:border-blue-500 rounded-lg flex items-center justify-between px-4 transition text-sm group"
                    >
                        <span className="text-slate-400 group-hover:text-slate-300">위치 다중 선택하기</span>
                        <div className="flex items-center gap-2">
                            <span className={`font-bold ${selectedLocs.length === requiredCells && requiredCells > 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
                                {selectedLocs.length} / {requiredCells}
                            </span>
                            <Search size={16} className="text-slate-500 group-hover:text-blue-400"/>
                        </div>
                    </button>

                    {selectedLocs.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                            {selectedLocs.map((loc, idx) => {
                                const allocQty = (idx === selectedLocs.length - 1) ? Number((totalInputQty - (unitQtyNum * idx)).toFixed(4)) : unitQtyNum;
                                return (
                                    <div key={loc} className="bg-blue-900/40 border border-blue-500/50 text-blue-200 text-[10px] px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                                        <span className="font-mono font-bold">{loc}</span>
                                        <span className="opacity-70">({allocQty})</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                    <label className="block text-sm text-slate-400 mb-2 font-bold">적재 위치 (Location)</label>
                    <div 
                        className="flex items-center bg-slate-950 border border-slate-700 focus-within:border-blue-500 rounded-lg p-1 cursor-pointer hover:bg-slate-800 transition group h-14"
                        onClick={() => setShowLocModal(true)}
                    >
                        <div className="pl-4 pr-2 text-slate-500 group-hover:text-blue-400"><Search size={20} /></div>
                        <input 
                            type="text" 
                            placeholder="LOC CODE"
                            className="bg-transparent outline-none text-white font-mono text-xl w-full cursor-pointer placeholder-slate-600 uppercase h-full"
                            value={locationCode}
                            onChange={(e) => setLocationCode(e.target.value.toUpperCase())}
                        />
                    </div>
                </div>
            )}
        </div>

        {selectedItem && (
             <div className={`p-6 rounded-xl border transition-all ${isSubMaterial ? 'bg-slate-900/50 border-slate-800 opacity-70' : 'bg-slate-900 border-slate-800'}`}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-2 font-bold flex items-center gap-2">
                            <Hash size={14}/> LOT 번호 {!isSubMaterial && <span className="text-red-500">*</span>}
                        </label>
                        <input 
                            type="text" 
                            className={`w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-12 ${isSubMaterial ? 'text-slate-500 cursor-not-allowed bg-slate-900' : ''}`}
                            value={lotNo}
                            onChange={(e) => setLotNo(e.target.value)}
                            disabled={isSubMaterial}
                            placeholder={isSubMaterial ? "관리 대상 아님" : "LOT 입력"}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-2 font-bold flex items-center gap-2">
                            <Calendar size={14}/> 유통기한
                        </label>
                        <input 
                            type="text" 
                            inputMode="numeric"
                            maxLength={10}
                            className={`w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-12 ${isSubMaterial ? 'text-slate-500 cursor-not-allowed bg-slate-900' : ''}`}
                            value={expDate}
                            onChange={handleExpDateChange}
                            disabled={isSubMaterial}
                            placeholder={isSubMaterial ? "해당 없음" : "예: 20290112 (숫자만 입력)"}
                        />
                    </div>
                </div>
                {isSubMaterial && <p className="text-xs text-slate-500 mt-2 text-center">* 부자재(또는 LOT 관리대상 아님)는 LOT/유통기한 관리가 필요 없습니다.</p>}
             </div>
        )}

        <div className="mt-6 md:mt-0 md:fixed md:bottom-0 md:left-0 md:w-full md:p-4 md:bg-slate-950/80 md:backdrop-blur-md md:border-t md:border-slate-800 md:z-50">
            <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full max-w-2xl mx-auto block bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-blue-900/30 transition disabled:opacity-50 active:scale-[0.98] h-16"
            >
                {loading ? "처리 중..." : "입고 완료 (SAVE)"}
            </button>
        </div>

      </div>

      {showLocModal && (
        <LocationMapSelector 
            isMultiMode={isMultiMode}
            onClose={() => setShowLocModal(false)}
            onSelect={(locId) => {
                setLocationCode(locId);
                setShowLocModal(false);
            }}
            onSelectMulti={(locIds) => {
                setSelectedLocs(locIds);
                setShowLocModal(false);
            }}
        />
      )}

      {/* 🚀 [추가] 부자재 스마트 계산기 바텀 시트 연동 (즉시 입고는 계획수량이 없으므로 targetQty=0) */}
      <SubMaterialHelperSheet
        isOpen={showHelperSheet}
        onClose={() => setShowHelperSheet(false)}
        itemName={selectedItem?.item_name || ""}
        maxDecimal={currentMaxDec}
        targetQty={0} 
        onApply={(totalQty, details) => {
          setQty(String(totalQty)); 
          setPackingDetails(details);    
          toast.success("스마트 계산기: 수량 및 박스 정보가 적용되었습니다.");
        }}
      />

    </div>
  );
}