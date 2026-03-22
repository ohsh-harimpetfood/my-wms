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
 * ✅ 1. 모든 로케이션 정보 가져오기 (수정됨: 모달 깨짐 방지 + 박스 상세 정보 조인)
 * - 기존: zone, loc_id만 가져와서 모달에서 정보 부족 발생
 * - 수정: '*' (모든 컬럼) + inventory (재고 상태) + inventory_packing_info (박스 상세 정보) 포함
 */
export const getAllLocations = async (supabase: SupabaseClient) => {
  // 🚨 [핵심 수정] 랙 정보를 그리기 위해 모든 컬럼(*)과 재고 정보를 가져옵니다.
  // 🚀 inventory_packing_info를 추가하여 박스 및 잔량 상세 정보를 함께 불러옵니다!
  // 🚀 [수정됨] pallet_id를 추가하여 프론트엔드에서 파렛트 LPN을 정상적으로 인식하도록 했습니다.
  const selectQuery = `
    *,
    inventory (
      pallet_id,
      quantity,
      item_master ( item_name, item_type, uom ),
      inventory_packing_info ( pack_type, unit_qty, pack_count, total_qty )
    )
  `;

  const data = await fetchAllData(supabase, 'loc_master', selectQuery, { 
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
    '*, item_master!inner (item_name, uom, item_type)', 
    { orderCol: 'location_code' }
  );
};

/**
 * ✅ 3. 품목 마스터 가져오기 (자동완성용)
 * - 용도: 검색창 자동완성
 */
export const getAllItems = async (supabase: SupabaseClient) => {
  // 품목은 5000개 제한 (성능 고려)
  const { data, error } = await supabase
    .from('item_master')
    .select('item_key, item_name, uom, item_type, remark')
    .eq('active_flag', 'Y')
    .limit(5000);
    
  if (error) throw error;
  return data || [];
};

/**
 * ✅ 4. 모든 수불 트랜잭션 가져오기
 * - 용도: 수불 이력 조회
 */
export const getAllTransactions = async (supabase: SupabaseClient) => {
  return await fetchAllData(
    supabase, 
    'stock_tx', 
    '*, item_master(item_name, item_key, uom, item_type)', 
    { orderCol: 'transaction_date' } 
  );
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