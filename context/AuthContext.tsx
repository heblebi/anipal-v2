import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import { getUserFromSession, logout as apiLogout } from '../services/mockBackend';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginUser: (user: User) => void;
  logoutUser: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHE_KEY = 'anipal_auth_cache';

const saveCache = (u: User) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      id: u.id, username: u.username, displayName: u.displayName,
      email: u.email, role: u.role, level: u.level, xp: u.xp,
      isBanned: u.isBanned, avatar: '', coverImage: '', bio: '',
      showAnimeList: u.showAnimeList, watchlist: [], watchedEpisodes: [],
      likedEpisodes: [], animeList: [], customLists: [],
      earnedAchievements: [], displayedBadges: [], notifications: [],
      createdAt: u.createdAt,
    }));
  } catch {}
};

const loadCache = (): User | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    return (u?.id && u?.role) ? u as User : null;
  } catch { return null; }
};

const clearCache = () => { try { localStorage.removeItem(CACHE_KEY); } catch {} };

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const cached = loadCache();
  const [user, setUser] = useState<User | null>(cached);
  const [isLoading, setIsLoading] = useState(!cached);

  useEffect(() => {
    let cancelled = false;
    let finished = false;

    const finish = () => {
      if (!finished && !cancelled) {
        finished = true;
        setIsLoading(false);
      }
    };

    // 5s güvenlik ağı
    const timer = setTimeout(finish, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;

      if (event === 'SIGNED_OUT') {
        // Tek güvenilir çıkış eventi — sadece burada cache silinir
        clearCache();
        setUser(null);
        finish();
        return;
      }

      if (event === 'INITIAL_SESSION') {
        if (!session) {
          // Session yok. Cache de yoksa gerçekten giriş yapılmamış.
          // Cache VARSA dokunmuyoruz — SIGNED_OUT gelene kadar kullanıcı korunur.
          if (!loadCache()) setUser(null);
          finish();
          return;
        }
        // Session var — güncel profili getir
        const u = await getUserFromSession(session).catch(() => null);
        if (cancelled) return;
        if (u) { saveCache(u); setUser(u); }
        finish();
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        if (!session) return;
        const u = await getUserFromSession(session).catch(() => null);
        if (!cancelled && u) { saveCache(u); setUser(u); }
        finish();
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const loginUser = (userData: User) => {
    saveCache(userData);
    setUser(userData);
  };

  const logoutUser = async () => {
    clearCache();
    setUser(null);
    await apiLogout();
  };

  const updateUser = (data: Partial<User>) => {
    setUser(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...data };
      saveCache(updated);
      return updated;
    });
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
