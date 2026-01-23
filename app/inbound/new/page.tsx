// app/inbound/new/page.tsx
"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowLeft, Search, X, Plus } from "lucide-react"; // 아이콘 사용
import { Item } from "@/types";

export default function NewInboundPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // --- 1. 상태 관리 ---
  // 입고 유형 (기본값: 자재 입고)
  const [inboundType, setInboundType] = useState("MAT_IN");
  
  // 공급처 (자동 완성 또는 수기 입력)
  const [supplier, setSupplier] = useState("");
  
  const [planDate, setPlanDate] = useState(new Date().toISOString().split('T')[0]);
  const [remark, setRemark] = useState("");
  
  // 품목 관리
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

  // --- 2. 입고 유형 변경 시 공급처 자동 세팅 (핵심 ✨) ---
  useEffect(() => {
    if (inboundType === 'PROD_IN') setSupplier('내부 생산라인');
    else if (inboundType === 'MAT_IN') setSupplier('자재팀/구매처');
    else if (inboundType === 'ETC_IN') setSupplier('기타');
    else setSupplier(''); // OEM_IN(구매)일 때는 직접 입력하도록 비움
  }, [inboundType]);

  // 검색 로직
  const normalize = (text: string) => text.replace(/\s+/g, "").toLowerCase();

  const filteredItems = searchTerm ? allItems.filter(item => {
    const search = normalize(searchTerm);
    const name = normalize(item.item_name);
    const code = normalize(item.item_key);
    return name.includes(search) || code.includes(search);
  }).slice(0, 10) : [];

  // 품목 추가/삭제/변경 핸들러
  const addItem = (item: Item) => {
    if (selectedItems.find(i => i.item.item_key === item.item_key)) {
      alert("이미 추가된 품목입니다.");
      return;
    }
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
    if (!supplier) {
      alert("공급처 정보가 필요합니다. (유형을 확인해주세요)");
      return;
    }
    if (selectedItems.length === 0) {
      alert("최소 1개 이상의 품목을 추가해주세요.");
      return;
    }
    if (selectedItems.some(i => i.qty <= 0)) {
        alert("수량이 0인 품목이 있습니다.");
        return;
    }

    setLoading(true);
    try {
      // 1. 입고 번호 생성 (사용자님 로직 유지)
      const inboundNo = `IB-${planDate.replace(/-/g, '').slice(2)}-${Math.floor(1000 + Math.random() * 9000)}`;

      // 2. 마스터 저장
      const finalRemark = `[${inboundType}] ${remark}`; // 비고에 유형 태그 추가

      const { error: masterError } = await supabase.from("inbound_master").insert({
        inbound_no: inboundNo,
        supplier_name: supplier,
        plan_date: planDate,
        remark: finalRemark,
        status: "PENDING"
      });
      if (masterError) throw masterError;

      // 3. 상세 저장
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
        
        {/* --- 좌측: 입력 폼 --- */}
        <div className="w-full lg:w-1/3 space-y-6">
            
            {/* 1. 기본 정보 */}
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-lg">
                <h2 className="text-lg font-bold text-blue-400 mb-4">1. 입고 유형 선택</h2>
                
                {/* 입고 유형 버튼 (핵심 기능) */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <button onClick={() => setInboundType('PROD_IN')} className={`p-3 text-sm rounded border ${inboundType==='PROD_IN' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black border-gray-700 text-gray-400'}`}>
                        🏭 생산 입고
                    </button>
                    <button onClick={() => setInboundType('OEM_IN')} className={`p-3 text-sm rounded border ${inboundType==='OEM_IN' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black border-gray-700 text-gray-400'}`}>
                        📦 구매 입고
                    </button>
                    <button onClick={() => setInboundType('MAT_IN')} className={`p-3 text-sm rounded border ${inboundType==='MAT_IN' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black border-gray-700 text-gray-400'}`}>
                        🔩 자재 입고
                    </button>
                    <button onClick={() => setInboundType('ETC_IN')} className={`p-3 text-sm rounded border ${inboundType==='ETC_IN' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-black border-gray-700 text-gray-400'}`}>
                        🎸 기타 입고
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">공급처 {inboundType !== 'OEM_IN' && <span className="text-green-500 text-xs ml-1">(자동 입력됨)</span>}</label>
                        <input 
                            type="text" 
                            className={`w-full bg-black border border-gray-700 rounded px-3 py-2 outline-none focus:border-blue-500 ${inboundType !== 'OEM_IN' ? 'text-gray-500' : 'text-white'}`}
                            value={supplier}
                            onChange={(e) => setSupplier(e.target.value)}
                            disabled={inboundType !== 'OEM_IN'} // OEM 아닐때 수정 불가
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

            {/* 2. 품목 검색 */}
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
                    {/* 검색 결과 드롭다운 */}
                    {searchTerm && (
                        <div className="absolute top-full left-0 w-full bg-gray-800 border border-gray-700 rounded-b mt-1 z-10 shadow-xl max-h-60 overflow-y-auto">
                            {filteredItems.length === 0 ? (
                                <div className="p-3 text-gray-500 text-center">검색 결과 없음</div>
                            ) : (
                                filteredItems.map(item => (
                                    <div key={item.item_key} onClick={() => addItem(item)} className="p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 flex justify-between items-center">
                                        <div>
                                            <div className="font-bold text-white">{item.item_name}</div>
                                            <div className="text-xs text-gray-500">{item.item_key}</div>
                                        </div>
                                        <Plus size={16} className="text-blue-400"/>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* --- 우측: 리스트 --- */}
        <div className="w-full lg:w-2/3 flex flex-col h-full">
            <div className="bg-gray-900 border border-gray-800 rounded-lg flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-gray-800 bg-gray-800/50">
                    <h2 className="font-bold text-white">📦 입고 예정 리스트 <span className="text-blue-400">({selectedItems.length}건)</span></h2>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {selectedItems.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-500">좌측에서 품목을 검색하여 추가해주세요.</div>
                    ) : (
                        <div className="w-full">
                            <div className="grid grid-cols-12 gap-4 text-xs text-gray-500 border-b border-gray-700 pb-2 mb-2 px-2">
                                <div className="col-span-6">품목명 / 코드</div>
                                <div className="col-span-2 text-center">단위</div>
                                <div className="col-span-3 text-center">예정 수량</div>
                                <div className="col-span-1 text-center">삭제</div>
                            </div>
                            {selectedItems.map((row, idx) => (
                                <div key={idx} className="grid grid-cols-12 gap-4 items-center bg-black border border-gray-800 p-3 rounded hover:border-blue-500 transition">
                                    <div className="col-span-6">
                                        <div className="font-bold text-white">{row.item.item_name}</div>
                                        <div className="text-xs text-gray-500">{row.item.item_key}</div>
                                    </div>
                                    <div className="col-span-2 text-center text-gray-400 text-sm">{row.item.uom}</div>
                                    <div className="col-span-3">
                                        <input type="number" className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-center text-white font-bold outline-none focus:border-blue-500" value={row.qty || ''} onChange={(e) => updateQty(idx, e.target.value)} placeholder="0" />
                                    </div>
                                    <div className="col-span-1 text-center">
                                        <button onClick={() => removeItem(idx)} className="text-gray-500 hover:text-red-500 transition"><X size={18} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-800 bg-gray-900">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-400">총 수량 합계</span>
                        <span className="text-2xl font-bold text-white">{selectedItems.reduce((acc, cur) => acc + (cur.qty || 0), 0).toLocaleString()}</span>
                    </div>
                    <button onClick={handleSave} disabled={loading} className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-lg shadow-lg shadow-blue-900/20 transition disabled:opacity-50">
                        {loading ? "저장 중..." : "입고 예정 등록 완료"}
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}