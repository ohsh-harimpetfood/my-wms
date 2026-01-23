// app/outbound/new/page.tsx
"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, Box, MapPin, Package } from "lucide-react";

export default function NewOutboundPage() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();

  // URL 파라미터에서 초기값 읽기
  const paramLoc = searchParams.get("loc") || "";
  const paramItem = searchParams.get("item") || "";
  const paramLot = searchParams.get("lot") || "";
  const paramMaxQty = Number(searchParams.get("qty") || 0);

  // 폼 상태
  const [formData, setFormData] = useState({
    location_code: paramLoc,
    item_key: paramItem,
    lot_no: paramLot,
    out_qty: "",
    remark: ""
  });
  
  const [itemName, setItemName] = useState("");
  const [loading, setLoading] = useState(false);

  // 품목 이름 가져오기 (UX 향상)
  useEffect(() => {
    const fetchItemName = async () => {
        if (!formData.item_key) return;
        const { data } = await supabase.from("item_master").select("item_name").eq("item_key", formData.item_key).single();
        if (data) setItemName(data.item_name);
    };
    fetchItemName();
  }, [formData.item_key]);

  // 저장 핸들러
  const handleSave = async () => {
    const qty = Number(formData.out_qty);

    if (!qty || qty <= 0) {
        alert("출고 수량을 입력해주세요.");
        return;
    }
    // 재고 리스트에서 넘어온 경우, 수량 초과 체크
    if (paramMaxQty > 0 && qty > paramMaxQty) {
        alert(`현재 재고(${paramMaxQty})보다 많은 수량을 출고할 수 없습니다.`);
        return;
    }

    setLoading(true);
    try {
        // 1. 재고 차감 (Inventory)
        // 정확히 그 위치, 그 품목, 그 LOT의 재고를 찾아서 차감
        const { data: currentInv } = await supabase
            .from("inventory")
            .select("id, quantity")
            .eq("location_code", formData.location_code)
            .eq("item_key", formData.item_key)
            .eq("lot_no", formData.lot_no)
            .single();

        if (!currentInv) throw new Error("해당 재고를 찾을 수 없습니다.");
        
        const newQty = currentInv.quantity - qty;
        if (newQty < 0) throw new Error("재고가 부족합니다.");

        // 수량이 0이 되면 삭제할지, 0으로 남길지는 정책에 따름 (여기선 0으로 업데이트)
        // 만약 0일 때 삭제하고 싶다면 .delete().eq('id', currentInv.id) 사용
        await supabase
            .from("inventory")
            .update({ quantity: newQty, updated_at: new Date().toISOString() })
            .eq("id", currentInv.id);

        // 2. 수불 이력 생성 (Stock Transaction)
        await supabase.from("stock_tx").insert({
            transaction_type: 'OUTBOUND',
            io_type: 'OUT',
            location_code: formData.location_code,
            item_key: formData.item_key,
            lot_no: formData.lot_no,
            quantity: -qty, // 출고는 음수로 기록 (또는 양수로 하고 io_type으로 구분, 이전 로직에 맞춤)
            remark: formData.remark || '출고 등록'
        });

        alert("출고 처리가 완료되었습니다.");
        router.push("/inventory"); // 재고 목록으로 복귀
        router.refresh();

    } catch (e: any) {
        console.error(e);
        alert("오류 발생: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)] max-w-2xl mx-auto">
      
      <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white"><ArrowLeft /></button>
        <h1 className="text-2xl font-bold text-red-500">📤 출고 등록 (Outbound)</h1>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 shadow-2xl space-y-6">
        
        {/* 선택된 재고 정보 요약 카드 */}
        <div className="bg-black border border-gray-700 rounded-lg p-5 flex flex-col gap-3">
            <h3 className="text-gray-400 text-sm font-bold border-b border-gray-800 pb-2 mb-1">출고 대상 정보</h3>
            
            <div className="flex items-center gap-3">
                <MapPin className="text-blue-500" size={20} />
                <span className="text-lg font-bold text-white">{formData.location_code}</span>
            </div>
            
            <div className="flex items-center gap-3">
                <Package className="text-yellow-500" size={20} />
                <div>
                    <div className="text-white font-bold text-lg">{itemName || formData.item_key}</div>
                    <div className="text-gray-500 text-xs">{formData.item_key}</div>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <Box className="text-green-500" size={20} />
                <div className="flex gap-4 text-sm">
                    <span className="text-gray-400">LOT: <span className="text-white font-mono">{formData.lot_no}</span></span>
                    <span className="text-gray-400">현재고: <span className="text-blue-400 font-bold">{paramMaxQty.toLocaleString()}</span></span>
                </div>
            </div>
        </div>

        {/* 입력 폼 */}
        <div className="space-y-4 pt-2">
            <div>
                <label className="block text-sm text-gray-400 mb-2">출고 수량</label>
                <div className="relative">
                    <input 
                        type="number" 
                        value={formData.out_qty}
                        onChange={(e) => setFormData({...formData, out_qty: e.target.value})}
                        className="w-full bg-black border border-gray-700 rounded p-4 text-white outline-none focus:border-red-500 text-right text-2xl font-bold"
                        placeholder="0"
                        autoFocus
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 text-sm">EA/KG</span>
                </div>
                {paramMaxQty > 0 && (
                    <p className="text-right text-xs text-gray-500 mt-1">최대 {paramMaxQty.toLocaleString()}까지 가능</p>
                )}
            </div>

            <div>
                <label className="block text-sm text-gray-400 mb-2">비고</label>
                <input 
                    type="text" 
                    value={formData.remark}
                    onChange={(e) => setFormData({...formData, remark: e.target.value})}
                    className="w-full bg-black border border-gray-700 rounded p-3 text-white outline-none focus:border-red-500"
                    placeholder="출고 사유 입력"
                />
            </div>
        </div>

        <button 
            onClick={handleSave}
            disabled={loading}
            className="w-full bg-red-700 hover:bg-red-600 text-white font-bold py-4 rounded-lg text-lg shadow-lg shadow-red-900/20 transition disabled:opacity-50 mt-4"
        >
            {loading ? "처리 중..." : "출고 확정 (Release)"}
        </button>

      </div>
    </div>
  );
}