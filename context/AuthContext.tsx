import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import { getCurrentUser, getUserFromSession, logout as apiLogout } from '../services/mockBackend';

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
    let loadingFinished = false;

    const finishLoading = (u: User | null) => {
      if (cancelled || loadingFinished) return;
      loadingFinished = true;
      if (u) setUser(u);
      setIsLoading(false);
    };

    // 8s güvenlik ağı
    const timeout = setTimeout(() => finishLoading(null), 8000);

    // Supabase v2'de onAuthStateChange her zaman INITIAL_SESSION fırlatır.
    // Bu event, token yenileme dahil tüm işlemler bittikten SONRA gelir —
    // F5 sonrası güvenilir tek başlangıç noktası budur.
    // getSession() ile paralel çalıştırmıyoruz çünkü token refresh race'e girer.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (event === 'INITIAL_SESSION') {
        if (!session) { finishLoading(null); return; }
        // session'ı doğrudan kullan — içinde tekrar getSession() çağırmaz,
        // token yenileme race'ini önler
        const u = await getUserFromSession(session).catch(() => null);
        finishLoading(u);

      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        finishLoading(null);

      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!session) return;
        const u = await getUserFromSession(session).catch(() => null);
        if (u && !cancelled) setUser(u);
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
