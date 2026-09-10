import { createClient } from "@/utils/supabase/server";
import HistorySearchForm from "@/components/HistorySearchForm"; 
import HistoryListClient from "./HistoryListClient";

export const dynamic = 'force-dynamic';

interface Transaction {
  id: number;
  transaction_date: string;
  transaction_type: string;
  io_type: string;
  tx_code: string;
  location_code: string;
  item_key: string;
  quantity: number;
  lot_no: string;
  remark: string;
  item_master: {
    item_name: string;
    uom: string;
  } | null;
  profiles: {
    user_name: string;
    department: string;
  } | null;
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // 1. 검색 폼 모드
  if (params.search !== "true") {
    return <HistorySearchForm />;
  }

  // 2. 데이터 조회
  const page = params.page ? Number(params.page) : 1;
  const ITEMS_PER_PAGE = 20;
  const startIdx = (page - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE - 1;

  let query = supabase
    .from("stock_tx")
    .select(`
      *,
      item_master!inner (item_name, uom),
      profiles:created_by (user_name, department) 
    `, { count: 'exact' })
    .order("transaction_date", { ascending: false });

  // [DB 필터링 - 날짜]
  if (params.startDate) query = query.gte("transaction_date", `${params.startDate}T00:00:00`);
  if (params.endDate) query = query.lte("transaction_date", `${params.endDate}T23:59:59`);
  
  // [DB 필터링 - 수불 타입]
  if (params.txType && params.txType !== 'ALL') {
    if (params.txType === 'INBOUND') {
        query = query.in("transaction_type", ['INBOUND', 'DIRECT_IN']);
    } else if (params.txType === 'OUTBOUND') { 
        query = query.in("transaction_type", ['OUTBOUND']);
    } else if (params.txType === 'MOVE') {
        query = query.in("transaction_type", ['MOVE', 'MOVE_IN', 'MOVE_OUT']);
    } else if (params.txType === 'ADJUST') { 
        query = query.eq("transaction_type", 'ADJUSTMENT'); 
    } else {
        query = query.eq("transaction_type", params.txType);
    }
  }

  // 🚀 [수정 완료: 투스텝 DB 필터링]
  if (params.keyword) {
    const terms = String(params.keyword).trim().split(/\s+/).filter(Boolean);

    for (const term of terms) {
      // 1단계: 검색어가 '품목명'일 수 있으므로 item_master에서 일치하는 품목코드(key)를 먼저 조회
      const { data: matchedItems } = await supabase
        .from("item_master")
        .select("item_key")
        .ilike("item_name", `%${term}%`);

      const matchedKeys = matchedItems?.map(item => item.item_key) || [];

      // 2단계: 현재 테이블(stock_tx) 기준의 기본 OR 조건 생성
      let orCondition = `item_key.ilike.%${term}%,location_code.ilike.%${term}%,lot_no.ilike.%${term}%,remark.ilike.%${term}%`;

      // 3단계: 품목명으로 찾은 품목코드들이 있다면 OR 조건에 추가 병합 (에러 방지를 위해 eq 사용)
      if (matchedKeys.length > 0) {
        const keysOr = matchedKeys.map(key => `item_key.eq.${key}`).join(',');
        orCondition += `,${keysOr}`;
      }

      // 최종 쿼리에 반영
      query = query.or(orCondition);
    }
  }

  // 페이징 제한 설정 (이 구문이 무조건 검색 필터 세팅 이후에 와야 합니다)
  query = query.range(startIdx, endIdx);

  const { data: rawData, count, error } = await query;
  
  if (error) {
      console.error("이력 조회 실패:", error);
      return <div className="p-8 text-red-500 bg-black min-h-screen">데이터 로딩 실패: {error.message}</div>;
  }

  const transactions = rawData as unknown as Transaction[];
  const totalCount = count || 0;

  return (
    <HistoryListClient 
        initialHistory={transactions} 
        totalCount={totalCount} 
        params={params}
    />
  );
}