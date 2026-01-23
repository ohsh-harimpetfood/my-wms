// app/location/master/page.tsx
import { createClient } from "@/utils/supabase/server";
import { Map } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function LocationMasterPage() {
  const supabase = await createClient();

  // 위치 마스터 데이터 조회
  const { data: locations, error } = await supabase
    .from("loc_master")
    .select("*")
    .order("loc_id", { ascending: true });

  if (error) {
    return <div className="p-8 text-white">데이터 로딩 에러: {error.message}</div>;
  }

  return (
    <div className="space-y-6">
      
      {/* 헤더 */}
      <div className="flex justify-between items-end border-b border-gray-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Map className="text-blue-500" />
            로케이션 관리 (Location Master)
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            창고 내 모든 위치(Cell) 정보를 리스트 형태로 조회하고 관리합니다.
          </p>
        </div>
        <div className="bg-gray-900 border border-gray-700 px-4 py-2 rounded-lg text-sm text-gray-300">
            총 로케이션: <span className="text-white font-bold ml-1">{locations?.length}</span> 개
        </div>
      </div>

      {/* 데이터 테이블 */}
      <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900 shadow-sm">
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-400">
            <thead className="bg-gray-800 text-gray-200 uppercase border-b border-gray-700">
                <tr>
                <th className="px-6 py-4">Loc ID (전체코드)</th>
                <th className="px-6 py-4">창고코드</th>
                <th className="px-6 py-4">구역 (Zone)</th>
                <th className="px-6 py-4">랙 (Rack)</th>
                <th className="px-6 py-4">단 (Level)</th>
                <th className="px-6 py-4">열 (Side)</th>
                <th className="px-6 py-4 text-center">사용여부</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
                {locations?.map((loc) => (
                <tr key={loc.loc_id} className="bg-gray-900 hover:bg-gray-800 transition-colors">
                    <td className="px-6 py-3">
                        <span className="bg-blue-900/30 text-blue-300 border border-blue-800/50 px-2 py-1 rounded font-bold font-mono">
                            {loc.loc_id}
                        </span>
                    </td>
                    <td className="px-6 py-3">{loc.warehouse || '-'}</td>
                    <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded border text-xs font-bold ${
                            loc.zone === 'M' ? 'bg-purple-900/30 text-purple-400 border-purple-800' : 
                            loc.zone === '2F' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-800' : 
                            'bg-gray-800 border-gray-700'
                        }`}>
                            {loc.zone}
                        </span>
                    </td>
                    <td className="px-6 py-3 font-bold text-gray-300">{loc.rack_no}</td>
                    <td className="px-6 py-3">{loc.level_no}단</td>
                    <td className="px-6 py-3">{loc.side}열</td>
                    <td className="px-6 py-3 text-center">
                        {loc.active_flag === 'Y' ? (
                            <span className="text-green-500 text-xs border border-green-900/50 bg-green-900/20 px-2 py-1 rounded">사용중</span>
                        ) : (
                            <span className="text-red-500 text-xs border border-red-900/50 bg-red-900/20 px-2 py-1 rounded">중지</span>
                        )}
                    </td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
}