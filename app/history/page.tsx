// app/history/page.tsx
import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, ArrowRightLeft, LogIn, LogOut, FileText } from "lucide-react";
import Link from "next/link";
import HistorySearchForm from "@/components/HistorySearchForm"; 

export const dynamic = 'force-dynamic';

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // ✨ SAP 스타일 화면 분리 로직
  // 'search=true' 파라미터가 없으면 -> 검색 조건 화면(Form) 렌더링
  if (params.search !== "true") {
    return <HistorySearchForm />;
  }

  // ------------------------------------------------------------------
  // 👇 여기서부터는 '조회 결과 화면' (search=true 일 때만 실행됨)
  // ------------------------------------------------------------------

  let transactions: any[] = [];
  let errorMsg = "";

  // 1. 기본 쿼리 구성
  let query = supabase
    .from("stock_tx")
    .select(`
      *,
      item_master (item_name, item_key, uom)
    `)
    // ✨ 버그 수정: created_at -> transaction_date 로 변경
    // (만약 DB 컬럼명이 실제로 created_at이라면 다시 돌려야 하지만, 에러 로그상 transaction_date가 맞을 확률이 높음)
    // 안전하게 사용하기 위해 에러가 났던 created_at 대신 transaction_date 사용
    .order("transaction_date", { ascending: false }); 

  // 2. 동적 필터 적용
  if (params.startDate) query = query.gte("transaction_date", `${params.startDate}T00:00:00`);
  if (params.endDate) query = query.lte("transaction_date", `${params.endDate}T23:59:59`);
  
  // 트랜잭션 타입 필터
  if (params.txType && params.txType !== 'ALL') {
      if (params.txType === 'INBOUND') query = query.in('transaction_type', ['INBOUND', 'DIRECT_IN']);
      else if (params.txType === 'MOVE') query = query.in('transaction_type', ['MOVE', 'MOVE_IN', 'MOVE_OUT']);
      else query = query.eq('transaction_type', params.txType);
  }

  // 키워드 검색
  if (params.keyword) {
      const key = String(params.keyword);
      query = query.or(`location_code.ilike.%${key}%,item_key.ilike.%${key}%,lot_no.ilike.%${key}%,remark.ilike.%${key}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    errorMsg = error.message;
    console.error("Supabase Error:", error); // 디버깅용
  } else {
    transactions = data || [];
  }

  // 날짜 포맷팅 헬퍼
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', hour12: false 
    });
  };

  // 뱃지 헬퍼
  const getBadge = (quantity: number, type: string) => {
      const isPlus = quantity > 0;
      return (
        <span className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 w-fit ${
            isPlus ? "bg-blue-900/30 text-blue-400 border-blue-800" : "bg-red-900/30 text-red-400 border-red-800"
        }`}>
            {isPlus ? <LogIn size={12}/> : <LogOut size={12}/>}
            {isPlus ? "입고" : "출고"}
        </span>
      );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* 결과 화면 헤더 (뒤로가기 포함) */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
            <FileText className="text-yellow-500" size={32} />
            <div>
            <h1 className="text-2xl font-bold text-white">조회 결과 (Result List)</h1>
            <p className="text-gray-400 text-sm">
                총 <span className="text-white font-bold">{transactions.length}</span> 건이 조회되었습니다.
            </p>
            </div>
        </div>
        {/* 뒤로가기 버튼: 검색 조건 유지한 채로 돌아가기 위해 Link 사용 안함 (브라우저 Back 활용하거나 파라미터 제거) */}
        <Link 
            href="/history" 
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm font-bold"
        >
            <ArrowLeft size={16} /> 조건 변경 (Back)
        </Link>
      </div>

      {/* 에러 메시지 표시 */}
      {errorMsg && (
        <div className="p-4 bg-red-900/50 border border-red-800 rounded-lg text-red-200">
            <strong>오류 발생:</strong> {errorMsg} <br/>
            <span className="text-sm opacity-70">(DB 컬럼명이나 조회 조건을 확인해주세요)</span>
        </div>
      )}

      {/* 데이터 테이블 */}
      <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900 shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="bg-gray-800 text-gray-200 uppercase border-b border-gray-700">
                    <tr>
                        <th className="px-6 py-4">일시</th>
                        <th className="px-6 py-4">구분</th>
                        <th className="px-6 py-4">위치</th>
                        <th className="px-6 py-4">품목명 (코드)</th>
                        <th className="px-6 py-4 text-right">수량</th>
                        <th className="px-6 py-4">비고</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {transactions.map((tx) => {
                        const isPlus = tx.quantity > 0;
                        return (
                            <tr key={tx.id} className="bg-gray-900 hover:bg-gray-800 transition-colors">
                                <td className="px-6 py-4 font-mono text-gray-300">
                                    {formatDateTime(tx.transaction_date)}
                                </td>
                                <td className="px-6 py-4">
                                    {getBadge(tx.quantity, tx.transaction_type)}
                                    <div className="text-[10px] text-gray-500 mt-1 uppercase pl-1">{tx.transaction_type}</div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="bg-gray-800 px-2 py-1 rounded text-gray-300 font-bold border border-gray-700">
                                        {tx.location_code}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-white text-base">{tx.item_master?.item_name || '삭제된 품목'}</div>
                                    <div className="text-xs text-gray-500">{tx.item_key}</div>
                                    {tx.lot_no && tx.lot_no !== 'DEFAULT' && (
                                        <div className="text-xs text-gray-400 mt-0.5">LOT: {tx.lot_no}</div>
                                    )}
                                </td>
                                <td className={`px-6 py-4 text-right font-bold text-base ${isPlus ? 'text-blue-400' : 'text-red-400'}`}>
                                    {isPlus ? '+' : ''}{Number(tx.quantity).toLocaleString()}
                                    <span className="text-xs text-gray-600 ml-1 font-normal">{tx.item_master?.uom || "EA"}</span>
                                </td>
                                <td className="px-6 py-4 text-gray-400 max-w-xs truncate" title={tx.remark}>
                                    {tx.remark || '-'}
                                </td>
                            </tr>
                        );
                    })}
                    {transactions.length === 0 && !errorMsg && (
                        <tr>
                            <td colSpan={6} className="px-6 py-20 text-center text-gray-500">
                                조건에 맞는 조회 결과가 없습니다.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}