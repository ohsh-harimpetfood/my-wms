"use client";

import React, { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { Calculator } from "lucide-react"; // 🚀 아이콘 추가
// 🚀 스마트 계산기 컴포넌트 임포트
import SubMaterialHelperSheet, { PackingDetail } from "@/components/SubMaterialHelperSheet";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  inventoryItem: any; // Inventory 리스트에서 선택한 아이템 객체
  onSuccess: () => void;
}

const InventoryAdjustmentModal = ({ isOpen, onClose, inventoryItem, onSuccess }: Props) => {
  const [realQty, setRealQty] = useState<string>("");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🚀 스마트 계산기 상태 추가
  const [showHelperSheet, setShowHelperSheet] = useState(false);
  const [packingDetails, setPackingDetails] = useState<PackingDetail[]>([]);

  // 모달 열릴 때 초기값 세팅
  useEffect(() => {
    if (isOpen && inventoryItem) {
      setRealQty(inventoryItem.quantity.toString());
      setReason("");
      setError(null);
      setPackingDetails([]); // 🚀 열릴 때마다 박스 정보 초기화
    }
  }, [isOpen, inventoryItem]);

  if (!isOpen || !inventoryItem) return null;

  const currentQty = Number(inventoryItem.quantity);
  const newQty = Number(realQty);
  const diff = newQty - currentQty; // 차이 계산

  // 🚀 부자재 또는 박스 관리 대상 여부 판별 (스마트 계산기 호출 조건용)
  const isBoxItem = inventoryItem.item_master?.item_type === '부자재' || inventoryItem.item_master?.item_type === '부품';

  const handleSubmit = async () => {
    if (isNaN(newQty) || newQty < 0) { // 마이너스 방지 추가
      setError("유효한 수량을 입력해주세요.");
      return;
    }
    if (diff === 0 && packingDetails.length === 0) { 
      // 🚀 수량 차이도 없고 박스 정보 수정도 없으면 막음
      setError("수량 또는 박스 정보 변경이 없습니다.");
      return;
    }
    if (!reason.trim()) {
      setError("조정 사유를 입력해주세요. (예: 망실, 파손, 실사반영)");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("로그인이 필요합니다.");
      setIsSubmitting(false);
      return;
    }

    try {
      // 1. 기존 RPC 함수 호출 (메인 수량 조정 및 이력 남기기)
      // (단, diff가 0이 아닌 경우에만 수량 조정 실행)
      if (diff !== 0) {
        const { error: rpcError } = await supabase.rpc("adjust_inventory", {
          p_inventory_id: inventoryItem.id,
          p_new_qty: newQty,
          p_reason: reason,
          p_user_id: user.id
        });

        if (rpcError) throw new Error(`수량 조정 오류: ${rpcError.message}`);
      }

      // 2. 🚀 [새로운 로직] 박스 상세 정보 갱신 (Upsert 느낌으로 Delete 후 Insert)
      // 스마트 계산기로부터 넘어온 데이터가 있을 경우에만 실행
      if (packingDetails.length > 0) {
        // 기존 박스 정보 싹 지우기
        const { error: deleteError } = await supabase
          .from("inventory_packing_info")
          .delete()
          .eq("inventory_id", inventoryItem.id);
        
        if (deleteError) throw new Error(`기존 박스 정보 삭제 오류: ${deleteError.message}`);

        // 새로운 박스 정보 Insert
        const packingInserts = packingDetails.map(p => ({
          inventory_id: inventoryItem.id,
          pack_type: p.pack_type,
          unit_qty: p.unit_qty,
          pack_count: p.pack_count,
          total_qty: p.total_qty,
          updated_by: user.id
        }));

        const { error: insertError } = await supabase
          .from("inventory_packing_info")
          .insert(packingInserts);
        
        if (insertError) throw new Error(`새로운 박스 정보 저장 오류: ${insertError.message}`);
      }

      onSuccess(); // 성공 시 부모 컴포넌트(리스트) 리프레시
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "재고 조정 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-[#222]">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            📊 재고 실사 및 조정
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
        </div>

        {/* 바디 */}
        <div className="p-6 space-y-5">
          
          {/* 타겟 정보 요약 */}
          <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-800 text-sm text-gray-300">
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Location:</span>
              <span className="font-mono text-blue-400">{inventoryItem.location_code}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-500">Item:</span>
              <span className="font-bold text-white">{inventoryItem.item_master?.item_name || inventoryItem.item_key}</span>
            </div>
            {inventoryItem.lot_no && (
              <div className="flex justify-between">
                <span className="text-gray-500">LOT:</span>
                <span className="font-mono text-yellow-500">{inventoryItem.lot_no}</span>
              </div>
            )}
          </div>

          {/* 수량 입력 (핵심 UX) */}
          <div className="grid grid-cols-3 gap-4 items-center">
            <div className="col-span-1 text-center p-3 bg-gray-800 rounded-lg border border-gray-700 h-full flex flex-col justify-center">
              <div className="text-xs text-gray-500 mb-1">전산 재고</div>
              <div className="text-xl font-bold text-white">{currentQty}</div>
            </div>
            <div className="col-span-1 text-center text-gray-500 font-bold text-xl">
              ➜
            </div>
            <div className="col-span-1 flex flex-col gap-1">
              {/* 🚀 [추가] 박스 계산기 호출 버튼 (공간 절약을 위해 아이콘 + 텍스트) */}
              {isBoxItem && (
                  <button
                    onClick={() => setShowHelperSheet(true)}
                    className="w-full flex items-center justify-center gap-1 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 text-blue-400 rounded px-2 py-1 text-[10px] font-bold transition whitespace-nowrap"
                  >
                    <Calculator size={12} /> 박스 단위 계산
                  </button>
              )}
              {!isBoxItem && <div className="text-xs text-gray-500 text-center mb-1">실사 수량</div>}
              
              <input
                type="text" inputMode="numeric"
                value={realQty}
                onChange={(e) => {
                    setRealQty(e.target.value.replace(/[^0-9]/g, ""));
                    setPackingDetails([]); // 직접 수정 시 박스 정보 날림
                }}
                className="w-full bg-[#0a0a0a] border border-blue-500/50 rounded-lg p-2.5 text-center text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="0"
              />
            </div>
          </div>

          {/* 🚀 [추가] 박스 정보 적용 완료 안내 메시지 */}
          {packingDetails.length > 0 && (
             <div className="text-[10px] text-emerald-400 bg-emerald-900/20 p-2 rounded text-center border border-emerald-900/50">
                ✓ 스마트 계산기로 {realQty}개 박스 정보가 적용되었습니다.
             </div>
          )}

          {/* 차이 표시 (자동계산) */}
          <div className={`text-center text-sm font-bold p-2 rounded ${diff === 0 ? 'text-gray-500' : diff > 0 ? 'text-blue-400 bg-blue-900/20' : 'text-red-400 bg-red-900/20'}`}>
            조정량: {diff > 0 ? `+${diff}` : diff}
          </div>

          {/* 사유 입력 */}
          <div>
            <label className="block text-xs text-gray-400 mb-1">조정 사유 (필수)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-gray-700 rounded-lg p-3 text-sm text-white focus:outline-none focus:border-gray-500 placeholder-gray-600"
              placeholder="예: 실사 차이 반영, 파손 폐기 등"
            />
          </div>

          {error && (
            <div className="text-red-400 text-sm text-center bg-red-900/20 p-2 rounded border border-red-900/50">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-800 flex gap-3 justify-end bg-[#222]">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-blue-900/20"
          >
            {isSubmitting ? "처리 중..." : "조정 확정"}
          </button>
        </div>
      </div>

      {/* 🚀 [추가] 스마트 계산기 바텀 시트 */}
      <SubMaterialHelperSheet
        isOpen={showHelperSheet}
        onClose={() => setShowHelperSheet(false)}
        itemName={inventoryItem.item_master?.item_name || ""}
        maxDecimal={0} // 실사는 낱개(0) 기준
        targetQty={currentQty} // 기존 재고를 목표 수량으로 제시
        onApply={(totalQty, details) => {
          setRealQty(String(totalQty)); 
          setPackingDetails(details);    
        }}
      />
    </div>
  );
};

export default InventoryAdjustmentModal;