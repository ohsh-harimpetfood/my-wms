"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
// 🚀 [수정 1] 'X' 아이콘 추가 및 아이콘들 import
import { ArrowLeft, Search, Plus, Check, Minus, Trash2, Package, X } from "lucide-react"; 
import { TxCode, getTxTypesByGroup } from '@/constants/transaction'; 
import { useAuth } from "@/context/AuthProvider";
import { useUI } from "@/context/UIProvider";

// 🚀 [수정 2] Item 인터페이스 로컬 정의 (타입 에러 방지)
interface Item {
  item_key: string;
  item_name: string;
  remark?: string;
  active_flag: string;
  item_type?: string; // DB 컬럼 매핑
  uom?: string;       // DB 컬럼 매핑
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
  const [selectedItems, setSelectedItems] = useState<{ item: Item; qty: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  
  // 드롭다운 제어
  const [showDropdown, setShowDropdown] = useState(false);

  // 초기 품목 데이터 로드
  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase.from("item_master").select("*").eq("active_flag", "Y").order("item_name");
      if (data) setAllItems(data as Item[]);
    };
    fetchItems();
  }, [supabase]);

  // 입고 유형 변경 시 공급처 자동 세팅
  useEffect(() => {
    switch (inboundType) {
        case 'IN_PROD': setSupplier('내부 생산라인'); break;
        case 'IN_RETURN': setSupplier('반품(고객사)'); break;
        case 'IN_ETC': setSupplier('기타'); break;
        case 'IN_PURCHASE': default: setSupplier(''); break;
    }
  }, [inboundType]);

  // 🚀 [수정 3] 스마트 검색 로직 (띄어쓰기 = AND 조건)
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return [];

    const terms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean); // 검색어 공백 분리

    return allItems.filter(item => {
        // 검색 대상 텍스트 결합 (품목명 + 코드 + 타입)
        const targetText = `${item.item_name} ${item.item_key} ${item.item_type || ''}`.toLowerCase();
        
        // 입력한 모든 단어가 targetText에 포함되어야 함 (AND 조건)
        return terms.every(term => targetText.includes(term));
    }).slice(0, 10); // 최대 10개만 표시
  }, [searchTerm, allItems]);

  const addItem = (item: Item) => {
    if (selectedItems.find(i => i.item.item_key === item.item_key)) {
        toast.warning("이미 추가된 품목입니다.");
        setSearchTerm("");
        setShowDropdown(false);
        return;
    }
    // 추가 시 기본 수량 1
    setSelectedItems([...selectedItems, { item, qty: 1 }]);
    setSearchTerm("");
    setShowDropdown(false);
    toast.success(`${item.item_name} 추가됨`);
  };

  // 수량 변경 핸들러
  const updateQty = (index: number, val: string) => {
    const num = Number(val.replace(/[^0-9]/g, ''));
    const newItems = [...selectedItems];
    newItems[index].qty = num;
    setSelectedItems(newItems);
  };

  // ➕➖ 수량 조절 버튼 핸들러
  const adjustQty = (index: number, delta: number) => {
    const newItems = [...selectedItems];
    const current = newItems[index].qty || 0;
    const next = current + delta;
    if (next < 1) return; 
    newItems[index].qty = next;
    setSelectedItems(newItems);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // --- 3. 저장 핸들러 ---
  const handleSave = async () => {
    if (!user) return toast.error("로그인 정보가 없습니다.");
    if (!supplier) return toast.warning("공급처 정보가 필요합니다.");
    if (selectedItems.length === 0) return toast.warning("최소 1개 이상의 품목을 추가해주세요.");
    
    const invalidItem = selectedItems.find(i => !i.qty || i.qty <= 0);
    if (invalidItem) return toast.error(`'${invalidItem.item.item_name}'의 수량을 입력해주세요.`);

    const ok = await confirm(
        `[등록 확인]\n총 ${selectedItems.length}건의 입고 예정 정보를\n등록하시겠습니까?`,
        "info"
    );
    if (!ok) return;

    setLoading(true);
    try {
      // 입고 번호 생성 (YYMMDD-랜덤4자리)
      const dateStr = planDate.replace(/-/g, '').slice(2); // YYMMDD
      const randomStr = Math.floor(1000 + Math.random() * 9000);
      const inboundNo = `IB-${dateStr}-${randomStr}`;
      
      // A. 마스터 등록
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

      // B. 상세 등록
      const details = selectedItems.map(si => ({
        inbound_no: inboundNo,
        item_key: si.item.item_key,
        plan_qty: si.qty,
        received_qty: 0,
        status: "PENDING"
      }));

      const { error: detailError } = await supabase.from("inbound_detail").insert(details);
      if (detailError) throw detailError;

      toast.success("입고 예정이 성공적으로 등록되었습니다.");
      router.push("/inbound");
      router.refresh();
      
    } catch (e: any) {
      console.error(e);
      toast.error("저장 중 오류가 발생했습니다: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)] pb-32">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4 sticky top-0 bg-black/90 backdrop-blur-sm z-30 pt-2">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"><ArrowLeft /></button>
        <h1 className="text-xl md:text-2xl font-bold">📝 입고 예정 등록 (Plan)</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 animate-fade-in">
        
        {/* 좌측: 입력 폼 & 품목 검색 */}
        <div className="w-full lg:w-1/3 space-y-6">
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
                <h2 className="text-lg font-bold text-blue-400 mb-4">1. 기본 정보</h2>
                
                {/* 입고 유형 버튼 그룹 */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                    {getTxTypesByGroup('IN').map((type) => (
                        <button
                            key={type.code}
                            onClick={() => setInboundType(type.code as TxCode)}
                            className={`relative p-3 text-sm rounded-lg border flex items-center justify-center gap-2 transition-all h-12 ${
                                inboundType === type.code
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg font-bold'
                                    : 'bg-black border-gray-700 text-gray-400 hover:bg-gray-800'
                            }`}
                        >
                            {inboundType === type.code && <Check size={14} className="absolute left-3" />}
                            {type.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1 font-bold">공급처</label>
                        <input 
                            type="text" 
                            className={`w-full bg-black border border-gray-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 transition ${inboundType !== 'IN_PURCHASE' ? 'text-gray-500 bg-gray-900/50' : 'text-white'}`}
                            value={supplier}
                            onChange={(e) => setSupplier(e.target.value)}
                            readOnly={inboundType !== 'IN_PURCHASE'} 
                            placeholder="공급처 입력"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1 font-bold">입고 예정일</label>
                        <input type="date" className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 text-white" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1 font-bold">비고</label>
                        <input type="text" className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 outline-none focus:border-blue-500 text-white" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="특이사항 입력" />
                    </div>
                </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl relative z-20">
                <h2 className="text-lg font-bold text-blue-400 mb-4">2. 품목 추가</h2>
                <div className="relative">
                    <div className="flex items-center bg-black border border-gray-700 rounded-lg p-3 focus-within:border-blue-500 transition">
                        <Search className="text-gray-500 mr-2" size={20} />
                        <input 
                            type="text" 
                            placeholder="품목명 또는 코드 검색..."
                            className="w-full bg-transparent text-white outline-none placeholder-gray-600"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => setShowDropdown(true)}
                        />
                        {/* 🚀 [수정] X 아이콘 사용 */}
                        {searchTerm && (
                            <button onClick={() => { setSearchTerm(""); setShowDropdown(false); }} className="text-gray-500 hover:text-white">
                                <X size={16}/>
                            </button>
                        )}
                    </div>
                    
                    {/* 검색 결과 드롭다운 */}
                    {showDropdown && searchTerm && (
                        <>
                            <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-700 rounded-b-lg mt-1 z-30 shadow-xl max-h-60 overflow-y-auto custom-scrollbar animate-fade-in">
                                {filteredItems.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500 text-sm">검색 결과가 없습니다.</div>
                                ) : (
                                    filteredItems.map(item => (
                                        <div 
                                            key={item.item_key} 
                                            onClick={() => addItem(item)} 
                                            className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 flex justify-between items-center group transition"
                                        >
                                            <div>
                                                <div className="font-bold text-white group-hover:text-blue-400 transition">{item.item_name}</div>
                                                <div className="text-xs text-gray-500 flex gap-2">
                                                    <span className="bg-gray-900 px-1 rounded">{item.item_key}</span>
                                                    {/* item_type 표시 */}
                                                    {item.item_type && <span className="bg-gray-800 px-1 rounded">{item.item_type}</span>}
                                                </div>
                                            </div>
                                            <div className="bg-blue-900/30 p-1.5 rounded-full text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition">
                                                <Plus size={16}/>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {/* 백드롭 (외부 클릭 시 닫기) */}
                            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                        </>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-2 pl-1">* 띄어쓰기를 하면 <span className="text-blue-400 font-bold">AND 조건</span>으로 검색됩니다.</p>
            </div>
        </div>

        {/* 우측: 선택된 품목 리스트 */}
        <div className="w-full lg:w-2/3 flex flex-col h-full min-h-[500px]">
            <div className="bg-gray-900 border border-gray-800 rounded-xl flex-1 flex flex-col overflow-hidden shadow-xl">
                <div className="p-5 border-b border-gray-800 bg-gray-800/30 flex justify-between items-center">
                    <h2 className="font-bold text-white text-lg flex items-center gap-2">
                        <Package size={20} className="text-blue-500"/> 입고 예정 목록
                    </h2>
                    <span className="bg-blue-900/40 text-blue-400 px-3 py-1 rounded-full text-sm font-bold">{selectedItems.length}건</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {selectedItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50 py-20">
                            <Plus size={48} className="mb-4"/>
                            <p>좌측에서 품목을 검색하여 추가해주세요.</p>
                        </div>
                    ) : (
                        selectedItems.map((row, idx) => (
                            <div key={idx} className="bg-black border border-gray-800 p-4 rounded-xl hover:border-blue-500/50 transition group flex flex-col sm:flex-row items-center gap-4">
                                {/* 품목 정보 */}
                                <div className="flex-1 w-full text-center sm:text-left">
                                    <div className="font-bold text-white text-lg">{row.item.item_name}</div>
                                    <div className="text-sm text-gray-500 flex items-center justify-center sm:justify-start gap-2 mt-1">
                                        <span className="bg-gray-900 px-1.5 rounded text-xs border border-gray-800">{row.item.item_key}</span>
                                        <span className="text-xs">| 단위: {row.item.uom}</span>
                                    </div>
                                </div>
                                
                                {/* 수량 조절기 (모바일 친화적) */}
                                <div className="flex items-center gap-3 bg-gray-900 rounded-lg p-1 border border-gray-800 shrink-0">
                                    <button 
                                        onClick={() => adjustQty(idx, -1)}
                                        className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition active:scale-90"
                                    >
                                        <Minus size={18}/>
                                    </button>
                                    <input 
                                        type="number" 
                                        inputMode="numeric"
                                        pattern="[0-9]*"
                                        className="w-16 bg-transparent text-center text-white font-bold outline-none text-lg" 
                                        value={row.qty || ''} 
                                        onChange={(e) => updateQty(idx, e.target.value)} 
                                    />
                                    <button 
                                        onClick={() => adjustQty(idx, 1)}
                                        className="w-10 h-10 flex items-center justify-center bg-blue-900/30 hover:bg-blue-900/50 rounded text-blue-400 transition active:scale-90"
                                    >
                                        <Plus size={18}/>
                                    </button>
                                </div>

                                {/* 삭제 버튼 */}
                                <button 
                                    onClick={() => removeItem(idx)} 
                                    className="p-3 text-gray-600 hover:text-red-500 hover:bg-red-900/10 rounded-full transition shrink-0"
                                    title="삭제"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
                
                <div className="p-4 border-t border-gray-800 bg-gray-900 sticky bottom-0 z-20">
                    <button 
                        onClick={handleSave} 
                        disabled={loading || selectedItems.length === 0} 
                        className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition active:scale-[0.98] flex items-center justify-center gap-2"
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