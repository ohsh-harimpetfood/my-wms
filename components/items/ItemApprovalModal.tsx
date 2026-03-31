"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { X, Check, Trash2, Loader2, AlertCircle } from "lucide-react";
import { useUI } from "@/context/UIProvider";

interface StagingItem {
  id: string;
  item_key: string;
  item_name: string;
  uom: string;
  item_type: string;
  lot_required: string;
  active_flag: string;
  use_team: string;
  shelf_life_days: number;
  unit_cost: number;
  barcode: string;
  erp_item_code: string;
  erp_flag: string;
  remark: string;
  request_type: string;
  status: string;
  created_at: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void; // 승인 완료 시 부모 컴포넌트 리프레시용
}

export default function ItemApprovalModal({ isOpen, onClose, onSuccess }: Props) {
  const [pendingItems, setPendingItems] = useState<StagingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null); // 현재 처리 중인 ID
  const supabase = createClient();
  const { toast, alert: uiAlert, confirm } = useUI();

  // 모달이 열릴 때 PENDING 상태인 데이터 조회
  useEffect(() => {
    if (isOpen) fetchPendingItems();
  }, [isOpen]);

  const fetchPendingItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("item_master_staging")
      .select("*")
      .eq("status", "PENDING")
      .order("created_at", { ascending: true });

    if (!error && data) setPendingItems(data as StagingItem[]);
    setIsLoading(false);
  };

  // ✅ 단건 승인 및 DB 반영 로직
  const handleApprove = async (item: StagingItem) => {
    const isOk = await confirm(`[${item.item_name}] 품목을 마스터에 반영하시겠습니까?`, "info");
    if (!isOk) return;

    setIsProcessing(item.id);
    try {
      // 1. 본 DB(item_master)에 넣을 페이로드 구성 (Staging용 메타데이터 제외)
      const payload = {
        item_key: item.item_key,
        item_name: item.item_name,
        uom: item.uom,
        item_type: item.item_type,
        lot_required: item.lot_required,
        active_flag: item.active_flag,
        use_team: item.use_team,
        shelf_life_days: item.shelf_life_days,
        unit_cost: item.unit_cost,
        barcode: item.barcode,
        erp_item_code: item.erp_item_code,
        erp_flag: item.erp_flag,
        remark: item.remark
      };

      // 2. 본 DB에 Upsert (있으면 수정, 없으면 신규)
      const { error: upsertError } = await supabase.from("item_master").upsert(payload, { onConflict: "item_key" });
      if (upsertError) throw upsertError;

      // 3. Staging DB 상태 업데이트
      const { error: stageError } = await supabase
        .from("item_master_staging")
        .update({ status: "APPROVED" })
        .eq("id", item.id);
      if (stageError) throw stageError;

      toast.success("마스터 DB에 성공적으로 반영되었습니다.");
      setPendingItems(prev => prev.filter(p => p.id !== item.id));
      onSuccess(); // 리스트 갱신
    } catch (error: any) {
      uiAlert("승인 처리 중 오류가 발생했습니다: " + error.message, "error");
    } finally {
      setIsProcessing(null);
    }
  };

  // ❌ 단건 반려 (삭제) 로직
  const handleReject = async (id: string) => {
    const isOk = await confirm("이 요청을 반려하고 대기열에서 삭제하시겠습니까?", "warning");
    if (!isOk) return;

    setIsProcessing(id);
    try {
      // 반려 시에는 상태만 변경하거나 즉시 삭제. (여기서는 즉시 삭제 처리로 깔끔하게 관리)
      const { error } = await supabase.from("item_master_staging").delete().eq("id", id);
      if (error) throw error;

      toast.success("요청이 반려(삭제)되었습니다.");
      setPendingItems(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      uiAlert("반려 처리 중 오류가 발생했습니다.", "error");
    } finally {
      setIsProcessing(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[80vh] flex flex-col shadow-2xl">
        {/* 모달 헤더 */}
        <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-800/50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <AlertCircle className="text-yellow-500" size={20} />
            <h2 className="text-lg font-bold text-white">마스터 데이터 승인 대기열</h2>
            <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-2">
              {pendingItems.length}건
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        {/* 모달 바디 (목록) */}
        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-500">
              <Loader2 className="animate-spin" size={24} />
              <p>대기열을 불러오는 중...</p>
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>현재 승인 대기 중인 요청이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingItems.map((item) => (
                <div key={item.id} className="bg-gray-800 border border-gray-700 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {item.request_type === 'NEW' ? (
                        <span className="text-[10px] bg-emerald-900/40 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800 font-bold">🆕 신규</span>
                      ) : (
                        <span className="text-[10px] bg-purple-900/40 text-purple-400 px-1.5 py-0.5 rounded border border-purple-800 font-bold">🔄 수정</span>
                      )}
                      <span className="font-bold text-white text-sm">{item.item_name}</span>
                    </div>
                    <div className="text-xs text-gray-400 flex flex-wrap gap-2 font-mono mt-1">
                      <span>코드: <span className="text-gray-300">{item.item_key}</span></span> | 
                      <span>팀: <span className="text-gray-300">{item.use_team}</span></span> | 
                      <span>유형: <span className="text-gray-300">{item.item_type}</span></span> | 
                      <span>상태: <span className={item.active_flag === 'Y' ? 'text-green-400' : 'text-red-400'}>{item.active_flag}</span></span>
                    </div>
                    {item.remark && (
                      <div className="text-xs text-gray-500 mt-1">비고: {item.remark}</div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button 
                      onClick={() => handleReject(item.id)}
                      disabled={isProcessing === item.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-900 hover:bg-red-900/40 text-gray-400 hover:text-red-400 border border-gray-700 hover:border-red-800 rounded-md transition text-xs font-bold disabled:opacity-50"
                    >
                      <Trash2 size={14} /> 반려
                    </button>
                    <button 
                      onClick={() => handleApprove(item)}
                      disabled={isProcessing === item.id}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md transition text-xs font-bold disabled:opacity-50 shadow-md"
                    >
                      {isProcessing === item.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} 
                      승인 반영
                    </button>
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