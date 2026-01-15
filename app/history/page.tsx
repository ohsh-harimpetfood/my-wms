'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

interface StockTx {
  id: number;
  transaction_date: string;
  transaction_type: string;
  location_code: string;
  item_key: string;
  quantity: number;
  remark: string;
  item_master?: {
    item_name: string;
    uom: string;
  };
}

export default function HistoryPage() {
  const [transactions, setTransactions] = useState<StockTx[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('stock_tx')
        .select(`
          *,
          item_master (
            item_name,
            uom
          )
        `)
        .order('transaction_date', { ascending: false }) // 최신순 정렬
        .limit(50); // 최근 50건만 보기

      if (error) {
        console.error('에러:', error.message);
      } else {
        setTransactions(data as any || []);
      }
      setLoading(false);
    };

    fetchHistory();
  }, []);

  // 날짜 포맷 함수 (YYYY-MM-DD HH:mm)
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ko-KR', { 
        year: 'numeric', month: '2-digit', day: '2-digit', 
        hour: '2-digit', minute: '2-digit', hour12: false 
    });
  };

  return (
    <div className="p-8 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-2xl font-bold mb-6">📜 수불 이력 (Transaction History)</h1>

      {loading ? (
        <p>기록을 불러오는 중...</p>
      ) : (
        <div className="overflow-x-auto border border-gray-800 rounded-lg">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="text-xs text-gray-200 uppercase bg-gray-900 border-b border-gray-700">
              <tr>
                <th className="px-6 py-3">일시</th>
                <th className="px-6 py-3">구분</th>
                <th className="px-6 py-3">위치</th>
                <th className="px-6 py-3">품목명 (코드)</th>
                <th className="px-6 py-3 text-right">수량</th>
                <th className="px-6 py-3">비고</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id} className="bg-gray-950 border-b border-gray-800 hover:bg-gray-900 transition">
                  <td className="px-6 py-4">{formatDateTime(tx.transaction_date)}</td>
                  <td className="px-6 py-4">
                    {tx.transaction_type === 'INBOUND' ? (
                      <span className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-xs border border-blue-700">입고</span>
                    ) : (
                      <span className="bg-red-900 text-red-300 px-2 py-1 rounded text-xs border border-red-700">출고</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-white">{tx.location_code}</td>
                  <td className="px-6 py-4">
                    <div className="text-white font-bold">{tx.item_master?.item_name}</div>
                    <div className="text-xs text-gray-600">{tx.item_key}</div>
                  </td>
                  <td className={`px-6 py-4 text-right font-bold ${tx.quantity > 0 ? 'text-blue-400' : 'text-red-400'}`}>
                    {tx.quantity > 0 ? '+' : ''}{tx.quantity.toLocaleString()}
                    <span className="text-xs text-gray-600 ml-1">{tx.item_master?.uom}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{tx.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {transactions.length === 0 && (
            <div className="p-10 text-center text-gray-500">기록이 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}