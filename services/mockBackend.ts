import { Anime, AuthResponse, User, UserRole, Episode, Comment, AnimeStatus, SiteStats, Notification, Achievement, NewsItem } from '../types';

// Constants
const USERS_KEY = 'anipal_users';
const ANIMES_KEY = 'anipal_animes';
const COMMENTS_KEY = 'anipal_comments';
const CURRENT_USER_KEY = 'anipal_current_user';

// --- Achievements Generation ---
// Generating ~100 achievements programmatically to keep code clean
const generateAchievements = (): Achievement[] => {
    const list: Achievement[] = [];

    // Level Badges (1 to 100)
    const levels = [1, 5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];
    levels.forEach(lvl => {
        let icon = '🌱';
        let rarity: Achievement['rarity'] = 'common';
        if (lvl >= 10) { icon = '🥉'; rarity = 'common'; }
        if (lvl >= 25) { icon = '🥈'; rarity = 'rare'; }
        if (lvl >= 50) { icon = '🥇'; rarity = 'epic'; }
        if (lvl >= 80) { icon = '👑'; rarity = 'legendary'; }
        if (lvl === 100) { icon = '🪐'; rarity = 'legendary'; }

        list.push({
            id: `lvl-${lvl}`,
            title: `Seviye ${lvl}`,
            description: `${lvl}. Seviyeye ulaştın!`,
            xpReward: lvl * 50,
            icon,
            conditionType: 'LEVEL_REACHED',
            conditionValue: lvl,
            rarity
        });
    });

    // Watch Count (1 to 1000)
    const watches = [1, 5, 10, 25, 50, 100, 150, 200, 250, 300, 400, 500, 600, 700, 800, 900, 1000];
    watches.forEach(cnt => {
        let icon = '📺';
        let rarity: Achievement['rarity'] = 'common';
        if (cnt >= 50) { icon = '🍿'; rarity = 'rare'; }
        if (cnt >= 200) { icon = '🎥'; rarity = 'epic'; }
        if (cnt >= 500) { icon = '🎬'; rarity = 'legendary'; }
        
        list.push({
            id: `watch-${cnt}`,
            title: `İzleyici ${cnt}`,
            description: `${cnt} bölüm anime izledin.`,
            xpReward: cnt * 5,
            icon,
            conditionType: 'WATCH_COUNT',
            conditionValue: cnt,
            rarity
        });
    });

    // Comment Count (1 to 500)
    const comments = [1, 5, 10, 25, 50, 75, 100, 150, 200, 300, 400, 500];
    comments.forEach(cnt => {
        let icon = '💬';
        let rarity: Achievement['rarity'] = 'common';
        if (cnt >= 25) { icon = '🗣️'; rarity = 'rare'; }
        if (cnt >= 100) { icon = '📣'; rarity = 'epic'; }
        if (cnt >= 300) { icon = '🔥'; rarity = 'legendary'; }

        list.push({
            id: `comment-${cnt}`,
            title: `Yorumcu ${cnt}`,
            description: `${cnt} yorum paylaştın.`,
            xpReward: cnt * 10,
            icon,
            conditionType: 'COMMENT_COUNT',
            conditionValue: cnt,
            rarity
        });
    });

    // List Count (1 to 50)
    const lists = [1, 3, 5, 10, 15, 20, 30, 40, 50];
    lists.forEach(cnt => {
         list.push({
            id: `list-${cnt}`,
            title: `Küratör ${cnt}`,
            description: `Listene ${cnt} anime ekledin.`,
            xpReward: cnt * 20,
            icon: '📋',
            conditionType: 'LIST_COUNT',
            conditionValue: cnt,
            rarity: cnt > 10 ? 'epic' : 'common'
        });
    });

    return list;
};

const ACHIEVEMENTS = generateAchievements();
export const getAllAchievements = () => ACHIEVEMENTS;

// --- Mock News Data ---
const MOCK_NEWS: NewsItem[] = [
    {
        id: 'news-1',
        title: 'Demon Slayer: Hashira Training Arc Final Tarihi Açıklandı!',
        excerpt: 'Merakla beklenen final bölümü için geri sayım başladı. İşte detaylar...',
        content: 'Uzun süredir beklenen Demon Slayer yeni sezon finali...',
        image: 'https://cdn.oneesports.gg/cdn-data/2024/03/DemonSlayer_HashiraTrainingArc_KeyVisual.jpg',
        category: 'Duyuru',
        createdAt: new Date().toISOString()
    },
    {
        id: 'news-2',
        title: 'Solo Leveling 2. Sezon Onaylandı',
        excerpt: 'Sung Jin-Woo geri dönüyor! Yapımcı stüdyodan resmi açıklama geldi.',
        content: 'İlk sezonuyla rekorlar kıran Solo Leveling...',
        image: 'https://images7.alphacoders.com/133/1336495.jpeg',
        category: 'Yeni Sezon',
        createdAt: new Date(Date.now() - 86400000).toISOString()
    },
    {
        id: 'news-3',
        title: 'One Piece Live Action 2. Sezon Kadrosu',
        excerpt: 'Netflix uyarlamasında Ace ve Crocodile karakterlerini kimler oynayacak?',
        content: 'Netflix TUDUM etkinliğinde yapılan açıklamaya göre...',
        image: 'https://static1.srcdn.com/wordpress/wp-content/uploads/2023/09/one-piece-season-2-everything-we-know.jpg',
        category: 'Live Action',
        createdAt: new Date(Date.now() - 172800000).toISOString()
    },
    {
        id: 'news-4',
        title: 'Anipal Platform Güncellemesi v2.0',
        excerpt: 'Yeni level sistemi, başarımlar ve haberler sekmesi yayında!',
        content: 'Sizler için platformumuzu geliştirmeye devam ediyoruz...',
        image: 'https://picsum.photos/seed/tech/1200/600',
        category: 'Platform',
        createdAt: new Date().toISOString()
    }
];

export const getNews = async (): Promise<NewsItem[]> => {
    await delay(200);
    return MOCK_NEWS;
};


// Initial Data
const INITIAL_ADMIN: User = {
  id: 'admin-1',
  username: 'heblebi',
  email: 'heblebi@anipal.com',
  role: UserRole.ADMIN,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=heblebi',
  coverImage: 'https://picsum.photos/seed/admincover/1200/400',
  bio: 'Anipal Kurucusu ve Admini.',
  watchedEpisodes: [],
  likedEpisodes: [],
  watchlist: [],
  isBanned: false,
  createdAt: new Date().toISOString(),
  xp: 4500,
  level: 45,
  earnedAchievements: ['lvl-1', 'lvl-5', 'lvl-10', 'lvl-15', 'lvl-20', 'lvl-25', 'lvl-30', 'lvl-40', 'watch-1', 'watch-5', 'watch-10', 'watch-25', 'watch-50', 'comment-1', 'comment-5'],
  notifications: []
};

const INITIAL_MOD: User = {
  id: 'mod-1',
  username: 'moderator',
  email: 'mod@anipal.com',
  role: UserRole.MODERATOR,
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=mod',
  watchlist: [],
  isBanned: false,
  createdAt: new Date().toISOString(),
  xp: 450,
  level: 4,
  earnedAchievements: [],
  notifications: []
};

const INITIAL_ANIMES: Anime[] = [
  {
    id: 'anime-1',
    title: 'Cyberpunk: Edgerunners',
    description: 'Distopik bir gelecekte, sokak çocuğu, vücut modifikasyonunun takıntı olduğu bir şehirde hayatta kalmaya çalışıyor.',
    coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx120085-f51pXjg1Q3u8.jpg',
    bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/120085-3jXj31g1Q3u8.jpg',
    genres: ['Aksiyon', 'Bilim Kurgu', 'Psikolojik'],
    status: AnimeStatus.APPROVED,
    uploadedBy: 'admin-1',
    averageRating: 9.2,
    episodes: [
      { id: 'ep-1', number: 1, title: 'Uyanış', videoUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk', likes: 120 }, 
      { id: 'ep-2', number: 2, title: 'İş', videoUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk', likes: 85 },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'anime-2',
    title: 'Bleach: Thousand-Year Blood War',
    description: 'Ruh Cemiyeti ile Quincy\'ler arasındaki son savaş başlıyor.',
    coverImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/cover/large/bx114563-jj31g1Q3u8.jpg',
    bannerImage: 'https://s4.anilist.co/file/anilistcdn/media/anime/banner/114563-f51pXjg1Q3u8.jpg',
    genres: ['Macera', 'Doğaüstü', 'Shonen'],
    status: AnimeStatus.APPROVED,
    uploadedBy: 'admin-1',
    averageRating: 8.9,
    episodes: [
        { id: 'ep-3', number: 1, title: 'Kan Savaşı', videoUrl: 'https://www.youtube.com/embed/jfKfPfyJRdk', likes: 230 }
    ],
    createdAt: new Date().toISOString(),
  }
];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const initializeDB = () => {
  if (!localStorage.getItem(USERS_KEY)) {
    const adminWithPass = { ...INITIAL_ADMIN, passwordHash: '123456' };
    const modWithPass = { ...INITIAL_MOD, passwordHash: '123456' };
    localStorage.setItem(USERS_KEY, JSON.stringify([adminWithPass, modWithPass]));
  }
  if (!localStorage.getItem(ANIMES_KEY)) {
    localStorage.setItem(ANIMES_KEY, JSON.stringify(INITIAL_ANIMES));
  }
  if (!localStorage.getItem(COMMENTS_KEY)) {
    localStorage.setItem(COMMENTS_KEY, JSON.stringify([]));
  }
};

initializeDB();

// --- Internal Helper: XP & Notification System ---

const createNotification = (user: any, type: Notification['type'], title: string, message: string) => {
    const newNotif: Notification = {
        id: `notif-${Date.now()}-${Math.random()}`,
        userId: user.id,
        type,
        title,
        message,
        isRead: false,
        createdAt: new Date().toISOString()
    };
    user.notifications = [newNotif, ...(user.notifications || [])];
    return user;
};

const checkAchievements = (user: any, commentsCount?: number) => {
    let earnedNew = false;
    const watchedCount = user.watchedEpisodes?.length || 0;
    const listCount = user.watchlist?.length || 0;
    
    ACHIEVEMENTS.forEach(ach => {
        if (user.earnedAchievements?.includes(ach.id)) return; // Already earned

        let earned = false;
        if (ach.conditionType === 'WATCH_COUNT' && watchedCount >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'LIST_COUNT' && listCount >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'LEVEL_REACHED' && user.level >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'COMMENT_COUNT' && commentsCount !== undefined && commentsCount >= ach.conditionValue) earned = true;

        if (earned) {
            user.earnedAchievements = [...(user.earnedAchievements || []), ach.id];
            user = addXpToUser(user, ach.xpReward); // Add XP for achievement
            user = createNotification(user, 'BADGE_EARNED', 'Yeni Başarım!', `${ach.icon} ${ach.title} başarımını kazandın!`);
            earnedNew = true;
        }
    });
    return user;
};

const addXpToUser = (user: any, amount: number) => {
    user.xp = (user.xp || 0) + amount;
    
    // Level Up Logic: Every 100 XP is a level
    const newLevel = Math.floor(user.xp / 100) + 1;
    
    if (newLevel > (user.level || 1)) {
        user.level = newLevel;
        user = createNotification(user, 'LEVEL_UP', 'Seviye Atladın!', `Tebrikler! ${newLevel}. seviyeye ulaştın.`);
        user = checkAchievements(user); 
    }
    return user;
};

const saveUser = (user: any) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex((u: any) => u.id === user.id);
    if(idx !== -1) {
        users[idx] = user;
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        
        // Update Session if matches
        const currentUser = getCurrentUser();
        if(currentUser && currentUser.id === user.id) {
            const { passwordHash, ...safe } = user;
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ ...safe, token: currentUser.token }));
        }
    }
};

// --- Auth ---

export const login = async (emailOrUsername: string, password: string): Promise<AuthResponse> => {
  await delay(500);
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  
  const user = users.find((u: any) => 
    (u.email === emailOrUsername || u.username === emailOrUsername) && u.passwordHash === password
  );

  if (!user) throw new Error('Geçersiz kullanıcı adı veya şifre');
  if (user.isBanned) throw new Error('Bu hesap engellenmiştir.');

  const token = `fake-jwt-${user.id}-${Date.now()}`;
  const { passwordHash, ...safeUser } = user;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ ...safeUser, token }));
  return { user: safeUser, token };
};

export const register = async (username: string, email: string, password: string): Promise<AuthResponse> => {
  await delay(500);
  const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');

  if (users.find((u: any) => u.email === email)) throw new Error('Bu e-posta zaten kullanımda');

  const newUser = {
    id: `user-${Date.now()}`,
    username,
    email,
    passwordHash: password,
    role: UserRole.USER,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    watchlist: [],
    watchedEpisodes: [],
    likedEpisodes: [],
    earnedAchievements: [],
    notifications: [],
    xp: 0,
    level: 1,
    isBanned: false,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const token = `fake-jwt-${newUser.id}-${Date.now()}`;
  const { passwordHash, ...safeUser } = newUser;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify({ ...safeUser, token }));
  return { user: safeUser, token };
};

export const logout = async () => localStorage.removeItem(CURRENT_USER_KEY);

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem(CURRENT_USER_KEY);
  return stored ? JSON.parse(stored) : null;
};

// --- Notifications ---

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    await delay(200);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find((u: any) => u.id === userId);
    return user ? user.notifications || [] : [];
};

export const markNotificationsAsRead = async (userId: string) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find((u: any) => u.id === userId);
    if (user && user.notifications) {
        user.notifications = user.notifications.map((n: Notification) => ({ ...n, isRead: true }));
        saveUser(user);
    }
};

// --- Leaderboard ---

export const getLeaderboard = async (): Promise<User[]> => {
    await delay(300);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    // Sort by XP descending
    const sorted = users.sort((a: any, b: any) => (b.xp || 0) - (a.xp || 0));
    return sorted.slice(0, 10).map((u: any) => {
        const { passwordHash, ...safe } = u;
        return safe;
    });
};

// --- Interactions with XP ---

export const toggleWatchlist = async (userId: string, animeId: string): Promise<boolean> => {
    await delay(200);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let user = users.find((u: any) => u.id === userId);
    
    if(!user) throw new Error("Kullanıcı yok");
    
    const list = user.watchlist || [];
    const exists = list.includes(animeId);
    
    if(exists) {
        user.watchlist = list.filter((id: string) => id !== animeId);
    } else {
        user.watchlist.push(animeId);
        // XP Gain: List Creation -> +20 XP
        user = addXpToUser(user, 20);
        user = checkAchievements(user);
    }
    
    saveUser(user);
    return !exists;
};

export const markEpisodeWatched = async (userId: string, episodeId: string) => {
    await delay(200);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let user = users.find((u: any) => u.id === userId);
    if(!user) return;

    if (!user.watchedEpisodes?.includes(episodeId)) {
        user.watchedEpisodes = [...(user.watchedEpisodes || []), episodeId];
        // XP Gain: Watching Anime -> +50 XP
        user = addXpToUser(user, 50);
        user = checkAchievements(user);
        saveUser(user);
        return true; 
    }
    return false; 
};

export const addComment = async (data: any) => {
    await delay(300);
    const comments = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]');
    const newC = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() };
    comments.push(newC);
    localStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));

    // XP Gain: Commenting -> +10 XP
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let user = users.find((u: any) => u.id === data.userId);
    if(user) {
        user = addXpToUser(user, 10);
        // Calculate user total comments
        const userCommentsCount = comments.filter((c: any) => c.userId === user.id).length;
        user = checkAchievements(user, userCommentsCount);
        saveUser(user);
    }

    return newC;
};

// --- Existing exports ---
export const fetchAniListData = async (search: string) => {
    const query = `query ($search: String) { Media (search: $search, type: ANIME) { id, title { romaji english }, description, coverImage { extraLarge }, bannerImage, genres, averageScore } }`;
    const response = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { search } }) });
    const data = await response.json();
    return data.data.Media;
};
export const getAnimes = async (filter?: { status?: AnimeStatus | null }) => {
  await delay(300);
  let animes = JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]');
  
  if (filter === undefined) {
      // Default view (e.g. Home Page) - Show Approved only
      return animes.filter((a: Anime) => a.status === AnimeStatus.APPROVED);
  }

  // If filter object exists but status is undefined (or null if passed so), return all
  // This supports Admin Dashboard requesting all content
  if (filter.status === undefined || filter.status === null) {
      return animes;
  }

  // Otherwise filter by specific status
  return animes.filter((a: Anime) => a.status === filter.status);
};
export const getAnimeById = async (id: string) => {
  await delay(200);
  return JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]').find((a: Anime) => a.id === id);
};
export const createAnime = async (animeData: any, user: User) => {
  await delay(400);
  const animes = JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]');
  const newAnime = { ...animeData, id: `anime-${Date.now()}`, createdAt: new Date().toISOString(), episodes: [], status: user.role === UserRole.ADMIN ? AnimeStatus.APPROVED : AnimeStatus.PENDING, uploadedBy: user.id };
  animes.push(newAnime);
  localStorage.setItem(ANIMES_KEY, JSON.stringify(animes));
  return newAnime;
};
export const approveAnime = async (animeId: string) => {
    const animes = JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]');
    const idx = animes.findIndex((a: Anime) => a.id === animeId);
    if(idx !== -1) { animes[idx].status = AnimeStatus.APPROVED; localStorage.setItem(ANIMES_KEY, JSON.stringify(animes)); }
};
export const addEpisode = async (animeId: string, episodeData: any) => {
    const animes = JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]');
    const idx = animes.findIndex((a: Anime) => a.id === animeId);
    if (idx === -1) throw new Error("Anime yok");
    animes[idx].episodes.push({ ...episodeData, id: `ep-${Date.now()}`, likes: 0 });
    localStorage.setItem(ANIMES_KEY, JSON.stringify(animes));
};
export const rateAnime = async (animeId: string, rating: number) => {
    await delay(300);
    const animes = JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]');
    const idx = animes.findIndex((a: Anime) => a.id === animeId);
    if(idx !== -1) {
        const currentAvg = animes[idx].averageRating || 0;
        const count = animes[idx].ratingsCount || 10;
        animes[idx].averageRating = parseFloat(((currentAvg * count + rating) / (count + 1)).toFixed(1));
        animes[idx].ratingsCount = count + 1;
        localStorage.setItem(ANIMES_KEY, JSON.stringify(animes));
    }
};
export const getSiteStats = async () => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const animes = JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]');
    const comments = JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]');
    return { totalUsers: users.length, totalAnimes: animes.length, pendingAnimes: animes.filter((a: Anime) => a.status === AnimeStatus.PENDING).length, totalComments: comments.length };
};
export const getUsers = async () => JSON.parse(localStorage.getItem(USERS_KEY) || '[]').map((u:any) => {const {passwordHash, ...s}=u; return s;});
export const toggleBanUser = async (id: string) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex((u: any) => u.id === id);
    if(idx !== -1 && users[idx].id !== 'admin-1') { users[idx].isBanned = !users[idx].isBanned; localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
};
export const updateUserRole = async (userId: string, newRole: UserRole) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex((u: any) => u.id === userId);
    if(idx !== -1 && users[idx].id !== 'admin-1') { 
        users[idx].role = newRole; 
        saveUser(users[idx]);
    }
};
export const getUserById = async (id: string) => JSON.parse(localStorage.getItem(USERS_KEY) || '[]').find((u: any) => u.id === id);
export const updateUserProfile = async (id: string, data: any) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex((u: any) => u.id === id);
    if(idx !== -1) { 
        users[idx] = { ...users[idx], ...data }; 
        saveUser(users[idx]); 
        return users[idx];
    }
};
export const changePassword = async (userId: string, oldPass: string, newPass: string) => {
    await delay(500);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex((u: any) => u.id === userId);
    if (idx === -1) throw new Error("Kullanıcı bulunamadı");
    if (users[idx].passwordHash !== oldPass) throw new Error("Mevcut şifreniz hatalı.");
    users[idx].passwordHash = newPass;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
};
export const deleteAccount = async (id: string) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    localStorage.setItem(USERS_KEY, JSON.stringify(users.filter((u: any) => u.id !== id)));
};
export const getUserComments = async (id: string) => JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]').filter((c: any) => c.userId === id);
export const toggleLikeEpisode = async (userId: string, animeId: string, episodeId: string) => ({ liked: true, likesCount: 10 });
export const getCommentsByEpisodeId = async (id: string) => JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]').filter((c: any) => c.episodeId === id);