// app/inventory/page.tsx
import { createClient } from "@/utils/supabase/server";
import PaginationControls from "@/components/PaginationControls";
import SearchInput from "@/components/SearchInput";
import Link from "next/link"; 
import { LogOut, ArrowRightLeft } from "lucide-react"; // ✨ 아이콘 추가

export const dynamic = 'force-dynamic';

interface InventoryItem {
  id: number;
  location_code: string;
  item_key: string;
  quantity: number;
  lot_no: string;
  exp_date: string;
  status: string;
  item_master: {
    item_name: string;
    uom: string;
  } | null;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const page = params.page ? Number(params.page) : 1;
  const rawQuery = params.query ? String(params.query) : "";
  const query = decodeURIComponent(rawQuery).trim();
  const selectedZone = params.zone ? String(params.zone) : ""; 

  const ITEMS_PER_PAGE = 10;
  const start = (page - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE - 1;

  // 1. Zone 목록
  const { data: zoneData } = await supabase.from('loc_master').select('zone').eq('active_flag', 'Y');
  const zones = Array.from(new Set(zoneData?.map((z: any) => z.zone))).sort();

  // 2. 검색 대상 위치 ID
  let targetLocationIds: string[] | null = null;
  if (selectedZone) {
    const { data: locs } = await supabase.from('loc_master').select('loc_id').eq('zone', selectedZone);
    if (locs) targetLocationIds = locs.map(l => l.loc_id);
  }

  // 3. 재고 쿼리
  let dbQuery = supabase
    .from("inventory")
    .select(`*, item_master (item_name, uom)`, { count: "exact" })
    .order("location_code", { ascending: true })
    .order("item_key", { ascending: true })
    .range(start, end);

  if (selectedZone && targetLocationIds) {
    if (targetLocationIds.length > 0) dbQuery = dbQuery.in('location_code', targetLocationIds);
    else dbQuery = dbQuery.eq('id', -1);
  }

  if (query) {
    dbQuery = dbQuery.or(`location_code.ilike.%${query}%,item_key.ilike.%${query}%`);
  }

  const { data, count, error } = await dbQuery;

  if (error) return <div className="p-8 text-white">에러: {error.message}</div>;

  const inventory = data as unknown as InventoryItem[];
  const totalCount = count ?? 0;

  const getZoneFromCode = (code: string) => {
    if (code.startsWith("2F")) return "2F";
    if (code.startsWith("M")) return "M";
    return "";
  };

  const TABLE_HEADERS = [
    { label: "위치", align: "text-left" },
    { label: "제품 정보", align: "text-left" },
    { label: "LOT / 유통기한", align: "text-left" },
    { label: "수량", align: "text-right" },
    { label: "상태", align: "text-center" },
    { label: "관리", align: "text-center" },
  ];

  return (
    <div className="p-8 space-y-6 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)]">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-2xl font-bold">📊 재고 현황 (Inventory)</h1>
           <p className="text-gray-400 text-sm mt-1">구역별 재고를 조회하고 관리합니다.</p>
        </div>
        <SearchInput />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-1">
        <Link href="/inventory" className={`px-6 py-3 text-sm font-bold rounded-t-lg transition-colors ${!selectedZone ? "bg-blue-600 text-white border-b-2 border-blue-400" : "bg-gray-900 text-gray-400 hover:bg-gray-800"}`}>ALL</Link>
        {zones.map((zone: any) => (
           <Link key={zone} href={`/inventory?zone=${zone}`} className={`px-6 py-3 text-sm font-bold rounded-t-lg transition-colors ${selectedZone === zone ? "bg-blue-600 text-white border-b-2 border-blue-400" : "bg-gray-900 text-gray-400 hover:bg-gray-800"}`}>
             {zone === 'M' ? '🏭 생산팀 (M존)' : zone === '2F' ? '🚛 물류팀 (2F)' : `${zone} 구역`}
           </Link>
        ))}
      </div>

      <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900 shadow-sm rounded-tl-none">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="bg-gray-800 text-gray-200 uppercase border-b border-gray-700">
            <tr>
              {TABLE_HEADERS.map((header, idx) => (
                <th key={idx} className={`px-6 py-3 font-medium align-middle ${header.align}`}>
                  {header.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {inventory?.map((item) => {
              const targetZone = getZoneFromCode(item.location_code);
              const mapLink = targetZone ? `/location?zone=${targetZone}` : '/location';
              
              // 링크 생성
              const outboundLink = `/outbound/new?loc=${item.location_code}&item=${item.item_key}&lot=${item.lot_no}&qty=${item.quantity}`;
              const moveLink = `/inventory/move?id=${item.id}&loc=${item.location_code}&item=${item.item_key}&lot=${item.lot_no}&qty=${item.quantity}`; // ✨ 이동 링크

              return (
                <tr key={item.id} className="bg-gray-900 hover:bg-gray-800 transition-colors h-[60px]">
                  <td className="px-6 py-3 align-middle whitespace-nowrap">
                    <Link href={mapLink} title="클릭하여 맵에서 위치 확인">
                        <span className="bg-blue-900/50 text-blue-200 px-2.5 py-1 rounded text-sm font-bold border border-blue-800 cursor-pointer hover:bg-blue-800 hover:text-white transition shadow-sm inline-block">
                        {item.location_code}
                        </span>
                    </Link>
                  </td>

                  <td className="px-6 py-3 align-middle">
                    <div className="font-medium text-white text-base">{item.item_master?.item_name || "이름 없음"}</div>
                    <div className="text-xs text-gray-500 font-mono mt-0.5">{item.item_key}</div>
                  </td>

                  <td className="px-6 py-3 align-middle whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {item.lot_no && item.lot_no !== 'DEFAULT' ? <span className="text-gray-300 font-mono text-[11px] bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 w-fit">LOT: {item.lot_no}</span> : <span className="text-gray-600 text-xs">-</span>}
                      {item.exp_date && <span className="text-gray-500 text-[11px]">EXP: {item.exp_date}</span>}
                    </div>
                  </td>

                  <td className="px-6 py-3 text-right align-middle whitespace-nowrap">
                    <span className="text-lg font-bold text-white tracking-tight">{item.quantity.toLocaleString()}</span>
                    <span className="text-xs text-gray-500 ml-1 font-normal">{item.item_master?.uom || "EA"}</span>
                  </td>

                  <td className="px-6 py-3 text-center align-middle whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${item.status === 'AVAILABLE' || item.status === '정상' ? "bg-green-900/20 text-green-400 border-green-800/50" : "bg-red-900/20 text-red-400 border-red-800/50"}`}>
                      {item.status === 'AVAILABLE' ? '정상' : item.status}
                    </span>
                  </td>

                  {/* ✨ 관리 컬럼 (이동 / 출고 버튼) */}
                  <td className="px-6 text-center align-middle whitespace-nowrap">
                    <div className="flex items-center justify-center gap-2">
                        {/* 이동 버튼 (파랑) */}
                        <Link 
                            href={moveLink}
                            className="group inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-blue-400 transition-colors px-2 py-1 rounded hover:bg-blue-900/20"
                            title="재고 이동"
                        >
                            <ArrowRightLeft size={14} className="group-hover:text-blue-500 transition-colors" />
                            <span>이동</span>
                        </Link>

                        {/* 구분선 */}
                        <div className="w-[1px] h-3 bg-gray-700"></div>

                        {/* 출고 버튼 (빨강) */}
                        <Link 
                            href={outboundLink}
                            className="group inline-flex items-center gap-1 text-xs font-bold text-gray-400 hover:text-red-400 transition-colors px-2 py-1 rounded hover:bg-red-900/20"
                            title="출고 등록"
                        >
                            <LogOut size={14} className="group-hover:text-red-500 transition-colors" />
                            <span>출고</span>
                        </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {inventory?.length === 0 && (
              <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-500 align-middle">데이터가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls totalCount={totalCount} pageSize={ITEMS_PER_PAGE} />
    </div>
  );
}