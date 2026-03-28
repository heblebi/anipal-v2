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
    // İlk yüklemede mevcut oturumu kontrol et
    getCurrentUser().then(async u => {
      if (!u) {
        // No user resolved — if a Supabase session still exists (orphan), clean it up
        const { data: { session } } = await supabase.auth.getSession();
        if (session) await supabase.auth.signOut().catch(() => {});
      }
      setUser(u);
      setIsLoading(false);
    }).catch(() => setIsLoading(false));

    // Supabase auth değişikliklerini dinle (login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        try {
          const u = await getCurrentUser();
          if (u) setUser(u); // never override valid user with null
        } catch { /* ignore */ }
      }
    });

    return () => subscription.unsubscribe();
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
