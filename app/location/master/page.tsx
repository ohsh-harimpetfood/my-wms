// app/location/master/page.tsx
import { createClient } from "@/utils/supabase/server";
import { Map } from "lucide-react";
import LocationMasterClient from "@/components/location/LocationMasterClient"; // 경로 확인 필요

export const dynamic = 'force-dynamic';

export default async function LocationMasterPage() {
  const supabase = await createClient();

  // 1. 위치 마스터 데이터 전체 조회 (최신순 또는 ID순)
  const { data: locations, error } = await supabase
    .from("loc_master")
    .select("*")
    .order("loc_id", { ascending: true });

  if (error) {
    return <div className="p-8 text-white bg-red-900/20 border border-red-800 rounded-lg">데이터 로딩 에러: {error.message}</div>;
  }

  return (
    <div className="p-8 space-y-6 bg-black min-h-screen">
      
      {/* 1. 상단 헤더 섹션 (정적 정보) */}
      <div className="flex justify-between items-end border-b border-gray-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3 tracking-tighter">
            <Map className="text-blue-500" size={32} />
            LOCATION MASTER
          </h1>
          <p className="text-gray-500 text-sm mt-2 font-medium">
            창고 내 위치 인프라를 구축하고 관리합니다. (Zone-Rack-Level-Side 규칙 적용)
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="bg-blue-900/20 border border-blue-800/50 px-4 py-2 rounded-xl text-xs font-bold text-blue-400">
            TOTAL LOCATIONS: <span className="text-white ml-1">{locations?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* 2. 클라이언트 액션 섹션 (신규 컴포넌트 호출) */}
      {/* initialLocations로 서버 데이터를 넘겨주며, 
          추가/삭제 로직은 이 컴포넌트 내부에서 처리됩니다. 
      */}
      <LocationMasterClient initialLocations={locations || []} />

    </div>
  );
}