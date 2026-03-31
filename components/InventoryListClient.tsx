"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
// 🚀 [수정] Map 아이콘을 MapIcon으로 별칭 부여, ArrowRight 추가
import { ArrowLeft, Filter, Search, X, Map as MapIcon, Settings2, Printer, Download, MapPin, Box, Package, Hash, ArrowRightLeft, LogOut, Check, ArrowRight } from "lucide-react";
import PaginationControls from "@/components/PaginationControls";
import InventoryAdjustmentModal from "@/components/InventoryAdjustmentModal";
import { useAuth } from "@/context/AuthProvider";

export interface PackingInfo {
  pack_type: "BOX" | "LOOSE";
  unit_qty: number;
  pack_count: number;
  total_qty: number;
}

export interface InventoryItem {
  id: number;
  location_code: string;
  item_key: string;
  quantity: number;
  lot_no: string;
  exp_date: string;
  status: string;
  updated_at: string;
  inbound_date: string;
  item_master: {
    item_name: string;
    uom: string;
  } | null;
  inventory_packing_info?: PackingInfo[]; 
}

interface Props {
  initialInventory: InventoryItem[]; 
  fullInventory?: InventoryItem[];    
  totalCount: number;
  conditionText: string;
  serverQuery: string;
  page: number;
  pageSize: number;
}

export default function InventoryListClient({
  initialInventory,
  fullInventory = [], 
  totalCount: serverTotalCount,
  conditionText,
  serverQuery,
  page,
  pageSize,
}: Props) {
  const router = useRouter();
  const [localQuery, setLocalQuery] = useState("");

  const { profile, permissions } = useAuth();

  const canAdjust = useMemo(() => {
    if (profile?.role === "ADMIN") return true;
    return permissions?.some(
      (p) => p.feature_key === "inventory_adjustment" && p.is_enabled
    );
  }, [profile, permissions]);

  const [isAdjModalOpen, setIsAdjModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printMode, setPrintMode] = useState<"LOCATION" | "ITEM_GROUP">("LOCATION");

  const handleOpenAdjustment = (item: InventoryItem) => {
    if (!canAdjust) return;
    setSelectedItem(item);
    setIsAdjModalOpen(true);
  };

  const handleRefresh = () => {
    router.refresh();
  };

  const filteredList = useMemo(() => {
    if (!localQuery.trim()) return initialInventory;
    const lowerQuery = localQuery.toLowerCase();
    return initialInventory.filter((item) => {
      const searchTarget = `${item.location_code} ${item.item_key} ${item.item_master?.item_name || ""} ${item.lot_no || ""}`.toLowerCase();
      return searchTarget.includes(lowerQuery);
    });
  }, [initialInventory, localQuery]);

  const filteredFullList = useMemo(() => {
    const sourceData = fullInventory.length > 0 ? fullInventory : initialInventory;
    if (!localQuery.trim()) return sourceData;
    const lowerQuery = localQuery.toLowerCase();
    return sourceData.filter((item) => {
      const searchTarget = `${item.location_code} ${item.item_key} ${item.item_master?.item_name || ""} ${item.lot_no || ""}`.toLowerCase();
      return searchTarget.includes(lowerQuery);
    });
  }, [fullInventory, initialInventory, localQuery]);

  const displayCount = filteredList.length;

  const getMapLink = (code: string) => {
    if (!code) return '/location';
    let zone = "";
    if (code.startsWith("2F")) zone = "2F";
    else {
       const parts = code.split("-");
       if (parts.length > 0) zone = parts[0];
    }
    return zone ? `/location?zone=${zone}` : '/location';
  };

  const handleExportExcel = () => {
    const headers = ["위치", "품목코드", "품목명", "LOT", "유통기한", "수량", "단위", "상태"];
    
    const csvRows = filteredFullList.map(item => {
      return [
        item.location_code,
        item.item_key,
        item.item_master?.item_name || "이름 없음",
        item.lot_no === 'DEFAULT' ? "" : item.lot_no,
        item.exp_date || "",
        item.quantity,
        item.item_master?.uom || "EA",
        item.status === 'AVAILABLE' ? '정상' : item.status
      ].map(val => `"${val}"`).join(","); 
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const bom = "\uFEFF"; 
    
    const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    const today = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `재고조회결과_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    setIsPrintModalOpen(false);
    setTimeout(() => {
        window.print();
    }, 100);
  };

  const groupedByItemList = useMemo(() => {
      if (printMode !== "ITEM_GROUP") return [];
      
      const itemMap = new Map<string, {
          item_key: string;
          item_name: string;
          uom: string;
          total_qty: number;
          locations: { code: string, qty: number, lot: string }[]
      }>();

      filteredFullList.forEach(item => {
          if (!itemMap.has(item.item_key)) {
              itemMap.set(item.item_key, {
                  item_key: item.item_key,
                  item_name: item.item_master?.item_name || "알 수 없음",
                  uom: item.item_master?.uom || "EA",
                  total_qty: 0,
                  locations: []
              });
          }
          const group = itemMap.get(item.item_key)!;
          group.total_qty += item.quantity;
          group.locations.push({
              code: item.location_code,
              qty: item.quantity,
              lot: item.lot_no === 'DEFAULT' ? 'N/A' : item.lot_no
          });
      });

      return Array.from(itemMap.values()).sort((a, b) => a.item_name.localeCompare(b.item_name));
  }, [filteredFullList, printMode]);


  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body { background-color: white !important; color: black !important; }
          @page { margin: 10mm; }
        }
      `}} />

      <div className="p-4 md:p-8 space-y-6 bg-black min-h-screen text-white animate-fade-in pb-20 print:bg-white print:text-black print:p-0">
        
        <div className="border-b border-gray-800 pb-6 print:hidden">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
              <div className="w-full xl:w-auto">
                  <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center gap-2">
                          <Filter className="text-blue-500" size={24}/>
                          <h1 className="text-2xl font-bold whitespace-nowrap">조회 결과</h1>
                      </div>

                      <div className="hidden md:flex relative w-64 group">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={16} />
                          <input 
                              type="text" 
                              placeholder="리스트 내 빠른 검색..." 
                              value={localQuery}
                              onChange={(e) => setLocalQuery(e.target.value)}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-10 pr-8 text-sm focus:outline-none focus:border-blue-500 transition-all placeholder:text-gray-600"
                          />
                          {localQuery && (
                              <button onClick={() => setLocalQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                                  <X size={14} />
                              </button>
                          )}
                      </div>
                  </div>

                  <div className="relative md:hidden w-full mt-2">
                      <input 
                          type="text" 
                          placeholder="결과 내 검색..." 
                          value={localQuery}
                          onChange={(e) => setLocalQuery(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 rounded-full py-2 pl-10 pr-8 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                      {localQuery && (
                          <button onClick={() => setLocalQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                              <X size={16} />
                          </button>
                      )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-400 mt-2">
                      <p>
                          조건: <span className="text-blue-300 font-bold">{conditionText}</span> 
                          {serverQuery && <span className="text-yellow-400 ml-1"> + "{serverQuery}"</span>}
                      </p>
                      <span className="hidden md:inline text-gray-700">|</span>
                      <p>
                          {localQuery ? (
                              <>필터링: <span className="text-white font-bold">{displayCount}</span> / {initialInventory.length}</>
                          ) : (
                              <>총 <span className="text-white font-bold">{serverTotalCount.toLocaleString()}</span> 건</>
                          )}
                      </p>
                  </div>
              </div>

              <div className="w-full xl:w-auto flex flex-wrap gap-2">
                  <button onClick={() => setIsPrintModalOpen(true)} className="flex-1 md:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition text-sm font-bold border border-slate-700 whitespace-nowrap">
                      <Printer size={16} className="text-slate-300" /> 인쇄
                  </button>
                  <button onClick={handleExportExcel} className="flex-1 md:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-100 rounded-lg transition text-sm font-bold border border-emerald-800 whitespace-nowrap">
                      <Download size={16} className="text-emerald-400" /> 엑셀 다운로드
                  </button>
                  <Link href="/location" className="flex-1 md:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm font-bold border border-gray-700 whitespace-nowrap group">
                      {/* 🚀 [수정] Map 컴포넌트 호출 부분을 MapIcon으로 변경 */}
                      <MapIcon size={16} className="text-purple-400 group-hover:text-purple-300 transition-colors"/> 창고 맵
                  </Link>
                  <Link href="/inventory" className="flex-1 md:flex-none flex justify-center items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm font-bold border border-gray-700 whitespace-nowrap">
                      <ArrowLeft size={16} /> 조건 변경
                  </Link>
              </div>
          </div>
        </div>

        {/* 화면용 테이블 */}
        <div className="hidden md:block print:hidden border border-gray-800 rounded-lg overflow-hidden bg-gray-900 shadow-sm">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="bg-gray-800 text-gray-200 uppercase border-b border-gray-700">
              <tr>
                <th className="px-3 py-3 font-medium text-center w-10">No.</th>
                <th className="px-3 py-3 font-medium text-center">위치</th>
                <th className="px-4 py-3 font-medium">제품 정보</th>
                <th className="px-3 py-3 font-medium">LOT / 유통기한</th>
                <th className="px-4 py-3 font-medium text-right">수량</th>
                <th className="px-4 py-3 font-medium text-center">상태</th>
                <th className="px-4 py-3 font-medium text-center">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredList.map((item, index) => (
                <DesktopRow 
                  key={item.id} 
                  item={item} 
                  index={(page - 1) * pageSize + index}
                  getMapLink={getMapLink} 
                  onAdjust={() => handleOpenAdjustment(item)}
                  showAdjust={canAdjust} 
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* 모바일 카드 */}
        <div className="md:hidden print:hidden flex flex-col gap-4">
          {filteredList.map((item) => (
            <MobileCard 
              key={item.id} 
              item={item} 
              getMapLink={getMapLink} 
              onAdjust={() => handleOpenAdjustment(item)}
              showAdjust={canAdjust} 
            />
          ))}
        </div>

        <div className="print:hidden">
          {!localQuery && <PaginationControls totalCount={serverTotalCount} pageSize={pageSize} />}
        </div>

        {/* 인쇄용 전체 테이블 */}
        <div className="hidden print:block w-full">
          <div className="mb-4">
            <h1 className="text-2xl font-bold text-black mb-2">
                {printMode === "LOCATION" ? "재고 실사 장표 (로케이션 기준)" : "재고 실사 장표 (품목별 합계)"}
            </h1>
            <p className="text-sm text-gray-600">출력일시: {new Date().toLocaleString('ko-KR')} | 조건: {conditionText} {serverQuery && `+ "${serverQuery}"`}</p>
          </div>
          
          {printMode === "LOCATION" ? (
              <table className="w-full text-sm text-left text-black">
                <thead className="bg-gray-200 text-black uppercase border-b border-gray-400">
                  <tr>
                    <th className="px-2 py-3 font-medium text-center w-[5%]">No.</th>
                    <th className="px-2 py-3 font-medium text-left w-[15%]">위치</th>
                    <th className="px-2 py-3 font-medium w-[30%]">제품 정보</th>
                    <th className="px-2 py-3 font-medium w-[15%]">LOT/유통기한</th>
                    <th className="px-2 py-3 font-medium text-right w-[15%]">수량(상세)</th>
                    <th className="px-2 py-3 font-medium text-center border-l border-gray-400 w-[20%]">실사 확인</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {filteredFullList.map((item, index) => {
                    const packingDetails = item.inventory_packing_info || [];
                    const hasPackingInfo = packingDetails.length > 0;
                    
                    let packingText = "";
                    if (hasPackingInfo) {
                        const boxes = packingDetails.filter(p => p.pack_type === 'BOX');
                        const loose = packingDetails.find(p => p.pack_type === 'LOOSE');
                        let summary = [];
                        if (boxes.length > 0) summary.push(`${boxes.map(b => `${b.unit_qty}×${b.pack_count}`).join(', ')}`);
                        if (loose) summary.push(`잔량 ${loose.pack_count}`);
                        packingText = summary.join(' | ');
                    }

                    return (
                        <tr key={`print-${item.id}`} className="bg-white break-inside-avoid">
                        <td className="px-2 py-2 text-center text-black font-bold align-middle">{index + 1}</td>
                        <td className="px-2 py-2 align-middle text-left font-bold text-xs">{item.location_code}</td>
                        <td className="px-2 py-2 align-middle">
                            <div className="font-bold text-black text-sm">{item.item_master?.item_name || "이름 없음"}</div>
                            <div className="text-gray-600 text-[10px] mt-0.5">{item.item_key}</div>
                        </td>
                        <td className="px-2 py-2 align-middle">
                            <div className="flex flex-col gap-1">
                            {item.lot_no && item.lot_no !== 'DEFAULT' ? <span className="text-[10px] font-mono text-black">LOT: {item.lot_no}</span> : <span className="text-gray-500 text-[10px]">-</span>}
                            {item.exp_date && <span className="text-[10px] text-gray-600">EXP: {item.exp_date}</span>}
                            </div>
                        </td>
                        <td className="px-2 py-2 text-right align-middle">
                            <div>
                                <span className="text-base font-bold text-black tracking-tight">{item.quantity.toLocaleString()}</span>
                                <span className="text-[10px] text-gray-600 ml-1">{item.item_master?.uom || "EA"}</span>
                            </div>
                            {hasPackingInfo && (
                                <div className="text-[10px] text-gray-600 font-bold mt-1">
                                    [ {packingText} ]
                                </div>
                            )}
                        </td>
                        <td className="px-2 py-2 border-l border-gray-300 align-middle text-center"></td>
                        </tr>
                    )
                  })}
                </tbody>
              </table>
          ) : (
              <table className="w-full text-sm text-left text-black">
                <thead className="bg-gray-200 text-black uppercase border-b border-gray-400">
                  <tr>
                    <th className="px-2 py-3 font-medium text-center w-[5%]">No.</th>
                    <th className="px-2 py-3 font-medium w-[30%]">제품 정보</th>
                    <th className="px-2 py-3 font-medium w-[30%]">재고 분포 (로케이션)</th>
                    <th className="px-2 py-3 font-medium text-right w-[15%]">총 수량</th>
                    <th className="px-2 py-3 font-medium text-center border-l border-gray-400 w-[20%]">실사 확인</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-300">
                  {groupedByItemList.map((group, index) => (
                      <tr key={`print-group-${group.item_key}`} className="bg-white break-inside-avoid">
                        <td className="px-2 py-2 text-center text-black font-bold align-top">{index + 1}</td>
                        <td className="px-2 py-2 align-top">
                            <div className="font-bold text-black text-base">{group.item_name}</div>
                            <div className="text-gray-600 text-xs mt-0.5">{group.item_key}</div>
                        </td>
                        <td className="px-2 py-2 align-top">
                            <ul className="text-[10px] text-gray-800 space-y-1 font-mono">
                                {group.locations.map((loc, i) => (
                                    <li key={i} className="flex justify-between items-center bg-gray-50 px-1 py-0.5 rounded border border-gray-200">
                                        <span className="font-bold text-blue-800">{loc.code}</span>
                                        <span>({loc.lot})</span>
                                        <span className="font-bold text-black">{loc.qty.toLocaleString()}</span>
                                    </li>
                                ))}
                            </ul>
                        </td>
                        <td className="px-2 py-2 text-right align-top">
                            <span className="text-lg font-black text-black tracking-tight">{group.total_qty.toLocaleString()}</span>
                            <span className="text-xs text-gray-600 ml-1">{group.uom}</span>
                        </td>
                        <td className="px-2 py-2 border-l border-gray-300 align-middle text-center"></td>
                      </tr>
                  ))}
                </tbody>
              </table>
          )}
        </div>

        {/* 인쇄 모드 선택 팝업 모달 */}
        {isPrintModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 print:hidden">
                <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-md w-full shadow-2xl">
                    <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Printer size={20} className="text-blue-400"/> 출력 모드 선택
                        </h2>
                        <button onClick={() => setIsPrintModalOpen(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                    </div>
                    <div className="p-6 space-y-3">
                        <button 
                            onClick={() => setPrintMode("LOCATION")}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${printMode === "LOCATION" ? "bg-blue-900/30 border-blue-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"}`}
                        >
                            <div className="text-left">
                                <div className="font-bold text-base mb-1 flex items-center gap-2"><MapPin size={16}/> 로케이션 기준 (기본)</div>
                                <div className="text-xs opacity-70">위치 순서대로 정렬되며, 박스 단위 정보가 포함됩니다.</div>
                            </div>
                            {printMode === "LOCATION" && <Check className="text-blue-400" size={20} />}
                        </button>

                        <button 
                            onClick={() => setPrintMode("ITEM_GROUP")}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${printMode === "ITEM_GROUP" ? "bg-emerald-900/30 border-emerald-500 text-white" : "bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700"}`}
                        >
                            <div className="text-left">
                                <div className="font-bold text-base mb-1 flex items-center gap-2"><Box size={16}/> 품목별 총 합계 (신규)</div>
                                <div className="text-xs opacity-70">품목별로 그룹핑되어 창고 내 전체 합계 및 분산 위치를 보여줍니다.</div>
                            </div>
                            {printMode === "ITEM_GROUP" && <Check className="text-emerald-400" size={20} />}
                        </button>
                    </div>
                    <div className="p-4 bg-gray-800 rounded-b-xl flex gap-2">
                        <button onClick={() => setIsPrintModalOpen(false)} className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-bold text-gray-300 transition">취소</button>
                        <button onClick={handlePrint} className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-bold text-white transition flex justify-center items-center gap-2">
                            인쇄 계속 <ArrowRight size={16}/>
                        </button>
                    </div>
                </div>
            </div>
        )}

        <InventoryAdjustmentModal
          isOpen={isAdjModalOpen}
          onClose={() => setIsAdjModalOpen(false)}
          inventoryItem={selectedItem}
          onSuccess={handleRefresh}
        />

      </div>
    </>
  );
}

// ----------------------------------------------------------------------
// 하위 컴포넌트 (화면 렌더링용)
// ----------------------------------------------------------------------

const DesktopRow = ({ item, index, getMapLink, onAdjust, showAdjust }: { 
  item: InventoryItem, 
  index: number,
  getMapLink: (code: string) => string, 
  onAdjust: () => void,
  showAdjust?: boolean 
}) => {
    const mapLink = getMapLink(item.location_code);
    const outboundLink = `/outbound/new?loc=${item.location_code}&item=${item.item_key}&lot=${item.lot_no}&qty=${item.quantity}`;
    const moveLink = `/inventory/move?id=${item.id}&loc=${item.location_code}&item=${item.item_key}&lot=${item.lot_no}&qty=${item.quantity}`;
  
    const packingDetails = item.inventory_packing_info || [];
    const hasPackingInfo = packingDetails.length > 0;
    
    const getPackingSummary = () => {
        if (!hasPackingInfo) return null;
        const boxes = packingDetails.filter(p => p.pack_type === 'BOX');
        const loose = packingDetails.find(p => p.pack_type === 'LOOSE');
        let summary = [];
        if (boxes.length > 0) {
            summary.push(`📦 ${boxes.map(b => `${b.unit_qty}x${b.pack_count}`).join(', ')}`);
        }
        if (loose) {
            summary.push(`# 잔량 ${loose.pack_count}`);
        }
        return summary.join(' | ');
    };

    return (
      <tr className="bg-gray-900 hover:bg-gray-800 transition-colors h-[60px]">
        <td className="px-3 py-2 text-center text-gray-500 font-bold align-middle">
          {index + 1}
        </td>
        <td className="px-3 py-2 align-middle text-center">
          <Link href={mapLink} className="bg-blue-900/40 text-blue-200 px-2.5 py-1 rounded text-sm font-bold border border-blue-800/50 hover:bg-blue-800 hover:text-white transition inline-block">
            {item.location_code}
          </Link>
        </td>
        <td className="px-4 py-2 align-middle">
          <div className="font-bold text-white text-base">{item.item_master?.item_name || "이름 없음"}</div>
          <div className="text-xs text-gray-500 font-mono mt-0.5">{item.item_key}</div>
        </td>
        <td className="px-3 py-2 align-middle">
          <div className="flex flex-col gap-1">
            {item.lot_no && item.lot_no !== 'DEFAULT' ? <span className="text-gray-300 font-mono text-[11px] bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 w-fit">LOT: {item.lot_no}</span> : <span className="text-gray-600 text-xs">-</span>}
            {item.exp_date && <span className="text-gray-500 text-[11px]">EXP: {item.exp_date}</span>}
          </div>
        </td>
        <td className="px-4 py-2 text-right align-middle">
          <div className="flex flex-col items-end gap-0.5">
             <div>
                <span className="text-lg font-bold text-white tracking-tight">{item.quantity.toLocaleString()}</span>
                <span className="text-xs text-gray-500 ml-1 font-normal">{item.item_master?.uom || "EA"}</span>
             </div>
             {hasPackingInfo && (
                <div className="text-xs font-bold text-blue-300 font-mono bg-blue-900/20 px-1.5 py-0.5 rounded border border-blue-900/30">
                    {getPackingSummary()}
                </div>
             )}
          </div>
        </td>
        <td className="px-4 py-2 text-center align-middle">
          <StatusBadge status={item.status} />
        </td>
        <td className="px-4 text-center align-middle whitespace-nowrap">
          <ActionButtons moveLink={moveLink} outboundLink={outboundLink} onAdjust={onAdjust} showAdjust={showAdjust} />
        </td>
      </tr>
    );
};

const MobileCard = ({ item, getMapLink, onAdjust, showAdjust }: { 
  item: InventoryItem, 
  getMapLink: (code: string) => string, 
  onAdjust: () => void,
  showAdjust?: boolean 
}) => {
    const mapLink = getMapLink(item.location_code);
    const outboundLink = `/outbound/new?loc=${item.location_code}&item=${item.item_key}&lot=${item.lot_no}&qty=${item.quantity}`;
    const moveLink = `/inventory/move?id=${item.id}&loc=${item.location_code}&item=${item.item_key}&lot=${item.lot_no}&qty=${item.quantity}`;
  
    const packingDetails = item.inventory_packing_info || [];
    const hasPackingInfo = packingDetails.length > 0;

    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 shadow-md active:border-blue-500/50 transition-colors relative">
        {showAdjust && (
          <button 
              onClick={onAdjust}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white bg-gray-800 rounded-full border border-gray-700 z-10"
          >
              <Settings2 size={16} />
          </button>
        )}

        <div className="flex justify-between items-start mb-3 pr-10">
          <Link href={mapLink} className="flex items-center gap-1.5 bg-gray-800 text-blue-300 px-3 py-1 rounded text-sm font-bold border border-gray-700">
              <MapPin size={14} />
              {item.location_code}
          </Link>
          <StatusBadge status={item.status} />
        </div>
        
        <div className="mb-4">
          <div className="text-base font-bold text-white mb-1 line-clamp-2">{item.item_master?.item_name}</div>
          <div className="text-xs text-gray-500 font-mono mb-2 flex items-center gap-2">
              <Box size={12} /> {item.item_key}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
              {item.lot_no && item.lot_no !== 'DEFAULT' ? (
                  <span className="text-[10px] font-mono text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">LOT: {item.lot_no}</span>
              ) : (
                  <span className="text-[10px] text-gray-600 bg-gray-800/30 px-1.5 py-0.5 rounded border border-gray-700/30">LOT: 미지정</span>
              )}
              {item.exp_date && (
                  <span className="text-[10px] text-gray-400 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700/50">EXP: {item.exp_date}</span>
              )}
          </div>
          
          <div className="flex flex-col gap-2">
             <div className="flex items-baseline gap-1 text-white">
                <span className="text-2xl font-bold tracking-tight">{item.quantity.toLocaleString()}</span>
                <span className="text-sm text-gray-400">{item.item_master?.uom || "EA"}</span>
             </div>
             
             {hasPackingInfo && (
                <div className="bg-black/50 rounded-lg p-2.5 border border-gray-800 space-y-1.5 mt-1">
                    {packingDetails.map((pack, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                            {pack.pack_type === 'BOX' ? (
                                <span className="text-blue-300 flex items-center gap-1">
                                    <Package size={12} /> {pack.unit_qty}입 x {pack.pack_count}박스
                                </span>
                            ) : (
                                <span className="text-emerald-400 flex items-center gap-1">
                                    <Hash size={12} /> 잔량
                                </span>
                            )}
                            <span className="font-bold text-gray-300">
                                {pack.total_qty.toLocaleString()}개
                            </span>
                        </div>
                    ))}
                </div>
             )}
          </div>
        </div>
        <div className="flex gap-2">
           <Link href={moveLink} className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 py-3 rounded-lg font-medium text-sm border border-gray-700 transition">
              <ArrowRightLeft size={16} className="text-blue-400" /> 재고 이동
           </Link>
           <Link href={outboundLink} className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-200 py-3 rounded-lg font-medium text-sm border border-gray-700 transition">
              <LogOut size={16} className="text-red-400" /> 출고 등록
           </Link>
        </div>
      </div>
    );
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${
    status === 'AVAILABLE' || status === '정상' 
      ? "bg-green-900/20 text-green-400 border-green-800/50" 
      : "bg-red-900/20 text-red-400 border-red-800/50"
  }`}>
    {status === 'AVAILABLE' ? '정상' : status}
  </span>
);

const ActionButtons = ({ moveLink, outboundLink, onAdjust, showAdjust }: { 
  moveLink: string, 
  outboundLink: string, 
  onAdjust: () => void,
  showAdjust?: boolean
}) => (
  <div className="flex items-center justify-center gap-2">
    <Link href={moveLink} className="group inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-blue-900/20">
      <ArrowRightLeft size={14} /> <span>이동</span>
    </Link>
    <div className="w-[1px] h-3 bg-gray-700"></div>
    <Link href={outboundLink} className="group inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-900/20">
      <LogOut size={14} /> <span>출고</span>
    </Link>
    
    {showAdjust && (
      <>
        <div className="w-[1px] h-3 bg-gray-700"></div>
        <button 
          onClick={onAdjust} 
          className="group inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-yellow-300 transition-colors px-2 py-1 rounded hover:bg-yellow-900/20" 
          title="재고 조정"
        >
          <Settings2 size={14} /> <span>조정</span>
        </button>
      </>
    )}
  </div>
);