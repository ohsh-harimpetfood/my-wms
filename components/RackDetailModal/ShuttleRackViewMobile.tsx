"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Layers, LayoutGrid, Cuboid, Box } from "lucide-react";
import { LocationData } from "./types";
import { CellBox } from "./CellBox";

interface Props {
  rackName: string;
  locations: LocationData[];
  onInventoryClick: (locId: string) => void;
  onEmptyClick: (rackNo: string, lvl: number, side: string) => void;
}

export const ShuttleRackViewMobile = ({ rackName, locations, onInventoryClick, onEmptyClick }: Props) => {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  // 1. Data Processing
  const { sortedCols, sortedDepths, dataMap } = useMemo(() => {
    const cols = new Set<string>();
    const sides = new Set<number>();
    const map = new Map<string, LocationData>();
    locations.forEach(loc => {
      cols.add(loc.rack_no);
      const sideNum = parseInt(loc.side.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(sideNum)) sides.add(sideNum);
      const key = `${loc.rack_no}-${loc.side}-${loc.level_no}`;
      map.set(key, loc);
    });
    return { sortedCols: Array.from(cols).sort(), sortedDepths: Array.from(sides).sort((a, b) => a - b), dataMap: map };
  }, [locations]);

  const levels = [4, 3, 2, 1];

  // 2. Mobile Cell Size
  const CELL_WIDTH = 110; 
  const CELL_HEIGHT = 40; 
  const LABEL_SIZE = 24; 

  // Grid Dimensions
  const GRID_WIDTH = LABEL_SIZE + (sortedCols.length * (CELL_WIDTH + 6)) + 20;
  const GRID_HEIGHT = (sortedDepths.length * (CELL_HEIGHT + 4)) + 100;

  // 3. Zoom Calculation for 3D
  const [zoom, setZoom] = useState(0.5);
  useEffect(() => {
    if (viewMode === '3d') {
        const scale = (window.innerWidth - 20) / GRID_WIDTH;
        setZoom(scale > 1 ? 1 : scale);
    }
  }, [viewMode, GRID_WIDTH]);

  const handleBackgroundClick = () => {
    if (activeCell) setActiveCell(null);
  };

  return (
    <div 
        className="w-full h-full min-h-[600px] bg-[#050505] flex flex-col relative overflow-hidden"
        onClick={handleBackgroundClick}
    >
      
      {/* Header */}
      <div className="w-full flex justify-center pt-4 pb-2 z-50 bg-[#050505] shrink-0" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2 bg-gray-900/90 p-1.5 rounded-full border border-gray-700 shadow-xl">
          <button onClick={() => setViewMode("2d")} className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === '2d' ? 'bg-purple-700 text-white' : 'text-gray-400'}`}>
            <LayoutGrid size={14} /> 2D
          </button>
          <button onClick={() => setViewMode("3d")} className={`flex items-center gap-1 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${viewMode === '3d' ? 'bg-purple-600 text-white' : 'text-gray-400'}`}>
            <Cuboid size={14} /> 3D
          </button>
        </div>
      </div>

      {/* Floor Selector */}
      <div className="absolute right-2 top-16 z-40 flex flex-col gap-2 pointer-events-none">
        <div className="bg-gray-900/90 p-1.5 rounded-xl border border-gray-700 shadow-xl flex flex-col gap-1.5 pointer-events-auto" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedLevel(null)} className={`w-9 h-9 rounded-lg font-bold flex flex-col items-center justify-center text-[9px] ${selectedLevel === null ? 'bg-white text-black' : 'bg-gray-800 text-gray-400'}`}>
                <Layers size={14} /> ALL
            </button>
            <div className="h-px w-full bg-gray-700 my-0.5"></div>
            {levels.map(lvl => (
                <button key={lvl} onClick={() => setSelectedLevel(lvl === selectedLevel ? null : lvl)} className={`w-9 h-9 rounded-lg font-bold flex items-center justify-center text-xs ${selectedLevel === lvl ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                    {lvl}F
                </button>
            ))}
        </div>
      </div>

      {/* Main Viewer Area */}
      <div 
        className={`flex-1 w-full flex 
          ${viewMode === '2d' 
            ? 'overflow-auto items-start pt-10 pl-2 touch-pan-x touch-pan-y' 
            : 'overflow-hidden items-center justify-center perspective-container'
          }
        `}
      >
        <div
          className="relative ease-out transform-style-3d"
          style={{
            width: `${GRID_WIDTH}px`,
            height: `${GRID_HEIGHT}px`,
            minWidth: viewMode === '2d' ? `${GRID_WIDTH}px` : 'auto',
            transformOrigin: 'center center',
            transition: 'transform 0.3s',
            transform: viewMode === '3d'
                ? `rotateX(50deg) rotateZ(10deg) scale(${zoom})`
                : `none`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {levels.map((level) => {
            const isSelected = selectedLevel === level;
            const isAll = selectedLevel === null;
            // [수정] 인터랙션이 가능한 레이어인지 판단 (ALL 모드이거나 현재 선택된 층일 때만 True)
            const isInteractive = isAll || isSelected;

            const zPos = viewMode === '3d' ? (level - 1) * 50 : 0; 
            const opacity = (!isAll && !isSelected) ? (viewMode === '3d' ? 0.05 : 0) : 1;

            // [수정] 2D 모드에서는 선택되지 않은 층은 아예 렌더링하지 않음 (투명 벽 제거)
            if (viewMode === '2d' && !isSelected && !isAll) return null;

            return (
              <div key={level}
                className={`absolute inset-0 border rounded-xl transform-style-3d ${viewMode === '3d' ? 'bg-gray-900/40 border-gray-600/30' : 'bg-transparent border-transparent'} pointer-events-none`}
                style={{ transform: `translateZ(${zPos}px)`, opacity, zIndex: level, transition: 'transform 0.3s, opacity 0.3s' }}
              >
                {/* Level Label */}
                <div className={`absolute -right-10 top-0 text-4xl font-black ${isSelected ? 'text-white' : 'text-white/10'} ${viewMode === '3d' && (isAll || isSelected) ? 'opacity-100' : 'opacity-0'}`}>{level}F</div>

                {/* Grid Layout */}
                <div 
                    className="grid gap-x-1.5 gap-y-1 p-4 h-full" 
                    style={{ 
                        gridTemplateColumns: `${LABEL_SIZE}px repeat(${sortedCols.length}, 1fr)`,
                        gridTemplateRows: `repeat(${sortedDepths.length}, 1fr) 30px`
                    }}
                >
                    {sortedDepths.slice().reverse().map((depth) => (
                        <React.Fragment key={`row-${depth}`}>
                            {/* Side Label */}
                            <div className={`flex items-center justify-center text-gray-500 text-[10px] font-mono pr-2 ${viewMode === '3d' ? 'opacity-0' : 'opacity-100'}`}>
                                {depth}
                            </div>

                            {/* Cells */}
                            {sortedCols.map((rack) => {
                                const key = `${rack}-${depth}-${level}`;
                                const locData = dataMap.get(key);
                                const hasStock = locData?.inventory && locData.inventory.length > 0;
                                const isActive = activeCell === key;
                                
                                const handleCellInteraction = (e: React.MouseEvent) => {
                                    e.stopPropagation(); 

                                    if (isActive) {
                                        if (hasStock) {
                                            // @ts-ignore
                                            const targetId = locData?.location_id || locData?.id; 
                                            if (targetId) onInventoryClick(targetId);
                                        } else {
                                            onEmptyClick(rack, level, depth.toString());
                                        }
                                    } else {
                                        setActiveCell(key);
                                    }
                                };

                                return (
                                    <div key={key} 
                                        // [수정] isInteractive가 false(유령 층)이면 pointer-events-none을 적용하여 클릭 투과
                                        className={`relative w-full h-full rounded-[2px] flex items-center justify-center 
                                            ${isInteractive ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'}
                                            ${hasStock 
                                                ? (isActive ? 'bg-purple-500 ring-2 ring-white z-50' : 'bg-purple-700 border-purple-500') 
                                                : (isActive ? 'bg-gray-700 ring-2 ring-gray-400 z-50' : 'bg-gray-800/40 border-gray-700/20')
                                            }
                                        `}
                                        onClick={handleCellInteraction}
                                    >
                                        {/* Icon */}
                                        {hasStock && !isActive && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <Box className="text-white/80 w-2.5 h-2.5" />
                                            </div>
                                        )}
                                        
                                        {/* CellBox - Render only when active */}
                                        {isActive && (
                                            <div 
                                                className="absolute inset-[-4px] z-[60] rounded-lg shadow-2xl overflow-visible" 
                                                onClick={handleCellInteraction}
                                            >
                                                <div className="w-full h-full">
                                                    <CellBox 
                                                        data={locData} 
                                                        col={rack} 
                                                        lvl={level} 
                                                        side={depth.toString()} 
                                                        hoveredCell={key} 
                                                        setHoveredCell={setActiveCell} 
                                                        onInventoryClick={onInventoryClick} 
                                                        onEmptyClick={onEmptyClick} 
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </React.Fragment>
                    ))}

                    {/* Bottom Label */}
                    <div className="text-transparent">.</div> 
                    {sortedCols.map(r => (
                        <div key={`label-${r}`} className={`flex items-start justify-center pt-2 text-yellow-500 font-bold text-xs ${viewMode === '3d' ? 'opacity-0' : 'opacity-100'}`}>
                            {r}
                        </div>
                    ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        .perspective-container { perspective: 800px; transform-style: preserve-3d; }
        .transform-style-3d { transform-style: preserve-3d; }
        .touch-pan-x { -webkit-overflow-scrolling: touch; } 
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }
      `}</style>
    </div>
  );
};