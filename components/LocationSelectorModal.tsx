"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { X, MapPin, ChevronRight, LayoutGrid } from "lucide-react";

interface Props {
  onClose: () => void;
  onSelect: (locId: string) => void;
}

export default function LocationSelectorModal({ onClose, onSelect }: Props) {
  const supabase = createClient();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // --- [1. 선택 상태 관리] ---
  const [mainTab, setMainTab] = useState<'PRODUCTION' | 'LOGISTICS'>('PRODUCTION');
  const [selectedZone, setSelectedZone] = useState<string>("");     
  const [selectedRack, setSelectedRack] = useState<string>("");     
  const [selectedSide, setSelectedSide] = useState<string>("");     

  // --- [2. 전체 데이터 로딩] ---
  useEffect(() => {
    const fetchLocs = async () => {
      setLoading(true);
      let allData: any[] = [];
      let from = 0;
      while (true) {
        const { data, error } = await supabase
          .from("loc_master")
          .select("*, inventory(quantity)")
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

  // --- [3. 데이터 필터링 로직] ---
  const { zones, racks, sides, finalCells } = useMemo(() => {
    // 0. 탭 필터
    const tabFiltered = locations.filter(l => {
      const isLogis = (l.zone === '2F' || l.loc_id.startsWith('2F'));
      return mainTab === 'LOGISTICS' ? isLogis : !isLogis;
    });

    const zoneList = Array.from(new Set(tabFiltered.map(l => l.zone || "ETC"))).sort();
    
    const zoneFiltered = tabFiltered.filter(l => !selectedZone || l.zone === selectedZone);
    const rackList = Array.from(new Set(zoneFiltered.map(l => l.rack_no))).sort();

    const rackFiltered = zoneFiltered.filter(l => !selectedRack || l.rack_no === selectedRack);
    const sideList = Array.from(new Set(rackFiltered.map(l => l.side))).sort();

    const finalFiltered = rackFiltered.filter(l => !selectedSide || l.side === selectedSide);
    
    // 최종 리스트 정렬 (단수 오름차순)
    finalFiltered.sort((a, b) => Number(a.level_no) - Number(b.level_no));

    return { zones: zoneList, racks: rackList, sides: sideList, finalCells: finalFiltered };
  }, [locations, mainTab, selectedZone, selectedRack, selectedSide]);

  // --- [핸들러] ---
  const handleMainTab = (tab: any) => { 
      setMainTab(tab); 
      setSelectedZone(""); setSelectedRack(""); setSelectedSide(""); 
  };
  
  const handleZone = (z: string) => { 
      setSelectedZone(z); 
      setSelectedRack(""); setSelectedSide(""); 
  };

  const handleRack = (r: string) => { 
      setSelectedRack(r);
      // ✨ [수정] 랙 선택 시 Side 1번 자동 선택 (Default)
      setSelectedSide("1"); 
  };
  
  const handleSide = (s: string) => { 
      setSelectedSide(s); 
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl w-full max-w-7xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-[family-name:var(--font-geist-sans)]">
        
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-800 bg-[#111] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tighter">
              <MapPin className="text-yellow-500" size={24}/> 위치 선택
            </h2>
            <div className="flex bg-black p-1 rounded-lg border border-gray-800">
              <button onClick={() => handleMainTab('PRODUCTION')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mainTab === 'PRODUCTION' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                생산창고
              </button>
              <button onClick={() => handleMainTab('LOGISTICS')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${mainTab === 'LOGISTICS' ? 'bg-green-600 text-white' : 'text-gray-500 hover:text-white'}`}>
                물류창고
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-full transition"><X size={28}/></button>
        </div>

        {/* 메인 컨텐츠 (4단 분할) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* [1단계] 구역 (Zone) */}
          <div className="w-40 border-r border-gray-800 bg-[#0d0d0d] flex flex-col">
            <div className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-800/50 bg-[#111]">1. Zone</div>
            <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1">
              {zones.map(z => (
                <button key={z} onClick={() => handleZone(z)} className={`w-full text-left px-4 py-5 text-lg font-bold rounded-lg flex justify-between items-center transition-all ${selectedZone === z ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:bg-gray-800"}`}>
                  {z} {mainTab === 'PRODUCTION' ? '' : '구역'}
                  {selectedZone === z && <ChevronRight size={20} />}
                </button>
              ))}
            </div>
          </div>

          {/* [2단계] 열 (Rack) */}
          <div className="w-40 border-r border-gray-800 bg-[#111] flex flex-col">
            <div className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-800/50 bg-[#161616]">2. Rack (열)</div>
            <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1">
              {!selectedZone ? <div className="p-4 text-gray-600 text-sm">Zone 선택 필요</div> : 
               racks.map(r => (
                <button key={r} onClick={() => handleRack(r)} className={`w-full text-left px-4 py-5 text-lg font-bold rounded-lg flex justify-between items-center transition-all ${selectedRack === r ? "bg-blue-600/20 text-blue-400 border border-blue-500/50" : "text-gray-400 hover:bg-gray-800"}`}>
                  {r} <span className="text-xs opacity-50 ml-1">열</span>
                  {selectedRack === r && <ChevronRight size={20} />}
                </button>
              ))}
            </div>
          </div>

          {/* [3단계] Side */}
          <div className="w-40 border-r border-gray-800 bg-[#0d0d0d] flex flex-col">
            <div className="p-4 text-xs font-black text-gray-500 uppercase tracking-widest border-b border-gray-800/50 bg-[#111]">3. Side</div>
            <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-1">
              {!selectedRack ? <div className="p-4 text-gray-600 text-sm">Rack 선택 필요</div> : 
               sides.map(s => (
                <button key={s} onClick={() => handleSide(s)} className={`w-full text-left px-4 py-5 text-lg font-bold rounded-lg flex justify-between items-center transition-all ${selectedSide === s ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:bg-gray-800"}`}>
                  Side {s}
                  {selectedSide === s && <ChevronRight size={20} />}
                </button>
              ))}
            </div>
          </div>

          {/* [4단계] 최종 위치 (Level) - ✨ 1줄 1카드 레이아웃 */}
          <div className="flex-1 bg-black flex flex-col">
            <div className="p-4 border-b border-gray-800 bg-[#161616] flex justify-between items-center">
              <div className="text-xs font-black text-gray-400 uppercase tracking-widest">4. Final Location (최종 선택)</div>
              {selectedSide && <div className="text-sm font-bold text-white bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                {selectedZone}-{selectedRack} (Side {selectedSide})
              </div>}
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#050505]">
              {loading ? <div className="flex h-full items-center justify-center text-gray-500 animate-pulse">데이터 로딩중...</div> :
               !selectedSide ? (
                 <div className="flex flex-col items-center justify-center h-full text-gray-700 gap-4">
                   <LayoutGrid size={64} strokeWidth={1} />
                   <p className="text-lg">좌측에서 선택을 진행해주세요.</p>
                 </div>
               ) : (
                 // ✨ [수정] grid-cols-1로 변경하여 한 줄에 하나씩 배치
                 <div className="grid grid-cols-1 gap-3">
                   {finalCells.map(loc => {
                     const qty = loc.inventory?.reduce((acc: number, cur: any) => acc + cur.quantity, 0) || 0;
                     return (
                       <button 
                         key={loc.loc_id} 
                         onClick={() => onSelect(loc.loc_id)} 
                         // ✨ 카드 높이 및 패딩 조정
                         className="flex items-center justify-between p-5 bg-[#1a1a1a] border border-gray-800 rounded-xl hover:border-blue-500 hover:bg-blue-600/10 transition-all group relative overflow-hidden text-left"
                       >
                         {/* 좌측: Loc ID (가장 크게) */}
                         <div>
                           <div className="text-3xl font-black text-white group-hover:text-blue-400 transition-colors font-mono tracking-tight">
                             {loc.loc_id}
                           </div>
                           <div className="text-sm text-gray-500 mt-1 font-bold">
                             {loc.level_no}단 / Side-{loc.side}
                           </div>
                         </div>

                         {/* 우측: 재고 상태 뱃지 */}
                         <div className="flex flex-col items-end">
                           {qty > 0 ? (
                             <span className="bg-orange-900/30 text-orange-400 border border-orange-800/50 px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
                               {qty.toLocaleString()} PCS
                             </span>
                           ) : (
                             <span className="text-gray-600 text-xs font-bold border border-gray-800 px-3 py-1 rounded-lg bg-black/50">
                               EMPTY
                             </span>
                           )}
                         </div>

                         {/* 하단 바 효과 */}
                         <div className="absolute bottom-0 left-0 w-1 h-full bg-gray-800 group-hover:bg-blue-500 transition-colors"></div>
                       </button>
                     );
                   })}
                 </div>
               )
              }
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}