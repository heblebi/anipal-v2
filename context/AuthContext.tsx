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
    let loadingDone = false;
    let loadingTimeout: ReturnType<typeof setTimeout>;

    const finishLoading = () => {
      if (!loadingDone) {
        loadingDone = true;
        clearTimeout(loadingTimeout);
        setIsLoading(false);
      }
    };

    // Safety net: 5 saniye sonra her halükarda loading'i bitir
    loadingTimeout = setTimeout(finishLoading, 5000);

    // Hızlı yol: oturum varsa hemen kullanıcıyı getir.
    // Başarılı olursa loading'i bitirir; null dönerse INITIAL_SESSION bekler
    // (null durumunda finishLoading çağırmıyoruz — isLoading=false ile yanlış
    // yönlendirmeyi önlemek için INITIAL_SESSION finalizer olarak kalıyor).
    getCurrentUser().then(u => {
      if (u) { setUser(u); finishLoading(); }
    }).catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        // INITIAL_SESSION her zaman tetiklenir (oturum var/yok fark etmez).
        // Loading'in garantili finalizer'ı budur.
        if (session) {
          try {
            const u = await getCurrentUser();
            if (u) setUser(u);
          } catch { /* ignore */ }
        }
        finishLoading();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        finishLoading();
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!session) return;
        try {
          const u = await getCurrentUser();
          if (u) setUser(u); // geçerli kullanıcının üzerine null yazılmaz
        } catch { /* ignore */ }
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(loadingTimeout);
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
