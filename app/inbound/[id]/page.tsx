"use client";

import { createClient } from "@/utils/supabase/client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
// 🚀 [수정] Calculator 아이콘 추가
import { ArrowLeft, Search, Check, Calendar, Hash, Package, AlertCircle, Layers, Calculator } from "lucide-react"; 
import { InboundDetail, Item } from "@/types";
import LocationMapSelector from "@/components/LocationMapSelector"; 
// 🚀 [추가] SubMaterialHelperSheet 임포트
import SubMaterialHelperSheet, { PackingDetail } from "@/components/SubMaterialHelperSheet";
import { TX_TYPES, TxCode } from "@/constants/transaction";
import { useAuth } from "@/context/AuthProvider";
import { useUI } from "@/context/UIProvider";

interface InboundMaster {
  inbound_no: string;
  inbound_type: TxCode;
  supplier_name: string;
  plan_date: string;
  status: string;
  remark: string;
}

interface ExtendedItem extends Item {
  item_type?: string; 
}

interface InboundDetailWithItem extends InboundDetail {
  item_master: ExtendedItem;
}

export default function InboundWorkPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const { toast, confirm, alert: uiAlert } = useUI(); 

  const SUB_MATERIAL_TYPE = '부자재';

  const [master, setMaster] = useState<InboundMaster | null>(null);
  const [details, setDetails] = useState<InboundDetailWithItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedDetail, setSelectedDetail] = useState<InboundDetailWithItem | null>(null);
  
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [unitQty, setUnitQty] = useState(""); 
  const [selectedLocs, setSelectedLocs] = useState<string[]>([]); 

  const [locationCode, setLocationCode] = useState(""); 
  const [lotNo, setLotNo] = useState("");
  const [inputQty, setInputQty] = useState(""); 
  const [expDate, setExpDate] = useState("");
  
  const [processing, setProcessing] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);

  // 🚀 [추가] 스마트 계산기 관련 상태
  const [showHelperSheet, setShowHelperSheet] = useState(false);
  const [packingDetails, setPackingDetails] = useState<PackingDetail[]>([]);
  
  const formRef = useRef<HTMLDivElement>(null);

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

  const handleSelect = (detail: InboundDetailWithItem) => {
    if (detail.status === 'COMPLETED') {
        toast.info("이미 완료된 항목입니다.");
        return;
    }
    setSelectedDetail(detail);
    
    const remainQty = detail.plan_qty - detail.received_qty;
    setInputQty(String(remainQty > 0 ? remainQty : 0));
    
    setLocationCode(""); 
    setSelectedLocs([]);
    setIsMultiMode(false);
    setUnitQty("");
    // 🚀 [추가] 다른 품목 선택 시 계산기 데이터 초기화
    setPackingDetails([]);

    const isSub = detail.item_master.item_type === SUB_MATERIAL_TYPE || detail.item_master.lot_required === 'N';
    if (isSub) {
        setLotNo('N/A');
        setExpDate('');
    } else {
        setLotNo('');
        setExpDate('');
    }

    if (window.innerWidth < 1024) {
        setTimeout(() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
  };

  const getMaxDecimal = () => {
    if (!selectedDetail) return 0;
    const type = selectedDetail.item_master.item_type;
    const uom = selectedDetail.item_master.uom;

    if (uom === 'KM') return 3; 
    if (type === '원자재' || type === '원료') return 2; 
    return 0; 
  };

  const sanitizeDecimalInput = (val: string, maxDec: number) => {
    let sanitized = val.replace(/[^0-9.]/g, ''); 
    
    if (maxDec === 0) {
        return sanitized.replace(/\./g, ''); 
    }

    const parts = sanitized.split('.');
    if (parts.length > 2) {
      sanitized = parts[0] + '.' + parts.slice(1).join('');
    }
    
    const finalParts = sanitized.split('.');
    if (finalParts.length === 2 && finalParts[1].length > maxDec) {
        sanitized = finalParts[0] + '.' + finalParts[1].slice(0, maxDec);
    }

    return sanitized;
  };

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputQty(sanitizeDecimalInput(e.target.value, getMaxDecimal()));
    // 직접 수정 시 박스 정보 초기화 (불일치 방지)
    setPackingDetails([]); 
  };

  const handleUnitQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUnitQty(sanitizeDecimalInput(e.target.value, getMaxDecimal()));
  };

  const handleExpDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, ""); 
    if (val.length > 8) val = val.slice(0, 8); 

    let formatted = val;
    if (val.length > 6) {
        formatted = `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6)}`;
    } else if (val.length > 4) {
        formatted = `${val.slice(0, 4)}-${val.slice(4)}`;
    }
    
    setExpDate(formatted);
  };

  const totalInputQty = Number(inputQty) || 0;
  const unitQtyNum = Number(unitQty) || 0;
  const requiredCells = (isMultiMode && unitQtyNum > 0 && totalInputQty > 0) 
    ? Math.ceil(totalInputQty / unitQtyNum) 
    : 0;

  const handleConfirm = async () => {
    if (!user) return toast.error("로그인 정보가 없습니다.");
    if (!selectedDetail) return toast.error("작업할 품목을 선택해주세요.");
    
    const qtyNum = Number(inputQty);
    if (!qtyNum || qtyNum <= 0) return toast.error("유효한 수량을 입력해주세요.");

    if (isMultiMode) {
        if (!unitQtyNum || unitQtyNum <= 0) return toast.error("기준 단위 수량을 입력해주세요.");
        if (selectedLocs.length === 0) return toast.error("적치할 위치를 선택해주세요.");
        if (selectedLocs.length !== requiredCells) return uiAlert(`위치 ${requiredCells}개를 정확히 선택해주세요.\n현재 ${selectedLocs.length}개 선택됨.`, "warning");
    } else {
        if (!locationCode) return toast.error("적치할 위치를 입력해주세요.");
    }

    const currentReceived = selectedDetail.received_qty;
    
    if (currentReceived + qtyNum > selectedDetail.plan_qty) {
        const proceed = await confirm(
            `[주의: 초과 입고]\n계획: ${selectedDetail.plan_qty} / 현재: ${currentReceived}\n추가: ${qtyNum}\n\n계속 진행하시겠습니까?`,
            "warning"
        );
        if (!proceed) return;
    }

    const isSub = selectedDetail.item_master.item_type === SUB_MATERIAL_TYPE || selectedDetail.item_master.lot_required === 'N';
    if (!isSub) {
        if (!lotNo) return toast.warning("LOT 번호를 입력해주세요.");
        if (!expDate || expDate.length !== 10) return toast.warning("유효한 유통기한(8자리)을 입력해주세요."); 
    }

    const msg = isMultiMode 
      ? `[다중 분할 입고 확정]\n품목: ${selectedDetail.item_master.item_name}\n총 수량: ${qtyNum}\n분배 위치: ${selectedLocs.length}개 셀\n\n저장하시겠습니까?`
      : `[입고 확정]\n품목: ${selectedDetail.item_master.item_name}\n수량: ${qtyNum}\n위치: ${locationCode}\n\n저장하시겠습니까?`;
      
    const ok = await confirm(msg, "info");
    if (!ok) return;

    setProcessing(true);
    try {
      const distribution = isMultiMode 
        ? selectedLocs.map((loc, idx) => {
            const isLast = idx === selectedLocs.length - 1;
            const remain = Number((qtyNum - (unitQtyNum * idx)).toFixed(4));
            const allocQty = isLast ? remain : unitQtyNum;
            return { locId: loc, qty: allocQty };
          })
        : [{ locId: locationCode, qty: qtyNum }];

      const nowISO = new Date().toISOString();

      await Promise.all(distribution.map(async (dist) => {
          const { data: existInven } = await supabase.from("inventory").select("id, quantity")
            .eq("location_code", dist.locId)
            .eq("item_key", selectedDetail.item_key)
            .eq("lot_no", lotNo || 'DEFAULT')
            .maybeSingle();

          let currentInvenId = existInven?.id;

          if (existInven) {
            await supabase.from("inventory").update({
              quantity: existInven.quantity + dist.qty, 
              updated_at: nowISO,
              updated_by: user.id 
            }).eq("id", existInven.id);
          } else {
            // 🚀 [수정] 새로 생성된 inventory의 ID를 가져오도록 select() 추가
            const { data: newInven } = await supabase.from("inventory").insert({
              location_code: dist.locId, 
              item_key: selectedDetail.item_key, 
              quantity: dist.qty,
              lot_no: lotNo || 'DEFAULT', 
              exp_date: expDate || null, 
              status: 'AVAILABLE',
              inbound_date: nowISO,
              updated_at: nowISO,
              updated_by: user.id 
            }).select("id").single();
            
            if (newInven) currentInvenId = newInven.id;
          }

          // 📦 [추가] 부자재 박스 상세 정보 저장 로직 (단일 모드일 때만 적용)
          if (currentInvenId && packingDetails.length > 0 && !isMultiMode) {
             const packingInserts = packingDetails.map(p => ({
                inventory_id: currentInvenId,
                pack_type: p.pack_type,
                unit_qty: p.unit_qty,
                pack_count: p.pack_count,
                total_qty: p.total_qty,
                updated_by: user.id
             }));
             await supabase.from("inventory_packing_info").insert(packingInserts);
          }

          await supabase.from("stock_tx").insert({
            transaction_type: 'INBOUND',
            io_type: 'IN',
            tx_code: master?.inbound_type || 'IN_ETC',
            location_code: dist.locId,
            item_key: selectedDetail.item_key,
            quantity: dist.qty,
            lot_no: lotNo || 'DEFAULT',
            ref_doc_no: String(id),
            remark: isMultiMode ? `분할입고작업: ${master?.supplier_name}` : `입고작업: ${master?.supplier_name}`,
            created_by: user.id
          });
      }));

      const newReceivedQty = Number(selectedDetail.received_qty) + qtyNum;
      const newDetailStatus = newReceivedQty >= selectedDetail.plan_qty ? 'COMPLETED' : 'PENDING';
      await supabase.from("inbound_detail").update({ received_qty: newReceivedQty, status: newDetailStatus }).eq("id", selectedDetail.id);

      const { data: allDetails } = await supabase.from("inbound_detail").select("id, status").eq("inbound_no", id);
      if (allDetails) {
        const updatedDetails = allDetails.map(d => d.id === selectedDetail.id ? { ...d, status: newDetailStatus } : d);
        const isAllCompleted = updatedDetails.every(detail => detail.status === 'COMPLETED');
        await supabase.from("inbound_master").update({ status: isAllCompleted ? 'CLOSED' : 'PARTIAL' }).eq("inbound_no", id);
      }

      toast.success("성공적으로 입고 처리되었습니다.");
      setSelectedDetail(null);
      setPackingDetails([]); // 성공 후 데이터 초기화
      fetchData(); 

    } catch (e: any) {
      console.error(e);
      toast.error("오류 발생: " + e.message);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">데이터 로딩 중...</div>;
  if (!master) return <div className="p-8 text-slate-200">존재하지 않는 입고 번호입니다.</div>;

  const isSubMaterial = selectedDetail?.item_master.item_type === SUB_MATERIAL_TYPE || selectedDetail?.item_master.lot_required === 'N';
  const currentMaxDec = getMaxDecimal();
  const placeholderValue = currentMaxDec === 3 ? "0.000" : currentMaxDec === 2 ? "0.00" : "0";

  return (
    <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-slate-100 font-[family-name:var(--font-geist-sans)] pb-32">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-800 pb-4 gap-4 sticky top-0 bg-slate-950/90 backdrop-blur-sm z-30 pt-4">
        <div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"><ArrowLeft /></button>
            <h1 className="text-lg md:text-2xl font-bold flex items-center gap-2">
                🚛 입고 작업 <span className="text-slate-500 text-sm md:text-lg font-normal hidden md:inline">| {master.inbound_no}</span>
            </h1>
          </div>
          <div className="mt-2 text-slate-400 flex items-center gap-2 md:gap-3 text-xs md:text-sm ml-2">
             {master && TX_TYPES[master.inbound_type] && (
                <span className={`px-2 py-0.5 rounded border bg-slate-900 border-slate-700 text-slate-300`}>
                    {TX_TYPES[master.inbound_type].label}
                </span>
             )}
            <span className="text-blue-400 font-bold">{master.supplier_name}</span>
          </div>
        </div>
        <div className="self-end md:self-auto">
            <div className={`px-3 py-1 md:px-4 md:py-2 rounded-lg text-xs md:text-sm font-bold border ${
                master.status === 'CLOSED' ? 'bg-emerald-900/30 text-emerald-400 border-emerald-800' : 
                master.status === 'PARTIAL' ? 'bg-blue-900/30 text-blue-400 border-blue-800' :
                'bg-amber-900/30 text-amber-400 border-amber-800'
            }`}>
                {master.status}
            </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
        <div className="lg:col-span-2 space-y-2 md:space-y-3">
          <h2 className="text-base md:text-lg font-bold mb-2 flex items-center gap-2"><Check className="text-emerald-500" size={18}/> 작업 대상 목록</h2>
          {details.map((row) => {
            const progress = Math.min(100, (row.received_qty / row.plan_qty) * 100);
            const isCompleted = row.status === 'COMPLETED';
            const isSelected = selectedDetail?.id === row.id;

            return (
              <div 
                key={row.id}
                onClick={() => handleSelect(row)}
                className={`p-3 md:p-4 rounded-xl border cursor-pointer transition relative overflow-hidden group
                  ${isCompleted ? 'bg-slate-900/50 border-slate-800 opacity-60' : 
                    isSelected ? 'bg-blue-900/20 border-blue-500 ring-1 ring-blue-500 shadow-lg shadow-blue-900/20' : 'bg-slate-900 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}
                `}
              >
                <div className="flex justify-between items-center z-10 relative">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="text-sm md:text-lg font-bold text-slate-100 flex items-center gap-2 truncate">
                        <span className="truncate">{row.item_master.item_name}</span>
                        {row.item_master.item_type === '원자재' ? (
                            <span className="text-[10px] bg-lime-900/50 border border-lime-700/50 px-1.5 py-0.5 rounded text-lime-400 shrink-0">원자재</span>
                        ) : (
                            <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300 shrink-0">{row.item_master.item_type || '부자재'}</span>
                        )}
                    </div>
                    <div className="text-xs md:text-sm text-slate-500 mt-0.5 md:mt-1 flex items-center gap-2">
                        <span className="bg-slate-800 px-1.5 rounded font-mono border border-slate-700">{row.item_key}</span>
                        <span className="font-bold text-slate-400">{row.item_master.uom}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg md:text-2xl font-bold">
                        <span className={isCompleted ? "text-emerald-500" : "text-white"}>{row.received_qty}</span>
                        <span className="text-slate-600 text-sm md:text-lg"> / {row.plan_qty}</span>
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-500 mt-0.5">{isCompleted ? '완료' : `${row.plan_qty - row.received_qty} 남음`}</div>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-slate-800 w-full">
                    <div className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:sticky lg:top-24 h-fit" ref={formRef}>
          <div className="bg-slate-900 border border-slate-800 p-4 md:p-6 rounded-xl shadow-xl">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-200">✍️ 실적 등록</h2>
            
            {!selectedDetail ? (
              <div className="text-slate-500 text-center py-10 flex flex-col items-center justify-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/50">
                <Package size={48} className="mb-4 opacity-20"/>
                <p className="text-sm">목록에서 품목을 선택하세요.</p>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 shadow-inner">
                  <div className="text-xs text-slate-500 mb-1">선택된 품목</div>
                  <div className="font-bold text-lg md:text-xl text-blue-400 leading-tight">{selectedDetail.item_master.item_name}</div>
                  <div className="flex justify-between mt-2 text-sm text-slate-400 border-t border-slate-800 pt-2">
                    <span>계획 / 잔여 수량</span>
                    <span className="text-slate-200 font-bold">{selectedDetail.plan_qty} / <span className="text-amber-400">{selectedDetail.plan_qty - selectedDetail.received_qty}</span></span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-end mb-2">
                    <label className="block text-sm text-slate-400 font-bold">입고 대상 총 수량</label>
                    {/* 🚀 [추가] 스마트 계산기 버튼 연동 */}
                    <button 
                      onClick={() => setShowHelperSheet(true)}
                      className="flex items-center gap-1.5 px-3 py-1 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-800 text-blue-400 rounded-lg text-xs font-bold transition shadow-sm"
                    >
                      <Calculator size={14} /> 스마트 계산기
                    </button>
                  </div>
                  <input 
                    type="text" inputMode="decimal"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none text-3xl font-bold text-right placeholder-slate-700 transition" 
                    value={inputQty} 
                    onChange={handleQtyChange}
                    placeholder={placeholderValue} 
                  />
                  {packingDetails.length > 0 && (
                      <p className="text-xs text-emerald-400 mt-2 text-right">✓ 박스/잔량 상세정보가 저장되었습니다.</p>
                  )}
                </div>

                <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-full mb-2">
                    <button 
                        onClick={() => setIsMultiMode(false)} 
                        className={`flex-1 py-2 rounded text-xs md:text-sm font-bold transition-all ${!isMultiMode ? 'bg-slate-800 text-white shadow border border-slate-700' : 'text-slate-500 hover:text-white'}`}
                    >
                        단일 위치 적재
                    </button>
                    <button 
                        onClick={() => setIsMultiMode(true)} 
                        className={`flex-1 flex items-center justify-center gap-1 py-2 rounded text-xs md:text-sm font-bold transition-all ${isMultiMode ? 'bg-blue-600 text-white shadow shadow-blue-900/30' : 'text-slate-500 hover:text-white'}`}
                    >
                        <Layers size={14}/> 다중 분할 적재
                    </button>
                </div>

                {isMultiMode ? (
                    <div className="space-y-3 bg-blue-950/20 border border-blue-900/30 p-3 rounded-xl animate-fade-in shadow-inner">
                        <div>
                            <label className="block text-xs text-blue-300 mb-1 font-bold">단위 수량 (1개 위치당 적재량)</label>
                            <input 
                                type="text" inputMode="decimal"
                                className="w-full bg-slate-950 border border-blue-900/50 rounded-lg p-2.5 text-blue-100 focus:border-blue-500 outline-none text-xl font-bold text-right transition" 
                                value={unitQty} 
                                onChange={handleUnitQtyChange}
                                placeholder={`예: 50${currentMaxDec > 0 ? '.5' : ''}`} 
                            />
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>필요한 위치 수:</span>
                            <span className="font-bold text-white bg-slate-800 px-2 py-0.5 rounded border border-slate-700">{requiredCells} 개</span>
                        </div>

                        <button 
                            onClick={() => {
                                if (requiredCells > 0) setShowLocModal(true);
                                else uiAlert("총 수량과 단위 수량을 먼저 입력해주세요.", "warning");
                            }}
                            className="w-full py-3 bg-slate-950 border border-slate-700 hover:border-blue-500 rounded-lg flex items-center justify-between px-4 transition text-sm group"
                        >
                            <span className="text-slate-400 group-hover:text-slate-300">위치 다중 선택하기</span>
                            <div className="flex items-center gap-2">
                                <span className={`font-bold ${selectedLocs.length === requiredCells && requiredCells > 0 ? 'text-emerald-400' : 'text-blue-400'}`}>
                                    {selectedLocs.length} / {requiredCells}
                                </span>
                                <Search size={16} className="text-slate-500 group-hover:text-blue-400"/>
                            </div>
                        </button>

                        {selectedLocs.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {selectedLocs.map((loc, idx) => {
                                    const allocQty = (idx === selectedLocs.length - 1) ? Number((totalInputQty - (unitQtyNum * idx)).toFixed(4)) : unitQtyNum;
                                    return (
                                        <div key={loc} className="bg-blue-900/40 border border-blue-500/50 text-blue-200 text-[10px] px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                                            <span className="font-mono font-bold">{loc}</span>
                                            <span className="opacity-70">({allocQty})</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm text-slate-400 mb-2 font-bold">적재 위치 (Location)</label>
                        <div 
                            className="flex items-center bg-slate-950 border border-slate-600 focus-within:border-blue-500 rounded-lg p-1 cursor-pointer hover:bg-slate-800 transition group h-12"
                            onClick={() => setShowLocModal(true)}
                        >
                            <div className="pl-3 pr-2 text-slate-500 group-hover:text-blue-400"><Search size={18} /></div>
                            <input 
                                type="text" 
                                placeholder="터치하여 선택"
                                className="bg-transparent outline-none text-white font-mono text-lg w-full cursor-pointer placeholder-slate-600 uppercase h-full"
                                value={locationCode}
                                onChange={(e) => setLocationCode(e.target.value.toUpperCase())}
                            />
                        </div>
                    </div>
                )}

                <div className={`grid grid-cols-2 gap-3 transition-opacity ${isSubMaterial ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                    <div>
                        <label className="block text-sm text-slate-400 mb-2 font-bold flex items-center gap-1"><Hash size={14}/> LOT</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-12 placeholder-slate-700 transition" 
                            value={lotNo} 
                            onChange={(e) => setLotNo(e.target.value)} 
                            disabled={isSubMaterial}
                            placeholder="입력"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-2 font-bold flex items-center gap-1"><Calendar size={14}/> 유통기한</label>
                        <input 
                            type="text" 
                            inputMode="numeric"
                            maxLength={10}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none h-12 transition" 
                            value={expDate} 
                            onChange={handleExpDateChange} 
                            disabled={isSubMaterial}
                            placeholder="예: 20290112"
                        />
                    </div>
                </div>
                
                {isSubMaterial && <div className="text-xs text-center text-slate-500 bg-slate-800/50 py-1.5 rounded-md">* 부자재: LOT/유통기한 생략</div>}

                <div className="pt-2 gap-3 flex flex-col">
                    <button 
                        onClick={handleConfirm} 
                        disabled={processing} 
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/30 transition disabled:opacity-50 active:scale-95 text-lg"
                    >
                        {processing ? "처리 중..." : "입고 확정 (SAVE)"}
                    </button>
                    
                    <button 
                        onClick={() => setSelectedDetail(null)} 
                        className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white py-3 rounded-xl transition text-sm border border-slate-700"
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
        <LocationMapSelector 
            isMultiMode={isMultiMode}
            onClose={() => setShowLocModal(false)}
            onSelect={(locId) => {
                setLocationCode(locId);
                setShowLocModal(false);
            }}
            onSelectMulti={(locIds) => {
                setSelectedLocs(locIds);
                setShowLocModal(false);
            }}
        />
      )}

      {/* 🚀 [추가] 부자재 스마트 계산기 바텀 시트 연동 */}
      {/* 🚀 [수정] targetQty 프롭스 추가 */}
      <SubMaterialHelperSheet
        isOpen={showHelperSheet}
        onClose={() => setShowHelperSheet(false)}
        itemName={selectedDetail?.item_master.item_name || ""}
        maxDecimal={currentMaxDec}
        targetQty={selectedDetail ? selectedDetail.plan_qty - selectedDetail.received_qty : 0} // 👈 이 줄 추가!
        onApply={(totalQty, details) => {
          setInputQty(String(totalQty)); 
          setPackingDetails(details);    
          toast.success("스마트 계산기: 수량 및 박스 정보가 적용되었습니다.");
        }}
      />
    </div>
  );
}