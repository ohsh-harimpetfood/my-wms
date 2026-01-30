import { createClient } from "@/utils/supabase/server";
import PaginationControls from "@/components/PaginationControls";
import Link from "next/link";
import InventorySearchForm from "@/components/InventorySearchForm";
import { getAllLocations, getAllInventory, getAllItems, extractUniqueZones } from "@/utils/wms"; // ✨ 유틸 임포트
import { ArrowLeft, Filter, ArrowRightLeft, LogOut, MapPin, Box, Calendar } from "lucide-react";

export const dynamic = 'force-dynamic';

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

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // ==============================================================================
  // 🚀 1. 유틸리티로 기준 정보(Master Data) 한방에 조회
  // ==============================================================================
  // 병렬 처리(Promise.all)로 속도 최적화
  const [locations, items] = await Promise.all([
    getAllLocations(supabase), // H, J, K... 보정된 전체 로케이션
    getAllItems(supabase)      // 자동완성용 품목
  ]);

  const zones = extractUniqueZones(locations); // Zone 목록 추출

  // 검색 전이면 폼만 보여줌
  if (params.search !== "true") {
    return <InventorySearchForm zones={zones} items={items} />;
  }

  // ==============================================================================
  // 2. 조회 실행 시 데이터 로드 및 필터링
  // ==============================================================================
  const page = params.page ? Number(params.page) : 1;
  const rawQuery = params.query ? String(params.query) : "";
  const query = decodeURIComponent(rawQuery).trim();
  const team = params.team ? String(params.team) : ""; 
  const zonesParam = params.zones ? String(params.zones) : ""; 
  const ITEMS_PER_PAGE = 20; 

  // 🚀 재고 전체 가져오기 (유틸 사용 -> 10,000개 제한 걱정 끝)
  const rawInventory = await getAllInventory(supabase);
  let filteredInventory = rawInventory as InventoryItem[];

  // --- [메모리 필터링 로직] ---

  // A. 랙(Zone) 필터링
  if (zonesParam) {
    const selectedZoneList = zonesParam.split(",");
    // 보정된 locations 정보를 기준으로 대상 loc_id 추출
    const targetLocIds = locations
        .filter((l: any) => selectedZoneList.includes(l.zone))
        .map((l: any) => l.loc_id);
    
    filteredInventory = filteredInventory.filter(i => targetLocIds.includes(i.location_code));
  } 
  else if (team === 'PRODUCTION') {
    // 생산팀: 2F가 아닌 것
    filteredInventory = filteredInventory.filter(i => !i.location_code.startsWith("2F"));
  }
  else if (team === 'LOGISTICS') {
    // 물류팀: 2F인 것
    filteredInventory = filteredInventory.filter(i => i.location_code.startsWith("2F"));
  }

  // B. 검색어 필터링 (Smart Search)
  if (query) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    filteredInventory = filteredInventory.filter(item => {
      const targetText = `
        ${item.location_code.toLowerCase()} 
        ${item.item_key.toLowerCase()} 
        ${item.item_master?.item_name.toLowerCase() || ""} 
        ${item.lot_no?.toLowerCase() || ""}
        ${item.status.toLowerCase()}
      `;
      return terms.every(term => targetText.includes(term));
    });
  }

  // --- [페이징 및 렌더링] ---
  const totalCount = filteredInventory.length;
  const startIdx = (page - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedInventory = filteredInventory.slice(startIdx, endIdx);

  // 맵 링크 생성 헬퍼
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

  const getConditionText = () => {
    if (zonesParam) return `[${zonesParam.replaceAll(',', ', ')}]`;
    if (team === 'PRODUCTION') return '[생산팀 전체]';
    if (team === 'LOGISTICS') return '[물류팀 전체]';
    return '[전체 구역]';
  };

  return (
    <div className="p-4 md:p-8 space-y-6 bg-black min-h-screen text-white animate-fade-in pb-20">
      
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div>
           <div className="flex items-center gap-2 mb-1">
             <Filter className="text-blue-500" size={24}/>
             <h1 className="text-2xl font-bold">조회 결과 (Result List)</h1>
           </div>
           <p className="text-gray-400 text-sm">
             조건: <span className="text-blue-300 font-bold">{getConditionText()}</span> 
             {query && <span className="text-yellow-400 ml-1"> + 키워드 "{query}"</span>}
           </p>
           <p className="text-sm font-mono mt-1 text-gray-500">
             총 <span className="text-white font-bold text-lg">{totalCount.toLocaleString()}</span> 건 검색됨
           </p>
        </div>
        <Link href="/inventory" className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm font-bold border border-gray-700">
            <ArrowLeft size={16} /> 조건 다시 입력
        </Link>
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
            {paginatedInventory.map((item) => (
              <DesktopRow key={item.id} item={item} getMapLink={getMapLink} />
            ))}
            {paginatedInventory.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-500">데이터가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 모바일 카드 */}
      <div className="md:hidden flex flex-col gap-4">
        {paginatedInventory.map((item) => (
          <MobileCard key={item.id} item={item} getMapLink={getMapLink} />
        ))}
        {paginatedInventory.length === 0 && (
           <div className="py-20 text-center text-gray-500 border border-gray-800 rounded-lg bg-gray-900">
             데이터가 없습니다.
           </div>
        )}
      </div>

      <PaginationControls totalCount={totalCount} pageSize={ITEMS_PER_PAGE} />
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