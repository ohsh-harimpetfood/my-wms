"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { ArrowLeft, Box, MapPin, Package, AlertTriangle, Check, Loader2 } from "lucide-react";
import { useUI } from "@/context/UIProvider"; 
import { TX_TYPES, TxCode, getTxTypesByGroup } from '@/constants/transaction'; 
import { useAuth } from "@/context/AuthProvider"; 

export default function NewOutboundPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">로딩 중...</div>}>
      <OutboundForm />
    </Suspense>
  );
}

function OutboundForm() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const { alert, confirm, toast } = useUI(); 
  const { user } = useAuth(); 

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
  
  const [txCode, setTxCode] = useState<TxCode>('OUT_PROD');
  
  // 🚀 [수정] 품목 정보 전체 상태 관리 (소수점 제어용)
  const [itemInfo, setItemInfo] = useState<{ item_name: string; uom: string; item_type: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // 🚀 [수정] 품목 이름 및 소수점 제어용 데이터 가져오기
  useEffect(() => {
    const fetchItemInfo = async () => {
        if (!formData.item_key) return;
        const { data } = await supabase
            .from("item_master")
            .select("item_name, uom, item_type") // uom, item_type 추가 조회
            .eq("item_key", formData.item_key)
            .single();
            
        if (data) setItemInfo(data);
    };
    fetchItemInfo();
  }, [formData.item_key, supabase]);

  // 🚀 [추가] 소수점 자릿수 동적 계산 함수
  const getMaxDecimal = () => {
    if (!itemInfo) return 0;
    if (itemInfo.uom === 'KM') return 3;
    if (itemInfo.item_type === '원자재' || itemInfo.item_type === '원료') return 2;
    return 0; // 나머지는 정수
  };

  // 🚀 [추가] 소수점 입력 제어 정규식
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

  // 🚀 [수정] 수량 입력 핸들러
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const maxDec = getMaxDecimal();
    const val = sanitizeDecimalInput(e.target.value, maxDec);
    
    // 출고 가능 수량 초과 방지
    if (paramMaxQty > 0 && Number(val) > paramMaxQty) {
        setFormData({ ...formData, out_qty: String(paramMaxQty) });
        return;
    }
    
    setFormData({ ...formData, out_qty: val });
  };

  // 저장 핸들러
  const handleSave = async () => {
    if (!user) {
        await alert("로그인 세션이 만료되었습니다.", "error");
        return;
    }

    const qty = Number(formData.out_qty);

    if (!qty || qty <= 0) {
        await alert("출고 수량을 입력해주세요.", "error");
        return;
    }
    if (paramMaxQty > 0 && qty > paramMaxQty) {
        await alert(`현재 재고(${paramMaxQty.toLocaleString()})보다 많은 수량을 출고할 수 없습니다.`, "error");
        return;
    }

    const txLabel = TX_TYPES[txCode].label;
    const isConfirmed = await confirm(
        `[${txLabel}]\n품목: ${itemInfo?.item_name || formData.item_key}\n수량: ${qty.toLocaleString()}\n\n출고하시겠습니까?`, 
        "warning"
    );
    if (!isConfirmed) return;

    setLoading(true);
    try {
        // 1. 재고 조회 (최신 상태 확인)
        const { data: currentInv, error: invError } = await supabase
            .from("inventory")
            .select("id, quantity")
            .eq("location_code", formData.location_code)
            .eq("item_key", formData.item_key)
            .eq("lot_no", formData.lot_no)
            .single();

        if (invError || !currentInv) throw new Error("해당 재고를 찾을 수 없습니다. 이미 출고되었거나 삭제된 데이터일 수 있습니다.");
        
        // 🚀 부동소수점 오차 방지
        const newQty = Number((currentInv.quantity - qty).toFixed(4));
        if (newQty < 0) throw new Error("시스템 재고 부족 오류 (다른 사용자가 먼저 출고했을 수 있습니다)");

        // 2. 재고 차감 (업데이트 or 삭제)
        if (newQty === 0) {
            await supabase.from("inventory").delete().eq("id", currentInv.id);
        } else {
            await supabase.from("inventory").update({ 
                quantity: newQty, 
                updated_at: new Date().toISOString(),
                updated_by: user.id 
            }).eq("id", currentInv.id);
        }

        // 3. 수불 이력 생성
        const { error: txError } = await supabase.from("stock_tx").insert({
            transaction_type: 'OUTBOUND',
            io_type: 'OUT',
            tx_code: txCode, 
            location_code: formData.location_code,
            item_key: formData.item_key,
            lot_no: formData.lot_no,
            quantity: -qty, 
            remark: formData.remark || txLabel,
            created_by: user.id 
        });

        if (txError) throw txError;

        await toast.success("출고 처리가 완료되었습니다.");
        router.push("/inventory"); 
        router.refresh();

    } catch (e: any) {
        console.error(e);
        await alert("오류 발생: " + e.message, "error");
    } finally {
        setLoading(false);
    }
  };

  const currentMaxDec = getMaxDecimal();
  const placeholderValue = currentMaxDec === 3 ? "0.000" : currentMaxDec === 2 ? "0.00" : "0";

  return (
    // 🚀 [톤업] bg-black -> bg-slate-950
    <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-slate-100 font-[family-name:var(--font-geist-sans)] flex justify-center pb-24">
      
      <div className="w-full max-w-2xl animate-fade-in">
        
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-4 sticky top-0 bg-slate-950/90 backdrop-blur-sm z-30 pt-2">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"><ArrowLeft /></button>
            <h1 className="text-xl md:text-2xl font-bold text-rose-500 flex items-center gap-2">
                <AlertTriangle className="animate-pulse" /> 
                출고 등록 (Outbound)
            </h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl space-y-6">
            
            {/* 선택된 재고 정보 요약 카드 */}
            <div className="bg-slate-950/50 border border-slate-700 rounded-xl p-5 flex flex-col gap-4 shadow-inner">
                <div className="flex justify-between items-start border-b border-slate-800 pb-3 mb-1">
                    <span className="text-slate-400 text-xs font-bold uppercase tracking-wider">Target Inventory</span>
                    <span className="bg-rose-900/30 text-rose-400 border border-rose-900/50 text-[10px] px-2 py-0.5 rounded font-bold">출고 대상</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-900/20 flex items-center justify-center text-blue-500 border border-blue-900/50"><MapPin size={20} /></div>
                        <div>
                            <div className="text-slate-500 text-xs">Location</div>
                            <div className="text-white font-bold text-lg">{formData.location_code}</div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-yellow-900/20 flex items-center justify-center text-yellow-500 border border-yellow-900/50"><Package size={20} /></div>
                        <div className="overflow-hidden">
                            <div className="text-slate-500 text-xs">Item</div>
                            <div className="text-white font-bold truncate">{itemInfo?.item_name || formData.item_key}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:col-span-2">
                        <div className="w-10 h-10 rounded-full bg-emerald-900/20 flex items-center justify-center text-emerald-500 border border-emerald-900/50"><Box size={20} /></div>
                        <div className="flex-1 flex justify-between items-center">
                            <div>
                                <div className="text-slate-500 text-xs">LOT No.</div>
                                <div className="text-white font-mono">{formData.lot_no}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-slate-500 text-xs">Current Stock</div>
                                <div className="text-blue-400 font-bold text-xl">{paramMaxQty.toLocaleString()} <span className="text-sm text-slate-500">{itemInfo?.uom || 'EA'}</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 입력 폼 */}
            <div className="space-y-6 pt-2">

                {/* 출고 유형 선택 (버튼형 칩) */}
                <div>
                    <label className="block text-sm text-slate-400 mb-3 font-bold">출고 유형 (Issue Type)</label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {getTxTypesByGroup('OUT').map((type) => (
                            <button
                                key={type.code}
                                onClick={() => setTxCode(type.code as TxCode)}
                                className={`relative px-3 py-3 rounded-lg text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                                    txCode === type.code
                                        ? "bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-900/50 ring-1 ring-rose-400"
                                        : "bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                }`}
                            >
                                {txCode === type.code && <Check size={14} className="absolute left-2 text-white/70" />}
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm text-slate-400 font-bold">출고 수량 (Out Qty)</label>
                        {/* 🚀 사용자 안내용 제약조건 표시 */}
                        <span className="text-[10px] text-blue-400 font-mono bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-900/50">
                            {currentMaxDec === 0 ? "정수 입력만 가능" : `소수점 ${currentMaxDec}자리까지 허용`}
                        </span>
                    </div>
                    <div className="relative group">
                        <input 
                            type="text" 
                            inputMode="decimal"
                            value={formData.out_qty}
                            onChange={handleQtyChange} 
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all text-right text-3xl font-bold placeholder:text-slate-700 h-16"
                            placeholder={placeholderValue}
                            autoFocus
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm bg-slate-900 px-2 py-1 rounded border border-slate-800">
                            {itemInfo?.uom || 'EA'}
                        </span>
                    </div>
                    {paramMaxQty > 0 && (
                        <div className="flex justify-end mt-2">
                            <button 
                                onClick={() => setFormData({...formData, out_qty: String(paramMaxQty)})}
                                className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-2 flex items-center gap-1 transition"
                            >
                                <Check size={12}/> 전량 출고 ({paramMaxQty.toLocaleString()})
                            </button>
                        </div>
                    )}
                </div>

                <div>
                    <label className="block text-sm text-slate-400 mb-2">비고 (선택사항)</label>
                    <input 
                        type="text" 
                        value={formData.remark}
                        onChange={(e) => setFormData({...formData, remark: e.target.value})}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-slate-500 transition-colors placeholder:text-slate-600"
                        placeholder="특이사항이 있을 경우에만 입력하세요."
                    />
                </div>
            </div>

            <button 
                onClick={handleSave}
                disabled={loading}
                className="w-full bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 text-white font-bold py-4 rounded-xl text-lg shadow-lg shadow-rose-900/30 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2 h-16"
            >
                {loading ? (
                    <>
                        <Loader2 className="animate-spin" /> 처리 중...
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