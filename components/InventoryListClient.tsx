"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowLeft, Filter, Search, X, Map } from "lucide-react"; // ✨ Map 아이콘 추가
import { ArrowRightLeft, LogOut, MapPin, Box } from "lucide-react";
import PaginationControls from "@/components/PaginationControls";

// 타입 정의
interface InventoryItem {
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
}

interface Props {
  initialInventory: InventoryItem[];
  totalCount: number;
  conditionText: string;
  serverQuery: string;
  page: number;
  pageSize: number;
}

export default function InventoryListClient({
  initialInventory,
  totalCount: serverTotalCount,
  conditionText,
  serverQuery,
  page,
  pageSize,
}: Props) {
  const [localQuery, setLocalQuery] = useState("");

  // 실시간 필터링 로직
  const filteredList = useMemo(() => {
    if (!localQuery.trim()) return initialInventory;

    const lowerQuery = localQuery.toLowerCase();
    return initialInventory.filter((item) => {
      const searchTarget = `
        ${item.location_code} 
        ${item.item_key} 
        ${item.item_master?.item_name || ""} 
        ${item.lot_no || ""}
      `.toLowerCase();
      return searchTarget.includes(lowerQuery);
    });
  }, [initialInventory, localQuery]);

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

  return (
    <div className="p-4 md:p-8 space-y-6 bg-black min-h-screen text-white animate-fade-in pb-20">
      
      {/* 헤더 영역 */}
      <div className="border-b border-gray-800 pb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            
            {/* 왼쪽: 타이틀 및 검색창 */}
            <div className="w-full md:w-auto">
                <div className="flex items-center gap-4 mb-2">
                    <div className="flex items-center gap-2">
                        <Filter className="text-blue-500" size={24}/>
                        <h1 className="text-2xl font-bold whitespace-nowrap">조회 결과</h1>
                    </div>

                    {/* PC용 검색창 */}
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

                {/* 모바일용 검색창 */}
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

                {/* 조건 및 건수 정보 */}
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

            {/* 🚀 [오른쪽] 버튼 그룹 (창고 맵 + 조건 입력) */}
            <div className="w-full md:w-auto flex flex-col md:flex-row gap-2">
                {/* 1. 창고 맵 보기 버튼 */}
                <Link href="/location" className="w-full md:w-auto flex justify-center items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm font-bold border border-gray-700 whitespace-nowrap group">
                    <Map size={16} className="text-purple-400 group-hover:text-purple-300 transition-colors"/> 창고 맵 보기
                </Link>

                {/* 2. 조건 다시 입력 버튼 */}
                <Link href="/inventory" className="w-full md:w-auto flex justify-center items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm font-bold border border-gray-700 whitespace-nowrap">
                    <ArrowLeft size={16} /> 조건 다시 입력
                </Link>
            </div>
        </div>
      </div>

      {/* PC 테이블 */}
      <div className="hidden md:block border border-gray-800 rounded-lg overflow-hidden bg-gray-900 shadow-sm">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="bg-gray-800 text-gray-200 uppercase border-b border-gray-700">
            <tr>
              <th className="px-6 py-3 font-medium">위치</th>
              <th className="px-6 py-3 font-medium">제품 정보</th>
              <th className="px-6 py-3 font-medium">LOT / 유통기한</th>
              <th className="px-6 py-3 font-medium text-right">수량</th>
              <th className="px-6 py-3 font-medium text-center">상태</th>
              <th className="px-6 py-3 font-medium text-center">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {filteredList.map((item) => (
              <DesktopRow key={item.id} item={item} getMapLink={getMapLink} />
            ))}
            {filteredList.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-500">
                  {localQuery ? "검색 조건에 맞는 항목이 없습니다." : "데이터가 없습니다."}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 */}
      <div className="md:hidden flex flex-col gap-4">
        {filteredList.map((item) => (
          <MobileCard key={item.id} item={item} getMapLink={getMapLink} />
        ))}
        {filteredList.length === 0 && (
           <div className="py-20 text-center text-gray-500 border border-gray-800 rounded-lg bg-gray-900">
             {localQuery ? "검색 조건에 맞는 항목이 없습니다." : "데이터가 없습니다."}
           </div>
        )}
      </div>

      {!localQuery && <PaginationControls totalCount={serverTotalCount} pageSize={pageSize} />}
    </div>
  );
}

// ----------------------------------------------------------------------
// 하위 컴포넌트
// ----------------------------------------------------------------------

const DesktopRow = ({ item, getMapLink }: { item: InventoryItem, getMapLink: (code: string) => string }) => {
    const mapLink = getMapLink(item.location_code);
    const outboundLink = `/outbound/new?loc=${item.location_code}&item=${item.item_key}&lot=${item.lot_no}&qty=${item.quantity}`;
    const moveLink = `/inventory/move?id=${item.id}&loc=${item.location_code}&item=${item.item_key}&lot=${item.lot_no}&qty=${item.quantity}`;
  
    return (
      <tr className="bg-gray-900 hover:bg-gray-800 transition-colors h-[60px]">
        <td className="px-6 py-3 align-middle whitespace-nowrap">
          <Link href={mapLink} className="bg-blue-900/40 text-blue-200 px-2.5 py-1 rounded text-sm font-bold border border-blue-800/50 hover:bg-blue-800 hover:text-white transition inline-block">
            {item.location_code}
          </Link>
        </td>
        <td className="px-6 py-3 align-middle">
          <div className="font-medium text-white text-base">{item.item_master?.item_name || "이름 없음"}</div>
          <div className="text-xs text-gray-500 font-mono mt-0.5">{item.item_key}</div>
        </td>
        <td className="px-6 py-3 align-middle whitespace-nowrap">
          <div className="flex flex-col gap-1">
            {item.lot_no && item.lot_no !== 'DEFAULT' ? <span className="text-gray-300 font-mono text-[11px] bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 w-fit">LOT: {item.lot_no}</span> : <span className="text-gray-600 text-xs">-</span>}
            {item.exp_date && <span className="text-gray-500 text-[11px]">EXP: {item.exp_date}</span>}
          </div>
        </td>
        <td className="px-6 py-3 text-right align-middle whitespace-nowrap">
          <span className="text-lg font-bold text-white tracking-tight">{item.quantity.toLocaleString()}</span>
          <span className="text-xs text-gray-500 ml-1 font-normal">{item.item_master?.uom || "EA"}</span>
        </td>
        <td className="px-6 py-3 text-center align-middle whitespace-nowrap">
          <StatusBadge status={item.status} />
        </td>
        <td className="px-6 text-center align-middle whitespace-nowrap">
          <ActionButtons moveLink={moveLink} outboundLink={outboundLink} />
        </td>
      </tr>
    );
};

const MobileCard = ({ item, getMapLink }: { item: InventoryItem, getMapLink: (code: string) => string }) => {
    const mapLink = getMapLink(item.location_code);
    const outboundLink = `/outbound/new?loc=${item.location_code}&item=${item.item_key}&lot=${item.lot_no}&qty=${item.quantity}`;
    const moveLink = `/inventory/move?id=${item.id}&loc=${item.location_code}&item=${item.item_key}&lot=${item.lot_no}&qty=${item.quantity}`;
  
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 shadow-md active:border-blue-500/50 transition-colors">
        <div className="flex justify-between items-start mb-3">
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
          <div className="flex items-baseline gap-1 text-white">
            <span className="text-2xl font-bold tracking-tight">{item.quantity.toLocaleString()}</span>
            <span className="text-sm text-gray-400">{item.item_master?.uom || "EA"}</span>
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

const ActionButtons = ({ moveLink, outboundLink }: { moveLink: string, outboundLink: string }) => (
  <div className="flex items-center justify-center gap-2">
    <Link href={moveLink} className="group inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-blue-900/20">
      <ArrowRightLeft size={14} /> <span>이동</span>
    </Link>
    <div className="w-[1px] h-3 bg-gray-700"></div>
    <Link href={outboundLink} className="group inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-900/20">
      <LogOut size={14} /> <span>출고</span>
    </Link>
  </div>
);