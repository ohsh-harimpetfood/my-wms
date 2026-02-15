import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, LogIn, LogOut, FileText, Calendar, Box, MapPin, RefreshCw, User, MoreHorizontal } from "lucide-react"; 
import Link from "next/link";
import HistorySearchForm from "@/components/HistorySearchForm"; 
import PaginationControls from "@/components/PaginationControls"; 
import { TX_TYPES, TxCode } from "@/constants/transaction";
import HistoryFilterBar from "@/components/HistoryFilterBar"; 
// 🚀 [변경 1] 아까 만든 타임존 변환 함수 불러오기
import { formatToKST } from "@/utils/format";

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
    } else if (params.txType === 'OUTBOUND') { // 🚀 OUTBOUND 케이스도 명시적으로 추가 (안전하게)
        query = query.in("transaction_type", ['OUTBOUND']);
    } else if (params.txType === 'MOVE') {
        query = query.in("transaction_type", ['MOVE', 'MOVE_IN', 'MOVE_OUT']);
    } else if (params.txType === 'ADJUST') { // 🚀 [추가] 조정 필터링 로직
        query = query.eq("transaction_type", 'ADJUSTMENT'); // DB에는 'ADJUSTMENT'로 저장됨
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

  // [메모리 필터링] 결과 내 검색
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

  // 🚀 [변경 2] 기존의 불완전한 formatDateTime 함수 제거
  // (formatToKST를 직접 사용하므로 더 이상 필요 없음)

  return (
    <div className="space-y-6 animate-fade-in pb-32 p-4 md:p-8 bg-black min-h-screen text-white">
      
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
            <FileText className="text-yellow-500" size={32} />
            <div>
            <h1 className="text-xl md:text-2xl font-bold text-white">조회 결과 (Result)</h1>
            <p className="text-gray-400 text-xs md:text-sm">
                총 <span className="text-white font-bold">{totalCount.toLocaleString()}</span> 건
            </p>
            </div>
        </div>
        <Link 
            href="/history" 
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm font-bold border border-gray-700 w-full md:w-auto justify-center"
        >
            <ArrowLeft size={16} /> 조건 변경 (Back)
        </Link>
      </div>

      {/* 검색바 */}
      <div className="w-full sticky top-0 z-20 bg-black/90 backdrop-blur pt-2 pb-4 -mt-2">
          <HistoryFilterBar initialKeyword={String(params.keyword || "")} />
      </div>

      {/* 🖥️ PC 뷰 */}
      <div className="hidden md:block border border-gray-800 rounded-lg overflow-hidden bg-gray-900 shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
                <thead className="bg-gray-800 text-gray-200 uppercase border-b border-gray-700">
                    <tr>
                        <th className="px-6 py-4">일시</th>
                        <th className="px-6 py-4">구분 (Type)</th>
                        <th className="px-6 py-4">위치</th>
                        <th className="px-6 py-4">품목명 (코드)</th>
                        <th className="px-6 py-4 text-right">수량</th>
                        <th className="px-6 py-4">비고 / 작업자</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {currentTransactions.map((tx) => (
                        // 🚀 [변경 3] formatToKST 함수 전달
                        <DesktopRow key={tx.id} tx={tx} formatDateTime={formatToKST} />
                    ))}
                    {currentTransactions.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-500">데이터가 없습니다.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* 📱 Mobile 뷰 (최적화됨) */}
      <div className="md:hidden flex flex-col gap-3">
        {currentTransactions.map((tx) => (
            // 🚀 [변경 3] formatToKST 함수 전달
            <MobileCard key={tx.id} tx={tx} formatDateTime={formatToKST} />
        ))}
        {currentTransactions.length === 0 && (
           <div className="py-20 text-center text-gray-500 border border-gray-800 rounded-lg bg-gray-900 text-sm">
             조회된 데이터가 없습니다.
           </div>
        )}
      </div>

      <PaginationControls totalCount={totalCount} pageSize={ITEMS_PER_PAGE} />

    </div>
  );
}

// ----------------------------------------------------------------------
// 🧩 하위 컴포넌트
// ----------------------------------------------------------------------

const getTxBadge = (txCode: string, ioType: string) => {
    const typeInfo = TX_TYPES[txCode as TxCode];
    if (typeInfo) {
        const colorClass = {
            blue: "bg-blue-900/30 text-blue-400 border-blue-800",
            green: "bg-green-900/30 text-green-400 border-green-800",
            red: "bg-red-900/30 text-red-400 border-red-800",
            orange: "bg-orange-900/30 text-orange-400 border-orange-800",
            purple: "bg-purple-900/30 text-purple-400 border-purple-800",
            yellow: "bg-yellow-900/30 text-yellow-400 border-yellow-800",
            gray: "bg-gray-800 text-gray-400 border-gray-700",
            zinc: "bg-zinc-800 text-zinc-400 border-zinc-700",
            indigo: "bg-indigo-900/30 text-indigo-400 border-indigo-800",
        }[typeInfo.color] || "bg-gray-800 text-gray-400 border-gray-700";

        return (
            <span className={`px-2 py-1 rounded text-[11px] font-bold border flex items-center gap-1 w-fit whitespace-nowrap ${colorClass}`}>
                {ioType === 'IN' ? <LogIn size={12}/> : ioType === 'OUT' ? <LogOut size={12}/> : <RefreshCw size={12}/>}
                {typeInfo.label}
            </span>
        );
    }
    const isPlus = ioType === 'IN';
    return (
      <span className={`px-2 py-1 rounded text-[11px] font-bold border flex items-center gap-1 w-fit whitespace-nowrap ${
          isPlus ? "bg-blue-900/30 text-blue-400 border-blue-800" : "bg-red-900/30 text-red-400 border-red-800"
      }`}>
          {isPlus ? <LogIn size={12}/> : <LogOut size={12}/>}
          {txCode || (isPlus ? "입고" : "출고")}
      </span>
    );
};

// ❗ formatDateTime의 타입 정의를 string | null | undefined까지 허용하도록 조금 넉넉하게 잡는 게 좋습니다.
// 하지만 formatToKST가 null/undefined 처리를 하므로 (d: string) => string 타입과 호환됩니다.
const DesktopRow = ({ tx, formatDateTime }: { tx: Transaction, formatDateTime: (d:string)=>string }) => {
    return (
        <tr className="bg-gray-900 hover:bg-gray-800 transition-colors">
            <td className="px-6 py-4 font-mono text-gray-300 whitespace-nowrap">{formatDateTime(tx.transaction_date)}</td>
            <td className="px-6 py-4">
                {getTxBadge(tx.tx_code, tx.io_type)}
                <div className="text-[10px] text-gray-600 mt-1 uppercase pl-1 font-mono">{tx.tx_code || tx.transaction_type}</div>
            </td>
            <td className="px-6 py-4"><span className="bg-gray-800 px-2 py-1 rounded text-gray-300 font-bold border border-gray-700 text-xs">{tx.location_code}</span></td>
            <td className="px-6 py-4">
                <div className="font-bold text-white text-base">{tx.item_master?.item_name || '삭제된 품목'}</div>
                <div className="text-xs text-gray-500 flex gap-2 mt-0.5"><span>{tx.item_key}</span>{tx.lot_no && tx.lot_no !== 'DEFAULT' && <span className="text-gray-400">LOT: {tx.lot_no}</span>}</div>
            </td>
            <td className={`px-6 py-4 text-right font-bold text-base ${tx.quantity > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {tx.quantity > 0 ? '+' : ''}{Number(tx.quantity).toLocaleString()}
                <span className="text-xs text-gray-600 ml-1 font-normal">{tx.item_master?.uom || "EA"}</span>
            </td>
            <td className="px-6 py-4 text-gray-400 max-w-xs text-xs">
                <div className="truncate mb-1" title={tx.remark}>{tx.remark || '-'}</div>
                {tx.profiles && (
                    <div className="flex items-center gap-1 text-gray-500 bg-gray-800/50 px-2 py-0.5 rounded w-fit">
                        <User size={10} />
                        <span>{tx.profiles.user_name}</span>
                    </div>
                )}
            </td>
        </tr>
    );
};

// 📱 모바일 카드 디자인 최적화
const MobileCard = ({ tx, formatDateTime }: { tx: Transaction, formatDateTime: (d:string)=>string }) => {
    return (
        <div className="bg-[#111] border border-gray-800 rounded-xl p-4 shadow-sm relative overflow-hidden">
            {/* 좌측 컬러 바 (입출고 구분) */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${tx.quantity > 0 ? 'bg-blue-500' : 'bg-red-500'}`}></div>
            
            <div className="pl-2">
                {/* 상단: 날짜 & 배지 */}
                <div className="flex justify-between items-start mb-2">
                    <div className="text-xs text-gray-500 font-mono flex items-center gap-1">
                        <Calendar size={11} className="text-gray-600"/> 
                        {formatDateTime(tx.transaction_date)}
                    </div>
                    {getTxBadge(tx.tx_code, tx.io_type)}
                </div>

                {/* 중간: 품목 정보 & 수량 */}
                <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white leading-tight mb-1 truncate">
                            {tx.item_master?.item_name || '미상 품목'}
                        </div>
                        <div className="flex flex-wrap gap-2 items-center text-xs">
                            <span className="text-gray-500 font-mono">{tx.item_key}</span>
                            <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 border border-gray-700 flex items-center gap-1 text-[11px]">
                                <MapPin size={9}/> {tx.location_code}
                            </span>
                            {tx.lot_no && tx.lot_no !== 'DEFAULT' && (
                                <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 border border-gray-700 text-[11px]">
                                    LOT: {tx.lot_no}
                                </span>
                            )}
                        </div>
                    </div>
                    
                    <div className={`text-lg font-bold whitespace-nowrap text-right ${tx.quantity > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {tx.quantity > 0 ? '+' : ''}{Number(tx.quantity).toLocaleString()}
                        <div className="text-[10px] text-gray-600 font-normal">{tx.item_master?.uom || "EA"}</div>
                    </div>
                </div>

                {/* 하단: 비고 & 작업자 */}
                <div className="flex justify-between items-center pt-2 border-t border-gray-800/50">
                    <div className="text-xs text-gray-400 flex items-center gap-1 truncate flex-1 pr-2">
                        <MoreHorizontal size={12} className="text-gray-600"/>
                        <span className="truncate">{tx.remark || '-'}</span>
                    </div>
                    {tx.profiles && (
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 whitespace-nowrap bg-gray-900 px-2 py-0.5 rounded-full border border-gray-800">
                            <User size={10} /> {tx.profiles.user_name}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};