"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { X, CheckCircle, AlertTriangle } from "lucide-react"; // 아이콘

export interface LocationData {
  loc_id: string;
  warehouse: string;
  zone: string;
  rack_no: string;
  level_no: string;
  side: string;
  inventory?: { quantity: number; item_master: { item_name: string } | null }[];
}

interface Props {
  rackName: string;
  locations: LocationData[];
  onClose: () => void;
}

export default function RackDetailModal({ rackName, locations, onClose }: Props) {
  const router = useRouter();

  // 1. 데이터 분석
  const { columns, levels, rackType, hasSide1, hasSide2 } = useMemo(() => {
    const lvls = Array.from(new Set(locations.map(l => Number(l.level_no)))).sort((a, b) => b - a);
    const cols = Array.from(new Set(locations.map(l => l.rack_no))).sort();

    const sides = new Set(locations.map(l => l.side));
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
  
  // 팝업 상태
  const [confirmInfo, setConfirmInfo] = useState<{ locCode: string, display: string } | null>(null);

  const findLoc = (col: string, lvl: number, side: string) => {
      return locations.find(l => l.rack_no === col && Number(l.level_no) === lvl && l.side === side);
  };

  const handleInventoryClick = (locId: string) => { router.push(`/inventory?query=${locId}`); };

  // 빈 셀 클릭 핸들러 (데이터가 아예 없는 경우를 위한 fallback)
  const handleEmptyCellClick = (col: string, lvl: number, side: string) => {
      const sideSuffix = rackType === 'DOUBLE' ? (side === '1' ? '-F' : '-B') : ''; 
      // 예비용 ID 생성 (DB 데이터가 없을 때만 사용됨)
      const generatedCode = `${rackName}${col}${lvl}${sideSuffix}`;
      const displayStr = `${rackName}랙 ${col}열 ${lvl}단 ${side === '1' ? 'Side 1' : 'Side 2'}`;
      setConfirmInfo({ locCode: generatedCode, display: displayStr });
  };

  // 입고 페이지로 이동
  const proceedToInbound = () => {
      if (confirmInfo) {
          // ✨ 여기서 direct 페이지로 이동!
          router.push(`/inbound/direct?loc=${confirmInfo.locCode}`);
      }
  };

  // 📦 개별 셀 렌더링 컴포넌트
  const CellBox = ({ data, col, lvl, side }: { data?: LocationData, col: string, lvl: number, side: string }) => {
      const qty = data?.inventory?.[0]?.quantity || 0;
      const itemName = data?.inventory?.[0]?.item_master?.item_name;
      
      return (
        <div 
            onClick={(e) => { 
                e.stopPropagation(); 
                
                // ✨ [핵심 수정 로직]
                // 데이터가 있고 수량이 0보다 커야만 재고 상세로 이동
                if (data && qty > 0) {
                    handleInventoryClick(data.loc_id);
                } else {
                    // 수량이 0이거나(빈 껍데기), 데이터가 없으면 -> 입고 팝업
                    if (data) {
                        // DB에 있는 정확한 loc_id 사용
                        const displayStr = `${rackName}랙 ${col}열 ${lvl}단 ${side === '1' ? 'Side 1' : 'Side 2'}`;
                        setConfirmInfo({ locCode: data.loc_id, display: displayStr });
                    } else {
                        // DB 데이터조차 없으면 수동 생성
                        handleEmptyCellClick(col, lvl, side);
                    }
                }
            }}
            className={`
                w-28 h-24 border rounded-lg p-1 flex flex-col items-center justify-center text-center transition cursor-pointer hover:scale-105 hover:z-10
                ${!data ? 'bg-gray-900/50 border-gray-800 hover:border-green-500/50 hover:bg-green-900/10 group' : ''}
                ${data && qty > 0 ? 'bg-purple-900/30 border-purple-500 text-purple-200 hover:border-blue-500' : ''}
                ${data && qty === 0 ? 'bg-gray-800 border-gray-700 text-gray-500 hover:border-green-500/50 hover:bg-green-900/10 group' : ''}
            `}
        >
            {data ? (
                <>
                    <div className="text-[9px] font-mono opacity-50 mb-1 truncate w-full px-1">{data.loc_id}</div>
                    {qty > 0 ? (
                        <>
                            <div className="font-bold text-lg leading-tight">{qty.toLocaleString()}</div>
                            <div className="text-[9px] truncate w-full px-1 opacity-80">{itemName}</div>
                        </>
                    ) : (
                        // 데이터는 있지만 수량이 0인 경우 -> 입고 가능 표시
                        <div className="text-gray-600 text-xs flex flex-col items-center gap-1 opacity-50 group-hover:opacity-100 group-hover:text-green-400 transition-all">
                             <span className="font-bold text-lg">+</span>
                             <span className="text-[10px]">Empty</span>
                        </div>
                    )}
                </>
            ) : (
                 // 데이터 자체가 없는 경우
                 <div className="text-gray-700 text-xs flex flex-col items-center gap-1 opacity-30 group-hover:opacity-100 group-hover:text-green-500 transition-all">
                    <span className="font-bold text-lg">+</span>
                    <span className="text-[10px]">Inbound</span>
                </div>
            )}
        </div>
      )
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-[95vw] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-black/40">
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
          </div>
        </div>
        
        {/* 입고 확인 팝업 */}
        {confirmInfo && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
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