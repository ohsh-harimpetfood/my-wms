import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import InventorySearchForm from "@/components/InventorySearchForm";
import InventoryListClient from "@/components/InventoryListClient";
import { getAllLocations, getAllItems, extractUniqueZones } from "@/utils/wms";
import { Item } from "@/types";
import { Box, MapPin, Package, ArrowRight, ArrowLeft } from "lucide-react"; 
import Link from "next/link"; 

// 페이지 캐싱 방지
export const dynamic = 'force-dynamic';

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

  // 1. 🔐 사용자 세션 및 권한 체크
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect("/login");
  }

  // 📸 QR 스캔 모드 감지
  const qrLocation = params.location ? String(params.location) : null;

  // =========================================================
  // [모드 1] QR 스캔 결과 뷰 (Location View)
  // =========================================================
  if (qrLocation) {
    // 🚀 [수정] stock_quant -> inventory 로 원상 복구
    const { data: qrInventory, error: qrError } = await supabase
        .from("inventory") 
        .select(`
            *,
            item_master!inner (item_name, uom)
        `)
        .eq("location_code", qrLocation);

    if (qrError) {
        return <div className="p-8 text-red-500">데이터 로딩 실패: {qrError.message}</div>;
    }

    const items = (qrInventory || []) as InventoryItem[];
    const isEmpty = items.length === 0;

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

            {/* 📦 [Case A] 빈 랙일 경우 -> 입고 유도 */}
            {isEmpty ? (
                <div className="flex flex-col items-center justify-center py-16 border border-dashed border-gray-800 rounded-2xl bg-gray-900/30">
                    <div className="w-20 h-20 md:w-24 md:h-24 bg-gray-800 rounded-full flex items-center justify-center mb-6 relative">
                        <Box size={40} className="text-gray-600 opacity-50 md:w-12 md:h-12" />
                        <div className="absolute bottom-0 right-0 bg-yellow-500/20 text-yellow-500 text-[10px] font-bold px-2 py-0.5 rounded-full border border-yellow-500/50">Empty</div>
                    </div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-300 mb-2">빈 로케이션입니다</h3>
                    <p className="text-gray-500 mb-8 text-xs md:text-sm text-center leading-relaxed">
                        현재 <b className="text-blue-400">{qrLocation}</b> 위치에<br/>조회된 재고가 없습니다.
                    </p>
                    
                    {/* 🚀 입고 등록 버튼 */}
                    <Link 
                        href={`/inbound/direct?loc=${qrLocation}`}
                        className="flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 md:px-8 md:py-4 rounded-xl font-bold text-base md:text-lg shadow-lg shadow-blue-900/20 transition-all transform hover:scale-105 active:scale-95"
                    >
                        <Package size={20} className="md:w-6 md:h-6" />
                        <span>입고 등록하기</span>
                        <ArrowRight size={18} className="opacity-70 md:w-5 md:h-5" />
                    </Link>
                </div>
            ) : (
                // 📦 [Case B] 재고가 있는 경우 -> 리스트 출력
                <div className="space-y-3 md:space-y-4">
                    <div className="text-xs md:text-sm text-gray-400 mb-2 flex justify-between items-center">
                        <span>총 <b className="text-white">{items.length}</b>건의 재고가 있습니다.</span>
                    </div>
                    
                    {items.map((item) => (
                        <div key={item.id} className="bg-gray-900 border border-gray-800 p-4 md:p-5 rounded-xl flex justify-between items-center shadow-lg relative overflow-hidden group hover:border-blue-500/50 transition-colors">
                            {/* 좌측 컬러바 */}
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 group-hover:bg-blue-400 transition-colors"></div>
                            
                            <div className="pl-2 overflow-hidden">
                                <div className="text-base md:text-lg font-bold text-white mb-1 truncate">{item.item_master?.item_name}</div>
                                <div className="text-xs text-gray-500 font-mono flex gap-2 items-center">
                                    <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 border border-gray-700">{item.item_key}</span>
                                    {item.lot_no && item.lot_no !== 'DEFAULT' && <span className="text-gray-500">LOT: {item.lot_no}</span>}
                                </div>
                            </div>
                            <div className="text-right shrink-0 ml-4">
                                <div className="text-xl md:text-2xl font-bold text-blue-400 font-mono">{item.quantity.toLocaleString()}</div>
                                <div className="text-[10px] md:text-xs text-gray-600 font-bold mt-0.5">{item.item_master?.uom || "EA"}</div>
                            </div>
                        </div>
                    ))}
                    
                    {/* 추가 입고 버튼 */}
                    <div className="mt-8 pt-4 border-t border-gray-800 flex justify-center">
                         <Link 
                            href={`/inbound/direct?loc=${qrLocation}`}
                            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-5 py-2.5 rounded-lg font-bold text-xs md:text-sm border border-gray-700 transition-all hover:text-white"
                        >
                            <Package size={16} />
                            이 위치에 추가 입고하기
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
  }

  // =========================================================
  // [모드 2] 일반 검색 모드 (기존 로직 유지)
  // =========================================================

  if (params.search !== "true") {
    const [locations, items] = await Promise.all([
      getAllLocations(supabase),
      getAllItems(supabase)
    ]);
    const zones = extractUniqueZones(locations);
    
    return <InventorySearchForm zones={zones} items={items as Item[]} />;
  }

  const page = params.page ? Number(params.page) : 1;
  const rawQuery = params.query ? String(params.query) : "";
  const query = decodeURIComponent(rawQuery).trim();
  const team = params.team ? String(params.team) : ""; 
  const zonesParam = params.zones ? String(params.zones) : ""; 
  const ITEMS_PER_PAGE = 20; 

  // 🚀 [수정] stock_quant -> inventory 로 원상 복구
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

  let filteredInventory = (rawInventory || []) as InventoryItem[];

  if (team === 'PRODUCTION') {
    filteredInventory = filteredInventory.filter(i => !i.location_code.startsWith("2F"));
  } else if (team === 'LOGISTICS') {
    filteredInventory = filteredInventory.filter(i => i.location_code.startsWith("2F"));
  }

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

  const totalCount = filteredInventory.length;
  const startIdx = (page - 1) * ITEMS_PER_PAGE;
  const endIdx = startIdx + ITEMS_PER_PAGE;
  const paginatedInventory = filteredInventory.slice(startIdx, endIdx);

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