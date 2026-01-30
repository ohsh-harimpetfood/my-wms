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

export default function RackDetailModal({ rackName, locations, onClose }: Props) {
  const router = useRouter();

  // 1. 데이터 분석
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

  const handleInventoryClick = (locId: string) => { router.push(`/inventory?query=${locId}`); };

  const handleEmptyCellClick = (col: string, lvl: number, side: string) => {
      // 2F 물류팀의 경우 랙 구조가 복잡할 수 있으므로, 데이터 상의 loc_id가 있으면 그걸 우선 사용
      const existingLoc = findLoc(col, lvl, side);
      
      let locCode = "";
      if (existingLoc) {
          locCode = existingLoc.loc_id;
      } else {
          // 데이터가 없는데 클릭된 경우 (가상 셀), 규칙에 따라 생성 시도
          const sideSuffix = rackName.length === 1 ? (side === '1' ? '' : '-2') : (side === '1' ? '-F' : '-B'); 
          // 이 부분은 현장 규칙에 따라 다를 수 있으므로, 기존 데이터가 없으면 경고
          console.warn("데이터가 없는 셀 클릭됨");
          return; 
      }

      const displayStr = `Rack ${rackName} / ${col}열 / ${lvl}단 / Side ${side}`;
      setConfirmInfo({ locCode: locCode, display: displayStr });
  };

  const proceedToInbound = () => {
      if (confirmInfo) router.push(`/inbound/direct?loc=${confirmInfo.locCode}`);
  };

  // 📦 개별 셀 렌더링 컴포넌트 (기존과 동일, 로직 그대로 사용)
  const CellBox = ({ data, col, lvl, side }: { data?: LocationData, col: string, lvl: number, side: string }) => {
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
              cellClass = "bg-orange-950/30 border-orange-500/50 text-orange-200 hover:bg-gray-900 hover:border-orange-400 hover:shadow-[0_0_20px_rgba(249,115,22,0.3)] group";
              textClass = "text-orange-200";
          } else {
              cellClass = "bg-purple-900/30 border-purple-500 text-purple-200 hover:bg-gray-900 hover:border-blue-400 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] group";
              textClass = "text-purple-200";
          }
      } else if (data && totalQty === 0) {
          cellClass = "bg-gray-800 border-gray-700 text-gray-500 hover:border-green-500 hover:bg-gray-800 group";
      }
      
      if (!data) return <div className="w-28 h-24 border border-transparent"></div>; // 데이터 없으면 빈 공간

      return (
        <div 
            onMouseEnter={() => { if(data) setHoveredCell(data.loc_id); }}
            onMouseLeave={() => { setHoveredCell(null); }}
            onClick={(e) => { 
                e.stopPropagation(); 
                if (totalQty > 0) handleInventoryClick(data.loc_id);
                else handleEmptyCellClick(col, lvl, side);
            }}
            className={`
                w-28 h-24 border rounded-lg p-2 flex flex-col justify-between 
                transition-all duration-150 cursor-pointer 
                relative 
                ${isHovered ? 'z-[100]' : 'z-0'}
                ${cellClass}
            `}
        >
            <div className="flex justify-between items-start w-full">
                <div className="text-[10px] font-mono opacity-60 truncate max-w-[70%]">{data.loc_id}</div>
                {!isEmpty && (
                    isMixed 
                        ? <Layers size={12} className="text-orange-500 animate-pulse" />
                        : <Package size={12} className="text-purple-400" />
                )}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center w-full">
                {totalQty > 0 ? (
                    <>
                        <div className={`font-bold text-lg leading-none ${textClass}`}>
                            {totalQty.toLocaleString()}
                        </div>
                        {isMixed ? (
                            <div className="flex items-center gap-1 mt-1 text-orange-400 font-bold text-[10px]">
                                <AlertTriangle size={10} />
                                <span>{itemCount}종 혼적</span>
                            </div>
                        ) : (
                            <div className="text-[9px] truncate w-full text-center opacity-80 mt-1 px-1">
                                {primaryItemName}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-gray-600 text-xs flex flex-col items-center gap-1 opacity-50 group-hover:opacity-100 group-hover:text-green-400 transition-all">
                            <span className="font-bold text-lg">+</span>
                            <span className="text-[10px]">Empty</span>
                    </div>
                )}
            </div>

            {/* 툴팁 */}
            {isMixed && isHovered && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-64 z-[200] pointer-events-none animate-fade-in-fast">
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
      )
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-black/40 shrink-0">
          <div className="flex items-center gap-6">
            <div>
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="bg-purple-600 px-3 py-1 rounded text-lg">Rack {rackName}</span>
                </h2>
                <p className="text-gray-500 text-xs mt-1">
                총 {locations.length}개 셀 / {columns.length}열 x {levels.length}단
                </p>
            </div>
            {rackType === 'DOUBLE' && (
                <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700">
                    <button onClick={() => setCurrentSide('1')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${currentSide === '1' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Side 1</button>
                    <button onClick={() => setCurrentSide('2')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${currentSide === '2' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}>Side 2</button>
                </div>
            )}
          </div>
          <button onClick={onClose} className="p-3 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"><X size={24}/></button>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-[#0a0a0a]">
          <div className="min-w-max mx-auto">
            {locations.length > 0 ? (
                <>
                    <div className="flex gap-4 mb-2 pl-12">
                        {columns.map(col => (<div key={col} className="w-28 text-center text-gray-500 font-bold text-sm bg-gray-900/50 py-1 rounded border border-gray-800">{col}열</div>))}
                    </div>
                    <div className="flex flex-col gap-4">
                    {levels.map(lvl => (
                        <div key={lvl} className="flex gap-4">
                        <div className="w-12 flex-shrink-0 flex items-center justify-center font-bold text-gray-600 bg-gray-900/30 rounded border border-gray-800">{lvl}단</div>
                        {columns.map(col => {
                            const targetData = findLoc(col, lvl, currentSide);
                            return <div key={`${col}-${lvl}`}><CellBox data={targetData} col={col} lvl={lvl} side={currentSide} /></div>;
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
            <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-gray-800 border border-gray-600 p-6 rounded-xl shadow-2xl max-w-sm w-full mx-4 text-center">
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