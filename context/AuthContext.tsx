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

// Kullanıcının temel bilgilerini (rol dahil) localStorage'da sakla.
// Avatar gibi büyük alanları cache'lemiyoruz — sadece kimlik doğrulama için gerekli alanlar.
const CACHE_KEY = 'anipal_auth_cache';

const saveCache = (u: User) => {
  try {
    const minimal = {
      id: u.id, username: u.username, displayName: u.displayName,
      email: u.email, role: u.role, level: u.level, xp: u.xp,
      isBanned: u.isBanned, avatar: '',
      showAnimeList: u.showAnimeList,
      watchlist: [], watchedEpisodes: [], likedEpisodes: [],
      animeList: [], customLists: [], earnedAchievements: [],
      displayedBadges: [], notifications: [], createdAt: u.createdAt,
      coverImage: '', bio: '',
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(minimal));
  } catch {}
};

const loadCache = (): User | null => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (!u?.id || !u?.role) return null;
    return u as User;
  } catch { return null; }
};

const clearCache = () => { try { localStorage.removeItem(CACHE_KEY); } catch {} };

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  // Cache varsa hemen yükle — isLoading baştan false
  const cached = loadCache();
  const [user, setUser] = useState<User | null>(cached);
  const [isLoading, setIsLoading] = useState(!cached); // cache yoksa loading göster

  useEffect(() => {
    let cancelled = false;

    // Arka planda Supabase session doğrulaması yap.
    // Cache varsa kullanıcı zaten gösterildi, bu doğrulama sessizce çalışır.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;

      if (!session) {
        // Geçerli session yok — cache'i temizle, kullanıcıyı çıkar
        clearCache();
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Session geçerli — güncel profili arka planda getir
      const u = await getUserFromSession(session).catch(() => null);
      if (!cancelled) {
        if (u) { saveCache(u); setUser(u); }
        setIsLoading(false);
      }
    }).catch(() => {
      if (!cancelled) setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT') {
        clearCache();
        setUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!session) return;
        const u = await getUserFromSession(session).catch(() => null);
        if (!cancelled && u) { saveCache(u); setUser(u); }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const loginUser = (userData: User) => {
    saveCache(userData);
    setUser(userData);
  };

  const logoutUser = async () => {
    clearCache();
    await apiLogout();
    setUser(null);
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
