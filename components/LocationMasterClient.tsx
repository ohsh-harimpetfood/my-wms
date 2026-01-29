"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Power, Loader2, LayoutGrid, Layers, Factory, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  initialLocations: any[];
}

export default function LocationMasterClient({ initialLocations }: Props) {
  const supabase = createClient();
  const router = useRouter();
  
  // 1. 상태 관리
  const [loading, setLoading] = useState(false);
  const [allLocations, setAllLocations] = useState<any[]>(initialLocations); // 전체 데이터 저장용
  const [mainTab, setMainTab] = useState<'PRODUCTION' | 'LOGISTICS'>('PRODUCTION');
  const [selectedZone, setSelectedZone] = useState<string>("");
  const [config, setConfig] = useState({
    zone: "", startRack: "", endRack: "", level: "", side: "1",
  });

  // 🔄 [핵심] 1,000건 제한을 넘어 전체 데이터를 로드하는 로직
  const fetchTotalData = async () => {
    setLoading(true);
    let completeData: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    try {
      while (hasMore) {
        const { data, error } = await supabase
          .from("loc_master")
          .select("*, inventory(quantity)")
          .order("loc_id")
          .range(from, from + step - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          completeData = [...completeData, ...data];
          if (data.length < step) hasMore = false;
          else from += step;
        } else {
          hasMore = false;
        }
      }
      setAllLocations(completeData);
    } catch (err) {
      console.error("전체 데이터 로드 중 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  // 초기 렌더링 시 데이터가 1000개 이상일 가능성이 크므로 전체 로드 실행
  useEffect(() => {
    fetchTotalData();
  }, []);

  // --- 🏗️ [데이터 계층화 필터링 로직] ---
  // 이제 initialLocations 대신 "allLocations"를 사용합니다.
  const { zones, filteredLocs } = useMemo(() => {
    // 1단계 필터: 생산(A~S) vs 물류(2F)
    const tabFiltered = allLocations.filter(l => {
      const isLogis = l.zone === '2F' || l.loc_id.startsWith('2F');
      return mainTab === 'PRODUCTION' ? !isLogis : isLogis;
    });

    // 2단계: 현재 탭 내의 Zone 리스트 추출
    const zoneList = Array.from(new Set(tabFiltered.map(l => l.zone || "ETC"))).sort();
    
    // 탭 변경 시 선택된 Zone이 없거나 리스트에 없으면 첫 번째 Zone 자동 선택
    const currentZone = (selectedZone && zoneList.includes(selectedZone)) 
      ? selectedZone 
      : (zoneList.length > 0 ? zoneList[0] : "");

    // 3단계: 선택된 Zone에 해당하는 최종 리스트
    const finalLocs = tabFiltered.filter(l => (l.zone || "ETC") === currentZone);

    return { zones: zoneList, filteredLocs: finalLocs, currentZone };
  }, [allLocations, mainTab, selectedZone]);

  // 알파벳 범위 생성 헬퍼
  const charRange = (start: string, end: string) => {
    const startCode = start.toUpperCase().charCodeAt(0);
    const endCode = end.toUpperCase().charCodeAt(0);
    const chars = [];
    for (let i = startCode; i <= endCode; i++) chars.push(String.fromCharCode(i));
    return chars;
  };

  // 위치 생성 핸들러
  const handleCreate = async (isBulk: boolean) => {
    if (!config.zone || !config.startRack || !config.level) return alert("필수 정보를 입력해주세요.");
    setLoading(true);
    const newLocs: any[] = [];
    const rackList = isBulk ? charRange(config.startRack, config.endRack) : [config.startRack.toUpperCase()];

    for (const rChar of rackList) {
      const sides = isBulk ? ["1", "2"] : [config.side];
      for (const s of sides) {
        newLocs.push({
          loc_id: `${config.zone}${rChar}${config.level}${s}`,
          warehouse: 'WH01', zone: config.zone, rack_no: rChar, level_no: config.level, side: s, active_flag: 'Y'
        });
      }
    }
    const { error } = await supabase.from("loc_master").insert(newLocs);
    if (error) alert(error.message);
    else { 
      alert("등록 완료"); 
      fetchTotalData(); // 데이터 생성 후 클라이언트 상태도 동기화
      router.refresh(); 
    }
    setLoading(false);
  };

  // 활성화 상태 토글 핸들러
  const handleToggleActive = async (loc_id: string, currentFlag: string) => {
    const { error } = await supabase
      .from("loc_master")
      .update({ active_flag: currentFlag === 'Y' ? 'N' : 'Y' })
      .eq("loc_id", loc_id);
    if (!error) {
      fetchTotalData(); // 상태 변경 후 즉시 데이터 재로드
      router.refresh();
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* 🛠️ [생성 도구 섹션] */}
      <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl shadow-2xl">
        <h3 className="text-white font-bold mb-5 flex items-center gap-2 text-sm uppercase tracking-wider">
          <LayoutGrid size={16} className="text-blue-500"/> Location Builder
        </h3>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <label className="text-[10px] text-gray-400 font-black uppercase">Zone</label>
            <input type="text" className="w-16 bg-black border border-gray-800 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 uppercase text-center font-bold" value={config.zone} onChange={e => setConfig({...config, zone: e.target.value.toUpperCase()})}/>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-400 font-black uppercase">Start Rack</label>
            <input type="text" className="w-20 bg-black border border-gray-800 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 uppercase text-center font-bold" value={config.startRack} onChange={e => setConfig({...config, startRack: e.target.value.toUpperCase()})}/>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-400 font-black uppercase">Level</label>
            <input type="number" className="w-16 bg-black border border-gray-800 rounded-lg p-2.5 text-white outline-none text-center font-bold" value={config.level} onChange={e => setConfig({...config, level: e.target.value})}/>
          </div>
          <button onClick={() => handleCreate(false)} className="h-[46px] px-6 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold transition-all border border-gray-700">단일 추가</button>
          <div className="h-10 w-[1px] bg-gray-800 mx-2"></div>
          <div className="space-y-2">
            <label className="text-[10px] text-gray-400 font-black uppercase">End Rack</label>
            <input type="text" className="w-20 bg-black border border-gray-800 rounded-lg p-2.5 text-white outline-none focus:border-blue-500 uppercase text-center font-bold" value={config.endRack} onChange={e => setConfig({...config, endRack: e.target.value.toUpperCase()})}/>
          </div>
          <button onClick={() => handleCreate(true)} className="h-[46px] px-6 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-900/20">범위 일괄 생성</button>
        </div>
      </div>

      {/* 🏗️ [다중 계층 탭 뷰어 섹션] */}
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[650px]">
        {/* 상단 현황 바 추가 */}
        <div className="flex items-center justify-between px-6 py-2 bg-[#161616] border-b border-gray-800">
           <span className="text-[10px] font-mono text-gray-500">DATABASE STATUS: ONLINE</span>
           <span className="text-[10px] font-mono text-blue-500">TOTAL LOCS: {allLocations.length}</span>
        </div>

        {/* 1단계 탭: 대분류 */}
        <div className="flex bg-[#111] p-1 border-b border-gray-800">
          <button onClick={() => {setMainTab('PRODUCTION'); setSelectedZone("");}} className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black transition-all ${mainTab === 'PRODUCTION' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
            <Layers size={14}/> 생산창고 (A~S 랙)
          </button>
          <button onClick={() => {setMainTab('LOGISTICS'); setSelectedZone("");}} className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-black transition-all ${mainTab === 'LOGISTICS' ? 'bg-green-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}>
            <Factory size={14}/> 물류창고 (2F 구역)
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 2단계 탭: Zone 리스트 (좌측 사이드바) */}
          <div className="w-56 border-r border-gray-800 bg-[#0d0d0d] overflow-y-auto custom-scrollbar">
            <div className="p-4 text-[10px] font-black text-gray-600 uppercase tracking-widest border-b border-gray-800/50 mb-2 font-mono">Select Zone</div>
            {zones.map(z => (
              <button 
                key={z} 
                onClick={() => setSelectedZone(z)} 
                className={`w-full text-left px-6 py-4 text-sm font-bold flex justify-between items-center transition-all ${selectedZone === z ? "bg-blue-600/10 text-blue-400 border-r-2 border-blue-400" : "text-gray-500 hover:bg-gray-800/50"}`}
              >
                {z} {mainTab === 'PRODUCTION' ? 'Rack' : 'Zone'}
                {selectedZone === z && <ChevronRight size={14} />}
              </button>
            ))}
          </div>

          {/* 3단계: 상세 셀 리스트 (메인 그리드) */}
          <div className="flex-1 bg-black overflow-y-auto p-6 custom-scrollbar relative">
             {loading && (
               <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
                 <div className="flex flex-col items-center gap-2">
                   <Loader2 className="animate-spin text-blue-500" size={32}/>
                   <span className="text-xs text-gray-400 font-mono animate-pulse">SYNCING DATA...</span>
                 </div>
               </div>
             )}

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredLocs.length === 0 ? (
                  <div className="col-span-full py-20 text-center text-gray-600 font-mono">No Locations Found</div>
                ) : (
                  filteredLocs.map(loc => (
                    <div key={loc.loc_id} className={`p-4 bg-[#161b22] border border-gray-800 rounded-xl flex flex-col transition-all hover:border-gray-500 group ${loc.active_flag === 'N' ? 'opacity-30' : ''}`}>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-blue-400 font-mono font-black text-sm">{loc.loc_id}</span>
                        <button onClick={() => handleToggleActive(loc.loc_id, loc.active_flag)} className="text-gray-600 hover:text-white transition-colors">
                          <Power size={14} className={loc.active_flag === 'Y' ? "text-green-500" : "text-red-500"}/>
                        </button>
                      </div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase mb-1">
                        {loc.rack_no}열 / {loc.level_no}단 / SIDE-{loc.side}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-800 flex justify-between items-center">
                         <span className={`text-[9px] font-black px-2 py-0.5 rounded ${loc.active_flag === 'Y' ? 'bg-green-900/20 text-green-500' : 'bg-red-900/20 text-red-500'}`}>
                           {loc.active_flag === 'Y' ? 'ACTIVE' : 'INACTIVE'}
                         </span>
                         <span className="text-[9px] text-gray-600 font-mono">QTY: {loc.inventory?.[0]?.quantity || 0}</span>
                      </div>
                    </div>
                  ))
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}