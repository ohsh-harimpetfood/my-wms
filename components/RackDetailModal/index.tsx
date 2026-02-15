// components/RackDetailModal/index.tsx

"use client";

// 👇 이 줄을 최상단에 추가하세요!
export type { LocationData } from "./types";


import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle, AlertTriangle } from "lucide-react";
import { LocationData } from "./types";
import { CellBox } from "./CellBox";
import { ShuttleRackView } from "./ShuttleRackView";

interface Props {
  rackName: string;
  locations: LocationData[];
  onClose: () => void;
}

export default function RackDetailModal({ rackName, locations, onClose }: Props) {
  const router = useRouter();

  // 셔틀랙 여부 판별
  const isShuttleRack = useMemo(() => rackName.toUpperCase() === 'L' || rackName.toUpperCase() === 'J', [rackName]);

  // [일반 랙 전용] 데이터 분석 로직 (셔틀랙일 땐 계산 안 함)
  const { columns, levels, rackType, hasSide1 } = useMemo(() => {
    if (isShuttleRack) return { columns: [], levels: [], rackType: '', hasSide1: false };
    
    const safeLocs = locations || [];
    if (safeLocs.length === 0) return { columns: [], levels: [], rackType: 'SINGLE', hasSide1: true };
    const lvls = Array.from(new Set(safeLocs.map(l => Number(l.level_no)))).sort((a, b) => b - a);
    const cols = Array.from(new Set(safeLocs.map(l => l.rack_no))).sort();
    const sides = new Set(safeLocs.map(l => l.side));
    const maxSide = Math.max(...Array.from(sides).map(Number).filter(n => !isNaN(n)));
    let type = maxSide > 2 ? 'DEEP' : (sides.size === 1 ? 'SINGLE' : 'DOUBLE');
    return { columns: cols, levels: lvls, rackType: type, hasSide1: sides.has('1') };
  }, [locations, isShuttleRack]);

  const [currentSide, setCurrentSide] = useState<string>(hasSide1 ? '1' : '2');
  const [confirmInfo, setConfirmInfo] = useState<{ locCode: string, display: string } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // 공통 핸들러
  const handleInventoryClick = (locId: string) => router.push(`/inventory?search=true&query=${locId}`);
  
  const handleEmptyCellClick = (col: string, lvl: number, side: string) => {
    // 셔틀랙의 경우 col은 A,B.. side는 1~14. 일반랙은 col이 A열, side는 1/2
    // 각각의 뷰 컴포넌트에서 올바른 값을 넘겨준다고 가정
    let loc: LocationData | undefined;
    
    if (isShuttleRack) {
        // 셔틀랙 로직: side는 1~14, col은 A~J
        loc = locations?.find(l => l.rack_no === col && Number(l.level_no) === lvl && l.side === side);
    } else {
        // 일반랙 로직: side는 현재 선택된 Side(1 or 2)
        loc = locations?.find(l => l.rack_no === col && Number(l.level_no) === lvl && l.side === currentSide);
    }
    
    if (loc) setConfirmInfo({ locCode: loc.loc_id, display: `Rack ${rackName} / ${col}열 / ${lvl}단 / Side ${side}` });
  };

  const proceedToInbound = () => {
    if (confirmInfo) router.push(`/inbound/direct?loc=${confirmInfo.locCode}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-2 md:p-4 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-[98vw] md:max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* 헤더 */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-gray-800 bg-black/40 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                <span className="bg-purple-600 px-2 py-0.5 rounded text-base">Rack {rackName}</span>
              </h2>
              <p className="text-gray-500 text-[10px] md:text-xs mt-1">
                {isShuttleRack ? "셔틀랙 시스템 (Deep Lane)" : `총 ${locations.length}개 셀 현황`}
              </p>
            </div>

            {/* 일반 랙일 때만 Side 버튼 표시 */}
            {!isShuttleRack && rackType === 'DOUBLE' && (
              <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                <button onClick={() => setCurrentSide('1')} className={`px-3 py-1 rounded text-[10px] font-bold ${currentSide === '1' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Side 1</button>
                <button onClick={() => setCurrentSide('2')} className={`px-3 py-1 rounded text-[10px] font-bold ${currentSide === '2' ? 'bg-blue-600 text-white' : 'text-gray-400'}`}>Side 2</button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"><X size={24}/></button>
        </div>

        {/* 본문 - 여기가 핵심 분기! */}
        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar bg-[#0a0a0a]">
          {isShuttleRack ? (
            /* 셔틀랙 뷰 컴포넌트 */
            <ShuttleRackView 
                rackName={rackName} 
                locations={locations} 
                onInventoryClick={handleInventoryClick} 
                onEmptyClick={handleEmptyCellClick} 
            />
          ) : (
            /* 일반 랙 그리드 */
            <div className="min-w-max mx-auto">
              <div className="flex gap-2 md:gap-4 mb-2 pl-8 md:pl-12">
                {columns.map(col => (
                  <div key={col} className="w-20 md:w-28 text-center text-gray-500 font-bold text-xs bg-gray-900/50 py-1 rounded border border-gray-800">{col}열</div>
                ))}
              </div>
              <div className="flex flex-col gap-2 md:gap-4">
                {levels.map(lvl => (
                  <div key={lvl} className="flex gap-2 md:gap-4">
                    <div className="w-8 md:w-12 flex-shrink-0 flex items-center justify-center font-bold text-gray-600 bg-gray-900/30 rounded border border-gray-800 text-xs md:text-base">{lvl}단</div>
                    {columns.map(col => (
                      <CellBox 
                        key={`${col}-${lvl}`} 
                        data={locations?.find(l => l.rack_no === col && Number(l.level_no) === lvl && l.side === currentSide)} 
                        col={col} lvl={lvl} side={currentSide}
                        hoveredCell={hoveredCell} setHoveredCell={setHoveredCell}
                        onInventoryClick={handleInventoryClick} onEmptyClick={handleEmptyCellClick}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* 입고 확인 팝업 */}
        {confirmInfo && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-gray-800 border border-gray-600 p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
              <AlertTriangle size={48} className="mx-auto mb-4 text-yellow-500" />
              <h3 className="text-xl font-bold text-white mb-2">입고 등록 하시겠습니까?</h3>
              <p className="text-gray-400 text-sm mb-6">{confirmInfo.display}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmInfo(null)} className="flex-1 py-3 bg-gray-700 rounded-lg text-gray-300 font-bold">취소</button>
                <button onClick={proceedToInbound} className="flex-1 py-3 bg-blue-600 rounded-lg text-white font-bold flex items-center justify-center gap-2"><CheckCircle size={18}/>확인</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}