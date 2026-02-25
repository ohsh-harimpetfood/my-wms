"use client";

import React, { useState, useMemo, useRef } from "react";
import { Layers, LayoutGrid, Cuboid, Box } from "lucide-react";
import { LocationData } from "./types";
import { CellBox } from "./CellBox";

interface Props {
  rackName: string;
  locations: LocationData[];
  onInventoryClick: (locId: string) => void;
  onEmptyClick: (rackNo: string, lvl: number, side: string) => void;
}

export const ShuttleRackViewPC = ({ rackName, locations, onInventoryClick, onEmptyClick }: Props) => {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // ----------------------------------------------------------------------------------
  // ⚡ [Logic] 데이터 가공 (locations -> Matrix Map)
  // ----------------------------------------------------------------------------------
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

    return {
      sortedCols: Array.from(cols).sort(),
      sortedDepths: Array.from(sides).sort((a, b) => a - b),
      dataMap: map
    };
  }, [locations]);

  const levels = [4, 3, 2, 1];

  // ----------------------------------------------------------------------------------
  // 📐 [Layout] 동적 크기 계산
  // ----------------------------------------------------------------------------------
  const CELL_WIDTH = 80;
  const CELL_HEIGHT = 60; 
  const GRID_WIDTH = sortedCols.length * (CELL_WIDTH + 10) + 100;
  const GRID_HEIGHT = sortedDepths.length * (CELL_HEIGHT + 6) + 100;

  // 스크롤/드래그 핸들러
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e: React.MouseEvent) => {
    if (viewMode === '2d' || !scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const onMouseLeave = () => setIsDragging(false);
  const onMouseUp = () => setIsDragging(false);
  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  return (
    // 🚀 [톤업] bg-[#050505] -> bg-slate-950, border-gray-800 -> border-slate-800
    <div className="w-full h-full min-h-[900px] bg-slate-950 rounded-xl border border-slate-800 flex flex-col relative overflow-hidden select-none shadow-inner">
      
      {/* 🎮 상단 헤더 */}
      <div className="w-full flex justify-center pt-6 pb-2 z-50 bg-slate-950 shrink-0">
        {/* 🚀 [톤업] bg-gray-900/90 -> bg-slate-800/80 */}
        <div className="flex gap-2 bg-slate-800/80 p-1 rounded-full border border-slate-700 shadow-xl backdrop-blur-md">
          <button
            onClick={() => setViewMode("2d")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${viewMode === '2d' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            <LayoutGrid size={14} /> 2D 정면
          </button>
          <button
            onClick={() => setViewMode("3d")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${viewMode === '3d' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'text-slate-400 hover:text-white'}`}
          >
            <Cuboid size={14} /> 2.5D 입체
          </button>
        </div>
      </div>

      {/* 🎛️ 층 선택기 */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3 pointer-events-none">
        {/* 🚀 [톤업] bg-gray-900/80 -> bg-slate-800/80 */}
        <div className="bg-slate-800/80 p-2 rounded-2xl border border-slate-700 backdrop-blur-md shadow-2xl flex flex-col gap-2 pointer-events-auto transition-transform duration-300 hover:scale-105">
            <button onClick={() => setSelectedLevel(null)} className={`w-12 h-12 rounded-xl font-bold transition-all duration-300 flex flex-col items-center justify-center text-[10px] ${selectedLevel === null ? 'bg-white text-slate-900 border-2 border-white scale-105 shadow-lg' : 'bg-slate-900 text-slate-500 border border-slate-700 hover:bg-slate-700 hover:text-white'}`}>
                <Layers size={18} /> ALL
            </button>
            <div className="h-px w-full bg-slate-700 my-1"></div>
            {levels.map(lvl => (
                <button key={lvl} onClick={() => setSelectedLevel(lvl === selectedLevel ? null : lvl)} className={`w-10 h-10 rounded-lg font-bold transition-all duration-300 border flex items-center justify-center text-sm ${selectedLevel === lvl ? 'bg-blue-600 text-white border-blue-400 shadow-lg scale-110' : 'bg-slate-900 text-slate-500 border-slate-700 hover:text-white hover:border-slate-500'}`}>
                    {lvl}F
                </button>
            ))}
        </div>
      </div>

      {/* 📦 메인 뷰어 영역 */}
      <div
        ref={scrollRef}
        className={`flex-1 w-full flex items-center justify-center perspective-container pb-10 pl-12
            ${viewMode === '2d'
                ? 'overflow-auto cursor-grab active:cursor-grabbing p-12 block' 
                : 'overflow-hidden flex'
            }
        `}
        onMouseDown={onMouseDown} onMouseLeave={onMouseLeave} onMouseUp={onMouseUp} onMouseMove={onMouseMove}
      >
        
        <div
          className={`
            relative transition-all duration-700 ease-in-out transform-style-3d
            ${viewMode === '3d'
                ? 'rotate-iso scale-[0.7] translate-x-[-10px]'
                : 'rotate-0 scale-[0.95] translate-x-0'
            }
          `}
          style={{ width: `${GRID_WIDTH}px`, height: `${GRID_HEIGHT}px` }}
        >

          {levels.map((level) => {
            const isSelected = selectedLevel === level;
            const isAll = selectedLevel === null;
            
            const zPos = viewMode === '3d' ? (level - 1) * 80 : 0;
            const opacity = (!isAll && !isSelected) ? (viewMode === '3d' ? 0.05 : 0) : 1;
            
            const isGhost = !isAll && !isSelected;

            return (
              <div
                key={level}
                className={`
                    absolute inset-0 border rounded-2xl transition-all duration-700 ease-in-out transform-style-3d
                    ${viewMode === '3d'
                        // 🚀 [톤업] 3D 겹침 효과 시 반투명 레이어 톤업 (bg-gray-900/30 -> bg-slate-800/40)
                        ? 'bg-slate-800/40 border-slate-600/30 shadow-2xl backdrop-blur-[0.5px]'
                        : 'bg-transparent border-transparent'
                    }
                    pointer-events-none
                `}
                style={{
                    transform: `translateZ(${zPos}px)`,
                    opacity: opacity,
                    zIndex: level,
                    display: viewMode === '2d' && !isSelected && !isAll && level !== 4 ? 'none' : 'block'
                }}
              >
                {/* 층 라벨 */}
                <div className={`
                    absolute -right-20 top-0 text-6xl font-black transition-all duration-300
                    ${isSelected
                        ? 'text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] scale-110'
                        : 'text-white/10'
                    }
                    ${viewMode === '3d' && (isAll || isSelected) ? 'opacity-100' : 'opacity-0'}
                `}>
                    {level}F
                </div>

                {/* 그리드 컨텐츠 */}
                <div
                  className="grid gap-x-3 gap-y-1.5 p-6 h-full"
                  style={{
                      gridTemplateColumns: `repeat(${sortedCols.length}, 1fr)`,
                      gridTemplateRows: `repeat(${sortedDepths.length}, 1fr)`
                  }}
                >
                    {sortedDepths.slice().reverse().map((depth) => (
                        sortedCols.map((rack) => {
                            const key = `${rack}-${depth}-${level}`;
                            const locData = dataMap.get(key);
                            const hasStock = locData?.inventory && locData.inventory.length > 0;
                            const pointerEvents = isGhost ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer';

                            return (
                                <div
                                    key={key}
                                    className={`
                                        relative w-full h-full rounded-[2px] transition-all duration-300 flex items-center justify-center group
                                        ${pointerEvents}
                                        ${hasStock
                                            ? 'bg-purple-600 border border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]'
                                            : viewMode === '3d'
                                                ? 'bg-white/5 border border-white/5 hover:bg-white/20'
                                                // 🚀 [톤업] 2D 빈 셀 톤업 (bg-gray-800/40 -> bg-slate-800/60)
                                                : 'bg-slate-800/60 border border-slate-700/50 hover:bg-slate-700'
                                        }
                                    `}
                                >
                                    {hasStock && (
                                        <div className={`absolute inset-0 flex items-center justify-center pointer-events-none`}>
                                            <Box className={`text-white w-3 h-3 ${viewMode === '3d' ? 'opacity-90' : 'opacity-100'}`} />
                                        </div>
                                    )}
                                   
                                    <div className="absolute inset-0 opacity-0 hover:opacity-100 z-10 w-full h-full flex items-center justify-center">
                                        <div className="w-full h-full">
                                            {/* CellBox 자체가 이미 톤업된 버전(bg-slate)을 사용하므로 그대로 두면 됩니다 */}
                                            <CellBox
                                                data={locData}
                                                col={rack}
                                                lvl={level}
                                                side={depth.toString()}
                                                hoveredCell={hoveredCell}
                                                setHoveredCell={setHoveredCell}
                                                onInventoryClick={onInventoryClick}
                                                onEmptyClick={onEmptyClick}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })
                    ))}
                </div>
              </div>
            );
          })}
            
          {/* [2D 전용] 라벨 영역 */}
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${viewMode === '2d' ? 'opacity-100' : 'opacity-0'}`}>
              <div className="absolute top-6 bottom-6 left-[-30px] w-8">
                  <div className="grid h-full" style={{ gridTemplateRows: `repeat(${sortedDepths.length}, 1fr)` }}>
                      {sortedDepths.slice().reverse().map(d => (
                          // 🚀 [톤업] text-gray-500 -> text-slate-500
                          <div key={d} className="flex items-center justify-end pr-2 text-slate-500 text-[10px] font-mono">
                              {d}
                          </div>
                      ))}
                  </div>
              </div>

              <div className="absolute bottom-[-20px] left-6 right-6 flex justify-between text-yellow-500 font-bold text-xs px-2">
                  {sortedCols.map(r => <span key={r} className="flex-1 text-center">{r}</span>)}
              </div>

              <div className="absolute left-[-40px] top-6 bottom-6 w-px bg-gradient-to-t from-blue-900 via-blue-500 to-blue-900 opacity-30"></div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .perspective-container { perspective: 1200px; }
        .transform-style-3d { transform-style: preserve-3d; }
        .rotate-iso { transform: rotateX(50deg) rotateZ(10deg); }
        .rotate-0 { transform: rotateX(0deg) rotateZ(0deg); }
        .translate-z-10 { transform: translateZ(20px); }
        
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        /* 🚀 [톤업] 스크롤바 트랙 배경 변경 */
        ::-webkit-scrollbar-track { background: #020617; } /* slate-950 */
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; } /* slate-700 */
        ::-webkit-scrollbar-thumb:hover { background: #475569; } /* slate-600 */
      `}</style>
    </div>
  );
};