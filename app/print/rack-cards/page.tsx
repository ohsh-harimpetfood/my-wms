"use client";

import { createClient } from "@/utils/supabase/client";
import { useState, useEffect, useMemo } from "react";
import { Printer, CheckSquare, Square, Loader2, ArrowLeft, ChevronDown, ChevronUp, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

interface Location {
  loc_id: string;
  zone: string;
  rack_no: string;
  level_no: string;
  side: string;
}

interface RackStrip {
  id: string;
  zone: string;
  rack_no: string;
  side: string;
  locations: Location[];
}

export default function PrintRackCardsPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [openGroups, setOpenGroups] = useState<string[]>([]); 

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      let allData: Location[] = [];
      let from = 0;
      const limit = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("loc_master")
          .select("loc_id, zone, rack_no, level_no, side")
          .eq("active_flag", "Y")
          .neq("zone", "L") 
          .neq("zone", "J") 
          .order("zone")
          .order("rack_no")
          .order("side")
          .range(from, from + limit - 1);

        if (error || !data || data.length === 0) break;
        allData = [...allData, ...data];
        if (data.length < limit) break;
        from += limit;
      }
      setLocations(allData);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const availableZones = useMemo(() => Array.from(new Set(locations.map(l => l.zone))).sort(), [locations]);

  const groupedZones = useMemo(() => {
      const groups: Record<string, string[]> = {
          '생산창고 (1층)': [],
          '물류창고 (2층)': [],
          '기타 구역': []
      };
      availableZones.forEach(z => {
          if (z === '2F' || z.startsWith('2')) groups['물류창고 (2층)'].push(z);
          else if (z.match(/^[A-K]$/) || z.match(/^[M-S]$/)) groups['생산창고 (1층)'].push(z);
          else groups['기타 구역'].push(z);
      });
      return Object.fromEntries(Object.entries(groups).filter(([_, zones]) => zones.length > 0));
  }, [availableZones]);

  const pagesToPrint = useMemo(() => {
    if (selectedZones.length === 0) return [];
    const filtered = locations.filter(l => selectedZones.includes(l.zone));
    const stripMap = new Map<string, RackStrip>();
    
    filtered.forEach(loc => {
        const stripId = `${loc.zone}-${loc.rack_no}-${loc.side}`;
        if (!stripMap.has(stripId)) stripMap.set(stripId, { id: stripId, zone: loc.zone, rack_no: loc.rack_no, side: loc.side, locations: [] });
        stripMap.get(stripId)!.locations.push(loc);
    });

    const allStrips = Array.from(stripMap.values());
    allStrips.forEach(strip => strip.locations.sort((a, b) => Number(b.level_no) - Number(a.level_no)));

    const pages = [];
    for (let i = 0; i < allStrips.length; i += 2) pages.push(allStrips.slice(i, i + 2));
    return pages;
  }, [locations, selectedZones]);

  useEffect(() => setSelectedPages(pagesToPrint.map((_, index) => index)), [pagesToPrint]);

  const toggleZone = (zone: string) => setSelectedZones(prev => prev.includes(zone) ? prev.filter(z => z !== zone) : [...prev, zone]);
  const toggleGroup = (groupName: string, zonesInGroup: string[]) => {
      const isAllSelected = zonesInGroup.every(z => selectedZones.includes(z));
      if (isAllSelected) setSelectedZones(prev => prev.filter(z => !zonesInGroup.includes(z)));
      else setSelectedZones(Array.from(new Set([...selectedZones, ...zonesInGroup])));
  };
  const toggleAccordion = (groupName: string) => setOpenGroups(prev => prev.includes(groupName) ? prev.filter(g => g !== groupName) : [...prev, groupName]);
  const togglePage = (index: number) => setSelectedPages(prev => prev.includes(index) ? prev.filter(i => i !== index) : [...prev, index]);
  const toggleAllPages = () => setSelectedPages(selectedPages.length === pagesToPrint.length ? [] : pagesToPrint.map((_, i) => i));

  const getLevelColor = (level: string) => {
      switch (level) {
          case '1': return 'bg-white';
          case '2': return 'bg-blue-50';
          case '3': return 'bg-yellow-50';
          case '4': return 'bg-red-50';
          case '5': return 'bg-purple-50';
          default: return 'bg-gray-50';
      }
  };

  // 🚀 [해결 포인트 1] isLast(마지막 장 여부) props 추가
  const A4Page = ({ pageStrips, isPreview, isLast }: { pageStrips: RackStrip[], isPreview?: boolean, isLast?: boolean }) => (
      <div 
        className={`print-page bg-white box-border ${isPreview ? 'shadow-2xl border border-gray-300 mb-8' : ''}`}
        style={{ 
            width: '210mm', 
            height: '285mm', 
            padding: '10mm 8mm',
            margin: '0 auto', 
            // 🚀 [해결 포인트 2] 마지막 장(isLast)이거나 미리보기일 때는 강제 넘김을 'auto'로 풀어서 빈 페이지 생성 방지!
            pageBreakAfter: (isPreview || isLast) ? 'auto' : 'always', 
            pageBreakInside: 'avoid',
            display: 'block' 
        }}
      >
          <div className="w-full h-full border-[3px] border-gray-900 rounded-lg flex flex-row box-border overflow-hidden">
              {pageStrips.map((strip, stripIndex) => (
                  <div key={strip.id} className={`w-1/2 h-full flex flex-col box-border ${stripIndex === 0 ? 'border-r-[2px] border-dashed border-gray-600' : ''}`}>
                      <div className="h-[15mm] bg-gray-900 text-white flex flex-col justify-center items-center shrink-0">
                          <div className="text-2xl font-black tracking-widest leading-none">{strip.zone} - {strip.rack_no} 열</div>
                          <div className="text-[10px] font-bold text-gray-300 mt-1">Side {strip.side} (기둥 부착용)</div>
                      </div>

                      <div className="flex-1 flex flex-col w-full h-full min-h-0">
                          {strip.locations.map(loc => (
                              <div key={loc.loc_id} className={`flex-1 flex flex-col justify-center items-center border-b-[1.5px] border-gray-300 w-full px-2 py-1 ${getLevelColor(loc.level_no)} overflow-hidden`}>
                                  <div className="w-full flex justify-center items-center mb-1">
                                      <div className="text-xl font-black leading-none text-gray-600 tracking-tighter">{loc.level_no}F</div>
                                  </div>
                                  <div className="bg-white p-1.5 border-[2px] border-gray-800 rounded-lg shadow-sm mb-1 shrink-0">
                                      <QRCodeSVG value={loc.loc_id} size={80} level="H" />
                                  </div>
                                  <div className="text-2xl font-black tracking-tighter text-gray-900 whitespace-nowrap leading-none">
                                      {loc.loc_id}
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
              {pageStrips.length === 1 && <div className="w-1/2 h-full bg-gray-50 flex items-center justify-center text-gray-400 font-bold">빈 영역</div>}
          </div>
      </div>
  );

  return (
    // 🚀 [해결 포인트 3] print:min-h-0 추가하여 컨테이너가 불필요하게 늘어나는 것 방지
    <div className="min-h-screen print:min-h-0 bg-gray-100 text-gray-900 font-[family-name:var(--font-geist-sans)]">
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
            @page { size: A4 portrait; margin: 0; }
            html, body, #__next, main, body > div { 
                background: #ffffff !important; 
                margin: 0 !important; 
                padding: 0 !important;
                height: auto !important; 
                overflow: visible !important;
            }
            nav, footer, header, [class*="fixed"], [class*="sticky"], [class*="bottom-0"] {
                display: none !important;
            }
            .print\\:hidden, .no-print { display: none !important; }
            .print-only { 
                display: block !important; 
                width: 100% !important; 
                background: white !important;
            }
            .print-page {
                margin: 0 auto !important; 
                float: none !important;
                background: white !important;
            }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}} />

      {/* 🖥️ 화면 영역 */}
      <div className="print:hidden no-print">
          <div className="p-4 md:p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-200 gap-4">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition shrink-0"><ArrowLeft /></button>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black flex items-center gap-2 text-gray-800">
                            <Printer className="text-blue-600"/> 랙 카드 일괄 출력
                        </h1>
                        <p className="text-xs md:text-sm text-gray-500 mt-1">일반 랙 대상. A4 1장당 2개 열(기둥) 출력.</p>
                    </div>
                </div>
                
                <button 
                    onClick={() => window.print()}
                    disabled={selectedPages.length === 0}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold px-8 py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-lg shrink-0"
                >
                    <Printer size={24}/> 선택된 {selectedPages.length}장 인쇄
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Loader2 className="animate-spin mb-4" size={40}/>
                    <p>데이터 로딩 중...</p>
                </div>
            ) : (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
                    <div className="mb-4">
                        <h2 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                            <Layers size={20} className="text-blue-500"/> 1. 출력할 창고/구역 선택
                        </h2>
                    </div>
                    
                    <div className="space-y-4">
                        {Object.entries(groupedZones).map(([groupName, zones]) => {
                            const isOpen = openGroups.includes(groupName);
                            const isAllSelected = zones.length > 0 && zones.every(z => selectedZones.includes(z));
                            const selectedCount = zones.filter(z => selectedZones.includes(z)).length;

                            return (
                                <div key={groupName} className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50">
                                    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition" onClick={() => toggleAccordion(groupName)}>
                                        <div className="flex items-center gap-3">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); toggleGroup(groupName, zones); }}
                                                className="text-blue-600 hover:text-blue-800 transition"
                                            >
                                                {isAllSelected ? <CheckSquare size={20}/> : <Square size={20} className="text-gray-400"/>}
                                            </button>
                                            <h3 className="font-bold text-gray-800 text-lg">{groupName}</h3>
                                            {selectedCount > 0 && (
                                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                                                    {selectedCount}개 구역 선택됨
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-gray-400">{isOpen ? <ChevronUp size={20}/> : <ChevronDown size={20}/>}</div>
                                    </div>

                                    {isOpen && (
                                        <div className="p-4 flex flex-wrap gap-2 md:gap-3 bg-gray-50 animate-fade-in border-t border-gray-200">
                                            {zones.map(z => {
                                                const isSelected = selectedZones.includes(z);
                                                return (
                                                    <button 
                                                        key={z} onClick={() => toggleZone(z)}
                                                        className={`px-5 py-2.5 rounded-lg font-black text-base md:text-lg transition-all border-2 ${
                                                            isSelected ? 'bg-blue-100 border-blue-500 text-blue-700 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
                                                        }`}
                                                    >
                                                        {z} 구역
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    
                    {pagesToPrint.length > 0 && (
                        <div className="mt-6 flex flex-col md:flex-row justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100 gap-4">
                            <div className="text-sm text-blue-900">
                                총 <b>{pagesToPrint.length}장</b>의 페이지가 생성되었습니다. <br/>
                                <span className="text-blue-600/70 text-xs">아래 미리보기에서 출력할 페이지만 체크한 후 우측 상단의 [인쇄하기]를 누르세요.</span>
                            </div>
                            <button onClick={toggleAllPages} className="bg-blue-900 hover:bg-black text-white px-4 py-2 rounded-lg text-sm font-bold transition whitespace-nowrap shadow-md">
                                {selectedPages.length === pagesToPrint.length ? '모든 페이지 선택 해제' : '모든 페이지 전체 선택'}
                            </button>
                        </div>
                    )}
                </div>
            )}
          </div>

          {/* 🖥️ 화면 미리보기 영역 */}
          <div className="flex flex-col items-center gap-6 pb-32 overflow-x-auto">
            {pagesToPrint.map((pageStrips, pageIndex) => {
                const isPageSelected = selectedPages.includes(pageIndex);
                return (
                    <div key={`preview-${pageIndex}`} className={`flex flex-col items-center gap-2 ${!isPageSelected ? 'opacity-40 grayscale' : ''}`}>
                        <div className="w-full max-w-[210mm] flex justify-between items-center bg-gray-200 px-4 py-3 rounded-t-xl border border-gray-300 cursor-pointer hover:bg-gray-300 transition" onClick={() => togglePage(pageIndex)}>
                            <div className="flex items-center gap-3">
                                <input type="checkbox" checked={isPageSelected} readOnly className="w-5 h-5 cursor-pointer accent-blue-600"/>
                                <span className="font-bold text-gray-800">{pageIndex + 1} 페이지 <span className="text-gray-500 font-normal">({pageStrips.map(s => s.rack_no).join(', ')} 열)</span></span>
                            </div>
                            {!isPageSelected && <span className="text-xs font-bold text-red-500">인쇄 제외됨</span>}
                        </div>
                        <A4Page pageStrips={pageStrips} isPreview={true} />
                    </div>
                );
            })}
          </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 🖨️ 진짜 인쇄 영역 */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden print-only w-full">
          {pagesToPrint
              .filter((_, index) => selectedPages.includes(index))
              // 🚀 [해결 포인트 4] map 함수의 3번째 인자(배열 자체)를 사용해서, 현재 렌더링 중인 요소가 "배열의 마지막 요소"인지 검사합니다.
              .map((pageStrips, index, arr) => (
                  <div key={`print-${index}`} className="w-full m-0 p-0">
                      <A4Page 
                          pageStrips={pageStrips} 
                          isPreview={false} 
                          isLast={index === arr.length - 1} // 이 녀석이 true면 페이지를 넘기지 않습니다!
                      />
                  </div>
              ))
          }
      </div>

    </div>
  );
}