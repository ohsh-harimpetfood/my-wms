"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { ArrowLeft, Box, MapPin, Package, AlertTriangle, Check } from "lucide-react";
import { useUI } from "@/context/UIProvider"; 
// 🚀 상수 import (경로 확인 필수!)
import { TX_TYPES, TxCode, getTxTypesByGroup } from '@/constants/transaction'; 

export default function NewOutboundPage() {
  return (
    <Suspense fallback={<div className="text-white text-center py-20">로딩 중...</div>}>
      <OutboundForm />
    </Suspense>
  );
}

function OutboundForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const { alert, confirm, toast } = useUI(); 

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
  
  // 🚀 [신규] 출고 유형 상태 (기본값: 생산 투입)
  const [txCode, setTxCode] = useState<TxCode>('OUT_PROD');

  const [itemName, setItemName] = useState("");
  const [loading, setLoading] = useState(false);

  // 품목 이름 가져오기
  useEffect(() => {
    const fetchItemName = async () => {
        if (!formData.item_key) return;
        const { data } = await supabase.from("item_master").select("item_name").eq("item_key", formData.item_key).single();
        if (data) setItemName(data.item_name);
    };
    fetchItemName();
  }, [formData.item_key, supabase]);

  // 저장 핸들러
  const handleSave = async () => {
    const qty = Number(formData.out_qty);

    if (!qty || qty <= 0) {
        await alert("출고 수량을 입력해주세요.", "error");
        return;
    }
    if (paramMaxQty > 0 && qty > paramMaxQty) {
        await alert(`현재 재고(${paramMaxQty.toLocaleString()})보다 많은 수량을 출고할 수 없습니다.`, "error");
        return;
    }

    // 🚀 확인 메시지에 출고 유형 포함
    const txLabel = TX_TYPES[txCode].label;
    const isConfirmed = await confirm(
        `[${txLabel}]\n품목: ${itemName || formData.item_key}\n수량: ${qty.toLocaleString()} EA\n\n출고하시겠습니까?`, 
        "warning"
    );
    if (!isConfirmed) return;

    setLoading(true);
    try {
        // 1. 재고 조회
        const { data: currentInv, error: invError } = await supabase
            .from("inventory")
            .select("id, quantity")
            .eq("location_code", formData.location_code)
            .eq("item_key", formData.item_key)
            .eq("lot_no", formData.lot_no)
            .single();

        if (invError || !currentInv) throw new Error("해당 재고를 찾을 수 없습니다. 이미 출고되었거나 삭제된 데이터일 수 있습니다.");
        
        const newQty = currentInv.quantity - qty;
        if (newQty < 0) throw new Error("시스템 재고 부족 오류 (동시성 문제)");

        // 2. 재고 차감 (업데이트 or 삭제)
        if (newQty === 0) {
            await supabase.from("inventory").delete().eq("id", currentInv.id);
        } else {
            await supabase.from("inventory").update({ 
                quantity: newQty, 
                updated_at: new Date().toISOString() 
            }).eq("id", currentInv.id);
        }

        // 3. 수불 이력 생성 (🚀 tx_code 저장)
        const { error: txError } = await supabase.from("stock_tx").insert({
            transaction_type: 'OUTBOUND',
            io_type: 'OUT',
            tx_code: txCode,               // ✨ 핵심: 선택한 유형 코드 저장
            location_code: formData.location_code,
            item_key: formData.item_key,
            lot_no: formData.lot_no,
            quantity: -qty, 
            remark: formData.remark || txLabel // 비고 없으면 유형명으로 대체
        });

        if (txError) throw txError;

        await alert("출고 처리가 완료되었습니다.", "success");
        router.push("/inventory"); 
        router.refresh();

    } catch (e: any) {
        console.error(e);
        await alert("오류 발생: " + e.message, "error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)] flex items-center justify-center">
      
      <div className="w-full max-w-2xl animate-fade-in">
        <div className="flex items-center gap-4 mb-6 border-b border-gray-800 pb-4">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"><ArrowLeft /></button>
            <h1 className="text-2xl font-bold text-red-500 flex items-center gap-2">
                <AlertTriangle className="animate-pulse" /> 
                출고 등록 (Outbound)
            </h1>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            
            {/* 선택된 재고 정보 요약 카드 */}
            <div className="bg-black/50 border border-gray-700 rounded-xl p-5 flex flex-col gap-4">
                <div className="flex justify-between items-start border-b border-gray-800 pb-3 mb-1">
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Target Inventory</span>
                    <span className="bg-red-900/30 text-red-400 border border-red-900/50 text-[10px] px-2 py-0.5 rounded font-bold">출고 대상</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-900/20 flex items-center justify-center text-blue-500 border border-blue-900/50"><MapPin size={20} /></div>
                        <div>
                            <div className="text-gray-500 text-xs">Location</div>
                            <div className="text-white font-bold text-lg">{formData.location_code}</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-900/20 flex items-center justify-center text-yellow-500 border border-yellow-900/50"><Package size={20} /></div>
                        <div className="overflow-hidden">
                            <div className="text-gray-500 text-xs">Item</div>
                            <div className="text-white font-bold truncate">{itemName || formData.item_key}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:col-span-2">
                        <div className="w-10 h-10 rounded-full bg-green-900/20 flex items-center justify-center text-green-500 border border-green-900/50"><Box size={20} /></div>
                        <div className="flex-1 flex justify-between items-center">
                            <div>
                                <div className="text-gray-500 text-xs">LOT No.</div>
                                <div className="text-white font-mono">{formData.lot_no}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-gray-500 text-xs">Current Stock</div>
                                <div className="text-blue-400 font-bold text-xl">{paramMaxQty.toLocaleString()} <span className="text-sm text-gray-600">EA</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 입력 폼 */}
            <div className="space-y-6 pt-2">

                {/* 🚀 [신규 UI] 출고 유형 선택 (버튼형 칩) */}
                <div>
                    <label className="block text-sm text-gray-400 mb-3 font-bold">출고 유형 (Issue Type)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {/* TX_TYPES 중 'OUT' 타입만 골라서 버튼 생성 */}
                        {getTxTypesByGroup('OUT').map((type) => (
                            <button
                                key={type.code}
                                onClick={() => setTxCode(type.code as TxCode)}
                                className={`relative px-3 py-3 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                                    txCode === type.code
                                        ? "bg-red-600 border-red-500 text-white shadow-lg shadow-red-900/50 ring-1 ring-red-400"
                                        : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                                }`}
                            >
                                {/* 선택된 항목에 체크 표시 */}
                                {txCode === type.code && <Check size={14} className="absolute left-2 text-white/70" />}
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-2 font-bold">출고 수량 (Out Qty)</label>
                    <div className="relative group">
                        <input 
                            type="number" 
                            value={formData.out_qty}
                            onChange={(e) => setFormData({...formData, out_qty: e.target.value})}
                            className="w-full bg-black border border-gray-700 rounded-xl p-4 text-white outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all text-right text-3xl font-bold placeholder:text-gray-800"
                            placeholder="0"
                            autoFocus
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 font-bold text-sm bg-gray-900 px-2 py-1 rounded border border-gray-800">EA/KG</span>
                    </div>
                    {paramMaxQty > 0 && (
                        <div className="flex justify-end mt-2">
                            <button 
                                onClick={() => setFormData({...formData, out_qty: String(paramMaxQty)})}
                                className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2"
                            >
                                전량 출고 ({paramMaxQty.toLocaleString()})
                            </button>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm text-gray-400 mb-2">비고 (선택사항)</label>
                    <input 
                        type="text" 
                        value={formData.remark}
                        onChange={(e) => setFormData({...formData, remark: e.target.value})}
                        className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-gray-500 transition-colors placeholder:text-gray-600"
                        placeholder="특이사항이 있을 경우에만 입력하세요."
                    />
                </div>
            </div>

            <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-red-900/30 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        처리 중...
                    </>
                ) : (
                    <>📤 출고 확정 (Confirm)</>
                )}
            </button>

        </div>
      </div>
    </div>
  );
}