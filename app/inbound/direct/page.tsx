"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
// ✨ CheckCircle 아이콘 추가
import { ArrowLeft, Search, Package, CheckCircle } from "lucide-react";
import { Item } from "@/types";
import LocationSelectorModal from "@/components/LocationSelectorModal";

export default function DirectInboundPage() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  const autoLoc = searchParams.get("loc") || "";
  const autoItem = searchParams.get("item") || "";

  // 1. 데이터 상태
  const [items, setItems] = useState<Item[]>([]);
  const [searchedLocations, setSearchedLocations] = useState<any[]>([]); 

  // 2. 입력 폼 상태
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
  
  // ✨ [추가] 성공 메시지 모달 상태
  const [showSuccessModal, setShowSuccessModal] = useState(false);

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

  // 위치 검색
  useEffect(() => {
    if (!locationCode) {
      setSearchedLocations([]);
      return;
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("loc_master")
        .select("loc_id, zone")
        .ilike("loc_id", `%${locationCode}%`) 
        .eq("active_flag", "Y")
        .range(0, 9);
      if (data) setSearchedLocations(data);
    }, 300);
    return () => clearTimeout(timer);
  }, [locationCode]);

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setItemSearchTerm("");
    const isLotRequired = item.lot_required === 'Y';
    setLotNo(isLotRequired ? '' : 'DEFAULT');
  };

  const handleSelectLocation = (locId: string) => {
    setLocationCode(locId);
    setShowLocDropdown(false);
    setShowLocModal(false);
  };

  const handleSave = async () => {
    if (!selectedItem || !locationCode || !qty) {
      return alert("품목, 위치, 수량은 필수입니다.");
    }
    setLoading(true);

    try {
      const qtyNum = Number(qty);
      if (qtyNum <= 0) throw new Error("수량은 0보다 커야 합니다.");

      // 위치 검증
      const { data: locInfo, error: locError } = await supabase
        .from("loc_master")
        .select("loc_id")
        .eq("loc_id", locationCode)
        .single();

      if (locError || !locInfo) throw new Error(`유효하지 않은 위치 코드입니다.`);

      // 재고 Upsert
      const { data: existInven, error: fetchError } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("location_code", locationCode)
        .eq("item_key", selectedItem.item_key)
        .eq("lot_no", lotNo || 'DEFAULT')
        .maybeSingle();

      if (fetchError) throw fetchError;
      const nowISO = new Date().toISOString();

      if (existInven) {
        await supabase.from("inventory").update({ quantity: existInven.quantity + qtyNum, updated_at: nowISO }).eq("id", existInven.id);
      } else {
        await supabase.from("inventory").insert({
            location_code: locationCode, item_key: selectedItem.item_key, quantity: qtyNum, lot_no: lotNo || 'DEFAULT', status: 'AVAILABLE', exp_date: expDate || null, inbound_date: nowISO, updated_at: nowISO
          });
      }

      // 수불 이력
      await supabase.from("stock_tx").insert({
        transaction_type: 'DIRECT_IN', location_code: locationCode, item_key: selectedItem.item_key, quantity: qtyNum, lot_no: lotNo || 'DEFAULT', io_type: 'IN', remark: '즉시 입고'
      });

      // ✨ [변경] alert 대신 모달 띄우기 (페이지 이동은 모달 확인 버튼에서 처리)
      setShowSuccessModal(true);

    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  // ✨ [추가] 모달 확인 버튼 핸들러
  const handleSuccessConfirm = () => {
    setShowSuccessModal(false);
    router.push("/inventory");
    router.refresh();
  };

  // 검색 로직
  const filteredItems = items.filter(i => {
    const terms = itemSearchTerm.toLowerCase().trim().split(/\s+/); 
    const targetText = `
      ${i.item_name || ''} 
      ${i.item_key || ''} 
      ${i.remark || ''} 
      ${i.barcode || ''}
    `.toLowerCase();
    return terms.every(term => targetText.includes(term));
  }).slice(0, 10);

  return (
    <div className="p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)]">
      
      <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition"><ArrowLeft /></button>
        <h1 className="text-2xl font-bold text-yellow-500">⚡ 즉시 입고</h1>
      </div>

      <div className="max-w-2xl mx-auto bg-gray-900 border border-gray-800 p-8 rounded-xl shadow-2xl relative">
        
        {/* ... (품목 선택 UI - 기존과 동일) ... */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">품목 선택</label>
          {selectedItem ? (
            <div className="flex justify-between items-center bg-blue-900/20 border border-blue-500 p-4 rounded-lg">
                <div>
                    <div className="font-bold text-xl text-white">{selectedItem.item_name}</div>
                    <div className="text-sm text-gray-400 mt-1 flex gap-2">
                      <span className="text-blue-200">{selectedItem.item_key}</span>
                      {selectedItem.remark && <span className="text-gray-500">| {selectedItem.remark}</span>}
                    </div>
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-sm text-red-400 font-bold border border-red-900 px-3 py-1 rounded hover:bg-red-900/30 transition">변경</button>
            </div>
          ) : (
            <div className="relative">
                <div className="flex items-center bg-black border border-gray-700 rounded p-4 focus-within:border-blue-500 transition">
                    <Search className="text-gray-500 mr-3" size={20} />
                    <input 
                        type="text" 
                        placeholder="품목명 검색 (예: 슬림 박스)"
                        className="w-full bg-transparent text-white outline-none text-lg placeholder-gray-600"
                        value={itemSearchTerm}
                        onChange={(e) => setItemSearchTerm(e.target.value)}
                    />
                </div>
                {itemSearchTerm && (
                    <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-700 rounded-b mt-1 z-20 shadow-xl max-h-80 overflow-y-auto custom-scrollbar">
                      {filteredItems.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">검색 결과가 없습니다.</div>
                      ) : (
                        filteredItems.map(item => (
                            <div key={item.item_key} onClick={() => handleSelectItem(item)} className="p-4 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 transition text-sm flex items-center justify-between group">
                                <div>
                                  <div className="font-bold text-white group-hover:text-blue-400 transition">{item.item_name}</div>
                                  <div className="text-xs text-gray-500 mt-0.5 flex gap-2">
                                    <span className="bg-gray-900 px-1 rounded">{item.item_key}</span>
                                    {item.remark && <span>{item.remark}</span>}
                                  </div>
                                </div>
                                <Package size={16} className="text-gray-600 group-hover:text-white"/>
                            </div>
                        ))
                      )}
                    </div>
                )}
            </div>
          )}
        </div>

        {/* ... (위치 & 수량 UI - 기존과 동일) ... */}
        <div className="flex gap-4 mb-6 relative">
            <div className="flex-1 relative">
                <label className="block text-sm text-gray-400 mb-2">위치</label>
                <div className="flex items-center bg-black border border-gray-700 rounded p-4 focus-within:border-blue-500 transition group">
                    <Search 
                        className="text-gray-500 mr-3 cursor-pointer hover:text-blue-400" 
                        size={20} 
                        onClick={() => setShowLocModal(true)}
                    />
                    <input 
                        type="text" 
                        value={locationCode}
                        onChange={(e) => {
                            setLocationCode(e.target.value.toUpperCase());
                            setShowLocDropdown(true); 
                        }}
                        onFocus={() => setShowLocDropdown(true)}
                        placeholder="위치 코드"
                        className="bg-transparent outline-none text-white font-mono text-lg w-full uppercase placeholder-gray-600"
                    />
                </div>

                {showLocDropdown && locationCode && (
                    <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-700 rounded-b mt-1 z-20 shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                        {searchedLocations.map(loc => (
                            <div key={loc.loc_id} onClick={() => handleSelectLocation(loc.loc_id)} className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 transition flex justify-between items-center text-sm">
                                <span className="font-bold text-white font-mono">{loc.loc_id}</span>
                                <span className="text-[10px] text-gray-500 bg-gray-900 px-2 py-1 rounded uppercase">{loc.zone}</span>
                            </div>
                        ))}
                    </div>
                )}
                {showLocDropdown && <div className="fixed inset-0 z-10" onClick={() => setShowLocDropdown(false)}></div>}
            </div>

            <div className="w-1/3">
                <label className="block text-sm text-gray-400 mb-2">수량</label>
                <input 
                    type="number" 
                    className="w-full bg-black border border-gray-700 rounded p-4 text-white outline-none focus:border-blue-500 font-bold text-right text-lg"
                    placeholder="0"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                />
            </div>
        </div>

        {/* ... (로트 정보 UI - 기존과 동일) ... */}
        {selectedItem && (
             <div className="bg-gray-800/50 p-4 rounded-lg mb-8 border border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">LOT 번호 {selectedItem.lot_required === 'Y' && <span className="text-red-500">*</span>}</label>
                        <input 
                            type="text" 
                            className={`w-full bg-black border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none ${selectedItem.lot_required === 'N' ? 'text-gray-500 cursor-not-allowed' : ''}`}
                            value={lotNo}
                            onChange={(e) => setLotNo(e.target.value)}
                            disabled={selectedItem.lot_required === 'N'}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">유통기한</label>
                        <input 
                            type="date" 
                            className="w-full bg-black border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none"
                            value={expDate}
                            onChange={(e) => setExpDate(e.target.value)}
                        />
                    </div>
                </div>
             </div>
        )}

        <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg text-lg shadow-lg shadow-blue-900/30 transition disabled:opacity-50 active:scale-[0.99]"
        >
            {loading ? "처리 중..." : "입고 완료 (SAVE)"}
        </button>

      </div>

      {showLocModal && (
        <LocationSelectorModal 
            onClose={() => setShowLocModal(false)}
            onSelect={handleSelectLocation}
        />
      )}

      {/* ✨ [신규] 시스템 스타일 성공 메시지 박스 (모달) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1a1a1a] border border-gray-700 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 transform transition-all scale-100">
            {/* 아이콘 원형 배경 */}
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
               <CheckCircle className="text-green-500 w-10 h-10" strokeWidth={3} />
            </div>
            
            {/* 메시지 내용 */}
            <h3 className="text-2xl font-bold text-white mb-2">입고 완료</h3>
            <p className="text-gray-400 text-center mb-8 leading-relaxed">
              입고 처리가 <span className="text-green-400 font-bold">정상적으로 완료</span>되었습니다.<br/>
              재고 현황 페이지로 이동합니다.
            </p>
            
            {/* 확인 버튼 */}
            <button 
              onClick={handleSuccessConfirm}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-green-900/30 transition active:scale-95"
            >
              확인
            </button>
          </div>
        </div>
      )}

    </div>
  );
}