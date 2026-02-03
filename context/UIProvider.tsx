"use client";

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from "lucide-react";

// ----------------------------------------------------------------------
// 1. 타입 정의
// ----------------------------------------------------------------------
type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface AlertState {
  isOpen: boolean;
  message: string;
  type: ToastType;
  resolve: (value: void | PromiseLike<void>) => void;
}

interface ConfirmState {
  isOpen: boolean;
  message: string;
  type: ToastType;
  resolve: (value: boolean | PromiseLike<boolean>) => void;
}

interface UIContextType {
  toast: {
    success: (msg: string) => void;
    error: (msg: string) => void;
    info: (msg: string) => void;
    warning: (msg: string) => void;
  };
  // 🚀 새로 추가된 기능 (Promise 기반)
  alert: (message: string, type?: ToastType) => Promise<void>;
  confirm: (message: string, type?: ToastType) => Promise<boolean>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within a UIProvider");
  return context;
}

// ----------------------------------------------------------------------
// 2. Provider 컴포넌트
// ----------------------------------------------------------------------
export function UIProvider({ children }: { children: ReactNode }) {
  // --- Toast State ---
  const [toasts, setToasts] = useState<Toast[]>([]);

  // --- Modal State ---
  const [alertState, setAlertState] = useState<AlertState>({ isOpen: false, message: "", type: "info", resolve: () => {} });
  const [confirmState, setConfirmState] = useState<ConfirmState>({ isOpen: false, message: "", type: "info", resolve: () => {} });

  // 🔹 Toast Logic
  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 🔹 Alert Logic (Promise)
  const showAlert = useCallback((message: string, type: ToastType = "info") => {
    return new Promise<void>((resolve) => {
      setAlertState({ isOpen: true, message, type, resolve });
    });
  }, []);

  const closeAlert = useCallback(() => {
    alertState.resolve(); // Promise 해결
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  }, [alertState]);

  // 🔹 Confirm Logic (Promise)
  const showConfirm = useCallback((message: string, type: ToastType = "info") => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ isOpen: true, message, type, resolve });
    });
  }, []);

  const closeConfirm = useCallback((result: boolean) => {
    confirmState.resolve(result); // true 또는 false 반환
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, [confirmState]);

  // Context Value
  const value: UIContextType = {
    toast: {
      success: (msg) => addToast(msg, "success"),
      error: (msg) => addToast(msg, "error"),
      info: (msg) => addToast(msg, "info"),
      warning: (msg) => addToast(msg, "warning"),
    },
    alert: showAlert,
    confirm: showConfirm,
  };

  return (
    <UIContext.Provider value={value}>
      {children}
      
      {/* 🟢 전역 Toast 컨테이너 */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex items-center gap-3 p-4 rounded-lg shadow-2xl border transition-all animate-fade-in-down ${
            t.type === 'success' ? 'bg-gray-900 border-green-500/50 text-green-400' :
            t.type === 'error' ? 'bg-gray-900 border-red-500/50 text-red-400' :
            t.type === 'warning' ? 'bg-gray-900 border-yellow-500/50 text-yellow-400' :
            'bg-gray-900 border-blue-500/50 text-blue-400'
          }`}>
            {t.type === 'success' && <CheckCircle size={20} />}
            {t.type === 'error' && <AlertCircle size={20} />}
            {t.type === 'warning' && <AlertTriangle size={20} />}
            {t.type === 'info' && <Info size={20} />}
            <span className="text-sm font-medium flex-1">{t.message}</span>
            <button onClick={() => removeToast(t.id)}><X size={16} className="opacity-50 hover:opacity-100" /></button>
          </div>
        ))}
      </div>

      {/* 🟠 전역 Alert 모달 */}
      {alertState.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center transform transition-all scale-100">
             <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                alertState.type === 'error' ? 'bg-red-900/30 text-red-500' : 
                alertState.type === 'success' ? 'bg-green-900/30 text-green-500' : 'bg-blue-900/30 text-blue-500'
             }`}>
                {alertState.type === 'error' ? <AlertCircle size={28} /> : 
                 alertState.type === 'success' ? <CheckCircle size={28} /> : <Info size={28} />}
             </div>
             <p className="text-white text-lg font-bold mb-6 whitespace-pre-wrap">{alertState.message}</p>
             <button onClick={closeAlert} className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition">
               확인
             </button>
          </div>
        </div>
      )}

      {/* 🔴 전역 Confirm 모달 */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full mx-4 text-center">
             <div className="mx-auto w-12 h-12 rounded-full bg-yellow-900/30 text-yellow-500 flex items-center justify-center mb-4">
                <AlertTriangle size={28} />
             </div>
             <p className="text-white text-lg font-bold mb-2">확인 필요</p>
             <p className="text-gray-400 text-sm mb-6 whitespace-pre-wrap">{confirmState.message}</p>
             <div className="flex gap-3">
               <button onClick={() => closeConfirm(false)} className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold transition">
                 취소
               </button>
               <button onClick={() => closeConfirm(true)} className={`flex-1 py-3 rounded-xl font-bold text-white transition ${
                   confirmState.type === 'warning' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
               }`}>
                 확인
               </button>
             </div>
          </div>
        </div>
      )}

    </UIContext.Provider>
  );
}