"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, Search, Package, Check, Calendar, Hash } from "lucide-react";
import LocationSelectorModal from "@/components/LocationSelectorModal";
import { TX_TYPES, TxCode, getTxTypesByGroup } from '@/constants/transaction';
import { useAuth } from "@/context/AuthProvider";
import { useUI } from "@/context/UIProvider";

// 🚀 [수정 1] Item 인터페이스 수정
export interface Item {
  item_key: string;
  item_name: string;
  remark?: string;
  active_flag: string;
  lot_required: 'Y' | 'N';
  item_type?: string; 
  unit?: string;
}

export default function DirectInboundPage() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast, confirm } = useUI();

  const SUB_MATERIAL_TYPE = '부자재'; 

  const autoLoc = searchParams.get("loc") || "";
  const autoItem = searchParams.get("item") || "";

  // 1. 데이터 상태
  const [items, setItems] = useState<Item[]>([]);
  const [searchedLocations, setSearchedLocations] = useState<any[]>([]); 

  // 2. 입력 폼 상태
  const [inboundType, setInboundType] = useState<TxCode>("IN_PURCHASE");
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

  // 초기 데이터 로드
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

  // 위치 검색 로직
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

  // 🎯 품목 선택 핸들러
  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setItemSearchTerm("");
    
    if (item.item_type === SUB_MATERIAL_TYPE || item.lot_required === 'N') {
      setLotNo('N/A');
      setExpDate(''); 
    } else {
      setLotNo('');
      setExpDate('');
    }
  };

  // 🛡️ 수량 입력 핸들러
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const sanitized = val.replace(/[^0-9]/g, '');
    setQty(sanitized);
  };

  const handleSelectLocation = (locId: string) => {
    setLocationCode(locId);
    setShowLocDropdown(false);
    setShowLocModal(false);
  };

  const handleSave = async () => {
    if (!user) return toast.error("로그인 정보가 없습니다.");
    if (!selectedItem) return toast.error("품목을 선택해주세요.");
    if (!locationCode) return toast.error("위치를 입력해주세요.");
    
    const qtyNum = Number(qty);
    if (!qtyNum || qtyNum <= 0) return toast.error("유효한 수량을 입력해주세요.");

    const isSubMaterial = selectedItem.item_type === SUB_MATERIAL_TYPE || selectedItem.lot_required === 'N';
    
    if (!isSubMaterial) {
        if (!lotNo) return toast.warning("LOT 번호를 입력해주세요.");
        if (!expDate) return toast.warning("유통기한을 입력해주세요.");
    }
    
    const confirmed = await confirm(
        `[입고 확인]\n\n품목: ${selectedItem.item_name}\n수량: ${qtyNum}\n위치: ${locationCode}\n\n진행하시겠습니까?`,
        "info"
    );
    if (!confirmed) return;

    setLoading(true);
    try {
      const { data: locInfo, error: locError } = await supabase.from("loc_master").select("loc_id").eq("loc_id", locationCode).single();
      if (locError || !locInfo) throw new Error(`유효하지 않은 위치 코드입니다.`);

      const { data: existInven, error: fetchError } = await supabase.from("inventory").select("id, quantity")
        .eq("location_code", locationCode)
        .eq("item_key", selectedItem.item_key)
        .eq("lot_no", lotNo || 'DEFAULT')
        .maybeSingle();

      if (fetchError) throw fetchError;
      const nowISO = new Date().toISOString();

      if (existInven) {
        await supabase.from("inventory").update({ 
            quantity: existInven.quantity + qtyNum, 
            updated_at: nowISO,
            updated_by: user.id 
        }).eq("id", existInven.id);
      } else {
        await supabase.from("inventory").insert({
            location_code: locationCode, 
            item_key: selectedItem.item_key, 
            quantity: qtyNum, 
            lot_no: lotNo || 'DEFAULT', 
            status: 'AVAILABLE', 
            exp_date: expDate || null, 
            inbound_date: nowISO, 
            updated_at: nowISO,
            updated_by: user.id 
        });
      }

      await supabase.from("stock_tx").insert({
        transaction_type: 'INBOUND',
        io_type: 'IN',
        tx_code: inboundType,
        location_code: locationCode, 
        item_key: selectedItem.item_key, 
        quantity: qtyNum, 
        lot_no: lotNo || 'DEFAULT', 
        remark: `즉시 입고 (${TX_TYPES[inboundType].label})`,
        created_by: user.id
      });

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

  return (
    // 🚀 [수정] 하단 패딩 증가 (pb-32 -> pb-40) : 네비게이션 바 공간 확보
    <div className="p-4 md:p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)] pb-40">
      
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4 sticky top-0 bg-black/90 backdrop-blur-sm z-30 pt-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"><ArrowLeft /></button>
        <h1 className="text-2xl font-bold text-yellow-500">⚡ 즉시 입고</h1>
      </div>

      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
        
        {/* 1. 입고 유형 선택 */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
            <label className="block text-sm text-gray-400 mb-3 font-bold">입고 유형</label>
            <div className="grid grid-cols-2 gap-2">
                {getTxTypesByGroup('IN').map((type) => (
                    <button
                        key={type.code}
                        onClick={() => setInboundType(type.code as TxCode)}
                        className={`relative p-3 text-sm rounded border flex items-center justify-center gap-2 transition-all h-12 ${
                            inboundType === type.code
                                ? 'bg-yellow-600 border-yellow-500 text-white shadow-lg font-bold'
                                : 'bg-black border-gray-700 text-gray-400 hover:bg-gray-800'
                        }`}
                    >
                        {inboundType === type.code && <Check size={14} className="absolute left-3" />}
                        {type.label}
                    </button>
                ))}
            </div>
        </div>

        {/* 2. 품목 선택 */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
          <label className="block text-sm text-gray-400 mb-2 font-bold">품목 선택</label>
          {selectedItem ? (
            // 🚀 [수정] flex 레이아웃 개선 (gap 추가, 텍스트 줄바꿈 처리)
            <div className="flex justify-between items-center gap-4 bg-blue-900/20 border border-blue-500 p-4 rounded-lg">
                <div className="flex-1 min-w-0"> {/* min-w-0: flex 내부 텍스트 줄바꿈 필수 속성 */}
                    <div className="font-bold text-lg md:text-xl text-white break-keep leading-snug">
                        {selectedItem.item_name}
                    </div>
                    <div className="text-sm text-gray-400 mt-2 flex flex-wrap gap-2 items-center">
                      <span className="bg-blue-900/50 text-blue-200 px-1.5 py-0.5 rounded text-xs whitespace-nowrap">
                        {selectedItem.item_key}
                      </span>
                      {selectedItem.item_type && (
                        <span className="bg-gray-800 px-1.5 py-0.5 rounded text-xs whitespace-nowrap">
                            {selectedItem.item_type}
                        </span>
                      )}
                    </div>
                </div>
                
                {/* 버튼이 찌그러지지 않도록 shrink-0 추가 */}
                <button 
                    onClick={() => setSelectedItem(null)} 
                    className="shrink-0 text-sm text-red-400 font-bold border border-red-900 px-3 py-2 rounded hover:bg-red-900/30 transition"
                >
                    변경
                </button>
            </div>
          ) : (
            <div className="relative">
                {/* ... 검색창 기존 코드 유지 ... */}
                <div className="flex items-center bg-black border border-gray-700 rounded-lg p-1 focus-within:border-blue-500 transition h-14">
                    <div className="pl-4 pr-2 text-gray-500"><Search size={20} /></div>
                    <input 
                        type="text" 
                        placeholder="품목명 검색..."
                        className="w-full h-full bg-transparent text-white outline-none text-lg placeholder-gray-600"
                        value={itemSearchTerm}
                        onChange={(e) => setItemSearchTerm(e.target.value)}
                    />
                </div>
                {itemSearchTerm && (
                    <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-700 rounded-b mt-1 z-20 shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                      {filteredItems.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">검색 결과가 없습니다.</div>
                      ) : (
                        filteredItems.map(item => (
                            <div key={item.item_key} onClick={() => handleSelectItem(item)} className="p-4 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 transition text-sm flex items-center justify-between group min-h-[4rem]"> {/* min-h 추가로 터치 영역 확보 */}
                                <div className="flex-1 pr-2"> {/* 텍스트 영역 확보 */}
                                  <div className="font-bold text-white group-hover:text-blue-400 transition break-keep">
                                    {item.item_name}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                    <span>{item.item_key}</span>
                                    {item.item_type && <span className="text-gray-400">| {item.item_type}</span>}
                                  </div>
                                </div>
                                <Package size={16} className="text-gray-600 group-hover:text-white shrink-0"/>
                            </div>
                        ))
                      )}
                    </div>
                )}
            </div>
          )}
        </div>

        {/* 3. 위치 및 수량 */}
        <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-gray-900 border border-gray-800 p-6 rounded-xl relative z-10">
                <label className="block text-sm text-gray-400 mb-2 font-bold">위치 (Location)</label>
                <div className="flex items-center bg-black border border-gray-700 rounded-lg p-1 focus-within:border-blue-500 transition h-14">
                    <div 
                        className="pl-4 pr-2 text-gray-500 cursor-pointer hover:text-blue-400"
                        onClick={() => setShowLocModal(true)}
                    >
                        <Search size={20} />
                    </div>
                    <input 
                        type="text" 
                        value={locationCode}
                        onChange={(e) => {
                            setLocationCode(e.target.value.toUpperCase());
                            setShowLocDropdown(true); 
                        }}
                        onFocus={() => setShowLocDropdown(true)}
                        placeholder="LOC CODE"
                        className="bg-transparent outline-none text-white font-mono text-xl w-full uppercase placeholder-gray-600 h-full"
                    />
                </div>

                {showLocDropdown && locationCode && (
                    <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-700 rounded-b mt-1 z-20 shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                        {searchedLocations.map(loc => (
                            <div key={loc.loc_id} onClick={() => handleSelectLocation(loc.loc_id)} className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 transition flex justify-between items-center h-12">
                                <span className="font-bold text-white font-mono">{loc.loc_id}</span>
                                <span className="text-[10px] text-gray-500 bg-gray-900 px-2 py-1 rounded uppercase">{loc.zone}</span>
                            </div>
                        ))}
                    </div>
                )}
                {showLocDropdown && <div className="fixed inset-0 z-0" onClick={() => setShowLocDropdown(false)}></div>}
            </div>

            <div className="flex-1 bg-gray-900 border border-gray-800 p-6 rounded-xl">
                <label className="block text-sm text-gray-400 mb-2 font-bold">수량 (Qty)</label>
                <input 
                    type="number" 
                    inputMode="numeric"
                    pattern="[0-9]*" 
                    className="w-full bg-black border border-gray-700 rounded-lg p-4 text-white outline-none focus:border-blue-500 font-bold text-right text-2xl h-14 placeholder-gray-700"
                    placeholder="0"
                    value={qty}
                    onChange={handleQtyChange}
                />
            </div>
        </div>

        {/* 4. 상세 정보 */}
        {selectedItem && (
             <div className={`p-6 rounded-xl border transition-all ${isSubMaterial ? 'bg-gray-900/50 border-gray-800 opacity-70' : 'bg-gray-900 border-gray-800'}`}>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2 font-bold flex items-center gap-2">
                            <Hash size={14}/> LOT 번호 {!isSubMaterial && <span className="text-red-500">*</span>}
                        </label>
                        <input 
                            type="text" 
                            className={`w-full bg-black border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-12 ${isSubMaterial ? 'text-gray-500 cursor-not-allowed bg-gray-900' : ''}`}
                            value={lotNo}
                            onChange={(e) => setLotNo(e.target.value)}
                            disabled={isSubMaterial}
                            placeholder={isSubMaterial ? "관리 대상 아님" : "LOT 입력"}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2 font-bold flex items-center gap-2">
                            <Calendar size={14}/> 유통기한
                        </label>
                        <input 
                            type="date" 
                            className={`w-full bg-black border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-12 ${isSubMaterial ? 'text-gray-500 cursor-not-allowed bg-gray-900' : ''}`}
                            value={expDate}
                            onChange={(e) => setExpDate(e.target.value)}
                            disabled={isSubMaterial}
                        />
                    </div>
                </div>
                {isSubMaterial && <p className="text-xs text-gray-500 mt-2 text-center">* 부자재(또는 LOT 관리대상 아님)는 LOT/유통기한 관리가 필요 없습니다.</p>}
             </div>
        )}

        {/* 🚀 [수정] 하단 버튼 영역 */}
        {/* 모바일: static + mt-6 (문서 흐름 끝에 위치하여 가려짐 방지) */}
        {/* PC: fixed + bottom-0 (기존처럼 하단 고정) */}
        <div className="mt-6 md:mt-0 md:fixed md:bottom-0 md:left-0 md:w-full md:p-4 md:bg-black/80 md:backdrop-blur-md md:border-t md:border-gray-800 md:z-50">
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
        <LocationSelectorModal 
            onClose={() => setShowLocModal(false)}
            onSelect={handleSelectLocation}
        />
      )}

    </div>
  );
}