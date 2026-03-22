"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, RotateCcw, Box, MapPin, Layers, Factory, Truck, CheckCircle2, Package, Snowflake } from "lucide-react";

interface Props {
  zones: string[];
  items: any[]; 
}

type TabType = "ALL" | "LOGISTICS" | "PRODUCTION" | "CONTAINER";

export default function InventorySearchForm({ zones, items }: Props) {
  const router = useRouter();
  
  const [keyword, setKeyword] = useState("");
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("PRODUCTION");
  const [loading, setLoading] = useState(false);

  // ✨ Zone 리스트 정제 및 분류 (CT 및 공백 완벽 제거)
  const logisticsZones = zones.filter(z => z.includes('2F')).sort();
  const productionZones = zones.filter(z => 
    !z.includes('2F') && 
    !z.includes('CT') && 
    z.trim() !== ''
  ).sort();

  // ❄️ 냉동 컨테이너 1~13번 고정 배열
  const containerNumbers = Array.from({ length: 13 }, (_, i) => String(i + 1));

  // 검색어 자동완성 필터링
  const filteredItems = keyword.trim() 
    ? items.filter(i => {
        const terms = keyword.toLowerCase().trim().split(/\s+/); 
        const targetText = `${i.item_name || ''} ${i.item_key || ''} ${i.remark || ''}`.toLowerCase();
        return terms.every(term => targetText.includes(term));
      }).slice(0, 8) 
    : [];

  const handleTabChange = (tab: TabType) => {
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

    if (keyword) {
      // 🚀 핵심 변경: 검색어가 입력된 경우, 하위 탭/구역 조건을 무시하고 무조건 전체 검색 수행!
      params.set("query", keyword);
      
      // UX 개선: 전체 검색이 실행되었음을 인지할 수 있도록 UI 탭도 '전체 보기'로 자동 변경 및 구역 초기화
      setActiveTab("ALL");
      setSelectedZones([]);
    } else {
      // 검색어가 없을 때만 현재 선택된 탭과 구역 조건으로 필터링
      if (activeTab !== "ALL") {
         params.set("team", activeTab); 
         if (selectedZones.length > 0) {
           params.set("zones", selectedZones.join(","));
         }
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
    <div className="max-w-4xl mx-auto mt-4 md:mt-10 p-4 md:p-6 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl animate-fade-in pb-24">
      <div className="flex items-center gap-3 mb-6 md:mb-8 border-b border-gray-800 pb-4">
        <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-900/30 rounded-lg flex items-center justify-center shrink-0">
          <Layers className="text-blue-500" size={24} />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white">재고 현황 조회</h1>
          <p className="text-gray-400 text-xs md:text-sm">팀을 선택하고 랙을 지정하거나, 검색어를 입력하세요.</p>
        </div>
      </div>

      <div className="space-y-6 md:space-y-8">
        
        {/* 보관 위치 선택 */}
        <div>
          <label className="block text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
            <MapPin size={16} /> 보관 위치 (Storage Location)
          </label>

          {/* 1. 상단 탭 버튼 (4개로 분할) */}
          <div className="grid grid-cols-4 gap-1 md:gap-2 bg-gray-950 p-1 rounded-lg mb-4 border border-gray-800">
            <button
              onClick={() => handleTabChange("PRODUCTION")}
              className={`py-2 md:py-2.5 rounded-md text-[10px] md:text-sm font-bold transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${
                activeTab === "PRODUCTION" ? "bg-purple-900/50 text-purple-400 shadow ring-1 ring-purple-500/50" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Factory size={16} className="mb-0.5 md:mb-0"/>
              <span className="whitespace-nowrap">생산팀</span>
            </button>
            <button
              onClick={() => handleTabChange("CONTAINER")}
              className={`py-2 md:py-2.5 rounded-md text-[10px] md:text-sm font-bold transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${
                activeTab === "CONTAINER" ? "bg-cyan-900/50 text-cyan-400 shadow ring-1 ring-cyan-500/50" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Snowflake size={16} className="mb-0.5 md:mb-0"/>
              <span className="whitespace-nowrap">컨테이너</span>
            </button>
            <button
              onClick={() => handleTabChange("LOGISTICS")}
              className={`py-2 md:py-2.5 rounded-md text-[10px] md:text-sm font-bold transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${
                activeTab === "LOGISTICS" ? "bg-blue-900/50 text-blue-400 shadow ring-1 ring-blue-500/50" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Truck size={16} className="mb-0.5 md:mb-0"/>
              <span className="whitespace-nowrap">물류팀</span>
            </button>
             <button
              onClick={() => handleTabChange("ALL")}
              className={`py-2 md:py-2.5 rounded-md text-[10px] md:text-sm font-bold transition-all flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${
                activeTab === "ALL" ? "bg-gray-800 text-white shadow ring-1 ring-gray-600" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Layers size={16} className="mb-0.5 md:mb-0"/>
              <span className="whitespace-nowrap">전체 보기</span>
            </button>
          </div>

          {/* 2. 하위 랙/구역 선택 버튼 */}
          <div className="bg-gray-950/50 p-3 md:p-4 rounded-lg border border-gray-800/50 min-h-[80px] flex items-center transition-all">
              
              {/* A. 생산팀 랙 리스트 */}
              {activeTab === "PRODUCTION" && (
                <div className="w-full">
                  <div className="text-[10px] md:text-xs text-purple-300 mb-3 font-bold flex flex-col md:flex-row items-start md:items-center justify-between gap-1 bg-purple-900/20 p-2 rounded border border-purple-500/30">
                     <span className="flex items-center gap-1"><CheckCircle2 size={12}/> 랙(Rack) 다중 선택 가능</span>
                     <span className="opacity-80">선택하지 않으면 [생산팀 전체] 조회</span>
                  </div>
                  <div className="grid grid-cols-6 md:grid-cols-8 gap-1.5 md:gap-2 animate-fade-in">
                    {productionZones.map((zone) => {
                      const isSelected = selectedZones.includes(zone);
                      return (
                        <button
                          key={zone}
                          onClick={() => toggleZone(zone)}
                          className={`py-2 text-xs md:text-sm rounded border transition-all relative ${
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

              {/* B. 냉동 컨테이너 리스트 (신규 추가) */}
              {activeTab === "CONTAINER" && (
                <div className="w-full">
                  <div className="text-[10px] md:text-xs text-cyan-300 mb-3 font-bold flex flex-col md:flex-row items-start md:items-center justify-between gap-1 bg-cyan-900/20 p-2 rounded border border-cyan-500/30">
                     <span className="flex items-center gap-1"><CheckCircle2 size={12}/> 컨테이너 번호(1~13) 다중 선택 가능</span>
                     <span className="opacity-80">선택하지 않으면 [컨테이너 전체] 조회</span>
                  </div>
                  <div className="grid grid-cols-5 md:grid-cols-7 gap-1.5 md:gap-2 animate-fade-in">
                    {containerNumbers.map((num) => {
                       const isSelected = selectedZones.includes(num);
                       return (
                        <button
                          key={num}
                          onClick={() => toggleZone(num)}
                          className={`py-2 text-xs md:text-sm rounded border transition-all relative ${
                            isSelected 
                              ? "bg-cyan-600 text-white border-cyan-400 font-bold shadow-[0_0_10px_rgba(6,182,212,0.5)]" 
                              : "bg-gray-900 text-gray-400 border-gray-700 hover:bg-gray-800"
                          }`}
                        >
                          {num}호
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* C. 물류팀 구역 리스트 */}
              {activeTab === "LOGISTICS" && (
                <div className="w-full">
                  <div className="text-[10px] md:text-xs text-blue-300 mb-3 font-bold flex flex-col md:flex-row items-start md:items-center justify-between gap-1 bg-blue-900/20 p-2 rounded border border-blue-500/30">
                     <span className="flex items-center gap-1"><CheckCircle2 size={12}/> 구역(Zone) 다중 선택 가능</span>
                     <span className="opacity-80">선택하지 않으면 [물류팀 전체] 조회</span>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-6 gap-1.5 md:gap-2 animate-fade-in">
                    {logisticsZones.map((zone) => {
                       const isSelected = selectedZones.includes(zone);
                       return (
                        <button
                          key={zone}
                          onClick={() => toggleZone(zone)}
                          className={`py-2 text-xs md:text-sm rounded border transition-all relative ${
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

              {/* D. 전체 보기 메시지 */}
              {activeTab === "ALL" && (
                <div className="text-xs md:text-sm text-gray-500 text-center w-full flex flex-col items-center gap-2 py-4">
                  <Layers size={32} className="text-gray-700"/>
                  <span>모든 구역(생산팀 + 컨테이너 + 물류팀)의 전체 재고를 조회합니다.</span>
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
              className="w-full bg-black border border-gray-700 text-white rounded-lg pl-10 md:pl-12 pr-4 py-3 md:py-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-gray-600 text-base md:text-lg"
            />
            <Search className="absolute left-3 md:left-4 top-1/2 transform -translate-y-1/2 text-gray-500" size={18} />
            
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
          <p className="text-[10px] md:text-xs text-gray-500 mt-2 pl-1 break-keep">
            * 띄어쓰기를 하면 <span className="text-blue-400 font-bold">AND 조건</span>으로 검색됩니다.
          </p>
        </div>

        {/* 버튼 영역 */}
        <div className="pt-2 md:pt-4 flex gap-3">
          <button 
            onClick={() => { setKeyword(""); setSelectedZones([]); handleTabChange("PRODUCTION"); }}
            className="px-4 md:px-6 py-3 md:py-4 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white transition font-bold flex items-center justify-center gap-2 text-sm md:text-base shrink-0"
          >
            <RotateCcw size={16} className="md:w-[18px] md:h-[18px]"/> 
            <span className="hidden md:inline">초기화</span>
          </button>
          
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white py-3 md:py-4 rounded-lg font-bold text-base md:text-lg shadow-lg shadow-blue-900/30 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? <span className="animate-spin text-xl md:text-2xl">⟳</span> : <><Search size={18} className="md:w-[20px] md:h-[20px]"/> 조회 실행</>}
          </button>
        </div>

      </div>
    </div>
  );
}