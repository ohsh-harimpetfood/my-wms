"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, MapPin, Search, CheckCircle } from "lucide-react";
import LocationSelectorModal from "@/components/LocationSelectorModal";
// 🚀 상수 Import
import { TX_TYPES, TxCode } from "@/constants/transaction";

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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // 🚀 이동 유형 (현재는 '랙 이동' 하나지만, 나중에 '상태 변경' 등이 추가될 수 있음)
  const moveType: TxCode = "MV_LOC"; 

  // 품목명 조회
  useEffect(() => {
    if (itemKey) {
        supabase.from("item_master").select("item_name").eq("item_key", itemKey).single()
        .then(({ data }) => { if(data) setItemName(data.item_name); });
    }
  }, [itemKey, supabase]);

  // 이동 실행 핸들러
  const handleMove = async () => {
    if (!targetLoc) return alert("이동할 위치를 선택해주세요.");
    
    const finalTargetLoc = targetLoc.toUpperCase();
    if (finalTargetLoc === sourceLoc) return alert("현재 위치와 동일한 곳으로 이동할 수 없습니다.");
    
    const qty = Number(moveQty);
    if (!qty || qty <= 0) return alert("이동할 수량을 입력해주세요.");
    if (qty > maxQty) return alert(`보유 재고(${maxQty})보다 많이 이동할 수 없습니다.`);

    setLoading(true);
    try {
        const remainingQty = maxQty - qty;

        // 1. 보내는 곳 (Source) 처리
        let sourceQuery;
        if (remainingQty === 0) {
            sourceQuery = supabase.from("inventory").delete();
        } else {
            sourceQuery = supabase.from("inventory").update({ 
                quantity: remainingQty, 
                updated_at: new Date().toISOString() 
            });
        }
        
        if (sourceId) sourceQuery = sourceQuery.eq("id", sourceId);
        else sourceQuery = sourceQuery.eq("location_code", sourceLoc).eq("item_key", itemKey).eq("lot_no", lotNo);

        const { error: srcErr } = await sourceQuery;
        if (srcErr) throw new Error("출발지 재고 처리 실패: " + srcErr.message);


        // 2. 받는 곳 (Target) 증가 또는 생성 (Upsert)
        const { data: targetInv } = await supabase
            .from("inventory")
            .select("id, quantity")
            .eq("location_code", finalTargetLoc)
            .eq("item_key", itemKey)
            .eq("lot_no", lotNo)
            .single();

        if (targetInv) {
            await supabase.from("inventory").update({
                quantity: targetInv.quantity + qty,
                updated_at: new Date().toISOString()
            }).eq("id", targetInv.id);
        } else {
            // 위치 유효성 체크
            const { data: validLoc } = await supabase.from("loc_master").select("loc_id").eq("loc_id", finalTargetLoc).single();
            if (!validLoc) throw new Error(`존재하지 않는 위치 코드입니다: ${finalTargetLoc}`);

            await supabase.from("inventory").insert({
                location_code: finalTargetLoc,
                item_key: itemKey,
                lot_no: lotNo,
                quantity: qty,
                status: 'AVAILABLE'
            });
        }

        // 3. 수불 이력 (🚀 표준화 적용)
        // 이동은 [출고]와 [입고]가 동시에 일어나는 행위이므로, tx_code는 동일하게 'MV_LOC'를 씁니다.
        const historyData = [
            {
                transaction_type: 'MOVE',
                io_type: 'OUT',
                tx_code: moveType, // ✨ MV_LOC
                location_code: sourceLoc,
                item_key: itemKey,
                lot_no: lotNo,
                quantity: -qty,
                remark: `이동출고 (To: ${finalTargetLoc})`
            },
            {
                transaction_type: 'MOVE',
                io_type: 'IN',
                tx_code: moveType, // ✨ MV_LOC
                location_code: finalTargetLoc,
                item_key: itemKey,
                lot_no: lotNo,
                quantity: qty,
                remark: `이동입고 (From: ${sourceLoc})`
            }
        ];

        const { error: histErr } = await supabase.from("stock_tx").insert(historyData);
        if (histErr) throw new Error("이력 저장 실패: " + histErr.message);

        setShowSuccessModal(true);

    } catch (e: any) {
        console.error(e);
        alert("오류 발생: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccessModal(false);
    router.push("/inventory");
    router.refresh();
  };

  return (
    <div className="p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)]">
      
      <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4 max-w-4xl mx-auto">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white"><ArrowLeft /></button>
        <div>
            <h1 className="text-2xl font-bold text-blue-500">📦 재고 이동 (Stock Move)</h1>
            {/* 🚀 이동 유형 표시 */}
            <span className="text-xs bg-yellow-900/30 text-yellow-500 border border-yellow-800 px-2 py-0.5 rounded mt-1 inline-block font-bold">
                {TX_TYPES[moveType].label}
            </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-8 items-start">
        {/* Source Card (기존 동일) */}
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

        {/* Target Card (기존 동일) */}
        <div className="flex-1 w-full bg-gray-900 border border-blue-900/30 rounded-xl p-6 shadow-xl shadow-blue-900/10">
            <h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">📥 받는 곳 (To)</h2>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm text-gray-400 mb-2">이동할 위치</label>
                    <div className="flex items-center bg-black border border-blue-500 rounded-lg p-4 transition group focus-within:ring-2 focus-within:ring-blue-500/50">
                        <MapPin className="text-blue-500 mr-3" />
                        <input 
                            type="text" 
                            value={targetLoc} 
                            onChange={(e) => setTargetLoc(e.target.value.toUpperCase())}
                            placeholder="코드 입력 또는 돋보기 클릭" 
                            className="bg-transparent outline-none text-white font-bold text-lg w-full placeholder-gray-600 uppercase" 
                        />
                        <Search 
                            className="text-gray-500 hover:text-white cursor-pointer" 
                            size={20} 
                            onClick={() => setShowLocModal(true)}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-2">이동 수량</label>
                    <input type="number" value={moveQty} onChange={(e) => setMoveQty(e.target.value)} placeholder="0" className="w-full bg-black border border-gray-700 rounded-lg p-4 text-right text-white font-bold text-2xl outline-none focus:border-blue-500" />
                    <div className="text-right text-xs text-gray-500 mt-1">최대 {maxQty.toLocaleString()}개 가능</div>
                </div>
                <button onClick={handleMove} disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg shadow-blue-900/20 transition disabled:opacity-50 mt-2 active:scale-95">
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

      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#1a1a1a] border border-gray-700 p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 transform transition-all scale-100">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(34,197,94,0.2)]">
               <CheckCircle className="text-green-500 w-10 h-10" strokeWidth={3} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">이동 완료</h3>
            <p className="text-gray-400 text-center mb-8 leading-relaxed">
              재고 이동이 <span className="text-green-400 font-bold">성공적으로 처리</span>되었습니다.<br/>
              재고 목록으로 돌아갑니다.
            </p>
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