"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth, UserProfile } from "@/context/AuthProvider";
import { useUI } from "@/context/UIProvider";
import { Loader2, ShieldCheck, UserCog, Settings, Activity, Network, Check, X } from "lucide-react";

// 🚀 컴포넌트 Import
import SystemMap from "@/components/SystemMap"; 
import ArchitectureDiagram from "@/components/ArchitectureDiagram"; 

// --- [수정] 누락되었던 타입 정의 추가 ---
interface RolePermission {
  id: number;
  role: string;
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
}

type TabType = 'USERS' | 'PERMISSIONS' | 'MONITOR' | 'ARCHITECTURE';

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
      .order("id", { ascending: true });

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
      fetchData();
    }
  };

  // --- 핸들러: 권한 기능 토글 ---
  const handlePermissionToggle = async (permId: number, currentStatus: boolean) => {
    setPermissions(prev => prev.map(p => p.id === permId ? { ...p, is_enabled: !currentStatus } : p));

    const { error } = await supabase
      .from("role_permissions")
      .update({ is_enabled: !currentStatus })
      .eq("id", permId);

    if (error) {
      toast.error("설정 저장 실패");
      fetchData();
    } else {
      toast.success("설정이 저장되었습니다.");
    }
  };

  // --- 그룹화 로직 ---
  const groupedPermissions = permissions.reduce((acc, curr) => {
    if (!acc[curr.role]) acc[curr.role] = [];
    acc[curr.role].push(curr);
    return acc;
  }, {} as Record<string, RolePermission[]>);

  const roleOrder = ['WORKER', 'MANAGER', 'GUEST'];

  if (loading && users.length === 0) {
    return <div className="flex h-screen items-center justify-center bg-black"><Loader2 className="animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="p-4 md:p-8 bg-black min-h-screen text-white pb-32">
      <div className="max-w-6xl mx-auto">
        
        {/* 1. 헤더 & 탭 메뉴 */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 border-b border-gray-800 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-blue-500" size={32} />
            <h1 className="text-2xl font-bold">시스템 관리 콘솔</h1>
          </div>
          
          <div className="flex bg-gray-900 p-1 rounded-lg overflow-x-auto custom-scrollbar">
            <TabButton active={activeTab === 'USERS'} label="사용자 관리" onClick={() => setActiveTab('USERS')} />
            <TabButton active={activeTab === 'PERMISSIONS'} label="권한 설정" onClick={() => setActiveTab('PERMISSIONS')} />
            <TabButton active={activeTab === 'MONITOR'} label="운영 모니터" icon={<Activity size={14}/>} onClick={() => setActiveTab('MONITOR')} />
            <TabButton active={activeTab === 'ARCHITECTURE'} label="시스템 구조" icon={<Network size={14}/>} onClick={() => setActiveTab('ARCHITECTURE')} />
          </div>
        </div>

        {/* 2. 컨텐츠 영역 */}
        <div className="animate-fade-in">
          {/* 사용자 관리 */}
          {activeTab === 'USERS' && (
            <div className="grid gap-4">
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
                  <select 
                    value={u.role}
                    onChange={(e) => handleUserRoleChange(u.id, e.target.value)}
                    disabled={u.role === 'ADMIN' && u.id === profile?.id}
                    className="w-full md:w-40 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm font-bold text-white focus:border-blue-500 outline-none disabled:opacity-50"
                  >
                    <option value="GUEST">GUEST</option>
                    <option value="WORKER">WORKER</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              ))}
            </div>
          )}

          {/* 권한 설정 */}
          {activeTab === 'PERMISSIONS' && (
            <div className="grid gap-8">
              {roleOrder.map((roleKey) => (
                <div key={roleKey} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-800 bg-gray-800/30 flex items-center gap-3">
                    <Settings size={20} className="text-blue-400" />
                    <h3 className="font-bold text-lg">{roleKey} 권한 설정</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupedPermissions[roleKey]?.map((perm) => (
                      <div 
                        key={perm.id} 
                        onClick={() => handlePermissionToggle(perm.id, perm.is_enabled)}
                        className={`cursor-pointer border rounded-xl p-4 flex items-center justify-between transition-all ${perm.is_enabled ? 'bg-blue-500/10 border-blue-500/50' : 'bg-black border-gray-800 opacity-60'}`}
                      >
                        <span className={`text-sm font-bold ${perm.is_enabled ? 'text-white' : 'text-gray-500'}`}>{perm.feature_name}</span>
                        <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-all ${perm.is_enabled ? 'bg-blue-500 justify-end' : 'bg-gray-700 justify-start'}`}>
                          <div className="w-4 h-4 bg-white rounded-full shadow-sm" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 운영 모니터 */}
          {activeTab === 'MONITOR' && (
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-green-500"><Activity size={20}/> Operation Flow</h2>
              <p className="text-gray-400 text-sm mb-6">실시간 물류 데이터 트래픽을 모니터링합니다.</p>
              <SystemMap />
            </div>
          )}

          {/* 시스템 구조 */}
          {activeTab === 'ARCHITECTURE' && (
            <div className="bg-gray-900 border border-gray-800 p-6 rounded-2xl">
              <h2 className="text-xl font-bold mb-2 flex items-center gap-2 text-blue-500"><Network size={20}/> Dependency Graph</h2>
              <p className="text-gray-400 text-sm mb-6">프로젝트 파일 의존성 및 Import 구조를 시각화합니다.</p>
              <ArchitectureDiagram />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, label, icon, onClick }: { active: boolean, label: string, icon?: React.ReactNode, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${active ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
    >
      {icon} {label}
    </button>
  );
}