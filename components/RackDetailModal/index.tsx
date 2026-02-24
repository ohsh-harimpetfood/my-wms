// components/RackDetailModal/index.tsx

"use client";

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

  // [일반 랙 전용] 데이터 분석 로직
  const { columns, levels, rackType, hasSide1 } = useMemo(() => {
    if (isShuttleRack) return { columns: [], levels: [], rackType: '', hasSide1: false };
    
    const safeLocs = locations || [];
    if (safeLocs.length === 0) return { columns: [], levels: [], rackType: 'SINGLE', hasSide1: true };
    const lvls = Array.from(new Set(safeLocs.map(l => Number(l.level_no)))).sort((a, b) => b - a);
    const cols = Array.from(new Set(safeLocs.map(l => l.rack_no))).sort(); // 기본은 A-Z 오름차순
    const sides = new Set(safeLocs.map(l => l.side));
    const maxSide = Math.max(...Array.from(sides).map(Number).filter(n => !isNaN(n)));
    let type = maxSide > 2 ? 'DEEP' : (sides.size === 1 ? 'SINGLE' : 'DOUBLE');
    return { columns: cols, levels: lvls, rackType: type, hasSide1: sides.has('1') };
  }, [locations, isShuttleRack]);

  const [currentSide, setCurrentSide] = useState<string>(hasSide1 ? '1' : '2');
  const [confirmInfo, setConfirmInfo] = useState<{ locCode: string, display: string } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // 🚀 [핵심 로직] 렌더링에 사용할 최종 열(Column) 배열
  // 일반랙이면서 Side 2를 보고 있다면 좌우 반전(Mirroring)을 적용합니다!
  const displayColumns = useMemo(() => {
    if (!isShuttleRack && currentSide === '2') {
        // 원본 배열을 변형시키지 않기 위해 [...columns]로 복사 후 reverse (또는 최신 문법 .toReversed() 사용)
        return [...columns].reverse(); 
    }
    return columns;
  }, [columns, currentSide, isShuttleRack]);

  // 공통 핸들러
  const handleInventoryClick = (locId: string) => router.push(`/inventory?search=true&query=${locId}`);
  
  const handleEmptyCellClick = (col: string, lvl: number, side: string) => {
    let loc: LocationData | undefined;
    if (isShuttleRack) {
        loc = locations?.find(l => l.rack_no === col && Number(l.level_no) === lvl && l.side === side);
    } else {
        loc = locations?.find(l => l.rack_no === col && Number(l.level_no) === lvl && l.side === currentSide);
    }
    if (loc) setConfirmInfo({ locCode: loc.loc_id, display: `Rack ${rackName} / ${col}열 / ${lvl}단 / Side ${side}` });
  };

  const proceedToInbound = () => {
    if (confirmInfo) router.push(`/inbound/direct?loc=${confirmInfo.locCode}`);
  };

  return (
    // 🚀 [톤업] bg-black/90 -> bg-slate-950/80
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 md:p-4 animate-fade-in">
      {/* 🚀 [톤업] bg-gray-900 -> bg-slate-900 */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-[98vw] md:max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* 헤더 */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-2">
                <span className="bg-purple-600 px-2 py-0.5 rounded text-base text-white">Rack {rackName}</span>
              </h2>
              <p className="text-slate-400 text-[10px] md:text-xs mt-1">
                {isShuttleRack ? "셔틀랙 시스템 (Deep Lane)" : `총 ${locations.length}개 셀 현황`}
              </p>
            </div>

            {/* 일반 랙일 때만 Side 버튼 표시 */}
            {!isShuttleRack && rackType === 'DOUBLE' && (
              <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-inner">
                <button onClick={() => setCurrentSide('1')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${currentSide === '1' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>Side 1</button>
                <button onClick={() => setCurrentSide('2')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${currentSide === '2' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}>Side 2</button>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"><X size={24}/></button>
        </div>

        {/* 본문 */}
        {/* 🚀 [톤업] bg-[#0a0a0a] -> bg-slate-950 */}
        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar bg-slate-950">
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
            <div className="min-w-max mx-auto animate-fade-in">
              {/* 🚀 [수정] 안내 문구 추가: Side 2일 때 작업자 시야로 반전됨을 알림 */}
              {!isShuttleRack && currentSide === '2' && (
                  <div className="text-center text-yellow-500 text-xs font-bold mb-4 animate-pulse">
                      ⚠️ 작업자 시점에 맞추어 좌우 배열이 반전(Mirroring)되어 표시됩니다.
                  </div>
              )}

              <div className="flex gap-2 md:gap-4 mb-2 pl-8 md:pl-12">
                {/* 🚀 [수정] columns 대신 displayColumns 사용 */}
                {displayColumns.map(col => (
                  <div key={col} className="w-20 md:w-28 text-center text-slate-400 font-bold text-xs bg-slate-900/50 py-1 rounded border border-slate-800 transition-all">{col}열</div>
                ))}
              </div>
              <div className="flex flex-col gap-2 md:gap-4">
                {levels.map(lvl => (
                  <div key={lvl} className="flex gap-2 md:gap-4">
                    <div className="w-8 md:w-12 flex-shrink-0 flex items-center justify-center font-bold text-slate-500 bg-slate-900/40 rounded border border-slate-800 text-xs md:text-base">{lvl}단</div>
                    {/* 🚀 [수정] columns 대신 displayColumns 사용 */}
                    {displayColumns.map(col => (
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
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-sm px-4 animate-fade-in">
            <div className="bg-slate-800 border border-slate-600 p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
              <AlertTriangle size={48} className="mx-auto mb-4 text-yellow-500" />
              <h3 className="text-xl font-bold text-white mb-2">입고 등록 하시겠습니까?</h3>
              <p className="text-slate-400 text-sm mb-6">{confirmInfo.display}</p>
              <div className="flex gap-3">
                <button onClick={() => setConfirmInfo(null)} className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 font-bold transition">취소</button>
                <button onClick={proceedToInbound} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/50"><CheckCircle size={18}/>확인</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}