"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/utils/supabase/client";
import { X, MapPin, Layers, Factory, ChevronRight } from "lucide-react";

interface Props {
  onClose: () => void;
  onSelect: (locId: string) => void;
}

export default function LocationSelectorModal({ onClose, onSelect }: Props) {
  const supabase = createClient();
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 계층 선택 상태
  const [mainTab, setMainTab] = useState<'LOGISTICS' | 'PRODUCTION'>('PRODUCTION');
  const [selectedZone, setSelectedZone] = useState<string>("");     // 예: A, B, C...
  const [selectedRackNo, setSelectedRackNo] = useState<string>(""); // 예: AA, AB...

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

  // --- 데이터 계층화 로직 ---
  const { zones, rackNos, finalCells } = useMemo(() => {
    // 1단계: 탭에 따른 Zone 분류
    const filteredByTab = locations.filter(l => {
      const isLogis = (l.zone === '2F' || l.loc_id.startsWith('2F'));
      return mainTab === 'LOGISTICS' ? isLogis : !isLogis;
    });

    const zoneList = Array.from(new Set(filteredByTab.map(l => l.zone || "ETC"))).sort();

    // 2단계: 선택된 Zone에 속한 세부 RackNo(AA, AB...) 추출
    const filteredByZone = filteredByTab.filter(l => !selectedZone || l.zone === selectedZone);
    const rackNoList = Array.from(new Set(filteredByZone.map(l => l.rack_no))).sort();

    // 3단계: 최종 선택된 RackNo에 속한 셀들 (Level/Side 정보 위주)
    const cells = filteredByZone.filter(l => !selectedRackNo || l.rack_no === selectedRackNo);

    return { zones: zoneList, rackNos: rackNoList, finalCells: cells };
  }, [locations, mainTab, selectedZone, selectedRackNo]);

  // 상위 선택 변경 시 하위 선택 초기화
  const handleTabChange = (tab: 'LOGISTICS' | 'PRODUCTION') => {
    setMainTab(tab);
    setSelectedZone("");
    setSelectedRackNo("");
  };

  const handleZoneChange = (zone: string) => {
    setSelectedZone(zone);
    setSelectedRackNo("");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-[#0a0a0a] border border-gray-800 rounded-2xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden font-[family-name:var(--font-geist-sans)]">
        
        {/* 헤더: 1차 탭 (창고 구분) */}
        <div className="p-6 border-b border-gray-800 bg-[#111]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tighter">
              <MapPin className="text-yellow-500" size={20}/> 위치 계층 선택 (Drill-down)
            </h2>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition"><X /></button>
          </div>

          <div className="flex bg-black p-1 rounded-xl border border-gray-800">
            <button onClick={() => handleTabChange('PRODUCTION')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-black transition-all ${mainTab === 'PRODUCTION' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-500 hover:text-gray-300'}`}>
              <Layers size={16}/> 생산창고 (A~S Rack)
            </button>
            <button onClick={() => handleTabChange('LOGISTICS')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-black transition-all ${mainTab === 'LOGISTICS' ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'text-gray-500 hover:text-gray-300'}`}>
              <Factory size={16}/> 물류창고 (2F 구역)
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 1단계: Zone/Rack 대분류 (예: A, B, C...) */}
          <div className="w-48 border-r border-gray-800 bg-[#0d0d0d] overflow-y-auto custom-scrollbar">
            <div className="p-4 text-[10px] font-black text-gray-600 uppercase tracking-widest border-b border-gray-800/50 mb-2">1. 구역 선택</div>
            {zones.map(z => (
              <button key={z} onClick={() => handleZoneChange(z)} className={`w-full text-left px-6 py-4 text-sm font-bold flex justify-between items-center transition-all ${selectedZone === z ? "bg-blue-600/10 text-blue-500 border-r-2 border-blue-500" : "text-gray-500 hover:bg-gray-800/50"}`}>
                {z} {mainTab === 'PRODUCTION' ? 'Rack' : 'Zone'}
                {selectedZone === z && <ChevronRight size={14} />}
              </button>
            ))}
          </div>

          {/* 2단계: 세부 Rack No (예: AA, AB, AC...) */}
          <div className="w-56 border-r border-gray-800 bg-[#080808] overflow-y-auto custom-scrollbar">
            <div className="p-4 text-[10px] font-black text-gray-600 uppercase tracking-widest border-b border-gray-800/50 mb-2">2. 세부 번호</div>
            {!selectedZone ? (
              <div className="p-6 text-xs text-gray-700 italic">구역을 먼저 선택하세요</div>
            ) : rackNos.map(rn => (
              <button key={rn} onClick={() => setSelectedRackNo(rn)} className={`w-full text-left px-6 py-4 text-sm font-bold flex justify-between items-center transition-all ${selectedRackNo === rn ? "bg-white/5 text-white border-r-2 border-white" : "text-gray-500 hover:bg-gray-800/50"}`}>
                {rn}
                {selectedRackNo === rn && <ChevronRight size={14} />}
              </button>
            ))}
          </div>

          {/* 3단계: 최종 위치 그리드 (Level & Side) */}
          <div className="flex-1 bg-black overflow-y-auto p-6 custom-scrollbar">
            <div className="flex justify-between items-center mb-6 pb-2 border-b border-gray-800">
              <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">3. 최종 위치 선택 (Level/Side)</div>
              {selectedRackNo && <span className="text-xs text-blue-500 font-bold">{selectedRackNo} 리스트</span>}
            </div>

            {loading ? (
              <div className="flex h-full items-center justify-center text-gray-700 font-mono text-xs">LOADING DATA...</div>
            ) : !selectedRackNo ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-700">
                <MapPin size={48} className="mb-4 opacity-10" />
                <p className="text-sm">세부 번호를 선택하면 입고 가능한 셀이 나타납니다.</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-3">
                {finalCells.map(loc => {
                  const qty = loc.inventory?.reduce((acc: number, cur: any) => acc + cur.quantity, 0) || 0;
                  return (
                    <button key={loc.loc_id} onClick={() => onSelect(loc.loc_id)} className="flex flex-col p-4 bg-[#161b22] border border-gray-800 rounded-xl hover:border-blue-500 hover:bg-blue-600/10 transition-all group text-left relative overflow-hidden">
                      <div className="text-[10px] text-gray-500 mb-1 font-mono uppercase tracking-tighter">
                         {loc.level_no}단 / {loc.side === '1' ? 'SIDE-1' : 'SIDE-2'}
                      </div>
                      <div className="text-base font-mono font-bold text-white group-hover:text-blue-400 transition-colors mb-2">
                        {loc.loc_id}
                      </div>
                      <div className={`text-[10px] font-bold ${qty > 0 ? 'text-orange-500' : 'text-gray-600'}`}>
                        {qty > 0 ? `${qty.toLocaleString()} PCS` : 'EMPTY'}
                      </div>
                      <div className="absolute bottom-0 left-0 h-1 bg-blue-500 w-0 group-hover:w-full transition-all"></div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}