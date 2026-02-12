"use client";

import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2, Calendar, List, Truck, Plus, ChevronLeft, ChevronRight } from "lucide-react"; 
import { useUI } from "@/context/UIProvider"; // 🚀 UIProvider Import

export default function InboundPage() {
  const supabase = createClient();
  const { confirm, alert, toast } = useUI(); // 🚀 Hook 사용
  
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

  // 🚀 [수정] 삭제 핸들러
  const handleDelete = async (inboundNo: string, status: string) => {
    if (status !== 'PENDING') {
      await alert("진행 중인 건은 삭제할 수 없습니다.", "warning");
      return;
    }
    
    // 🔴 [수정 포인트] "danger" -> "warning" 으로 변경
    // (UIProvider에 정의된 타입만 사용할 수 있습니다)
    const isConfirmed = await confirm("정말 삭제하시겠습니까?", "warning");
    
    if (!isConfirmed) return;

    try {
      await supabase.from("inbound_detail").delete().eq("inbound_no", inboundNo);
      await supabase.from("inbound_master").delete().eq("inbound_no", inboundNo);
      
      await toast.success("삭제되었습니다."); // 성공 시 토스트 메시지
      fetchInbounds(); 
    } catch (e: any) {
      await toast.error("오류: " + e.message); // 실패 시 토스트 메시지
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
        <div className="grid gap-3 w-full min-w-0">
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
                    <Link key={ib.inbound_no} href={`/inbound/${ib.inbound_no}`} className="block w-full min-w-0 group relative">
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col hover:border-blue-500 hover:bg-gray-900/80 transition active:scale-[0.99] w-full box-border">
                            
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex flex-col gap-0.5 min-w-0 flex-1 pr-2">
                                    <span className="text-blue-400 font-bold text-xs md:text-sm font-mono tracking-tight truncate">
                                        {ib.inbound_no}
                                    </span>
                                    <span className="text-gray-500 text-[10px] md:text-xs truncate">{ib.plan_date}</span>
                                </div>
                                
                                <div className="flex items-center gap-2 shrink-0 ml-1">
                                    <StatusBadge status={ib.status} />
                                    {ib.status === 'PENDING' && (
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault(); 
                                                e.stopPropagation(); 
                                                handleDelete(ib.inbound_no, ib.status);
                                            }}
                                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-900/20 rounded-md transition z-10 -mr-1"
                                            title="삭제"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-3 w-full">
                                <div className="w-1 h-8 bg-gray-700 rounded-full shrink-0"></div>
                                <div className="flex-1 min-w-0"> 
                                    <div className="text-gray-400 text-xs">공급처</div>
                                    <div className="text-white font-bold text-sm md:text-base truncate">{ib.supplier_name}</div>
                                </div>
                            </div>

                            <div className="bg-black/40 rounded-lg p-2.5 border border-gray-800 flex items-start gap-2 w-full">
                                <Truck size={14} className="text-gray-500 mt-0.5 shrink-0"/>
                                <div className="text-gray-300 text-xs md:text-sm truncate flex-1 min-w-0 leading-snug">
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

// ... (이하 CalendarComponent, StatusBadge 등은 기존과 동일)
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