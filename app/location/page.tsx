"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Map, RefreshCw } from "lucide-react"; 
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
  const [selectedRackM, setSelectedRackM] = useState<string | null>(null);

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
          } else if (initialZoneParam) {
              setActiveZone('M');
              const exists = typedData.some(l => l.zone === initialZoneParam);
              if (exists) setSelectedRackM(initialZoneParam);
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
    // 🚀 [톤업] bg-black -> bg-slate-950
    <div className="p-2 md:p-8 bg-slate-950 min-h-screen text-slate-100 font-[family-name:var(--font-geist-sans)] pb-32">
      
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 mb-4 md:mb-8 border-b border-slate-800 pb-3 md:pb-6">
        <div>
          <h1 className="text-xl md:text-3xl font-black flex items-center gap-2 md:gap-3 tracking-tight">
            <Map className="text-blue-500 w-6 h-6 md:w-8 md:h-8" /> 
            <span>P2DX 창고 맵 (Live)</span>
          </h1>
          <p className="hidden md:block text-sm text-slate-400 mt-2 ml-1">
            실시간 재고 현황을 시각화한 디지털 트윈 맵입니다.
          </p>
        </div>
        
        {/* 탭 버튼 */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 w-full md:w-auto">
            <button 
                onClick={() => setActiveZone('M')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg text-sm md:text-base font-bold transition-all ${activeZone === 'M' ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50" : "text-slate-400 hover:text-white"}`}
            >
                🏭 생산팀 (랙)
            </button>
            <button 
                onClick={() => setActiveZone('2F')}
                className={`flex-1 md:flex-none px-4 md:px-6 py-2 rounded-lg text-sm md:text-base font-bold transition-all ${activeZone === '2F' ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50" : "text-slate-400 hover:text-white"}`}
            >
                🚛 물류팀 (2F)
            </button>
        </div>
      </div>

      {activeZone === '2F' ? (
        <div className="animate-fade-in">
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
      ) : (
        // 🚀 [톤업] 맵 컨테이너
        <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-2 md:p-12 min-h-[500px] md:min-h-[900px] flex items-center justify-center relative overflow-hidden animate-fade-in group shadow-inner">
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.4 }}></div>
            
            <ZoneViewM locations={locations} onRackClick={setSelectedRackM} />

            {selectedRackM && (
                <RackDetailModal 
                    rackName={selectedRackM} 
                    locations={locations.filter(l => l.zone === selectedRackM)} 
                    onClose={() => setSelectedRackM(null)} 
                />
            )}
        </div>
      )}
    </div>
  );
}

function ZoneViewM({ locations, onRackClick }: { locations: LocationData[], onRackClick: (id: string) => void }) {
    const { toast } = useUI(); 

    const activeRacks = useMemo(() => new Set(locations.filter(l => l.zone !== '2F').map(l => l.zone)), [locations]);

    const getRackStats = (rackId: string) => {
        const rackLocs = locations.filter(l => l.zone === rackId);
        const total = rackLocs.length;
        if (total === 0) return { total: 0, used: 0, percent: 0 };
        const used = rackLocs.filter(l => l.inventory && l.inventory.length > 0 && l.inventory[0].quantity > 0).length;
        return { total, used, percent: Math.round((used / total) * 100) };
    };

    const handleRackClick = (rackId: string) => {
        if (activeRacks.has(rackId)) {
            onRackClick(rackId);
        } else {
            toast.error(`[Rack ${rackId}] 데이터가 시스템에 없습니다.`);
        }
    };

    const renderRack = (id: string, className: string = "") => {
        const isActive = activeRacks.has(id);
        const hasStock = locations.some(l => l.zone === id && l.inventory && l.inventory.length > 0 && l.inventory[0].quantity > 0);
        const stats = getRackStats(id);
        const percentColor = stats.percent > 80 ? "text-red-400" : (stats.percent > 50 ? "text-yellow-400" : "text-slate-400");

        // 🚀 [톤업] 활성/비활성 랙 색상 톤업 적용
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
            
            {/* 범례 */}
            <div className="w-full flex justify-center xl:justify-start mb-6 md:mb-12 px-2 xl:px-0">
                <div className="text-[10px] md:text-sm text-slate-300 flex flex-wrap items-center gap-3 md:gap-6 bg-slate-900/80 backdrop-blur-md p-2 md:p-4 rounded-xl border border-slate-700 shadow-xl">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 md:w-4 md:h-4 bg-purple-900/50 border border-purple-500 rounded"></span> 재고 보유</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 md:w-4 md:h-4 bg-slate-700 border border-slate-500 rounded"></span> 빈 랙 (활성)</div>
                    <div className="flex items-center gap-2"><span className="w-2 h-2 md:w-4 md:h-4 bg-slate-800/50 border border-slate-700/50 rounded"></span> 비활성</div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-8 xl:gap-32 justify-center items-start w-full">
                {/* [왼쪽 블록] 랙 그리드 */}
                <div className="grid grid-cols-12 gap-1 md:gap-4 gap-y-4 md:gap-y-10 flex-1 w-full max-w-6xl mx-auto">
                    
                    <div className="col-span-2 h-10 md:h-20">{renderRack("S", "h-full")}</div>
                    <div className="col-span-8 h-10 md:h-20">{renderRack("R", "h-full")}</div>
                    <div className="col-span-2 h-10 md:h-20">{renderRack("Q", "h-full")}</div>

                    <div className="col-span-2 h-10 md:h-20">{renderRack("P", "h-full")}</div>
                    <div className="col-span-8 h-10 md:h-20">{renderRack("O", "h-full")}</div>
                    <div className="col-span-2 h-10 md:h-20">{renderRack("N", "h-full")}</div>

                    <div className="col-span-2 h-[14rem] md:h-[30rem]">{renderRack("M", "h-full text-lg md:text-3xl")}</div>
                    <div className="col-span-8 h-[14rem] md:h-[30rem]">{renderRack("L", "h-full text-2xl md:text-6xl tracking-widest bg-purple-900/30 border-purple-500/60")}</div>
                    <div className="col-span-2 h-[14rem] md:h-[30rem]">{renderRack("K", "h-full text-lg md:text-3xl")}</div>

                    <div className="col-start-4 col-span-6 h-16 md:h-32">
                        {renderRack("J", "h-full text-xl md:text-4xl")}
                    </div>
                </div>

                {/* [오른쪽 블록] 세로 랙 리스트 */}
                <div className="flex flex-col items-center xl:items-end w-full lg:w-auto flex-shrink-0 gap-3 md:gap-6 mt-6 xl:mt-0">
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
    
    // 🚀 [톤업]
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