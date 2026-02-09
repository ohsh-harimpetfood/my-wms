"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth, UserProfile } from "@/context/AuthProvider";
import { useUI } from "@/context/UIProvider";
import { Loader2, ShieldCheck, UserCog, Mail, ChevronRight } from "lucide-react";

export default function AdminUsersPage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const { toast, alert: customAlert } = useUI();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [fetching, setFetching] = useState(true);

  const fetchUsers = async () => {
    setFetching(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setUsers(data as UserProfile[]);
    setFetching(false);
  };

  useEffect(() => {
    if (profile?.role === 'ADMIN') fetchUsers();
  }, [profile]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) {
      toast.error("권한 변경 실패");
    } else {
      toast.success("권한이 성공적으로 변경되었습니다.");
      fetchUsers();
    }
  };

  if (fetching) return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-blue-500" /></div>;

  return (
    <div className="p-8 bg-black min-h-screen text-white">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8 border-b border-gray-800 pb-6">
          <ShieldCheck className="text-blue-500" size={32} />
          <h1 className="text-2xl font-bold">사용자 권한 관리</h1>
        </div>

        <div className="grid gap-4">
          {users.map((u) => (
            <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-blue-400"><UserCog size={20} /></div>
                <div>
                  <p className="font-bold">{u.user_name} <span className="text-xs text-gray-500 ml-2">{u.department}</span></p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
              </div>
              <select 
                value={u.role}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                className="bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm font-bold text-blue-400 outline-none"
              >
                <option value="GUEST">GUEST (대기)</option>
                <option value="WORKER">WORKER (작업자)</option>
                <option value="MANAGER">MANAGER (관리자)</option>
                <option value="ADMIN">ADMIN (마스터)</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}