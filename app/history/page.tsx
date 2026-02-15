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

  let query = supabase
    .from("stock_tx")
    .select(`
      *,
      item_master (item_name, uom),
      profiles:created_by (user_name, department) 
    `)
    .order("transaction_date", { ascending: false });

  // [DB 필터링]
  if (params.startDate) query = query.gte("transaction_date", `${params.startDate}T00:00:00`);
  if (params.endDate) query = query.lte("transaction_date", `${params.endDate}T23:59:59`);
  
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

  const { data: rawData, error } = await query;
  
  if (error) {
      console.error("이력 조회 실패:", error);
      return <div className="p-8 text-red-500">데이터 로딩 실패: {error.message}</div>;
  }

  let transactions = rawData as unknown as Transaction[];

  // [메모리 필터링 - 키워드 1차 필터]
  if (params.keyword) {
    const terms = String(params.keyword).toLowerCase().split(/\s+/).filter(Boolean);
    transactions = transactions.filter(tx => {
        const targetText = `
            ${tx.location_code.toLowerCase()} 
            ${tx.item_key.toLowerCase()} 
            ${tx.item_master?.item_name.toLowerCase() || ''} 
            ${tx.lot_no?.toLowerCase() || ''} 
            ${tx.remark?.toLowerCase() || ''}
            ${tx.profiles?.user_name?.toLowerCase() || ''} 
        `;
        return terms.every(term => targetText.includes(term));
    });
  }

  const totalCount = transactions.length;
  const startIdx = (page - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const currentTransactions = transactions.slice(startIdx, endIdx);

  return (
    // 🚀 [수정 완료] formatDateTime prop을 제거했습니다.
    <HistoryListClient 
        initialHistory={currentTransactions} 
        totalCount={totalCount} 
        params={params}
    />
  );
}