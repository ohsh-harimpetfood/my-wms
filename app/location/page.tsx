"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Map, RefreshCw, PackageOpen } from "lucide-react"; 
import RackDetailModal, { LocationData } from "@/components/RackDetailModal";
import { getAllLocations } from "@/utils/wms"; 
import { useUI } from "@/context/UIProvider"; 

interface RackStats {
  rackName: string;
  totalCells: number;
  usedCells: number;
  occupancyRate: number; 
}

export default function LocationPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center bg-slate-950 text-slate-200">로딩 중...</div>}>
      <LocationContent />
    </Suspense>
  );
}

function LocationContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialZoneParam = searchParams.get("zone");
  const { toast } = useUI(); 

  const [locations, setLocations] = useState<LocationData[]>([]);
  const [occupiedLocs, setOccupiedLocs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const [activeZone, setActiveZone] = useState<string>("M"); 
  const [selectedRack2F, setSelectedRack2F] = useState<string | null>(null); 
  const [selectedMapLoc, setSelectedMapLoc] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const allData = await getAllLocations(supabase); 
        
        if (allData.length > 0) {
          const typedData = allData as LocationData[];
          setLocations(typedData);

          const occupied = new Set(
            typedData
              .filter(l => l.inventory && l.inventory.length > 0 && l.inventory[0].quantity > 0)
              .map(l => l.loc_id)
          );
          setOccupiedLocs(occupied);

          if (initialZoneParam === '2F') {
              setActiveZone('2F');
          } else if (initialZoneParam === 'FREEZER') {
              setActiveZone('FREEZER');
          } else if (initialZoneParam) {
              setActiveZone('M');
              const exists = typedData.some(l => l.zone === initialZoneParam);
              if (exists) setSelectedMapLoc(initialZoneParam);
          }
        }
      } catch (error) {
        console.error("데이터 로드 실패:", error);
        toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [initialZoneParam, toast, supabase]); 

  const getRackStats = (rackName: string): RackStats => {
    const rackLocs = locations.filter(l => l.zone === '2F' && l.rack_no === rackName);
    const total = rackLocs.length;
    const used = rackLocs.filter(l => occupiedLocs.has(l.loc_id)).length;
    return { 
        rackName, 
        totalCells: total, 
        usedCells: used, 
        occupancyRate: total === 0 ? 0 : Math.round((used / total) * 100) 
    };
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-200 gap-4">
      <Loader size={48} className="animate-spin text-blue-500" />
      <p className="animate-pulse text-slate-400">창고 데이터를 동기화 중입니다...</p>
    </div>
  );

  return (
    <div className="p-2 md:p-8 bg-slate-950 min-h-screen text-slate-100 font-[family-name:var(--font-geist-sans)] pb-32">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-4 md:mb-8 border-b border-slate-800 pb-3 md:pb-6 sticky top-0 bg-slate-950 z-30 pt-2">
        <div>
          <h1 className="text-xl md:text-3xl font-black flex items-center gap-2 md:gap-3 tracking-tight">
            <Map className="text-blue-500 w-6 h-6 md:w-8 md:h-8" /> 
            <span>P2DX 창고 맵 (Live)</span>
          </h1>
          <p className="hidden md:block text-sm text-slate-400 mt-2 ml-1">
            실시간 재고 현황을 시각화한 디지털 트윈 맵입니다.
          </p>
        </div>
        
        <div className="flex flex-wrap md:flex-nowrap bg-slate-800 p-1 rounded-xl border border-slate-700 w-full md:w-auto gap-1">
            <button 
                onClick={() => { setActiveZone('M'); setSelectedMapLoc(null); }}
                className={`flex-1 md:flex-none px-3 md:px-6 py-2 rounded-lg text-xs md:text-base font-bold transition-all whitespace-nowrap ${activeZone === 'M' ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50" : "text-slate-400 hover:text-white"}`}
            >
                🏭 생산팀 (랙)
            </button>
            <button 
                onClick={() => setActiveZone('2F')}
                className={`flex-1 md:flex-none px-3 md:px-6 py-2 rounded-lg text-xs md:text-base font-bold transition-all whitespace-nowrap ${activeZone === '2F' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "text-slate-400 hover:text-white"}`}
            >
                🚛 물류팀 (2F)
            </button>
            <button 
                onClick={() => { setActiveZone('FREEZER'); setSelectedMapLoc(null); }}
                className={`flex-1 md:flex-none px-3 md:px-6 py-2 rounded-lg text-xs md:text-base font-bold transition-all whitespace-nowrap ${activeZone === 'FREEZER' ? "bg-cyan-600 text-white shadow-lg shadow-cyan-900/50" : "text-slate-400 hover:text-white"}`}
            >
                ❄️ 냉동 컨테이너
            </button>
        </div>
      </div>

      {activeZone === 'FREEZER' && (
        // 🚀 수정 포인트: flex justify-center 속성 제거
        <div className="animate-fade-in bg-slate-900/50 border border-slate-800 rounded-2xl p-4 md:p-6 min-h-[600px] md:min-h-[700px] overflow-x-auto custom-scrollbar">
            {/* 🚀 수정 포인트: w-fit mx-auto 래퍼를 씌워 PC 중앙 정렬 & 모바일 좌측 정렬(스크롤 방어) 동시 만족 */}
            <div className="w-fit mx-auto">
                <ZoneViewFreezer locations={locations} onLocClick={setSelectedMapLoc} />
            </div>
            
            {selectedMapLoc && selectedMapLoc.startsWith('CT-') && (
                <RackDetailModal 
                    rackName={`Container ${selectedMapLoc.split('-')[2]}`} 
                    locations={locations.filter(l => l.loc_id.startsWith(selectedMapLoc.substring(0, 10)))} 
                    onClose={() => setSelectedMapLoc(null)} 
                />
            )}
        </div>
      )}

      {activeZone === '2F' && (
        <div className="animate-fade-in p-1">
              <div className="flex flex-col xl:flex-row gap-4 md:gap-10">
                <div className="hidden xl:flex w-32 flex-col gap-6 text-center text-slate-500 text-sm font-bold flex-shrink-0 pt-4">
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl h-40 flex items-center justify-center shadow-inner">화물<br/>리프트</div>
                </div>
                
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-8 auto-rows-max">
                    {['A', 'B', 'C', 'D', 'E', 'F'].map(rack => {
                        const stats = getRackStats(rack);
                        if (stats.totalCells === 0) return null; 
                        return <RackOverviewCard key={rack} stats={stats} onClick={() => setSelectedRack2F(rack)} />;
                    })}
                    {locations.filter(l => l.zone === '2F').length === 0 && (
                        <div className="col-span-full text-center py-20 text-slate-500 border border-slate-800 rounded-xl bg-slate-900/50">
                            데이터가 없습니다.
                        </div>
                    )}
                </div>
            </div>
            {selectedRack2F && (
                <RackDetailModal 
                    rackName={selectedRack2F} 
                    locations={locations.filter(l => l.zone === '2F' && l.rack_no === selectedRack2F)} 
                    onClose={() => setSelectedRack2F(null)} 
                />
            )}
        </div>
      )}
      
      {activeZone === 'M' && (
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-2 md:p-12 min-h-[500px] md:min-h-[900px] flex items-center justify-center relative overflow-hidden animate-fade-in group shadow-inner">
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.4 }}></div>
            
            <ZoneViewM locations={locations} onRackClick={setSelectedMapLoc} />

            {selectedMapLoc && !selectedMapLoc.startsWith('CT-') && ( 
                <RackDetailModal 
                    rackName={selectedMapLoc} 
                    locations={selectedMapLoc === 'VIR-STG' 
                        ? locations.filter(l => l.loc_id.startsWith('VIR-STG')) 
                        : locations.filter(l => l.zone === selectedMapLoc)
                    } 
                    onClose={() => setSelectedMapLoc(null)} 
                />
            )}
        </div>
      )}
    </div>
  );
}

// 🚀 냉동 컨테이너 맵
function ZoneViewFreezer({ locations, onLocClick }: { locations: LocationData[], onLocClick: (id: string) => void }) {
    const freezerLocs = useMemo(() => locations.filter(l => l.loc_type === 'Freezer'), [locations]);

    const contMap: Record<string, string> = {
        "1번": "CT-LOG-01-20", "2번": "CT-P1-02-20", "3번": "CT-P1-03-40",
        "4번": "CT-P1-04-40", "5번": "CT-P1-05-40", "6번": "CT-P2-06-40",
        "7번": "CT-P2-07-40", "8번": "CT-P2-08-40", "9번": "CT-P2-09-40",
        "10번": "CT-LOG-10-40", "11번": "CT-LOG-11-20", "12번": "CT-LOG-12-20", "13번": "CT-P1-13-20"
    };

    const getContStats = (fullLocCode: string) => {
        const prefix = fullLocCode.substring(0, 10);
        const contLocs = freezerLocs.filter(l => l.loc_id.startsWith(prefix)); 
        
        const sizeMatch = fullLocCode.match(/-(\d{2})$/);
        const containerSize = sizeMatch ? parseInt(sizeMatch[1]) : 40;
        const maxCapa = containerSize === 20 ? 8 : 20;

        const palletSet = new Set<string>();
        let legacyCount = 0;

        contLocs.forEach(loc => {
            if (loc.inventory && loc.inventory.length > 0) {
                loc.inventory.forEach(item => {
                    if (item.quantity > 0) {
                        if (item.pallet_id) {
                            palletSet.add(item.pallet_id);
                        } else {
                            legacyCount++;
                        }
                    }
                });
            }
        });

        const currentPallets = palletSet.size + legacyCount;
        const percent = Math.min(100, Math.round((currentPallets / maxCapa) * 100));

        return { 
            percent, 
            used: currentPallets,
            hasStock: currentPallets > 0
        };
    };

    const renderContainer = (sketchNo: string, positionClasses: string) => {
        const fullLocCode = contMap[sketchNo]; 
        if (!fullLocCode) return null;

        const stats = getContStats(fullLocCode);
        const hasStock = stats.hasStock;
        const size = fullLocCode.split('-')[3];

        return (
            <div 
                key={sketchNo}
                onClick={() => onLocClick(fullLocCode.substring(0, 10))}
                className={`
                    absolute flex flex-col items-center justify-center 
                    rounded-lg border shadow-lg transition-all cursor-pointer select-none z-10 hover:z-20
                    ${hasStock 
                        ? "bg-amber-900/40 border-amber-500/80 text-amber-200 hover:bg-amber-800 hover:scale-105" 
                        : "bg-slate-800/80 border-slate-600/80 text-slate-400 hover:border-slate-400 hover:bg-slate-700/80"} 
                    ${positionClasses}
                `}
            >
                <div className="flex items-center gap-1">
                    <span className="font-black text-xl md:text-2xl">{sketchNo.replace('번', '')}</span>
                    <span className="text-[9px] text-slate-500 font-mono">#{fullLocCode.split('-')[1]}</span>
                </div>
                <div className={`mt-0.5 text-[10px] font-mono ${hasStock ? 'text-amber-300 font-bold' : 'text-slate-500'}`}>
                    {hasStock ? `${stats.percent}%` : "비어있음"}
                </div>
                
                <span className={`absolute -top-2 -right-2 px-1.5 py-0.5 rounded text-[8px] font-bold ${size === '40' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}>
                    {size}ft
                </span>
            </div>
        );
    };

    return (
        <div className="w-[1000px] h-[600px] relative shrink-0">
            {/* 중앙 건물 */}
            <div className="absolute top-[180px] left-[130px] w-[800px] h-[240px] bg-slate-800 border-2 border-slate-700 rounded-3xl flex items-center justify-center shadow-inner">
                <span className="text-4xl md:text-5xl font-black text-slate-600/50 tracking-tight">하림펫푸드</span>
            </div>

            {/* 좌측 세로 그룹 (6번, 1번) */}
            {renderContainer("6번", "top-[200px] left-[20px] w-[90px] h-[100px]")}
            {renderContainer("1번", "top-[320px] left-[20px] w-[90px] h-[100px]")}

            {/* 상단 그룹 */}
            {renderContainer("2번", "top-[100px] left-[130px] w-[110px] h-[70px]")}
            
            {renderContainer("13번", "top-[20px] left-[270px] w-[120px] h-[70px]")}
            {renderContainer("3번", "top-[100px] left-[270px] w-[120px] h-[70px]")}
            
            {renderContainer("4번", "top-[20px] left-[430px] w-[120px] h-[70px]")}
            {renderContainer("5번", "top-[100px] left-[430px] w-[120px] h-[70px]")}
            
            {renderContainer("7번", "top-[20px] left-[660px] w-[120px] h-[70px]")}
            {renderContainer("8번", "top-[100px] left-[660px] w-[120px] h-[70px]")}

            {/* 상단 우측 */}
            {renderContainer("9번", "top-[20px] left-[810px] w-[120px] h-[70px]")}

            {/* 우측 하단 세로 그룹 (10번, 11번, 12번) */}
            {renderContainer("10번", "top-[440px] left-[660px] w-[90px] h-[110px]")}
            {renderContainer("11번", "top-[440px] left-[770px] w-[90px] h-[110px]")}
            {renderContainer("12번", "top-[440px] left-[880px] w-[90px] h-[110px]")}
        </div>
    );
}

function ZoneViewM({ locations, onRackClick }: { locations: LocationData[], onRackClick: (id: string) => void }) {
    const { toast } = useUI(); 

    const activeRacks = useMemo(() => new Set(locations.filter(l => l.zone !== '2F' && l.loc_type !== 'Virtual').map(l => l.zone)), [locations]);

    const getRackStats = (rackId: string) => {
        const rackLocs = locations.filter(l => l.zone === rackId);
        const total = rackLocs.length;
        if (total === 0) return { total: 0, used: 0, percent: 0 };
        const used = rackLocs.filter(l => l.inventory && l.inventory.length > 0 && l.inventory[0].quantity > 0).length;
        return { total, used, percent: Math.round((used / total) * 100) };
    };

    const handleRackClick = (rackId: string) => {
        if (activeRacks.has(rackId) || rackId === 'VIR-STG') { 
            onRackClick(rackId);
        } else {
            toast.error(`[Rack ${rackId}] 데이터가 시스템에 없습니다.`);
        }
    };

    const renderVirtualStaging = (className: string = "") => {
        const stagingLocs = locations.filter(l => l.loc_id.startsWith('VIR-STG'));
        const totalPallets = stagingLocs.reduce((sum, l) => {
            const qty = l.inventory && l.inventory.length > 0 ? l.inventory.reduce((qSum, inv) => qSum + inv.quantity, 0) : 0;
            return sum + qty;
        }, 0);
        const hasStock = totalPallets > 0;

        return (
            <div 
                onClick={() => handleRackClick('VIR-STG')}
                className={`
                    flex flex-col items-center justify-center md:justify-between py-2 md:py-3
                    rounded-lg md:rounded-xl shadow-lg border-2 border-dashed transition-all cursor-pointer select-none 
                    ${hasStock 
                        ? "bg-amber-900/20 border-amber-500/50 text-amber-200 hover:bg-amber-900/40 hover:scale-105" 
                        : "bg-slate-800/30 border-slate-600/50 text-slate-500 hover:border-slate-500 hover:bg-slate-800/50"
                    } 
                    ${className}
                `}
            >
                {/* ========================================== */}
                {/* 📱 모바일 (좁은 세로 공간에 맞춘 초정밀 심플 뷰) */}
                {/* ========================================== */}
                <div className="md:hidden flex flex-col items-center justify-center w-full h-full gap-1">
                    <span className="text-[10px] font-bold opacity-80">대기장</span>
                    <span className={`text-2xl font-black font-mono leading-none tracking-tighter ${hasStock ? 'text-amber-400' : 'text-slate-600'}`}>
                        {totalPallets}
                    </span>
                </div>

                {/* ========================================== */}
                {/* 💻 PC (넓은 공간을 활용한 기존의 예쁜 상세 뷰) */}
                {/* ========================================== */}
                <div className="hidden md:flex flex-col items-center justify-between h-full w-full">
                    <div className="font-bold text-sm tracking-tight w-full text-center opacity-80">바닥 대기장</div>
                    <div className={`w-full border-b border-dashed my-1 ${hasStock ? 'border-amber-500/30' : 'border-slate-700'}`}></div>
                    <div className={`text-3xl md:text-5xl font-black font-mono leading-none tracking-tighter my-auto ${hasStock ? 'text-amber-400 drop-shadow-md' : 'text-slate-700'}`}>
                        {totalPallets.toLocaleString()}
                    </div>
                    <div className={`text-[10px] mt-auto whitespace-nowrap opacity-60`}>
                        현재 대기 중 (파렛트)
                    </div>
                </div>
            </div>
        );
    };

    const renderRack = (id: string, className: string = "") => {
        const isActive = activeRacks.has(id);
        const hasStock = locations.some(l => l.zone === id && l.inventory && l.inventory.length > 0 && l.inventory[0].quantity > 0);
        const stats = getRackStats(id);
        const percentColor = stats.percent > 80 ? "text-red-400" : (stats.percent > 50 ? "text-yellow-400" : "text-slate-400");

        return (
            <div 
                onClick={() => handleRackClick(id)}
                className={`
                    flex flex-col items-center justify-center 
                    rounded md:rounded-lg shadow-lg border md:border-2 transition-all cursor-pointer select-none relative
                    ${isActive 
                        ? hasStock 
                            ? "bg-purple-900/50 border-purple-500 text-purple-200 hover:bg-purple-800/70 hover:scale-105 hover:shadow-[0_0_20px_rgba(168,85,247,0.6)]" 
                            : "bg-slate-700 border-slate-500 text-slate-300 hover:border-slate-400 hover:bg-slate-600"
                        : "bg-slate-800/50 border-slate-700/50 text-slate-500 cursor-not-allowed"} 
                    ${className}
                `}
            >
                <span className="font-bold leading-none text-sm md:text-2xl">{id}</span>
                
                {isActive && stats.total > 0 && (
                    <span className={`text-[9px] md:text-sm font-mono mt-0.5 md:mt-1 ${percentColor} opacity-90`}>
                        {stats.percent}%
                    </span>
                )}

                {isActive && hasStock && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2 md:h-4 md:w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 md:h-4 md:w-4 bg-green-500"></span>
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="w-full max-w-[100rem] relative z-10 my-2 flex flex-col items-center xl:block">
            
            <div className="w-full flex justify-center xl:justify-start mb-6 md:mb-12 px-2 xl:px-0">
                <div className="text-[10px] md:text-sm text-slate-300 flex flex-wrap items-center gap-3 md:gap-6 bg-slate-900/80 backdrop-blur-md p-2 md:p-4 rounded-xl border border-slate-700 shadow-xl">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 md:w-4 md:h-4 bg-purple-900/50 border border-purple-500 rounded"></span> 재고 보유</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 md:w-4 md:h-4 bg-slate-700 border border-slate-500 rounded"></span> 빈 랙 (활성)</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 md:w-4 md:h-4 bg-slate-800/50 border border-slate-700/50 rounded"></span> 비활성</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 md:w-4 md:h-4 border-2 border-dashed border-amber-500 bg-amber-900/30 rounded"></span> 가상 구역</div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 xl:gap-32 justify-center items-start w-full">
                <div className="grid grid-cols-12 gap-1 md:gap-4 gap-y-4 md:gap-y-10 flex-1 w-full max-w-6xl mx-auto">
                    
                    <div className="col-span-2 h-10 md:h-20">{renderRack("S", "h-full")}</div>
                    <div className="col-span-8 h-10 md:h-20">{renderRack("R", "h-full")}</div>
                    <div className="col-span-2 h-10 md:h-20">{renderRack("Q", "h-full")}</div>

                    <div className="col-span-2 h-10 md:h-20">{renderRack("P", "h-full")}</div>
                    <div className="col-span-8 h-10 md:h-20">{renderRack("O", "h-full")}</div>
                    <div className="col-span-2 h-10 md:h-20">{renderRack("N", "h-full")}</div>

                    <div className="col-span-2 h-[14rem] md:h-[30rem]">{renderRack("M", "h-full text-lg md:text-3xl")}</div>
                    <div className="col-span-8 h-[14rem] md:h-[30rem]">{renderRack("L", "h-full text-2xl md:text-6xl background-color: purple-900/30 border-purple-500/60")}</div>
                    <div className="col-span-2 h-[14rem] md:h-[30rem]">{renderRack("K", "h-full text-lg md:text-3xl")}</div>

                    <div className="col-span-2 h-24 md:h-36 col-start-1 mt-4 md:mt-8 pr-1">
                        {renderVirtualStaging("h-full w-full")}
                    </div>

                    <div className="col-start-4 col-span-6 h-16 md:h-32 mt-4 md:mt-8">
                        {renderRack("J", "h-full text-xl md:text-4xl")}
                    </div>
                </div>

                <div className="flex flex-col items-center xl:items-end w-full lg:w-auto flex-shrink-0 gap-3 md:gap-6 mt-6 xl:mt-0 pt-1">
                    <div className="w-full xl:w-96 h-10 md:h-16">{renderRack("I", "h-full text-lg md:text-2xl w-full")}</div>
                    <div className="h-4 md:h-12 w-full xl:w-72 border-b border-dashed border-slate-600 mb-1 xl:mr-0 opacity-50"></div>
                    <div className="w-full xl:w-80 flex flex-col gap-3 md:gap-6">
                        {['H','G','F','E','D','C','B','A'].map((r) => (
                            <div key={r} className={`w-full h-10 md:h-16 ${r==='E' ? 'mb-4 md:mb-10' : ''}`}>
                                {renderRack(r, "h-full text-base md:text-2xl w-full")}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Loader({ size, className }: { size: number, className: string }) {
    return <RefreshCw size={size} className={className} />;
}

function RackOverviewCard({ stats, onClick }: { stats: RackStats, onClick: () => void }) {
    let statusColor = "bg-green-500"; 
    if (stats.occupancyRate > 80) statusColor = "bg-red-500"; 
    else if (stats.occupancyRate > 50) statusColor = "bg-yellow-500"; 
    
    return (
        <div onClick={onClick} className="group bg-slate-800 border border-slate-700/80 p-5 md:p-8 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-slate-700 transition relative overflow-hidden shadow-lg">
            <div className="flex justify-between items-start mb-4 md:mb-6">
                <div>
                    <h3 className="text-xl md:text-3xl font-black text-slate-100 group-hover:text-blue-400 transition">Rack {stats.rackName}</h3>
                    <div className="text-slate-400 text-xs md:text-sm mt-1">총 {stats.totalCells}개 셀</div>
                </div>
                <div className="text-right">
                    <div className="text-lg md:text-3xl font-bold text-white">{stats.occupancyRate}%</div>
                    <div className="text-[10px] md:text-xs text-slate-400">점유율</div>
                </div>
            </div>
            <div className="w-full bg-slate-900 rounded-full h-2 md:h-4 border border-slate-700 overflow-hidden shadow-inner">
                <div className={`h-full ${statusColor} transition-all duration-1000 ease-out`} style={{ width: `${stats.occupancyRate}%` }}></div>
            </div>
        </div>
    );
}