"use client";

import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Search, Check, Calendar, Hash, Package, AlertCircle } from "lucide-react"; 
import { InboundDetail, Item } from "@/types";
import LocationSelectorModal from "@/components/LocationSelectorModal";
import { TX_TYPES, TxCode } from "@/constants/transaction";
import { useAuth } from "@/context/AuthProvider";
import { useUI } from "@/context/UIProvider"; // 🚀 UIProvider

// InboundMaster 타입
interface InboundMaster {
  inbound_no: string;
  inbound_type: TxCode;
  supplier_name: string;
  plan_date: string;
  status: string;
  remark: string;
}

// Item 인터페이스 (로컬 확장 - 필요 시 types/index.ts와 동기화)
interface ExtendedItem extends Item {
  item_type?: string; // 부자재 식별용
}

interface InboundDetailWithItem extends InboundDetail {
  item_master: ExtendedItem;
}

export default function InboundWorkPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const { toast, confirm } = useUI(); // 🚀 Toast & Confirm

  const SUB_MATERIAL_TYPE = '부자재'; // 🚀 부자재 식별 키

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
  const [showLocModal, setShowLocModal] = useState(false);

  // 1. 데이터 불러오기
  const fetchData = async () => {
    const { data: masterData } = await supabase.from("inbound_master").select("*").eq("inbound_no", id).single();
    const { data: detailData } = await supabase.from("inbound_detail").select(`*, item_master (*)`).eq("inbound_no", id).order("item_key");

    if (masterData) setMaster(masterData as InboundMaster);
    if (detailData) setDetails(detailData as any[]);
    setLoading(false);
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  // 2. 품목 선택 핸들러 (부자재 로직 포함)
  const handleSelect = (detail: InboundDetailWithItem) => {
    if (detail.status === 'COMPLETED') {
        toast.info("이미 완료된 항목입니다.");
        return;
    }
    setSelectedDetail(detail);
    
    // 남은 수량 계산
    const remainQty = detail.plan_qty - detail.received_qty;
    setInputQty(String(remainQty > 0 ? remainQty : 0));
    setLocationCode(""); 

    // 🚀 부자재 또는 LOT 관리 안함 품목 처리
    const isSub = detail.item_master.item_type === SUB_MATERIAL_TYPE || detail.item_master.lot_required === 'N';
    if (isSub) {
        setLotNo('N/A');
        setExpDate('');
    } else {
        setLotNo('');
        setExpDate('');
    }
  };

  // 🛡️ 수량 입력 핸들러 (음수 방지)
  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const sanitized = val.replace(/[^0-9]/g, '');
    setInputQty(sanitized);
  };

  // 3. 입고 실행
  const handleConfirm = async () => {
    if (!user) return toast.error("로그인 정보가 없습니다.");
    if (!selectedDetail) return toast.error("작업할 품목을 선택해주세요.");
    if (!locationCode) return toast.error("적치할 위치를 입력해주세요.");
    
    const qtyNum = Number(inputQty);
    if (!qtyNum || qtyNum <= 0) return toast.error("유효한 수량을 입력해주세요.");

    // 🚀 과납(Over-receiving) 경고
    const currentReceived = selectedDetail.received_qty;
    if (currentReceived + qtyNum > selectedDetail.plan_qty) {
        const proceed = await confirm(
            `[주의: 초과 입고]\n계획 수량보다 많이 입고됩니다.\n(계획: ${selectedDetail.plan_qty} / 현재: ${currentReceived} / 추가: ${qtyNum})\n\n계속 진행하시겠습니까?`,
            "warning"
        );
        if (!proceed) return;
    }

    // 🚀 필수값 검증 (부자재 로직)
    const isSub = selectedDetail.item_master.item_type === SUB_MATERIAL_TYPE || selectedDetail.item_master.lot_required === 'N';
    if (!isSub) {
        if (!lotNo) return toast.warning("LOT 번호를 입력해주세요.");
        if (!expDate) return toast.warning("유통기한을 입력해주세요.");
    }

    // 🚀 최종 확인
    const ok = await confirm(
        `[입고 확정]\n품목: ${selectedDetail.item_master.item_name}\n수량: ${qtyNum}\n위치: ${locationCode}\n\n저장하시겠습니까?`, 
        "info"
    );
    if (!ok) return;

    setProcessing(true);
    try {
      const newReceivedQty = Number(selectedDetail.received_qty) + qtyNum;

      // A. 재고(Inventory) 등록 (UPSERT)
      const { data: existInven } = await supabase.from("inventory").select("id, quantity")
        .eq("location_code", locationCode)
        .eq("item_key", selectedDetail.item_key)
        .eq("lot_no", lotNo || 'DEFAULT')
        .maybeSingle();

      if (existInven) {
        await supabase.from("inventory").update({
          quantity: existInven.quantity + qtyNum, 
          updated_at: new Date().toISOString(),
          updated_by: user.id 
        }).eq("id", existInven.id);
      } else {
        // 위치 유효성 체크
        const { data: validLoc } = await supabase.from("loc_master").select("loc_id").eq("loc_id", locationCode).single();
        if(!validLoc) throw new Error(`존재하지 않는 위치 코드입니다: ${locationCode}`);

        await supabase.from("inventory").insert({
          location_code: locationCode, 
          item_key: selectedDetail.item_key, 
          quantity: qtyNum,
          lot_no: lotNo || 'DEFAULT', 
          exp_date: expDate || null, 
          status: 'AVAILABLE',
          updated_by: user.id 
        });
      }

      // B. 입고 상세 업데이트
      const newDetailStatus = newReceivedQty >= selectedDetail.plan_qty ? 'COMPLETED' : 'PENDING';
      await supabase.from("inbound_detail").update({ received_qty: newReceivedQty, status: newDetailStatus }).eq("id", selectedDetail.id);

      // C. 수불 이력
      await supabase.from("stock_tx").insert({
        transaction_type: 'INBOUND',
        io_type: 'IN',
        tx_code: master?.inbound_type || 'IN_ETC',
        location_code: locationCode,
        item_key: selectedDetail.item_key,
        quantity: qtyNum,
        lot_no: lotNo || 'DEFAULT',
        ref_doc_no: String(id),
        remark: `입고작업: ${master?.supplier_name}`,
        created_by: user.id
      });

      // D. 마스터 상태 업데이트
      const { data: allDetails } = await supabase.from("inbound_detail").select("id, status").eq("inbound_no", id);
      if (allDetails) {
        // 현재 작업 중인 건의 상태를 수동으로 반영하여 전체 완료 여부 판단
        const updatedDetails = allDetails.map(d => d.id === selectedDetail.id ? { ...d, status: newDetailStatus } : d);
        const isAllCompleted = updatedDetails.every(detail => detail.status === 'COMPLETED');
        
        await supabase.from("inbound_master").update({ status: isAllCompleted ? 'CLOSED' : 'PARTIAL' }).eq("inbound_no", id);
      }

      toast.success("성공적으로 입고되었습니다.");
      setSelectedDetail(null);
      fetchData(); // 데이터 갱신

    } catch (e: any) {
      console.error(e);
      toast.error("오류 발생: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-black text-white">데이터 로딩 중...</div>;
  if (!master) return <div className="p-8 text-white">존재하지 않는 입고 번호입니다.</div>;

  const isSubMaterial = selectedDetail?.item_master.item_type === SUB_MATERIAL_TYPE || selectedDetail?.item_master.lot_required === 'N';

  return (
    <div className="p-4 md:p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)] pb-32">
      
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-800 pb-4 gap-4 sticky top-0 bg-black/90 backdrop-blur-sm z-30 pt-4">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"><ArrowLeft /></button>
            <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                🚛 입고 작업 <span className="text-gray-500 text-lg font-normal hidden md:inline">| {master.inbound_no}</span>
            </h1>
          </div>
          <div className="mt-2 text-gray-400 flex items-center gap-3 text-sm ml-2">
             {master && TX_TYPES[master.inbound_type] && (
                <span className={`px-2 py-0.5 rounded border bg-gray-900 border-gray-700 text-gray-300`}>
                    {TX_TYPES[master.inbound_type].label}
                </span>
             )}
            <span className="text-blue-400 font-bold">{master.supplier_name}</span>
          </div>
        </div>
        <div className="self-end md:self-auto">
            <div className={`px-4 py-2 rounded-lg text-sm font-bold border ${
                master.status === 'CLOSED' ? 'bg-green-900/30 text-green-400 border-green-800' : 
                master.status === 'PARTIAL' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                'bg-yellow-900/30 text-yellow-400 border-yellow-800'
            }`}>
                {master.status}
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* 좌측: 입고 예정 목록 */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-lg font-bold mb-2 flex items-center gap-2"><Check className="text-green-500" size={20}/> 작업 대상 목록</h2>
          {details.map((row) => {
            const progress = Math.min(100, (row.received_qty / row.plan_qty) * 100);
            const isCompleted = row.status === 'COMPLETED';
            const isSelected = selectedDetail?.id === row.id;

            return (
              <div 
                key={row.id}
                onClick={() => handleSelect(row)}
                className={`p-4 rounded-xl border cursor-pointer transition relative overflow-hidden group
                  ${isCompleted ? 'bg-gray-900/50 border-gray-800 opacity-60' : 
                    isSelected ? 'bg-blue-900/20 border-blue-500 ring-1 ring-blue-500' : 'bg-gray-900 border-gray-700 hover:border-gray-500 hover:bg-gray-800'}
                `}
              >
                <div className="flex justify-between items-center z-10 relative">
                  <div>
                    <div className="text-lg font-bold text-white flex items-center gap-2">
                        {row.item_master.item_name}
                        {row.item_master.item_type === SUB_MATERIAL_TYPE && <span className="text-[10px] bg-gray-700 px-1.5 py-0.5 rounded text-gray-300">부자재</span>}
                    </div>
                    <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                        <span className="bg-gray-800 px-1.5 rounded">{row.item_key}</span>
                        <span>{row.item_master.uom}</span>
                        {row.item_master.lot_required === 'Y' && row.item_master.item_type !== SUB_MATERIAL_TYPE && <span className="text-red-400 text-xs border border-red-900 px-1 rounded">LOT 필수</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                        <span className={isCompleted ? "text-green-500" : "text-white"}>{row.received_qty}</span>
                        <span className="text-gray-600 text-lg"> / {row.plan_qty}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{isCompleted ? '완료됨' : `${row.plan_qty - row.received_qty}개 남음`}</div>
                  </div>
                </div>
                {/* 프로그레스 바 */}
                <div className="absolute bottom-0 left-0 h-1.5 bg-gray-800 w-full">
                    <div className={`h-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* 우측: 작업 입력 폼 (모바일에서는 하단 배치 가능하도록 구조 고려) */}
        <div className="lg:sticky lg:top-24 h-fit">
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl shadow-xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">✍️ 실적 등록</h2>
            
            {!selectedDetail ? (
              <div className="text-gray-500 text-center py-10 flex flex-col items-center justify-center border-2 border-dashed border-gray-800 rounded-xl">
                <Package size={48} className="mb-4 opacity-20"/>
                <p>좌측 목록에서<br/>작업할 품목을 선택해주세요.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                {/* 선택된 품목 정보 */}
                <div className="p-4 bg-black rounded-lg border border-gray-800 shadow-inner">
                  <div className="text-xs text-gray-500 mb-1">선택된 품목</div>
                  <div className="font-bold text-xl text-blue-400">{selectedDetail.item_master.item_name}</div>
                  <div className="flex justify-between mt-2 text-sm text-gray-400 border-t border-gray-800 pt-2">
                    <span>잔여 수량</span>
                    <span className="text-white font-bold">{selectedDetail.plan_qty - selectedDetail.received_qty} {selectedDetail.item_master.uom}</span>
                  </div>
                </div>

                {/* 입력 폼 */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-bold">위치 (Location)</label>
                  <div 
                      className="flex items-center bg-black border border-blue-500 rounded-lg p-1 cursor-pointer hover:bg-gray-800 transition group h-14"
                      onClick={() => setShowLocModal(true)}
                  >
                      <div className="pl-4 pr-2 text-gray-500 group-hover:text-blue-400"><Search size={20} /></div>
                      <input 
                          type="text" 
                          placeholder="터치하여 선택"
                          className="bg-transparent outline-none text-white font-mono text-xl w-full cursor-pointer placeholder-gray-600 uppercase h-full"
                          value={locationCode}
                          onChange={(e) => setLocationCode(e.target.value.toUpperCase())}
                      />
                  </div>
                </div>

                <div className={`grid grid-cols-2 gap-3 transition-opacity ${isSubMaterial ? 'opacity-50' : 'opacity-100'}`}>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2 font-bold flex items-center gap-1"><Hash size={14}/> LOT 번호</label>
                        <input 
                            type="text" 
                            className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-12" 
                            value={lotNo} 
                            onChange={(e) => setLotNo(e.target.value)} 
                            disabled={isSubMaterial}
                            placeholder={isSubMaterial ? "-" : "입력"}
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-2 font-bold flex items-center gap-1"><Calendar size={14}/> 유통기한</label>
                        <input 
                            type="date" 
                            className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-12" 
                            value={expDate} 
                            onChange={(e) => setExpDate(e.target.value)} 
                            disabled={isSubMaterial}
                        />
                    </div>
                </div>
                
                {isSubMaterial && <div className="text-xs text-center text-gray-500">* 부자재는 LOT/유통기한 입력이 생략됩니다.</div>}

                <div>
                  <label className="block text-sm text-gray-400 mb-2 font-bold">입고 수량</label>
                  <input 
                    type="number" 
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full bg-black border border-gray-700 rounded-lg p-4 text-white focus:border-blue-500 outline-none text-2xl font-bold text-right h-16" 
                    value={inputQty} 
                    onChange={handleQtyChange} 
                  />
                </div>

                <div className="pt-2 gap-2 flex flex-col">
                    <button 
                        onClick={handleConfirm} 
                        disabled={processing} 
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/30 transition disabled:opacity-50 active:scale-95 text-lg"
                    >
                        {processing ? "처리 중..." : "입고 확정 (SAVE)"}
                    </button>
                    
                    <button 
                        onClick={() => setSelectedDetail(null)} 
                        className="w-full bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white py-3 rounded-xl transition text-sm"
                    >
                        선택 취소
                    </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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