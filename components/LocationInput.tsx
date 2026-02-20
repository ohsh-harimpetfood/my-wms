"use client";

import { X, Search, QrCode } from "lucide-react";
import { useRef, useState } from "react";
// 🚀 [수정] 작성자님의 트리 구조에 맞춰 경로 수정 (common 제거)
import QRScannerModal from "@/components/QRScannerModal";
import LocationMapSelector from "@/components/LocationMapSelector";

interface LocationInputProps {
  value: string;
  onChange: (val: string) => void;
  onEnter?: () => void;      // 엔터키 입력 시 (스캐너 대응)
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  showQrButton?: boolean;    // QR 버튼 표시 여부
  showMapButton?: boolean;   // 맵 버튼 표시 여부
}

export default function LocationInput({
  value,
  onChange,
  onEnter,
  placeholder = "LOC CODE",
  autoFocus = false,
  disabled = false,
  showQrButton = true,
  showMapButton = true,
}: LocationInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 🟢 내부 상태로 모달 제어 (페이지가 깔끔해짐)
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  // ⌨️ 키보드 핸들러
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (onEnter) onEnter();
      inputRef.current?.blur(); // 모바일 키패드 닫기
    }
  };

  // 🔄 입력값 처리 (대문자 자동 변환)
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value.toUpperCase());
  };

  // 📷 QR 스캔 성공 핸들러
  const handleScan = (code: string) => {
    if (code) {
      onChange(code.toUpperCase());
      setIsQrOpen(false); 
    }
  };

  // 🗺️ 맵 선택 핸들러
  const handleMapSelect = (locId: string) => {
    onChange(locId);
    setIsMapOpen(false);
  };

  return (
    <>
      <div className="flex items-center gap-2 w-full h-14">
        {/* 1. 입력 필드 (타이핑 & HID 스캐너) */}
        <div className="relative flex-1 h-full">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            autoFocus={autoFocus}
            disabled={disabled}
            className="w-full h-full bg-black border border-gray-700 rounded-lg pl-4 pr-10 text-white font-mono text-xl uppercase placeholder-gray-600 outline-none focus:border-blue-500 transition disabled:bg-gray-900 disabled:text-gray-500"
          />
          {!disabled && value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white p-1"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* 2. QR 스캔 버튼 (모바일용) */}
        {showQrButton && !disabled && (
          <button
            type="button"
            onClick={() => setIsQrOpen(true)}
            className="h-full aspect-square flex items-center justify-center bg-gray-800 border border-gray-700 rounded-lg text-white hover:bg-gray-700 hover:text-blue-400 hover:border-blue-500 transition active:scale-95"
            title="QR 코드 스캔"
          >
            <QrCode size={24} />
          </button>
        )}

        {/* 3. 맵 검색 버튼 (PC/모바일 공용) */}
        {showMapButton && !disabled && (
          <button
            type="button"
            onClick={() => setIsMapOpen(true)}
            className="h-full aspect-square flex items-center justify-center bg-gray-800 border border-gray-700 rounded-lg text-blue-400 hover:bg-gray-700 hover:text-blue-300 hover:border-blue-500 transition active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            title="랙 위치 선택"
          >
            <Search size={24} />
          </button>
        )}
      </div>

      {/* 🟢 내장된 모달들 */}
      {isQrOpen && (
        <QRScannerModal 
          onClose={() => setIsQrOpen(false)}
          onScan={handleScan}
        />
      )}

      {isMapOpen && (
        <LocationMapSelector 
            onClose={() => setIsMapOpen(false)}
            onSelect={handleMapSelect}
        />
      )}
    </>
  );
}