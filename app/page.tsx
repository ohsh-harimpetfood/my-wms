// app/page.tsx
import { createClient } from "@/utils/supabase/server";
import { Factory, Map, Package, Truck, ArrowRight, BarChart3, Database } from "lucide-react";
import Link from "next/link";
// ❌ LoadingScreen import 삭제됨

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();

  // 서버 사이드 병렬 데이터 조회 (가장 빠름)
  const [locRes, itemRes, invRes] = await Promise.all([
    supabase.from("loc_master").select("*", { count: "exact", head: true }),
    supabase.from("item_master").select("*", { count: "exact", head: true }),
    supabase.from("inventory").select("quantity")
  ]);

  const locCount = locRes.count ?? 0;
  const itemCount = itemRes.count ?? 0;
  const totalQty = invRes.data?.reduce((acc, curr) => acc + (curr.quantity || 0), 0) ?? 0;

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* ❌ <LoadingScreen /> 삭제됨: 이제 불필요한 대기 없이 바로 화면이 뜹니다. */}

      {/* 1. 타이틀 변경: 통합 물류 관제 센터 */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-900 to-gray-800 p-8 rounded-2xl border border-gray-800 shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 flex items-center gap-3 mb-2">
            <Factory size={32} className="text-blue-500" />
            My WMS (Harimpetfood)
          </h1>
          <p className="text-gray-400 max-w-2xl text-lg">
            실시간 창고 운영 현황을 모니터링하고 통합 관리합니다.
          </p>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      </div>

      {/* 2. 주요 지표 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* 총 보관 구역 */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-blue-500/50 transition duration-300 shadow-lg group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">총 보관 구역 (Cells)</p>
              <h3 className="text-4xl font-bold text-white mt-2 group-hover:text-blue-400 transition-colors">
                {locCount.toLocaleString()} <span className="text-lg text-gray-500 font-normal">개</span>
              </h3>
            </div>
            <div className="p-3 bg-blue-900/20 rounded-lg text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition">
              <Map size={24} />
            </div>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-blue-500 h-full w-[70%]"></div>
          </div>
        </div>

        {/* 등록 품목 */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-yellow-500/50 transition duration-300 shadow-lg group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">등록 품목 (Master)</p>
              <h3 className="text-4xl font-bold text-white mt-2 group-hover:text-yellow-400 transition-colors">
                {itemCount.toLocaleString()} <span className="text-lg text-gray-500 font-normal">종</span>
              </h3>
            </div>
            <div className="p-3 bg-yellow-900/20 rounded-lg text-yellow-400 group-hover:bg-yellow-600 group-hover:text-white transition">
              <Database size={24} />
            </div>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-yellow-500 h-full w-[50%]"></div>
          </div>
        </div>

        {/* 총 재고량 */}
        <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 hover:border-green-500/50 transition duration-300 shadow-lg group">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-gray-400 text-sm font-medium">현재 총 재고 수량</p>
              <h3 className="text-4xl font-bold text-white mt-2 group-hover:text-green-400 transition-colors">
                {totalQty.toLocaleString()} <span className="text-lg text-gray-500 font-normal">EA/KG</span>
              </h3>
            </div>
            <div className="p-3 bg-green-900/20 rounded-lg text-green-400 group-hover:bg-green-600 group-hover:text-white transition">
              <BarChart3 size={24} />
            </div>
          </div>
          <div className="w-full bg-gray-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full w-[85%]"></div>
          </div>
        </div>

      </div>

      {/* 3. 바로가기 */}
      <div>
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-l-4 border-purple-500 pl-3">
          🚀 바로가기 (Quick Access)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <Link href="/location" className="group bg-gray-900 p-6 rounded-xl border border-gray-800 hover:bg-gray-800 transition shadow-md">
             <div className="flex justify-between items-center mb-3">
                <Map size={32} className="text-blue-500 group-hover:scale-110 transition-transform" />
                <ArrowRight className="text-gray-600 group-hover:text-white transition-colors" />
             </div>
             <h3 className="text-lg font-bold text-white mb-1">창고 위치 맵 (Map)</h3>
             <p className="text-sm text-gray-400">물류팀(2F)과 생산팀(M존)의 랙 배치를 시각적으로 확인합니다.</p>
          </Link>

          <Link href="/inbound" className="group bg-gray-900 p-6 rounded-xl border border-gray-800 hover:bg-gray-800 transition shadow-md">
             <div className="flex justify-between items-center mb-3">
                <Truck size={32} className="text-purple-500 group-hover:scale-110 transition-transform" />
                <ArrowRight className="text-gray-600 group-hover:text-white transition-colors" />
             </div>
             <h3 className="text-lg font-bold text-white mb-1">입고 관리 (Inbound)</h3>
             <p className="text-sm text-gray-400">입고 예정을 등록하거나, 생산팀용 즉시 입고 처리를 수행합니다.</p>
          </Link>

          <Link href="/inventory" className="group bg-gray-900 p-6 rounded-xl border border-gray-800 hover:bg-gray-800 transition shadow-md">
             <div className="flex justify-between items-center mb-3">
                <Package size={32} className="text-orange-500 group-hover:scale-110 transition-transform" />
                <ArrowRight className="text-gray-600 group-hover:text-white transition-colors" />
             </div>
             <h3 className="text-lg font-bold text-white mb-1">재고 현황 (Inventory)</h3>
             <p className="text-sm text-gray-400">현재 보관 중인 품목별 재고 수량과 LOT 정보를 상세 조회합니다.</p>
          </Link>

        </div>
      </div>

    </div>
  );
}