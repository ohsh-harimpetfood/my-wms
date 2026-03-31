"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useUI } from "@/context/UIProvider";
import { Loader2 } from "lucide-react";

interface Props {
  itemKey: string;
  currentTeam: string;
}

// 🚀 현장에서 주로 사용하는 팀 목록 (필요에 따라 자유롭게 추가/수정하세요!)
const TEAM_OPTIONS = ["생산1팀", "생산2팀", "품질팀", "물류팀", "공통", "-"];

export default function ItemTeamSelect({ itemKey, currentTeam }: Props) {
  const [isUpdating, setIsUpdating] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const { toast, alert: uiAlert } = useUI();

  // 현재 팀 값이 옵션 리스트에 없으면 추가해서 렌더링 (기존 DB 데이터 보존용)
  const options = TEAM_OPTIONS.includes(currentTeam || "-") 
    ? TEAM_OPTIONS 
    : [currentTeam, ...TEAM_OPTIONS];

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTeam = e.target.value;
    if (newTeam === currentTeam) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('item_master')
        .update({ use_team: newTeam })
        .eq('item_key', itemKey);

      if (error) throw error;

      toast.success(`[${itemKey}] 사용팀이 변경되었습니다.`);
      router.refresh(); // 서버 컴포넌트 리렌더링
    } catch (error: any) {
      uiAlert("팀 정보 변경 중 오류가 발생했습니다: " + error.message, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="relative inline-block">
      <select
        value={currentTeam || "-"}
        onChange={handleChange}
        disabled={isUpdating}
        className="text-xs bg-gray-800 text-gray-300 px-2 py-1 pr-6 rounded border border-gray-700 hover:border-blue-500 focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer disabled:opacity-50"
      >
        {options.map((team) => (
          <option key={team} value={team}>
            {team}
          </option>
        ))}
      </select>
      
      {/* 로딩 스피너 또는 드롭다운 화살표 */}
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
        {isUpdating ? (
          <Loader2 size={12} className="animate-spin text-blue-400" />
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        )}
      </div>
    </div>
  );
}