import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import InventorySearchForm from "@/components/InventorySearchForm";
import InventoryListClient from "@/components/InventoryListClient";
import { getAllLocations, getAllItems, extractUniqueZones } from "@/utils/wms";
import { Item } from "@/types";
import { Box, MapPin, Package, ArrowRight, ArrowLeft } from "lucide-react"; 
import Link from "next/link"; 

// 🚀 Next.js 캐싱 방지 (실시간 데이터 중요)
export const dynamic = 'force-dynamic';

// 📦 데이터 타입 정의
export interface InventoryItem {
  id: number;
  location_code: string;
  item_key: string;
  quantity: number;
  lot_no: string;
  exp_date: string;
  status: string;
  updated_at: string;
  inbound_date: string;
  // Join된 데이터는 배열이나 객체 형태로 올 수 있으므로 유연하게 처리
  item_master: {
    item_name: string;
    uom: string;
    item_type?: string;
  } | null;
}

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const supabase = await createClient();
  const params = await searchParams;

  // 🔐 로그인 체크
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  // 📸 QR 스캔 모드 감지 (URL 파라미터 location)
  const qrLocation = params.location ? String(params.location) : null;

  // =========================================================
  // [모드 1] QR 스캔 결과 처리
  // =========================================================
  if (qrLocation) {
    // 1. 해당 위치에 재고가 있는지 확인 (count만 빠르게 조회)
    const { count, error } = await supabase
        .from("inventory") 
        .select('*', { count: 'exact', head: true }) 
        .eq("location_code", qrLocation);

    if (error) {
        return <div className="p-8 text-red-500">데이터 확인 중 오류: {error.message}</div>;
    }

    const hasInventory = count !== null && count > 0;

    // 🚀 [핵심] 재고가 있으면 -> '재고 검색 결과 화면'으로 리다이렉트!
    // 이렇게 하면 사용자는 해당 위치의 재고 목록을 바로 볼 수 있습니다.
    if (hasInventory) {
        redirect(`/inventory?search=true&query=${qrLocation}`);
    }

    // 📦 [Case A] 재고가 없음 -> '빈 로케이션' 안내 및 입고 유도 화면 표시
    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 animate-fade-in pb-24">
            {/* 상단 네비게이션 */}
            <div className="flex items-center gap-4 mb-6">
                <Link href="/dashboard" className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                    <ArrowLeft className="text-gray-400" />
                </Link>
                <div className="flex-1">
                    <h2 className="text-gray-400 text-[10px] md:text-xs uppercase tracking-wider font-bold">QR SCAN RESULT</h2>
                    <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
                        <MapPin className="text-blue-500" size={24} />
                        {qrLocation}
                    </h1>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-800 rounded-2xl bg-gray-900/30">
                <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 relative">
                    <Box size={40} className="text-gray-600 opacity-50 md:w-12 md:h-12" />
                    <div className="absolute bottom-0 right-0 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-500/50">Empty</div>
                </div>
                <h3 className="text-lg md:text-xl font-bold text-gray-300 mb-2">빈 로케이션입니다</h3>
                <p className="text-gray-500 mb-8 text-xs md:text-sm text-center leading-relaxed">
                    현재 <b className="text-blue-400">{qrLocation}</b> 위치에<br/>조회된 재고가 없습니다.
                </p>
                
                <Link 
                    href={`/inbound/direct?loc=${qrLocation}`}
                    className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-lg shadow-blue-900/20 transition-all transform hover:scale-105 active:scale-95"
                >
                    <Package size={20} className="md:w-6 md:h-6" />
                    <span>입고 등록하기</span>
                    <ArrowRight size={18} className="opacity-70 md:w-5 md:h-5" />
                </Link>
            </div>
        </div>
    );
  }

  // =========================================================
  // [모드 2] 일반 재고 조회 모드
  // =========================================================

  // 1. 검색 조건이 없으면 -> '검색 폼' 표시
  if (params.search !== "true") {
    const [locations, items] = await Promise.all([
      getAllLocations(supabase),
      getAllItems(supabase)
    ]);
    const zones = extractUniqueZones(locations);
    
    return <InventorySearchForm zones={zones} items={items as Item[]} />;
  }

  // 2. 검색 조건이 있으면 -> '재고 목록' 조회 및 표시
  const page = params.page ? Number(params.page) : 1;
  const rawQuery = params.query ? String(params.query) : "";
  const query = decodeURIComponent(rawQuery).trim();
  const team = params.team ? String(params.team) : ""; 
  const zonesParam = params.zones ? String(params.zones) : ""; 
  const ITEMS_PER_PAGE = 20; 

  // Supabase Query 빌드 (Join 포함)
  let dbQuery = supabase
    .from("inventory") 
    .select(`
        *,
        item_master!inner (item_name, uom, item_type)
    `)
    .order("location_code", { ascending: true });

  const { data: rawInventory, error: dbError } = await dbQuery;

  if (dbError) {
    return <div className="p-8 text-red-500 font-bold">데이터 로딩 실패: {dbError.message}</div>;
  }

  // 데이터 필터링 (클라이언트 요구사항 반영)
  let filteredInventory = (rawInventory || []) as InventoryItem[];

  if (team === 'PRODUCTION') {
    filteredInventory = filteredInventory.filter(i => !i.location_code.startsWith("2F"));
  } else if (team === 'LOGISTICS') {
    filteredInventory = filteredInventory.filter(i => i.location_code.startsWith("2F"));
  }

  // 검색어 필터링 (다중 키워드 지원)
  if (query) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    filteredInventory = filteredInventory.filter(item => {
      const targetText = `
        ${item.location_code.toLowerCase()} 
        ${item.item_key.toLowerCase()} 
        ${item.item_master?.item_name.toLowerCase() || ""} 
        ${item.lot_no?.toLowerCase() || ""}
        ${item.status.toLowerCase()}
      `;
      return terms.every(term => targetText.includes(term));
    });
  }

  // 페이지네이션 처리
  const totalCount = filteredInventory.length;
  const startIdx = (page - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedInventory = filteredInventory.slice(startIdx, endIdx);

  // 상단 안내 텍스트 생성
  const getConditionText = () => {
    if (query) return `검색어: "${query}"`;
    if (zonesParam) return `구역: [${zonesParam.replaceAll(',', ', ')}]`;
    if (team === 'PRODUCTION') return '[생산팀 관할 구역]';
    if (team === 'LOGISTICS') return '[물류팀 관할 구역]';
    return '[전체 재고]';
  };

  return (
    <InventoryListClient 
        initialInventory={paginatedInventory}
        totalCount={totalCount}
        conditionText={getConditionText()}
        serverQuery={query}
        page={page}
        pageSize={ITEMS_PER_PAGE}
    />
  );
}