import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import InventorySearchForm from "@/components/InventorySearchForm";
import InventoryListClient from "@/components/InventoryListClient";
import { getAllLocations, getAllItems, extractUniqueZones } from "@/utils/wms";
import { Item } from "@/types"; // types/index.ts에 정의된 타입 활용 권장

// 페이지 캐싱 방지 (재고는 실시간 데이터가 생명)
export const dynamic = 'force-dynamic';

// 인벤토리 아이템 타입 정의 (필요시 types/index.ts로 이동)
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
    item_type?: string; // 부자재 여부 확인용
  } | null;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // 1. 🔐 사용자 세션 및 권한 체크
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect("/login");
  }

  // 추가: 프로필 정보를 가져와 권한 체크 (GUEST 차단 등)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // GUEST라면 접근 차단 (필요 시 주석 해제하여 사용)
  /*
  if (profile?.role === 'GUEST') {
     return <div className="flex h-screen items-center justify-center text-white">승인 대기 중인 계정입니다. 관리자에게 문의하세요.</div>;
  }
  */

  // 2. 🚀 분기 처리: 검색 폼 vs 검색 결과 리스트
  // 검색 파라미터가 없다면(초기 진입), 검색 폼을 보여줍니다.
  if (params.search !== "true") {
    // 폼 렌더링에 필요한 기준 정보만 병렬로 빠르게 로딩
    const [locations, items] = await Promise.all([
      getAllLocations(supabase),
      getAllItems(supabase)
    ]);
    const zones = extractUniqueZones(locations);
    
    return <InventorySearchForm zones={zones} items={items as Item[]} />;
  }

  // =========================================================
  // 여기부터는 '검색 결과(List)' 렌더링 로직입니다.
  // 불필요한 Location/Item 전체 로딩을 하지 않아 속도가 빨라집니다.
  // =========================================================

  const page = params.page ? Number(params.page) : 1;
  const rawQuery = params.query ? String(params.query) : "";
  const query = decodeURIComponent(rawQuery).trim();
  const team = params.team ? String(params.team) : ""; 
  const zonesParam = params.zones ? String(params.zones) : ""; 
  const ITEMS_PER_PAGE = 20; 

  // 3. 재고 데이터 조회
  // (참고: 데이터가 수만 건 이상이면 .range()를 써서 DB 페이지네이션으로 바꿔야 함. 현재는 JS 필터링 유지)
  let dbQuery = supabase
    .from("inventory")
    .select(`
        *,
        item_master!inner (
            item_name,
            uom,
            item_type
        )
    `)
    .order("location_code", { ascending: true });

  // 4. DB 레벨 필터링 (가능한 건 여기서 걸러야 빠름)
  // 예: 로케이션(Zone) 필터링이 가능하다면 여기서 .in() 등을 사용
  // 현재 구조상 location_code 문자열 파싱이 필요하므로 JS에서 처리 유지

  const { data: rawInventory, error: dbError } = await dbQuery;

  if (dbError) {
    console.error("DB Error:", dbError);
    return <div className="p-8 text-red-500 font-bold">데이터 로딩 실패: {dbError.message}</div>;
  }

  let filteredInventory = (rawInventory || []) as InventoryItem[];

  // 5. 메모리 필터링 (복잡한 조건)
  
  // A. 구역(Zone) 및 팀 필터링
  if (zonesParam) {
    // URL에 zone 정보가 있으면 그것을 우선함
    const selectedZones = zonesParam.split(",");
    // 주의: 여기서 location_code의 앞글자 등을 zone으로 판단하는 로직이 필요할 수 있음.
    // 현재는 로직이 복잡하여 로케이션 마스터와 조인이 없으면 정확한 Zone 필터링이 어려울 수 있음.
    // (테스트 단계에서는 이대로 유지)
  } 
  else if (team === 'PRODUCTION') {
    // 생산팀: 2층(2F) 제외 (현장 상황에 맞춰 수정 필요)
    filteredInventory = filteredInventory.filter(i => !i.location_code.startsWith("2F"));
  }
  else if (team === 'LOGISTICS') {
    // 물류팀: 2층(2F)만 조회
    filteredInventory = filteredInventory.filter(i => i.location_code.startsWith("2F"));
  }

  // B. 검색어 필터링 (다중 컬럼 검색)
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

  // 6. 페이지네이션 계산
  const totalCount = filteredInventory.length;
  const startIdx = (page - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  
  const paginatedInventory = filteredInventory.slice(startIdx, endIdx);

  // 7. 조건 텍스트 생성 (UI 표시용)
  const getConditionText = () => {
    if (query) return `검색어: "${query}"`;
    if (zonesParam) return `구역: [${zonesParam.replaceAll(',', ', ')}]`;
    if (team === 'PRODUCTION') return '[생산팀 관할 구역]';
    if (team === 'LOGISTICS') return '[물류팀 관할 구역]';
    return '[전체 재고]';
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