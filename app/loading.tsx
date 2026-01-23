// app/loading.tsx
import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        {/* 심플하고 깔끔한 스피너 */}
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-sm font-bold text-gray-400 animate-pulse">Loading Data...</p>
      </div>
    </div>
  );
}