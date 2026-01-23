// app/items/page.tsx
import { createClient } from "@/utils/supabase/server";
import PaginationControls from "@/components/PaginationControls";
import SearchInput from "@/components/SearchInput";

// ✨ [핵심 1] 캐싱 방지: 페이지를 강제로 동적 렌더링으로 설정 (데이터가 안 바뀌는 문제 해결)
export const dynamic = 'force-dynamic';

interface Item {
  item_key: string;
  item_name: string;
  uom: string;
  lot_required: string;
  active_flag: string;
  remark: string;
  use_team: string;
  unit_cost: number;
  created_at: string;
}

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString("ko-KR");
};

const formatMoney = (amount: number | null) => {
  return amount?.toLocaleString() || '0';
};

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  
  // Next.js 15+ 에서는 await searchParams가 필수
  const params = await searchParams;

  const page = params.page ? Number(params.page) : 1;
  
  // ✨ [핵심 2] 검색어 처리 강화: 한글 깨짐 방지 및 공백 제거
  const rawQuery = params.query ? String(params.query) : "";
  const query = decodeURIComponent(rawQuery).trim();

  const ITEMS_PER_PAGE = 10;
  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE - 1;

  // DB 쿼리 시작
  let dbQuery = supabase
    .from('item_master')
    .select('*', { count: 'exact' })
    .order('item_key', { ascending: true })
    .range(start, end);

  // ✨ [핵심 3] 검색 로직 확인
  // .ilike.%검색어% 형태여야 "포함(Contains)" 검색이 됩니다.
  // 예: "미역국" 검색 -> item_name LIKE '%미역국%' -> "소고기미역국" 검색됨
  if (query) {
    dbQuery = dbQuery.or(`item_name.ilike.%${query}%,item_key.ilike.%${query}%`);
  }

  const { data, count, error } = await dbQuery;

  if (error) {
    console.error("Error fetching items:", error);
    return (
      <div className="p-8 text-center bg-black text-white min-h-screen">
        <h3 className="text-xl font-bold text-red-500 mb-2">데이터 로딩 실패</h3>
        <p className="text-gray-400">{error.message}</p>
      </div>
    );
  }

  const items = data as Item[];

  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return (
    <div className="p-8 space-y-6 bg-black min-h-screen font-[family-name:var(--font-geist-sans)] text-white">
      {/* 헤더 및 검색창 */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold text-white">📦 품목 마스터 (Item Master)</h1>
        <SearchInput />
      </div>

      {/* 테이블 영역 */}
      <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-400">
            <thead className="bg-gray-800 text-gray-200 uppercase border-b border-gray-700">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">품목코드 (Key)</th>
                <th className="px-6 py-4">품목명</th>
                <th className="px-6 py-4 whitespace-nowrap">팀 / 상태</th>
                <th className="px-6 py-4 text-right">단가 (Cost)</th>
                <th className="px-6 py-4 text-center">단위</th>
                <th className="px-6 py-4 text-center">LOT</th>
                <th className="px-6 py-4">비고</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {items.map((item) => (
                <tr key={item.item_key} className="bg-gray-900 hover:bg-gray-800 transition-colors">
                  <td className="px-6 py-4 font-medium text-blue-400 whitespace-nowrap">
                    {item.item_key}
                  </td>
                  <td className="px-6 py-4">
                    {/* 검색어 하이라이트 효과 없이 심플하게 표시 */}
                    <div className="text-white font-medium text-base">{item.item_name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{formatDate(item.created_at)} 등록</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col gap-1.5 items-start">
                       <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded border border-gray-700">
                        {item.use_team}
                      </span>
                      {item.active_flag === 'Y' ? (
                        <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-800">
                          사용중
                        </span>
                      ) : (
                        <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-red-800">
                          중지됨
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-gray-300">
                    ₩{formatMoney(item.unit_cost)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="bg-gray-800 px-2 py-1 rounded text-xs">{item.uom}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {item.lot_required === 'Y' ? (
                        <span className="text-blue-400 text-xs font-bold">● 필수</span>
                    ) : (
                        <span className="text-gray-600 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={item.remark}>
                    {item.remark || '-'}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <p className="text-lg mb-1">데이터가 없습니다.</p>
                    {query && <p className="text-sm">"{query}" 검색 결과가 없습니다.</p>}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PaginationControls 
        totalCount={totalCount}
        pageSize={ITEMS_PER_PAGE} // 10개씩 보여준다는 정보를 전달
      />
    </div>
  );
}