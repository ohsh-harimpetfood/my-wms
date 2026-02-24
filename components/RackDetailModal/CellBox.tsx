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
  const isHovered = data && hoveredCell === data.loc_id;

  // 🚀 [톤업] 스타일링 로직 (gray -> slate 계열로 부드럽게 변경)
  let cellClass = "bg-slate-800/40 border-slate-700/50 hover:border-emerald-500/70 hover:bg-emerald-900/20 group"; 
  let textClass = "text-slate-400";
  
  if (!isEmpty) {
    if (isMixed) {
      // 혼합 적치: 주황색 톤 (호버 시 은은한 그림자 추가)
      cellClass = "bg-orange-950/40 border-orange-500/60 text-orange-200 hover:bg-slate-800 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] group";
      textClass = "text-orange-200";
    } else {
      // 단일 적치: 보라색 톤 (호버 시 은은한 그림자 추가)
      cellClass = "bg-purple-900/40 border-purple-500/70 text-purple-200 hover:bg-slate-800 hover:border-blue-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] group";
      textClass = "text-purple-200";
    }
  } else if (data && totalQty === 0) {
    // 빈 셀 (데이터는 있음)
    cellClass = "bg-slate-800 border-slate-700/80 text-slate-400 hover:border-emerald-500/70 hover:bg-slate-700 group";
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
          isMixed ? <Layers size={10} className="text-orange-500 animate-pulse" /> : <Package size={10} className="text-purple-400" />
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {totalQty > 0 ? (
          <>
            <div className={`font-bold text-sm md:text-lg leading-none ${textClass}`}>
              {totalQty.toLocaleString()}
            </div>
            {isMixed ? (
              <div className="flex items-center gap-0.5 mt-0.5 text-orange-400 font-bold text-[8px] md:text-[10px]">
                <AlertTriangle size={8} /> <span>{itemCount}종</span>
              </div>
            ) : (
              <div className="text-[8px] md:text-[9px] truncate w-full text-center opacity-90 mt-0.5 px-0.5">
                {primaryItemName}
              </div>
            )}
          </>
        ) : (
          // 🚀 [톤업] 빈 셀 텍스트 (text-gray-600 -> text-slate-500)
          <div className="text-slate-500 text-[10px] flex flex-col items-center opacity-60 group-hover:opacity-100 group-hover:text-emerald-400 transition-all">
             <span className="font-bold text-sm md:text-lg">+</span>
             <span>Empty</span>
          </div>
        )}
      </div>
    </div>
  );
};