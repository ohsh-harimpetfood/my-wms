"use client";

import { useState } from "react";
import { Layers, Box, LayoutGrid, Cuboid } from "lucide-react";

export default function ShuttleRackViewer() {
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const rackNames = ["LA", "LB", "LC", "LD", "LE", "LF", "LG", "LH", "LI", "LJ"];
  const depths = Array.from({ length: 14 }, (_, i) => i + 1);
  const levels = [4, 3, 2, 1];

  const checkInventory = (rack: string, depth: number, level: number) => {
    const seed = rack.charCodeAt(1) + depth * 2 + level;
    return seed % 11 === 0;
  };

  return (
    <div className="w-full h-full min-h-[900px] bg-[#050505] rounded-xl border border-gray-800 flex flex-col relative overflow-hidden">
      
      {/* 🎮 상단 헤더 */}
      <div className="w-full flex justify-center pt-6 pb-2 z-50 bg-[#050505]">
        <div className="flex gap-2 bg-gray-900/90 p-1 rounded-full border border-gray-700 shadow-xl backdrop-blur-md">
          <button 
            onClick={() => setViewMode("2d")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${viewMode === '2d' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
          >
            <LayoutGrid size={14} />
            2D 정면
          </button>
          <button 
            onClick={() => setViewMode("3d")}
            className={`flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold transition-all duration-300 ${viewMode === '3d' ? 'bg-purple-600 text-white shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'text-gray-400 hover:text-white'}`}
          >
            <Cuboid size={14} />
            2.5D 입체
          </button>
        </div>
      </div>

      {/* 🎛️ 층 선택기 */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-3">
        <div className="bg-gray-900/80 p-2 rounded-2xl border border-gray-700 backdrop-blur-md shadow-2xl flex flex-col gap-2">
            <button 
                onClick={() => setSelectedLevel(null)}
                className={`w-12 h-12 rounded-xl font-bold transition-all duration-300 flex flex-col items-center justify-center text-[10px]
                    ${selectedLevel === null 
                        ? 'bg-white text-black border-2 border-white scale-105 shadow-lg' 
                        : 'bg-gray-800 text-gray-500 border border-gray-700 hover:bg-gray-700 hover:text-white'}
                `}
            >
                <Layers size={18} />
                ALL
            </button>
            <div className="h-px w-full bg-gray-700 my-1"></div>
            {levels.map(lvl => (
                <button 
                    key={lvl}
                    onClick={() => setSelectedLevel(lvl === selectedLevel ? null : lvl)}
                    className={`w-10 h-10 rounded-lg font-bold transition-all duration-300 border flex items-center justify-center text-sm
                        ${selectedLevel === lvl 
                            ? 'bg-blue-600 text-white border-blue-400 shadow-lg scale-110' 
                            : 'bg-gray-800 text-gray-500 border-gray-700 hover:text-white hover:border-gray-500'}
                `}
                >
                    {lvl}F
                </button>
            ))}
        </div>
      </div>

      {/* 📦 메인 뷰어 영역 */}
      <div className="flex-1 w-full flex items-center justify-center perspective-container pb-10 pl-12">
        
        <div 
          className={`
            relative transition-all duration-700 ease-in-out transform-style-3d
            ${viewMode === '3d' 
                ? 'rotate-iso scale-[0.7] translate-x-[-10px]' 
                : 'rotate-0 scale-[0.95] translate-x-0'
            }
          `}
          style={{ width: '900px', height: '800px' }} 
        >

          {levels.map((level) => {
            const isSelected = selectedLevel === level;
            const isAll = selectedLevel === null;
            
            const zPos = viewMode === '3d' ? (level - 1) * 80 : 0;
            const opacity = (!isAll && !isSelected) ? (viewMode === '3d' ? 0.05 : 0) : 1;
            
            // [수정 1] Ghost 상태(선택되지 않은 층)일 때만 마우스 차단. 
            // 활성화된 층이라도 '컨테이너 자체'는 none이어야 함 (아래 div에서 처리)
            const isGhost = !isAll && !isSelected;

            return (
              <div 
                key={level}
                className={`
                    absolute inset-0 border rounded-2xl transition-all duration-700 ease-in-out transform-style-3d
                    ${viewMode === '3d' 
                        ? 'bg-gray-900/30 border-gray-600/30 shadow-2xl backdrop-blur-[0.5px]' 
                        : 'bg-transparent border-transparent'
                    }
                    /* [수정 2] pointer-events-none 추가! 
                       유리 바닥(배경)은 마우스가 통과하게 만듦 */
                    pointer-events-none 
                `}
                style={{ 
                    transform: `translateZ(${zPos}px)`,
                    opacity: opacity,
                    zIndex: level
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

                <div 
                  className="grid grid-cols-10 grid-rows-14 gap-x-3 gap-y-1.5 p-6 h-full"
                  style={{ gridTemplateRows: 'repeat(14, minmax(0, 1fr))' }} 
                >
                    {depths.slice().reverse().map((depth) => (
                        rackNames.map((rack) => {
                            const hasStock = checkInventory(rack, depth, level);
                            return (
                                <div 
                                    key={`${rack}-${depth}`}
                                    // [수정 3] 개별 셀에 pointer-events-auto 추가!
                                    // Ghost 층이 아닐 때만 마우스 이벤트를 다시 활성화함
                                    className={`
                                        relative w-full h-full rounded-[2px] transition-all duration-300 flex items-center justify-center group
                                        ${isGhost ? 'pointer-events-none' : 'pointer-events-auto cursor-pointer'} 
                                        ${hasStock 
                                            ? 'bg-blue-600 border border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.6)]' 
                                            : viewMode === '3d' 
                                                ? 'bg-white/5 border border-white/5 hover:bg-white/20' // 호버 효과 추가
                                                : 'bg-gray-800/40 border border-gray-700/20 hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    {hasStock && (
                                        <Box className={`text-white w-3 h-3 ${viewMode === '3d' ? 'opacity-90' : 'opacity-100'}`} />
                                    )}
                                    
                                    {/* 툴팁 (z-index 보정) */}
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/90 px-2 py-1 rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-[100] border border-gray-600 shadow-xl translate-z-10">
                                        <span className="text-blue-300 font-bold">{rack}-{depth}</span> ({level}F)
                                    </div>
                                </div>
                            )
                        })
                    ))}
                </div>
              </div>
            );
          })}
            
          {/* 2D 라벨 영역 */}
          <div className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${viewMode === '2d' ? 'opacity-100' : 'opacity-0'}`}>
              <div className="absolute top-6 bottom-6 left-[-30px] w-8">
                  <div className="grid grid-rows-14 gap-y-1.5 h-full" style={{ gridTemplateRows: 'repeat(14, minmax(0, 1fr))' }}>
                      {depths.slice().reverse().map(d => (
                          <div key={d} className="flex items-center justify-end pr-2 text-gray-500 text-[10px] font-mono">
                              {d}
                          </div>
                      ))}
                  </div>
              </div>

              <div className="absolute bottom-0 left-6 right-6 flex justify-between text-yellow-500 font-bold text-xs">
                  {rackNames.map(r => <span key={r} className="flex-1 text-center">{r}</span>)}
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
        /* 툴팁이 3D 공간에서 묻히지 않도록 */
        .translate-z-10 { transform: translateZ(20px); } 
      `}</style>
    </div>
  );
}