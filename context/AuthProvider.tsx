"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export interface UserProfile {
  id: string;
  email: string;
  user_name: string;
  department: string;
  role: 'ADMIN' | 'MANAGER' | 'WORKER' | 'GUEST';
  status: 'ACTIVE' | 'RETIRED';
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. 로그아웃: 즉시 UI 파괴 및 이동
  const signOut = useCallback(async () => {
    // UI 상태 초기화
    setUser(null);
    setProfile(null);
    setLoading(false);
    
    // 페이지 이동 우선
    router.replace('/login');

    try {
      await supabase.auth.signOut();
    } catch (err) {
      // 로그아웃 에러는 무시 (이미 화면은 이동했으므로)
    }
  }, [supabase, router]);

  // 2. 프로필 가져오기: 로딩 상태 제어 분리
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setProfile(data as UserProfile);
      }
    } catch (error) {
      console.error("프로필 갱신 실패 (세션은 유지):", error);
      // 여기서 signOut을 하지 않습니다. 
      // 일시적 DB 오류일 수 있으므로 기존 프로필이나 세션을 유지하는 게 UX상 낫습니다.
    } finally {
      // 성공하든 실패하든 로딩은 무조건 끈다.
      setLoading(false);
    }
  }, [supabase]);

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

    // 🚀 [핵심 수정] 과민 반응 방지 로직
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      // 1. 로그아웃 이벤트는 즉시 처리
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
        router.replace('/login');
        return;
      }

      // 2. 토큰 갱신이나 로그인 이벤트 발생 시
      if (session?.user) {
        // 🛡️ 이미 로그인된 유저가 그대로라면 로딩 화면을 띄우지 마세요! (조용히 넘어가기)
        // (현재 user state가 있고, 그 ID가 들어온 세션 ID와 같다면 무시)
        setUser((prevUser) => {
            if (prevUser?.id === session.user.id) {
                return prevUser; // 상태 변경 없음 -> 리렌더링 방지
            }
            return session.user;
        });

        // 프로필이 이미 있다면 굳이 로딩창 띄우고 다시 가져오지 않음
        setProfile((prevProfile) => {
            if (prevProfile) return prevProfile;
            
            // 프로필이 없을 때만 가져오기 (이때만 로딩 필요할 수도 있음)
            // 하지만 UX를 위해 여기서는 백그라운드에서 가져오고 로딩바는 안 띄우는 게 나음
            fetchProfile(session.user.id);
            return null;
        });
        
        // 🚨 중요: 여기서 setLoading(true)를 호출하지 않습니다!
        // 초기화(initializeAuth) 단계에서만 로딩을 보여주고, 
        // 중간에 세션이 갱신될 때는 로딩바 없이 조용히 처리합니다.
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile, router]);

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};