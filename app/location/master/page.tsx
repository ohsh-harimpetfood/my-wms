"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Map, AlertCircle } from "lucide-react";
import RackDetailModal, { LocationData } from "@/components/RackDetailModal";

interface RackStats {
  rackName: string;
  totalCells: number;
  usedCells: number;
  occupancyRate: number; 
}

// ==================================================================================
// 1. 메인 페이지 컴포넌트
// ==================================================================================
export default function LocationPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialZoneParam = searchParams.get("zone");

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
      
      // ✨ [수정 1] 데이터 조회 단순화 (10,000개 제한 해제)
      // 복잡한 while 루프 대신 한 번에 가져오되, 충분히 큰 limit을 설정
      const { data, error } = await supabase
        .from("loc_master")
        .select(`
          *,
          inventory ( 
            quantity, 
            item_master!fk_inventory_item_master ( item_name ) 
          )
        `)
        .eq("active_flag", "Y")
        .order("loc_id")
        .limit(10000); // 넉넉하게 설정

      if (error) {
        console.error("Data Fetch Error:", error);
        setLoading(false);
        return;
      }

      if (data) {
        // ✨ [수정 2] 데이터 보정 로직 (Zone이 비어있으면 loc_id 파싱)
        const correctedData = (data as unknown as LocationData[]).map(loc => {
            // 이미 zone이 있고 2F가 아니면 그대로 사용
            if (loc.zone && loc.zone.trim() !== "") return loc;
            
            // zone이 비어있거나 불확실한 경우 loc_id 파싱
            // 예: "H-01-01" -> zone: "H", "2F-A-01" -> zone: "2F"
            let newZone = loc.zone;
            if (loc.loc_id.startsWith("2F")) {
                newZone = "2F";
            } else {
                const parts = loc.loc_id.split("-");
                if (parts.length > 0) newZone = parts[0];
            }
            
            return { ...loc, zone: newZone };
        });

        setLocations(correctedData);

        const occupied = new Set(
          correctedData
            .filter(l => l.inventory && l.inventory.length > 0 && l.inventory[0].quantity > 0)
            .map(l => l.loc_id)
        );
        setOccupiedLocs(occupied);

        // 초기 진입 시 파라미터에 따라 탭 설정
        if (initialZoneParam === '2F') setActiveZone('2F');
        // 파라미터가 2F가 아니면(예: A, H 등) 생산팀(M) 탭 활성화하고 해당 랙 선택
        else if (initialZoneParam) {
            setActiveZone('M');
            setSelectedRackM(initialZoneParam);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [initialZoneParam]);

  const getRackStats = (rackName: string): RackStats => {
    // 2F의 경우 rack_no 컬럼을 기준으로 함 (예: 2F-A-01-01의 rack_no는 A)
    // 데이터 보정으로 zone은 '2F'로 통일되어 있음
    const rackLocs = locations.filter(l => l.zone === '2F' && l.rack_no === rackName);
    const total = rackLocs.length;
    const used = rackLocs.filter(l => occupiedLocs.has(l.loc_id)).length;
    return { rackName, totalCells: total, usedCells: used, occupancyRate: total === 0 ? 0 : Math.round((used / total) * 100) };
  };

  if (loading) return (
    <div className="h-screen flex flex-col items-center justify-center bg-black text-white gap-4">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      <p className="animate-pulse">시스템 데이터 동기화 중...</p>
    </div>
  );

  return (
    <div className="p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)]">
      
      {/* 헤더 */}
      <div className="flex justify-between items-end mb-6 border-b border-gray-800 pb-4">
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
              <div className="flex gap-8">
                <div className="w-24 flex flex-col gap-6 text-center text-gray-500 text-sm font-bold flex-shrink-0 pt-4">
                    <div className="bg-gray-800/30 border border-gray-700 rounded h-32 flex items-center justify-center">화물<br/>리프트</div>
                </div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">
                    {['A', 'B', 'C', 'D', 'E', 'F'].map(rack => {
                        const stats = getRackStats(rack);
                        // 데이터가 없어도 카드는 보여주되 비활성 상태로 표시 (선택사항)
                        return <RackOverviewCard key={rack} stats={stats} onClick={() => setSelectedRack2F(rack)} />;
                    })}
                </div>
            </div>
            {selectedRack2F && <RackDetailModal rackName={selectedRack2F} locations={locations.filter(l => l.zone === '2F' && l.rack_no === selectedRack2F)} onClose={() => setSelectedRack2F(null)} />}
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-10 min-h-[800px] flex items-center justify-center relative overflow-hidden animate-fade-in group">
            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '30px 30px', opacity: 0.2 }}></div>
            
            <ZoneViewM locations={locations} onRackClick={setSelectedRackM} />

            {selectedRackM && (
                <RackDetailModal 
                    rackName={selectedRackM} 
                    // ✨ [수정 3] 필터링 시 zone 컬럼 사용 (데이터 보정됨)
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
    const [toast, setToast] = useState<{ show: boolean, msg: string }>({ show: false, msg: "" });

    // ✨ [수정 4] 활성 랙 판단 (보정된 zone 데이터 사용)
    const activeRacks = useMemo(() => new Set(locations.filter(l => l.zone !== '2F').map(l => l.zone)), [locations]);

    const handleRackClick = (rackId: string) => {
        // 데이터가 없더라도 클릭은 되게 하거나, 안내 메시지 출력
        if (activeRacks.has(rackId)) {
            onRackClick(rackId);
        } else {
            setToast({ show: true, msg: `⚠️ [Rack ${rackId}] 데이터가 DB에 없습니다.` });
            setTimeout(() => setToast({ show: false, msg: "" }), 3000); 
        }
    };

    const renderRack = (id: string, className: string = "") => {
        const isActive = activeRacks.has(id);
        const hasStock = locations.some(l => l.zone === id && l.inventory && l.inventory.length > 0);
        
        return (
            <div 
                onClick={() => handleRackClick(id)}
                className={`
                    flex items-center justify-center font-bold text-xl rounded-md shadow-lg border-2 transition-all cursor-pointer select-none relative
                    ${isActive 
                        ? hasStock 
                            ? "bg-purple-900/40 border-purple-500 text-purple-200 hover:bg-purple-800/60 hover:scale-105 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]" 
                            : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-400 hover:bg-gray-700"
                        : "bg-gray-900/30 border-gray-800 text-gray-700 hover:border-gray-600"} 
                    ${className}
                `}
            >
                {id}
                {isActive && hasStock && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>}
            </div>
        );
    };

    return (
        <div className="w-full max-w-[95rem] relative z-10 my-10 scale-90 lg:scale-100 transition-transform">
            {/* 토스트 */}
            <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl border border-yellow-500/50 bg-gray-900/90 text-yellow-500 transition-all transform ${toast.show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4 pointer-events-none"}`}>
                <div className="flex items-center gap-2"><AlertCircle size={18} /> <span>{toast.msg}</span></div>
            </div>

            {/* 범례 */}
            <div className="absolute -top-16 left-0 text-sm text-gray-400 flex items-center gap-4 bg-black/40 p-2 rounded-lg border border-gray-800">
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-purple-900/40 border border-purple-500 rounded"></span> 데이터 연동됨</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 bg-gray-800 border border-gray-600 rounded"></span> 빈 랙</div>
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> 재고 있음</div>
            </div>

            <div className="flex flex-col xl:flex-row gap-32 justify-center items-start">
                {/* [왼쪽 블록] */}
                <div className="grid grid-cols-12 gap-2 gap-y-8 flex-1 w-full max-w-5xl pt-24">
                    {/* 1열: S(2) - R(8) - Q(2) */}
                    <div className="col-span-2 h-16">{renderRack("S", "h-full")}</div>
                    <div className="col-span-8 h-16">{renderRack("R", "h-full")}</div>
                    <div className="col-span-2 h-16">{renderRack("Q", "h-full")}</div>

                    {/* 2열: P(2) - O(8) - N(2) */}
                    <div className="col-span-2 h-16">{renderRack("P", "h-full")}</div>
                    <div className="col-span-8 h-16">{renderRack("O", "h-full")}</div>
                    <div className="col-span-2 h-16">{renderRack("N", "h-full")}</div>

                    {/* 3열 (메인): M(2) - L(8) - K(2) */}
                    <div className="col-span-2 h-[26rem]">{renderRack("M", "h-full text-2xl")}</div>
                    <div className="col-span-8 h-[26rem]">{renderRack("L", "h-full text-5xl tracking-widest bg-purple-900/20")}</div>
                    <div className="col-span-2 h-[26rem]">{renderRack("K", "h-full text-2xl")}</div>

                    {/* 4열: J (중앙 정렬) */}
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
    
    // 데이터가 없으면 비활성 스타일
    if (stats.totalCells === 0) {
        return (
            <div className="bg-gray-900/50 border border-gray-800 p-6 rounded-xl relative overflow-hidden opacity-50 cursor-not-allowed">
                <div className="flex justify-between items-start mb-4">
                    <div><h3 className="text-3xl font-black text-gray-600">Rack {stats.rackName}</h3><div className="text-gray-600 text-sm mt-1">데이터 없음</div></div>
                </div>
            </div>
        )
    }

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