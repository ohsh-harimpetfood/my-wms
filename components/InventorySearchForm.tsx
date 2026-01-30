"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RotateCcw, Box, MapPin, Layers, Factory, Truck, CheckCircle2, Package } from "lucide-react";

interface Props {
  zones: string[];
  items: any[]; 
}

export default function InventorySearchForm({ zones, items }: Props) {
  const router = useRouter();
  
  const [keyword, setKeyword] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"ALL" | "LOGISTICS" | "PRODUCTION">("PRODUCTION");
  const [loading, setLoading] = useState(false);

  // ✨ 서버에서 받아온 전체 Zone 리스트를 분류
  // 2F가 포함되면 물류, 아니면 생산
  const logisticsZones = zones.filter(z => z.includes('2F')).sort();
  const productionZones = zones.filter(z => !z.includes('2F')).sort();

  // 검색어 자동완성 필터링
  const filteredItems = keyword.trim() 
    ? items.filter(i => {
        const terms = keyword.toLowerCase().trim().split(/\s+/); 
        const targetText = `${i.item_name || ''} ${i.item_key || ''} ${i.remark || ''}`.toLowerCase();
        return terms.every(term => targetText.includes(term));
      }).slice(0, 8) 
    : [];

  const handleTabChange = (tab: "ALL" | "LOGISTICS" | "PRODUCTION") => {
    setActiveTab(tab);
    setSelectedZones([]); 
  };

  const toggleZone = (zone: string) => {
    if (selectedZones.includes(zone)) {
      setSelectedZones(selectedZones.filter(z => z !== zone));
    } else {
      setSelectedZones([...selectedZones, zone]);
    }
  };

  const handleSearch = () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("search", "true");
    if (keyword) params.set("query", keyword);

    if (activeTab !== "ALL") {
       params.set("team", activeTab); 
       if (selectedZones.length > 0) {
         params.set("zones", selectedZones.join(","));
       }
    }
    router.push(`/inventory?${params.toString()}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setShowItemDropdown(false);
      handleSearch();
    }
  };

  const handleSelectItem = (item: any) => {
    setKeyword(item.item_name); 
    setShowItemDropdown(false);
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 p-6 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-8 border-b border-gray-800 pb-4">
        <div className="w-12 h-12 bg-blue-900/30 rounded-lg flex items-center justify-center">
          <Layers className="text-blue-500" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">재고 현황 조회</h1>
          <p className="text-gray-400 text-sm">팀을 선택하고 랙을 지정하거나, 검색어를 입력하세요.</p>
        </div>
      </div>

      <div className="space-y-8">
        
        {/* 보관 위치 선택 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <MapPin size={16} /> 보관 위치 (Storage Location)
          </label>

          {/* 1. 상단 탭 버튼 */}
          <div className="flex bg-gray-950 p-1 rounded-lg mb-4 w-fit border border-gray-800">
            <button
              onClick={() => handleTabChange("PRODUCTION")}
              className={`px-5 py-2.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "PRODUCTION" ? "bg-purple-900/50 text-purple-400 shadow ring-1 ring-purple-500/50" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Factory size={16}/> 생산팀 (랙 A~S)
            </button>
            <button
              onClick={() => handleTabChange("LOGISTICS")}
              className={`px-5 py-2.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "LOGISTICS" ? "bg-blue-900/50 text-blue-400 shadow ring-1 ring-blue-500/50" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Truck size={16}/> 물류팀 (창고 2F)
            </button>
             <button
              onClick={() => handleTabChange("ALL")}
              className={`px-5 py-2.5 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "ALL" ? "bg-gray-800 text-white shadow ring-1 ring-gray-600" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Layers size={16}/> 전체 보기
            </button>
          </div>

          {/* 2. 하위 랙/구역 선택 버튼 */}
          <div className="bg-gray-950/50 p-4 rounded-lg border border-gray-800/50 min-h-[80px] flex items-center">
             
             {/* A. 생산팀 랙 리스트 */}
             {activeTab === "PRODUCTION" && (
               <div className="w-full">
                 <div className="text-xs text-purple-300 mb-3 font-bold flex items-center justify-between bg-purple-900/20 p-2 rounded border border-purple-500/30">
                    <span className="flex items-center gap-1"><CheckCircle2 size={12}/> 랙(Rack) 다중 선택 가능</span>
                    <span>선택하지 않으면 [생산팀 전체]가 조회됩니다.</span>
                 </div>
                 <div className="grid grid-cols-6 md:grid-cols-8 gap-2 animate-fade-in">
                    {productionZones.map((zone) => {
                      const isSelected = selectedZones.includes(zone);
                      return (
                        <button
                          key={zone}
                          onClick={() => toggleZone(zone)}
                          className={`py-2 text-sm rounded border transition-all relative ${
                            isSelected 
                              ? "bg-purple-600 text-white border-purple-500 font-bold shadow-[0_0_10px_rgba(147,51,234,0.5)]" 
                              : "bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-800"
                          }`}
                        >
                          {zone}
                        </button>
                      );
                    })}
                 </div>
               </div>
             )}

             {/* B. 물류팀 구역 리스트 */}
             {activeTab === "LOGISTICS" && (
               <div className="w-full">
                 <div className="text-xs text-blue-300 mb-3 font-bold flex items-center justify-between bg-blue-900/20 p-2 rounded border border-blue-500/30">
                    <span className="flex items-center gap-1"><CheckCircle2 size={12}/> 구역(Zone) 다중 선택 가능</span>
                    <span>선택하지 않으면 [물류팀 전체]가 조회됩니다.</span>
                 </div>
                 <div className="grid grid-cols-4 md:grid-cols-6 gap-2 animate-fade-in">
                    {logisticsZones.map((zone) => {
                       const isSelected = selectedZones.includes(zone);
                       return (
                        <button
                          key={zone}
                          onClick={() => toggleZone(zone)}
                          className={`py-2 text-sm rounded border transition-all relative ${
                            isSelected 
                              ? "bg-blue-600 text-white border-blue-500 font-bold shadow-[0_0_10px_rgba(37,99,235,0.5)]" 
                              : "bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-800"
                          }`}
                        >
                          {zone}
                        </button>
                      );
                    })}
                 </div>
               </div>
             )}

             {/* C. 전체 보기 메시지 */}
             {activeTab === "ALL" && (
                <div className="text-sm text-gray-500 text-center w-full flex flex-col items-center gap-2 py-4">
                  <Layers size={32} className="text-gray-700"/>
                  <span>모든 구역(생산팀 + 물류팀)의 전체 재고를 조회합니다.</span>
                </div>
             )}
          </div>
        </div>

        {/* 상세 검색 (자동완성 UI) */}
        <div className="relative">
          <label className="block text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
            <Box size={16} /> 상세 검색 (Smart Search)
          </label>
          <div className="relative">
            <input
              type="text"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setShowItemDropdown(true);
              }}
              onFocus={() => setShowItemDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder="예: 닭고기 10kg A (품목명, 규격, 랙 번호 등)"
              className="w-full bg-black border border-gray-700 text-white rounded-lg pl-12 pr-4 py-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600 text-lg"
            />
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
            
            {/* 자동완성 드롭다운 */}
            {showItemDropdown && keyword && filteredItems.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-700 rounded-b mt-1 z-50 shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
                 {filteredItems.map(item => (
                    <div 
                      key={item.item_key} 
                      onClick={() => handleSelectItem(item)} 
                      className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 transition text-sm flex items-center justify-between group"
                    >
                        <div>
                          <div className="font-bold text-white group-hover:text-blue-400 transition">{item.item_name}</div>
                          <div className="text-xs text-gray-500 mt-0.5 flex gap-2">
                            <span className="bg-gray-900 px-1 rounded">{item.item_key}</span>
                          </div>
                        </div>
                        <Package size={16} className="text-gray-600 group-hover:text-white"/>
                    </div>
                 ))}
              </div>
            )}
            
            {/* 백드롭 */}
            {showItemDropdown && keyword && (
              <div className="fixed inset-0 z-40" onClick={() => setShowItemDropdown(false)}></div>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2 pl-1">
            * 띄어쓰기를 하면 <span className="text-blue-400 font-bold">AND 조건</span>으로 검색됩니다.
          </p>
        </div>

        {/* 버튼 영역 */}
        <div className="pt-4 flex gap-3">
          <button 
            onClick={() => { setKeyword(""); setSelectedZones([]); handleTabChange("PRODUCTION"); }}
            className="px-6 py-4 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition font-bold flex items-center gap-2"
          >
            <RotateCcw size={18} /> 초기화
          </button>
          
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white py-4 rounded-lg font-bold text-lg shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? <span className="animate-spin text-2xl">⟳</span> : <><Search size={20} /> 조회 실행</>}
          </button>
        </div>

      </div>
    </div>
  );
}