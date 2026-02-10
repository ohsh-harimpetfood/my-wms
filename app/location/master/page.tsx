import { createClient } from "@/utils/supabase/server";
import { Map, LayoutGrid } from "lucide-react";
import LocationMasterClient from "@/components/location/LocationMasterClient";

export const dynamic = 'force-dynamic';

export default async function LocationMasterPage() {
  const supabase = await createClient();

  const { data: locations, error } = await supabase
    .from("loc_master")
    .select("*")
    .order("loc_id", { ascending: true });

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="p-8 text-white bg-red-900/20 border border-red-800 rounded-lg text-center">
          <h3 className="text-xl font-bold mb-2">데이터 로딩 실패</h3>
          <p>{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    // 1. 전체 컨테이너 패딩 축소 (p-4 -> p-3, md:p-8)
    <div className="p-3 md:p-8 space-y-4 md:space-y-6 bg-black min-h-screen font-[family-name:var(--font-geist-sans)] pb-24">
      
      {/* 2. 헤더 섹션 컴팩트화 */}
      <div className="flex flex-row justify-between items-center border-b border-gray-800 pb-3 md:pb-6 gap-2">
        <div>
          {/* 모바일: text-lg / PC: text-3xl */}
          <h1 className="text-lg md:text-3xl font-black text-white flex items-center gap-2 md:gap-3 tracking-tighter">
            <LayoutGrid className="text-blue-500 w-5 h-5 md:w-8 md:h-8" />
            <span>로케이션 관리</span>
            <span className="hidden md:inline text-gray-500 font-normal">(Location Master)</span>
          </h1>
          {/* 모바일에서는 설명 숨김 */}
          <p className="hidden md:block text-gray-500 text-sm mt-2 font-medium">
            창고 내 물리적 위치(Zone-Rack-Level-Side) 정보를 관리합니다.
          </p>
        </div>
        
        {/* 통계 뱃지: 모바일 사이즈 최적화 */}
        <div className="flex flex-col items-end gap-1">
          <div className="bg-gray-900 border border-gray-700 px-2 py-1 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold text-gray-400 flex items-center gap-1">
            <span className="hidden md:inline">TOTAL:</span>
            <span className="md:hidden">총</span>
            <span className="text-blue-400 text-sm md:text-lg">{locations?.length.toLocaleString() || 0}</span>
          </div>
        </div>
      </div>

      {/* 3. 클라이언트 컴포넌트 */}
      <LocationMasterClient initialLocations={locations || []} />

    </div>
  );
}