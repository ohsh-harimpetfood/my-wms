import { createClient } from "@/utils/supabase/server";
import { Map, LayoutGrid } from "lucide-react";
import LocationMasterClient from "@/components/location/LocationMasterClient"; // 하단에 작성된 컴포넌트

// 데이터 갱신을 위해 동적 렌더링 설정
export const dynamic = 'force-dynamic';

export default async function LocationMasterPage() {
  const supabase = await createClient();

  // 1. 위치 마스터 데이터 전체 조회 (Loc ID 순 정렬)
  const { data: locations, error } = await supabase
    .from("loc_master")
    .select("*")
    .order("loc_id", { ascending: true });

  // 에러 처리
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
    <div className="p-4 md:p-8 space-y-6 bg-black min-h-screen font-[family-name:var(--font-geist-sans)] pb-24">
      
      {/* 1. 상단 헤더 섹션 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-gray-800 pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
            <LayoutGrid className="text-blue-500" size={32} />
            로케이션 관리 (Location Master)
          </h1>
          <p className="text-gray-500 text-sm mt-2 font-medium">
            창고 내 물리적 위치(Zone-Rack-Level-Side) 정보를 관리합니다.
          </p>
        </div>
        
        <div className="flex flex-col items-end gap-2">
          <div className="bg-gray-900 border border-gray-700 px-4 py-2 rounded-xl text-xs font-bold text-gray-400">
            TOTAL LOCATIONS: <span className="text-blue-400 text-lg ml-1">{locations?.length.toLocaleString() || 0}</span>
          </div>
        </div>
      </div>

      {/* 2. 클라이언트 액션 섹션 (검색, 필터, 리스트) */}
      {/* initialLocations로 서버 데이터를 넘겨주며, 인터랙션은 클라이언트에서 처리 */}
      <LocationMasterClient initialLocations={locations || []} />

    </div>
  );
}