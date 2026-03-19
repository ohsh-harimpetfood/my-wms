"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, MapPin, Search, CheckCircle, Package, Box } from "lucide-react";
import LocationMapSelector from "@/components/LocationMapSelector";
import { TX_TYPES, TxCode } from "@/constants/transaction";
import { useAuth } from "@/context/AuthProvider"; 
import { useUI } from "@/context/UIProvider"; 

export default function InventoryMovePage() {
  const router = useRouter();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast, confirm } = useUI(); 

  const sourceId = searchParams.get("id"); 
  const sourceLoc = searchParams.get("loc");
  const itemKey = searchParams.get("item");
  const lotNo = searchParams.get("lot");
  const maxQty = Number(searchParams.get("qty") || 0);

  const [targetLoc, setTargetLoc] = useState("");
  const [moveQty, setMoveQty] = useState("");
  const [itemName, setItemName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);

  const moveType: TxCode = "MV_LOC"; 

  useEffect(() => {
    if (itemKey) {
        supabase.from("item_master").select("item_name").eq("item_key", itemKey).single()
        .then(({ data }) => { if(data) setItemName(data.item_name); });
    }
  }, [itemKey, supabase]);

  const handleQtyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const sanitized = val.replace(/[^0-9.]/g, ''); 
    setMoveQty(sanitized);
  };

  const setMaxMoveQty = () => {
    setMoveQty(String(maxQty));
  };

  const handleMove = async () => {
    if (!user) return toast.error("로그인 정보가 없습니다.");
    if (!targetLoc) return toast.warning("이동할 위치를 선택해주세요.");
    
    const finalTargetLoc = targetLoc.toUpperCase();
    if (finalTargetLoc === sourceLoc) return toast.warning("현재 위치와 동일한 곳으로 이동할 수 없습니다.");
    
    const qty = Number(moveQty);
    if (!qty || qty <= 0) return toast.warning("이동할 수량을 입력해주세요.");
    if (qty > maxQty) return toast.error(`보유 재고(${maxQty})보다 많이 이동할 수 없습니다.`);

    const ok = await confirm(
        `[재고 이동 확인]\n\n품목: ${itemName}\n수량: ${qty}\n\n${sourceLoc} ➔ ${finalTargetLoc}\n\n이동하시겠습니까?`,
        "info"
    );
    if (!ok) return;

    setLoading(true);
    try {
        const remainingQty = Number((maxQty - qty).toFixed(4));

        const { data: validLoc } = await supabase.from("loc_master").select("loc_id").eq("loc_id", finalTargetLoc).single();
        if (!validLoc) throw new Error(`존재하지 않는 위치 코드입니다: ${finalTargetLoc}`);

        let srcInvId = sourceId;
        if (!srcInvId) {
            const { data: sInv } = await supabase.from("inventory").select("id").eq("location_code", sourceLoc).eq("item_key", itemKey).eq("lot_no", lotNo).single();
            if(sInv) srcInvId = sInv.id;
            else throw new Error("출발지 재고를 찾을 수 없습니다.");
        }

        const { data: targetInv } = await supabase
            .from("inventory")
            .select("id, quantity")
            .eq("location_code", finalTargetLoc)
            .eq("item_key", itemKey)
            .eq("lot_no", lotNo)
            .single();

        // 🚀 [원칙 C] 전량 이동 && 타겟 빈자리 (껍데기만 변경)
        if (remainingQty === 0 && !targetInv) {
            const { error: updErr } = await supabase.from("inventory").update({
                location_code: finalTargetLoc,
                updated_at: new Date().toISOString(),
                updated_by: user.id
            }).eq("id", srcInvId);
            if (updErr) throw new Error("재고 이동 실패: " + updErr.message);
        } 
        // 🚀 [원칙 A & B] 부분 이동 OR 병합 이동
        else {
            const { data: srcPackInfo } = await supabase.from("inventory_packing_info").select("*").eq("inventory_id", srcInvId);
            
            let movingPacks: any[] = [];
            let remainingSrcPacks: any[] = [];

            if (srcPackInfo && srcPackInfo.length > 0) {
                // 1. Source 데이터 압축 (Consolidation)
                const looseRecords = srcPackInfo.filter(p => p.pack_type === 'LOOSE');
                const totalLooseQty = looseRecords.reduce((sum, p) => sum + Number(p.total_qty), 0);
                let loose = { pack_type: 'LOOSE', unit_qty: 1, pack_count: totalLooseQty, total_qty: totalLooseQty };

                const boxMap = new Map<number, any>();
                srcPackInfo.filter(p => p.pack_type === 'BOX').forEach(b => {
                    const uQty = Number(b.unit_qty);
                    if (boxMap.has(uQty)) {
                        boxMap.get(uQty).pack_count += Number(b.pack_count);
                        boxMap.get(uQty).total_qty += Number(b.total_qty);
                    } else {
                        boxMap.set(uQty, { pack_type: 'BOX', unit_qty: uQty, pack_count: Number(b.pack_count), total_qty: Number(b.total_qty) });
                    }
                });
                let boxes = Array.from(boxMap.values());

                // 2. 🚀 [수정됨] 스마트하게 박스 뜯어내기 알고리즘
                let remainingToMove = qty;
                movingPacks = [];

                // Step 2.1: 잔량(LOOSE) 먼저 가져오기 (짜투리 청소)
                if (loose.total_qty > 0 && remainingToMove > 0) {
                    const deduct = Math.min(loose.total_qty, remainingToMove);
                    loose.total_qty = Number((loose.total_qty - deduct).toFixed(4));
                    loose.pack_count = loose.total_qty;
                    remainingToMove = Number((remainingToMove - deduct).toFixed(4));

                    let mLoose = movingPacks.find(p => p.pack_type === 'LOOSE');
                    if (!mLoose) {
                        mLoose = { pack_type: 'LOOSE', unit_qty: 1, pack_count: 0, total_qty: 0 };
                        movingPacks.push(mLoose);
                    }
                    mLoose.total_qty = Number((mLoose.total_qty + deduct).toFixed(4));
                    mLoose.pack_count = mLoose.total_qty;
                }

                // Step 2.2: 🚀 온전한 박스 '통째로' 가져오기 (박스를 까지 않음!)
                if (remainingToMove > 0) {
                    boxes.sort((a, b) => b.unit_qty - a.unit_qty); // 큰 단위 박스부터
                    
                    for (let i = 0; i < boxes.length; i++) {
                        const box = boxes[i];
                        if (remainingToMove <= 0) break;
                        if (box.pack_count <= 0) continue;

                        const takeBoxCount = Math.floor(remainingToMove / box.unit_qty);
                        const actualTakeBoxes = Math.min(takeBoxCount, box.pack_count);

                        if (actualTakeBoxes > 0) {
                            // Source 박스 차감
                            box.pack_count -= actualTakeBoxes;
                            box.total_qty = Number((box.total_qty - (actualTakeBoxes * box.unit_qty)).toFixed(4));

                            // 이동 바구니에 온전한 BOX로 담기
                            let mBox = movingPacks.find(p => p.pack_type === 'BOX' && p.unit_qty === box.unit_qty);
                            if (!mBox) {
                                mBox = { pack_type: 'BOX', unit_qty: box.unit_qty, pack_count: 0, total_qty: 0 };
                                movingPacks.push(mBox);
                            }
                            mBox.pack_count += actualTakeBoxes;
                            mBox.total_qty = Number((mBox.total_qty + (actualTakeBoxes * box.unit_qty)).toFixed(4));

                            remainingToMove = Number((remainingToMove - (actualTakeBoxes * box.unit_qty)).toFixed(4));
                        }
                    }
                }

                // Step 2.3: 그래도 모자라면, 남은 박스 중 1개를 까서 잔량으로 부어버리기
                if (remainingToMove > 0) {
                    const availBoxIdx = boxes.findIndex(b => b.pack_count > 0);
                    if (availBoxIdx !== -1) {
                        const box = boxes[availBoxIdx];
                        
                        // 1박스 개봉
                        box.pack_count -= 1;
                        box.total_qty = Number((box.total_qty - box.unit_qty).toFixed(4));
                        
                        // 잔량에 붓기
                        loose.total_qty = Number((loose.total_qty + box.unit_qty).toFixed(4));
                        loose.pack_count = loose.total_qty;

                        // 모자란 만큼 잔량에서 가져오기
                        const deduct = Math.min(loose.total_qty, remainingToMove);
                        loose.total_qty = Number((loose.total_qty - deduct).toFixed(4));
                        loose.pack_count = loose.total_qty;
                        remainingToMove = Number((remainingToMove - deduct).toFixed(4));

                        let mLoose = movingPacks.find(p => p.pack_type === 'LOOSE');
                        if (!mLoose) {
                            mLoose = { pack_type: 'LOOSE', unit_qty: 1, pack_count: 0, total_qty: 0 };
                            movingPacks.push(mLoose);
                        }
                        mLoose.total_qty = Number((mLoose.total_qty + deduct).toFixed(4));
                        mLoose.pack_count = mLoose.total_qty;
                    }
                }

                // 남은 재고 정리
                if (loose.total_qty > 0) remainingSrcPacks.push(loose);
                boxes.forEach(b => { if (b.pack_count > 0) remainingSrcPacks.push(b); });
            }

            // 3. 출발지(Source) DB 갱신
            if (remainingQty === 0) {
                await supabase.from("inventory_packing_info").delete().eq("inventory_id", srcInvId);
                await supabase.from("inventory").delete().eq("id", srcInvId);
            } else {
                await supabase.from("inventory_packing_info").delete().eq("inventory_id", srcInvId);
                await supabase.from("inventory").update({ quantity: remainingQty, updated_at: new Date().toISOString(), updated_by: user.id }).eq("id", srcInvId);
                
                if (remainingSrcPacks.length > 0) {
                    const inserts = remainingSrcPacks.map(p => ({
                        inventory_id: srcInvId, pack_type: p.pack_type, unit_qty: p.unit_qty, pack_count: p.pack_count, total_qty: p.total_qty, updated_by: user.id
                    }));
                    await supabase.from("inventory_packing_info").insert(inserts);
                }
            }

            // 4. 도착지(Target) DB 갱신
            let finalTargetInvId;
            if (targetInv) {
                finalTargetInvId = targetInv.id;
                await supabase.from("inventory").update({ quantity: Number((targetInv.quantity + qty).toFixed(4)), updated_at: new Date().toISOString(), updated_by: user.id }).eq("id", targetInv.id);
            } else {
                const { data: newInv, error: insErr } = await supabase.from("inventory").insert({
                    location_code: finalTargetLoc, item_key: itemKey, lot_no: lotNo, quantity: qty, status: 'AVAILABLE', updated_by: user.id
                }).select("id").single();
                if (insErr) throw new Error("도착지 재고 생성 실패: " + insErr.message);
                finalTargetInvId = newInv.id;
            }

            // 도착지(Target) 박스 정보 병합 (Consolidation Upsert)
            if (movingPacks.length > 0) {
                let combinedTargetPacks = [...movingPacks];

                if (targetInv) {
                    const { data: targetExistingPacks } = await supabase.from("inventory_packing_info").select("*").eq("inventory_id", finalTargetInvId);
                    if (targetExistingPacks && targetExistingPacks.length > 0) {
                        combinedTargetPacks = [...combinedTargetPacks, ...targetExistingPacks];
                    }
                    await supabase.from("inventory_packing_info").delete().eq("inventory_id", finalTargetInvId);
                }

                const tLooseRecords = combinedTargetPacks.filter(p => p.pack_type === 'LOOSE');
                const tTotalLooseQty = tLooseRecords.reduce((sum, p) => sum + Number(p.total_qty), 0);
                let tLoose = { pack_type: 'LOOSE', unit_qty: 1, pack_count: tTotalLooseQty, total_qty: tTotalLooseQty };

                const tBoxMap = new Map<number, any>();
                combinedTargetPacks.filter(p => p.pack_type === 'BOX').forEach(b => {
                    const uQty = Number(b.unit_qty);
                    if (tBoxMap.has(uQty)) {
                        tBoxMap.get(uQty).pack_count += Number(b.pack_count);
                        tBoxMap.get(uQty).total_qty += Number(b.total_qty);
                    } else {
                        tBoxMap.set(uQty, { pack_type: 'BOX', unit_qty: uQty, pack_count: Number(b.pack_count), total_qty: Number(b.total_qty) });
                    }
                });

                const finalTargetPacksToInsert = [];
                if (tLoose.total_qty > 0) finalTargetPacksToInsert.push(tLoose);
                tBoxMap.forEach(val => { if (val.pack_count > 0) finalTargetPacksToInsert.push(val); });

                if (finalTargetPacksToInsert.length > 0) {
                    const targetInserts = finalTargetPacksToInsert.map(p => ({
                        inventory_id: finalTargetInvId, pack_type: p.pack_type, unit_qty: p.unit_qty, pack_count: p.pack_count, total_qty: p.total_qty, updated_by: user.id
                    }));
                    await supabase.from("inventory_packing_info").insert(targetInserts);
                }
            }
        }

        // 5. 수불 이력 등록
        const historyData = [
            {
                transaction_type: 'MOVE',
                io_type: 'OUT',
                tx_code: moveType,
                location_code: sourceLoc,
                item_key: itemKey,
                lot_no: lotNo,
                quantity: -qty,
                remark: `이동출고 (To: ${finalTargetLoc})`,
                created_by: user.id 
            },
            {
                transaction_type: 'MOVE',
                io_type: 'IN',
                tx_code: moveType,
                location_code: finalTargetLoc,
                item_key: itemKey,
                lot_no: lotNo,
                quantity: qty,
                remark: `이동입고 (From: ${sourceLoc})`,
                created_by: user.id
            }
        ];

        const { error: histErr } = await supabase.from("stock_tx").insert(historyData);
        if (histErr) throw new Error("이력 저장 실패: " + histErr.message);

        toast.success("재고 이동이 완료되었습니다.");
        router.push("/inventory"); 
        router.refresh();

    } catch (e: any) {
        console.error(e);
        toast.error("오류 발생: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)] pb-32">
      
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4 max-w-4xl mx-auto sticky top-0 bg-black/90 backdrop-blur-sm z-30 pt-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"><ArrowLeft /></button>
        <div>
            <h1 className="text-xl md:text-2xl font-bold text-blue-500">📦 재고 이동 (Move)</h1>
            <span className="text-xs bg-yellow-900/30 text-yellow-500 border border-yellow-800 px-2 py-0.5 rounded mt-1 inline-block font-bold">
                {TX_TYPES[moveType].label}
            </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-6 md:gap-8 items-start animate-fade-in">
        
        {/* Source Card */}
        <div className="flex-1 w-full bg-gray-900 border border-gray-800 rounded-xl p-6 opacity-80">
            <h2 className="text-lg font-bold text-gray-400 mb-4 flex items-center gap-2">📤 보내는 곳 (From)</h2>
            <div className="space-y-4">
                <div className="bg-black p-4 rounded-lg border border-gray-800 shadow-inner flex items-center gap-3">
                    <div className="p-2 bg-gray-800 rounded-full text-gray-400"><MapPin size={20}/></div>
                    <div>
                        <div className="text-sm text-gray-500 font-bold">현재 위치</div>
                        <div className="text-2xl font-bold text-white font-mono">{sourceLoc}</div>
                    </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 border border-gray-800 rounded-lg">
                    <Package className="text-gray-600 mt-1" size={20}/>
                    <div>
                        <div className="text-sm text-gray-500 font-bold mb-0.5">이동할 품목</div>
                        <div className="text-lg font-bold text-white leading-tight">{itemName}</div>
                        <div className="text-sm text-gray-500 font-mono mt-1">{itemKey}</div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border border-gray-800 rounded-lg">
                        <div className="text-sm text-gray-500 mb-1 font-bold flex items-center gap-1"><Box size={14}/> LOT 번호</div>
                        <div className="text-white font-mono bg-gray-800 px-2 py-1 rounded text-center text-sm">{lotNo || '-'}</div>
                    </div>
                    <div className="p-3 border border-gray-800 rounded-lg text-right">
                        <div className="text-sm text-gray-500 mb-1 font-bold">현재고</div>
                        <div className="text-blue-400 font-bold text-xl">{maxQty.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        </div>

        <div className="hidden md:flex self-center text-gray-600"><ArrowRight size={40} /></div>

        {/* Target Card */}
        <div className="flex-1 w-full bg-gray-900 border border-blue-900/30 rounded-xl p-6 shadow-xl shadow-blue-900/10">
            <h2 className="text-lg font-bold text-blue-400 mb-4 flex items-center gap-2">📥 받는 곳 (To)</h2>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm text-gray-400 mb-2 font-bold">이동할 위치</label>
                    <div className="flex items-center bg-black border border-blue-500 rounded-lg p-1 transition group focus-within:ring-2 focus-within:ring-blue-500/50 h-14">
                        <div className="pl-4 pr-2 text-blue-500"><MapPin size={20}/></div>
                        <input 
                            type="text" 
                            value={targetLoc} 
                            onChange={(e) => setTargetLoc(e.target.value.toUpperCase())}
                            placeholder="위치 코드 입력" 
                            className="bg-transparent outline-none text-white font-bold text-xl w-full placeholder-gray-600 uppercase font-mono h-full" 
                        />
                        <div 
                            className="pr-4 pl-2 text-gray-500 hover:text-white cursor-pointer h-full flex items-center"
                            onClick={() => setShowLocModal(true)}
                        >
                            <Search size={24} />
                        </div>
                    </div>
                </div>
                <div>
                    <label className="block text-sm text-gray-400 mb-2 font-bold">이동 수량</label>
                    <div className="relative">
                        <input 
                            type="text" 
                            inputMode="decimal"
                            value={moveQty} 
                            onChange={handleQtyChange} 
                            placeholder="0" 
                            className="w-full bg-black border border-gray-700 rounded-lg p-4 text-right text-white font-bold text-3xl outline-none focus:border-blue-500 h-16 placeholder-gray-800" 
                        />
                        <button 
                            onClick={setMaxMoveQty}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-gray-800 hover:bg-gray-700 text-xs px-2 py-1 rounded text-gray-300 transition border border-gray-700"
                        >
                            전체
                        </button>
                    </div>
                    <div className="text-right text-xs text-gray-500 mt-2">이동 가능: {maxQty.toLocaleString()}</div>
                </div>
                
                <button 
                    onClick={handleMove} 
                    disabled={loading} 
                    className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/20 transition disabled:opacity-50 mt-2 active:scale-[0.98] text-lg flex items-center justify-center gap-2"
                >
                    {loading ? "이동 중..." : <><CheckCircle size={20}/> 재고 이동 실행 (MOVE)</>}
                </button>
            </div>
        </div>
      </div>

      {showLocModal && (
        <LocationMapSelector 
            onClose={() => setShowLocModal(false)}
            onSelect={(locId) => { setTargetLoc(locId); setShowLocModal(false); }}
        />
      )}

    </div>
  );
}