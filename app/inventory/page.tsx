// app/inventory/page.tsx

import { createClient } from "@/utils/supabase/server";
import InventorySearchForm from "@/components/InventorySearchForm";
import InventoryListClient from "@/components/InventoryListClient"; // ✨ 새로 만든 클라이언트 컴포넌트
import { getAllLocations, getAllInventory, getAllItems, extractUniqueZones } from "@/utils/wms";

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

  // 1. 기준 정보 조회
  const [locations, items] = await Promise.all([
    getAllLocations(supabase),
    getAllItems(supabase)
  ]);
  const zones = extractUniqueZones(locations);

  // 검색 전이면 폼만 보여줌
  if (params.search !== "true") {
    return <InventorySearchForm zones={zones} items={items} />;
  }

  // 2. 데이터 필터링 (서버 사이드)
  const page = params.page ? Number(params.page) : 1;
  const rawQuery = params.query ? String(params.query) : "";
  const query = decodeURIComponent(rawQuery).trim();
  const team = params.team ? String(params.team) : ""; 
  const zonesParam = params.zones ? String(params.zones) : ""; 
  const ITEMS_PER_PAGE = 20; 

  const rawInventory = await getAllInventory(supabase);
  let filteredInventory = rawInventory as InventoryItem[];

  // A. 랙(Zone) 필터링
  if (zonesParam) {
    const selectedZoneList = zonesParam.split(",");
    const targetLocIds = locations
        .filter((l: any) => selectedZoneList.includes(l.zone))
        .map((l: any) => l.loc_id);
    filteredInventory = filteredInventory.filter(i => targetLocIds.includes(i.location_code));
  } 
  else if (team === 'PRODUCTION') {
    filteredInventory = filteredInventory.filter(i => !i.location_code.startsWith("2F"));
  }
  else if (team === 'LOGISTICS') {
    filteredInventory = filteredInventory.filter(i => i.location_code.startsWith("2F"));
  }

  // B. 서버 사이드 검색어 필터링
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

  const totalCount = filteredInventory.length;
  const startIdx = (page - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  
  // 🚀 [중요] 페이지네이션된 데이터만 클라이언트로 보냅니다.
  const paginatedInventory = filteredInventory.slice(startIdx, endIdx);

  const getConditionText = () => {
    if (zonesParam) return `[${zonesParam.replaceAll(',', ', ')}]`;
    if (team === 'PRODUCTION') return '[생산팀 전체]';
    if (team === 'LOGISTICS') return '[물류팀 전체]';
    return '[전체 구역]';
  };

  // 🚀 클라이언트 컴포넌트로 데이터 위임
  return (
    <InventoryListClient 
        initialInventory={paginatedInventory}
        totalCount={totalCount}
        conditionText={getConditionText()}
        serverQuery={query}
        page={page}
        pageSize={ITEMS_PER_PAGE}
    />
  );
}