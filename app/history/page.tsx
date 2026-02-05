import { createClient } from "@/utils/supabase/server";
import { ArrowLeft, LogIn, LogOut, FileText, Calendar, Box, MapPin, RefreshCw } from "lucide-react";
import Link from "next/link";
import HistorySearchForm from "@/components/HistorySearchForm"; 
import PaginationControls from "@/components/PaginationControls"; 
import { getAllTransactions } from "@/utils/wms";
// 🚀 상수 Import
import { TX_TYPES, TxCode } from "@/constants/transaction";

export const dynamic = 'force-dynamic';

interface Transaction {
  id: number;
  transaction_date: string;
  transaction_type: string; // 대분류 (INBOUND, OUTBOUND)
  io_type: string;          // IN, OUT
  tx_code: string;          // 🚀 소분류 (IN_PURCHASE 등)
  location_code: string;
  item_key: string;
  quantity: number;
  lot_no: string;
  remark: string;
  item_master: {
    item_name: string;
    item_key: string;
    uom: string;
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

  // ==============================================================================
  // 2. 데이터 조회 및 필터링
  // ==============================================================================
  
  // 페이징 설정
  const page = params.page ? Number(params.page) : 1;
  const ITEMS_PER_PAGE = 20;

  const rawTransactions = await getAllTransactions(supabase);
  let transactions = rawTransactions as unknown as Transaction[];

  // [필터링] 날짜
  if (params.startDate) {
    const start = new Date(`${params.startDate}T00:00:00`).getTime();
    transactions = transactions.filter(tx => new Date(tx.transaction_date).getTime() >= start);
  }
  if (params.endDate) {
    const end = new Date(`${params.endDate}T23:59:59`).getTime();
    transactions = transactions.filter(tx => new Date(tx.transaction_date).getTime() <= end);
  }

  // [필터링] 타입
  if (params.txType && params.txType !== 'ALL') {
    if (params.txType === 'INBOUND') {
        transactions = transactions.filter(tx => ['INBOUND', 'DIRECT_IN'].includes(tx.transaction_type));
    } else if (params.txType === 'MOVE') {
        transactions = transactions.filter(tx => ['MOVE', 'MOVE_IN', 'MOVE_OUT'].includes(tx.transaction_type));
    } else {
        transactions = transactions.filter(tx => tx.transaction_type === params.txType);
    }
  }

  // [필터링] 키워드
  if (params.keyword) {
    const terms = String(params.keyword).toLowerCase().split(/\s+/).filter(Boolean);
    transactions = transactions.filter(tx => {
        const targetText = `
            ${tx.location_code.toLowerCase()} 
            ${tx.item_key.toLowerCase()} 
            ${tx.item_master?.item_name.toLowerCase() || ''} 
            ${tx.lot_no?.toLowerCase() || ''} 
            ${tx.remark?.toLowerCase() || ''}
        `;
        return terms.every(term => targetText.includes(term));
    });
  }

  // 정렬 (최신순)
  transactions.sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime());

  // 페이지네이션 처리 (Slice)
  const totalCount = transactions.length;
  const startIdx = (page - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const currentTransactions = transactions.slice(startIdx, endIdx);

  // 날짜 포맷 헬퍼
  const formatDateTime = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', hour12: false 
    });
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24 p-4 md:p-8 bg-black min-h-screen text-white">
      
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-3">
            <FileText className="text-yellow-500" size={32} />
            <div>
            <h1 className="text-2xl font-bold text-white">조회 결과 (Result List)</h1>
            <p className="text-gray-400 text-sm">
                총 <span className="text-white font-bold">{totalCount.toLocaleString()}</span> 건이 조회되었습니다.
            </p>
            </div>
        </div>
        <Link 
            href="/history" 
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition text-sm font-bold border border-gray-700"
        >
            <ArrowLeft size={16} /> 조건 변경 (Back)
        </Link>
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
                        <th className="px-6 py-4">비고</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                    {currentTransactions.map((tx) => (
                        <DesktopRow key={tx.id} tx={tx} formatDateTime={formatDateTime} />
                    ))}
                    {currentTransactions.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-500">데이터가 없습니다.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>

      {/* 📱 Mobile 뷰 */}
      <div className="md:hidden flex flex-col gap-4">
        {currentTransactions.map((tx) => (
            <MobileCard key={tx.id} tx={tx} formatDateTime={formatDateTime} />
        ))}
        {currentTransactions.length === 0 && (
           <div className="py-20 text-center text-gray-500 border border-gray-800 rounded-lg bg-gray-900">
             데이터가 없습니다.
           </div>
        )}
      </div>

      {/* 페이지네이션 컨트롤 */}
      <PaginationControls totalCount={totalCount} pageSize={ITEMS_PER_PAGE} />

    </div>
  );
}

// ----------------------------------------------------------------------
// 🧩 하위 컴포넌트
// ----------------------------------------------------------------------

// 🚀 [신규] 트랜잭션 유형 배지 컴포넌트
const getTxBadge = (txCode: string, ioType: string) => {
    const typeInfo = TX_TYPES[txCode as TxCode];
    
    if (typeInfo) {
        // TX_TYPES에 정의된 컬러 매핑
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
            <span className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 w-fit ${colorClass}`}>
                {ioType === 'IN' ? <LogIn size={12}/> : ioType === 'OUT' ? <LogOut size={12}/> : <RefreshCw size={12}/>}
                {typeInfo.label}
            </span>
        );
    }

    // 정의되지 않은 유형 (구 데이터 호환성)
    const isPlus = ioType === 'IN';
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold border flex items-center gap-1 w-fit ${
          isPlus ? "bg-blue-900/30 text-blue-400 border-blue-800" : "bg-red-900/30 text-red-400 border-red-800"
      }`}>
          {isPlus ? <LogIn size={12}/> : <LogOut size={12}/>}
          {txCode || (isPlus ? "입고" : "출고")}
      </span>
    );
};

const DesktopRow = ({ tx, formatDateTime }: { tx: Transaction, formatDateTime: (d:string)=>string }) => {
    return (
        <tr className="bg-gray-900 hover:bg-gray-800 transition-colors">
            <td className="px-6 py-4 font-mono text-gray-300 whitespace-nowrap">{formatDateTime(tx.transaction_date)}</td>
            <td className="px-6 py-4">
                {/* 배지 적용 */}
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
            <td className="px-6 py-4 text-gray-400 max-w-xs truncate text-xs" title={tx.remark}>{tx.remark || '-'}</td>
        </tr>
    );
};

const MobileCard = ({ tx, formatDateTime }: { tx: Transaction, formatDateTime: (d:string)=>string }) => {
    return (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 shadow-md active:border-blue-500/50 transition-colors">
            <div className="flex justify-between items-start mb-3 border-b border-gray-800 pb-2">
                <div className="flex flex-col"><span className="text-xs text-gray-500 font-mono flex items-center gap-1"><Calendar size={10}/> {formatDateTime(tx.transaction_date)}</span></div>
                <div className="flex flex-col items-end">
                    {/* 배지 적용 */}
                    {getTxBadge(tx.tx_code, tx.io_type)}
                </div>
            </div>
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <div className="text-sm font-bold text-white mb-1 line-clamp-2">{tx.item_master?.item_name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1 mb-1"><Box size={10}/> {tx.item_key}</div>
                    <div className="flex gap-2">
                         <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 text-[10px] border border-gray-700 flex items-center gap-1"><MapPin size={8}/> {tx.location_code}</span>
                         {tx.lot_no && tx.lot_no !== 'DEFAULT' && (<span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 text-[10px] border border-gray-700">LOT: {tx.lot_no}</span>)}
                    </div>
                </div>
                <div className={`text-lg font-bold whitespace-nowrap ml-2 ${tx.quantity > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {tx.quantity > 0 ? '+' : ''}{Number(tx.quantity).toLocaleString()}
                    <span className="text-xs text-gray-600 ml-1 font-normal">{tx.item_master?.uom || "EA"}</span>
                </div>
            </div>
            {tx.remark && (<div className="text-xs text-gray-500 bg-gray-950/50 p-2 rounded italic">"{tx.remark}"</div>)}
        </div>
    );
};