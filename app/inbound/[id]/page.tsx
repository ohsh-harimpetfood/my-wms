// app/inbound/[id]/page.tsx
"use client";

import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Search, X } from "lucide-react"; // 아이콘 추가
import { InboundMaster, InboundDetail, Item } from "@/types";

// DB에서 가져올 데이터 타입 정의
interface InboundDetailWithItem extends InboundDetail {
  item_master: Item;
}

export default function InboundWorkPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();

  const [master, setMaster] = useState<InboundMaster | null>(null);
  const [details, setDetails] = useState<InboundDetailWithItem[]>([]);
  const [loading, setLoading] = useState(true);

  // 작업 입력 상태
  const [selectedDetail, setSelectedDetail] = useState<InboundDetailWithItem | null>(null);
  const [locationCode, setLocationCode] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [inputQty, setInputQty] = useState("");
  const [expDate, setExpDate] = useState("");
  const [processing, setProcessing] = useState(false);

  // ✨ 팝업 상태 추가
  const [showLocModal, setShowLocModal] = useState(false);

  // 1. 데이터 불러오기
  const fetchData = async () => {
    // 마스터 정보
    const { data: masterData } = await supabase
      .from("inbound_master")
      .select("*")
      .eq("inbound_no", id)
      .single();
    
    // 상세 정보
    const { data: detailData } = await supabase
      .from("inbound_detail")
      .select(`*, item_master (*)`)
      .eq("inbound_no", id)
      .order("item_key");

    if (masterData) setMaster(masterData as InboundMaster);
    if (detailData) setDetails(detailData as any[]);
    setLoading(false);
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  // 2. 품목 선택 핸들러
  const handleSelect = (detail: InboundDetailWithItem) => {
    if (detail.status === 'COMPLETED') return;
    setSelectedDetail(detail);
    
    // 초기값 세팅
    const remainQty = detail.plan_qty - detail.received_qty;
    setInputQty(String(remainQty > 0 ? remainQty : 0));
    setLotNo(detail.item_master.lot_required === 'Y' ? '' : 'DEFAULT');
    setLocationCode(""); 
  };

  // 3. 입고 실행 (사용자님의 로직 유지)
  const handleConfirm = async () => {
    if (!selectedDetail || !locationCode || !inputQty) {
      alert("위치와 수량은 필수입니다.");
      return;
    }

    setProcessing(true);
    try {
      const qtyNum = Number(inputQty);
      const newReceivedQty = Number(selectedDetail.received_qty) + qtyNum;

      // A. 재고(Inventory) 등록
      const { data: existInven } = await supabase
        .from("inventory")
        .select("id, quantity")
        .eq("location_code", locationCode)
        .eq("item_key", selectedDetail.item_key)
        .eq("lot_no", lotNo || 'DEFAULT')
        .single();

      if (existInven) {
        await supabase.from("inventory").update({
          quantity: existInven.quantity + qtyNum,
          updated_at: new Date().toISOString()
        }).eq("id", existInven.id);
      } else {
        await supabase.from("inventory").insert({
          location_code: locationCode,
          item_key: selectedDetail.item_key,
          quantity: qtyNum,
          lot_no: lotNo || 'DEFAULT',
          exp_date: expDate || null,
          status: 'AVAILABLE'
        });
      }

      // B. 입고 상세 업데이트
      const newDetailStatus = newReceivedQty >= selectedDetail.plan_qty ? 'COMPLETED' : 'PENDING';
      
      await supabase.from("inbound_detail").update({
        received_qty: newReceivedQty,
        status: newDetailStatus
      }).eq("id", selectedDetail.id);

      // C. 수불 이력
      await supabase.from("stock_tx").insert({
        transaction_type: 'INBOUND',
        location_code: locationCode,
        item_key: selectedDetail.item_key,
        quantity: qtyNum,
        lot_no: lotNo || 'DEFAULT',
        ref_doc_no: String(id),
        io_type: 'IN',
        remark: `입고작업: ${master?.supplier_name}`
      });

      // D. 마스터 상태 업데이트 (사용자님 로직 반영)
      const { data: allDetails } = await supabase
        .from("inbound_detail")
        .select("id, status")
        .eq("inbound_no", id);
      
      if (allDetails) {
        const isAllCompleted = allDetails.every(detail => {
          if (detail.id === selectedDetail.id) return newDetailStatus === 'COMPLETED';
          return detail.status === 'COMPLETED';
        });

        if (isAllCompleted) {
            await supabase.from("inbound_master").update({ status: 'CLOSED' }).eq("inbound_no", id);
        } else {
            await supabase.from("inbound_master").update({ status: 'PARTIAL' }).eq("inbound_no", id);
        }
      }

      alert("입고 처리되었습니다.");
      setSelectedDetail(null);
      fetchData();

    } catch (e: any) {
      console.error(e);
      alert("처리 중 오류 발생: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-8 text-white">데이터 로딩 중...</div>;
  if (!master) return <div className="p-8 text-white">존재하지 않는 입고 번호입니다.</div>;

  return (
    <div className="p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)]">
      
      {/* 상단 헤더 */}
      <div className="flex justify-between items-start mb-6 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white">← 뒤로</button>
            <h1 className="text-2xl font-bold">🚛 입고 작업 (Work)</h1>
          </div>
          <div className="mt-2 text-gray-400">
            번호: <span className="text-blue-400 font-mono mr-4">{master.inbound_no}</span>
            공급처: <span className="text-white mr-4">{master.supplier_name}</span>
            예정일: <span className="text-white">{master.plan_date}</span>
          </div>
        </div>
        <div className="text-right">
            <div className={`px-3 py-1 rounded text-sm font-bold border ${
                master.status === 'CLOSED' ? 'bg-green-900/50 text-green-400 border-green-800' : 
                master.status === 'PARTIAL' ? 'bg-blue-900/50 text-blue-400 border-blue-800' :
                'bg-yellow-900/50 text-yellow-400 border-yellow-800'
            }`}>
                {master.status}
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. 좌측: 리스트 */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-bold mb-2">📥 입고 예정 품목</h2>
          {details.map((row) => {
            const progress = Math.min(100, (row.received_qty / row.plan_qty) * 100);
            const isCompleted = row.status === 'COMPLETED';
            const isSelected = selectedDetail?.id === row.id;

            return (
              <div 
                key={row.id}
                onClick={() => handleSelect(row)}
                className={`p-4 rounded-lg border cursor-pointer transition relative overflow-hidden
                  ${isCompleted ? 'bg-gray-900 border-gray-800 opacity-60' : 
                    isSelected ? 'bg-blue-900/20 border-blue-500' : 'bg-gray-900 border-gray-700 hover:border-gray-500'}
                `}
              >
                <div className="flex justify-between items-center z-10 relative">
                  <div>
                    <div className="text-lg font-bold text-white">{row.item_master.item_name}</div>
                    <div className="text-sm text-gray-500">
                        {row.item_key} | {row.item_master.uom} | 
                        {row.item_master.lot_required === 'Y' ? <span className="text-red-400 ml-1">LOT 필수</span> : ' LOT 무관'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                        <span className={isCompleted ? "text-green-500" : "text-white"}>{row.received_qty}</span>
                        <span className="text-gray-500 text-lg"> / {row.plan_qty}</span>
                    </div>
                    <div className="text-xs text-gray-400">{isCompleted ? '완료됨' : '진행중'}</div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-green-500 transition-all duration-500" style={{ width: `${progress}%` }}></div>
              </div>
            );
          })}
        </div>

        {/* 2. 우측: 작업 입력 폼 */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg h-fit sticky top-6">
          <h2 className="text-lg font-bold mb-4">✍️ 실적 등록</h2>
          
          {!selectedDetail ? (
            <div className="text-gray-500 text-center py-10">좌측 목록에서<br/>입고할 품목을 선택해주세요.</div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-black rounded border border-gray-800">
                <div className="text-sm text-gray-500">선택된 품목</div>
                <div className="font-bold text-lg text-blue-400">{selectedDetail.item_master.item_name}</div>
              </div>

              {/* ✨ 위치 입력 (팝업 트리거 적용) */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">위치 (Location)</label>
                <div 
                    className="flex items-center bg-black border border-blue-500 rounded p-3 cursor-pointer hover:bg-gray-800 transition group"
                    onClick={() => setShowLocModal(true)}
                >
                    <Search className="text-gray-500 mr-2 group-hover:text-blue-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="터치하여 위치 선택"
                        readOnly // 키보드 안 올라오게 설정
                        className="bg-transparent outline-none text-white font-mono text-lg w-full cursor-pointer"
                        value={locationCode}
                    />
                </div>
              </div>

              {selectedDetail.item_master.lot_required === 'Y' && (
                <>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">LOT 번호</label>
                        <input type="text" placeholder="LOT 번호 스캔" className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none" value={lotNo} onChange={(e) => setLotNo(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">유통기한</label>
                        <input type="date" className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none" value={expDate} onChange={(e) => setExpDate(e.target.value)} />
                    </div>
                </>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1">입고 수량</label>
                <input type="number" className="w-full bg-black border border-gray-700 rounded p-3 text-white focus:border-blue-500 outline-none text-xl font-bold text-right" value={inputQty} onChange={(e) => setInputQty(e.target.value)} />
              </div>

              <button onClick={handleConfirm} disabled={processing} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg mt-4 transition disabled:opacity-50">
                {processing ? "처리 중..." : "입고 확정 (SAVE)"}
              </button>
              
              <button onClick={() => setSelectedDetail(null)} className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 py-3 rounded-lg mt-2 transition">
                취소
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ✨ 팝업 컴포넌트 렌더링 */}
      {showLocModal && (
        <LocationSelectorModal 
            onClose={() => setShowLocModal(false)}
            onSelect={(locId) => {
                setLocationCode(locId);
                setShowLocModal(false);
            }}
        />
      )}

    </div>
  );
}

// -------------------------------------------------------------
// ✨ 위치 선택 팝업 컴포넌트 (이전 코드 재활용)
// -------------------------------------------------------------
function LocationSelectorModal({ onClose, onSelect }: { onClose: () => void, onSelect: (id: string) => void }) {
    const supabase = createClient();
    const [locations, setLocations] = useState<any[]>([]);
    const [activeZone, setActiveZone] = useState<string>("");
    const [uniqueZones, setUniqueZones] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLocs = async () => {
            const { data } = await supabase.from("loc_master").select("*").eq("active_flag", "Y").order("loc_id");
            if (data) {
                setLocations(data);
                const zones = Array.from(new Set(data.map((l:any) => l.zone))).sort() as string[];
                setUniqueZones(zones);
                if(zones.length > 0) setActiveZone(zones[0]);
            }
            setLoading(false);
        };
        fetchLocs();
    }, []);

    const filteredLocs = locations.filter((l:any) => l.zone === activeZone);
    const rackKeys = Array.from(new Set(filteredLocs.map((l:any) => l.rack_no))).sort();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-center p-5 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white">📍 입고 위치 선택</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full"><X /></button>
                </div>
                <div className="flex gap-2 px-5 pt-5 border-b border-gray-800 overflow-x-auto">
                    {uniqueZones.map(zone => (
                        <button key={zone} onClick={() => setActiveZone(zone)} className={`px-4 py-3 text-sm font-bold rounded-t-lg whitespace-nowrap ${activeZone === zone ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                            {zone} 구역
                        </button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto p-5 bg-black/30">
                    {loading ? <div className="text-center py-10">로딩 중...</div> : (
                        <div className="space-y-6">
                            {rackKeys.map((rack: any) => (
                                <div key={rack} className="bg-black border border-gray-800 rounded-lg p-4">
                                    <h3 className="text-lg font-bold text-gray-400 mb-3 border-b border-gray-800 pb-2">Rack {rack}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {filteredLocs.filter((l:any) => l.rack_no === rack).map((loc:any) => (
                                            <button key={loc.loc_id} onClick={() => onSelect(loc.loc_id)} className="px-3 py-2 bg-gray-900 border border-gray-700 rounded hover:bg-blue-600 hover:border-blue-400 hover:text-white transition text-sm text-blue-400 font-bold min-w-[80px]">
                                                {loc.loc_id}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}