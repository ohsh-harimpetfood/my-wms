"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, Search, X, Plus, Check } from "lucide-react"; 
import { Item } from "@/types";
// 🚀 상수 Import
import { TX_TYPES, TxCode, getTxTypesByGroup } from '@/constants/transaction'; 

export default function NewInboundPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // --- 1. 상태 관리 ---
  // 🚀 기본값: 구매 입고 (IN_PURCHASE)로 변경
  const [inboundType, setInboundType] = useState<TxCode>("IN_PURCHASE");
  
  const [supplier, setSupplier] = useState("");
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [remark, setRemark] = useState("");
  
  const [allItems, setAllItems] = useState<Item[]>([]);
  const [selectedItems, setSelectedItems] = useState<{ item: Item; qty: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // 초기 품목 데이터 로드
  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase.from("item_master").select("*").eq("active_flag", "Y").order("item_name");
      if (data) setAllItems(data as Item[]);
    };
    fetchItems();
  }, []);

  // --- 2. 입고 유형 변경 시 공급처 자동 세팅 (TX_TYPES 기반) ---
  useEffect(() => {
    switch (inboundType) {
        case 'IN_PROD':
            setSupplier('내부 생산라인');
            break;
        case 'IN_RETURN':
            setSupplier('반품(고객사)');
            break;
        case 'IN_ETC':
            setSupplier('기타');
            break;
        case 'IN_PURCHASE':
        default:
            setSupplier(''); // 직접 입력 유도
            break;
    }
  }, [inboundType]);

  // 검색 및 아이템 추가 로직 (기존 유지 - 생략 가능하나 전체 코드 제공)
  const normalize = (text: string) => text.replace(/\s+/g, "").toLowerCase();
  const filteredItems = searchTerm ? allItems.filter(item => {
    const search = normalize(searchTerm);
    const name = normalize(item.item_name);
    const code = normalize(item.item_key);
    return name.includes(search) || code.includes(search);
  }).slice(0, 10) : [];

  const addItem = (item: Item) => {
    if (selectedItems.find(i => i.item.item_key === item.item_key)) return alert("이미 추가된 품목입니다.");
    setSelectedItems([...selectedItems, { item, qty: 0 }]);
    setSearchTerm("");
  };

  const updateQty = (index: number, qtyString: string) => {
    const newItems = [...selectedItems];
    newItems[index].qty = Number(qtyString);
    setSelectedItems(newItems);
  };

  const removeItem = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };

  // --- 3. 저장 핸들러 ---
  const handleSave = async () => {
    if (!supplier) return alert("공급처 정보가 필요합니다.");
    if (selectedItems.length === 0) return alert("최소 1개 이상의 품목을 추가해주세요.");
    if (selectedItems.some(i => i.qty <= 0)) return alert("수량이 0인 품목이 있습니다.");

    setLoading(true);
    try {
      const inboundNo = `IB-${planDate.replace(/-/g, '').slice(2)}-${Math.floor(1000 + Math.random() * 9000)}`;
      
      // 🚀 마스터 저장 (inbound_type 추가)
      const { error: masterError } = await supabase.from("inbound_master").insert({
        inbound_no: inboundNo,
        inbound_type: inboundType, // ✨ 핵심: 유형 저장
        supplier_name: supplier,
        plan_date: planDate,
        remark: remark,
        status: "PENDING"
      });
      if (masterError) throw masterError;

      // 상세 저장
      const details = selectedItems.map(si => ({
        inbound_no: inboundNo,
        item_key: si.item.item_key,
        plan_qty: si.qty,
        received_qty: 0,
        status: "PENDING"
      }));

      const { error: detailError } = await supabase.from("inbound_detail").insert(details);
      if (detailError) throw detailError;

      alert("입고 예정이 등록되었습니다.");
      router.push("/inbound");
      router.refresh();
      
    } catch (e: any) {
      console.error(e);
      alert("저장 중 오류가 발생했습니다: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)]">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-8 border-b border-gray-800 pb-4">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-white"><ArrowLeft /></button>
        <h1 className="text-2xl font-bold">📝 입고 예정 등록 (Plan)</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-1/3 space-y-6">
            
            {/* 1. 기본 정보 */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
                <h2 className="text-lg font-bold text-blue-400 mb-4">1. 입고 유형 선택</h2>
                
                {/* 🚀 TX_TYPES 기반 동적 버튼 생성 */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    {getTxTypesByGroup('IN').map((type) => (
                        <button
                            key={type.code}
                            onClick={() => setInboundType(type.code as TxCode)}
                            className={`relative p-3 text-sm rounded border flex items-center justify-center gap-2 transition-all ${
                                inboundType === type.code
                                    ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                                    : 'bg-black border-gray-700 text-gray-400 hover:bg-gray-800'
                            }`}
                        >
                            {inboundType === type.code && <Check size={14} className="absolute left-2" />}
                            {type.label}
                        </button>
                    ))}
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">공급처</label>
                        <input 
                            type="text" 
                            className={`w-full bg-black border border-gray-700 rounded px-3 py-2 outline-none focus:border-blue-500 ${inboundType !== 'IN_PURCHASE' ? 'text-gray-500' : 'text-white'}`}
                            value={supplier}
                            onChange={(e) => setSupplier(e.target.value)}
                            // IN_PURCHASE(구매) 일 때만 수정 가능하도록 설정
                            readOnly={inboundType !== 'IN_PURCHASE'} 
                            placeholder="공급처 입력"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">입고 예정일</label>
                        <input type="date" className="w-full bg-black border border-gray-700 rounded px-3 py-2 outline-none focus:border-blue-500" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">비고</label>
                        <input type="text" className="w-full bg-black border border-gray-700 rounded px-3 py-2 outline-none focus:border-blue-500" value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="특이사항" />
                    </div>
                </div>
            </div>

            {/* 2. 품목 검색 (기존과 동일) */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
                <h2 className="text-lg font-bold text-blue-400 mb-4">2. 품목 추가</h2>
                <div className="relative">
                    <div className="flex items-center bg-black border border-gray-700 rounded p-3 focus-within:border-blue-500 transition">
                        <Search className="text-gray-500 mr-2" size={20} />
                        <input 
                            type="text" 
                            placeholder="품목명/코드 검색..."
                            className="w-full bg-transparent text-white outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {searchTerm && (
                        <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-700 rounded-b mt-1 z-10 shadow-xl max-h-60 overflow-y-auto custom-scrollbar">
                            {filteredItems.map(item => (
                                <div key={item.item_key} onClick={() => addItem(item)} className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 flex justify-between items-center">
                                    <div>
                                        <div className="font-bold text-white">{item.item_name}</div>
                                        <div className="text-xs text-gray-500">{item.item_key}</div>
                                    </div>
                                    <Plus size={16} className="text-blue-400"/>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* 우측: 리스트 (기존과 동일) */}
        <div className="w-full lg:w-2/3 flex flex-col h-full">
            <div className="bg-gray-900 border border-gray-800 rounded-lg flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-800 bg-gray-800/50">
                    <h2 className="font-bold text-white">📦 입고 예정 리스트 <span className="text-blue-400">({selectedItems.length}건)</span></h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                    {selectedItems.map((row, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-black border border-gray-800 p-3 rounded hover:border-blue-500 transition">
                            <div className="col-span-6">
                                <div className="font-bold text-white">{row.item.item_name}</div>
                                <div className="text-xs text-gray-500">{row.item.item_key}</div>
                            </div>
                            <div className="col-span-2 text-center text-gray-400 text-sm">{row.item.uom}</div>
                            <div className="col-span-3">
                                <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-center text-white font-bold outline-none focus:border-blue-500" value={row.qty || ''} onChange={(e) => updateQty(idx, e.target.value)} />
                            </div>
                            <div className="col-span-1 text-center">
                                <button onClick={() => removeItem(idx)} className="text-gray-500 hover:text-red-500 transition"><X size={18} /></button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="p-4 border-t border-gray-800 bg-gray-900">
                    <button onClick={handleSave} disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-lg shadow-lg disabled:opacity-50">
                        {loading ? "저장 중..." : "입고 예정 등록 완료"}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}