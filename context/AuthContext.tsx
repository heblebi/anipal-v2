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
        // Profil getir — 3 deneme (yavaş bağlantı / büyük profil için)
        let u: User | null = null;
        for (let i = 0; i < 3; i++) {
          try { u = await getCurrentUser(); if (u) break; } catch {}
          if (i < 2) await new Promise(r => setTimeout(r, 700));
        }
        finishLoading(u);

      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        finishLoading(null);

      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Sonraki login / token yenilemeleri — isLoading'e dokunma
        if (!session) return;
        try {
          const u = await getCurrentUser();
          if (u && !cancelled) setUser(u);
        } catch {}
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
