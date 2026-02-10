"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

// --- 1. 타입 정의 ---
export interface UserProfile {
  id: string;
  email: string;
  user_name: string;
  department: string;
  role: 'ADMIN' | 'MANAGER' | 'WORKER' | 'GUEST';
  status: 'ACTIVE' | 'RETIRED';
}

export interface RolePermission {
  id: number;
  role: 'ADMIN' | 'MANAGER' | 'WORKER' | 'GUEST';
  feature_key: string;
  feature_name: string;
  is_enabled: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  permissions: RolePermission[]; // 🚀 추가된 권한 목록
  loading: boolean;
  signOut: () => Promise<void>;
  checkPermission: (featureKey: string) => boolean; // 🚀 권한 체크 헬퍼 함수
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<RolePermission[]>([]); // 🚀 권한 상태
  const [loading, setLoading] = useState(true);

  // 🚪 로그아웃 로직
  const signOut = useCallback(async () => {
    setUser(null);
    setProfile(null);
    setPermissions([]); // 권한 초기화
    setLoading(false);
    
    router.replace('/login');

    try {
      await supabase.auth.signOut();
    } catch (err) {
      // 무시
    }
  }, [supabase, router]);

  // 📡 권한 목록 가져오기 (내 Role에 맞는 것만)
  const fetchPermissions = useCallback(async (role: string) => {
    try {
      // 내 Role에 해당하는 권한 설정만 가져옵니다.
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .eq('role', role);

      if (!error && data) {
        setPermissions(data as RolePermission[]);
      }
    } catch (err) {
      console.error("권한 로딩 실패:", err);
    }
  }, [supabase]);

  // 📡 프로필 가져오기 (성공 시 권한도 로딩)
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        const userProfile = data as UserProfile;
        setProfile(userProfile);
        
        // 🚀 프로필 로딩 성공 후, 해당 Role의 권한 목록을 가져옵니다.
        if (userProfile.role) {
          await fetchPermissions(userProfile.role);
        }
      }
    } catch (error) {
      console.error("프로필 갱신 실패:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchPermissions]);

  // 🛡️ 권한 체크 헬퍼 함수
  const checkPermission = useCallback((featureKey: string) => {
    // 1. 관리자는 무조건 프리패스 (안전장치)
    if (profile?.role === 'ADMIN') return true;

    // 2. 권한 목록에서 해당 기능 찾기
    const perm = permissions.find(p => p.feature_key === featureKey);
    
    // 3. 설정값이 있으면 그 값(is_enabled)을 따르고, 없으면 기본적으로 false(차단)
    return perm ? perm.is_enabled : false;
  }, [profile, permissions]);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      } catch (err) {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setPermissions([]);
        setLoading(false);
        router.replace('/login');
        return;
      }

      if (session?.user) {
        setUser((prevUser) => {
            if (prevUser?.id === session.user.id) return prevUser;
            return session.user;
        });

        // 세션 갱신 시 프로필이 없으면 다시 로드
        setProfile((prevProfile) => {
            if (prevProfile) return prevProfile;
            fetchProfile(session.user.id);
            return null;
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, router]);

  return (
    <AuthContext.Provider value={{ user, profile, permissions, loading, signOut, checkPermission }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};