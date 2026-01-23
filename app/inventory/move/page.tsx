// app/inventory/move/page.tsx
"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, MapPin, Package, Search, X } from "lucide-react";

export default function InventoryMovePage() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  // URL 파라미터 (Source 정보)
  const sourceId = searchParams.get("id"); 
  const sourceLoc = searchParams.get("loc");
  const itemKey = searchParams.get("item");
  const lotNo = searchParams.get("lot");
  const maxQty = Number(searchParams.get("qty") || 0);

  // 입력 상태
  const [targetLoc, setTargetLoc] = useState("");
  const [moveQty, setMoveQty] = useState("");
  const [itemName, setItemName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);

  // 품목명 조회
  useEffect(() => {
    if (itemKey) {
        supabase.from("item_master").select("item_name").eq("item_key", itemKey).single()
        .then(({ data }) => { if(data) setItemName(data.item_name); });
    }
  }, [itemKey]);

  // 이동 실행 핸들러
  const handleMove = async () => {
    if (!targetLoc) return alert("이동할 위치를 선택해주세요.");
    if (targetLoc === sourceLoc) return alert("현재 위치와 동일한 곳으로 이동할 수 없습니다.");
    
    const qty = Number(moveQty);
    if (!qty || qty <= 0) return alert("이동할 수량을 입력해주세요.");
    if (qty > maxQty) return alert(`보유 재고(${maxQty})보다 많이 이동할 수 없습니다.`);

    setLoading(true);
    try {
        const remainingQty = maxQty - qty;

        // 1. 보내는 곳 (Source) 처리
        // ✨ 핵심 수정: 잔량이 0이면 삭제(Delete), 남으면 업데이트(Update)
        let sourceQuery;
        
        if (remainingQty === 0) {
            // 전량 이동 시 삭제
            sourceQuery = supabase.from("inventory").delete();
        } else {
            // 일부 이동 시 업데이트
            sourceQuery = supabase.from("inventory").update({ 
                quantity: remainingQty, 
                updated_at: new Date().toISOString() 
            });
        }
        
        // 조건절 추가 (ID가 있으면 ID로, 없으면 복합키로)
        if (sourceId) sourceQuery = sourceQuery.eq("id", sourceId);
        else sourceQuery = sourceQuery.eq("location_code", sourceLoc).eq("item_key", itemKey).eq("lot_no", lotNo);

        const { error: srcErr } = await sourceQuery;
        if (srcErr) throw new Error("출발지 재고 처리 실패: " + srcErr.message);


        // 2. 받는 곳 (Target) 증가 또는 생성 (Upsert)
        const { data: targetInv } = await supabase
            .from("inventory")
            .select("id, quantity")
            .eq("location_code", targetLoc)
            .eq("item_key", itemKey)
            .eq("lot_no", lotNo)
            .single();

        if (targetInv) {
            await supabase.from("inventory").update({
                quantity: targetInv.quantity + qty,
                updated_at: new Date().toISOString()
            }).eq("id", targetInv.id);
        } else {
            await supabase.from("inventory").insert({
                location_code: targetLoc,
                item_key: itemKey,
                lot_no: lotNo,
                quantity: qty,
                status: 'AVAILABLE'
            });
        }

        // 3. 수불 이력 (History) 기록
        // ✨ 수정: created_at 제거 (DB 자동생성 맡김)
        const historyData = [
            {
                transaction_type: 'MOVE',
                io_type: 'OUT',
                location_code: sourceLoc,
                item_key: itemKey,
                lot_no: lotNo,
                quantity: -qty, // 음수
                remark: `이동출고 (To: ${targetLoc})`
            },
            {
                transaction_type: 'MOVE',
                io_type: 'IN',
                location_code: targetLoc,
                item_key: itemKey,
                lot_no: lotNo,
                quantity: qty, // 양수
                remark: `이동입고 (From: ${sourceLoc})`
            }
        ];

        const { error: histErr } = await supabase.from("stock_tx").insert(historyData);
        if (histErr) throw new Error("이력 저장 실패: " + histErr.message);

        alert("재고 이동이 완료되었습니다.");
        router.push("/inventory");
        router.refresh();

    } catch (e: any) {
        console.error(e);
        alert("오류 발생: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)]">
      
      <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4 max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white"><ArrowLeft /></button>
        <h1 className="text-2xl font-bold text-blue-500">📦 재고 이동 (Stock Move)</h1>
      </div>

      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start">
        {/* Source Card */}
        <div className="flex-1 w-full bg-gray-900 border border-gray-800 rounded-xl p-6 opacity-80">
            <h2 className="text-lg font-bold text-gray-400 mb-4 flex items-center gap-2">📤 보내는 곳 (From)</h2>
            <div className="space-y-4">
                <div className="bg-black p-4 rounded border border-gray-800">
                    <div className="text-sm text-gray-500 mb-1">위치</div>
                    <div className="text-xl font-bold text-white">{sourceLoc}</div>
                </div>
                <div>
                    <div className="text-sm text-gray-500 mb-1">품목</div>
                    <div className="text-lg font-bold text-white">{itemName}</div>
                    <div className="text-sm text-gray-500">{itemKey}</div>
                </div>
                <div className="flex gap-4">
                    <div>
                        <div className="text-sm text-gray-500 mb-1">LOT</div>
                        <div className="text-white font-mono">{lotNo || '-'}</div>
                    </div>
                    <div>
                        <div className="text-sm text-gray-500 mb-1">현재고</div>
                        <div className="text-blue-400 font-bold">{maxQty.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        </div>

        <div className="hidden md:flex self-center text-gray-600"><ArrowRight size={40} /></div>

        {/* Target Card */}
        <div className="flex-1 w-full bg-gray-900 border border-blue-900/30 rounded-xl p-6 shadow-xl shadow-blue-900/10">
            <h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">📥 받는 곳 (To)</h2>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm text-gray-400 mb-2">이동할 위치</label>
                    <div onClick={() => setShowLocModal(true)} className="flex items-center bg-black border border-blue-500 rounded-lg p-4 cursor-pointer hover:bg-gray-800 transition group">
                        <MapPin className="text-blue-500 mr-3" />
                        <input type="text" value={targetLoc} placeholder="위치 선택 (클릭)" readOnly className="bg-transparent outline-none text-white font-bold text-lg w-full cursor-pointer placeholder-gray-600" />
                        <Search className="text-gray-500 group-hover:text-white" size={18} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-2">이동 수량</label>
                    <input type="number" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} placeholder="0" className="w-full bg-black border border-gray-700 rounded-lg p-4 text-right text-white font-bold text-2xl outline-none focus:border-blue-500" />
                    <div className="text-right text-xs text-gray-500 mt-1">최대 {maxQty.toLocaleString()}개 가능</div>
                </div>
                <button onClick={handleMove} disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 transition disabled:opacity-50 mt-2">
                    {loading ? "이동 중..." : "재고 이동 실행"}
                </button>
            </div>
        </div>
      </div>

      {showLocModal && (
        <LocationSelectorModal 
            onClose={() => setShowLocModal(false)}
            onSelect={(locId) => { setTargetLoc(locId); setShowLocModal(false); }}
        />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// 🧱 위치 선택 모달 (UI 개선: 2열 배치 + 내부 3단 적재 구조 복구 ✨)
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
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-center p-5 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white">📍 이동할 위치 선택</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full"><X /></button>
                </div>
                
                {/* 탭 */}
                <div className="flex gap-2 px-5 pt-5 border-b border-gray-800 overflow-x-auto">
                    {uniqueZones.map(zone => (
                        <button key={zone} onClick={() => setActiveZone(zone)} className={`px-4 py-3 text-sm font-bold rounded-t-lg whitespace-nowrap ${activeZone === zone ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                            {zone} 구역
                        </button>
                    ))}
                </div>

                {/* 그리드 뷰 영역 */}
                <div className="flex-1 overflow-y-auto p-6 bg-black/30">
                    {loading ? <div className="text-center py-10">로딩 중...</div> : (
                        // ✨ 2열(md:grid-cols-2) 배치로 시원하게 보여줌
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {rackKeys.map((rack: any) => {
                                // 랙 이름 깔끔하게
                                const cleanRackName = rack.includes('-') ? rack.split('-').pop() : rack;
                                const rackLocs = filteredLocs.filter((l:any) => l.rack_no === rack);
                                
                                // ✨ 내부 구조: 3단(위) -> 1단(아래) 순서 정렬
                                const levels = Array.from(new Set(rackLocs.map((l:any) => l.level_no))).sort().reverse(); 
                                const columns = Array.from(new Set(rackLocs.map((l:any) => l.side))).sort();

                                return (
                                    <div key={rack} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden flex flex-col">
                                        <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 font-bold text-gray-300 flex justify-between items-center">
                                            <span>Rack {cleanRackName}</span>
                                            <span className="text-xs text-gray-500 font-normal">{rackLocs.length} Cells</span>
                                        </div>
                                        
                                        {/* ✨ 내부 셀 배치: 엑셀 형태 (3단 적재 구조) */}
                                        <div className="p-4 overflow-x-auto">
                                            <div className="flex flex-col gap-2 min-w-max">
                                                {levels.map((lvl: any) => (
                                                    <div key={lvl} className="flex gap-2">
                                                        {columns.map((col: any) => {
                                                            const loc = rackLocs.find((l:any) => l.level_no === lvl && l.side === col);
                                                            return loc ? (
                                                                <button 
                                                                    key={loc.loc_id}
                                                                    onClick={() => onSelect(loc.loc_id)}
                                                                    className="w-14 h-10 flex items-center justify-center text-xs font-bold rounded bg-black border border-gray-700 hover:bg-blue-600 hover:border-blue-500 hover:text-white transition text-gray-400"
                                                                    title={loc.loc_id}
                                                                >
                                                                    {/* 2F-A-03-01 -> 03-01 형태로 간략 표시 */}
                                                                    {lvl}-{col}
                                                                </button>
                                                            ) : (
                                                                <div key={`${lvl}-${col}`} className="w-14 h-10 bg-transparent"></div>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}