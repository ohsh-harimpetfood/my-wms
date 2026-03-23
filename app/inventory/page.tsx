// app/inventory/page.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import InventorySearchForm from "@/components/InventorySearchForm";
import InventoryListClient from "@/components/InventoryListClient";
import { getAllLocations, getAllItems, extractUniqueZones } from "@/utils/wms";
import { Item } from "@/types";
import { Box, MapPin, Package, ArrowRight, ArrowLeft } from "lucide-react"; 
import Link from "next/link"; 

// 🚀 Next.js 캐싱 방지 (실시간 데이터 중요)
export const dynamic = 'force-dynamic';

// 📦 새로 추가된 포장(박스/잔량) 정보 타입
export interface PackingInfo {
  pack_type: "BOX" | "LOOSE";
  unit_qty: number;
  pack_count: number;
  total_qty: number;
}

// 📦 데이터 타입 정의
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
    item_type?: string;
  } | null;
  inventory_packing_info?: PackingInfo[]; 
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // 🔐 로그인 체크
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // 📸 QR 스캔 모드 감지
  const qrLocation = params.location ? String(params.location) : null;

  if (qrLocation) {
    const { count, error } = await supabase
        .from("inventory") 
        .select('*', { count: 'exact', head: true }) 
        .eq("location_code", qrLocation);

    if (error) {
        return <div className="p-8 text-red-500">데이터 확인 중 오류: {error.message}</div>;
    }

    const hasInventory = count !== null && count > 0;

    if (hasInventory) {
        redirect(`/inventory?search=true&query=${qrLocation}`);
    }

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 animate-fade-in pb-24">
            <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <ArrowLeft className="text-gray-400" />
                </Link>
                <div className="flex-1">
                    <h2 className="text-gray-400 text-[10px] md:text-xs uppercase tracking-wider font-bold">QR SCAN RESULT</h2>
                    <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                        <MapPin className="text-blue-500" size={24} />
                        {qrLocation}
                    </h1>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-800 rounded-2xl bg-gray-900/30">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 relative">
                    <Box size={40} className="text-gray-600 opacity-50 md:w-12 md:h-12" />
                    <div className="absolute bottom-0 right-0 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-500/50">Empty</div>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-300 mb-2">빈 로케이션입니다</h3>
                <p className="text-gray-500 mb-8 text-xs md:text-sm text-center leading-relaxed">
                    현재 <b className="text-blue-400">{qrLocation}</b> 위치에<br/>조회된 재고가 없습니다.
                </p>
                
                <Link 
                    href={`/inbound/direct?loc=${qrLocation}`}
                    className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-lg shadow-blue-900/20 transition-all transform hover:scale-105 active:scale-95"
                >
                    <Package size={20} className="md:w-6 md:h-6" />
                    <span>입고 등록하기</span>
                    <ArrowRight size={18} className="opacity-70 md:w-5 md:h-5" />
                </Link>
            </div>
        </div>
    );
  }

  if (params.search !== "true") {
    const [locations, items] = await Promise.all([
      getAllLocations(supabase),
      getAllItems(supabase)
    ]);
    const zones = extractUniqueZones(locations);
    return <InventorySearchForm zones={zones} items={items as unknown as Item[]} />;
  }

  const page = params.page ? Number(params.page) : 1;
  const rawQuery = params.query ? String(params.query) : "";
  const query = decodeURIComponent(rawQuery).trim();
  const team = params.team ? String(params.team) : ""; 
  const zonesParam = params.zones ? String(params.zones) : ""; 
  const ITEMS_PER_PAGE = 20; 

  let dbQuery = supabase
    .from("inventory") 
    .select(`
        *,
        item_master!inner (item_name, uom, item_type),
        inventory_packing_info (pack_type, unit_qty, pack_count, total_qty)
    `)
    .order("location_code", { ascending: true });

  const { data: rawInventory, error: dbError } = await dbQuery;

  if (dbError) {
    return <div className="p-8 text-red-500 font-bold">데이터 로딩 실패: {dbError.message}</div>;
  }

  let filteredInventory = (rawInventory || []) as InventoryItem[];

  if (team === 'CONTAINER') {
    filteredInventory = filteredInventory.filter(i => i.location_code.startsWith("CT-"));
    if (zonesParam) {
      const selectedContainerNums = zonesParam.split(",").map(num => num.padStart(2, '0'));
      filteredInventory = filteredInventory.filter(i => {
        const parts = i.location_code.split('-');
        if (parts.length >= 3) return selectedContainerNums.includes(parts[2]);
        return false;
      });
    }
  } else if (team === 'PRODUCTION') {
    filteredInventory = filteredInventory.filter(i => !i.location_code.startsWith("2F") && !i.location_code.startsWith("CT-"));
    if (zonesParam) {
      const selectedRacks = zonesParam.split(",");
      filteredInventory = filteredInventory.filter(i => selectedRacks.some(rack => i.location_code.startsWith(rack)));
    }
  } else if (team === 'LOGISTICS') {
    filteredInventory = filteredInventory.filter(i => i.location_code.startsWith("2F"));
    if (zonesParam) {
      const selectedLogisticsZones = zonesParam.split(",");
      filteredInventory = filteredInventory.filter(i => selectedLogisticsZones.some(zone => i.location_code.includes(zone)));
    }
  }

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

  // =========================================================
  // 🚨 [긴급 핫픽스 3차 수정] TS 에러 방지용 안전한 하이브리드 정렬
  // =========================================================
  filteredInventory.sort((a, b) => {
      const locA = a.location_code || "";
      const locB = b.location_code || "";

      // 파싱 헬퍼 함수
      const parseLoc = (loc: string) => {
          const shuttleMatch = loc.match(/^([LJlj])([a-zA-Z])(\d)(\d{1,2})$/);
          if (shuttleMatch) {
              return {
                  type: 'SHUTTLE',
                  rack: shuttleMatch[1].toUpperCase(),
                  col: shuttleMatch[2].toUpperCase(),
                  lvl: parseInt(shuttleMatch[3], 10),
                  side: parseInt(shuttleMatch[4], 10)
              };
          }

          const stdMatch = loc.match(/^([a-zA-Z])([a-zA-Z])(\d)(\d)$/);
          if (stdMatch) {
              return {
                  type: 'STANDARD',
                  rack: stdMatch[1].toUpperCase(),
                  col: stdMatch[2].toUpperCase(),
                  lvl: parseInt(stdMatch[3], 10),
                  side: parseInt(stdMatch[4], 10)
              };
          }

          return { type: 'OTHER', raw: loc };
      };

      const parsedA = parseLoc(locA);
      const parsedB = parseLoc(locB);

      // 타입이 다르면 그냥 기본 문자열 정렬
      if (parsedA.type !== parsedB.type) {
          return locA.localeCompare(locB);
      }

      // 🔥 1. 셔틀랙 정렬 (TS 에러 방지를 위해 속성 존재 여부 한 번 더 검증)
      if (parsedA.type === 'SHUTTLE' && parsedB.type === 'SHUTTLE') {
          // Non-null assertion (!) 사용
          if (parsedA.rack! !== parsedB.rack!) return parsedA.rack!.localeCompare(parsedB.rack!);
          if (parsedA.col! !== parsedB.col!) return parsedA.col!.localeCompare(parsedB.col!); 
          if (parsedA.lvl! !== parsedB.lvl!) return parsedA.lvl! - parsedB.lvl!; 
          if (parsedA.side! !== parsedB.side!) return parsedA.side! - parsedB.side!; 
          return 0;
      }

      // 🔥 2. 일반랙 정렬
      if (parsedA.type === 'STANDARD' && parsedB.type === 'STANDARD') {
          if (parsedA.rack! !== parsedB.rack!) return parsedA.rack!.localeCompare(parsedB.rack!);
          if (parsedA.side! !== parsedB.side!) return parsedA.side! - parsedB.side!; 
          if (parsedA.col! !== parsedB.col!) return parsedA.col!.localeCompare(parsedB.col!); 
          if (parsedA.lvl! !== parsedB.lvl!) return parsedA.lvl! - parsedB.lvl!; 
          return 0;
      }

      // 3. 기타 구역
      return locA.localeCompare(locB);
  });
  // =========================================================

  const totalCount = filteredInventory.length;
  const startIdx = (page - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedInventory = filteredInventory.slice(startIdx, endIdx); // 화면용 20건

  const getConditionText = () => {
    if (query) return `검색어: "${query}"`;
    if (zonesParam) {
      if (team === 'CONTAINER') return `컨테이너: [${zonesParam.replaceAll(',', ', ')}호]`;
      return `구역: [${zonesParam.replaceAll(',', ', ')}]`;
    }
    if (team === 'PRODUCTION') return '[생산팀 전체]';
    if (team === 'LOGISTICS') return '[물류팀 전체]';
    if (team === 'CONTAINER') return '[컨테이너 전체]';
    return '[전체 재고]';
  };

  return (
    <InventoryListClient 
        initialInventory={paginatedInventory}
        fullInventory={filteredInventory}
        totalCount={totalCount}
        conditionText={getConditionText()}
        serverQuery={query}
        page={page}
        pageSize={ITEMS_PER_PAGE}
    />
  );
}