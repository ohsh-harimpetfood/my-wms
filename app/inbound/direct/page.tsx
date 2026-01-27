"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, Search, X } from "lucide-react";
import { Item } from "@/types";
// ✨ 시각적 선택기 대신 리스트 기반 모달 임포트
import LocationSelectorModal from "@/components/LocationSelectorModal";

export default function DirectInboundPage() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  // URL 파라미터 추출 (위치 및 품목 자동 완성용)
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

  // 초기 데이터 로드 및 URL 파라미터 기반 자동 선택
  useEffect(() => {
    const fetchData = async () => {
      const { data: itemData } = await supabase.from("item_master").select("*").eq("active_flag", "Y");
      if (itemData) {
        const fetchedItems = itemData as Item[];
        setItems(fetchedItems);

        // ✨ [혼적 대응] URL에 item_key가 있으면 해당 품목 자동 선택
        if (autoItem) {
          const target = fetchedItems.find(i => i.item_key === autoItem);
          if (target) handleSelectItem(target);
        }
      }
    };
    fetchData();
  }, [autoItem]);

  // 위치 실시간 DB 검색 (디바운싱 적용)
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

  // 품목 선택 핸들러
  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setItemSearchTerm("");
    // 로트 관리 여부에 따른 기본값 설정
    setLotNo(item.lot_required === 'Y' ? '' : 'DEFAULT');
  };

  const handleSelectLocation = (locId: string) => {
    setLocationCode(locId);
    setShowLocDropdown(false);
    setShowLocModal(false);
  };

  // 저장 (Upsert) 로직
  const handleSave = async () => {
    if (!selectedItem || !locationCode || !qty) {
      alert("품목, 위치, 수량은 필수입니다.");
      return;
    }
    setLoading(true);

    try {
      const qtyNum = Number(qty);
      if (qtyNum <= 0) throw new Error("수량은 0보다 커야 합니다.");

      // [STEP 1] 위치 유효성 최종 검증
      const { data: locInfo, error: locError } = await supabase
        .from("loc_master")
        .select("loc_id")
        .eq("loc_id", locationCode)
        .single();

      if (locError || !locInfo) throw new Error(`유효하지 않은 위치 코드입니다.`);

      // [STEP 2] 재고 정보 Upsert (동일 위치/품목/로트 합산)
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
        const { error: updateError } = await supabase
          .from("inventory")
          .update({ 
            quantity: existInven.quantity + qtyNum,
            updated_at: nowISO 
          })
          .eq("id", existInven.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("inventory")
          .insert({
            location_code: locationCode,
            item_key: selectedItem.item_key,
            quantity: qtyNum,
            lot_no: lotNo || 'DEFAULT',
            status: 'AVAILABLE',
            exp_date: expDate || null,
            inbound_date: nowISO,
            updated_at: nowISO
          });
        if (insertError) throw insertError;
      }

      // [STEP 3] 수불 이력(Transaction) 기록
      await supabase.from("stock_tx").insert({
        transaction_type: 'DIRECT_IN',
        location_code: locationCode,
        item_key: selectedItem.item_key,
        quantity: qtyNum,
        lot_no: lotNo || 'DEFAULT',
        io_type: 'IN',
        remark: '즉시 입고(Direct Inbound)'
      });

      alert("입고 처리가 완료되었습니다.");
      router.push("/inventory"); // 재고 현황으로 복귀
      router.refresh();

    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  // 품목 필터링 (클라이언트)
  const filteredItems = items.filter(i => {
    const term = itemSearchTerm.toLowerCase();
    return i.item_name.toLowerCase().includes(term) || i.item_key.toLowerCase().includes(term);
  }).slice(0, 5);

  return (
    <div className="p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)]">
      
      <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition">
          <ArrowLeft />
        </button>
        <h1 className="text-2xl font-bold text-yellow-500">⚡ 즉시 입고 (Direct Inbound)</h1>
      </div>

      <div className="max-w-2xl mx-auto bg-gray-900 border border-gray-800 p-8 rounded-xl shadow-2xl">
        
        {/* 1. 품목 선택 */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">품목 선택</label>
          {selectedItem ? (
            <div className="flex justify-between items-center bg-blue-900/20 border border-blue-500 p-4 rounded-lg">
                <div>
                    <div className="font-bold text-xl text-white">{selectedItem.item_name}</div>
                    <div className="text-sm text-gray-400 mt-1">{selectedItem.item_key}</div>
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-sm text-red-400 font-bold border border-red-900 px-3 py-1 rounded hover:bg-red-900/30 transition">변경</button>
            </div>
          ) : (
            <div className="relative">
                <div className="flex items-center bg-black border border-gray-700 rounded p-4 focus-within:border-blue-500 transition">
                    <Search className="text-gray-500 mr-3" size={20} />
                    <input 
                        type="text" 
                        placeholder="품목명 또는 코드로 검색..."
                        className="w-full bg-transparent text-white outline-none text-lg"
                        value={itemSearchTerm}
                        onChange={(e) => setItemSearchTerm(e.target.value)}
                    />
                </div>
                {itemSearchTerm && (
                    <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-700 rounded-b mt-1 z-20 shadow-xl max-h-60 overflow-y-auto">
                      {filteredItems.map(item => (
                          <div key={item.item_key} onClick={() => handleSelectItem(item)} className="p-4 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 transition text-sm">
                              <div className="font-bold text-white">{item.item_name}</div>
                              <div className="text-xs text-gray-500">{item.item_key}</div>
                          </div>
                      ))}
                    </div>
                )}
            </div>
          )}
        </div>

        {/* 2. 위치 & 수량 */}
        <div className="flex gap-4 mb-6 relative">
            <div className="flex-1 relative">
                <label className="block text-sm text-gray-400 mb-2">위치 (Location)</label>
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
                        placeholder="위치 코드 입력 또는 검색"
                        className="bg-transparent outline-none text-white font-mono text-lg w-full uppercase"
                    />
                </div>

                {showLocDropdown && locationCode && (
                    <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-700 rounded-b mt-1 z-20 shadow-xl max-h-60 overflow-y-auto">
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

        {/* 3. 로트 정보 */}
        {selectedItem && (
             <div className="bg-gray-800/50 p-4 rounded-lg mb-8 border border-gray-700">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">LOT 번호 {selectedItem.lot_required === 'Y' && <span className="text-red-500">*</span>}</label>
                        <input 
                            type="text" 
                            className={`w-full bg-black border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none ${selectedItem.lot_required === 'N' ? 'text-gray-500' : ''}`}
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
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg text-lg shadow-lg shadow-blue-900/30 transition disabled:opacity-50"
        >
            {loading ? "처리 중..." : "입고 완료 (SAVE)"}
        </button>

      </div>

      {/* ✨ 신규 리스트 기반 위치 선택 모달 */}
      {showLocModal && (
        <LocationSelectorModal 
            onClose={() => setShowLocModal(false)}
            onSelect={handleSelectLocation}
        />
      )}
    </div>
  );
}