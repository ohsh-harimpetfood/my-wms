// app/location/page.tsx
"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Map, Box, X, AlertCircle } from "lucide-react";

// --- [타입 정의] ---
interface Location {
  loc_id: string;
  warehouse: string;
  zone: string;
  rack_no: string;
  level_no: string; 
  side: string;
}

interface RackStats {
  rackName: string;
  totalCells: number;
  usedCells: number;
  occupancyRate: number; 
}

// ==================================================================================
// 1. 메인 페이지 컴포넌트 (Controller)
// ==================================================================================
export default function LocationPage() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const initialZoneParam = searchParams.get("zone");

  const [locations, setLocations] = useState<Location[]>([]);
  const [occupiedLocs, setOccupiedLocs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // ✨ 1. 기본값을 'M'으로 변경
  const [activeZone, setActiveZone] = useState<string>("M"); 
  const [selectedRack2F, setSelectedRack2F] = useState<string | null>(null); 

  useEffect(() => {
    const fetchData = async () => {
      const { data: locData } = await supabase.from("loc_master").select("*").eq("active_flag", "Y").order("loc_id");
      const { data: invData } = await supabase.from("inventory").select("location_code").gt("quantity", 0);

      if (locData) {
        setLocations(locData as any);
        // ✨ URL 파라미터가 '2F'일 때만 2F로 설정, 그 외에는 기본값(M) 유지
        if (initialZoneParam === '2F') setActiveZone('2F');
        else if (initialZoneParam === 'M') setActiveZone('M');
      }

      if (invData) {
        const occupied = new Set(invData.map(i => i.location_code));
        setOccupiedLocs(occupied);
      }
      setLoading(false);
    };
    fetchData();
  }, [initialZoneParam]);

  const getRackStats = (rackName: string): RackStats => {
    const rackLocs = locations.filter(l => l.zone === '2F' && l.rack_no === rackName);
    const total = rackLocs.length;
    const used = rackLocs.filter(l => occupiedLocs.has(l.loc_id)).length;
    return { rackName, totalCells: total, usedCells: used, occupancyRate: total === 0 ? 0 : Math.round((used / total) * 100) };
  };

  if (loading) return <div className="p-8 text-white">데이터 로딩 중...</div>;

  return (
    <div className="p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)]">
      
      {/* 헤더 */}
      <div className="flex justify-between items-end mb-6 border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Map className="text-blue-500" /> 창고 위치 현황 (Overview)
          </h1>
          <p className="text-sm text-gray-500 mt-1">구역(Zone)을 선택하여 배치도를 확인하고 상세 재고를 관리하세요.</p>
        </div>
        
        {/* ✨ 탭 버튼 순서 변경 (M존 먼저) */}
        <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button 
                onClick={() => setActiveZone('M')}
                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeZone === 'M' ? "bg-purple-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
            >
                🏭 생산팀 (M존)
            </button>
            <button 
                onClick={() => setActiveZone('2F')}
                className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeZone === '2F' ? "bg-blue-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
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
                    <div className="bg-gray-800/30 border border-gray-700 rounded h-24 flex items-center justify-center">비상구</div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">
                    {['A', 'B', 'C', 'D', 'E', 'F'].map(rack => {
                        const stats = getRackStats(rack);
                        if (stats.totalCells === 0) return null;
                        return <RackOverviewCard key={rack} stats={stats} onClick={() => setSelectedRack2F(rack)} />;
                    })}
                </div>
            </div>

            {selectedRack2F && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900">
                            <h2 className="text-2xl font-bold text-white"><span className="bg-blue-600 px-3 py-1 rounded text-lg mr-2">Rack {selectedRack2F}</span> 상세 도면</h2>
                            <button onClick={() => setSelectedRack2F(null)} className="p-2 hover:bg-gray-800 rounded-full text-2xl">✕</button>
                        </div>
                        <div className="p-8 overflow-auto bg-black/50">
                            <ExcelStyleRackDetail rackName={selectedRack2F} allLocations={locations.filter(l=>l.zone==='2F')} occupiedLocs={occupiedLocs} />
                        </div>
                    </div>
                </div>
            )}
        </div>
      ) : (
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-10 min-h-[600px] flex items-center justify-center relative overflow-hidden animate-fade-in">
            <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#333 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.2 }}></div>
            <ZoneViewM />
        </div>
      )}
    </div>
  );
}

// ... (이하 서브 컴포넌트들 RackOverviewCard, ExcelStyleRackDetail, ZoneViewM, RackDetailModalM 은 기존 코드와 동일하게 유지) ...
// (전체 코드가 필요하시면 말씀해주세요. 위에서 수정한 부분 외에는 변경사항이 없어 생략했습니다.)

function RackOverviewCard({ stats, onClick }: { stats: RackStats, onClick: () => void }) {
    let statusColor = "bg-green-500"; 
    if (stats.occupancyRate > 80) statusColor = "bg-red-500"; 
    else if (stats.occupancyRate > 50) statusColor = "bg-yellow-500"; 

    return (
        <div onClick={onClick} className="group bg-gray-900 border border-gray-800 p-6 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-gray-800 transition relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-3xl font-black text-gray-200 group-hover:text-blue-400 transition">Rack {stats.rackName}</h3>
                    <div className="text-gray-500 text-sm mt-1">총 {stats.totalCells}개 셀</div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-white">{stats.occupancyRate}%</div>
                    <div className="text-xs text-gray-400">점유율</div>
                </div>
            </div>
            <div className="w-full bg-black rounded-full h-3 border border-gray-700 overflow-hidden">
                <div className={`h-full ${statusColor} transition-all duration-1000 ease-out`} style={{ width: `${stats.occupancyRate}%` }}></div>
            </div>
            <div className="mt-3 flex justify-between text-xs font-mono text-gray-400">
                <span>사용: {stats.usedCells}</span>
                <span>빈 공간: {stats.totalCells - stats.usedCells}</span>
            </div>
        </div>
    );
}

function ExcelStyleRackDetail({ rackName, allLocations, occupiedLocs }: { rackName: string, allLocations: Location[], occupiedLocs: Set<string> }) {
    const router = useRouter();
    const rackLocs = allLocations.filter(l => l.rack_no === rackName);
    const levels = Array.from(new Set(rackLocs.map(l => l.level_no))).sort((a, b) => Number(b) - Number(a)); 
    const sides = Array.from(new Set(rackLocs.map(l => l.side))).sort((a, b) => Number(a) - Number(b));

    const handleCellClick = (locId: string) => { router.push(`/inventory?query=${locId}`); };

    return (
        <div className="flex border border-gray-700 bg-black rounded shadow-lg mx-auto w-fit">
            <div className="w-16 bg-gray-800 flex items-center justify-center border-r border-gray-700 flex-shrink-0">
                <div className="font-black text-2xl text-gray-500">{rackName}</div>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <div className="inline-block">
                    {levels.map((lvl, idx) => (
                        <div key={lvl} className={`flex ${idx !== levels.length - 1 ? 'border-b border-gray-800' : ''}`}>
                            {sides.map((side) => {
                                const cell = rackLocs.find(l => l.level_no === lvl && l.side === side);
                                const isOccupied = cell && occupiedLocs.has(cell.loc_id);
                                return (
                                    <div 
                                        key={`${lvl}-${side}`} 
                                        onClick={() => cell && handleCellClick(cell.loc_id)}
                                        className={`flex-shrink-0 w-32 h-24 border-r border-gray-800 flex flex-col items-center justify-center p-2 relative transition group ${!cell ? 'bg-gray-900/20 cursor-default' : 'cursor-pointer hover:scale-105 hover:z-10 hover:shadow-xl hover:border-blue-500 border border-transparent'} ${cell && isOccupied ? 'bg-blue-900/20' : cell ? 'bg-black hover:bg-gray-900' : ''}`}
                                    >
                                        {cell ? (
                                            <>
                                                <div className={`font-bold text-lg ${isOccupied ? 'text-blue-400' : 'text-gray-600 group-hover:text-white'}`}>{lvl}-{side}</div>
                                                <div className={`mt-2 px-2 py-1 rounded text-xs border ${isOccupied ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-gray-900 text-gray-600 border-gray-800 group-hover:bg-gray-700'}`}>{isOccupied ? '📦 보관중' : 'Empty'}</div>
                                                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-[9px] text-gray-500 font-mono bg-black px-1 rounded border border-gray-800">{cell.loc_id}</div>
                                            </>
                                        ) : <span className="text-gray-800 text-xs">X</span>}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ZoneViewM() {
    const [selectedRackM, setSelectedRackM] = useState<string | null>(null);
    const [toast, setToast] = useState<{ show: boolean, msg: string }>({ show: false, msg: "" });

    const triggerToast = (msg: string) => {
        setToast({ show: true, msg });
        setTimeout(() => setToast({ show: false, msg: "" }), 5000); 
    };

    const handleRackClick = (rackId: string) => {
        if (rackId === 'M') {
            setSelectedRackM(rackId);
        } else {
            triggerToast(`🚧 [${rackId} 랙]은 아직 데이터가 연동되지 않았습니다.`);
        }
    };

    const renderRack = (id: string, isActive: boolean = false, className: string = "") => (
        <div 
            onClick={() => handleRackClick(id)}
            className={`
                flex items-center justify-center font-bold text-lg rounded shadow-lg border-2 transition-all cursor-pointer select-none
                ${isActive 
                    ? "bg-purple-900/40 border-purple-500 text-purple-300 hover:bg-purple-900/60 hover:scale-105 hover:shadow-purple-500/20" 
                    : "bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-750"}
                ${className}
            `}
        >
            {id} 랙
            {isActive && <span className="absolute bottom-2 text-[10px] text-purple-400 font-normal animate-pulse">Live</span>}
        </div>
    );

    return (
        <div className="w-full max-w-7xl relative z-10 my-10">
            <div className={`
                fixed top-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-full shadow-2xl border border-gray-700 bg-gray-900/90 backdrop-blur-md text-white transition-all duration-500 ease-in-out transform
                ${toast.show ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-8 pointer-events-none"}
            `}>
                <AlertCircle size={20} className="text-yellow-500" />
                <span className="text-sm font-medium">{toast.msg}</span>
            </div>

            <div className="absolute -top-10 left-0 text-sm text-gray-400 flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-900/40 border border-purple-500 rounded"></span> 조회 가능
                <span className="w-3 h-3 bg-gray-800 border border-gray-700 rounded ml-2"></span> 준비 중
            </div>

            <div className="flex flex-col lg:flex-row gap-32 justify-center items-start">
                <div className="flex flex-col gap-6 flex-1 w-full">
                    <div className="grid grid-cols-12 gap-2 h-14">
                        <div className="col-span-2">{renderRack("S", false, "h-full text-xl")}</div>
                        <div className="col-span-8">{renderRack("R", false, "h-full text-xl")}</div>
                        <div className="col-span-2">{renderRack("Q", false, "h-full text-xl")}</div>
                    </div>
                    <div className="grid grid-cols-12 gap-2 h-14">
                        <div className="col-span-2">{renderRack("P", false, "h-full text-xl")}</div>
                        <div className="col-span-8">{renderRack("O", false, "h-full text-xl")}</div>
                        <div className="col-span-2">{renderRack("N", false, "h-full text-xl")}</div>
                    </div>
                    <div className="grid grid-cols-12 gap-2 h-64">
                        <div className="col-span-2 relative">{renderRack("M", true, "h-full text-3xl")}</div>
                        <div className="col-span-8">{renderRack("L", false, "h-full text-3xl")}</div>
                        <div className="col-span-2">{renderRack("K", false, "h-full text-3xl")}</div>
                    </div>
                    <div className="grid grid-cols-12 gap-2 h-32">
                        <div className="col-span-3"></div>
                        <div className="col-span-6">{renderRack("J", false, "h-full text-2xl")}</div>
                        <div className="col-span-3"></div>
                    </div>
                </div>
                <div className="flex flex-col items-center w-full lg:w-[26rem] flex-shrink-0">
                    <div className="w-full">{renderRack("I", false, "h-14 text-xl w-full")}</div>
                    <div className="h-12"></div>
                    {['H','G','F','E','D','C','B','A'].map(r => (
                        <div key={r} className="w-[90%] flex flex-col items-center">
                            {renderRack(r, false, "h-14 text-xl w-full")}
                            <div className={`${r === 'E' ? 'h-12' : 'h-3'}`}></div>
                        </div>
                    ))}
                </div>
            </div>

            {selectedRackM === 'M' && <RackDetailModalM rackNo="M" onClose={() => setSelectedRackM(null)} />}
        </div>
    );
}

function RackDetailModalM({ rackNo, onClose }: { rackNo: string, onClose: () => void }) {
    const [cells, setCells] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'];
    const levels = [4, 3, 2, 1];

    useEffect(() => {
        const fetchMData = async () => {
            const { data: locData } = await supabase.from("loc_master").select("*").eq("zone", "M").order("loc_id");
            if (!locData) { setLoading(false); return; }

            const locIds = locData.map(l => l.loc_id);
            const { data: invData } = await supabase.from("inventory").select("location_code, quantity, item_master(item_name)").in("location_code", locIds);

            setCells(locData.map(loc => ({
                ...loc,
                inventory: invData?.find(i => i.location_code === loc.loc_id) || null
            })));
            setLoading(false);
        };
        fetchMData();
    }, []);

    const handleCellClick = (locId: string) => { router.push(`/inventory?query=${locId}`); };

    const findCell = (col: string, lvl: number) => {
        return cells.find(c => c.loc_id === `M${col}${lvl}1`);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-7xl max-h-[90vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-center p-6 border-b border-gray-800 bg-gray-900 rounded-t-xl">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Box className="text-purple-500" /> M Zone 전체 상세 정보</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition"><X /></button>
                </div>
                
                <div className="p-8 overflow-x-auto bg-black/50 custom-scrollbar">
                    {loading ? <div className="text-center py-20 text-gray-500">데이터 로딩 중...</div> : (
                        <div className="flex gap-4 min-w-max pb-4">
                            {columns.map(col => (
                                <div key={col} className="flex flex-col gap-2">
                                    {levels.map(lvl => {
                                        const cell = findCell(col, lvl);
                                        const hasStock = cell?.inventory && cell.inventory.quantity > 0;
                                        
                                        return (
                                            <div 
                                                key={`${col}-${lvl}`}
                                                onClick={() => cell && handleCellClick(cell.loc_id)}
                                                className={`
                                                    w-24 h-20 border rounded flex flex-col items-center justify-center p-1 transition relative
                                                    ${!cell ? 'border-dashed border-gray-800 bg-transparent' : 'cursor-pointer hover:border-blue-500 hover:scale-105 hover:z-10'}
                                                    ${cell && hasStock ? 'bg-purple-900/30 border-purple-500' : 'bg-gray-900 border-gray-700'}
                                                `}
                                            >
                                                {cell ? (
                                                    <>
                                                        <span className="text-xs font-bold text-gray-400 mb-1">M{col}{lvl}1</span>
                                                        {hasStock ? (
                                                            <span className="text-xs font-bold text-purple-300">
                                                                {cell.inventory.quantity.toLocaleString()}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] text-gray-600">-</span>
                                                        )}
                                                    </>
                                                ) : (
                                                    <span className="text-[10px] text-gray-800">X</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                    <div className="text-center text-xs font-bold text-gray-500 mt-1">{col}열</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                
                <div className="p-4 bg-gray-900 border-t border-gray-800 text-center text-sm text-gray-500">
                    <span className="mr-4">🟣 재고 있음</span>
                    <span>⚫ 빈 셀</span>
                </div>
            </div>
        </div>
    );
}