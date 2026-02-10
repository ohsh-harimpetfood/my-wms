"use client";

import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2, Calendar, List, Truck, Plus, ChevronLeft, ChevronRight } from "lucide-react"; 

export default function InboundPage() {
  const supabase = createClient();
  
  // 상태 관리
  const [inbounds, setInbounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(""); 
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');

  const [currentDate, setCurrentDate] = useState(new Date());

  const fetchInbounds = async () => {
    setLoading(true);
    let query = supabase
      .from("inbound_master")
      .select(`
        *,
        details:inbound_detail (
          item_master (item_name)
        )
      `)
      .order("plan_date", { ascending: false });

    const { data, error } = await query;
    if (error) console.error("Error:", error);
    else setInbounds(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchInbounds();
  }, []);

  const handleDelete = async (inboundNo: string, status: string) => {
    if (status !== 'PENDING') {
      alert("진행 중인 건은 삭제할 수 없습니다.");
      return;
    }
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await supabase.from("inbound_detail").delete().eq("inbound_no", inboundNo);
      await supabase.from("inbound_master").delete().eq("inbound_no", inboundNo);
      alert("삭제되었습니다.");
      fetchInbounds(); 
    } catch (e: any) {
      alert("오류: " + e.message);
    }
  };

  const filteredInbounds = filterDate 
    ? inbounds.filter(i => i.plan_date === filterDate)
    : inbounds;

  const formatItemsSummary = (details: any[]) => {
    if (!details || details.length === 0) return "품목 없음";
    const name = details[0]?.item_master?.item_name || "미상";
    return details.length > 1 ? `${name} 외 ${details.length - 1}건` : name;
  };

  return (
    // 🚀 [수정] overflow-x-hidden으로 가로 스크롤 방지
    <div className="p-4 md:p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)] pb-24 overflow-x-hidden">
      
      <div className="max-w-3xl mx-auto space-y-6 w-full">
        
        {/* 헤더 */}
        <div className="flex flex-col gap-4">
            <div>
                <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                    <Truck className="text-blue-500" /> 입고 스케줄
                </h1>
                <p className="text-gray-400 text-xs md:text-sm mt-1">입고 일정을 달력으로 확인하고 관리합니다.</p>
            </div>
            
            {/* 컨트롤 패널 */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="bg-gray-900 p-1 rounded-lg border border-gray-700 flex shrink-0">
                    <button 
                        onClick={() => setViewMode('LIST')}
                        className={`p-2 rounded-md flex items-center gap-2 text-xs md:text-sm font-bold transition ${viewMode === 'LIST' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        <List size={16}/> <span className="hidden md:inline">리스트</span>
                    </button>
                    <button 
                        onClick={() => setViewMode('CALENDAR')}
                        className={`p-2 rounded-md flex items-center gap-2 text-xs md:text-sm font-bold transition ${viewMode === 'CALENDAR' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Calendar size={16}/> <span className="hidden md:inline">캘린더</span>
                    </button>
                </div>

                <div className="flex gap-2 flex-wrap">
                    <Link href="/inbound/direct" className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-3 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1 whitespace-nowrap">
                        ⚡ 즉시 입고
                    </Link>
                    <Link href="/inbound/new" className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-lg text-xs md:text-sm font-bold flex items-center gap-1 whitespace-nowrap shadow-lg shadow-blue-900/20">
                        <Plus size={16} /> 예정 등록
                    </Link>
                </div>
            </div>
        </div>

        {/* 캘린더 뷰 */}
        {viewMode === 'CALENDAR' && (
            <div className="animate-fade-in w-full">
                <CalendarComponent 
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    inbounds={inbounds}
                    selectedDate={filterDate}
                    onSelectDate={(date) => setFilterDate(date)}
                />
            </div>
        )}

        {/* 리스트 헤더 */}
        <div className="flex items-center justify-between bg-gray-900/50 p-3 md:p-4 rounded-xl border border-gray-800 w-full box-border">
            <div className="flex items-center gap-3 min-w-0">
                <div className="bg-blue-900/30 p-2 rounded-lg text-blue-400 shrink-0">
                    <Calendar size={18} />
                </div>
                <div className="min-w-0 flex-1">
                    {filterDate ? (
                        <div className="flex flex-col">
                            <span className="text-sm md:text-lg font-bold text-white leading-none mb-1">{filterDate}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-gray-400 text-xs">선택된 날짜</span>
                                <button onClick={() => setFilterDate("")} className="text-[10px] text-red-400 hover:underline border border-red-900/50 px-1.5 rounded bg-red-900/10 whitespace-nowrap">
                                    필터 해제
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col">
                            <span className="text-gray-200 font-bold text-sm md:text-base">전체 목록</span>
                            <span className="text-gray-500 text-xs">모든 입고 예정을 보여줍니다.</span>
                        </div>
                    )}
                </div>
            </div>
            <div className="text-xs text-gray-500 shrink-0 text-right ml-2">
                총 <span className="text-white font-bold">{filteredInbounds.length}</span>건
            </div>
        </div>

        {/* 📋 리스트 카드 영역 */}
        <div className="grid gap-3 w-full min-w-0"> {/* Grid 자체에도 min-w-0 추가 */}
            {loading ? (
                <div className="text-center py-10 text-gray-500 flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    로딩 중...
                </div>
            ) : filteredInbounds.length === 0 ? (
                <div className="text-center py-12 text-gray-500 border border-gray-800 border-dashed rounded-xl bg-gray-900/20 text-sm">
                    데이터가 없습니다.
                </div>
            ) : (
                filteredInbounds.map((ib) => (
                    // 🚀 [핵심 수정 1] min-w-0 추가: 그리드 아이템이 컨텐츠보다 작아질 수 있게 허용 (밀림 해결)
                    <Link key={ib.inbound_no} href={`/inbound/${ib.inbound_no}`} className="block w-full min-w-0 group relative">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col hover:border-blue-500 hover:bg-gray-900/80 transition active:scale-[0.99] w-full box-border">
                            
                            {/* 상단 행: 번호+날짜(좌측) / 배지+삭제버튼(우측) */}
                            <div className="flex justify-between items-start mb-3">
                                {/* 좌측 정보: min-w-0으로 줄임표 허용 */}
                                <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-2">
                                    <span className="text-blue-400 font-bold text-xs md:text-sm font-mono tracking-tight truncate">
                                        {ib.inbound_no}
                                    </span>
                                    <span className="text-gray-500 text-[10px] md:text-xs truncate">{ib.plan_date}</span>
                                </div>
                                
                                {/* 🚀 [핵심 수정 2] 삭제 버튼을 flex 흐름 안으로 이동 (겹침 원천 차단) */}
                                <div className="flex items-center gap-2 shrink-0 ml-1">
                                    <StatusBadge status={ib.status} />
                                    {ib.status === 'PENDING' && (
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault(); 
                                                e.stopPropagation(); 
                                                handleDelete(ib.inbound_no, ib.status);
                                            }}
                                            // p-2로 터치 영역 확보하되 버튼 크기는 작게 유지
                                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-900/20 rounded-md transition"
                                            title="삭제"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* 중간 행: 공급처 */}
                            <div className="flex items-center gap-2 mb-3 w-full">
                                <div className="w-1 h-8 bg-gray-700 rounded-full shrink-0"></div>
                                <div className="flex-1 min-w-0"> 
                                    <div className="text-gray-400 text-xs">공급처</div>
                                    <div className="text-white font-bold text-sm md:text-base truncate">{ib.supplier_name}</div>
                                </div>
                            </div>

                            {/* 하단 행: 품목 요약 */}
                            <div className="bg-black/40 rounded-lg p-2.5 border border-gray-800 flex items-start gap-2 w-full">
                                <Truck size={14} className="text-gray-500 mt-0.5 shrink-0"/>
                                {/* 🚀 [핵심 수정 3] span -> div 변경 및 truncate 적용으로 긴 텍스트 잘림 처리 */}
                                <div className="text-gray-300 text-xs md:text-sm truncate flex-1 min-w-0">
                                    {formatItemsSummary(ib.details)}
                                </div>
                            </div>

                        </div>
                    </Link>
                ))
            )}
        </div>

      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 컴포넌트: 캘린더 & 뱃지
// ------------------------------------------------------------------
interface CalendarProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  inbounds: any[];
  selectedDate: string;
  onSelectDate: (date: string) => void; 
}

function CalendarComponent({ currentDate, setCurrentDate, inbounds, selectedDate, onSelectDate }: CalendarProps) { 
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    const getDateString = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 shadow-lg w-full box-border">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-white">{year}년 {month + 1}월</h2>
                <div className="flex gap-1">
                    <button onClick={prevMonth} className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white"><ChevronLeft size={18}/></button>
                    <button onClick={nextMonth} className="p-1.5 hover:bg-gray-800 rounded text-gray-400 hover:text-white"><ChevronRight size={18}/></button>
                </div>
            </div>
            <div className="grid grid-cols-7 mb-2 text-center text-xs font-bold text-gray-500">
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                    <div key={d} className={`${i===0 ? 'text-red-500': i===6 ? 'text-blue-500' : ''}`}>{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {days.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="h-14 md:h-20"></div>;
                    const dateStr = getDateString(day);
                    const count = inbounds.filter((i:any) => i.plan_date === dateStr).length;
                    const isSelected = selectedDate === dateStr;
                    const isToday = dateStr === new Date().toISOString().split('T')[0];

                    return (
                        <div key={dateStr} onClick={() => onSelectDate(dateStr === selectedDate ? "" : dateStr)}
                            className={`h-14 md:h-20 border rounded-lg p-1 cursor-pointer flex flex-col justify-between ${isSelected ? 'bg-blue-900/40 border-blue-500' : 'bg-black border-gray-800 hover:bg-gray-900'}`}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`text-xs font-bold ${isToday ? 'bg-blue-600 text-white px-1 rounded-full' : 'text-gray-400'}`}>{day}</span>
                                {count > 0 && <span className="bg-yellow-600 text-white text-[9px] font-bold px-1 rounded-full">{count}</span>}
                            </div>
                            <div className="flex gap-0.5 justify-center mt-1">
                                {count > 0 && <div className="w-1 h-1 rounded-full bg-blue-500"></div>}
                                {count > 1 && <div className="w-1 h-1 rounded-full bg-gray-500"></div>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        'PENDING': 'bg-yellow-900/30 text-yellow-500 border-yellow-800',
        'PARTIAL': 'bg-blue-900/30 text-blue-400 border-blue-800',
        'CLOSED': 'bg-green-900/30 text-green-500 border-green-800'
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] border ${styles[status] || 'bg-gray-800 text-gray-400'} font-bold whitespace-nowrap`}>{status}</span>;
}