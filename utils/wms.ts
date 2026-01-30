// utils/wms.ts
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * 🛠️ [Helper] Supabase 1,000개 제한을 뚫고 전체 데이터를 가져오는 함수
 */
async function fetchAllData(
  supabase: SupabaseClient, 
  table: string, 
  select: string, 
  options?: { orderCol?: string; activeOnly?: boolean }
) {
  let allData: any[] = [];
  let from = 0;
  const step = 1000;

  while (true) {
    let query = supabase
      .from(table)
      .select(select)
      .range(from, from + step - 1);

    // 옵션: 활성 데이터만 조회
    if (options?.activeOnly) {
      query = query.eq("active_flag", "Y");
    }

    // 옵션: 정렬 (페이지네이션 누락 방지)
    if (options?.orderCol) {
      query = query.order(options.orderCol, { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error(`❌ Fetch Error (${table}):`, error.message);
      throw error;
    }

    if (!data || data.length === 0) break;

    allData = [...allData, ...data];

    // 가져온 데이터가 step보다 작으면 끝
    if (data.length < step) break;

    from += step;
  }

  return allData;
}

/**
 * ✅ 1. 모든 로케이션 정보 가져오기 (Zone 데이터 보정 포함)
 * - 용도: 랙 리스트 생성, 맵 그리기
 */
export const getAllLocations = async (supabase: SupabaseClient) => {
  const data = await fetchAllData(supabase, 'loc_master', 'zone, loc_id', { 
    activeOnly: true, 
    orderCol: 'loc_id' 
  });

  // Zone 데이터 보정 (DB 컬럼이 비어있으면 loc_id 파싱)
  return data.map((loc: any) => {
    let zone = loc.zone;
    if (!zone || zone.trim() === "") {
      if (loc.loc_id.startsWith("2F")) zone = "2F";
      else {
        const parts = loc.loc_id.split("-");
        if (parts.length > 0) zone = parts[0]; // "H-01-01" -> "H"
      }
    }
    return { ...loc, zone };
  });
};

/**
 * ✅ 2. 모든 재고 데이터 가져오기
 * - 용도: 재고 현황 조회, 엑셀 다운로드
 */
export const getAllInventory = async (supabase: SupabaseClient) => {
  return await fetchAllData(
    supabase, 
    'inventory', 
    '*, item_master!inner (item_name, uom)', 
    { orderCol: 'location_code' }
  );
};

/**
 * ✅ 3. 품목 마스터 가져오기 (자동완성용)
 * - 용도: 검색창 자동완성
 */
export const getAllItems = async (supabase: SupabaseClient) => {
  // 품목은 너무 많을 수 있으니 일단 5000개 제한 (필요시 fetchAllData로 변경)
  const { data, error } = await supabase
    .from('item_master')
    .select('item_key, item_name, uom, remark')
    .eq('active_flag', 'Y')
    .limit(5000);
    
  if (error) throw error;
  return data || [];
};

/**
 * 🧩 [Util] 로케이션 리스트에서 고유한 Zone 목록만 추출
 */
export const extractUniqueZones = (locations: any[]) => {
  const zoneSet = new Set<string>();
  locations.forEach((loc) => {
    if (loc.zone) zoneSet.add(loc.zone);
  });
  return Array.from(zoneSet).sort();
};

// utils/wms.ts (기존 코드 아래에 추가)

/**
 * ✅ 4. 모든 수불 트랜잭션 가져오기
 * - 용도: 수불 이력 조회
 */
export const getAllTransactions = async (supabase: SupabaseClient) => {
  return await fetchAllData(
    supabase, 
    'stock_tx', 
    '*, item_master(item_name, item_key, uom)', 
    { orderCol: 'transaction_date' } // 날짜순 정렬
  );
};