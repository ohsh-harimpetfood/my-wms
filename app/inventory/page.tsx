'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

interface InventoryItem {
  id: number;
  location_code: string;
  item_key: string;
  quantity: number;
  item_master?: {
    item_name: string;
    uom: string;
  };
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 🔍 1. 검색어를 저장할 상태 변수 추가
  const [searchTerm, setSearchTerm] = useState('');

  const supabase = createClient();

  useEffect(() => {
    const fetchInventory = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('inventory')
        .select(`
          *,
          item_master (
            item_name,
            uom
          )
        `)
        .order('location_code', { ascending: true });

      if (error) {
        console.error('에러 발생:', error.message);
        setError(error.message);
      } else {
        setInventory(data as any);
      }

      setLoading(false);
    };

    fetchInventory();
  }, []);

  // 🔍 2. 검색 로직 (Search Logic)
  // 원본 데이터(inventory)를 건드리지 않고, 보여줄 데이터(filteredInventory)만 따로 계산합니다.
  const filteredInventory = inventory.filter((item) => {
    const term = searchTerm.toLowerCase(); // 검색어를 소문자로 변환 (대소문자 구분 없애기 위함)
    
    // 검색 대상: 위치코드, 품목명, 품목코드
    const loc = item.location_code.toLowerCase();
    const name = item.item_master?.item_name?.toLowerCase() || '';
    const code = item.item_key.toLowerCase();

    // 셋 중 하나라도 검색어를 포함하면 통과!
    return loc.includes(term) || name.includes(term) || code.includes(term);
  });

  return (
    <div className="p-8 font-[family-name:var(--font-geist-sans)]">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">📊 재고 현황 (Inventory)</h1>
        
        {/* 🔍 3. 검색 입력창 디자인 */}
        <input
          type="text"
          placeholder="검색 (위치, 품목명, 코드)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-80 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
        />
      </div>

      {loading && <p>재고 정보를 불러오는 중...</p>}
      
      {error && <div className="text-red-500 mb-4 border border-red-500 p-4 rounded">에러: {error}</div>}

      {!loading && !error && (
        <div className="grid gap-4">
          {/* 🔍 4. inventory 대신 filteredInventory를 사용하여 목록 표시 */}
          {filteredInventory.map((inv) => (
            <div
              key={inv.id}
              className="border border-gray-700 bg-gray-900 p-5 rounded-lg hover:bg-gray-800 transition flex justify-between items-center"
            >
              <div className="flex flex-col">
                <span className="text-gray-400 text-xs mb-1">위치(Location)</span>
                {/* 검색어가 있으면 위치 코드 하이라이트 효과를 줄 수도 있지만, 지금은 심플하게 */}
                <span className="text-blue-400 font-bold text-xl">{inv.location_code}</span>
              </div>

              <div className="flex flex-col flex-1 px-8">
                <span className="text-gray-400 text-xs mb-1">품목(Item)</span>
                <div className="flex items-baseline">
                  <span className="text-white font-bold text-lg mr-2">
                    {inv.item_master?.item_name || '알 수 없는 품목'}
                  </span>
                  <span className="text-gray-500 text-sm">({inv.item_key})</span>
                </div>
              </div>

              <div className="flex flex-col text-right">
                <span className="text-gray-400 text-xs mb-1">수량(Qty)</span>
                <div className="flex items-baseline justify-end">
                  <span className="text-green-400 font-bold text-2xl mr-1">
                    {inv.quantity.toLocaleString()}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {inv.item_master?.uom || 'EA'}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* 검색 결과가 없을 때 메시지 */}
          {filteredInventory.length === 0 && !loading && (
            <div className="text-center py-10 text-gray-500 bg-gray-900/50 rounded-lg border border-dashed border-gray-800">
              <p className="text-lg">검색 결과가 없습니다.</p>
              <p className="text-sm mt-1">"{searchTerm}"에 해당하는 위치나 품목을 찾을 수 없습니다.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}