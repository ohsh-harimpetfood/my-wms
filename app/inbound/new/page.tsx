"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, Search, Plus, Check, Minus, Trash2, Package, X } from "lucide-react"; 
import { TxCode, getTxTypesByGroup } from '@/constants/transaction'; 
import { useAuth } from "@/context/AuthProvider";
import { useUI } from "@/context/UIProvider";

interface Item {
  item_key: string;
  item_name: string;
  remark?: string;
  active_flag: string;
  item_type?: string; 
  uom?: string;      
}

export default function NewInboundPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const { toast, confirm } = useUI();
  
  // --- 1. 상태 관리 ---
  const [inboundType, setInboundType] = useState<TxCode>("IN_PURCHASE");
  const [supplier, setSupplier] = useState("");
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [remark, setRemark] = useState("");
  
  const [allItems, setAllItems] = useState<Item[]>([]);
  // 🚀 [수정] 수량을 number에서 string으로 변경하여 소수점 입력 중('12.') 상태를 유지할 수 있게 함
  const [selectedItems, setSelectedItems] = useState<{ item: Item; qty: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase.from("item_master").select("*").eq("active_flag", "Y").order("item_name");
      if (data) setAllItems(data as Item[]);
    };
    fetchItems();
  }, [supabase]);

  useEffect(() => {
    switch (inboundType) {
        case 'IN_PROD': setSupplier('내부 생산라인'); break;
        case 'IN_RETURN': setSupplier('반품(고객사)'); break;
        case 'IN_ETC': setSupplier('기타(직접입력)'); break; 
        case 'IN_PURCHASE': default: setSupplier(''); break;
    }
  }, [inboundType]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean); 
    return allItems.filter(item => {
        const targetText = `${item.item_name} ${item.item_key} ${item.item_type || ''}`.toLowerCase();
        return terms.every(term => targetText.includes(term));
    }).slice(0, 10); 
  }, [searchTerm, allItems]);

  const addItem = (item: Item) => {
    if (selectedItems.find(i => i.item.item_key === item.item_key)) {
        toast.warning("이미 추가된 품목입니다.");
        setSearchTerm("");
        setShowDropdown(false);
        return;
    }
    // 🚀 초기 수량을 문자열 "1"로 세팅
    setSelectedItems([...selectedItems, { item, qty: "1" }]);
    setSearchTerm("");
    setShowDropdown(false);
    toast.success(`${item.item_name} 추가됨`);
  };

  // 🚀 [추가] 소수점 자릿수 동적 계산 함수
  const getMaxDecimal = (item: Item) => {
    if (item.uom === 'KM') return 3;
    if (item.item_type === '원자재' || item.item_type === '원료') return 2;
    return 0; // 나머지는 정수
  };

  // 🚀 [추가] 소수점 입력 제어 정규식
  const sanitizeDecimalInput = (val: string, maxDec: number) => {
    let sanitized = val.replace(/[^0-9.]/g, ''); 
    if (maxDec === 0) return sanitized.replace(/\./g, ''); 

    const parts = sanitized.split('.');
    if (parts.length > 2) sanitized = parts[0] + '.' + parts.slice(1).join('');
    
    const finalParts = sanitized.split('.');
    if (finalParts.length === 2 && finalParts[1].length > maxDec) {
        sanitized = finalParts[0] + '.' + finalParts[1].slice(0, maxDec);
    }
    return sanitized;
  };

  // 🚀 [수정] 수량 직접 입력 핸들러
  const updateQty = (index: number, val: string) => {
    const item = selectedItems[index].item;
    const maxDec = getMaxDecimal(item);
    const sanitized = sanitizeDecimalInput(val, maxDec);
    
    const newItems = [...selectedItems];
    newItems[index].qty = sanitized;
    setSelectedItems(newItems);
  };

  // 🚀 [수정] + / - 버튼 클릭 핸들러 (부동 소수점 오차 방지)
  const adjustQty = (index: number, delta: number) => {
    const newItems = [...selectedItems];
    const item = newItems[index].item;
    const maxDec = getMaxDecimal(item);
    
    const currentNum = Number(newItems[index].qty) || 0;
    const nextNum = Number((currentNum + delta).toFixed(maxDec)); // 오차 방지
    
    if (nextNum < 0) return; // 0 미만 방지
    
    newItems[index].qty = nextNum === 0 ? "" : String(nextNum);
    setSelectedItems(newItems);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return toast.error("로그인 정보가 없습니다.");
    if (!supplier) return toast.warning("공급처 정보를 입력해주세요.");
    if (selectedItems.length === 0) return toast.warning("최소 1개 이상의 품목을 추가해주세요.");
    
    // 🚀 Number()로 변환해서 검사
    const invalidItem = selectedItems.find(i => !i.qty || Number(i.qty) <= 0);
    if (invalidItem) return toast.error(`'${invalidItem.item.item_name}'의 수량을 올바르게 입력해주세요.`);

    const ok = await confirm(
        `[등록 확인]\n총 ${selectedItems.length}건의 입고 예정 정보를\n등록하시겠습니까?`,
        "info"
    );
    if (!ok) return;

    setLoading(true);
    try {
      const dateStr = planDate.replace(/-/g, '').slice(2);
      const randomStr = Math.floor(1000 + Math.random() * 9000);
      const inboundNo = `IB-${dateStr}-${randomStr}`;
      
      const { error: masterError } = await supabase.from("inbound_master").insert({
        inbound_no: inboundNo,
        inbound_type: inboundType,
        supplier_name: supplier,
        plan_date: planDate,
        remark: remark,
        status: "PENDING",
        created_by: user.id
      });
      if (masterError) throw masterError;

      // 🚀 Number()로 래핑하여 DB 삽입
      const details = selectedItems.map(si => ({
        inbound_no: inboundNo,
        item_key: si.item.item_key,
        plan_qty: Number(si.qty),
        received_qty: 0,
        status: "PENDING"
      }));

      const { error: detailError } = await supabase.from("inbound_detail").insert(details);
      if (detailError) throw detailError;

      toast.success("입고 예정이 성공적으로 등록되었습니다.");
      router.push("/inbound");
      router.refresh();
      
    } catch (e: any) {
      toast.error("저장 중 오류가 발생했습니다: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // 🚀 [톤업] bg-black -> bg-slate-950
    <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-slate-100 font-[family-name:var(--font-geist-sans)] pb-32">
      <div className="flex items-center gap-4 mb-8 border-b border-slate-800 pb-4 sticky top-0 bg-slate-950/90 backdrop-blur-sm z-30 pt-2">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition"><ArrowLeft /></button>
        <h1 className="text-xl md:text-2xl font-bold">📝 입고 예정 등록 (Plan)</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 animate-fade-in">
        <div className="w-full lg:w-1/3 space-y-6">
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                <h2 className="text-lg font-bold text-blue-400 mb-4">1. 기본 정보</h2>
                <div className="grid grid-cols-2 gap-2 mb-6">
                    {getTxTypesByGroup('IN').map((type) => (
                        <button
                            key={type.code}
                            onClick={() => setInboundType(type.code as TxCode)}
                            className={`relative p-3 text-sm rounded-lg border flex items-center justify-center gap-2 transition-all h-12 ${
                                inboundType === type.code
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg font-bold'
                                    : 'bg-slate-950 border-slate-700 text-slate-400 hover:bg-slate-800'
                            }`}
                        >
                            {inboundType === type.code && <Check size={14} className="absolute left-3" />}
                            {type.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-slate-400 mb-1 font-bold">공급처 <span className="text-red-500">*</span></label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition text-white placeholder-slate-600"
                            value={supplier}
                            onChange={(e) => setSupplier(e.target.value)}
                            placeholder="공급처 직접 입력"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1 font-bold">입고 예정일</label>
                        <input type="date" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 text-white" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm text-slate-400 mb-1 font-bold">비고</label>
                        <input type="text" className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 text-white placeholder-slate-600" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="특이사항 입력" />
                    </div>
                </div>
            </div>

            {/* 품목 검색 영역 */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl relative z-20">
                <h2 className="text-lg font-bold text-blue-400 mb-4">2. 품목 추가</h2>
                <div className="relative">
                    <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg p-3 focus-within:border-blue-500 transition">
                        <Search className="text-slate-500 mr-2" size={20} />
                        <input 
                            type="text" 
                            placeholder="품목명 또는 코드 검색..."
                            className="w-full bg-transparent text-white outline-none placeholder-slate-600"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                        />
                        {searchTerm && (
                            <button onClick={() => { setSearchTerm(""); setShowDropdown(false); }} className="text-slate-500 hover:text-white">
                                <X size={16}/>
                            </button>
                        )}
                    </div>
                    
                    {showDropdown && searchTerm && (
                        <>
                            <div className="absolute top-full left-0 w-full bg-slate-800 border border-slate-700 rounded-b-lg mt-1 z-30 shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
                                {filteredItems.length === 0 ? (
                                    <div className="p-4 text-center text-slate-500 text-sm">검색 결과가 없습니다.</div>
                                ) : (
                                    filteredItems.map(item => (
                                        <div 
                                            key={item.item_key} 
                                            onClick={() => addItem(item)} 
                                            className="p-3 hover:bg-slate-700 cursor-pointer border-b border-slate-700 flex justify-between items-center group transition"
                                        >
                                            <div>
                                                <div className="font-bold text-white group-hover:text-blue-400 transition">{item.item_name}</div>
                                                <div className="text-xs text-slate-500 flex gap-2 mt-1">
                                                    <span className="bg-slate-950 px-1 rounded border border-slate-700">{item.item_key}</span>
                                                    {item.item_type && <span className="bg-slate-900 px-1 rounded border border-slate-700">{item.item_type}</span>}
                                                </div>
                                            </div>
                                            <div className="bg-blue-900/30 p-1.5 rounded-full text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition">
                                                <Plus size={16}/>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                        </>
                    )}
                </div>
                <p className="text-xs text-slate-500 mt-2 pl-1">* 띄어쓰기를 하면 <span className="text-blue-400 font-bold">AND 조건</span>으로 검색됩니다.</p>
            </div>
        </div>

        {/* 우측: 선택된 품목 리스트 */}
        <div className="w-full lg:w-2/3 flex flex-col h-full min-h-[500px]">
            <div className="bg-slate-900 border border-slate-800 rounded-xl flex-1 flex flex-col overflow-hidden shadow-xl">
                <div className="p-5 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                    <h2 className="font-bold text-white text-lg flex items-center gap-2">
                        <Package size={20} className="text-blue-500"/> 입고 예정 목록
                    </h2>
                    <span className="bg-blue-900/40 text-blue-400 px-3 py-1 rounded-full text-sm font-bold">{selectedItems.length}건</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {selectedItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 py-20">
                            <Plus size={48} className="mb-4"/>
                            <p>좌측에서 품목을 검색하여 추가해주세요.</p>
                        </div>
                    ) : (
                        selectedItems.map((row, idx) => {
                            const maxDec = getMaxDecimal(row.item);
                            
                            return (
                                <div key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl hover:border-blue-500/50 transition group flex flex-col sm:flex-row items-center gap-4 shadow-sm">
                                    <div className="flex-1 w-full text-center sm:text-left">
                                        <div className="font-bold text-white text-lg">{row.item.item_name}</div>
                                        <div className="text-sm text-slate-400 flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                                            <span className="bg-slate-900 px-1.5 rounded text-xs border border-slate-700">{row.item.item_key}</span>
                                            <span className="text-xs font-bold text-slate-300">단위: {row.item.uom}</span>
                                            <span className="text-[10px] text-blue-400 font-mono bg-blue-900/20 px-1.5 rounded border border-blue-900/50">
                                                {maxDec === 0 ? "정수" : `소수점 ${maxDec}자리`}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {/* 수량 조절기 */}
                                    <div className="flex items-center gap-2 bg-slate-900 rounded-lg p-1.5 border border-slate-700 shrink-0">
                                        <button 
                                            onClick={() => adjustQty(idx, -1)}
                                            className="w-10 h-10 flex items-center justify-center bg-slate-800 hover:bg-slate-700 rounded text-slate-400 hover:text-white transition active:scale-90"
                                        >
                                            <Minus size={18}/>
                                        </button>
                                        <input 
                                            type="text" 
                                            inputMode="decimal"
                                            className="w-24 bg-transparent text-center text-white font-bold outline-none text-xl placeholder-slate-700" 
                                            value={row.qty} 
                                            onChange={(e) => updateQty(idx, e.target.value)} 
                                            placeholder={maxDec === 3 ? "0.000" : maxDec === 2 ? "0.00" : "0"}
                                        />
                                        <button 
                                            onClick={() => adjustQty(idx, 1)}
                                            className="w-10 h-10 flex items-center justify-center bg-blue-900/30 hover:bg-blue-900/50 rounded text-blue-400 transition active:scale-90"
                                        >
                                            <Plus size={18}/>
                                        </button>
                                    </div>

                                    <button 
                                        onClick={() => removeItem(idx)} 
                                        className="p-3 text-slate-500 hover:text-red-500 hover:bg-red-900/20 rounded-xl transition shrink-0"
                                        title="삭제"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            )
                        })
                    )}
                </div>
                
                <div className="p-4 border-t border-slate-800 bg-slate-900 sticky bottom-0 z-20">
                    <button 
                        onClick={handleSave} 
                        disabled={loading || selectedItems.length === 0} 
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed transition active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {loading ? <span className="animate-spin text-xl">⟳</span> : <><Check size={20}/> 입고 예정 등록 완료 (SAVE)</>}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}