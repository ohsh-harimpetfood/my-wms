"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { X, MapPin, ChevronLeft, Box, CheckCircle2 } from "lucide-react";

// --- [Cell 컴포넌트] ---
interface CellProps {
  locCode: string;
  inventory: any[]; 
  isEmpty: boolean;
  onSelect: (locId: string) => void;
  isShuttle?: boolean;
  isMultiMode?: boolean;
  isSelected?: boolean;
}

const SimpleCell = ({ locCode, inventory, isEmpty, onSelect, isShuttle, isMultiMode, isSelected }: CellProps) => {
  const totalQty = inventory.reduce((acc, cur) => acc + cur.quantity, 0);
  const itemName = inventory[0]?.item_master?.item_name || "";
  const otherCount = inventory.length - 1;

  const depthDisplay = isShuttle ? locCode.slice(-2).replace(/[^0-9]/g, '') : locCode;

  return (
    <button
      onClick={() => onSelect(locCode)}
      className={`
        flex flex-col justify-between rounded border transition-all w-full text-left relative overflow-hidden group
        ${isShuttle ? 'h-12 p-1 md:h-16 md:p-2' : 'h-14 p-1 md:h-24 md:p-3'}
        ${isSelected 
            ? "bg-blue-900/40 border-blue-500 ring-2 ring-blue-500 ring-inset shadow-[0_0_15px_rgba(59,130,246,0.3)]"
            : isEmpty 
                ? "bg-gray-800 border-gray-700 text-gray-500 hover:border-gray-400 hover:bg-gray-700" 
                : "bg-purple-900/30 border-purple-500/50 text-purple-100 hover:bg-purple-900/50"
        }
      `}
    >
      <div className="flex justify-between items-start w-full">
        <span className={`${isShuttle ? 'text-[9px] md:text-xs' : 'text-[10px] md:text-sm'} font-mono opacity-60 leading-none font-bold`}>
          {isShuttle ? depthDisplay : locCode}
        </span>
        {isSelected && <CheckCircle2 size={14} className="text-blue-400 absolute top-1 right-1" />}
        {!isEmpty && !isSelected && <Box size={isShuttle ? 8 : 10} className="text-purple-300 opacity-70 md:w-5 md:h-5"/>}
      </div>
      
      {isEmpty ? (
        <div className={`self-center text-[9px] md:text-xs font-bold ${isSelected ? 'text-blue-300 opacity-100' : 'opacity-30'}`}>
          {isSelected ? '선택됨' : 'EMPTY'}
        </div>
      ) : (
        <div className="w-full">
            <div className={`font-bold ${isShuttle ? 'text-[10px] md:text-sm' : 'text-[11px] md:text-lg'} leading-none text-right mb-0.5`}>
              {totalQty.toLocaleString()}
            </div>
            {!isShuttle && (
               <div className="text-[10px] md:text-xs opacity-70 truncate w-full leading-tight">
                  {itemName} {otherCount > 0 && `+${otherCount}`}
              </div>
            )}
        </div>
      )}
    </button>
  );
};

// --- [Props] ---
interface Props {
  onClose: () => void;
  onSelect?: (locId: string) => void;
  isMultiMode?: boolean; 
  onSelectMulti?: (locIds: string[]) => void;
}

// 🚀 [추가] 'AISLE_VIEW' 단계 추가
type ViewStep = 'ZONES' | 'RACKS' | 'CELLS' | 'SHUTTLE_LEVELS' | 'AISLE_VIEW';
type WarehouseType = 'PRODUCTION' | 'LOGISTICS';

export default function LocationMapSelector({ onClose, onSelect, isMultiMode = false, onSelectMulti }: Props) {
  const supabase = createClient();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- 상태 관리 ---
  const [step, setStep] = useState<ViewStep>('ZONES');
  const [warehouseType, setWarehouseType] = useState<WarehouseType>('PRODUCTION');
  
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [selectedRack, setSelectedRack] = useState<string>("");
  const [selectedSide, setSelectedSide] = useState<string>("1"); 
  const [selectedLevel, setSelectedLevel] = useState<string>("1"); 

  const [selectedLocs, setSelectedLocs] = useState<string[]>([]);

  const isShuttleZone = (zone: string) => zone === 'L' || zone === 'J';

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
    }
    fetchLocs();
  }, []);

  // 2. 데이터 가공
  const { zonesMap, racksInZone, cellsInRack, zoneStats, rackStats, shuttleData, aisleData } = useMemo(() => {
    const filteredLocs = locations.filter(l => {
        const isLogis = (l.zone === '2F' || l.loc_id.startsWith('2F')); 
        return warehouseType === 'LOGISTICS' ? isLogis : !isLogis;
    });

    const zones = new Set<string>();
    const racks: Record<string, Set<string>> = {}; 
    
    const zStats: Record<string, { total: number, used: number }> = {};
    const rStats: Record<string, { total: number, used: number }> = {}; 

    filteredLocs.forEach(l => {
        const z = l.zone || 'ETC';
        zones.add(z);
        if (!racks[z]) racks[z] = new Set();
        racks[z].add(l.rack_no);

        if (!zStats[z]) zStats[z] = { total: 0, used: 0 };
        zStats[z].total++;

        const rackKey = `${z}-${l.rack_no}`; 
        if (!rStats[rackKey]) rStats[rackKey] = { total: 0, used: 0 };
        rStats[rackKey].total++;

        const qty = l.inventory?.reduce((acc:any, cur:any) => acc + cur.quantity, 0) || 0;
        if (qty > 0) {
            zStats[z].used++;
            rStats[rackKey].used++;
        }
    });

    const currentRacks = selectedZone ? Array.from(racks[selectedZone] || []).sort() : [];

    // [단일 모드 - 일반랙]
    const currentCells = filteredLocs.filter(l => 
        !isShuttleZone(l.zone) && l.zone === selectedZone && l.rack_no === selectedRack && l.side === selectedSide
    ).sort((a, b) => Number(b.level_no) - Number(a.level_no) || a.loc_id.localeCompare(b.loc_id));

    // [셔틀랙]
    let sLevels: string[] = [];
    let sRacks: string[] = [];
    let sDepths: number[] = [];
    let sGrid: Record<string, any> = {}; 

    if (isShuttleZone(selectedZone)) {
        const shuttleLocs = filteredLocs.filter(l => l.zone === selectedZone);
        sLevels = Array.from(new Set(shuttleLocs.map(l => l.level_no))).sort();
        
        const levelLocs = shuttleLocs.filter(l => l.level_no === selectedLevel);
        sRacks = Array.from(new Set(levelLocs.map(l => l.rack_no))).sort();
        
        const depths = levelLocs.map(l => Number(l.side)).filter(n => !isNaN(n));
        const maxDepth = depths.length > 0 ? Math.max(...depths) : 10; 
        sDepths = Array.from({length: maxDepth}, (_, i) => maxDepth - i); 

        levelLocs.forEach(l => {
            sGrid[`${l.rack_no}-${l.side}`] = l;
        });
    }

    // 🚀 [신규: 다중 모드 - 일반랙 통로 측면도]
    let aLevels: string[] = [];
    let aRacks: string[] = [];
    let aGrid: Record<string, any> = {};

    if (isMultiMode && !isShuttleZone(selectedZone)) {
        const aisleLocs = filteredLocs.filter(l => l.zone === selectedZone && l.side === selectedSide);
        aLevels = Array.from(new Set(aisleLocs.map(l => l.level_no))).sort((a, b) => Number(b) - Number(a)); // 4F, 3F, 2F, 1F 순
        aRacks = Array.from(new Set(aisleLocs.map(l => l.rack_no))).sort();

        aisleLocs.forEach(l => {
            aGrid[`${l.rack_no}-${l.level_no}`] = l; // Grid Key: Rack-Level
        });
    }

    return { 
        zonesMap: Array.from(zones).sort(), 
        racksInZone: currentRacks,
        cellsInRack: currentCells,
        zoneStats: zStats,
        rackStats: rStats,
        shuttleData: { levels: sLevels, racks: sRacks, depths: sDepths, grid: sGrid },
        aisleData: { levels: aLevels, racks: aRacks, grid: aGrid } // 🚀 통로 뷰 데이터
    };
  }, [locations, warehouseType, selectedZone, selectedRack, selectedSide, selectedLevel, isMultiMode]);

  // --- 핸들러 ---
  const handleZoneClick = (z: string) => {
      setSelectedZone(z);
      if (isShuttleZone(z)) {
          setSelectedLevel("1"); 
          setStep('SHUTTLE_LEVELS');
      } else {
          // 🚀 [핵심 분기] 멀티 모드면 열 선택을 건너뛰고 바로 통로 뷰로 진입
          if (isMultiMode) {
              setSelectedSide("1");
              setStep('AISLE_VIEW');
          } else {
              setStep('RACKS');
          }
      }
  };

  const handleRackClick = (r: string) => {
      setSelectedRack(r);
      setSelectedSide("1"); 
      setStep('CELLS');
  };

  const handleCellClick = (locId: string) => {
      if (isMultiMode) {
          setSelectedLocs(prev => 
              prev.includes(locId) ? prev.filter(id => id !== locId) : [...prev, locId]
          );
      } else {
          if (onSelect) onSelect(locId);
      }
  };

  const handleConfirmMulti = () => {
      if (onSelectMulti) onSelectMulti(selectedLocs);
  };

  const handleBack = () => {
      if (step === 'CELLS') setStep('RACKS');
      else if (step === 'RACKS' || step === 'SHUTTLE_LEVELS' || step === 'AISLE_VIEW') setStep('ZONES');
  };

  // --- 렌더링 ---
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-2 md:p-4 animate-fade-in">
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl w-full max-w-6xl h-[95vh] md:h-[90vh] flex flex-col shadow-2xl overflow-hidden font-[family-name:var(--font-geist-sans)]">
        
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
                        {step === 'ZONES' ? '위치 선택' 
                         : step === 'RACKS' ? `${selectedZone}랙 열 선택` 
                         : step === 'SHUTTLE_LEVELS' ? `${selectedZone}랙 셔틀 평면도`
                         : step === 'AISLE_VIEW' ? `${selectedZone}존 전체 통로 측면도`
                         : `${selectedZone}${selectedRack}랙 셀 선택`}
                    </h2>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                {isMultiMode && step !== 'ZONES' && step !== 'RACKS' && (
                    <button 
                        onClick={handleConfirmMulti}
                        disabled={selectedLocs.length === 0}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg text-sm transition"
                    >
                        {selectedLocs.length}개 확정
                    </button>
                )}
                <button onClick={onClose} className="p-2 text-gray-500 hover:text-white rounded-full"><X size={24}/></button>
            </div>
          </div>

          {step === 'ZONES' && (
             <div className="flex bg-black p-1 rounded-lg border border-gray-800 self-center w-full max-w-xs">
                <button onClick={() => setWarehouseType('PRODUCTION')} className={`flex-1 py-1.5 rounded text-xs md:text-sm font-bold transition-all ${warehouseType === 'PRODUCTION' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>생산창고</button>
                <button onClick={() => setWarehouseType('LOGISTICS')} className={`flex-1 py-1.5 rounded text-xs md:text-sm font-bold transition-all ${warehouseType === 'LOGISTICS' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-white'}`}>물류창고</button>
             </div>
          )}

          {/* 🚀 일반 랙의 단일 모드(CELLS) 또는 다중 모드(AISLE_VIEW)일 때 Side 선택 탭 표시 */}
          {(step === 'CELLS' || step === 'AISLE_VIEW') && (
             <div className="flex bg-black p-1 rounded-lg border border-gray-800 self-center w-full max-w-xs">
                <button onClick={() => setSelectedSide('1')} className={`flex-1 py-1.5 rounded text-xs md:text-sm font-bold transition-all ${selectedSide === '1' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'}`}>Side 1</button>
                <button onClick={() => setSelectedSide('2')} className={`flex-1 py-1.5 rounded text-xs md:text-sm font-bold transition-all ${selectedSide === '2' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-white'}`}>Side 2</button>
             </div>
          )}

          {step === 'SHUTTLE_LEVELS' && (
             <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1 px-1">
                 {shuttleData.levels.map(lvl => (
                     <button 
                        key={lvl}
                        onClick={() => setSelectedLevel(lvl)} 
                        className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all whitespace-nowrap border ${selectedLevel === lvl ? 'bg-blue-600 text-white border-blue-500' : 'bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-800'}`}
                     >
                         {lvl}F 평면도
                     </button>
                 ))}
             </div>
          )}
        </div>

        {/* 본문 컨텐츠 */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 md:p-6 bg-black relative">
            {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <div>맵 데이터 로딩...</div>
                </div>
            ) : (
                <>
                    {step === 'ZONES' && (
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2 md:gap-4">
                            {zonesMap.map(z => {
                                const stat = zoneStats[z] || { total: 1, used: 0 };
                                const percent = Math.round((stat.used / stat.total) * 100) || 0;
                                let barColor = percent > 80 ? "bg-red-500" : percent > 50 ? "bg-yellow-500" : "bg-green-500";
                                return (
                                    <button key={z} onClick={() => handleZoneClick(z)} className="bg-gray-900 border border-gray-800 rounded-lg flex flex-col items-center justify-between p-2 md:p-3 hover:border-blue-500 hover:bg-blue-900/10 transition-all group h-20 md:h-28">
                                        <div className="text-[11px] text-gray-500 self-start">Rack</div>
                                        <div className="text-xl md:text-3xl font-black text-gray-400 group-hover:text-blue-400">{z}</div>
                                        <div className="w-full space-y-1">
                                            <div className="flex justify-between text-[10px] text-gray-500 px-0.5"><span>{stat.used}/{stat.total}</span><span>{percent}%</span></div>
                                            <div className="w-full h-1 md:h-1.5 bg-black rounded-full overflow-hidden border border-gray-800"><div className={`h-full ${barColor}`} style={{ width: `${percent}%` }}></div></div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {step === 'RACKS' && (
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2 md:gap-4"> 
                            {racksInZone.map(r => {
                                const stat = rackStats[`${selectedZone}-${r}`] || { total: 1, used: 0 };
                                const percent = Math.round((stat.used / stat.total) * 100) || 0;
                                let barColor = percent > 80 ? "bg-red-500" : percent > 50 ? "bg-yellow-500" : "bg-green-500";
                                return (
                                    <button key={r} onClick={() => handleRackClick(r)} className="bg-[#1a1a1a] border border-gray-800 rounded-lg flex flex-col items-center justify-between p-2 md:p-3 hover:border-purple-500 transition-all group h-20 md:h-28">
                                        <div className="text-[10px] text-gray-500 self-start">열</div>
                                        <div className="text-xl md:text-3xl font-bold text-white group-hover:text-purple-300">{r}</div>
                                        <div className="w-full space-y-1">
                                            <div className="flex justify-between text-[9px] text-gray-500 px-0.5"><span>{stat.used}/{stat.total}</span><span>{percent}%</span></div>
                                            <div className="w-full h-1 md:h-1.5 bg-gray-800 rounded-full overflow-hidden"><div className={`h-full ${barColor}`} style={{ width: `${percent}%` }}></div></div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {/* [VIEW 3] 단일 모드 - 특정 랙의 셀 리스트 */}
                    {step === 'CELLS' && (
                        <div className="space-y-4 md:space-y-6">
                            {Array.from(new Set(cellsInRack.map(c => Number(c.level_no)))).sort((a,b) => b-a).map(lvl => (
                                <div key={lvl} className="flex flex-col md:flex-row gap-2 md:gap-4">
                                    <div className="w-full md:w-12 shrink-0 flex items-center justify-center bg-gray-900 border border-gray-800 rounded font-bold text-gray-500 text-xs md:text-sm py-1 md:py-0">
                                        {lvl}F
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 flex-1">
                                        {cellsInRack.filter(c => Number(c.level_no) === lvl).map(cell => {
                                            const qty = cell.inventory?.reduce((acc:any, cur:any) => acc + cur.quantity, 0) || 0;
                                            return (
                                                <SimpleCell 
                                                    key={cell.loc_id} locCode={cell.loc_id} inventory={cell.inventory || []} isEmpty={qty === 0}
                                                    onSelect={handleCellClick}
                                                    isMultiMode={isMultiMode}
                                                    isSelected={selectedLocs.includes(cell.loc_id)}
                                                />
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* [VIEW 4] 🚀 다중 모드 - 통로 전체 측면도 (Aisle View) */}
                    {step === 'AISLE_VIEW' && (
                        <div className="w-full overflow-x-auto custom-scrollbar pb-4">
                            <div className="min-w-max flex flex-col gap-1">
                                {/* Y축 (Level) 헤더 및 그리드 */}
                                {aisleData.levels.map(lvl => (
                                    <div key={`level-${lvl}`} className="flex gap-1 items-center">
                                        <div className="w-8 md:w-10 text-[10px] md:text-xs text-gray-500 font-bold text-center shrink-0">
                                            {lvl}F
                                        </div>
                                        
                                        {aisleData.racks.map(r => {
                                            const cellData = aisleData.grid[`${r}-${lvl}`];
                                            
                                            if (!cellData) {
                                                return <div key={`empty-${r}-${lvl}`} className="w-16 md:w-20 h-14 md:h-24 bg-transparent border border-gray-800/30 border-dashed rounded opacity-30"></div>;
                                            }

                                            const qty = cellData.inventory?.reduce((acc:any, cur:any) => acc + cur.quantity, 0) || 0;
                                            return (
                                                <div key={cellData.loc_id} className="w-16 md:w-20">
                                                    <SimpleCell 
                                                        locCode={cellData.loc_id}
                                                        inventory={cellData.inventory || []}
                                                        isEmpty={qty === 0}
                                                        onSelect={handleCellClick}
                                                        isMultiMode={isMultiMode}
                                                        isSelected={selectedLocs.includes(cellData.loc_id)}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}

                                {/* X축 (Rack 번호) 하단 레이블 */}
                                <div className="flex gap-1 items-center mt-2 border-t border-gray-800 pt-2">
                                    <div className="w-8 md:w-10 shrink-0"></div>
                                    {aisleData.racks.map(r => (
                                        <div key={`label-${r}`} className="w-16 md:w-20 text-center font-bold text-purple-500 text-[10px] md:text-sm">
                                            {r}열
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* [VIEW 5] 셔틀랙 Top-Down 평면도 */}
                    {step === 'SHUTTLE_LEVELS' && (
                        <div className="w-full overflow-x-auto custom-scrollbar pb-4">
                            <div className="min-w-max flex flex-col gap-1">
                                {shuttleData.depths.map(d => (
                                    <div key={`depth-${d}`} className="flex gap-1 items-center">
                                        <div className="w-6 text-[10px] text-gray-600 font-mono text-center shrink-0">D{d}</div>
                                        {shuttleData.racks.map(r => {
                                            const cellData = shuttleData.grid[`${r}-${d}`];
                                            if (!cellData) {
                                                return <div key={`empty-${r}-${d}`} className="w-16 md:w-20 h-12 md:h-16 bg-transparent border border-gray-800/30 border-dashed rounded opacity-30"></div>;
                                            }

                                            const qty = cellData.inventory?.reduce((acc:any, cur:any) => acc + cur.quantity, 0) || 0;
                                            return (
                                                <div key={cellData.loc_id} className="w-16 md:w-20">
                                                    <SimpleCell 
                                                        locCode={cellData.loc_id}
                                                        inventory={cellData.inventory || []}
                                                        isEmpty={qty === 0}
                                                        onSelect={handleCellClick}
                                                        isShuttle={true}
                                                        isMultiMode={isMultiMode}
                                                        isSelected={selectedLocs.includes(cellData.loc_id)}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}

                                <div className="flex gap-1 items-center mt-2 border-t border-gray-800 pt-2">
                                    <div className="w-6 shrink-0"></div>
                                    {shuttleData.racks.map(r => (
                                        <div key={`label-${r}`} className="w-16 md:w-20 text-center font-black text-yellow-600 text-sm md:text-base">
                                            {r}열
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>
    </div>
  );
}