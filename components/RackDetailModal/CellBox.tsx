// components/RackDetailModal/CellBox.tsx
"use client";

import { Layers, Package, AlertTriangle, ArrowRight, Plus, MapPin, X, Hash } from "lucide-react";
import { LocationData, PackingInfo } from "./types";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

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
  const router = useRouter(); 
  const [showActions, setShowActions] = useState(false); 
  
  const [tooltipDirection, setTooltipDirection] = useState<'down' | 'up'>('down');
  const cellRef = useRef<HTMLDivElement>(null);

  const inventory = data?.inventory || [];
  const itemCount = inventory.length;
  const totalQty = inventory.reduce((sum, item) => sum + item.quantity, 0);
  
  const isEmpty = itemCount === 0 || totalQty === 0;
  const isMixed = itemCount > 1; 
  
  const primaryItemName = inventory[0]?.item_master?.item_name;
  const primaryItemType = inventory[0]?.item_master?.item_type;
  const isRawMaterial = primaryItemType === '원자재' || primaryItemType === '원료';
  
  const isHovered = data && hoveredCell === data.loc_id;

  let cellClass = "bg-slate-800/40 border-slate-700/50 hover:border-blue-500/70 hover:bg-blue-900/20 group"; 
  let textClass = "text-slate-400";
  
  if (!isEmpty) {
    if (isRawMaterial) {
        if (isMixed) {
            cellClass = "bg-emerald-900/40 border-emerald-500/60 text-emerald-200 hover:bg-slate-800 hover:border-emerald-400 hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] group";
            textClass = "text-emerald-200";
        } else {
            cellClass = "bg-lime-900/40 border-lime-500/70 text-lime-200 hover:bg-slate-800 hover:border-lime-400 hover:shadow-[0_0_15px_rgba(132,204,22,0.2)] group";
            textClass = "text-lime-200";
        }
    } else {
        if (isMixed) {
            cellClass = "bg-orange-950/40 border-orange-500/60 text-orange-200 hover:bg-slate-800 hover:border-orange-400 hover:shadow-[0_0_15px_rgba(249,115,22,0.2)] group";
            textClass = "text-orange-200";
        } else {
            cellClass = "bg-purple-900/40 border-purple-500/70 text-purple-200 hover:bg-slate-800 hover:border-purple-400 hover:shadow-[0_0_15px_rgba(168,85,247,0.2)] group";
            textClass = "text-purple-200";
        }
    }
  } else if (data && totalQty === 0) {
    cellClass = "bg-slate-800 border-slate-700/80 text-slate-400 hover:border-blue-500/70 hover:bg-slate-700 group";
  }

  // 🚀 [추가] 박스/잔량 상세 정보 추출 로직
  // 현재 재고 중 첫 번째 아이템의 포장 정보만 추출 (혼적 셀일 경우 가장 대표 품목 정보만 노출)
  const packingDetails: PackingInfo[] = inventory[0]?.inventory_packing_info || [];
  const hasPackingInfo = packingDetails.length > 0;

  // 🚀 [추가] PC 툴팁용: 한 줄 요약 텍스트 생성기
  const getPackingSummary = () => {
    if (!hasPackingInfo) return null;
    
    const boxes = packingDetails.filter(p => p.pack_type === 'BOX');
    const loose = packingDetails.find(p => p.pack_type === 'LOOSE');

    let summary = [];
    if (boxes.length > 0) {
      const boxText = boxes.map(b => `${b.unit_qty}x${b.pack_count}`).join(', ');
      summary.push(`📦 ${boxText}`);
    }
    if (loose) {
      summary.push(`# 잔량 ${loose.pack_count}`);
    }
    return summary.join(' | ');
  };

  const handleCellClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    
    if (totalQty > 0) {
        let direction: 'up' | 'down' = Number(lvl) <= 2 ? 'up' : 'down';

        if (cellRef.current) {
            const rect = cellRef.current.getBoundingClientRect();
            const scrollContainer = cellRef.current.closest('.overflow-y-auto, .overflow-x-auto, .overflow-auto, .custom-scrollbar');
            const bottomBoundary = scrollContainer ? scrollContainer.getBoundingClientRect().bottom : window.innerHeight;
            
            const spaceBelow = bottomBoundary - rect.bottom;
            if (spaceBelow < 150) {
                direction = 'up';
            }
        }

        setTooltipDirection(direction);
        setShowActions(true);
    } else {
        onEmptyClick(col, lvl, side);
    }
  };

  if (!data) return <div className="w-20 h-16 md:w-28 md:h-24 border border-transparent"></div>;

  return (
    <>
      <div 
        ref={cellRef}
        onMouseEnter={() => { if(data) setHoveredCell(data.loc_id); }}
        onMouseLeave={() => { setHoveredCell(null); }}
        onClick={handleCellClick}
        className={`w-20 h-16 md:w-28 md:h-24 border rounded-lg p-1.5 md:p-2 flex flex-col justify-between transition-all cursor-pointer relative ${isHovered || showActions ? 'z-[60]' : 'z-0'} ${cellClass}`}
      >
        <div className="flex justify-between items-start w-full">
          <div className="text-[8px] md:text-[10px] font-mono opacity-70 truncate max-w-[70%]">{data.loc_id}</div>
          {!isEmpty && (
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
                <div className={`flex items-center gap-0.5 mt-0.5 font-bold text-[8px] md:text-[10px] ${isRawMaterial ? 'text-emerald-400' : 'text-orange-400'}`}>
                  <AlertTriangle size={8} /> <span>{itemCount}종</span>
                </div>
              ) : (
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

        {showActions && totalQty > 0 && (
            <>
                <div 
                    className="fixed inset-0 z-[70] cursor-default" 
                    onClick={(e) => { e.stopPropagation(); setShowActions(false); }} 
                />

                {/* 💻 PC 모드 툴팁 */}
                {/* 🚀 [수정] 툴팁 가로 너비를 조금 더 여유롭게(w-56) 키움 */}
                <div className={`hidden md:flex absolute left-1/2 -translate-x-1/2 ${
                    tooltipDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
                } w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-[80] flex-col overflow-hidden animate-fade-in`}>
                    
                    <div className="px-3 py-2 border-b border-slate-800 text-[10px] font-bold text-slate-400 bg-slate-800/30 text-center uppercase tracking-wider">
                        {data.loc_id} Action
                    </div>
                    
                    {/* 🚀 [수정] PC 툴팁 글자 크기 키우기 (text-[10px] -> text-xs font-bold) */}
                    {hasPackingInfo && (
                        <div className="px-3 py-2.5 bg-slate-950/80 border-b border-slate-800 text-xs font-bold text-blue-300 font-mono text-center flex items-center justify-center gap-1 leading-tight">
                            {getPackingSummary()}
                        </div>
                    )}

                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowActions(false); onInventoryClick(data.loc_id); }}
                        className="w-full text-left px-3 py-3 text-xs font-bold text-white hover:bg-blue-600 transition flex items-center gap-2"
                    >
                        <ArrowRight size={14} className="text-blue-400" /> 상세 정보 및 출고
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); router.push(`/inbound/direct?loc=${data.loc_id}`); }}
                        className="w-full text-left px-3 py-3 text-xs font-bold text-white hover:bg-emerald-600 transition flex items-center gap-2 border-t border-slate-800"
                    >
                        <Plus size={14} className="text-emerald-400" /> 추가 입고 (혼적)
                    </button>
                </div>

                {/* 📱 모바일 바텀 시트 */}
                <div 
                    className="md:hidden fixed inset-x-0 bottom-0 bg-slate-900 border-t border-slate-700 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.8)] z-[100] animate-fade-in-up px-5 pt-5 pb-24 flex flex-col gap-4"
                    onClick={(e) => e.stopPropagation()} 
                >
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <div>
                            <div className="font-bold text-xl text-white flex items-center gap-2">
                                <MapPin size={20} className="text-blue-500" /> {data.loc_id}
                            </div>
                            <div className="text-xs text-slate-400 mt-1 pl-7">총 전산 수량: <span className="text-white font-bold">{totalQty.toLocaleString()}</span></div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setShowActions(false); }} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition">
                            <X size={20} />
                        </button>
                    </div>

                    {/* 🚀 [추가] 모바일 바텀시트용 박스 상세 리스트 */}
                    {hasPackingInfo && (
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2 mb-2 shadow-inner">
                            <div className="text-xs font-bold text-slate-400 mb-1 border-b border-slate-800 pb-1 flex items-center gap-1">
                                <Layers size={14} className="text-amber-500" /> 상세 적재 현황
                            </div>
                            {packingDetails.map((pack, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    {pack.pack_type === 'BOX' ? (
                                        <span className="text-blue-200 flex items-center gap-1">
                                            <Package size={14} /> {pack.unit_qty}입 x {pack.pack_count}박스
                                        </span>
                                    ) : (
                                        <span className="text-emerald-200 flex items-center gap-1">
                                            <Hash size={14} /> 낱개 잔량
                                        </span>
                                    )}
                                    <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded text-xs border border-slate-700">
                                        {pack.total_qty.toLocaleString()}개
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}

                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowActions(false); onInventoryClick(data.loc_id); }}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-lg transition active:scale-95"
                    >
                        <ArrowRight size={20} /> 상세 정보 및 출고
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); router.push(`/inbound/direct?loc=${data.loc_id}`); }}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 text-lg transition active:scale-95"
                    >
                        <Plus size={20} /> 이 위치에 추가 입고
                    </button>
                </div>
            </>
        )}
      </div>
    </>
  );
};