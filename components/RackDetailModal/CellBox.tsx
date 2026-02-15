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

  // 스타일링 로직
  let cellClass = "bg-gray-900/50 border-gray-800 hover:border-green-500 hover:bg-green-900/20 group"; 
  let textClass = "text-gray-500";
  
  if (!isEmpty) {
    if (isMixed) {
      cellClass = "bg-orange-950/30 border-orange-500/50 text-orange-200 hover:bg-gray-900 hover:border-orange-400 group";
      textClass = "text-orange-200";
    } else {
      cellClass = "bg-purple-900/30 border-purple-500 text-purple-200 hover:bg-gray-900 hover:border-blue-400 group";
      textClass = "text-purple-200";
    }
  } else if (data && totalQty === 0) {
    cellClass = "bg-gray-800 border-gray-700 text-gray-500 hover:border-green-500 group";
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
        <div className="text-[8px] md:text-[10px] font-mono opacity-60 truncate max-w-[70%]">{data.loc_id}</div>
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
              <div className="text-[8px] md:text-[9px] truncate w-full text-center opacity-80 mt-0.5 px-0.5">
                {primaryItemName}
              </div>
            )}
          </>
        ) : (
          <div className="text-gray-600 text-[10px] flex flex-col items-center opacity-50 group-hover:opacity-100 group-hover:text-green-400 transition-all">
             <span className="font-bold text-sm md:text-lg">+</span>
             <span>Empty</span>
          </div>
        )}
      </div>
    </div>
  );
};