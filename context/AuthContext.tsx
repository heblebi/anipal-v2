import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import { supabase } from '../services/supabase';
import { getUserFromSession, logout as apiLogout, updateLastSeen } from '../services/mockBackend';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginUser: (user: User) => void;
  logoutUser: () => void;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CACHE_KEY = 'anipal_user_v1';

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

const clearCache = () => {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
};

export const AuthProvider = ({ children }: { children?: ReactNode }) => {
  const cached = loadCache();
  const [user, setUser] = useState<User | null>(cached);
  const [isLoading, setIsLoading] = useState(true); // always start loading, resolve fast

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // Gerçekten oturum yok
          clearCache();
          if (!cancelled) { setUser(null); setIsLoading(false); }
          return;
        }

        // Session var — profili getir
        const u = await getUserFromSession(session).catch(() => null);
        if (!cancelled) {
          if (u) { saveCache(u); setUser(u); }
          else {
            // null dönüşü: ban veya profil hatası — her iki durumda da çıkış
            clearCache();
            setUser(null);
          }
          setIsLoading(false);
        }
      } catch {
        if (!cancelled) {
          if (cached) setUser(cached); // hata durumunda cache'i koru
          setIsLoading(false);
        }
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (cancelled) return;
      if (event === 'SIGNED_OUT') {
        clearCache();
        setUser(null);
        setIsLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session) {
        const u = await getUserFromSession(session).catch(() => null);
        if (!cancelled && u) { saveCache(u); setUser(u); }
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  // Periyodik ban kontrolü + last_seen_at güncelleme — her 2 dakikada bir
  useEffect(() => {
    if (!user) return;
    updateLastSeen(user.id).catch(() => {});
    const check = async () => {
      try {
        updateLastSeen(user.id).catch(() => {});
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const u = await getUserFromSession(session);
        if (!u) {
          clearCache();
          setUser(null);
        }
      } catch { /* ignore */ }
    };
    const interval = setInterval(check, 120000); // 2 dakika
    return () => clearInterval(interval);
  }, [user?.id]);

  const loginUser = (u: User) => { saveCache(u); setUser(u); setIsLoading(false); };

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
