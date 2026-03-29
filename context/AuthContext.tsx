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

    // Safety net: never stay in loading state more than 6 seconds
    loadingTimeout = setTimeout(finishLoading, 6000);

    // Supabase v2: onAuthStateChange fires INITIAL_SESSION immediately on registration.
    // This is the single source of truth for the initial auth state — no separate
    // getCurrentUser() call that can race against the auth state listener.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
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
        if (!session) { finishLoading(); return; }
        try {
          const u = await getCurrentUser();
          if (u) setUser(u); // never override valid user with null
        } catch { /* ignore */ }
        finishLoading(); // ensure loading stops even if INITIAL_SESSION didn't fire
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
