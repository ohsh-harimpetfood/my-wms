// app/inbound/page.tsx
"use client";

import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Trash2, Calendar, List, ChevronLeft, ChevronRight } from "lucide-react"; 

export default function InboundPage() {
  const supabase = createClient();
  
  // 상태 관리
  const [inbounds, setInbounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterDate, setFilterDate] = useState(""); 
  const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST'); // 보기 모드

  // 캘린더용 상태
  const [currentDate, setCurrentDate] = useState(new Date()); // 현재 보고 있는 달

  // 1. 데이터 불러오기 함수
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
      .order("plan_date", { ascending: false }); // 달력 표시를 위해 날짜순 정렬

    // 날짜 필터가 있으면 해당 날짜만, 없으면 전체 (달력에 점 찍기 위해 전체 로드 필요)
    // *최적화: 실제 운영시엔 '월별 조회'로 범위를 좁혀야 하지만, 지금은 전체 로드
    const { data, error } = await query;

    if (error) {
      console.error("Error:", error);
    } else {
      setInbounds(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInbounds();
  }, []); // 처음에 한 번만 로드 (클라이언트 필터링 사용)

  // 2. 삭제 핸들러
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

  // 3. 필터링된 리스트 (화면에 보여줄 것)
  const filteredInbounds = filterDate 
    ? inbounds.filter(i => i.plan_date === filterDate)
    : inbounds;

  // 헬퍼: 품목명 요약
  const formatItemsSummary = (details: any[]) => {
    if (!details || details.length === 0) return "품목 없음";
    const name = details[0]?.item_master?.item_name || "미상";
    return details.length > 1 ? `${name} 외 ${details.length - 1}건` : name;
  };

  return (
    <div className="p-8 bg-black min-h-screen text-white font-[family-name:var(--font-geist-sans)]">
      
      {/* 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">🚛 입고 스케줄 (Inbound Schedule)</h1>
          <p className="text-gray-400 text-sm mt-1">입고 일정을 달력으로 확인하고 관리합니다.</p>
        </div>
        
        <div className="flex gap-2">
            {/* 보기 모드 토글 */}
            <div className="bg-gray-900 p-1 rounded-lg border border-gray-700 flex mr-2">
                <button 
                    onClick={() => setViewMode('LIST')}
                    className={`p-2 rounded flex items-center gap-2 text-sm font-bold transition ${viewMode === 'LIST' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <List size={16}/> 리스트
                </button>
                <button 
                    onClick={() => setViewMode('CALENDAR')}
                    className={`p-2 rounded flex items-center gap-2 text-sm font-bold transition ${viewMode === 'CALENDAR' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}`}
                >
                    <Calendar size={16}/> 캘린더
                </button>
            </div>

            <Link href="/inbound/direct" className="bg-gray-800 hover:bg-gray-700 border border-gray-600 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2">
                ⚡ 즉시 입고
            </Link>
            <Link href="/inbound/new" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium flex items-center gap-2">
                + 예정 등록
            </Link>
        </div>
      </div>

      {/* 📅 캘린더 뷰 영역 */}
      {viewMode === 'CALENDAR' && (
        <div className="mb-8 animate-fade-in">
             <CalendarComponent 
                currentDate={currentDate}
                setCurrentDate={setCurrentDate}
                inbounds={inbounds}
                selectedDate={filterDate}
                onSelectDate={(date) => setFilterDate(date)}
             />
        </div>
      )}

      {/* 🔍 선택된 날짜 정보 & 리스트 헤더 */}
      <div className="flex items-center justify-between mb-4 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
        <div className="flex items-center gap-3">
            <div className="bg-blue-900/30 p-2 rounded text-blue-400">
                <Calendar size={20} />
            </div>
            <div>
                {filterDate ? (
                    <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-white">{filterDate}</span>
                        <span className="text-gray-400 text-sm">입고 목록</span>
                        <button onClick={() => setFilterDate("")} className="ml-2 text-xs text-red-400 hover:underline">(필터 해제)</button>
                    </div>
                ) : (
                    <div className="text-gray-300 font-medium">전체 입고 목록 조회 중</div>
                )}
            </div>
        </div>
        <div className="text-sm text-gray-500">
            총 <span className="text-white font-bold">{filteredInbounds.length}</span>건
        </div>
      </div>

      {/* 📋 리스트 영역 */}
      <div className="grid gap-3">
        {loading ? (
            <div className="text-center py-10 text-gray-500">로딩 중...</div>
        ) : filteredInbounds.length === 0 ? (
            <div className="text-center py-16 text-gray-500 border border-gray-800 border-dashed rounded-lg bg-gray-900/20">
                {filterDate ? "선택하신 날짜에 입고 예정이 없습니다." : "등록된 입고 예정 건이 없습니다."}
            </div>
        ) : (
            filteredInbounds.map((ib) => (
                <div key={ib.inbound_no} className="group relative">
                    <Link href={`/inbound/${ib.inbound_no}`}>
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 flex justify-between items-center hover:border-blue-500 hover:bg-gray-900/80 transition pr-16">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="text-blue-400 font-bold">{ib.inbound_no}</span>
                                    <StatusBadge status={ib.status} />
                                </div>
                                <div className="text-gray-400 text-sm">
                                    {ib.plan_date} | <span className="text-white">{ib.supplier_name}</span>
                                </div>
                                <div className="text-gray-500 text-sm mt-1">
                                    📦 {formatItemsSummary(ib.details)}
                                </div>
                            </div>
                            <div className="hidden sm:block text-right border-l border-gray-800 pl-4 ml-4">
                                <div className="text-xs text-gray-500">품목수</div>
                                <div className="text-xl font-bold text-white">{ib.details?.length || 0}</div>
                            </div>
                        </div>
                    </Link>
                    
                    {ib.status === 'PENDING' && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(ib.inbound_no, ib.status);
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-red-500 hover:bg-red-900/20 rounded transition"
                            title="삭제"
                        >
                            <Trash2 size={18} />
                        </button>
                    )}
                </div>
            ))
        )}
      </div>
    </div>
  );
}
// ------------------------------------------------------------------
// 🧱 내부 컴포넌트: 심플 캘린더 (타입 정의 추가 ✨)
// ------------------------------------------------------------------

// 1. 여기서 타입을 미리 정의해줍니다.
interface CalendarProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  inbounds: any[];
  selectedDate: string;
  onSelectDate: (date: string) => void; // date가 'string'임을 명시
}

// 2. 정의한 타입을 컴포넌트에 적용합니다.
function CalendarComponent({ 
  currentDate, 
  setCurrentDate, 
  inbounds, 
  selectedDate, 
  onSelectDate 
}: CalendarProps) { // <--- 여기가 핵심 변경 포인트
    
    // 달력 생성 로직
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth(); // 0 ~ 11
    
    // 이번 달 1일의 요일 (0:일 ~ 6:토)
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    // 이번 달 마지막 날짜
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // (days 배열 타입 명시: 숫자 또는 null)
    const days: (number | null)[] = [];
    
    // 빈 칸 채우기
    for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
    // 날짜 채우기
    for (let i = 1; i <= daysInMonth; i++) days.push(i);

    // 날짜 포맷 (YYYY-MM-DD) 생성기
    const getDateString = (day: number) => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    // 월 이동
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    return (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 shadow-lg">
            {/* 달력 헤더 */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                    {year}년 {month + 1}월
                </h2>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white"><ChevronLeft/></button>
                    <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-sm bg-gray-800 hover:bg-gray-700 rounded text-gray-300">오늘</button>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-800 rounded text-gray-400 hover:text-white"><ChevronRight/></button>
                </div>
            </div>

            {/* 요일 헤더 */}
            <div className="grid grid-cols-7 mb-2 text-center">
                {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
                    <div key={d} className={`text-sm font-bold pb-2 ${i===0 ? 'text-red-500': i===6 ? 'text-blue-500' : 'text-gray-500'}`}>{d}</div>
                ))}
            </div>

            {/* 날짜 그리드 */}
            <div className="grid grid-cols-7 gap-2">
                {days.map((day, idx) => {
                    if (!day) return <div key={`empty-${idx}`} className="h-24"></div>; // 빈 칸

                    const dateStr = getDateString(day);
                    // 해당 날짜의 일정 찾기
                    const dayEvents = inbounds.filter((i:any) => i.plan_date === dateStr);
                    const isSelected = selectedDate === dateStr;
                    const isToday = dateStr === new Date().toISOString().split('T')[0];

                    return (
                        <div 
                            key={dateStr}
                            onClick={() => onSelectDate(dateStr === selectedDate ? "" : dateStr)} // 토글
                            className={`
                                h-24 border rounded-lg p-2 cursor-pointer transition relative flex flex-col justify-between
                                ${isSelected 
                                    ? 'bg-blue-900/40 border-blue-500' 
                                    : 'bg-black border-gray-800 hover:bg-gray-900 hover:border-gray-600'}
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`text-sm font-bold ${isToday ? 'bg-blue-600 text-white px-1.5 rounded-full' : 'text-gray-400'}`}>
                                    {day}
                                </span>
                                {dayEvents.length > 0 && (
                                    <span className="bg-yellow-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {dayEvents.length}
                                    </span>
                                )}
                            </div>
                            
                            {/* 일정 요약 (최대 2개만 표시) */}
                            <div className="space-y-1 mt-1">
                                {dayEvents.slice(0, 2).map((ev:any, i:number) => (
                                    <div key={i} className="text-[10px] text-gray-300 truncate bg-gray-800/50 px-1 rounded border-l-2 border-blue-500">
                                        {ev.supplier_name}
                                    </div>
                                ))}
                                {dayEvents.length > 2 && (
                                    <div className="text-[10px] text-gray-500 pl-1">+ {dayEvents.length - 2} more</div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// 상태 뱃지 컴포넌트 (타입 안전성 개선 ✨)
function StatusBadge({ status }: { status: string }) {
    // 1. 키(Key)가 문자열이고 값(Value)이 문자열임을 명시 (Record 사용)
    const styles: Record<string, string> = {
        'PENDING': 'bg-yellow-900/30 text-yellow-500 border-yellow-800',
        'PARTIAL': 'bg-blue-900/30 text-blue-400 border-blue-800',
        'CLOSED': 'bg-green-900/30 text-green-500 border-green-800'
    };

    // 2. 스타일이 없을 경우(예외)에 대한 처리
    const badgeStyle = styles[status] || 'bg-gray-800 text-gray-400 border-gray-700';

    return (
        <span className={`px-2 py-0.5 rounded text-xs border ${badgeStyle}`}>
            {status}
        </span>
    );
}