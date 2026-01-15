'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

// ✅ item_name(품목명)을 다시 추가했습니다!
interface Item {
  item_key: string;       // 품목 코드
  item_name: string;      // 품목명 (가장 중요!)
  uom: string;            // 단위
  lot_required: string;   // LOT 관리 여부
  active_flag: string;    // 사용 여부
  remark: string;         // 비고
  use_team: string;       // 담당 팀
  unit_cost: number;      // 단가
  created_at: string;     // 생성일
}

export default function ItemsPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('item_master')
        .select('*')
        .order('item_key', { ascending: true })
        .limit(20);

      if (error) {
        console.error('에러 발생:', error.message);
        setError(error.message);
      } else {
        setItems(data || []);
      }

      setLoading(false);
    };

    fetchItems();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString();
  };

  const formatMoney = (amount: number) => {
    return amount?.toLocaleString() || '0';
  };

  return (
    <div className="p-8 font-[family-name:var(--font-geist-sans)]">
      <h1 className="text-2xl font-bold mb-6">📦 품목 마스터 (Item Master)</h1>

      {loading && <p>데이터를 불러오는 중...</p>}
      
      {error && <div className="text-red-500 mb-4 bg-red-900/20 p-4 rounded border border-red-500">에러: {error}</div>}

      {!loading && !error && (
        <div className="grid gap-4">
          {items.map((item) => (
            <div
              key={item.item_key}
              className="border border-gray-700 bg-gray-900 p-5 rounded-lg hover:bg-gray-800 transition shadow-sm"
            >
              {/* 상단: 코드, 팀, 활성상태 */}
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-blue-400 font-bold text-lg mr-2">[{item.item_key}]</span>
                  {item.active_flag === 'Y' ? (
                    <span className="text-xs bg-green-900 text-green-300 px-2 py-0.5 rounded border border-green-700">사용중</span>
                  ) : (
                    <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded border border-red-700">중지</span>
                  )}
                </div>
                <div className="text-sm text-gray-400">
                  {item.use_team}
                </div>
              </div>

              {/* ✅ 중간: 품목명 (여기가 핵심입니다!) */}
              <div className="mb-1 text-white font-bold text-xl">
                {item.item_name}
              </div>
              
              {/* 비고(remark)는 품목명 아래에 작게 표시 */}
              <div className="mb-4 text-gray-500 text-sm">
                {item.remark || ''}
              </div>

              {/* 하단: 단가, 단위, LOT여부 */}
              <div className="flex flex-wrap gap-4 text-sm text-gray-400 border-t border-gray-700 pt-3 mt-2">
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">단가</span>
                    <span className="text-gray-300 font-mono">₩{formatMoney(item.unit_cost)}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">단위(UOM)</span>
                    <span className="text-gray-300">{item.uom}</span>
                </div>
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500">LOT관리</span>
                    <span className="text-gray-300">
                        {item.lot_required === 'Y' ? '필수' : '미관리'}
                    </span>
                </div>
                <div className="flex flex-col ml-auto text-right">
                    <span className="text-xs text-gray-500">등록일</span>
                    <span className="text-gray-500 text-xs">{formatDate(item.created_at)}</span>
                </div>
              </div>
            </div>
          ))}
          
          {items.length === 0 && (
             <p className="text-gray-500 text-center py-10">데이터가 없습니다.</p>
          )}
        </div>
      )}
    </div>
  );
}