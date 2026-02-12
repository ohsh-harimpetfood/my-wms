"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { X, MapPin, ChevronLeft, Box } from "lucide-react";

// --- [Cell 컴포넌트] 반응형 스타일 적용 ---
interface CellProps {
  locCode: string;
  inventory: any[]; 
  isEmpty: boolean;
  onSelect: (locId: string) => void;
}

const SimpleCell = ({ locCode, inventory, isEmpty, onSelect }: CellProps) => {
  const totalQty = inventory.reduce((acc, cur) => acc + cur.quantity, 0);
  const itemName = inventory[0]?.item_master?.item_name || "";
  const otherCount = inventory.length - 1;

  return (
    <button
      onClick={() => onSelect(locCode)}
      // 🚀 [수정 7] PC 카드 크기 확대 (h-20 -> h-24), 모바일 최적화 (h-14)
      className={`
        flex flex-col justify-between rounded border transition-all w-full text-left relative overflow-hidden group
        h-14 p-1 md:h-24 md:p-3
        ${isEmpty 
          ? "bg-gray-800 border-gray-700 text-gray-500 hover:border-green-500 hover:bg-gray-700" 
          : "bg-purple-900/30 border-purple-500/50 text-purple-100 hover:bg-purple-900/50"
        }
      `}
    >
      <div className="flex justify-between items-start w-full">
        {/* 🚀 [수정 7] 폰트 크기 조정 */}
        <span className="text-[10px] md:text-sm font-mono opacity-60 leading-none font-bold">{locCode}</span>
        {!isEmpty && <Box size={10} className="text-purple-300 opacity-70 md:w-5 md:h-5"/>}
      </div>
      
      {isEmpty ? (
        <div className="self-center text-[10px] md:text-sm opacity-30 font-bold">EMPTY</div>
      ) : (
        <div className="w-full">
            <div className="font-bold text-[11px] md:text-lg leading-none text-right mb-0.5 md:mb-1">{totalQty.toLocaleString()}</div>
            <div className="text-[10px] md:text-xs opacity-70 truncate w-full leading-tight">
                {itemName} {otherCount > 0 && `+${otherCount}`}
            </div>
        </div>
      )}
    </button>
  );
};

interface Props {
  onClose: () => void;
  onSelect: (locId: string) => void;
}

type ViewStep = 'ZONES' | 'RACKS' | 'CELLS';
type WarehouseType = 'PRODUCTION' | 'LOGISTICS';

export default function LocationMapSelector({ onClose, onSelect }: Props) {
  const supabase = createClient();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- 상태 관리 ---
  const [step, setStep] = useState<ViewStep>('ZONES');
  const [warehouseType, setWarehouseType] = useState<WarehouseType>('PRODUCTION');
  
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [selectedRack, setSelectedRack] = useState<string>("");
  const [selectedSide, setSelectedSide] = useState<string>("1"); 

  // 1. 전체 데이터 로딩
  useEffect(() => {
    const fetchLocs = async () => {
      setLoading(true);
      let allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("loc_master")
          .select("*, inventory(quantity, item_master(item_name))")
          .eq("active_flag", "Y")
          .range(from, from + 999);
        if (error || !data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < 1000) break;
        from += 1000;
      }
      setLocations(allData);
      setLoading(false);
    };
    fetchLocs();
  }, []);

  // 2. 데이터 가공 (메모이제이션)
  const { zonesMap, racksInZone, cellsInRack, zoneStats, rackStats } = useMemo(() => {
    const filteredLocs = locations.filter(l => {
        const isLogis = (l.zone === '2F' || l.loc_id.startsWith('2F')); 
        return warehouseType === 'LOGISTICS' ? isLogis : !isLogis;
    });

    const zones = new Set<string>();
    const racks: Record<string, Set<string>> = {}; 
    
    // 🚀 [수정 3] Zone 통계 집계 추가
    const zStats: Record<string, { total: number, used: number }> = {};
    const rStats: Record<string, { total: number, used: number }> = {}; 

    filteredLocs.forEach(l => {
        const z = l.zone || 'ETC';
        zones.add(z);
        if (!racks[z]) racks[z] = new Set();
        racks[z].add(l.rack_no);

        // Zone 통계
        if (!zStats[z]) zStats[z] = { total: 0, used: 0 };
        zStats[z].total++;

        // Rack 통계
        const rackKey = `${z}-${l.rack_no}`; 
        if (!rStats[rackKey]) rStats[rackKey] = { total: 0, used: 0 };
        rStats[rackKey].total++;

        const qty = l.inventory?.reduce((acc:any, cur:any) => acc + cur.quantity, 0) || 0;
        if (qty > 0) {
            zStats[z].used++;
            rStats[rackKey].used++;
        }
    });

    const currentRacks = selectedZone 
        ? Array.from(racks[selectedZone] || []).sort() 
        : [];

    const currentCells = filteredLocs.filter(l => 
        l.zone === selectedZone && 
        l.rack_no === selectedRack &&
        l.side === selectedSide
    ).sort((a, b) => {
        if (Number(b.level_no) !== Number(a.level_no)) return Number(b.level_no) - Number(a.level_no);
        return a.loc_id.localeCompare(b.loc_id);
    });

    return { 
        zonesMap: Array.from(zones).sort(), 
        racksInZone: currentRacks,
        cellsInRack: currentCells,
        zoneStats: zStats,
        rackStats: rStats
    };
  }, [locations, warehouseType, selectedZone, selectedRack, selectedSide]);

  // --- 핸들러 ---
  const handleZoneClick = (z: string) => {
      setSelectedZone(z);
      setStep('RACKS');
  };

  const handleRackClick = (r: string) => {
      setSelectedRack(r);
      setSelectedSide("1"); 
      setStep('CELLS');
  };

  const handleBack = () => {
      if (step === 'CELLS') setStep('RACKS');
      else if (step === 'RACKS') setStep('ZONES');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-[family-name:var(--font-geist-sans)]">
        
        {/* 헤더 */}
        <div className="px-4 py-3 border-b border-gray-800 bg-[#111] flex flex-col gap-3 shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
                {step !== 'ZONES' && (
                    <button onClick={handleBack} className="p-1.5 bg-gray-800 hover:bg-gray-700 rounded-full transition text-gray-300">
                        <ChevronLeft size={20}/>
                    </button>
                )}
                <div>
                    <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                        <MapPin className="text-blue-500" size={18}/> 
                        {/* 🚀 [수정 2, 5, 6] 타이틀 명칭 변경 */}
                        {step === 'ZONES' ? '위치 선택' 
                         : step === 'RACKS' ? `${selectedZone}랙 열 선택` 
                         : `${selectedZone}${selectedRack}랙의 side / level 선택`}
                    </h2>
                </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full"><X size={24}/></button>
          </div>

          {step === 'ZONES' && (
             <div className="flex bg-black p-1 rounded-lg border border-gray-800 self-center w-full max-w-xs">
                <button onClick={() => setWarehouseType('PRODUCTION')} className={`flex-1 py-1.5 rounded text-xs md:text-sm font-bold transition-all ${warehouseType === 'PRODUCTION' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>생산창고</button>
                <button onClick={() => setWarehouseType('LOGISTICS')} className={`flex-1 py-1.5 rounded text-xs md:text-sm font-bold transition-all ${warehouseType === 'LOGISTICS' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-white'}`}>물류창고</button>
             </div>
          )}

          {step === 'CELLS' && (
             <div className="flex bg-black p-1 rounded-lg border border-gray-800 self-center w-full max-w-xs">
                <button onClick={() => setSelectedSide('1')} className={`flex-1 py-1.5 rounded text-xs md:text-sm font-bold transition-all ${selectedSide === '1' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'}`}>Side 1</button>
                <button onClick={() => setSelectedSide('2')} className={`flex-1 py-1.5 rounded text-xs md:text-sm font-bold transition-all ${selectedSide === '2' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'}`}>Side 2</button>
             </div>
          )}
        </div>

        {/* 본문 컨텐츠 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-6 bg-black">
            {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div>맵 데이터 로딩...</div>
                </div>
            ) : (
                <>
                    {/* [VIEW 1] Zone Map (반응형 Grid) */}
                    {step === 'ZONES' && (
                        // 🚀 [수정 4] 웹 6개 / 모바일 4개
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2 md:gap-4">
                            {zonesMap.map(z => {
                                // 🚀 [수정 3] Zone 적재율 계산
                                const stat = zoneStats[z] || { total: 1, used: 0 };
                                const percent = Math.round((stat.used / stat.total) * 100) || 0;
                                let barColor = "bg-green-500";
                                if (percent > 80) barColor = "bg-red-500";
                                else if (percent > 50) barColor = "bg-yellow-500";

                                return (
                                    <button 
                                        key={z} 
                                        onClick={() => handleZoneClick(z)}
                                        // 🚀 [수정 1] 버튼 세로 길이 축소 (aspect-square 제거 -> h-20 md:h-28 고정)
                                        className="bg-gray-900 border border-gray-800 rounded-lg flex flex-col items-center justify-between p-2 md:p-3 hover:border-blue-500 hover:bg-blue-900/10 transition-all group h-20 md:h-28"
                                    >
                                        <div className="text-[11px] text-gray-500 self-start">Rack</div>
                                        <div className="text-xl md:text-3xl font-black text-gray-400 group-hover:text-blue-400 transition-colors">{z}</div>
                                        
                                        {/* 🚀 [수정 3] 적재율 바 표시 */}
                                        <div className="w-full space-y-1">
                                            <div className="flex justify-between text-[10px] text-gray-500 px-0.5">
                                                <span>{stat.used}/{stat.total}</span>
                                                <span>{percent}%</span>
                                            </div>
                                            <div className="w-full h-1 md:h-1.5 bg-black rounded-full overflow-hidden border border-gray-800">
                                                <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }}></div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* [VIEW 2] Rack Map (반응형 Grid) */}
                    {step === 'RACKS' && (
                        // 🚀 [수정 4] 웹 6개 / 모바일 4개
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2 md:gap-4"> 
                            {racksInZone.map(r => {
                                const stat = rackStats[`${selectedZone}-${r}`] || { total: 1, used: 0 };
                                const percent = Math.round((stat.used / stat.total) * 100) || 0;
                                let barColor = "bg-green-500";
                                if (percent > 80) barColor = "bg-red-500";
                                else if (percent > 50) barColor = "bg-yellow-500";

                                return (
                                    <button 
                                        key={r} 
                                        onClick={() => handleRackClick(r)}
                                        // 🚀 [수정 1] 높이 축소 (h-20 md:h-28)
                                        className="bg-[#1a1a1a] border border-gray-800 rounded-lg flex flex-col items-center justify-between p-2 md:p-3 hover:border-purple-500 hover:shadow-[0_0_10px_rgba(168,85,247,0.1)] transition-all group h-20 md:h-28"
                                    >
                                        <div className="text-[10px] text-gray-500 self-start">열</div>
                                        <div className="text-xl md:text-3xl font-bold text-white group-hover:text-purple-300">{r}</div>
                                        
                                        <div className="w-full space-y-1">
                                            <div className="flex justify-between text-[9px] text-gray-500 px-0.5">
                                                <span>{stat.used}/{stat.total}</span>
                                                <span>{percent}%</span>
                                            </div>
                                            <div className="w-full h-1 md:h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                                <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }}></div>
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* [VIEW 3] Cells Grid (마지막 단계) */}
                    {step === 'CELLS' && (
                        <div className="space-y-4 md:space-y-6">
                            {Array.from(new Set(cellsInRack.map(c => Number(c.level_no)))).sort((a,b) => b-a).map(lvl => (
                                <div key={lvl} className="flex gap-2 md:gap-4">
                                    <div className="w-8 md:w-12 shrink-0 flex items-center justify-center bg-gray-900 border border-gray-800 rounded font-bold text-gray-500 text-xs md:text-sm">
                                        {lvl}F
                                    </div>
                                    
                                    {/* 🔴 여기가 핵심입니다! grid-cols-1로 하면 카드가 가로로 꽉 찹니다 */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 gap-2 md:gap-3 flex-1">
                                        {cellsInRack.filter(c => Number(c.level_no) === lvl).map(cell => {
                                            const qty = cell.inventory?.reduce((acc:any, cur:any) => acc + cur.quantity, 0) || 0;
                                            return (
                                                <SimpleCell 
                                                    key={cell.loc_id}
                                                    locCode={cell.loc_id}
                                                    inventory={cell.inventory || []}
                                                    isEmpty={qty === 0}
                                                    onSelect={onSelect}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                            {cellsInRack.length === 0 && (
                                <div className="text-center py-20 text-gray-500 text-sm">
                                    해당 구역(Side {selectedSide})에는 셀 데이터가 없습니다.
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
}