"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle, AlertTriangle, Layers, Package, Cuboid, LayoutGrid } from "lucide-react";

export interface LocationData {
  loc_id: string;
  warehouse: string;
  zone: string;
  rack_no: string;
  level_no: string;
  side: string;
  inventory?: { quantity: number; item_master?: { item_name: string } | null }[];
}

interface Props {
  rackName: string;
  locations: LocationData[];
  onClose: () => void;
}

// ----------------------------------------------------------------------
// 📦 [일반 랙 전용] CellBox 컴포넌트
// ----------------------------------------------------------------------
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

const CellBox = ({ 
  data, col, lvl, side, 
  hoveredCell, setHoveredCell, onInventoryClick, onEmptyClick 
}: CellBoxProps) => {
  
  const inventory = data?.inventory || [];
  const itemCount = inventory.length;
  const totalQty = inventory.reduce((sum, item) => sum + item.quantity, 0);
  
  const isEmpty = itemCount === 0 || totalQty === 0;
  const isMixed = itemCount > 1; 
  const primaryItemName = inventory[0]?.item_master?.item_name;
  const isHovered = data && hoveredCell === data.loc_id;

  let cellClass = "bg-gray-900/50 border-gray-800 hover:border-green-500 hover:bg-green-900/20 group"; 
  let textClass = "text-gray-500";
  
  if (!isEmpty) {
    if (isMixed) {
      cellClass = "bg-orange-950/30 border-orange-500/50 text-orange-200 hover:bg-gray-900 hover:border-orange-400 shadow-sm group";
      textClass = "text-orange-200";
    } else {
      cellClass = "bg-purple-900/30 border-purple-500 text-purple-200 hover:bg-gray-900 hover:border-blue-400 shadow-sm group";
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
      className={`w-20 h-16 md:w-28 md:h-24 border rounded-lg p-1.5 md:p-2 flex flex-col justify-between transition-all duration-150 cursor-pointer relative ${isHovered ? 'z-[100]' : 'z-0'} ${cellClass}`}
    >
      <div className="flex justify-between items-start w-full">
        <div className="text-[8px] md:text-[10px] font-mono opacity-60 truncate max-w-[70%]">{data.loc_id}</div>
        {!isEmpty && (
          isMixed ? <Layers size={10} className="text-orange-500 animate-pulse md:w-3 md:h-3" /> : <Package size={10} className="text-purple-400 md:w-3 md:h-3" />
        )}
      </div>
      <div className="flex-1 flex flex-col items-center justify-center w-full">
        {totalQty > 0 ? (
          <>
            <div className={`font-bold text-sm md:text-lg leading-none ${textClass}`}>{totalQty.toLocaleString()}</div>
            {isMixed ? (
              <div className="flex items-center gap-0.5 mt-0.5 text-orange-400 font-bold text-[8px] md:text-[10px]">
                <AlertTriangle size={8} /> <span>{itemCount}종</span>
              </div>
            ) : (
              <div className="text-[8px] md:text-[9px] truncate w-full text-center opacity-80 mt-0.5 px-0.5">{primaryItemName}</div>
            )}
          </>
        ) : (
          <div className="text-gray-600 text-[10px] flex flex-col items-center opacity-50 group-hover:opacity-100 group-hover:text-green-400 transition-all">
            <span className="font-bold text-sm md:text-lg">+</span>
            <span className="text-[8px] md:text-[10px]">Empty</span>
          </div>
        )}
      </div>
    </div>
  );
};

// ----------------------------------------------------------------------
// 🚀 메인 모달 컴포넌트
// ----------------------------------------------------------------------
export default function RackDetailModal({ rackName, locations, onClose }: Props) {
  const router = useRouter();

  // 1️⃣ [1단계] 셔틀랙 여부 판별 로직
  const isShuttleRack = useMemo(() => 
    rackName.toUpperCase() === 'L' || rackName.toUpperCase() === 'J', 
  [rackName]);

  const [shuttleViewMode, setShuttleViewMode] = useState<"2d" | "3d">("3d");
  const [currentSide, setCurrentSide] = useState<string>('1');
  const [confirmInfo, setConfirmInfo] = useState<{ locCode: string, display: string } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  // 2️⃣ [2단계] 데이터 인덱싱 (셔틀랙 전용 데이터 맵)
  const shuttleDataMap = useMemo(() => {
    if (!isShuttleRack) return new Map<string, LocationData>();
    const map = new Map<string, LocationData>();
    locations.forEach(loc => {
      // Key: "랙번호-Side-단" (예: "A-1-1")
      const key = `${loc.rack_no}-${loc.side}-${loc.level_no}`;
      map.set(key, loc);
    });
    return map;
  }, [locations, isShuttleRack]);

  // 기존 일반 랙 데이터 분석
  const { columns, levels, rackType, hasSide1 } = useMemo(() => {
    const safeLocs = locations || [];
    if (safeLocs.length === 0) return { columns: [], levels: [], rackType: 'SINGLE', hasSide1: true };
    const lvls = Array.from(new Set(safeLocs.map(l => Number(l.level_no)))).sort((a, b) => b - a);
    const cols = Array.from(new Set(safeLocs.map(l => l.rack_no))).sort();
    const sides = new Set(safeLocs.map(l => l.side));
    const maxSide = Math.max(...Array.from(sides).map(Number).filter(n => !isNaN(n)));
    let type = maxSide > 2 ? 'DEEP' : (sides.size === 1 ? 'SINGLE' : 'DOUBLE');
    return { columns: cols, levels: lvls, rackType: type, hasSide1: sides.has('1') };
  }, [locations]);

  const findLoc = (col: string, lvl: number, side: string) => {
    return locations?.find(l => l.rack_no === col && Number(l.level_no) === lvl && l.side === side);
  };

  const handleInventoryClick = (locId: string) => { 
    router.push(`/inventory?search=true&query=${locId}`); 
  };

  const handleEmptyCellClick = (col: string, lvl: number, side: string) => {
    const existingLoc = findLoc(col, lvl, side);
    if (!existingLoc) return;
    setConfirmInfo({ locCode: existingLoc.loc_id, display: `Rack ${rackName} / ${col}열 / ${lvl}단 / Side ${side}` });
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
                {isShuttleRack 
                  ? `셔틀랙 시스템 (Deep Lane) / 총 ${locations.length}개 셀`
                  : `총 ${locations.length}개 셀 / ${columns.length}열 x ${levels.length}단`
                }
              </p>
            </div>

            {/* 분기 UI: 셔틀랙용(2D/3D) vs 일반랙용(Side 1/2) */}
            {isShuttleRack ? (
              <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                <button onClick={() => setShuttleViewMode('2d')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${shuttleViewMode === '2d' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  <LayoutGrid size={12} className="inline mr-1"/> 2D 정면
                </button>
                <button onClick={() => setShuttleViewMode('3d')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${shuttleViewMode === '3d' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}>
                  <Cuboid size={12} className="inline mr-1"/> 2.5D 입체
                </button>
              </div>
            ) : (
              rackType === 'DOUBLE' && (
                <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                  <button onClick={() => setCurrentSide('1')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${currentSide === '1' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Side 1</button>
                  <button onClick={() => setCurrentSide('2')} className={`px-3 py-1 rounded text-[10px] font-bold transition-all ${currentSide === '2' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Side 2</button>
                </div>
              )
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"><X size={24}/></button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar bg-[#0a0a0a]">
          {isShuttleRack ? (
            /* 🚀 [3단계 구현 예정지] 셔틀랙 전용 뷰어 */
            <div className="w-full h-full flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-3xl min-h-[500px]">
              <Layers className="text-purple-500 animate-pulse mb-4" size={48} />
              <p className="text-gray-400 font-bold tracking-widest uppercase text-sm">Shuttle Rack {shuttleViewMode} Mode Ready</p>
              <p className="text-gray-600 text-xs mt-2">Mapped Locations: {shuttleDataMap.size}</p>
            </div>
          ) : (
            /* 일반 랙 뷰 (기존 로직) */
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
                        data={findLoc(col, lvl, currentSide)} col={col} lvl={lvl} side={currentSide}
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
          <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
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