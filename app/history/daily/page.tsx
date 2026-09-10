import { createClient } from "@/utils/supabase/server";
import DailyHistoryClient from "@/components/history/DailyHistoryClient";

export const dynamic = 'force-dynamic';

export default async function DailyHistoryPage() {
  const supabase = await createClient();

  // 검색을 위한 전체 품목 마스터(기본 정보)만 미리 서버에서 당겨옵니다.
  const { data: masterData } = await supabase
    .from('item_master')
    .select('item_key, item_name, uom, active_flag')
    .order('item_name', { ascending: true });

  return (
    <div className="p-4 md:p-8 space-y-6 bg-black min-h-screen text-white animate-fade-in pb-20">
      <div className="border-b border-gray-800 pb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          📊 품목별 일자별 재고 장부
        </h1>
        <p className="text-sm text-gray-500 mt-2">
          특정 품목의 기간 내 일일 수불(이월, 입고, 출고, 조정) 흐름을 추적합니다.
        </p>
      </div>

      {/* 클라이언트 컴포넌트로 마스터 데이터 넘김 */}
      <DailyHistoryClient masterItems={masterData || []} />
    </div>
  );
}