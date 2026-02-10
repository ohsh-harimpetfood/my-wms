"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth, UserProfile } from "@/context/AuthProvider";
import { useUI } from "@/context/UIProvider";
import { Loader2, ShieldCheck, UserCog, Settings, Check, X, Lock } from "lucide-react";

// --- 타입 정의 ---
interface RolePermission {
  id: number;
  role: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
}

type TabType = 'USERS' | 'PERMISSIONS';

export default function AdminPage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const { toast } = useUI();

  const [activeTab, setActiveTab] = useState<TabType>('USERS');
  
  // 데이터 상태
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(false);

  // --- 데이터 불러오기 ---
  const fetchData = async () => {
    setLoading(true);
    
    // 1. 사용자 목록
    const { data: usersData } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (usersData) setUsers(usersData as UserProfile[]);

    // 2. 권한 설정 목록
    const { data: permData } = await supabase
      .from("role_permissions")
      .select("*")
      .order("id", { ascending: true }); // ID 순 정렬

    if (permData) setPermissions(permData as RolePermission[]);
    
    setLoading(false);
  };

  useEffect(() => {
    if (profile?.role === 'ADMIN') fetchData();
  }, [profile]);

  // --- 핸들러: 사용자 역할 변경 ---
  const handleUserRoleChange = async (userId: string, newRole: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({ role: newRole })
      .eq("id", userId);

    if (error) toast.error("권한 변경 실패");
    else {
      toast.success("사용자 권한이 변경되었습니다.");
      fetchData(); // 목록 갱신
    }
  };

  // --- 핸들러: 권한 기능 토글 ---
  const handlePermissionToggle = async (permId: number, currentStatus: boolean) => {
    // 낙관적 업데이트 (UI 먼저 반영)
    setPermissions(prev => prev.map(p => p.id === permId ? { ...p, is_enabled: !currentStatus } : p));

    const { error } = await supabase
      .from("role_permissions")
      .update({ is_enabled: !currentStatus })
      .eq("id", permId);

    if (error) {
      toast.error("설정 저장 실패");
      fetchData(); // 실패 시 원복
    } else {
      toast.success("설정이 저장되었습니다.");
    }
  };

  // --- 그룹화: 권한 목록을 Role별로 묶기 ---
  const groupedPermissions = permissions.reduce((acc, curr) => {
    if (!acc[curr.role]) acc[curr.role] = [];
    acc[curr.role].push(curr);
    return acc;
  }, {} as Record<string, RolePermission[]>);

  // 역할 표시 순서 정의
  const roleOrder = ['WORKER', 'MANAGER', 'GUEST'];

  if (loading && users.length === 0) {
    return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="p-4 md:p-8 bg-black min-h-screen text-white pb-32">
      <div className="max-w-5xl mx-auto">
        
        {/* 1. 헤더 & 탭 메뉴 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 border-b border-gray-800 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-blue-500" size={32} />
            <h1 className="text-2xl font-bold">시스템 관리자</h1>
          </div>
          
          <div className="flex bg-gray-900 p-1 rounded-lg">
            <button 
              onClick={() => setActiveTab('USERS')}
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'USERS' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              사용자 관리
            </button>
            <button 
              onClick={() => setActiveTab('PERMISSIONS')}
              className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'PERMISSIONS' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              기능 권한 설정
            </button>
          </div>
        </div>

        {/* 2. 컨텐츠 영역 */}
        {activeTab === 'USERS' ? (
          // --- [탭 1] 사용자 관리 ---
          <div className="grid gap-4 animate-fade-in">
            {users.map((u) => (
              <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex flex-col md:flex-row justify-between items-center gap-4 hover:border-gray-700 transition">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${u.role === 'ADMIN' ? 'bg-purple-900/50 text-purple-400' : 'bg-gray-800 text-blue-400'}`}>
                    <UserCog size={20} />
                  </div>
                  <div>
                    <p className="font-bold flex items-center gap-2">
                      {u.user_name} 
                      <span className="text-xs bg-gray-800 px-2 py-0.5 rounded text-gray-400 border border-gray-700">{u.department}</span>
                    </p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <select 
                    value={u.role}
                    onChange={(e) => handleUserRoleChange(u.id, e.target.value)}
                    disabled={u.role === 'ADMIN' && u.id === profile?.id} // 자기 자신 강등 방지
                    className="w-full md:w-40 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:border-blue-500 outline-none disabled:opacity-50"
                  >
                    <option value="GUEST">GUEST (대기)</option>
                    <option value="WORKER">WORKER (작업자)</option>
                    <option value="MANAGER">MANAGER (관리자)</option>
                    <option value="ADMIN">ADMIN (마스터)</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // --- [탭 2] 권한 기능 설정 ---
          <div className="grid gap-8 animate-fade-in">
            {roleOrder.map((roleKey) => (
              <div key={roleKey} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                {/* 역할 헤더 */}
                <div className={`px-6 py-4 border-b border-gray-800 flex items-center gap-3 ${
                  roleKey === 'MANAGER' ? 'bg-blue-900/10' : 
                  roleKey === 'WORKER' ? 'bg-green-900/10' : 'bg-red-900/10'
                }`}>
                  <Settings size={20} className={roleKey === 'MANAGER' ? 'text-blue-400' : roleKey === 'WORKER' ? 'text-green-400' : 'text-red-400'} />
                  <h3 className="font-bold text-lg">{roleKey} 권한 설정</h3>
                </div>

                {/* 권한 스위치 목록 */}
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupedPermissions[roleKey]?.map((perm) => (
                    <div 
                      key={perm.id} 
                      onClick={() => handlePermissionToggle(perm.id, perm.is_enabled)}
                      className={`
                        cursor-pointer border rounded-xl p-4 flex items-center justify-between transition-all
                        ${perm.is_enabled 
                          ? 'bg-blue-500/10 border-blue-500/50 hover:bg-blue-500/20' 
                          : 'bg-black border-gray-800 hover:border-gray-600 opacity-60 hover:opacity-100'}
                      `}
                    >
                      <span className={`text-sm font-bold ${perm.is_enabled ? 'text-white' : 'text-gray-500'}`}>
                        {perm.feature_name}
                      </span>
                      
                      <div className={`
                        w-10 h-6 rounded-full flex items-center transition-all p-1
                        ${perm.is_enabled ? 'bg-blue-500 justify-end' : 'bg-gray-700 justify-start'}
                      `}>
                        <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                      </div>
                    </div>
                  ))}
                  {(!groupedPermissions[roleKey] || groupedPermissions[roleKey].length === 0) && (
                    <p className="text-gray-500 text-sm p-4">설정된 권한 항목이 없습니다.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}