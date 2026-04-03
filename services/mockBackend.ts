import { supabase, USE_SUPABASE } from './supabase';
import { Anime, AuthResponse, User, UserRole, Episode, Comment, AnimeStatus, SiteStats, Notification, Achievement, NewsItem, AnimeEntry, UserList, VideoSource, EpisodeContribution } from '../types';

// ─── localStorage backend (test/demo mode) ───────────────────────────────────

const LS = {
    get: (key: string) => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } },
    set: (key: string, val: any) => localStorage.setItem(key, JSON.stringify(val)),
    del: (key: string) => localStorage.removeItem(key),
};

const DEMO_USER_ID = 'demo-user-1';
const LS_SESSION = 'anipal_ls_session';
const LS_USERS   = 'anipal_ls_users';
const LS_ANIMES  = 'anipal_ls_animes';

const ensureDemoUsers = () => {
    const users = LS.get(LS_USERS) || [];
    if (!users.find((u: any) => u.username === 'demo')) {
        users.push({ id: DEMO_USER_ID, username: 'demo', email: 'demo@anipal.app', password: 'demo123', role: 'user', avatar: '', bio: 'Demo kullanıcısı', xp: 0, level: 1, isBanned: false, showAnimeList: true, watchlist: [], watchedEpisodes: [], likedEpisodes: [], animeList: [], customLists: [], earnedAchievements: [], displayedBadges: [], notifications: [], createdAt: new Date().toISOString() });
        LS.set(LS_USERS, users);
    }
    return LS.get(LS_USERS) as any[];
};

const lsGetUser = (id: string): any => (ensureDemoUsers()).find((u: any) => u.id === id) || null;

const lsSaveUser = (user: any) => {
    const users = ensureDemoUsers();
    const idx = users.findIndex((u: any) => u.id === user.id);
    if (idx !== -1) users[idx] = user; else users.push(user);
    LS.set(LS_USERS, users);
};

const lsMapUser = (u: any): User => ({
    id: u.id, username: u.username, email: u.email, role: u.role as UserRole,
    avatar: u.avatar || '', coverImage: u.coverImage || '', bio: u.bio || '',
    xp: u.xp || 0, level: u.level || 1, isBanned: u.isBanned || false,
    showAnimeList: u.showAnimeList !== false, watchlist: u.watchlist || [],
    watchedEpisodes: u.watchedEpisodes || [], likedEpisodes: u.likedEpisodes || [],
    animeList: u.animeList || [], customLists: u.customLists || [],
    earnedAchievements: u.earnedAchievements || [], displayedBadges: u.displayedBadges || [],
    notifications: u.notifications || [], createdAt: u.createdAt,
});

const SEED_ANIMES: Anime[] = [
    { id: 'seed-1', title: 'Naruto', description: 'Ninja dünyasında geçen macera serisi.', coverImage: 'https://cdn.myanimelist.net/images/anime/13/17405.jpg', bannerImage: '', genres: ['Aksiyon', 'Macera'], episodes: [], status: 'approved' as AnimeStatus, uploadedBy: 'system', averageRating: 4.5, ratingsCount: 1200, characters: [], createdAt: new Date().toISOString() },
    { id: 'seed-2', title: 'Attack on Titan', description: 'İnsanlığın devlere karşı mücadelesi.', coverImage: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg', bannerImage: '', genres: ['Aksiyon', 'Drama'], episodes: [], status: 'approved' as AnimeStatus, uploadedBy: 'system', averageRating: 4.9, ratingsCount: 2500, characters: [], createdAt: new Date().toISOString() },
    { id: 'seed-3', title: 'Death Note', description: 'Bir not defteri ile dünyayı değiştirmeye çalışan bir deha.', coverImage: 'https://cdn.myanimelist.net/images/anime/9/9453.jpg', bannerImage: '', genres: ['Gerilim', 'Psikolojik'], episodes: [], status: 'approved' as AnimeStatus, uploadedBy: 'system', averageRating: 4.7, ratingsCount: 3000, characters: [], createdAt: new Date().toISOString() },
];

const lsGetAnimes = (): Anime[] => {
    const stored = LS.get(LS_ANIMES);
    if (!stored || stored.length === 0) { LS.set(LS_ANIMES, SEED_ANIMES); return SEED_ANIMES; }
    return stored;
};

// ─── Achievements (static, no DB) ───────────────────────────────────────────

const generateAchievements = (): Achievement[] => {
    const list: Achievement[] = [];
    const levelDefs = [
        { lvl: 1, title: 'Çaylak', icon: '🌱', rarity: 'common' }, { lvl: 5, title: 'Genin', icon: '⚔️', rarity: 'common' },
        { lvl: 10, title: 'Dojo Öğrencisi', icon: '🥋', rarity: 'common' }, { lvl: 15, title: 'Alev Ustası', icon: '🔥', rarity: 'common' },
        { lvl: 20, title: 'Şimşek', icon: '⚡', rarity: 'rare' }, { lvl: 25, title: 'Yıldız Parçası', icon: '💫', rarity: 'rare' },
        { lvl: 30, title: 'Kılıç Ustası', icon: '🗡️', rarity: 'rare' }, { lvl: 40, title: 'Büyücü', icon: '🧙', rarity: 'rare' },
        { lvl: 50, title: 'Dokuz Kuyruklu', icon: '🦊', rarity: 'epic' }, { lvl: 60, title: 'Sharingan', icon: '👁️', rarity: 'epic' },
        { lvl: 70, title: 'Su Ejderhası', icon: '🌊', rarity: 'epic' }, { lvl: 80, title: 'Karanlık Enerji', icon: '🌑', rarity: 'legendary' },
        { lvl: 90, title: 'Efsane', icon: '⚜️', rarity: 'legendary' }, { lvl: 100, title: 'Evreni Aşan', icon: '🪐', rarity: 'legendary' },
    ] as any[];
    levelDefs.forEach(({ lvl, title, icon, rarity }) =>
        list.push({ id: `lvl-${lvl}`, title: `${title} (Seviye ${lvl})`, description: `${lvl}. Seviyeye ulaştın!`, xpReward: lvl * 50, icon, conditionType: 'LEVEL_REACHED', conditionValue: lvl, rarity }));
    const watchDefs = [
        { cnt: 1, title: 'İlk Bölüm', icon: '📺', rarity: 'common' }, { cnt: 5, title: 'Meraklı İzleyici', icon: '🎭', rarity: 'common' },
        { cnt: 10, title: 'Anime Tutkunu', icon: '🍿', rarity: 'common' }, { cnt: 25, title: 'Shounen Ruhu', icon: '⚔️', rarity: 'common' },
        { cnt: 50, title: 'Otaku Adayı', icon: '🔥', rarity: 'rare' }, { cnt: 100, title: 'Gerçek Otaku', icon: '💫', rarity: 'rare' },
        { cnt: 200, title: 'Anime Master', icon: '🎬', rarity: 'epic' }, { cnt: 500, title: 'Anime Efsanesi', icon: '🏆', rarity: 'legendary' },
    ] as any[];
    watchDefs.forEach(({ cnt, title, icon, rarity }) =>
        list.push({ id: `watch-${cnt}`, title, description: `${cnt} bölüm anime izledin.`, xpReward: cnt * 5, icon, conditionType: 'WATCH_COUNT', conditionValue: cnt, rarity }));
    const commentDefs = [
        { cnt: 1, title: 'İlk Söz', icon: '💬', rarity: 'common' }, { cnt: 5, title: 'Aktif Yorumcu', icon: '🗣️', rarity: 'common' },
        { cnt: 10, title: 'Tartışmacı', icon: '💭', rarity: 'common' }, { cnt: 25, title: 'Forum Yıldızı', icon: '⭐', rarity: 'rare' },
        { cnt: 50, title: 'Çevrimiçi Aktivist', icon: '📣', rarity: 'rare' }, { cnt: 100, title: 'Anime Eleştirmeni', icon: '🖊️', rarity: 'epic' },
    ] as any[];
    commentDefs.forEach(({ cnt, title, icon, rarity }) =>
        list.push({ id: `comment-${cnt}`, title, description: `${cnt} yorum paylaştın.`, xpReward: cnt * 10, icon, conditionType: 'COMMENT_COUNT', conditionValue: cnt, rarity }));
    const listDefs = [
        { cnt: 1, title: 'İlk Ekleme', icon: '📌', rarity: 'common' }, { cnt: 5, title: 'Anime Listecisi', icon: '📋', rarity: 'common' },
        { cnt: 10, title: 'Küratör', icon: '🗂️', rarity: 'rare' }, { cnt: 20, title: 'Kütüphaneci', icon: '🏛️', rarity: 'rare' },
        { cnt: 50, title: 'Anime Ansiklopedisi', icon: '📖', rarity: 'legendary' },
    ] as any[];
    listDefs.forEach(({ cnt, title, icon, rarity }) =>
        list.push({ id: `list-${cnt}`, title, description: `Listene ${cnt} anime ekledin.`, xpReward: cnt * 20, icon, conditionType: 'LIST_COUNT', conditionValue: cnt, rarity }));
    // ── Arkadaşlık başarımları
    const friendDefs = [
        { cnt: 1, title: 'İlk Nakama', icon: '🤝', rarity: 'common' },
        { cnt: 5, title: 'Sosyal Kelebek', icon: '🦋', rarity: 'common' },
        { cnt: 10, title: 'Nakama', icon: '⚡', rarity: 'rare' },
        { cnt: 25, title: 'Guild Master', icon: '👑', rarity: 'epic' },
        { cnt: 50, title: 'Konoha Efsanesi', icon: '🍃', rarity: 'legendary' },
    ] as any[];
    friendDefs.forEach(({ cnt, title, icon, rarity }) =>
        list.push({ id: `friend-${cnt}`, title, description: `${cnt} arkadaş edindi.`, xpReward: cnt * 15, icon, conditionType: 'FRIEND_COUNT', conditionValue: cnt, rarity }));
    // ── Mesajlaşma başarımları
    const msgDefs = [
        { cnt: 10, title: 'Dedikodunun Ruhu', icon: '💬', rarity: 'common' },
        { cnt: 50, title: 'Sohbet Ustası', icon: '🗨️', rarity: 'rare' },
        { cnt: 100, title: 'Nakama\'nın Sesi', icon: '📡', rarity: 'epic' },
        { cnt: 500, title: 'Transponder Snail', icon: '🐌', rarity: 'legendary' },
    ] as any[];
    msgDefs.forEach(({ cnt, title, icon, rarity }) =>
        list.push({ id: `msg-${cnt}`, title, description: `${cnt} mesaj gönderdi.`, xpReward: cnt * 2, icon, conditionType: 'MESSAGE_COUNT', conditionValue: cnt, rarity }));
    // ── Haber okuma başarımları
    const newsDefs = [
        { cnt: 1, title: 'Haber Takipçisi', icon: '📰', rarity: 'common' },
        { cnt: 10, title: 'Anime Gazetecisi', icon: '🗞️', rarity: 'rare' },
        { cnt: 30, title: 'Bilgi Okyansu', icon: '🌊', rarity: 'epic' },
    ] as any[];
    newsDefs.forEach(({ cnt, title, icon, rarity }) =>
        list.push({ id: `news-${cnt}`, title, description: `${cnt} haberi okudu.`, xpReward: cnt * 10, icon, conditionType: 'NEWS_COUNT', conditionValue: cnt, rarity }));
    // ── Öneri/istek başarımları
    list.push({ id: 'request-1', title: 'İlk Öneri', description: 'İlk anime önerini gönderdin.', xpReward: 30, icon: '💡', conditionType: 'REQUEST_COUNT', conditionValue: 1, rarity: 'common' });
    list.push({ id: 'request-3', title: 'Yapım Yapımcısı', description: '3 anime önerisi gönderdin.', xpReward: 75, icon: '🎬', conditionType: 'REQUEST_COUNT', conditionValue: 3, rarity: 'rare' });
    // ── Değerlendirme başarımları
    const ratingDefs = [
        { cnt: 1, title: 'İlk Eleştiri', icon: '⭐', rarity: 'common' },
        { cnt: 10, title: 'Anime Eleştirmeni', icon: '🎭', rarity: 'rare' },
        { cnt: 50, title: 'Puan Ustası', icon: '🏅', rarity: 'epic' },
    ] as any[];
    ratingDefs.forEach(({ cnt, title, icon, rarity }) =>
        list.push({ id: `rating-${cnt}`, title, description: `${cnt} anime değerlendirdi.`, xpReward: cnt * 8, icon, conditionType: 'RATING_COUNT', conditionValue: cnt, rarity }));
    return list;
};

const ACHIEVEMENTS = generateAchievements();
export const getAllAchievements = () => ACHIEVEMENTS;

// ─── Mappers ─────────────────────────────────────────────────────────────────

const mapProfile = (p: any, email?: string): User => ({
    id: p.id,
    username: p.username,
    displayName: p.display_name || p.username,
    email: email || p.email || '',
    role: p.role as UserRole,
    avatar: p.avatar || '',
    coverImage: p.cover_image || '',
    bio: p.bio || '',
    xp: p.xp || 0,
    level: p.level || 1,
    isBanned: p.is_banned || false,
    banExpiresAt: p.ban_expires_at || null,
    showAnimeList: p.show_anime_list !== false,
    watchlist: p.watchlist || [],
    watchedEpisodes: p.watched_episodes || [],
    likedEpisodes: p.liked_episodes || [],
    animeList: p.anime_list || [],
    customLists: p.custom_lists || [],
    earnedAchievements: p.earned_achievements || [],
    displayedBadges: p.displayed_badges || [],
    notifications: p.notifications || [],
    allowMessages: p.allow_messages !== false,
    isPrivate: p.is_private || false,
    createdAt: p.created_at,
});

const mapAnime = (a: any): Anime => ({
    id: a.id,
    title: a.title,
    description: a.description || '',
    coverImage: a.cover_image || '',
    bannerImage: a.banner_image || '',
    genres: a.genres || [],
    episodes: a.episodes || [],
    status: a.status as AnimeStatus,
    uploadedBy: a.uploaded_by || '',
    averageRating: a.average_rating || 0,
    ratingsCount: a.ratings_count || 0,
    characters: a.characters || [],
    createdAt: a.created_at,
});

// ─── Internal XP/Achievement helpers ─────────────────────────────────────────

const createNotif = (type: Notification['type'], title: string, message: string): Notification => ({
    id: `notif-${Date.now()}-${Math.random()}`,
    userId: '',
    type, title, message,
    isRead: false,
    createdAt: new Date().toISOString(),
});

const applyXp = (profile: any, amount: number): any => {
    profile.xp = (profile.xp || 0) + amount;
    const newLevel = Math.floor(profile.xp / 100) + 1;
    if (newLevel > (profile.level || 1)) {
        profile.level = newLevel;
        profile.notifications = [
            { ...createNotif('LEVEL_UP', 'Seviye Atladın!', `Tebrikler! ${newLevel}. seviyeye ulaştın.`), userId: profile.id },
            ...(profile.notifications || []),
        ];
        profile = applyAchievements(profile);
    }
    return profile;
};

type XpCounts = {
    commentsCount?: number;
    watchCount?: number;
    friendsCount?: number;
    messagesCount?: number;
    newsCount?: number;
    requestsCount?: number;
    ratingsCount?: number;
};

const applyAchievements = (profile: any, counts: XpCounts = {}): any => {
    const watchedCount = counts.watchCount ?? (profile.watched_episodes || []).length;
    const listCount = (profile.watchlist || []).length;
    const customListCount = (profile.custom_lists || []).length;
    ACHIEVEMENTS.forEach(ach => {
        if ((profile.earned_achievements || []).includes(ach.id)) return;
        let earned = false;
        if (ach.conditionType === 'WATCH_COUNT' && watchedCount >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'LIST_COUNT' && listCount >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'LEVEL_REACHED' && (profile.level || 1) >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'COMMENT_COUNT' && counts.commentsCount !== undefined && counts.commentsCount >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'LIST_CREATED_COUNT' && customListCount >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'FRIEND_COUNT' && counts.friendsCount !== undefined && counts.friendsCount >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'MESSAGE_COUNT' && counts.messagesCount !== undefined && counts.messagesCount >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'NEWS_COUNT' && counts.newsCount !== undefined && counts.newsCount >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'REQUEST_COUNT' && counts.requestsCount !== undefined && counts.requestsCount >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'RATING_COUNT' && counts.ratingsCount !== undefined && counts.ratingsCount >= ach.conditionValue) earned = true;
        if (earned) {
            profile.earned_achievements = [...(profile.earned_achievements || []), ach.id];
            profile = applyXp(profile, ach.xpReward);
            profile.notifications = [
                { ...createNotif('BADGE_EARNED', 'Yeni Başarım!', `${ach.icon} ${ach.title} başarımını kazandın!`), userId: profile.id },
                ...(profile.notifications || []),
            ];
        }
    });
    return profile;
};

// ─── XP event dedup helper ────────────────────────────────────────────────────
// Returns true if XP was granted (first time), false if already granted
const tryXpEvent = async (userId: string, eventType: string, eventKey: string, xpAmount: number, counts: XpCounts = {}): Promise<boolean> => {
    const { error } = await supabase.from('xp_events').insert({ user_id: userId, event_type: eventType, event_key: eventKey });
    if (error) return false; // UNIQUE violation = already granted
    let profile = await fetchProfile(userId);
    profile = applyXp(profile, xpAmount);
    profile = applyAchievements(profile, counts);
    await saveProfile(profile);
    return true;
};

const getEventCount = async (userId: string, eventType: string): Promise<number> => {
    const { count } = await supabase.from('xp_events').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('event_type', eventType);
    return count || 0;
};

const saveProfile = async (profile: any) => {
    const { error } = await supabase.from('profiles').update({
        display_name: profile.display_name,
        role: profile.role,
        avatar: profile.avatar,
        cover_image: profile.cover_image,
        bio: profile.bio,
        xp: profile.xp,
        level: profile.level,
        is_banned: profile.is_banned,
        show_anime_list: profile.show_anime_list,
        watchlist: profile.watchlist,
        watched_episodes: profile.watched_episodes,
        liked_episodes: profile.liked_episodes,
        earned_achievements: profile.earned_achievements,
        displayed_badges: profile.displayed_badges,
        anime_list: profile.anime_list,
        custom_lists: profile.custom_lists,
        notifications: profile.notifications,
    }).eq('id', profile.id);
    if (error) throw new Error(error.message);
};

const fetchProfile = async (id: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error || !data) throw new Error('Profil bulunamadı');
    return data;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const login = async (emailOrUsername: string, password: string): Promise<AuthResponse> => {
    if (!USE_SUPABASE) {
        const users = ensureDemoUsers();
        const u = users.find((x: any) => (x.username === emailOrUsername || x.email === emailOrUsername) && x.password === password);
        if (!u) throw new Error('Geçersiz kullanıcı adı veya şifre');
        if (u.isBanned) throw new Error('Bu hesap engellenmiştir.');
        LS.set(LS_SESSION, u.id);
        return { user: lsMapUser(u), token: 'ls-token' };
    }
    let email = emailOrUsername;
    if (!emailOrUsername.includes('@')) {
        const { data, error } = await supabase.from('profiles').select('email').ilike('username', emailOrUsername).single();
        if (error || !data) throw new Error('Kullanıcı bulunamadı');
        email = data.email;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error('Geçersiz kullanıcı adı veya şifre');
    const profile = await fetchProfile(data.user.id);
    if (profile.is_banned) {
        // Süreli ban bittiyse otomatik kaldır
        if (profile.ban_expires_at && new Date(profile.ban_expires_at) <= new Date()) {
            await supabase.from('profiles').update({ is_banned: false, ban_expires_at: null }).eq('id', data.user.id);
        } else {
            await supabase.auth.signOut();
            const expiryMsg = profile.ban_expires_at
                ? `Bu hesap ${new Date(profile.ban_expires_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} tarihine kadar yasaklıdır.`
                : 'Bu hesap kalıcı olarak engellenmiştir.';
            throw new Error(expiryMsg);
        }
    }
    const user = mapProfile(profile, email);
    // Daily login XP (fire and forget)
    grantLoginXP(data.user.id).catch(() => {});
    return { user, token: data.session.access_token };
};

export const register = async (username: string, email: string, password: string): Promise<AuthResponse> => {
    if (!USE_SUPABASE) {
        const users = ensureDemoUsers();
        if (users.find((u: any) => u.username === username)) throw new Error('Bu kullanıcı adı zaten kullanımda');
        const newUser = { id: `ls-user-${Date.now()}`, username, email, password, role: 'user', avatar: '', bio: '', xp: 0, level: 1, isBanned: false, showAnimeList: true, watchlist: [], watchedEpisodes: [], likedEpisodes: [], animeList: [], customLists: [], earnedAchievements: [], displayedBadges: [], notifications: [], createdAt: new Date().toISOString() };
        lsSaveUser(newUser);
        LS.set(LS_SESSION, newUser.id);
        return { user: lsMapUser(newUser), token: 'ls-token' };
    }
    const { data: existing } = await supabase.from('profiles').select('id').eq('username', username).single();
    if (existing) throw new Error('Bu kullanıcı adı zaten kullanımda');
    const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { username } } });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error('Kayıt başarısız');
    // Trigger creates the profile; fetch it
    await new Promise(r => setTimeout(r, 800));
    const profile = await fetchProfile(data.user.id);
    const user = mapProfile(profile, email);
    return { user, token: data.session?.access_token || '' };
};

export const logout = async () => {
    if (!USE_SUPABASE) { LS.del(LS_SESSION); return; }
    await supabase.auth.signOut();
};

// Session nesnesini doğrudan alarak profil getirir.
// onAuthStateChange içinde kullanılır — tekrar getSession() çağırmaz,
// token yenileme race'ini önler.
export const getUserFromSession = async (session: { user: { id: string; email?: string | undefined } }): Promise<User | null> => {
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            const profile = await fetchProfile(session.user.id);
            if (profile.is_banned) {
                // Süre bittiyse otomatik kaldır
                if (profile.ban_expires_at && new Date(profile.ban_expires_at) <= new Date()) {
                    await supabase.from('profiles').update({ is_banned: false, ban_expires_at: null }).eq('id', session.user.id);
                } else {
                    await supabase.auth.signOut();
                    return null;
                }
            }
            return mapProfile(profile, session.user.email);
        } catch {
            if (attempt < 2) await new Promise(r => setTimeout(r, 800));
        }
    }
    return null;
};

export const getCurrentUser = async (): Promise<User | null> => {
    if (!USE_SUPABASE) {
        const id = LS.get(LS_SESSION);
        if (!id) return null;
        const u = lsGetUser(id);
        return u ? lsMapUser(u) : null;
    }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return null;
    return getUserFromSession(session);
};

// ─── Notifications ────────────────────────────────────────────────────────────

export const getNotifications = async (userId: string): Promise<Notification[]> => {
    // Read from user_notifications table (supports cross-user notifications like friend requests)
    const { data: rows } = await supabase.from('user_notifications')
        .select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(30);
    const tableNotifs: Notification[] = (rows || []).map((r: any) => ({
        id: r.id, userId: r.user_id, type: r.type as Notification['type'],
        title: r.title, message: r.message, isRead: r.is_read, createdAt: r.created_at,
    }));
    // Also read from profiles.notifications (legacy: level up, badge, anime request etc.)
    try {
        const profile = await fetchProfile(userId);
        const legacyNotifs: Notification[] = (profile.notifications || []);
        // Merge and deduplicate by id, sort by date
        const all = [...tableNotifs, ...legacyNotifs];
        const seen = new Set<string>();
        return all.filter(n => { if (seen.has(n.id)) return false; seen.add(n.id); return true; })
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch {
        return tableNotifs;
    }
};

export const markNotificationsAsRead = async (userId: string) => {
    // Mark user_notifications table rows as read
    await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    // Also mark legacy profile notifications
    try {
        const profile = await fetchProfile(userId);
        profile.notifications = (profile.notifications || []).map((n: Notification) => ({ ...n, isRead: true }));
        await saveProfile(profile);
    } catch { /* ignore */ }
};

export const clearNotifications = async (userId: string) => {
    await supabase.from('user_notifications').delete().eq('user_id', userId);
    try {
        const profile = await fetchProfile(userId);
        profile.notifications = [];
        await saveProfile(profile);
    } catch { /* ignore */ }
};

// ─── Leaderboard ──────────────────────────────────────────────────────────────

export const getLeaderboard = async (): Promise<User[]> => {
    const { data, error } = await supabase.from('profiles').select('*').order('xp', { ascending: false }).limit(10);
    if (error) return [];
    return (data || []).map(p => mapProfile(p));
};

// ─── Watchlist & Watch tracking ───────────────────────────────────────────────

export const toggleWatchlist = async (userId: string, animeId: string): Promise<boolean> => {
    let profile = await fetchProfile(userId);
    const list: string[] = profile.watchlist || [];
    const exists = list.includes(animeId);
    if (exists) {
        profile.watchlist = list.filter((id: string) => id !== animeId);
    } else {
        profile.watchlist = [...list, animeId];
        profile = applyXp(profile, 20);
        profile = applyAchievements(profile);
    }
    await saveProfile(profile);
    return !exists;
};

export const markEpisodeWatched = async (userId: string, episodeId: string) => {
    const profile = await fetchProfile(userId);
    if (!(profile.watched_episodes || []).includes(episodeId)) {
        profile.watched_episodes = [...(profile.watched_episodes || []), episodeId];
        await saveProfile(profile);
        return true;
    }
    return false;
};

export const unmarkEpisodeWatched = async (userId: string, episodeId: string) => {
    const profile = await fetchProfile(userId);
    profile.watched_episodes = (profile.watched_episodes || []).filter((id: string) => id !== episodeId);
    await saveProfile(profile);
};

export const grantWatchXP = async (userId: string, episodeId: string) => {
    const watchCount = await getEventCount(userId, 'watch_ep') + 1;
    await tryXpEvent(userId, 'watch_ep', episodeId, 50, { watchCount });
};

export const grantFriendXP = async (userId: string, friendId: string) => {
    const eventKey = [userId, friendId].sort().join('_');
    const friendsCount = await getEventCount(userId, 'friend_add') + 1;
    await tryXpEvent(userId, 'friend_add', eventKey, 30, { friendsCount });
};

export const grantMessageXP = async (userId: string) => {
    // Max 15 messages XP per day
    const today = new Date().toISOString().slice(0, 10);
    const { count: todayCount } = await supabase.from('xp_events')
        .select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('event_type', 'msg').gte('created_at', `${today}T00:00:00Z`);
    if ((todayCount || 0) >= 15) return;
    const eventKey = `${today}-${Date.now()}-${Math.random()}`;
    const messagesCount = await getEventCount(userId, 'msg') + 1;
    await tryXpEvent(userId, 'msg', eventKey, 2, { messagesCount });
};

export const grantNewsReadXP = async (userId: string, newsId: string) => {
    const newsCount = await getEventCount(userId, 'news_read') + 1;
    await tryXpEvent(userId, 'news_read', newsId, 10, { newsCount });
};

export const grantRequestXP = async (userId: string, requestId: string) => {
    const requestsCount = await getEventCount(userId, 'request') + 1;
    await tryXpEvent(userId, 'request', requestId, 20, { requestsCount });
};

export const grantRatingXP = async (userId: string, animeId: string) => {
    const ratingsCount = await getEventCount(userId, 'rating') + 1;
    await tryXpEvent(userId, 'rating', animeId, 15, { ratingsCount });
};

export const grantLoginXP = async (userId: string) => {
    const today = new Date().toISOString().slice(0, 10);
    await tryXpEvent(userId, 'login', today, 10);
};

export const toggleLikeEpisode = async (userId: string, _animeId: string, episodeId: string) => {
    const profile = await fetchProfile(userId);
    const liked: string[] = profile.liked_episodes || [];
    const isLiked = liked.includes(episodeId);
    profile.liked_episodes = isLiked ? liked.filter((id: string) => id !== episodeId) : [...liked, episodeId];
    await saveProfile(profile);
    return { liked: !isLiked, likesCount: profile.liked_episodes.length };
};

// ─── Comments ─────────────────────────────────────────────────────────────────

const BAD_WORDS = [
    'amk', 'amına', 'amını', 'bok', 'göt', 'götveren', 'ibne', 'orospu', 'piç', 'piçlik',
    'sik', 'sikerim', 'sikeyim', 'sikiş', 'sikişmek', 'oç', 'aq', 'a.q', 'a.k', 'mk',
    'oğlum', 'yarrak', 'yarak', 'yarrak', 'götveren', 'kahpe', 'kaltak', 'sürtük', 'fahişe',
    'pezevenk', 'bok', 'boktan', 'serefsiz', 'şerefsiz', 'gerizekalı', 'gerizekal',
    'aptal', 'salak', 'dangalak', 'mal', 'maldır',
];

const containsBadWord = (text: string): boolean => {
    const normalized = text.toLowerCase().replace(/[_\-.*]/g, '');
    return BAD_WORDS.some(w => normalized.includes(w));
};

const countLinks = (text: string): number => {
    return (text.match(/https?:\/\/\S+/gi) || []).length;
};

export const addComment = async (data: any) => {
    const content: string = data.content?.trim() || '';

    // Küfür filtresi
    if (containsBadWord(content)) {
        throw new Error('Yorumunuz uygunsuz ifadeler içeriyor. Lütfen düzenleyerek tekrar deneyin.');
    }

    // Max 2 link
    if (countLinks(content) > 2) {
        throw new Error('Yorumda en fazla 2 bağlantıya izin verilir.');
    }

    const now = Date.now();
    const FAST_SPAM_KEY = `comment_times_${data.userId}`;
    const DUPE_KEY = `comment_last_${data.userId}_${data.episodeId}`;
    const SLOW_BLOCK_KEY = `comment_slow_block_${data.userId}`;
    const FAST_BLOCK_KEY = `comment_fast_block_${data.userId}`;

    // 1 saatlik hız bloğu kontrolü
    const fastBlock = localStorage.getItem(FAST_BLOCK_KEY);
    if (fastBlock && now < parseInt(fastBlock)) {
        const remaining = Math.ceil((parseInt(fastBlock) - now) / 60000);
        throw new Error(`Çok hızlı yorum yaptınız. ${remaining} dakika sonra tekrar deneyebilirsiniz.`);
    }

    // 30 dakikalık tekrar bloğu kontrolü
    const slowBlock = localStorage.getItem(SLOW_BLOCK_KEY);
    if (slowBlock && now < parseInt(slowBlock)) {
        const remaining = Math.ceil((parseInt(slowBlock) - now) / 60000);
        throw new Error(`Aynı içerikli yorum gönderdiniz. ${remaining} dakika sonra tekrar deneyebilirsiniz.`);
    }

    // Aynı içerik kontrolü (son yorum)
    const lastDupe = localStorage.getItem(DUPE_KEY);
    if (lastDupe) {
        const { content: lastContent, time } = JSON.parse(lastDupe);
        if (lastContent === content && now - time < 30 * 60 * 1000) {
            localStorage.setItem(SLOW_BLOCK_KEY, String(now + 30 * 60 * 1000));
            throw new Error('Aynı yorumu tekrar gönderemezsiniz. 30 dakika beklemeniz gerekiyor.');
        }
    }

    // Hız kontrolü — son 10 saniyede 3'ten fazla yorum → 1 saat blok
    const times: number[] = JSON.parse(localStorage.getItem(FAST_SPAM_KEY) || '[]');
    const recent = times.filter(t => now - t < 10000);
    if (recent.length >= 3) {
        localStorage.setItem(FAST_BLOCK_KEY, String(now + 60 * 60 * 1000));
        throw new Error('Çok hızlı yorum yapıyorsunuz. 1 saat boyunca yorum yapamazsınız.');
    }
    recent.push(now);
    localStorage.setItem(FAST_SPAM_KEY, JSON.stringify(recent.slice(-10)));

    const { data: newC, error } = await supabase.from('comments').insert({
        episode_id: data.episodeId,
        user_id: data.userId,
        username: data.username,
        content,
        is_spoiler: data.isSpoiler || false,
    }).select().single();
    if (error) throw new Error(error.message);

    // Son yorumu kaydet (dupe kontrolü için)
    localStorage.setItem(DUPE_KEY, JSON.stringify({ content, time: now }));

    // XP for commenting
    try {
        let profile = await fetchProfile(data.userId);
        profile = applyXp(profile, 10);
        const { count } = await supabase.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', data.userId);
        profile = applyAchievements(profile, { commentsCount: count || 0 });
        await saveProfile(profile);
    } catch {}

    return {
        id: newC.id, episodeId: newC.episode_id, userId: newC.user_id,
        username: newC.username, content: newC.content,
        isSpoiler: newC.is_spoiler, createdAt: newC.created_at,
    };
};

export const getCommentsByEpisodeId = async (episodeId: string): Promise<Comment[]> => {
    const { data, error } = await supabase.from('comments').select('*').eq('episode_id', episodeId).order('created_at', { ascending: true });
    if (error) return [];
    if (!data || data.length === 0) return [];
    const userIds = [...new Set(data.map((c: any) => c.user_id))];
    const { data: profiles } = await supabase.from('profiles').select('id,avatar').in('id', userIds);
    const avatarMap = new Map((profiles || []).map((p: any) => [p.id, p.avatar || '']));
    return data.map(c => ({ id: c.id, episodeId: c.episode_id, userId: c.user_id, username: c.username, avatar: avatarMap.get(c.user_id) || '', content: c.content, isSpoiler: c.is_spoiler, createdAt: c.created_at }));
};

export const deleteComment = async (commentId: string, requestingUserId: string) => {
    const { data: comment } = await supabase.from('comments').select('user_id').eq('id', commentId).single();
    if (!comment) throw new Error('Yorum bulunamadı.');
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', requestingUserId).single();
    const isAdmin = profile?.role === 'admin' || profile?.role === 'moderator';
    if (comment.user_id !== requestingUserId && !isAdmin) throw new Error('Bu yorumu silme yetkiniz yok.');
    const { error } = await supabase.from('comments').delete().eq('id', commentId);
    if (error) throw new Error(error.message);
};

export const getUserComments = async (userId: string) => {
    const { data } = await supabase.from('comments').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    return (data || []).map(c => ({ id: c.id, episodeId: c.episode_id, userId: c.user_id, username: c.username, content: c.content, isSpoiler: c.is_spoiler, createdAt: c.created_at }));
};

// ─── Animes ───────────────────────────────────────────────────────────────────

export const getAnimes = async (filter?: { status?: AnimeStatus | null }): Promise<Anime[]> => {
    if (!USE_SUPABASE) {
        const all = lsGetAnimes();
        if (filter === undefined) return all.filter(a => a.status === 'approved');
        if (filter.status) return all.filter(a => a.status === filter.status);
        return all;
    }
    let query = supabase.from('animes').select('*').order('created_at', { ascending: false });
    if (filter === undefined) {
        query = query.eq('status', 'approved');
    } else if (filter.status) {
        query = query.eq('status', filter.status);
    }
    const { data, error } = await query;
    if (error) return [];
    return (data || []).map(mapAnime);
};

export const getAnimeById = async (id: string): Promise<Anime | null> => {
    if (!USE_SUPABASE) return lsGetAnimes().find(a => a.id === id) || null;
    const { data, error } = await supabase.from('animes').select('*').eq('id', id).single();
    if (error || !data) return null;
    return mapAnime(data);
};

export const createAnime = async (animeData: any, user: User): Promise<Anime> => {
    const { data, error } = await supabase.from('animes').insert({
        title: animeData.title,
        description: animeData.description || '',
        cover_image: animeData.coverImage || '',
        banner_image: animeData.bannerImage || '',
        genres: animeData.genres || [],
        episodes: [],
        status: user.role === UserRole.ADMIN ? 'approved' : 'pending',
        uploaded_by: user.id,
        characters: animeData.characters || [],
    }).select().single();
    if (error) throw new Error(error.message);
    return mapAnime(data);
};

export const createAnimeWithEpisodes = async (animeData: any, episodesData: any[], user: User): Promise<Anime> => {
    const episodes = episodesData.map((ep, i) => ({ ...ep, id: `ep-${Date.now()}-${i}`, likes: 0 }));
    const { data, error } = await supabase.from('animes').insert({
        title: animeData.title,
        description: animeData.description || '',
        cover_image: animeData.coverImage || '',
        banner_image: animeData.bannerImage || '',
        genres: animeData.genres || [],
        episodes,
        status: user.role === UserRole.ADMIN ? 'approved' : 'pending',
        uploaded_by: user.id,
        characters: animeData.characters || [],
        average_rating: 0,
        ratings_count: 0,
    }).select().single();
    if (error) throw new Error(error.message);
    return mapAnime(data);
};

export const approveAnime = async (animeId: string) => {
    await supabase.from('animes').update({ status: 'approved' }).eq('id', animeId);
};

export const deleteAnime = async (animeId: string) => {
    await supabase.from('animes').delete().eq('id', animeId);
};

export const updateAnime = async (animeId: string, data: Partial<Anime>) => {
    const update: any = {};
    if (data.title !== undefined) update.title = data.title;
    if (data.description !== undefined) update.description = data.description;
    if ((data as any).coverImage !== undefined) update.cover_image = (data as any).coverImage;
    if ((data as any).bannerImage !== undefined) update.banner_image = (data as any).bannerImage;
    if (data.genres !== undefined) update.genres = data.genres;
    if (data.status !== undefined) update.status = data.status;
    if (data.characters !== undefined) update.characters = data.characters;
    await supabase.from('animes').update(update).eq('id', animeId);
};

// ─── Episodes ─────────────────────────────────────────────────────────────────

const getEpisodesRaw = async (animeId: string): Promise<any[]> => {
    const { data } = await supabase.from('animes').select('episodes').eq('id', animeId).single();
    return data?.episodes || [];
};

const setEpisodes = async (animeId: string, episodes: any[]) => {
    await supabase.from('animes').update({ episodes }).eq('id', animeId);
};

export const addEpisode = async (animeId: string, episodeData: any) => {
    const eps = await getEpisodesRaw(animeId);
    eps.push({ ...episodeData, id: `ep-${Date.now()}`, likes: 0 });
    await setEpisodes(animeId, eps);
};

export const addEpisodes = async (animeId: string, episodesData: any[]) => {
    const eps = await getEpisodesRaw(animeId);
    episodesData.forEach((ep, i) => eps.push({ ...ep, id: `ep-${Date.now()}-${i}`, likes: 0 }));
    await setEpisodes(animeId, eps);
};

export const updateEpisode = async (animeId: string, episodeId: string, data: Partial<Episode>) => {
    const eps = await getEpisodesRaw(animeId);
    const idx = eps.findIndex((e: any) => e.id === episodeId);
    if (idx === -1) throw new Error('Bölüm bulunamadı');
    eps[idx] = { ...eps[idx], ...data };
    await setEpisodes(animeId, eps);
};

export const deleteEpisode = async (animeId: string, episodeId: string) => {
    const eps = await getEpisodesRaw(animeId);
    await setEpisodes(animeId, eps.filter((e: any) => e.id !== episodeId));
};

// ─── Anime List (user ratings & watch status) ─────────────────────────────────

export const saveAnimeEntry = async (userId: string, animeId: string, entry: { status: string; rating?: number; review?: string }) => {
    let profile = await fetchProfile(userId);
    const animeList: any[] = profile.anime_list || [];
    const idx = animeList.findIndex((e: any) => e.animeId === animeId);
    const newEntry = { animeId, ...entry, updatedAt: new Date().toISOString() };
    const isNew = idx === -1;
    if (isNew) { animeList.push(newEntry); profile = applyXp(profile, 20); profile = applyAchievements(profile); }
    else { animeList[idx] = newEntry; }
    profile.anime_list = animeList;
    await saveProfile(profile);

    // Grant rating XP (once per anime)
    if (entry.rating) {
        await grantRatingXP(userId, animeId);
    }

    if (entry.rating) {
        await supabase.from('anime_ratings').upsert({ user_id: userId, anime_id: animeId, rating: entry.rating });
        const { data: ratings } = await supabase.from('anime_ratings').select('rating').eq('anime_id', animeId);
        if (ratings && ratings.length > 0) {
            const avg = ratings.reduce((s: number, r: any) => s + r.rating, 0) / ratings.length;
            await supabase.from('animes').update({ average_rating: parseFloat(avg.toFixed(1)), ratings_count: ratings.length }).eq('id', animeId);
        }
    }
};

export const getAnimeEntry = async (userId: string, animeId: string): Promise<AnimeEntry | null> => {
    const profile = await fetchProfile(userId);
    return (profile.anime_list || []).find((e: any) => e.animeId === animeId) || null;
};

export const getUserAnimeList = async (userId: string): Promise<AnimeEntry[]> => {
    const profile = await fetchProfile(userId);
    return profile.anime_list || [];
};

// ─── News ─────────────────────────────────────────────────────────────────────

export const getNews = async (includeAll = false): Promise<NewsItem[]> => {
    let query = supabase.from('news').select('*').order('created_at', { ascending: false });
    if (!includeAll) query = query.eq('status', 'published');
    const { data } = await query;
    return (data || []).map(n => ({ id: n.id, title: n.title, excerpt: n.excerpt, content: n.content, image: n.image, category: n.category, createdAt: n.created_at, status: n.status, authorId: n.author_id, links: n.links || [] }));
};

export const getNewsById = async (id: string): Promise<NewsItem | null> => {
    const { data } = await supabase.from('news').select('*').eq('id', id).single();
    if (!data) return null;
    return { id: data.id, title: data.title, excerpt: data.excerpt, content: data.content, image: data.image, category: data.category, createdAt: data.created_at, status: data.status, authorId: data.author_id, links: data.links || [] };
};

export const createNews = async (d: Partial<NewsItem>, user: User): Promise<NewsItem> => {
    const { data, error } = await supabase.from('news').insert({
        title: d.title || '', excerpt: d.excerpt || '', content: d.content || '',
        image: d.image || '', category: d.category || 'Genel',
        status: user.role === UserRole.ADMIN ? 'published' : 'pending',
        author_id: user.id, links: d.links || [],
    }).select().single();
    if (error) throw new Error(error.message);
    return { id: data.id, title: data.title, excerpt: data.excerpt, content: data.content, image: data.image, category: data.category, createdAt: data.created_at, status: data.status, authorId: data.author_id, links: data.links };
};

export const updateNews = async (id: string, d: Partial<NewsItem>): Promise<NewsItem> => {
    const update: any = {};
    if (d.title !== undefined) update.title = d.title;
    if (d.excerpt !== undefined) update.excerpt = d.excerpt;
    if (d.content !== undefined) update.content = d.content;
    if (d.image !== undefined) update.image = d.image;
    if (d.category !== undefined) update.category = d.category;
    if (d.status !== undefined) update.status = d.status;
    if (d.links !== undefined) update.links = d.links;
    const { data, error } = await supabase.from('news').update(update).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return { id: data.id, title: data.title, excerpt: data.excerpt, content: data.content, image: data.image, category: data.category, createdAt: data.created_at, status: data.status, authorId: data.author_id, links: data.links };
};

export const deleteNews = async (id: string) => { await supabase.from('news').delete().eq('id', id); };
export const approveNews = async (id: string) => { await updateNews(id, { status: 'published' }); };

// ─── Site Stats ───────────────────────────────────────────────────────────────

export const getSiteStats = async (): Promise<SiteStats> => {
    const [users, animes, pending, comments] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('animes').select('*', { count: 'exact', head: true }),
        supabase.from('animes').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('comments').select('*', { count: 'exact', head: true }),
    ]);
    return { totalUsers: users.count || 0, totalAnimes: animes.count || 0, pendingAnimes: pending.count || 0, totalComments: comments.count || 0 };
};

// ─── User management ──────────────────────────────────────────────────────────

export const getUsers = async (): Promise<User[]> => {
    const { data } = await supabase.from('profiles')
        .select('id,username,display_name,email,role,xp,level,is_banned,ban_expires_at,created_at,bio,cover_image,watchlist,watched_episodes,liked_episodes,anime_list,custom_lists,earned_achievements,displayed_badges,notifications,show_anime_list')
        .order('created_at', { ascending: false });
    return (data || []).map(p => mapProfile(p));
};

export const getUserById = async (id: string): Promise<User | null> => {
    try { return mapProfile(await fetchProfile(id)); } catch { return null; }
};

// durationDays: gün sayısı (1,3,7,30,365...) veya null = kalıcı
export const banUser = async (id: string, durationDays: number | null) => {
    const expiresAt = durationDays ? new Date(Date.now() + durationDays * 86400000).toISOString() : null;
    // Try with ban_expires_at first; if column doesn't exist yet, fall back to just is_banned
    const { error } = await supabase.from('profiles').update({ is_banned: true, ban_expires_at: expiresAt }).eq('id', id);
    if (error) {
        await supabase.from('profiles').update({ is_banned: true }).eq('id', id);
    }
};

export const unbanUser = async (id: string) => {
    const { error } = await supabase.from('profiles').update({ is_banned: false, ban_expires_at: null }).eq('id', id);
    if (error) {
        await supabase.from('profiles').update({ is_banned: false }).eq('id', id);
    }
};

/** @deprecated use banUser/unbanUser */
export const toggleBanUser = async (id: string) => {
    const profile = await fetchProfile(id);
    if (profile.is_banned) {
        await unbanUser(id);
    } else {
        await banUser(id, null);
    }
};

export const updateUserRole = async (userId: string, newRole: UserRole) => {
    await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
};

export const deleteUser = async (userId: string) => {
    // Delete auth user via Edge Function (cascades to profile via FK)
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Oturum bulunamadı');

    const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL ?? 'https://btfmgxbrxellkfbsnwzs.supabase.co'}/functions/v1/admin-delete-user`,
        {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }),
        }
    );
    if (!res.ok) throw new Error(await res.text());
};

// ─── Anime Requests ──────────────────────────────────────────────────────────

const REQUEST_RATE_KEY = 'anipal_last_request';

export const submitAnimeRequest = async (userId: string, username: string, displayName: string, animeName: string, note: string): Promise<{ id: string } | null> => {
    // Rate limit: 1 per day (localStorage)
    const lastReq = localStorage.getItem(REQUEST_RATE_KEY);
    if (lastReq) {
        const diff = Date.now() - parseInt(lastReq, 10);
        if (diff < 86400000) {
            const hoursLeft = Math.ceil((86400000 - diff) / 3600000);
            throw new Error(`Günde yalnızca 1 istek yapabilirsiniz. ${hoursLeft} saat sonra tekrar deneyin.`);
        }
    }
    const { data, error } = await supabase.from('anime_requests').insert({
        user_id: userId, username, display_name: displayName, anime_name: animeName, note, status: 'pending',
    }).select('id').single();
    if (error) throw new Error(error.message);
    localStorage.setItem(REQUEST_RATE_KEY, Date.now().toString());
    return data;
};

export const getAnimeRequests = async (): Promise<import('../types').AnimeRequest[]> => {
    const { data, error } = await supabase.from('anime_requests').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        displayName: r.display_name,
        animeName: r.anime_name,
        note: r.note,
        status: r.status,
        createdAt: r.created_at,
    }));
};

export const updateAnimeRequestStatus = async (id: string, status: 'approved' | 'rejected'): Promise<void> => {
    const { data: req, error: fetchErr } = await supabase.from('anime_requests').select('*').eq('id', id).single();
    if (fetchErr || !req) throw new Error(fetchErr?.message || 'İstek bulunamadı');

    const { error } = await supabase.from('anime_requests').update({ status }).eq('id', id);
    if (error) throw new Error(error.message);

    // Bildirimi kullanıcının profiles.notifications dizisine ekle
    const { data: profile } = await supabase.from('profiles').select('notifications').eq('id', req.user_id).single();
    const notifications = profile?.notifications || [];
    const newNotif = {
        id: `notif-${Date.now()}`,
        userId: req.user_id,
        type: 'ANIME_REQUEST',
        title: status === 'approved' ? 'İsteğin Onaylandı!' : 'İsteğin Reddedildi',
        message: status === 'approved'
            ? `"${req.anime_name}" isteğin onaylandı.`
            : `"${req.anime_name}" isteğin reddedildi.`,
        isRead: false,
        createdAt: new Date().toISOString(),
    };
    await supabase.from('profiles').update({ notifications: [newNotif, ...notifications] }).eq('id', req.user_id);
};

export const updateUserProfile = async (id: string, data: any): Promise<User> => {
    const update: any = {};
    if (data.displayName !== undefined) update.display_name = data.displayName;
    if (data.avatar !== undefined) update.avatar = data.avatar;
    if (data.coverImage !== undefined) update.cover_image = data.coverImage;
    if (data.bio !== undefined) update.bio = data.bio;
    if (data.displayedBadges !== undefined) update.displayed_badges = data.displayedBadges;
    const { data: updated, error } = await supabase.from('profiles').update(update).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    return mapProfile(updated);
};

export const updatePrivacySettings = async (userId: string, settings: { showAnimeList?: boolean; allowMessages?: boolean; isPrivate?: boolean }) => {
    const update: any = {};
    if (settings.showAnimeList !== undefined) update.show_anime_list = settings.showAnimeList;
    if (settings.allowMessages !== undefined) update.allow_messages = settings.allowMessages;
    if (settings.isPrivate !== undefined) update.is_private = settings.isPrivate;
    await supabase.from('profiles').update(update).eq('id', userId);
};

export const changePassword = async (_userId: string, _oldPass: string, newPass: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) throw new Error(error.message);
};

export const changeUsername = async (userId: string, newUsername: string): Promise<User> => {
    const { data: existing } = await supabase.from('profiles').select('id').eq('username', newUsername).single();
    if (existing) throw new Error('Bu kullanıcı adı zaten kullanılıyor.');
    const { data, error } = await supabase.from('profiles').update({ username: newUsername }).eq('id', userId).select().single();
    if (error) throw new Error(error.message);
    return mapProfile(data);
};

export const changeEmail = async (_userId: string, newEmail: string): Promise<User> => {
    const { error } = await supabase.auth.updateUser({ email: newEmail });
    if (error) throw new Error(error.message);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Oturum bulunamadı');
    const profile = await fetchProfile(session.user.id);
    await supabase.from('profiles').update({ email: newEmail }).eq('id', session.user.id);
    return mapProfile(profile, newEmail);
};

export const deleteAccount = async (id: string) => {
    // Delete auth user via Edge Function (cascades to profile)
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Oturum bulunamadı');

    const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL ?? 'https://btfmgxbrxellkfbsnwzs.supabase.co'}/functions/v1/admin-delete-user`,
        {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: id }),
        }
    );
    if (!res.ok) throw new Error(await res.text());
};

// ─── Custom Lists ─────────────────────────────────────────────────────────────

export const getUserLists = async (userId: string): Promise<UserList[]> => {
    const profile = await fetchProfile(userId);
    let lists: UserList[] = profile.custom_lists || [];
    if (lists.length === 0) {
        lists = [{ id: `list-${userId}-default`, name: 'İzlenecekler', isPublic: false, animeIds: [], createdAt: new Date().toISOString() }];
        await supabase.from('profiles').update({ custom_lists: lists }).eq('id', userId);
    }
    return lists;
};

export const createUserList = async (userId: string, name: string, isPublic: boolean): Promise<UserList> => {
    let profile = await fetchProfile(userId);
    const newList: UserList = { id: `list-${Date.now()}`, name, isPublic, animeIds: [], createdAt: new Date().toISOString() };
    profile.custom_lists = [...(profile.custom_lists || []), newList];
    profile = applyXp(profile, 15);
    profile = applyAchievements(profile);
    await saveProfile(profile);
    return newList;
};

export const deleteUserList = async (userId: string, listId: string) => {
    const profile = await fetchProfile(userId);
    profile.custom_lists = (profile.custom_lists || []).filter((l: UserList) => l.id !== listId);
    await saveProfile(profile);
};

export const addAnimeToList = async (userId: string, listId: string, animeId: string) => {
    const profile = await fetchProfile(userId);
    const lists: UserList[] = profile.custom_lists || [];
    const idx = lists.findIndex((l: UserList) => l.id === listId);
    if (idx === -1) return;
    if (!lists[idx].animeIds.includes(animeId)) lists[idx].animeIds = [...lists[idx].animeIds, animeId];
    profile.custom_lists = lists;
    await saveProfile(profile);
};

export const removeAnimeFromList = async (userId: string, listId: string, animeId: string) => {
    const profile = await fetchProfile(userId);
    const lists: UserList[] = profile.custom_lists || [];
    const idx = lists.findIndex((l: UserList) => l.id === listId);
    if (idx === -1) return;
    lists[idx].animeIds = lists[idx].animeIds.filter((id: string) => id !== animeId);
    profile.custom_lists = lists;
    await saveProfile(profile);
};

export const updateListVisibility = async (userId: string, listId: string, isPublic: boolean) => {
    const profile = await fetchProfile(userId);
    const lists: UserList[] = profile.custom_lists || [];
    const idx = lists.findIndex((l: UserList) => l.id === listId);
    if (idx === -1) return;
    lists[idx].isPublic = isPublic;
    profile.custom_lists = lists;
    await saveProfile(profile);
};

export const getPublicLists = async (userId: string): Promise<UserList[]> => {
    const profile = await fetchProfile(userId);
    return (profile.custom_lists || []).filter((l: UserList) => l.isPublic);
};

// ─── External APIs (değişmedi) ────────────────────────────────────────────────

const GENRE_MAP: Record<string, string> = {
    'Action': 'Aksiyon', 'Adventure': 'Macera', 'Comedy': 'Komedi', 'Drama': 'Drama',
    'Fantasy': 'Fantezi', 'Horror': 'Korku', 'Mystery': 'Gizem', 'Psychological': 'Psikolojik',
    'Romance': 'Romantizm', 'Sci-Fi': 'Bilim Kurgu', 'Slice of Life': 'Günlük Yaşam',
    'Sports': 'Spor', 'Supernatural': 'Doğaüstü', 'Thriller': 'Gerilim',
    'Isekai': 'Isekai', 'Historical': 'Tarihi', 'School': 'Okul', 'Military': 'Askeri',
    'Magic': 'Büyü', 'Samurai': 'Samuray', 'Martial Arts': 'Dövüş Sanatları',
    'Super Power': 'Süper Güç', 'Space': 'Uzay', 'Vampire': 'Vampir',
    'Shounen': 'Shōnen', 'Shoujo': 'Shōjo', 'Seinen': 'Seinen',
};
const translateGenres = (genres: string[]) => genres.map(g => GENRE_MAP[g] || g);
const stripHtml = (html: string) => html.replace(/<[^>]*>?/gm, '').replace(/\n{3,}/g, '\n\n').trim();
const translateText = async (text: string): Promise<string> => {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        return (data[0] as any[]).map((item: any) => item[0]).join('');
    } catch { return text; }
};

export const fetchAniListData = async (search: string) => {
    const query = `query ($search: String) { Media (search: $search, type: ANIME) { id idMal title { romaji english } description coverImage { extraLarge } bannerImage genres averageScore characters(sort: ROLE, perPage: 12) { edges { node { id name { full } image { medium large } } role } } } }`;
    const response = await fetch('https://graphql.anilist.co', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables: { search } }) });
    const data = await response.json();
    const media = data.data.Media;
    if (!media) return null;
    const rawDesc = media.description ? stripHtml(media.description) : '';
    const translatedDesc = rawDesc ? await translateText(rawDesc) : '';
    const translatedGenres = translateGenres(media.genres || []);
    const characters = (media.characters?.edges || []).map((edge: any) => ({ id: edge.node.id, name: edge.node.name.full, image: edge.node.image.large || edge.node.image.medium, role: edge.role }));
    return { ...media, description: translatedDesc, genres: translatedGenres, characters };
};

export const fetchMALEpisodes = async (anilistId: number): Promise<{ number: number; title: string; thumbnail: string }[]> => {
    const res = await fetch(`https://api.ani.zip/mappings?anilist_id=${anilistId}`);
    const data = await res.json();
    if (!data.episodes || typeof data.episodes !== 'object') return [];
    const entries = Object.entries(data.episodes).filter(([key]) => !isNaN(Number(key)) && Number(key) > 0).sort(([a], [b]) => Number(a) - Number(b)) as [string, any][];
    if (entries.length === 0) return [];
    const needsTranslation: string[] = [];
    const needsTranslationIdx: number[] = [];
    entries.forEach(([, ep], i) => { const trTitle = ep.title?.tr; const enTitle = ep.title?.en || ep.title?.['x-jat'] || ''; if (!trTitle && enTitle) { needsTranslation.push(enTitle); needsTranslationIdx.push(i); } });
    let translated: string[] = [];
    if (needsTranslation.length > 0) { const joined = needsTranslation.join('\n||||\n'); translated = (await translateText(joined)).split(/\n\|\|\|\|\n/); }
    let tc = 0;
    return entries.map(([epNum, ep], i) => { const trTitle = ep.title?.tr; let title: string; if (trTitle) { title = trTitle; } else if (needsTranslationIdx.includes(i)) { title = translated[tc++] || ep.title?.en || `${epNum}. Bölüm`; } else { title = `${epNum}. Bölüm`; } return { number: Number(epNum), title: title.trim(), thumbnail: ep.image || '' }; });
};

const fetchWithProxy = async (targetUrl: string): Promise<string> => {
    const enc = encodeURIComponent(targetUrl);
    const proxies: [string, boolean][] = [
        [`https://api.allorigins.win/get?url=${enc}`, true],
        [`https://api.codetabs.com/v1/proxy?quest=${enc}`, false],
        [`https://corsproxy.io/?${enc}`, false],
    ];
    for (const [proxyUrl, isJson] of proxies) {
        try {
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
            if (!res.ok) continue;
            const text = isJson ? (await res.json()).contents || '' : await res.text();
            if (text && text.length > 1000 && /<html/i.test(text)) return text;
        } catch {}
    }
    throw new Error('Sayfa proxy üzerinden alınamadı.');
};

export const fetchANNArticle = async (url: string): Promise<{ title: string; excerpt: string; content: string; image: string; category: string }> => {
    const html = await fetchWithProxy(url);
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || doc.querySelector('title')?.textContent?.replace(' - Anime News Network', '').trim() || '';
    const rawOgImage = (doc.querySelector('meta[property="og:image"]')?.getAttribute('content') || '').replace(/\/thumbnails\/[^/]+\//, '/images/').replace(/\/fit\d+x\d+\//, '/');
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
    const candidateSelectors = ['#content-zone .news-body', '#content-zone .meat', '.news-body', '.meat', '#content-zone', 'main'];
    let articleEl: Element | null = null;
    for (const sel of candidateSelectors) { articleEl = doc.querySelector(sel); if (articleEl) break; }
    let rawContent = '';
    if (articleEl) { articleEl.querySelectorAll('script,style,nav,header,footer,.ad,.banner,iframe').forEach(el => el.remove()); const paragraphs = Array.from(articleEl.querySelectorAll('p')); rawContent = paragraphs.length > 0 ? paragraphs.map(p => p.textContent?.trim()).filter(Boolean).join('\n\n') : articleEl.textContent?.trim() || ''; }
    if (!rawContent && ogDesc) rawContent = ogDesc;
    rawContent = rawContent.slice(0, 4000);
    let category = 'Haber';
    if (url.includes('/reviews')) category = 'İnceleme';
    else if (url.includes('/feature')) category = 'Röportaj';
    else if (url.includes('/interest/')) category = 'Özel';
    const parts2translate = [ogTitle, ogDesc || rawContent.slice(0, 300), rawContent];
    const translated = await translateText(parts2translate.join('\n||||\n'));
    const parts = translated.split('\n||||\n');
    return { title: parts[0]?.trim() || ogTitle, excerpt: parts[1]?.trim() || ogDesc, content: parts[2]?.trim() || rawContent, image: rawOgImage, category };
};

// ─── Turkish Site Scraper (değişmedi) ─────────────────────────────────────────

const EMBED_PROVIDERS: { test: RegExp; name: string }[] = [
    { test: /sibnet\.ru/i, name: 'Sibnet' }, { test: /tau\.com\.tr|taudtmi\.com|taudt|tau-video/i, name: 'Tau' },
    { test: /streamtape\./i, name: 'Streamtape' }, { test: /ok\.ru|odnoklassniki/i, name: 'OK.ru' },
    { test: /my\.mail\.ru|mail\.ru\/v\//i, name: 'Mail.ru' }, { test: /drive\.google|docs\.google.*\/file\//i, name: 'Google Drive' },
    { test: /dood\.|doodstream/i, name: 'Doodstream' }, { test: /mp4upload\./i, name: 'MP4Upload' },
    { test: /filemoon\./i, name: 'Filemoon' }, { test: /fembed\.|fembad\./i, name: 'Fembed' },
    { test: /vidmoly\./i, name: 'Vidmoly' }, { test: /sendvid\./i, name: 'Sendvid' },
    { test: /youtu\.be|youtube\.com\/embed/i, name: 'YouTube' }, { test: /dailymotion\.com\/embed/i, name: 'Dailymotion' },
    { test: /vimeo\.com\/video/i, name: 'Vimeo' },
];
const identifyProvider = (url: string): string => { for (const { test, name } of EMBED_PROVIDERS) { if (test.test(url)) return name; } try { const h = new URL(url).hostname.replace('www.', ''); return h.split('.')[0].charAt(0).toUpperCase() + h.split('.')[0].slice(1); } catch { return 'Video'; } };
const extractSourcesFromRoot = (root: Element | Document, pageOrigin: string): VideoSource[] => {
    const sources: VideoSource[] = []; const seen = new Set<string>();
    const add = (raw: string) => { let url = raw.trim(); if (url.startsWith('//')) url = 'https:' + url; if (!url.startsWith('http') || seen.has(url)) return; try { const u = new URL(url); if (pageOrigin && u.origin === pageOrigin) return; if (/google-analytics|gtm|facebook|doubleclick|adservice/i.test(u.hostname)) return; const isKnown = EMBED_PROVIDERS.some(p => p.test.test(url)); const looksLike = /embed|player|watch|video|shell|stream/i.test(u.pathname + u.search); if (!isKnown && !looksLike) return; } catch { return; } seen.add(url); sources.push({ name: identifyProvider(url), url }); };
    root.querySelectorAll('iframe,frame').forEach(el => { ['src','data-src','data-lazy-src','data-original'].forEach(attr => { const v = el.getAttribute(attr) || ''; if (v) add(v); }); });
    root.querySelectorAll('[data-video],[data-url],[data-embed],[data-iframe],[data-src],[data-player]').forEach(el => { ['data-video','data-url','data-embed','data-iframe','data-src','data-player'].forEach(attr => { const v = el.getAttribute(attr) || ''; if (v && v.startsWith('http')) add(v); }); });
    return sources;
};

export interface TurkishSiteFansub { name: string; episodes: { epNum: number; sources: VideoSource[] }[]; }
export interface TurkishSiteResult { siteName: string; fansubs: TurkishSiteFansub[]; fetchedCount: number; totalFound: number; error?: string; }
export const fetchAnimeFromTurkishSite = async (inputUrl: string, _totalEpisodes: number, onProgress?: (msg: string) => void): Promise<TurkishSiteResult> => {
    const hostname = (() => { try { return new URL(inputUrl).hostname.replace('www.', ''); } catch { return ''; } })();
    const siteName = hostname.includes('turkanime') ? 'TurkAnime' : hostname.includes('seicode') ? 'Seicode' : hostname.split('.')[0] || 'Kaynak';
    try {
        onProgress?.(`${siteName} sayfası çekiliyor...`);
        const html = await fetchWithProxy(inputUrl);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const sources = extractSourcesFromRoot(doc, new URL(inputUrl).origin);
        if (sources.length === 0) return { siteName, fansubs: [], fetchedCount: 0, totalFound: 0, error: 'Kaynak bulunamadı.' };
        return { siteName, fansubs: [{ name: siteName, episodes: [{ epNum: 1, sources }] }], fetchedCount: 1, totalFound: 1 };
    } catch (e: any) {
        return { siteName, fansubs: [], fetchedCount: 0, totalFound: 0, error: e.message };
    }
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const getMiniProfiles = async (ids: string[]): Promise<Map<string, { username: string; avatar: string }>> => {
    const unique = [...new Set(ids.filter(id => id && UUID_RE.test(id)))];
    if (!unique.length) return new Map();
    const { data, error } = await supabase.from('profiles').select('id, username, avatar_url').in('id', unique);
    if (error) return new Map();
    return new Map((data || []).map((p: any) => [p.id, { username: p.username, avatar: p.avatar_url || '' }]));
};

// ─── Episode Contributions ─────────────────────────────────────────────────────

export const submitContribution = async (
    userId: string,
    data: { animeId: string; episodeNumber: number; episodeTitle: string; thumbnail?: string; fansubName: string; sources: { name: string; url: string }[]; type?: 'episode' | 'source'; targetEpisodeId?: string }
) => {
    // Try insert with type columns first; fall back without them if migration not yet applied
    let { error } = await supabase.from('episode_contributions').insert({
        anime_id: data.animeId,
        episode_number: data.episodeNumber,
        episode_title: data.episodeTitle,
        thumbnail: data.thumbnail || '',
        fansub_name: data.fansubName,
        sources: data.sources,
        submitted_by: userId,
        status: 'pending',
        type: data.type || 'episode',
        target_episode_id: data.targetEpisodeId || null,
    });
    if (error && error.message.includes('target_episode_id')) {
        // Migration not applied yet — insert without new columns
        const res = await supabase.from('episode_contributions').insert({
            anime_id: data.animeId,
            episode_number: data.episodeNumber,
            episode_title: data.episodeTitle,
            thumbnail: data.thumbnail || '',
            fansub_name: data.fansubName,
            sources: data.sources,
            submitted_by: userId,
            status: 'pending',
        });
        error = res.error;
    }
    if (error) throw new Error(error.message);
};

export const getMyContributions = async (userId: string): Promise<EpisodeContribution[]> => {
    const { data, error } = await supabase
        .from('episode_contributions')
        .select('*, profiles(username, avatar_url)')
        .eq('submitted_by', userId)
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({
        id: r.id,
        animeId: r.anime_id,
        type: r.type || 'episode',
        targetEpisodeId: r.target_episode_id,
        episodeNumber: r.episode_number,
        episodeTitle: r.episode_title,
        thumbnail: r.thumbnail,
        fansubName: r.fansub_name,
        sources: r.sources || [],
        submittedBy: r.submitted_by,
        submitterUsername: r.profiles?.username,
        status: r.status,
        pendingAction: r.pending_action,
        pendingData: r.pending_data,
        adminNote: r.admin_note,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    }));
};

export const getPendingContributions = async (): Promise<EpisodeContribution[]> => {
    const { data, error } = await supabase
        .from('episode_contributions')
        .select('*, profiles(username, avatar_url)')
        .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map((r: any) => ({
        id: r.id,
        animeId: r.anime_id,
        type: r.type || 'episode',
        targetEpisodeId: r.target_episode_id,
        episodeNumber: r.episode_number,
        episodeTitle: r.episode_title,
        thumbnail: r.thumbnail,
        fansubName: r.fansub_name,
        sources: r.sources || [],
        submittedBy: r.submitted_by,
        submitterUsername: r.profiles?.username,
        submitterAvatar: r.profiles?.avatar_url,
        status: r.status,
        pendingAction: r.pending_action,
        pendingData: r.pending_data,
        adminNote: r.admin_note,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
    }));
};

export const approveContribution = async (id: string) => {
    // Get contribution
    const { data: contrib, error: fetchErr } = await supabase
        .from('episode_contributions')
        .select('*')
        .eq('id', id)
        .single();
    if (fetchErr || !contrib) throw new Error('Katkı bulunamadı');

    // Fetch contributor profile for attribution
    const { data: profile } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', contrib.submitted_by)
        .single();

    // Get anime episodes
    const eps = await getEpisodesRaw(contrib.anime_id);
    // For source type: find by target_episode_id first, else fall back to episode_number
    const epIdx = contrib.target_episode_id
        ? eps.findIndex((e: any) => e.id === contrib.target_episode_id)
        : eps.findIndex((e: any) => e.number === contrib.episode_number);
    const newFansub = {
        name: contrib.fansub_name,
        sources: contrib.sources,
        contributorId: contrib.submitted_by,
        contributorUsername: profile?.username || null,
        contributorAvatar: profile?.avatar_url || null,
    };

    if (epIdx === -1 && (contrib.type || 'episode') === 'episode') {
        // Create new episode
        eps.push({
            id: `ep-${Date.now()}`,
            number: contrib.episode_number,
            title: contrib.episode_title,
            thumbnail: contrib.thumbnail || '',
            videoUrl: contrib.sources?.[0]?.url || '',
            sources: contrib.sources,
            fansubs: [newFansub],
            fansub: contrib.fansub_name,
            likes: 0,
        });
    } else if (epIdx !== -1) {
        // Add fansub to existing episode
        const existing = eps[epIdx];
        const fansubs = existing.fansubs || [];
        const fbIdx = fansubs.findIndex((f: any) => f.name === contrib.fansub_name);
        if (fbIdx === -1) fansubs.push(newFansub);
        else fansubs[fbIdx] = newFansub;
        eps[epIdx] = { ...existing, fansubs };
    }

    await setEpisodes(contrib.anime_id, eps);
    await supabase.from('episode_contributions').update({ status: 'approved', pending_action: null, pending_data: null, updated_at: new Date().toISOString() }).eq('id', id);
};

export const rejectContribution = async (id: string, note?: string) => {
    await supabase.from('episode_contributions').update({ status: 'rejected', admin_note: note || null, updated_at: new Date().toISOString() }).eq('id', id);
};

export const requestEditContribution = async (id: string, newData: { fansubName?: string; sources?: { name: string; url: string }[]; episodeTitle?: string; thumbnail?: string }) => {
    const { error } = await supabase.from('episode_contributions').update({
        pending_action: 'edit',
        pending_data: newData,
        updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw new Error(error.message);
};

export const requestDeleteContribution = async (id: string) => {
    const { error } = await supabase.from('episode_contributions').update({
        pending_action: 'delete',
        updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) throw new Error(error.message);
};

export const approveContributionAction = async (id: string) => {
    const { data: contrib, error } = await supabase.from('episode_contributions').select('*').eq('id', id).single();
    if (error || !contrib) throw new Error('Katkı bulunamadı');

    if (contrib.pending_action === 'delete') {
        // Remove fansub from anime episode
        const eps = await getEpisodesRaw(contrib.anime_id);
        const epIdx = eps.findIndex((e: any) => e.number === contrib.episode_number);
        if (epIdx !== -1) {
            const fansubs = (eps[epIdx].fansubs || []).filter((f: any) => f.name !== contrib.fansub_name);
            eps[epIdx] = { ...eps[epIdx], fansubs };
            await setEpisodes(contrib.anime_id, eps);
        }
        await supabase.from('episode_contributions').delete().eq('id', id);
    } else if (contrib.pending_action === 'edit' && contrib.pending_data) {
        const d = contrib.pending_data;
        // Update contribution record
        await supabase.from('episode_contributions').update({
            fansub_name: d.fansubName ?? contrib.fansub_name,
            sources: d.sources ?? contrib.sources,
            episode_title: d.episodeTitle ?? contrib.episode_title,
            thumbnail: d.thumbnail ?? contrib.thumbnail,
            pending_action: null,
            pending_data: null,
            updated_at: new Date().toISOString(),
        }).eq('id', id);
        // Update anime episode if approved
        if (contrib.status === 'approved') {
            const eps = await getEpisodesRaw(contrib.anime_id);
            const epIdx = eps.findIndex((e: any) => e.number === contrib.episode_number);
            if (epIdx !== -1) {
                const fansubs = eps[epIdx].fansubs || [];
                const fbIdx = fansubs.findIndex((f: any) => f.name === contrib.fansub_name);
                const updated = { name: d.fansubName ?? contrib.fansub_name, sources: d.sources ?? contrib.sources };
                if (fbIdx !== -1) fansubs[fbIdx] = updated;
                eps[epIdx] = { ...eps[epIdx], fansubs };
                await setEpisodes(contrib.anime_id, eps);
            }
        }
    }
};

export const rejectContributionAction = async (id: string) => {
    await supabase.from('episode_contributions').update({ pending_action: null, pending_data: null, updated_at: new Date().toISOString() }).eq('id', id);
};
