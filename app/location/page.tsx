"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Map } from "lucide-react"; 
import RackDetailModal, { LocationData } from "@/components/RackDetailModal";
import { getAllLocations } from "@/utils/wms"; 
import { useUI } from "@/context/UIProvider"; 

interface RackStats {
  rackName: string;
  totalCells: number;
  usedCells: number;
  occupancyRate: number; 
}

// ==================================================================================
// 1. 메인 페이지 컴포넌트 (Suspense 적용)
// ==================================================================================
export default function LocationPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-white">로딩 중...</div>}>
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

  // 뷰 상태 관리
  const [activeZone, setActiveZone] = useState<string>("M"); 
  const [selectedRack2F, setSelectedRack2F] = useState<string | null>(null); 
  const [selectedRackM, setSelectedRackM] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const allData = await getAllLocations(supabase); 
        
        console.log(`✅ 총 ${allData.length}개의 로케이션 데이터를 로드했습니다.`); 
        
        if (allData.length > 0) {
          // any 타입 제거 및 LocationData로 단언
          const typedData = allData as LocationData[];
          setLocations(typedData);

          // 재고가 있는 로케이션 ID 추출
          const occupied = new Set(
            typedData
              .filter(l => l.inventory && l.inventory.length > 0 && l.inventory[0].quantity > 0)
              .map(l => l.loc_id)
          );
          setOccupiedLocs(occupied);

          // 초기 파라미터 처리 (예: ?zone=L)
          if (initialZoneParam === '2F') {
              setActiveZone('2F');
          } else if (initialZoneParam) {
             // 2F가 아닌 다른 Zone(예: A)이 들어오면 생산팀 뷰로 전환하고 해당 랙 모달 오픈
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
    // 2F 로직: Zone은 '2F', Rack 번호로 구분
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
    <div className="h-screen flex flex-col items-center justify-center bg-black text-white gap-4">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="animate-pulse">시스템 데이터 동기화 중...</p>
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)] pb-24">
      
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Map className="text-blue-500" /> P2DX 창고 맵 (Live Map)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            실시간 재고 데이터가 연동된 디지털 트윈(Digital Twin) 맵입니다.
          </p>
        </div>
        
        <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button 
                onClick={() => setActiveZone('M')}
                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeZone === 'M' ? "bg-purple-600 text-white shadow shadow-purple-500/50" : "text-gray-400 hover:text-white"}`}
            >
                🏭 생산팀 (랙)
            </button>
            <button 
                onClick={() => setActiveZone('2F')}
                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeZone === '2F' ? "bg-blue-600 text-white shadow shadow-blue-500/50" : "text-gray-400 hover:text-white"}`}
            >
                🚛 물류팀 (2F)
            </button>
        </div>
      </div>

      {/* 뷰 분기점 */}
      {activeZone === '2F' ? (
        <div className="animate-fade-in">
              <div className="flex flex-col xl:flex-row gap-8">
                {/* 왼쪽: 리프트 영역 */}
                <div className="hidden xl:flex w-24 flex-col gap-6 text-center text-gray-500 text-sm font-bold flex-shrink-0 pt-4">
                    <div className="bg-gray-800/30 border border-gray-700 rounded h-32 flex items-center justify-center">화물<br/>리프트</div>
                </div>
                
                {/* 메인: 랙 리스트 */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">
                    {['A', 'B', 'C', 'D', 'E', 'F'].map(rack => {
                        const stats = getRackStats(rack);
                        if (stats.totalCells === 0) return null; 
                        return <RackOverviewCard key={rack} stats={stats} onClick={() => setSelectedRack2F(rack)} />;
                    })}
                    {/* 데이터가 아예 없을 때 안내 메시지 */}
                    {locations.filter(l => l.zone === '2F').length === 0 && (
                        <div className="col-span-full text-center py-20 text-gray-500 border border-gray-800 rounded-xl">
                            2F 구역에 등록된 로케이션 데이터가 없습니다.
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
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 md:p-10 min-h-[600px] md:min-h-[800px] flex items-center justify-center relative overflow-hidden animate-fade-in group">
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.2 }}></div>
            
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

// ==================================================================================
// 2. 맵 뷰 (Visualizer)
// ==================================================================================

function ZoneViewM({ locations, onRackClick }: { locations: LocationData[], onRackClick: (id: string) => void }) {
    const { toast } = useUI(); 

    // 활성 랙 판단 (2F가 아닌 모든 Zone을 생산팀 랙으로 간주)
    const activeRacks = useMemo(() => new Set(locations.filter(l => l.zone !== '2F').map(l => l.zone)), [locations]);

    // 랙별 적재율 계산 로직
    const getRackStats = (rackId: string) => {
        const rackLocs = locations.filter(l => l.zone === rackId);
        const total = rackLocs.length;
        
        if (total === 0) return { total: 0, used: 0, percent: 0 };

        const used = rackLocs.filter(l => l.inventory && l.inventory.length > 0 && l.inventory[0].quantity > 0).length;
        
        return { 
            total, 
            used, 
            percent: Math.round((used / total) * 100) 
        };
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
        
        const percentColor = stats.percent > 80 ? "text-red-400" : (stats.percent > 50 ? "text-yellow-400" : "text-gray-400");

        return (
            <div 
                onClick={() => handleRackClick(id)}
                className={`
                    flex flex-col items-center justify-center 
                    rounded-md shadow-lg border-2 transition-all cursor-pointer select-none relative
                    ${isActive 
                        ? hasStock 
                            ? "bg-purple-900/40 border-purple-500 text-purple-200 hover:bg-purple-800/60 hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]" 
                            : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400 hover:bg-gray-700"
                        : "bg-gray-900/30 border-gray-800 text-gray-700 hover:border-gray-600 cursor-not-allowed"} 
                    ${className}
                `}
            >
                {/* 1. 랙 ID */}
                <span className="font-bold leading-none">{id}</span>
                
                {/* 2. 적재율 % */}
                {isActive && stats.total > 0 && (
                    <span className={`text-[10px] md:text-xs font-mono mt-1 ${percentColor} opacity-80`}>
                        {stats.percent}%
                    </span>
                )}

                {/* 3. 재고 있음 표시 (Ping 애니메이션) */}
                {isActive && hasStock && (
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                )}
            </div>
        );
    };

    return (
        <div className="w-full max-w-[95rem] relative z-10 my-4 scale-[0.6] md:scale-90 lg:scale-100 transition-transform origin-center flex flex-col items-center xl:block">
            
            {/* 범례 */}
            <div className="w-full flex justify-start mb-12 px-4 xl:px-0">
                <div className="text-sm text-gray-400 flex flex-wrap items-center gap-4 bg-black/60 backdrop-blur-sm p-3 rounded-lg border border-gray-800 shadow-lg">
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-purple-900/40 border border-purple-500 rounded"></span> 재고 보유</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-800 border border-gray-600 rounded"></span> 빈 랙 (활성)</div>
                    <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-900/30 border border-gray-800 rounded"></span> 비활성</div>
                </div>
            </div>

            <div className="flex flex-col xl:flex-row gap-32 justify-center items-start">
                {/* [왼쪽 블록] */}
                <div className="grid grid-cols-12 gap-2 gap-y-8 flex-1 w-full max-w-5xl">
                    {/* 1열 */}
                    <div className="col-span-2 h-16">{renderRack("S", "h-full")}</div>
                    <div className="col-span-8 h-16">{renderRack("R", "h-full")}</div>
                    <div className="col-span-2 h-16">{renderRack("Q", "h-full")}</div>

                    {/* 2열 */}
                    <div className="col-span-2 h-16">{renderRack("P", "h-full")}</div>
                    <div className="col-span-8 h-16">{renderRack("O", "h-full")}</div>
                    <div className="col-span-2 h-16">{renderRack("N", "h-full")}</div>

                    {/* 3열 */}
                    <div className="col-span-2 h-[26rem]">{renderRack("M", "h-full text-2xl")}</div>
                    <div className="col-span-8 h-[26rem]">{renderRack("L", "h-full text-5xl tracking-widest bg-purple-900/20")}</div>
                    <div className="col-span-2 h-[26rem]">{renderRack("K", "h-full text-2xl")}</div>

                    {/* 4열 */}
                    <div className="col-start-4 col-span-6 h-32">
                        {renderRack("J", "h-full text-3xl")}
                    </div>
                </div>

                {/* [오른쪽 블록] */}
                <div className="flex flex-col items-end w-full lg:w-96 flex-shrink-0 gap-4">
                    <div className="w-108">{renderRack("I", "h-14 text-2xl w-full")}</div>
                    <div className="h-8 w-72 border-b border-dashed border-gray-700 mb-2 mr-0"></div>
                    <div className="w-92 flex flex-col gap-8">
                        {['H','G','F','E','D','C','B','A'].map((r) => (
                            <div key={r} className={`w-full ${r==='E' ? 'mb-8' : ''}`}>
                                {renderRack(r, "h-14 text-xl w-full")}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function RackOverviewCard({ stats, onClick }: { stats: RackStats, onClick: () => void }) {
    let statusColor = "bg-green-500"; 
    if (stats.occupancyRate > 80) statusColor = "bg-red-500"; 
    else if (stats.occupancyRate > 50) statusColor = "bg-yellow-500"; 
    
    return (
        <div onClick={onClick} className="group bg-gray-900 border border-gray-800 p-6 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div><h3 className="text-3xl font-black text-gray-200 group-hover:text-blue-400 transition">Rack {stats.rackName}</h3><div className="text-gray-500 text-sm mt-1">총 {stats.totalCells}개 셀</div></div>
                <div className="text-right"><div className="text-2xl font-bold text-white">{stats.occupancyRate}%</div><div className="text-xs text-gray-400">점유율</div></div>
            </div>
            <div className="w-full bg-black rounded-full h-3 border border-gray-700 overflow-hidden"><div className={`h-full ${statusColor} transition-all duration-1000 ease-out`} style={{ width: `${stats.occupancyRate}%` }}></div></div>
        </div>
    );
}