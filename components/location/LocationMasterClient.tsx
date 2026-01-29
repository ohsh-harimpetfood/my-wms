"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { Plus, Power, Loader2, LayoutGrid, Layers, Factory, ChevronRight, ArrowRight, Save, Table as TableIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface Props {
  initialLocations: any[];
}

export default function LocationMasterClient({ initialLocations }: Props) {
  const supabase = createClient();
  const router = useRouter();
  
  // --- [1. 상태 관리] ---
  const [loading, setLoading] = useState(false);
  const [allLocations, setAllLocations] = useState<any[]>(initialLocations);
  const [mainTab, setMainTab] = useState<'PRODUCTION' | 'LOGISTICS'>('PRODUCTION');
  const [selectedZone, setSelectedZone] = useState<string>("");

  // 생성 도구 설정 상태
  const [config, setConfig] = useState({
    zone: "", startRack: "", endRack: "", level: "", side: "1",
  });

  // --- [2. 전체 데이터 로딩] ---
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
      console.error("데이터 로딩 중 오류:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTotalData();
  }, []);

  // --- [3. 뷰어 필터링 로직] ---
  const { zones, filteredLocs } = useMemo(() => {
    const tabFiltered = allLocations.filter(l => {
      const isLogis = l.zone === '2F' || l.loc_id.startsWith('2F');
      return mainTab === 'PRODUCTION' ? !isLogis : isLogis;
    });

    const zoneList = Array.from(new Set(tabFiltered.map(l => l.zone || "ETC"))).sort();
    
    // Zone 자동 선택 보정
    const currentZone = (selectedZone && zoneList.includes(selectedZone)) 
      ? selectedZone 
      : (zoneList.length > 0 ? zoneList[0] : "");

    const finalLocs = tabFiltered.filter(l => (l.zone || "ETC") === currentZone);

    return { zones: zoneList, filteredLocs: finalLocs, currentZone };
  }, [allLocations, mainTab, selectedZone]);

  const charRange = (start: string, end: string) => {
    const startCode = start.toUpperCase().charCodeAt(0);
    const endCode = end.toUpperCase().charCodeAt(0);
    const chars = [];
    for (let i = startCode; i <= endCode; i++) chars.push(String.fromCharCode(i));
    return chars;
  };

  // --- [4. 로케이션 생성 핸들러] ---
  const handleCreate = async (isBulk: boolean) => {
    if (!config.zone || !config.startRack || !config.level) {
      return alert("필수 정보(Zone, Start Rack, Level)를 입력해주세요.");
    }

    setLoading(true);
    const newLocs: any[] = [];
    const rackList = isBulk ? charRange(config.startRack, config.endRack) : [config.startRack.toUpperCase()];

    for (const rChar of rackList) {
      const sides = isBulk ? ["1", "2"] : [config.side];
      for (const s of sides) {
        const locId = `${config.zone}${rChar}${config.level}${s}`;
        newLocs.push({
          loc_id: locId, warehouse: 'WH01', zone: config.zone, rack_no: rChar, level_no: config.level, side: s, active_flag: 'Y'
        });
      }
    }

    const { error } = await supabase.from("loc_master").insert(newLocs);
    if (error) alert(error.code === '23505' ? "이미 존재하는 로케이션 ID가 포함되어 있습니다." : error.message);
    else { alert(`${newLocs.length}개의 로케이션이 생성되었습니다.`); fetchTotalData(); router.refresh(); }
    setLoading(false);
  };

  // --- [5. 활성/비활성 토글 핸들러] ---
  const handleToggleActive = async (loc_id: string, currentFlag: string) => {
    const { error } = await supabase.from("loc_master").update({ active_flag: currentFlag === 'Y' ? 'N' : 'Y' }).eq("loc_id", loc_id);
    if (!error) { fetchTotalData(); router.refresh(); }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* 🚀 [LOCATION BUILDER] */}
      <div className="bg-[#111] border border-gray-800 p-6 rounded-xl shadow-lg relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
           <h3 className="text-white font-black flex items-center gap-2 text-sm uppercase tracking-[0.1em]">
             <LayoutGrid size={16} className="text-blue-500"/>
             Location Builder
           </h3>
           <div className="text-[10px] text-gray-500 font-mono">
             PREVIEW: <span className="text-blue-400 font-bold">{config.zone || '?'}{config.startRack || '?'}{config.level || '?'}{config.side}</span>
           </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
            {/* 입력 필드 그룹 */}
            <div className="flex items-end gap-2 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
              <div className="space-y-1">
                <label className="text-[9px] text-gray-500 font-bold uppercase ml-1">Zone</label>
                <input type="text" placeholder="M" className="w-14 bg-black border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500 text-center font-bold uppercase text-sm" 
                  value={config.zone} onChange={e => setConfig({...config, zone: e.target.value.toUpperCase()})}/>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-gray-500 font-bold uppercase ml-1">Rack</label>
                <input type="text" placeholder="A" maxLength={2} className="w-14 bg-black border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500 text-center font-bold uppercase text-sm" 
                  value={config.startRack} onChange={e => setConfig({...config, startRack: e.target.value.toUpperCase()})}/>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-gray-500 font-bold uppercase ml-1">Level</label>
                <input type="number" placeholder="1" className="w-14 bg-black border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500 text-center font-bold text-sm" 
                  value={config.level} onChange={e => setConfig({...config, level: e.target.value})}/>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] text-gray-500 font-bold uppercase ml-1">Side</label>
                <select className="w-20 bg-black border border-gray-700 rounded p-2 text-white outline-none focus:border-blue-500 font-bold text-center text-sm appearance-none cursor-pointer"
                  value={config.side} onChange={e => setConfig({...config, side: e.target.value})}>
                  <option value="1">Side 1</option>
                  <option value="2">Side 2</option>
                </select>
              </div>
              <button onClick={() => handleCreate(false)} disabled={loading} className="h-[38px] px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-bold transition-all border border-gray-700 flex items-center gap-2 ml-2">
                <Save size={14}/> 단일생성
              </button>
            </div>

            {/* 범위 생성 그룹 */}
            <div className="flex items-end gap-2 bg-blue-900/10 p-3 rounded-lg border border-blue-900/30">
              <div className="space-y-1">
                <label className="text-[9px] text-blue-400 font-bold uppercase ml-1 flex items-center gap-1">To <ArrowRight size={8}/></label>
                <input type="text" placeholder="Z" maxLength={2} className="w-14 bg-[#0a0a0a] border border-blue-500/30 rounded p-2 text-white outline-none focus:border-blue-400 text-center font-bold uppercase text-sm placeholder-blue-900" 
                  value={config.endRack} onChange={e => setConfig({...config, endRack: e.target.value.toUpperCase()})}/>
              </div>
              <button onClick={() => handleCreate(true)} disabled={loading || !config.endRack} className="h-[38px] px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2">
                {loading ? <Loader2 className="animate-spin" size={14}/> : <Plus size={14}/>} 일괄생성
              </button>
            </div>
        </div>
      </div>

      {/* 🏗️ [데이터 그리드 뷰어] */}
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-[700px]">
        {/* 상단 상태바 */}
        <div className="flex items-center justify-between px-6 py-3 bg-[#161616] border-b border-gray-800">
           <div className="flex items-center gap-2">
             <TableIcon size={14} className="text-gray-400"/>
             <span className="text-xs font-bold text-gray-300">LOCATION LIST</span>
           </div>
           <span className="text-[10px] font-mono text-blue-400 font-bold bg-blue-900/10 px-2 py-1 rounded border border-blue-900/30">
             Total: {allLocations.length.toLocaleString()}
           </span>
        </div>

        {/* 1단계 탭 */}
        <div className="flex bg-[#111] border-b border-gray-800">
          <button onClick={() => {setMainTab('PRODUCTION'); setSelectedZone("");}} className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all ${mainTab === 'PRODUCTION' ? 'border-blue-500 text-blue-400 bg-blue-900/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            생산창고 (Rack)
          </button>
          <button onClick={() => {setMainTab('LOGISTICS'); setSelectedZone("");}} className={`flex-1 py-3 text-xs font-bold border-b-2 transition-all ${mainTab === 'LOGISTICS' ? 'border-green-500 text-green-400 bg-green-900/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            물류창고 (Zone)
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 2단계: 사이드바 (Zone List) */}
          <div className="w-48 border-r border-gray-800 bg-[#111] overflow-y-auto custom-scrollbar">
            <div className="p-3 text-[10px] font-black text-gray-600 uppercase tracking-widest border-b border-gray-800/50 bg-[#111] sticky top-0">Select Zone</div>
            {zones.map(z => (
              <button 
                key={z} 
                onClick={() => setSelectedZone(z)} 
                className={`w-full text-left px-5 py-3 text-xs font-bold flex justify-between items-center transition-all border-b border-gray-800/30 ${selectedZone === z ? "bg-blue-600/10 text-blue-400 border-l-2 border-l-blue-400" : "text-gray-500 hover:bg-gray-800/50 hover:text-gray-300"}`}
              >
                <span>{z} {mainTab === 'PRODUCTION' ? 'Rack' : 'Zone'}</span>
                {selectedZone === z && <ChevronRight size={12} />}
              </button>
            ))}
          </div>

          {/* 3단계: 메인 테이블 (Table View) */}
          <div className="flex-1 bg-[#0a0a0a] overflow-auto custom-scrollbar relative">
             {loading && (
               <div className="absolute inset-0 bg-black/50 z-20 flex items-center justify-center backdrop-blur-sm">
                 <Loader2 className="animate-spin text-blue-500" size={30}/>
               </div>
             )}
             
             <table className="w-full text-left border-collapse">
               <thead className="sticky top-0 bg-[#161616] z-10 shadow-sm">
                 <tr>
                   <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800">Loc ID</th>
                   <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800">Zone</th>
                   <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800">Rack</th>
                   <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800">Level</th>
                   <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800">Side</th>
                   <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800 text-center">Stock</th>
                   <th className="px-6 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-800 text-right">Status</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-800/50">
                 {filteredLocs.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-20 text-gray-600 text-xs">데이터가 없습니다.</td></tr>
                 ) : (
                   filteredLocs.map(loc => {
                     const qty = loc.inventory?.reduce((acc: number, cur: any) => acc + cur.quantity, 0) || 0;
                     return (
                       <tr key={loc.loc_id} className={`group hover:bg-blue-900/5 transition-colors ${loc.active_flag === 'N' ? 'opacity-40 grayscale bg-red-900/5' : ''}`}>
                         <td className="px-6 py-3 text-xs font-mono font-bold text-blue-400 group-hover:text-blue-300">{loc.loc_id}</td>
                         <td className="px-6 py-3 text-xs text-gray-400">{loc.zone}</td>
                         <td className="px-6 py-3 text-xs text-gray-400">{loc.rack_no}</td>
                         <td className="px-6 py-3 text-xs text-gray-400">{loc.level_no}</td>
                         <td className="px-6 py-3 text-xs text-gray-400">SIDE-{loc.side}</td>
                         <td className="px-6 py-3 text-center">
                           <span className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${qty > 0 ? 'bg-orange-900/20 text-orange-400' : 'text-gray-600'}`}>
                             {qty > 0 ? qty.toLocaleString() : '-'}
                           </span>
                         </td>
                         <td className="px-6 py-3 text-right">
                           <button onClick={() => handleToggleActive(loc.loc_id, loc.active_flag)} className={`text-[10px] font-bold px-2 py-1 rounded border transition-all ${loc.active_flag === 'Y' ? 'text-green-500 border-green-900/30 bg-green-900/10 hover:bg-red-900/20 hover:text-red-500 hover:border-red-900/30' : 'text-red-500 border-red-900/30 bg-red-900/10 hover:bg-green-900/20 hover:text-green-500 hover:border-green-900/30'}`}>
                             {loc.active_flag === 'Y' ? 'ACTIVE' : 'INACTIVE'}
                           </button>
                         </td>
                       </tr>
                     );
                   })
                 )}
               </tbody>
             </table>
          </div>
        </div>
      </div>
    </div>
  );
}