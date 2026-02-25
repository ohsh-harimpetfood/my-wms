// components/RackDetailModal/CellBox.tsx
"use client";

import { Layers, Package, AlertTriangle } from "lucide-react";
import { LocationData } from "./types";

interface CellBoxProps {
  data?: LocationData;
  col: string;
  lvl: number;
  side: string;
  hoveredCell: string | null;
  setHoveredCell: (id: string | null) => void;
  onInventoryClick: (locId: string) => void;
  onEmptyClick: (col: string, lvl: number, side: string) => void;
}

export const CellBox = ({ data, col, lvl, side, hoveredCell, setHoveredCell, onInventoryClick, onEmptyClick }: CellBoxProps) => {
  const inventory = data?.inventory || [];
  const itemCount = inventory.length;
  const totalQty = inventory.reduce((sum, item) => sum + item.quantity, 0);
  
  const isEmpty = itemCount === 0 || totalQty === 0;
  const isMixed = itemCount > 1; 
  
  const primaryItemName = inventory[0]?.item_master?.item_name;
  
  // 🚀 [핵심 추가] 첫 번째 재고의 아이템 타입을 검사하여 원자재 여부 판단
  const primaryItemType = inventory[0]?.item_master?.item_type;
  const isRawMaterial = primaryItemType === '원자재' || primaryItemType === '원료';
  
  const isHovered = data && hoveredCell === data.loc_id;

  // 기본 스타일 (빈 셀 - 톤업 반영됨)
  let cellClass = "bg-slate-800/40 border-slate-700/50 hover:border-blue-500/70 hover:bg-blue-900/20 group"; 
  let textClass = "text-slate-400";
  
  if (!isEmpty) {
    if (isRawMaterial) {
        // 🟩 원자재 (Raw Material) 일 경우
        if (isMixed) {
            // 혼적: 진한 초록색 (Emerald)
            cellClass = "bg-emerald-900/40 border-emerald-500/60 text-emerald-200 hover:bg-slate-800 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] group";
            textClass = "text-emerald-200";
        } else {
            // 단일: 연두색 (Lime)
            cellClass = "bg-lime-900/40 border-lime-500/70 text-lime-200 hover:bg-slate-800 hover:border-lime-400 hover:shadow-[0_0_15px_rgba(132,204,22,0.2)] group";
            textClass = "text-lime-200";
        }
    } else {
        // 🟪 부자재 및 기타 (Sub Material) 일 경우
        if (isMixed) {
            // 혼적: 주황색 (Orange)
            cellClass = "bg-orange-950/40 border-orange-500/60 text-orange-200 hover:bg-slate-800 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] group";
            textClass = "text-orange-200";
        } else {
            // 단일: 보라색 (Purple)
            cellClass = "bg-purple-900/40 border-purple-500/70 text-purple-200 hover:bg-slate-800 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] group";
            textClass = "text-purple-200";
        }
    }
  } else if (data && totalQty === 0) {
    // 셀 정보는 있으나 재고가 0인 경우 (빈 셀)
    cellClass = "bg-slate-800 border-slate-700/80 text-slate-400 hover:border-blue-500/70 hover:bg-slate-700 group";
  }
  
  if (!data) return <div className="w-20 h-16 md:w-28 md:h-24 border border-transparent"></div>;

  return (
    <div 
      onMouseEnter={() => { if(data) setHoveredCell(data.loc_id); }}
      onMouseLeave={() => { setHoveredCell(null); }}
      onClick={(e) => { 
        e.stopPropagation(); 
        if (totalQty > 0) onInventoryClick(data.loc_id);
        else onEmptyClick(col, lvl, side);
      }}
      className={`w-20 h-16 md:w-28 md:h-24 border rounded-lg p-1.5 md:p-2 flex flex-col justify-between transition-all cursor-pointer relative ${isHovered ? 'z-[100]' : 'z-0'} ${cellClass}`}
    >
      <div className="flex justify-between items-start w-full">
        <div className="text-[8px] md:text-[10px] font-mono opacity-70 truncate max-w-[70%]">{data.loc_id}</div>
        {!isEmpty && (
          // 🚀 [추가] 아이콘 색상도 원자재/부자재에 따라 다르게 표시
          isMixed ? <Layers size={10} className={isRawMaterial ? "text-emerald-500 animate-pulse" : "text-orange-500 animate-pulse"} /> 
                  : <Package size={10} className={isRawMaterial ? "text-lime-400" : "text-purple-400"} />
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {totalQty > 0 ? (
          <>
            <div className={`font-bold text-sm md:text-lg leading-none ${textClass}`}>
              {totalQty.toLocaleString()}
            </div>
            {isMixed ? (
              // 🚀 [추가] 혼적 텍스트 색상 분기
              <div className={`flex items-center gap-0.5 mt-0.5 font-bold text-[8px] md:text-[10px] ${isRawMaterial ? 'text-emerald-400' : 'text-orange-400'}`}>
                <AlertTriangle size={8} /> <span>{itemCount}종</span>
              </div>
            ) : (
              // 🚀 [수정] 디버깅 출력 제거하고 원래대로 복구
              <div className="text-[8px] md:text-[9px] truncate w-full text-center opacity-90 mt-0.5 px-0.5">
                {primaryItemName}
              </div>
            )}
          </>
        ) : (
          <div className="text-slate-500 text-[10px] flex flex-col items-center opacity-60 group-hover:opacity-100 group-hover:text-blue-400 transition-all">
             <span className="font-bold text-sm md:text-lg">+</span>
             <span>Empty</span>
          </div>
        )}
      </div>
    </div>
  );
};