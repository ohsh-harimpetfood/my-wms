// app/inbound/direct/page.tsx
"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, Search, X } from "lucide-react"; // 아이콘
import { Item } from "@/types";

export default function DirectInboundPage() {
  const router = useRouter();
  const supabase = createClient();

  // 입력 상태
  const [items, setItems] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  
  const [locationCode, setLocationCode] = useState("");
  const [qty, setQty] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [expDate, setExpDate] = useState("");
  const [loading, setLoading] = useState(false);

  // ✨ 팝업 상태
  const [showLocModal, setShowLocModal] = useState(false);

  // 품목 마스터 로딩
  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase.from("item_master").select("*").eq("active_flag", "Y");
      if (data) setItems(data as Item[]);
    };
    fetchItems();
  }, []);

  // 🔍 스마트 검색 로직 (사용자님 코드 유지)
  const normalize = (text: string) => text.replace(/\s+/g, "").toLowerCase();
  const filteredItems = items.filter(i => {
    const search = normalize(searchTerm);
    const name = normalize(i.item_name);
    const code = normalize(i.item_key);
    return name.includes(search) || code.includes(search);
  }).slice(0, 5); // 최대 5개만 노출

  const handleSelect = (item: Item) => {
    setSelectedItem(item);
    setSearchTerm("");
    setLotNo(item.lot_required === 'Y' ? '' : 'DEFAULT');
  };

  const handleSave = async () => {
    if (!selectedItem || !locationCode || !qty) {
      alert("품목, 위치, 수량은 필수입니다.");
      return;
    }
    setLoading(true);

    try {
      const qtyNum = Number(qty);

      // 1. 재고(Inventory) Upsert
      const { data: existInven } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("location_code", locationCode)
        .eq("item_key", selectedItem.item_key)
        .eq("lot_no", lotNo || 'DEFAULT')
        .single();

      if (existInven) {
        await supabase.from("inventory").update({
          quantity: existInven.quantity + qtyNum,
          updated_at: new Date().toISOString()
        }).eq("id", existInven.id);
      } else {
        await supabase.from("inventory").insert({
          location_code: locationCode,
          item_key: selectedItem.item_key,
          quantity: qtyNum,
          lot_no: lotNo || 'DEFAULT',
          exp_date: expDate || null,
          status: 'AVAILABLE'
        });
      }

      // 2. 수불 이력(History) 기록
      await supabase.from("stock_tx").insert({
        transaction_type: 'DIRECT_IN',
        location_code: locationCode,
        item_key: selectedItem.item_key,
        quantity: qtyNum,
        lot_no: lotNo || 'DEFAULT',
        io_type: 'IN',
        remark: '즉시 입고(Direct Inbound)'
      });

      alert("입고 완료되었습니다.");
      setQty(""); // 수량 초기화
      // 필요하면 setSelectedItem(null) 등 추가 초기화

    } catch (e: any) {
      console.error(e);
      alert("오류 발생: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)]">
      
      <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white">
            <ArrowLeft />
        </button>
        <h1 className="text-2xl font-bold text-yellow-500">⚡ 즉시 입고 (Direct Inbound)</h1>
      </div>

      <div className="max-w-2xl mx-auto bg-gray-900 border border-gray-800 p-8 rounded-xl shadow-2xl">
        
        {/* 1. 품목 검색 (스마트 검색 유지) */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">품목 선택</label>
          {selectedItem ? (
            <div className="flex justify-between items-center bg-blue-900/20 border border-blue-500 p-4 rounded-lg">
                <div>
                    <div className="font-bold text-xl text-white">{selectedItem.item_name}</div>
                    <div className="text-sm text-gray-400 mt-1">{selectedItem.item_key} | {selectedItem.uom}</div>
                </div>
                <button onClick={() => setSelectedItem(null)} className="text-sm text-red-400 hover:text-red-300 font-bold border border-red-900 px-3 py-1 rounded hover:bg-red-900/30 transition">변경</button>
            </div>
          ) : (
            <div className="relative">
                <div className="flex items-center bg-black border border-gray-700 rounded p-4 focus-within:border-blue-500 transition">
                    <Search className="text-gray-500 mr-3" size={20} />
                    <input 
                        type="text" 
                        placeholder="품목명 또는 코드로 검색..."
                        className="w-full bg-transparent text-white outline-none text-lg"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {searchTerm && (
                    <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-700 rounded-b mt-1 z-10 shadow-xl max-h-60 overflow-y-auto">
                    {filteredItems.length === 0 ? (
                        <div className="p-4 text-gray-500 text-center">검색 결과가 없습니다.</div>
                    ) : (
                        filteredItems.map(item => (
                            <div key={item.item_key} onClick={() => handleSelect(item)} className="p-4 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 transition">
                                <div className="font-bold text-white">{item.item_name}</div>
                                <div className="text-xs text-gray-500">{item.item_key}</div>
                            </div>
                        ))
                    )}
                    </div>
                )}
            </div>
          )}
        </div>

        {/* 2. 위치 & 수량 (✨ 팝업 적용) */}
        <div className="flex gap-4 mb-6">
            <div className="flex-1">
                <label className="block text-sm text-gray-400 mb-2">위치 (Location)</label>
                {/* 팝업 트리거로 변경 */}
                <div 
                    className="flex items-center bg-black border border-gray-700 rounded p-4 cursor-pointer hover:border-blue-500 transition group"
                    onClick={() => setShowLocModal(true)}
                >
                    <Search className="text-gray-500 mr-3 group-hover:text-blue-400" size={20} />
                    <input 
                        type="text" 
                        value={locationCode}
                        placeholder="터치하여 선택"
                        readOnly
                        className="bg-transparent outline-none text-white font-mono text-lg w-full cursor-pointer placeholder-gray-600 uppercase"
                    />
                </div>
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

        {/* 3. LOT 정보 */}
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
                            placeholder={selectedItem.lot_required === 'N' ? "자동 입력됨" : ""}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">유통기한</label>
                        <input 
                            type="date" 
                            className="w-full bg-black border border-gray-600 rounded p-3 text-white focus:border-blue-500 outline-none"
                            value={expDate}
                            onChange={(e) => setExpDate(e.target.value)}
                            disabled={selectedItem.lot_required === 'N'}
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

      {/* ✨ 위치 선택 팝업 (하단에 배치) */}
      {showLocModal && (
        <LocationSelectorModal 
            onClose={() => setShowLocModal(false)}
            onSelect={(locId) => {
                setLocationCode(locId);
                setShowLocModal(false);
            }}
        />
      )}

    </div>
  );
}

// -------------------------------------------------------------
// ✨ 재사용 가능한 위치 선택 팝업
// -------------------------------------------------------------
function LocationSelectorModal({ onClose, onSelect }: { onClose: () => void, onSelect: (id: string) => void }) {
    const supabase = createClient();
    const [locations, setLocations] = useState<any[]>([]);
    const [activeZone, setActiveZone] = useState<string>("");
    const [uniqueZones, setUniqueZones] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLocs = async () => {
            const { data } = await supabase.from("loc_master").select("*").eq("active_flag", "Y").order("loc_id");
            if (data) {
                setLocations(data);
                const zones = Array.from(new Set(data.map((l:any) => l.zone))).sort() as string[];
                setUniqueZones(zones);
                if(zones.length > 0) setActiveZone(zones[0]);
            }
            setLoading(false);
        };
        fetchLocs();
    }, []);

    const filteredLocs = locations.filter((l:any) => l.zone === activeZone);
    const rackKeys = Array.from(new Set(filteredLocs.map((l:any) => l.rack_no))).sort();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-center p-5 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white">📍 위치 선택</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full"><X /></button>
                </div>
                <div className="flex gap-2 px-5 pt-5 border-b border-gray-800 overflow-x-auto">
                    {uniqueZones.map(zone => (
                        <button key={zone} onClick={() => setActiveZone(zone)} className={`px-4 py-3 text-sm font-bold rounded-t-lg whitespace-nowrap ${activeZone === zone ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                            {zone} 구역
                        </button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto p-5 bg-black/30">
                    {loading ? <div className="text-center py-10">로딩 중...</div> : (
                        <div className="space-y-6">
                            {rackKeys.map((rack: any) => (
                                <div key={rack} className="bg-black border border-gray-800 rounded-lg p-4">
                                    <h3 className="text-lg font-bold text-gray-400 mb-3 border-b border-gray-800 pb-2">Rack {rack}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filteredLocs.filter((l:any) => l.rack_no === rack).map((loc:any) => (
                                            <button key={loc.loc_id} onClick={() => onSelect(loc.loc_id)} className="px-3 py-2 bg-gray-900 border border-gray-700 rounded hover:bg-blue-600 hover:border-blue-400 hover:text-white transition text-sm text-blue-400 font-bold min-w-[80px]">
                                                {loc.loc_id}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}