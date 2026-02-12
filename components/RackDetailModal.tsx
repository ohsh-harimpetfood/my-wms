"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle, AlertTriangle, Layers, Package } from "lucide-react";

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
// 📦 [분리됨] CellBox 컴포넌트
// - 모바일 최적화: w/h 및 폰트 사이즈 반응형 적용 (md: 접두사 활용)
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

  // 스타일링 로직
  let cellClass = "bg-gray-900/50 border-gray-800 hover:border-green-500 hover:bg-green-900/20 group"; 
  let textClass = "text-gray-500";
  
  if (!isEmpty) {
      if (isMixed) {
          cellClass = "bg-orange-950/30 border-orange-500/50 text-orange-200 hover:bg-gray-900 hover:border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] group";
          textClass = "text-orange-200";
      } else {
          cellClass = "bg-purple-900/30 border-purple-500 text-purple-200 hover:bg-gray-900 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] group";
          textClass = "text-purple-200";
      }
  } else if (data && totalQty === 0) {
      cellClass = "bg-gray-800 border-gray-700 text-gray-500 hover:border-green-500 hover:bg-gray-800 group";
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
        // 🚀 [수정] 모바일: w-20 h-16 / PC: w-28 h-24
        className={`
            w-20 h-16 md:w-28 md:h-24 border rounded-lg p-1.5 md:p-2 flex flex-col justify-between 
            transition-all duration-150 cursor-pointer 
            relative 
            ${isHovered ? 'z-[100]' : 'z-0'}
            ${cellClass}
        `}
    >
        <div className="flex justify-between items-start w-full">
            {/* 🚀 [수정] 폰트 사이즈 축소 */}
            <div className="text-[8px] md:text-[10px] font-mono opacity-60 truncate max-w-[70%]">{data.loc_id}</div>
            {!isEmpty && (
                isMixed 
                    ? <Layers size={10} className="text-orange-500 animate-pulse md:w-3 md:h-3" /> // 아이콘 크기 조정
                    : <Package size={10} className="text-purple-400 md:w-3 md:h-3" />
            )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center w-full">
            {totalQty > 0 ? (
                <>
                    {/* 🚀 [수정] 수량 폰트 사이즈 축소 */}
                    <div className={`font-bold text-sm md:text-lg leading-none ${textClass}`}>
                        {totalQty.toLocaleString()}
                    </div>
                    {isMixed ? (
                        <div className="flex items-center gap-0.5 md:gap-1 mt-0.5 md:mt-1 text-orange-400 font-bold text-[8px] md:text-[10px]">
                            <AlertTriangle size={8} className="md:w-[10px] md:h-[10px]" />
                            <span>{itemCount}종</span>
                        </div>
                    ) : (
                        <div className="text-[8px] md:text-[9px] truncate w-full text-center opacity-80 mt-0.5 md:mt-1 px-0.5">
                            {primaryItemName}
                        </div>
                    )}
                </>
            ) : (
                <div className="text-gray-600 text-[10px] md:text-xs flex flex-col items-center gap-0.5 opacity-50 group-hover:opacity-100 group-hover:text-green-400 transition-all">
                        <span className="font-bold text-sm md:text-lg">+</span>
                        <span className="text-[8px] md:text-[10px] scale-75 md:scale-100">Empty</span>
                </div>
            )}
        </div>

        {/* 툴팁 (PC에서만 주로 동작하지만 코드 유지) */}
        {isMixed && isHovered && (
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 md:w-64 z-[200] pointer-events-none animate-fade-in-fast">
                    <div className="bg-gray-950 border border-orange-500 rounded-xl p-3 shadow-[0_0_50px_rgba(0,0,0,0.9)] text-[10px] text-left relative">
                    <div className="font-bold text-orange-400 mb-2 pb-2 border-b border-gray-800 flex justify-between items-center">
                        <span>⚠️ 혼합 적재 ({itemCount}종)</span>
                        <span className="text-[9px] text-gray-500">총 {totalQty.toLocaleString()}</span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-hidden">
                        {inventory.map((inv, idx) => (
                            <div key={idx} className="flex justify-between gap-3 items-center bg-gray-900/50 p-1.5 rounded">
                                <span className="text-gray-300 truncate flex-1 leading-tight">{inv.item_master?.item_name}</span>
                                <span className="text-white font-mono font-bold whitespace-nowrap">{inv.quantity.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                    </div>
            </div>
        )}
    </div>
  );
};

// ----------------------------------------------------------------------
// 🚀 메인 모달 컴포넌트
// ----------------------------------------------------------------------
export default function RackDetailModal({ rackName, locations, onClose }: Props) {
  const router = useRouter();

  // 데이터 분석
  const { columns, levels, rackType, hasSide1 } = useMemo(() => {
    const safeLocs = locations || [];
    
    if (safeLocs.length === 0) {
        return { columns: [], levels: [], rackType: 'SINGLE', hasSide1: true, hasSide2: false };
    }

    const lvls = Array.from(new Set(safeLocs.map(l => Number(l.level_no)))).sort((a, b) => b - a);
    const cols = Array.from(new Set(safeLocs.map(l => l.rack_no))).sort();
    const sides = new Set(safeLocs.map(l => l.side));
    const maxSide = Math.max(...Array.from(sides).map(Number).filter(n => !isNaN(n)));

    let type = 'DOUBLE';
    if (maxSide > 2) type = 'DEEP';
    else if (sides.size === 1) type = 'SINGLE';

    return { 
        columns: cols, 
        levels: lvls, 
        rackType: type,
        hasSide1: sides.has('1'),
        hasSide2: sides.has('2')
    };
  }, [locations]);

  const [currentSide, setCurrentSide] = useState<string>(hasSide1 ? '1' : '2');
  const [confirmInfo, setConfirmInfo] = useState<{ locCode: string, display: string } | null>(null);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  const findLoc = (col: string, lvl: number, side: string) => {
      return locations?.find(l => l.rack_no === col && Number(l.level_no) === lvl && l.side === side);
  };

  const handleInventoryClick = (locId: string) => { 
      router.push(`/inventory?search=true&query=${locId}`); 
  };

  const handleEmptyCellClick = (col: string, lvl: number, side: string) => {
      const existingLoc = findLoc(col, lvl, side);
      
      let locCode = "";
      if (existingLoc) {
          locCode = existingLoc.loc_id;
      } else {
          console.warn("데이터가 없는 셀 클릭됨");
          return; 
      }

      const displayStr = `Rack ${rackName} / ${col}열 / ${lvl}단 / Side ${side}`;
      setConfirmInfo({ locCode: locCode, display: displayStr });
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
                <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 md:gap-3">
                <span className="bg-purple-600 px-2 py-0.5 md:px-3 md:py-1 rounded text-base md:text-lg">Rack {rackName}</span>
                </h2>
                <p className="text-gray-500 text-[10px] md:text-xs mt-1">
                총 {locations.length}개 셀 / {columns.length}열 x {levels.length}단
                </p>
            </div>
            {rackType === 'DOUBLE' && (
                <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700 self-start md:self-auto">
                    <button onClick={() => setCurrentSide('1')} className={`px-3 py-1 md:px-4 md:py-1.5 rounded text-[10px] md:text-xs font-bold transition-all ${currentSide === '1' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Side 1</button>
                    <button onClick={() => setCurrentSide('2')} className={`px-3 py-1 md:px-4 md:py-1.5 rounded text-[10px] md:text-xs font-bold transition-all ${currentSide === '2' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Side 2</button>
                </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 md:p-3 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"><X size={20} className="md:w-6 md:h-6"/></button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar bg-[#0a0a0a]">
          <div className="min-w-max mx-auto">
            {locations.length > 0 ? (
                <>
                    {/* 열 헤더 */}
                    <div className="flex gap-2 md:gap-4 mb-2 pl-8 md:pl-12">
                        {columns.map(col => (
                            // 🚀 [수정] 헤더 너비도 셀 너비에 맞춤 (w-20 / w-28)
                            <div key={col} className="w-20 md:w-28 text-center text-gray-500 font-bold text-xs md:text-sm bg-gray-900/50 py-1 rounded border border-gray-800">{col}열</div>
                        ))}
                    </div>
                    
                    {/* 층별 렌더링 */}
                    {/* 🚀 [수정] 층 간격 축소 (gap-2 / gap-4) */}
                    <div className="flex flex-col gap-2 md:gap-4">
                    {levels.map(lvl => (
                        <div key={lvl} className="flex gap-2 md:gap-4">
                            {/* 단 헤더 */}
                            <div className="w-8 md:w-12 flex-shrink-0 flex items-center justify-center font-bold text-gray-600 bg-gray-900/30 rounded border border-gray-800 text-xs md:text-base">{lvl}단</div>
                            {/* 셀 렌더링 */}
                            {columns.map(col => {
                                const targetData = findLoc(col, lvl, currentSide);
                                return (
                                    <CellBox 
                                        key={`${col}-${lvl}`} 
                                        data={targetData} 
                                        col={col} 
                                        lvl={lvl} 
                                        side={currentSide}
                                        hoveredCell={hoveredCell}
                                        setHoveredCell={setHoveredCell}
                                        onInventoryClick={handleInventoryClick}
                                        onEmptyClick={handleEmptyCellClick}
                                    />
                                );
                            })}
                        </div>
                    ))}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 py-20">
                    <AlertTriangle size={48} className="mb-4 text-yellow-500" />
                    <p className="text-lg">해당 랙의 상세 데이터가 없습니다.</p>
                </div>
            )}
          </div>
        </div>
        
        {/* 입고 확인 팝업 */}
        {confirmInfo && (
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in px-4">
                <div className="bg-gray-800 border border-gray-600 p-6 rounded-xl shadow-2xl max-w-sm w-full text-center">
                    <div className="flex justify-center mb-4 text-yellow-500"><AlertTriangle size={48} /></div>
                    <h3 className="text-xl font-bold text-white mb-2">입고 등록 하시겠습니까?</h3>
                    <p className="text-gray-400 text-sm mb-6">
                        선택하신 위치: <br/>
                        <span className="text-blue-400 font-bold text-lg">{confirmInfo.display}</span> <br/>
                        <span className="text-gray-600 text-xs">({confirmInfo.locCode})</span>
                    </p>
                    <div className="flex gap-3">
                        <button onClick={() => setConfirmInfo(null)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 font-bold transition">취소</button>
                        <button onClick={proceedToInbound} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-bold transition flex items-center justify-center gap-2"><CheckCircle size={18}/>확인</button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}