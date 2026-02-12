"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Scanner } from '@yudiel/react-qr-scanner';

interface Props {
  onClose: () => void;
  onScan: (code: string) => void;
}

export default function QRScannerModal({ onClose, onScan }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
      
      {/* 헤더 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-10 bg-gradient-to-b from-black/80 to-transparent">
        <h2 className="text-white font-bold text-lg">QR 코드 스캔</h2>
        <button 
          onClick={onClose} 
          className="bg-gray-800/50 p-2 rounded-full text-white hover:bg-gray-700 backdrop-blur-sm"
        >
          <X size={24} />
        </button>
      </div>

      {/* 카메라 영역 */}
      <div className="flex-1 flex items-center justify-center relative bg-black">
        {/* 🔴 [핵심 수정] 
            [&_video]: ... 클래스를 사용하여 내부 video 태그를 강제로 선택 
            !w-full !h-full !object-cover : 라이브러리 인라인 스타일 무시하고 꽉 채우기
        */}
        <div className="w-full max-w-md aspect-square relative overflow-hidden rounded-2xl border-2 border-gray-800 mx-4 [&_video]:!object-cover [&_video]:!w-full [&_video]:!h-full">
            
            <Scanner 
                onScan={(result) => {
                    if (result && result.length > 0) {
                        onScan(result[0].rawValue);
                    }
                }}
                onError={(error) => {
                    console.log(error);
                }}
                components={{
                    finder: false
                }}
                // styles 속성은 제거했습니다. (위의 className으로 제어)
            />
            
            {/* 스캔 가이드 라인 */}
            <div className="absolute inset-0 pointer-events-none p-8 flex items-center justify-center">
                <div className="w-full h-full border-2 border-blue-500/80 relative rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 -mt-[2px] -ml-[2px]"></div>
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 -mt-[2px] -mr-[2px]"></div>
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 -mb-[2px] -ml-[2px]"></div>
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 -mb-[2px] -mr-[2px]"></div>
                    <div className="absolute top-0 left-0 w-full h-1 bg-blue-400/50 shadow-[0_0_10px_rgba(59,130,246,0.8)] animate-scan-line"></div>
                </div>
            </div>
        </div>
      </div>

      {/* 하단 안내 */}
      <div className="p-8 text-center text-gray-400 bg-black pb-16">
        <p className="text-lg font-bold text-white mb-1">QR 코드를 스캔하세요</p>
        <p className="text-sm">Location 바코드를 사각형 안에 맞춰주세요.</p>
      </div>
    </div>
  );
}