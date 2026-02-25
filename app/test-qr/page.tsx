"use client";

import { useEffect, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { ArrowLeft, QrCode, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

export default function QrTestPage() {
  const router = useRouter();
  const [scannedData, setScannedData] = useState<string | null>(null);

  useEffect(() => {
    // QR 스캐너 초기화 세팅
    const scanner = new Html5QrcodeScanner(
      "reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      false
    );

    // 스캔 성공 시 실행될 콜백
    const onScanSuccess = (decodedText: string) => {
      setScannedData(decodedText);
      // 스캔 성공 시 카메라를 정지하려면 아래 주석 해제
      // scanner.clear(); 
    };

    scanner.render(onScanSuccess, (error) => {
      // 카메라 렌더링 중 발생하는 자잘한 에러는 무시
    });

    // 컴포넌트 언마운트 시 카메라 자원 해제
    return () => {
      scanner.clear().catch(console.error);
    };
  }, []);

  const handleReset = () => {
    setScannedData(null);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-950 min-h-screen text-slate-100 font-[family-name:var(--font-geist-sans)] flex justify-center pb-24">
      <div className="w-full max-w-md animate-fade-in">
        
        {/* 헤더 */}
        <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-4 pt-2">
          <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition">
            <ArrowLeft />
          </button>
          <h1 className="text-xl font-bold flex items-center gap-2 text-blue-400">
            <QrCode /> QR 데이터 분석기
          </h1>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          <p className="text-slate-400 text-sm text-center">
            아래 화면에 원료 라벨의 QR 코드를 비춰주세요.
          </p>

          {/* 스캐너 화면이 렌더링 될 영역 */}
          {/* html5-qrcode 라이브러리가 여기에 자체 UI를 주입합니다. */}
          <div className="bg-white rounded-xl overflow-hidden p-2">
             <div id="reader" className="w-full"></div>
          </div>

          {/* 스캔 결과 표시 영역 */}
          {scannedData && (
            <div className="bg-emerald-950/50 border border-emerald-500/50 rounded-xl p-5 animate-fade-in-up">
              <h2 className="text-emerald-400 font-bold text-sm mb-2 flex items-center gap-2">
                ✅ 스캔 성공! (Raw Data)
              </h2>
              <div className="bg-black/50 p-4 rounded-lg text-white font-mono text-lg break-all">
                {scannedData}
              </div>
              <button 
                onClick={handleReset}
                className="mt-4 w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-lg transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} /> 다시 스캔하기
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}