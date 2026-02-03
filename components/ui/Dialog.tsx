"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";

export interface DialogOptions {
  title?: string;
  message: string;
  type?: "confirm" | "alert" | "danger";
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface DialogProps {
  options: DialogOptions | null;
  onClose: (result: boolean) => void;
}

export default function Dialog({ options, onClose }: DialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (options) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [options]);

  if (!options) return null;

  const isDanger = options.type === "danger";
  const isConfirm = options.type === "confirm" || options.type === "danger";

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-200 
        ${isVisible ? "bg-black/80 backdrop-blur-sm opacity-100" : "bg-black/0 opacity-0 pointer-events-none"}
      `}
    >
      <div 
        className={`bg-gray-900 border border-gray-700 w-full max-w-sm rounded-xl shadow-2xl p-6 transform transition-all duration-300 scale-95
          ${isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"}
        `}
      >
        <div className="flex flex-col items-center text-center">
          <div className={`mb-4 p-3 rounded-full ${isDanger ? "bg-red-900/30 text-red-500" : "bg-blue-900/30 text-blue-500"}`}>
            {isDanger ? <AlertTriangle size={32} /> : <Info size={32} />}
          </div>
          
          <h3 className="text-xl font-bold text-white mb-2">{options.title || "알림"}</h3>
          <p className="text-gray-400 text-sm mb-6 leading-relaxed whitespace-pre-wrap">
            {options.message}
          </p>

          <div className="flex gap-3 w-full">
            {isConfirm && (
              <button
                onClick={() => onClose(false)}
                className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-bold transition border border-gray-700"
              >
                취소
              </button>
            )}
            <button
              onClick={() => onClose(true)}
              className={`flex-1 py-3 rounded-lg text-white font-bold transition flex items-center justify-center gap-2
                ${isDanger 
                  ? "bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/30" 
                  : "bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-900/30"}
              `}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}