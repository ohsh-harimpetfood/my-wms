"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Power, PowerOff, Loader2 } from "lucide-react";
import { useUI } from "@/context/UIProvider";

interface Props {
  itemKey: string;
  itemName: string;
  currentFlag: string;
}

export default function ItemStatusToggleButton({ itemKey, itemName, currentFlag }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const { toast, confirm, alert: uiAlert } = useUI();

  const isActive = currentFlag === 'Y';

  const handleToggle = async () => {
    const actionText = isActive ? "비활성화(사용 중지)" : "다시 활성화(사용)";
    
    // 실수로 누르는 것을 방지하기 위한 확인 모달
    const isOk = await confirm(`[${itemName}] 품목을 ${actionText} 하시겠습니까?`, "warning");
    if (!isOk) return;

    setIsLoading(true);
    try {
      const newFlag = isActive ? 'N' : 'Y';
      
      // DB 업데이트
      const { error } = await supabase
        .from('item_master')
        .update({ active_flag: newFlag })
        .eq('item_key', itemKey);

      if (error) throw error;

      toast.success(`성공적으로 ${actionText} 되었습니다.`);
      
      // 🚀 데이터 갱신을 위해 현재 페이지 새로고침 (서버 컴포넌트 리렌더링 트리거)
      router.refresh(); 
    } catch (error: any) {
      uiAlert("상태 변경 중 오류가 발생했습니다: " + error.message, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`p-2 rounded-md transition-colors border ${
        isActive
          ? "bg-gray-800 border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-900 hover:bg-red-900/20"
          : "bg-red-900/20 border-red-800/50 text-red-400 hover:text-green-400 hover:border-green-800 hover:bg-green-900/20"
      }`}
      title={isActive ? "사용 중지 처리" : "다시 사용 처리"}
    >
      {isLoading ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isActive ? (
        <PowerOff size={16} /> 
      ) : (
        <Power size={16} />
      )}
    </button>
  );
}