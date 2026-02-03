"use client";

import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, X, Info } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  removeToast: (id: number) => void;
}

export default function Toast({ toasts, removeToast }: ToastProps) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
}

function ToastItem({ toast, removeToast }: { toast: ToastMessage; removeToast: (id: number) => void }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 등장 애니메이션
    requestAnimationFrame(() => setIsVisible(true));

    // 3초 후 자동 삭제
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => removeToast(toast.id), 300); // 애니메이션 시간 후 실제 삭제
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const styles = {
    success: "bg-gray-900 border-green-500/50 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.15)]",
    error: "bg-gray-900 border-red-500/50 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]",
    info: "bg-gray-900 border-blue-500/50 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]",
  };

  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    info: <Info size={20} />,
  };

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-5 py-4 min-w-[300px] border rounded-lg shadow-xl transition-all duration-300 ease-out transform
        ${styles[toast.type]}
        ${isVisible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0"}
      `}
    >
      <span className="shrink-0">{icons[toast.type]}</span>
      <p className="flex-1 text-sm font-medium text-gray-200">{toast.message}</p>
      <button 
        onClick={() => { setIsVisible(false); setTimeout(() => removeToast(toast.id), 300); }} 
        className="text-gray-500 hover:text-white transition"
      >
        <X size={16} />
      </button>
    </div>
  );
}