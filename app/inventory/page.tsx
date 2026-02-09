// app/inventory/page.tsx

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation"; // ✨ 리다이렉트 함수 추가
import InventorySearchForm from "@/components/InventorySearchForm";
import InventoryListClient from "@/components/InventoryListClient";
import { getAllLocations, getAllItems, extractUniqueZones } from "@/utils/wms";

// 페이지 캐싱 방지 (실시간 데이터 중요)
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
  // 1. Supabase 서버 클라이언트 생성 (쿠키 포함)
  const supabase = await createClient();
  const params = await searchParams;

  // 2. ✨ [보안 핵심] 사용자 세션 확인 (RLS 통과를 위해 필수)
  // 미들웨어가 있지만, 서버 컴포넌트에서도 한 번 더 체크하면 안전합니다.
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect("/login"); // 로그인 안 되어 있으면 쫓아냄
  }

  // 3. 기준 정보 조회
  const [locations, items] = await Promise.all([
    getAllLocations(supabase),
    getAllItems(supabase)
  ]);
  const zones = extractUniqueZones(locations);

  // 4. 검색 전이면 폼만 보여줌
  if (params.search !== "true") {
    return <InventorySearchForm zones={zones} items={items} />;
  }

  // 5. 데이터 조회 및 필터링
  const page = params.page ? Number(params.page) : 1;
  const rawQuery = params.query ? String(params.query) : "";
  const query = decodeURIComponent(rawQuery).trim();
  const team = params.team ? String(params.team) : ""; 
  const zonesParam = params.zones ? String(params.zones) : ""; 
  const ITEMS_PER_PAGE = 20; 

  // ✨ [중요] getAllInventory 함수 내부 로직 확인 필요
  // 만약 getAllInventory가 단순히 select * from inventory라면
  // 여기서 직접 쿼리를 작성하는 것이 RLS 디버깅에 더 좋습니다.
  // 아래처럼 직접 호출하면 쿠키가 확실히 전달됩니다.
  const { data: rawInventory, error: dbError } = await supabase
    .from("inventory")
    .select(`
        *,
        item_master!inner (
            item_name,
            uom
        )
    `)
    .order("location_code", { ascending: true });

  if (dbError) {
    console.error("DB Error:", dbError);
    // 에러 발생 시 빈 배열 처리 (화면이 터지는 것 방지)
    return <div className="p-8 text-red-500">데이터 로딩 중 오류가 발생했습니다: {dbError.message}</div>;
  }

  let filteredInventory = (rawInventory || []) as InventoryItem[];

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

  // B. 서버 사이드 검색어 필터링 (메모리 필터)
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
  
  const paginatedInventory = filteredInventory.slice(startIdx, endIdx);

  const getConditionText = () => {
    if (zonesParam) return `[${zonesParam.replaceAll(',', ', ')}]`;
    if (team === 'PRODUCTION') return '[생산팀 전체]';
    if (team === 'LOGISTICS') return '[물류팀 전체]';
    return '[전체 구역]';
  };

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