"use client";

import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import ItemApprovalModal from "./ItemApprovalModal"; // 🚀 [수정] 같은 폴더이므로 './' 사용!// 
import { useRouter } from "next/navigation";

export default function ApprovalQueueButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { profile } = useAuth();
  const supabase = createClient();
  const router = useRouter();

  // ADMIN만 이 버튼을 볼 수 있습니다.
  const isAdmin = profile?.role === 'ADMIN';

  const fetchCount = async () => {
    if (!isAdmin) return;
    const { count } = await supabase
      .from('item_master_staging')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');
    setPendingCount(count || 0);
  };

  useEffect(() => {
    fetchCount();
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="relative flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2.5 rounded-lg text-sm font-bold border border-gray-700 transition shadow-sm"
      >
        <Bell size={16} className={pendingCount > 0 ? "text-yellow-400 animate-pulse" : ""} />
        승인대기
        {pendingCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold shadow-md">
            {pendingCount}
          </span>
        )}
      </button>

      <ItemApprovalModal 
        isOpen={isOpen} 
        onClose={() => { setIsOpen(false); fetchCount(); }} 
        onSuccess={() => { fetchCount(); router.refresh(); }} 
      />
    </>
  );
}