import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import { getCurrentUser, logout as apiLogout } from '../services/mockBackend';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginUser: (user: User) => void;
  logoutUser: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let initialLoadDone = false;

    // İlk yüklemeyi bir kez tamamlar. Sonraki çağrılar no-op.
    const completeLoad = (u: User | null) => {
      if (cancelled || initialLoadDone) return;
      initialLoadDone = true;
      if (u) setUser(u);
      setIsLoading(false);
    };

    // 5s güvenlik ağı — hiçbir event gelmediyse yine de loading'i bitir
    const timeout = setTimeout(() => completeLoad(null), 5000);

    // Hızlı yol: önce session var mı diye bak.
    // Yoksa → hemen login göster.
    // Varsa → profil getirmeye çalış; başarısızsa auth event'lerini bekle
    // (null override'ı önlemek için completeLoad'u sadece başarıda çağırıyoruz).
    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (cancelled) return;
        if (!session) { completeLoad(null); return; }
        const u = await getCurrentUser().catch(() => null);
        if (!cancelled && u) completeLoad(u);
        // u null ise: SIGNED_IN / TOKEN_REFRESHED / INITIAL_SESSION halleder
      })
      .catch(() => completeLoad(null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT') {
        setUser(null);
        completeLoad(null); // henüz bitmemişse bitir
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        if (!session) { completeLoad(null); return; }
        const u = await getCurrentUser().catch(() => null);
        if (!cancelled && u) {
          setUser(u);          // her zaman güncelle (token yenileme vb.)
          completeLoad(u);     // henüz bitmemişse bitir
        }
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const loginUser = (userData: User) => setUser(userData);

  const logoutUser = async () => {
    await apiLogout();
    setUser(null);
  };

  const updateUser = (data: Partial<User>) => {
    setUser(prev => prev ? { ...prev, ...data } : null);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, loginUser, logoutUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
