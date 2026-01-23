// components/PaginationControls.tsx
"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

interface PaginationControlsProps {
  totalCount: number;      
  pageSize?: number;       
  siblingCount?: number;   
}

export default function PaginationControls({
  totalCount,
  pageSize = 10,
  siblingCount = 1,
}: PaginationControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // 1. 현재 페이지 및 전체 페이지 계산
  const currentPage = Number(searchParams.get("page") ?? "1");
  const totalPages = Math.ceil(totalCount / pageSize);

  // 2. 직접 입력(Go to) 기능을 위한 로컬 state
  const [inputPage, setInputPage] = useState(String(currentPage));

  useEffect(() => {
    setInputPage(String(currentPage));
  }, [currentPage]);

  // 3. 페이지 이동 URL 생성 함수
  const createPageUrl = (pageNumber: number | string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", pageNumber.toString());
    return `?${params.toString()}`;
  };

  // 4. 페이지 점프 및 이동 함수 (✨ 여기가 핵심 수정 포인트!)
  const moveToPage = (page: number) => {
    if (page < 1 || page > totalPages) return;
    
    // { scroll: false } 옵션을 추가하여 페이지가 바뀌어도 스크롤 위치를 유지합니다.
    router.push(createPageUrl(page), { scroll: false });
  };

  // 5. 직접 입력 후 엔터키 처리
  const handleInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetPage = Number(inputPage);
    if (targetPage >= 1 && targetPage <= totalPages) {
      moveToPage(targetPage);
    } else {
      setInputPage(String(currentPage));
    }
  };

  // 6. 페이지네이션 범위 생성
  const generatePagination = () => {
    if (totalPages <= 5 + siblingCount * 2) {
      return range(1, totalPages);
    }
    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);
    const showLeftDots = leftSiblingIndex > 2;
    const showRightDots = rightSiblingIndex < totalPages - 2;
    const firstPageIndex = 1;
    const lastPageIndex = totalPages;

    if (!showLeftDots && showRightDots) {
      let leftItemCount = 3 + 2 * siblingCount;
      let leftRange = range(1, leftItemCount);
      return [...leftRange, "...", totalPages];
    }
    if (showLeftDots && !showRightDots) {
      let rightItemCount = 3 + 2 * siblingCount;
      let rightRange = range(totalPages - rightItemCount + 1, totalPages);
      return [firstPageIndex, "...", ...rightRange];
    }
    if (showLeftDots && showRightDots) {
      let middleRange = range(leftSiblingIndex, rightSiblingIndex);
      return [firstPageIndex, "...", ...middleRange, "...", lastPageIndex];
    }
    return [];
  };

  const range = (start: number, end: number) => {
    let length = end - start + 1;
    return Array.from({ length }, (_, idx) => idx + start);
  };

  const paginationRange = generatePagination();

  if (currentPage === 0 || totalPages === 0) {
    return null;
  }

  return (
    <div className="flex flex-col xl:flex-row items-center justify-between gap-4 p-4 bg-black border-t border-gray-800 mt-4 rounded-b-lg">
      {/* 🟢 [왼쪽] 정보 표시 & 직접 이동 입력창 */}
      <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-400">
        <div>
            전체 <span className="text-white font-bold">{totalCount.toLocaleString()}</span>개 
            <span className="mx-2 text-gray-600">|</span>
            <span className="text-white font-bold">{currentPage}</span> / {totalPages} 페이지
        </div>
        
        <form onSubmit={handleInputSubmit} className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Go to</span>
            <input 
                type="number"
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                className="w-16 bg-gray-900 border border-gray-700 text-white text-center text-sm rounded focus:outline-none focus:border-blue-500 py-1"
                min={1}
                max={totalPages}
            />
            <button 
                type="submit"
                className="bg-gray-800 text-gray-300 text-xs px-2 py-1.5 rounded border border-gray-700 hover:bg-gray-700 hover:text-white transition-colors"
            >
                이동
            </button>
        </form>
      </div>

      {/* 🟢 [오른쪽] 컨트롤 버튼들 */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* << 10페이지 뒤로 점프 */}
        <button
          className="px-2 py-2 text-sm rounded-md border border-gray-800 bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          disabled={currentPage <= 1}
          onClick={() => moveToPage(currentPage - 10)}
          title="-10페이지"
        >
          &lt;&lt;
        </button>

        {/* < 이전 */}
        <button
          className="px-3 py-2 text-sm rounded-md border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          disabled={currentPage <= 1}
          onClick={() => moveToPage(currentPage - 1)}
        >
          이전
        </button>

        {/* 숫자 버튼들 */}
        <div className="flex items-center gap-1">
          {paginationRange.map((page, index) => {
            if (page === "...") {
              return <span key={index} className="px-2 text-gray-500">...</span>;
            }
            return (
              <button
                key={index}
                onClick={() => moveToPage(Number(page))}
                className={`min-w-[32px] h-[32px] flex items-center justify-center text-sm rounded-md border transition-all
                  ${page === currentPage 
                    ? "bg-white text-black border-white font-bold shadow-sm" 
                    : "bg-gray-900 text-gray-400 border-gray-800 hover:bg-gray-800 hover:text-gray-200"
                  }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        {/* > 다음 */}
        <button
          className="px-3 py-2 text-sm rounded-md border border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          disabled={currentPage >= totalPages}
          onClick={() => moveToPage(currentPage + 1)}
        >
          다음
        </button>

        {/* >> 10페이지 앞으로 점프 */}
        <button
          className="px-2 py-2 text-sm rounded-md border border-gray-800 bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          disabled={currentPage >= totalPages}
          onClick={() => moveToPage(currentPage + 10)}
          title="+10페이지"
        >
          &gt;&gt;
        </button>
      </div>
    </div>
  );
}