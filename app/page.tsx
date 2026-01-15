'use client';

import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

// ✅ 수정: DB 컬럼명에 맞춰 인터페이스 정의
interface Location {
  loc_id: string;
  rack_no: string;   // rack -> rack_no
  level_no: string;  // level -> level_no
}

export default function Home() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [stats, setStats] = useState({
    totalLocations: 0,
    totalItems: 0,
    totalStock: 0
  });
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      // 1. 위치 목록 가져오기
      const { data: locData, error: locError } = await supabase
        .from('loc_master')
        .select('*')
        .order('loc_id', { ascending: true }); // loc_id 기준 정렬

      if (locError) {
        console.error("❌ 위치 데이터 에러:", locError.message);
      } else {
        setLocations(locData as any || []);
      }

      // 2. 통계 데이터 (품목 수)
      const { count: itemCount } = await supabase
        .from('item_master')
        .select('*', { count: 'exact', head: true });

      // 3. 통계 데이터 (재고 수량)
      const { data: invData } = await supabase
        .from('inventory')
        .select('quantity');
      
      const totalQty = invData?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0;

      setStats({
        totalLocations: locData?.length || 0,
        totalItems: itemCount || 0,
        totalStock: totalQty
      });

      setLoading(false);
    };

    fetchData();
  }, []);

  return (
    <div className="font-[family-name:var(--font-geist-sans)]">
      
      {/* 📊 WMS 대시보드 */}
      <section className="mb-10">
        <h1 className="text-3xl font-bold mb-6 text-white">🏭 WMS 대시보드</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg">
            <div className="text-gray-400 text-sm mb-2">📍 총 보관 구역</div>
            <div className="text-4xl font-bold text-blue-400">
              {loading ? '-' : stats.totalLocations}
              <span className="text-lg text-gray-500 ml-2">개</span>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg">
            <div className="text-gray-400 text-sm mb-2">📦 등록 품목</div>
            <div className="text-4xl font-bold text-yellow-400">
              {loading ? '-' : stats.totalItems}
              <span className="text-lg text-gray-500 ml-2">종</span>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl shadow-lg">
            <div className="text-gray-400 text-sm mb-2">📊 현재 총 재고</div>
            <div className="text-4xl font-bold text-green-400">
              {loading ? '-' : stats.totalStock.toLocaleString()}
              <span className="text-lg text-gray-500 ml-2">KG</span>
            </div>
          </div>
        </div>
      </section>

      {/* 📋 창고 위치 목록 */}
      <section>
        <h2 className="text-xl font-bold mb-4 text-gray-300">📋 창고 위치 목록</h2>
        
        {loading && <p>데이터를 불러오는 중...</p>}

        <div className="grid gap-3">
          {locations.map((loc) => {
            // ✅ 구역(Zone) 자동 계산: loc_id의 첫 글자 따오기 (예: MA11 -> M)
            const zonePrefix = loc.loc_id.charAt(0);

            return (
              <div
                key={loc.loc_id}
                className="border border-gray-800 bg-black/40 p-4 rounded-lg hover:border-blue-500 transition cursor-default flex items-center justify-between"
              >
                <span className="text-blue-400 font-bold text-lg">[{loc.loc_id}]</span>
                
                {/* ✅ 수정: 정확한 컬럼명(rack_no, level_no) 사용 */}
                <span className="text-gray-300">
                  <span className="text-white font-bold">{zonePrefix}</span>구역 - 
                  <span className="text-white font-bold ml-1">{loc.rack_no}</span>랙 - 
                  <span className="text-white font-bold ml-1">{loc.level_no}</span>단
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}