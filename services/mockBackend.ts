import { Anime, AuthResponse, User, UserRole, Episode, Comment, AnimeStatus, SiteStats, Notification, Achievement, NewsItem, AnimeEntry, AnimeWatchStatus, UserList, VideoSource } from '../types';

// Constants
const USERS_KEY = 'anipal_users';
const ANIMES_KEY = 'anipal_animes';
const COMMENTS_KEY = 'anipal_comments';
const CURRENT_USER_KEY = 'anipal_current_user';
const NEWS_KEY = 'anipal_news';

// --- Achievements Generation ---
const generateAchievements = (): Achievement[] => {
    const list: Achievement[] = [];

    // === LEVEL BADGES (anime-themed) ===
    const levelDefs: { lvl: number; title: string; icon: string; rarity: Achievement['rarity'] }[] = [
        { lvl: 1,   title: 'Çaylak',          icon: '🌱', rarity: 'common' },
        { lvl: 5,   title: 'Genin',            icon: '⚔️', rarity: 'common' },
        { lvl: 10,  title: 'Dojo Öğrencisi',   icon: '🥋', rarity: 'common' },
        { lvl: 15,  title: 'Alev Ustası',      icon: '🔥', rarity: 'common' },
        { lvl: 20,  title: 'Şimşek',           icon: '⚡', rarity: 'rare' },
        { lvl: 25,  title: 'Yıldız Parçası',   icon: '💫', rarity: 'rare' },
        { lvl: 30,  title: 'Kılıç Ustası',     icon: '🗡️', rarity: 'rare' },
        { lvl: 40,  title: 'Büyücü',           icon: '🧙', rarity: 'rare' },
        { lvl: 50,  title: 'Dokuz Kuyruklu',   icon: '🦊', rarity: 'epic' },
        { lvl: 60,  title: 'Sharingan',        icon: '👁️', rarity: 'epic' },
        { lvl: 70,  title: 'Su Ejderhası',     icon: '🌊', rarity: 'epic' },
        { lvl: 80,  title: 'Karanlık Enerji',  icon: '🌑', rarity: 'legendary' },
        { lvl: 90,  title: 'Efsane',           icon: '⚜️', rarity: 'legendary' },
        { lvl: 100, title: 'Evreni Aşan',      icon: '🪐', rarity: 'legendary' },
    ];
    levelDefs.forEach(({ lvl, title, icon, rarity }) => {
        list.push({ id: `lvl-${lvl}`, title: `${title} (Seviye ${lvl})`, description: `${lvl}. Seviyeye ulaştın!`, xpReward: lvl * 50, icon, conditionType: 'LEVEL_REACHED', conditionValue: lvl, rarity });
    });

    // === WATCH COUNT BADGES ===
    const watchDefs: { cnt: number; title: string; icon: string; rarity: Achievement['rarity'] }[] = [
        { cnt: 1,    title: 'İlk Bölüm',                icon: '📺', rarity: 'common' },
        { cnt: 5,    title: 'Meraklı İzleyici',         icon: '🎭', rarity: 'common' },
        { cnt: 10,   title: 'Anime Tutkunu',            icon: '🍿', rarity: 'common' },
        { cnt: 25,   title: 'Shounen Ruhu',             icon: '⚔️', rarity: 'common' },
        { cnt: 50,   title: 'Otaku Adayı',              icon: '🔥', rarity: 'rare' },
        { cnt: 100,  title: 'Gerçek Otaku',             icon: '💫', rarity: 'rare' },
        { cnt: 150,  title: 'Anime Samurayı',           icon: '🏯', rarity: 'rare' },
        { cnt: 200,  title: 'Anime Master',             icon: '🎬', rarity: 'epic' },
        { cnt: 250,  title: 'Anime Yıldızı',            icon: '🌟', rarity: 'epic' },
        { cnt: 300,  title: 'Kitsune',                  icon: '🦊', rarity: 'epic' },
        { cnt: 400,  title: 'Ejderha',                  icon: '🐉', rarity: 'epic' },
        { cnt: 500,  title: 'Anime Efsanesi',           icon: '🏆', rarity: 'legendary' },
        { cnt: 600,  title: 'Gökkuşağı Savaşçısı',     icon: '🌈', rarity: 'legendary' },
        { cnt: 700,  title: 'Tanrı Seviyesi',           icon: '⚜️', rarity: 'legendary' },
        { cnt: 800,  title: 'Galaktik Gezgin',          icon: '🔮', rarity: 'legendary' },
        { cnt: 900,  title: 'Evren Gezgini',            icon: '🌑', rarity: 'legendary' },
        { cnt: 1000, title: 'Tüm Zamanların En İyisi',  icon: '👑', rarity: 'legendary' },
    ];
    watchDefs.forEach(({ cnt, title, icon, rarity }) => {
        list.push({ id: `watch-${cnt}`, title, description: `${cnt} bölüm anime izledin.`, xpReward: cnt * 5, icon, conditionType: 'WATCH_COUNT', conditionValue: cnt, rarity });
    });

    // === COMMENT COUNT BADGES ===
    const commentDefs: { cnt: number; title: string; icon: string; rarity: Achievement['rarity'] }[] = [
        { cnt: 1,   title: 'İlk Söz',               icon: '💬', rarity: 'common' },
        { cnt: 5,   title: 'Aktif Yorumcu',          icon: '🗣️', rarity: 'common' },
        { cnt: 10,  title: 'Tartışmacı',             icon: '💭', rarity: 'common' },
        { cnt: 25,  title: 'Forum Yıldızı',          icon: '⭐', rarity: 'rare' },
        { cnt: 50,  title: 'Çevrimiçi Aktivist',     icon: '📣', rarity: 'rare' },
        { cnt: 75,  title: 'Topluluk Temsilcisi',    icon: '🎖️', rarity: 'rare' },
        { cnt: 100, title: 'Anime Eleştirmeni',      icon: '🖊️', rarity: 'epic' },
        { cnt: 150, title: 'Söz Sihirbazı',          icon: '✨', rarity: 'epic' },
        { cnt: 200, title: 'Fenomen',                icon: '🌠', rarity: 'epic' },
        { cnt: 300, title: 'Efsanevi Yorumcu',       icon: '🔥', rarity: 'legendary' },
        { cnt: 400, title: 'Dil Ejderhası',          icon: '🐉', rarity: 'legendary' },
        { cnt: 500, title: 'Konuşma Tanrısı',        icon: '👑', rarity: 'legendary' },
    ];
    commentDefs.forEach(({ cnt, title, icon, rarity }) => {
        list.push({ id: `comment-${cnt}`, title, description: `${cnt} yorum paylaştın.`, xpReward: cnt * 10, icon, conditionType: 'COMMENT_COUNT', conditionValue: cnt, rarity });
    });

    // === WATCHLIST SIZE BADGES ===
    const listDefs: { cnt: number; title: string; icon: string; rarity: Achievement['rarity'] }[] = [
        { cnt: 1,  title: 'İlk Ekleme',         icon: '📌', rarity: 'common' },
        { cnt: 3,  title: 'Küçük Koleksiyon',   icon: '📚', rarity: 'common' },
        { cnt: 5,  title: 'Anime Listecisi',    icon: '📋', rarity: 'common' },
        { cnt: 10, title: 'Küratör',            icon: '🗂️', rarity: 'rare' },
        { cnt: 15, title: 'Arşivci',            icon: '🗃️', rarity: 'rare' },
        { cnt: 20, title: 'Kütüphaneci',        icon: '🏛️', rarity: 'rare' },
        { cnt: 30, title: 'Koleksiyoncu',       icon: '💎', rarity: 'epic' },
        { cnt: 40, title: 'Hazine Avcısı',      icon: '🏴‍☠️', rarity: 'epic' },
        { cnt: 50, title: 'Anime Ansiklopedisi',icon: '📖', rarity: 'legendary' },
    ];
    listDefs.forEach(({ cnt, title, icon, rarity }) => {
        list.push({ id: `list-${cnt}`, title, description: `Listene ${cnt} anime ekledin.`, xpReward: cnt * 20, icon, conditionType: 'LIST_COUNT', conditionValue: cnt, rarity });
    });

    // === CUSTOM LIST CREATION BADGES ===
    const customListDefs: { cnt: number; title: string; icon: string; rarity: Achievement['rarity'] }[] = [
        { cnt: 1,  title: 'Liste Oluşturucu', icon: '📝', rarity: 'common' },
        { cnt: 3,  title: 'Aktif Düzenleyici',icon: '✏️',  rarity: 'common' },
        { cnt: 5,  title: 'Liste Meraklısı',  icon: '📓', rarity: 'rare' },
        { cnt: 10, title: 'Liste Mimarı',     icon: '🏗️', rarity: 'epic' },
    ];
    customListDefs.forEach(({ cnt, title, icon, rarity }) => {
        list.push({ id: `created-list-${cnt}`, title, description: `${cnt} özel liste oluşturdun.`, xpReward: cnt * 30, icon, conditionType: 'LIST_CREATED_COUNT', conditionValue: cnt, rarity });
    });

    return list;
};

const ACHIEVEMENTS = generateAchievements();
export const getAllAchievements = () => ACHIEVEMENTS;

// --- News System ---
const SEED_NEWS: NewsItem[] = [
    {
        id: 'news-1',
        title: 'Demon Slayer: Hashira Training Arc Final Tarihi Açıklandı!',
        excerpt: 'Merakla beklenen final bölümü için geri sayım başladı. İşte detaylar...',
        content: 'Uzun süredir beklenen Demon Slayer yeni sezon finali için resmi tarih duyuruldu. Hayranlar büyük bir heyecanla bu tarihi bekliyor.',
        image: 'https://cdn.oneesports.gg/cdn-data/2024/03/DemonSlayer_HashiraTrainingArc_KeyVisual.jpg',
        category: 'Duyuru',
        createdAt: new Date().toISOString(),
        status: 'published',
        authorId: 'admin-1',
    },
    {
        id: 'news-2',
        title: 'Solo Leveling 2. Sezon Onaylandı',
        excerpt: 'Sung Jin-Woo geri dönüyor! Yapımcı stüdyodan resmi açıklama geldi.',
        content: 'İlk sezonuyla rekorlar kıran Solo Leveling için 2. sezon onayı geldi. Crunchyroll ve A-1 Pictures ortaklığıyla yeni sezon üretimde.',
        image: 'https://images7.alphacoders.com/133/1336495.jpeg',
        category: 'Yeni Sezon',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        status: 'published',
        authorId: 'admin-1',
    },
    {
        id: 'news-3',
        title: 'One Piece Live Action 2. Sezon Kadrosu',
        excerpt: 'Netflix uyarlamasında Ace ve Crocodile karakterlerini kimler oynayacak?',
        content: 'Netflix TUDUM etkinliğinde yapılan açıklamaya göre One Piece live action 2. sezon çekimleri başlıyor.',
        image: 'https://static1.srcdn.com/wordpress/wp-content/uploads/2023/09/one-piece-season-2-everything-we-know.jpg',
        category: 'Live Action',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        status: 'published',
        authorId: 'admin-1',
    },
];

const ensureSeedNews = () => {
    if (!localStorage.getItem(NEWS_KEY)) {
        localStorage.setItem(NEWS_KEY, JSON.stringify(SEED_NEWS));
    }
};

export const getNews = async (includeAll = false): Promise<NewsItem[]> => {
    await delay(200);
    ensureSeedNews();
    const news: NewsItem[] = JSON.parse(localStorage.getItem(NEWS_KEY) || '[]');
    if (includeAll) return news.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return news.filter(n => n.status === 'published').sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const createNews = async (data: Partial<NewsItem>, user: User): Promise<NewsItem> => {
    ensureSeedNews();
    const news: NewsItem[] = JSON.parse(localStorage.getItem(NEWS_KEY) || '[]');
    const newItem: NewsItem = {
        id: `news-${Date.now()}`,
        title: data.title || '',
        excerpt: data.excerpt || '',
        content: data.content || '',
        image: data.image || '',
        category: data.category || 'Genel',
        createdAt: new Date().toISOString(),
        status: user.role === UserRole.ADMIN ? 'published' : 'pending',
        authorId: user.id,
    };
    news.unshift(newItem);
    localStorage.setItem(NEWS_KEY, JSON.stringify(news));
    return newItem;
};

export const updateNews = async (id: string, data: Partial<NewsItem>): Promise<NewsItem> => {
    ensureSeedNews();
    const news: NewsItem[] = JSON.parse(localStorage.getItem(NEWS_KEY) || '[]');
    const idx = news.findIndex(n => n.id === id);
    if (idx === -1) throw new Error('Haber bulunamadı.');
    news[idx] = { ...news[idx], ...data };
    localStorage.setItem(NEWS_KEY, JSON.stringify(news));
    return news[idx];
};

export const deleteNews = async (id: string): Promise<void> => {
    ensureSeedNews();
    const news: NewsItem[] = JSON.parse(localStorage.getItem(NEWS_KEY) || '[]');
    localStorage.setItem(NEWS_KEY, JSON.stringify(news.filter(n => n.id !== id)));
};

export const approveNews = async (id: string): Promise<void> => {
    await updateNews(id, { status: 'published' });
};

export const getNewsById = async (id: string): Promise<NewsItem | null> => {
    ensureSeedNews();
    const news: NewsItem[] = JSON.parse(localStorage.getItem(NEWS_KEY) || '[]');
    return news.find(n => n.id === id) || null;
};

const fetchWithProxy = async (targetUrl: string): Promise<string> => {
    const enc = encodeURIComponent(targetUrl);

    // Each entry: [fetchUrl, isJsonWrapper (true = extract .contents field)]
    const proxies: [string, boolean][] = [
        [`https://api.allorigins.win/get?url=${enc}`, true],
        [`https://api.codetabs.com/v1/proxy?quest=${enc}`, false],
        [`https://corsproxy.io/?${enc}`, false],
        [`https://thingproxy.freeboard.io/fetch/${targetUrl}`, false],
    ];

    for (const [proxyUrl, isJson] of proxies) {
        try {
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
            if (!res.ok) continue;
            let text: string;
            if (isJson) {
                const data = await res.json();
                text = data.contents || '';
            } else {
                text = await res.text();
            }
            // Sanity check: must look like a real HTML page
            if (text && text.length > 1000 && /<html/i.test(text)) return text;
        } catch {
            // try next proxy
        }
    }
    throw new Error('Sayfa proxy üzerinden alınamadı. Lütfen daha sonra tekrar deneyin.');
};

export const fetchANNArticle = async (url: string): Promise<{ title: string; excerpt: string; content: string; image: string; category: string }> => {
    const html = await fetchWithProxy(url);

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Meta tags
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.getAttribute('content')
        || doc.querySelector('meta[name="title"]')?.getAttribute('content')
        || doc.querySelector('title')?.textContent?.replace(' - Anime News Network', '').trim()
        || '';
    const rawOgImage = doc.querySelector('meta[property="og:image"]')?.getAttribute('content')
        || doc.querySelector('meta[name="thumbnail"]')?.getAttribute('content')
        || '';
    // ANN CDN: strip thumbnail size constraints to get full resolution
    // e.g. https://cdn.animenewsnetwork.com/thumbnails/fit200x200/cms/... → .../images/cms/...
    const ogImage = rawOgImage
        .replace(/\/thumbnails\/[^/]+\//, '/images/')
        .replace(/\/fit\d+x\d+\//, '/');
    const ogDesc = doc.querySelector('meta[property="og:description"]')?.getAttribute('content')
        || doc.querySelector('meta[name="description"]')?.getAttribute('content')
        || '';

    // ANN article body — try selectors in order of specificity
    const candidateSelectors = [
        '#content-zone .news-body',
        '#content-zone .meat',
        '.news-body',
        '.meat',
        '#content-zone .content',
        '#news-body',
        'div[class*="article-body"]',
        'div[class*="news-body"]',
        '#content-zone',
        'main',
    ];

    let articleEl: Element | null = null;
    for (const sel of candidateSelectors) {
        articleEl = doc.querySelector(sel);
        if (articleEl) break;
    }

    let rawContent = '';
    if (articleEl) {
        // Remove noise elements
        articleEl.querySelectorAll('script, style, nav, header, footer, .ad, .banner, iframe, .survey, form, .breadcrumb, .right-stf').forEach(el => el.remove());
        // Collect paragraph text for cleaner output
        const paragraphs = Array.from(articleEl.querySelectorAll('p'));
        if (paragraphs.length > 0) {
            rawContent = paragraphs.map(p => p.textContent?.trim()).filter(Boolean).join('\n\n');
        } else {
            rawContent = articleEl.textContent?.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim() || '';
        }
    }

    // Fallback: use og:description if content extraction failed
    if (!rawContent && ogDesc) rawContent = ogDesc;
    rawContent = rawContent.slice(0, 4000);

    // Try to find a better quality image from article body if og:image is empty or too small
    let bestImage = ogImage;
    if (!bestImage && articleEl) {
        const imgs = Array.from(articleEl.querySelectorAll('img[src]')) as HTMLImageElement[];
        const candidate = imgs.find(img => {
            const src = img.getAttribute('src') || '';
            return src.startsWith('http') && !src.includes('icon') && !src.includes('avatar') && !src.includes('logo');
        });
        if (candidate) {
            bestImage = (candidate.getAttribute('src') || '')
                .replace(/\/thumbnails\/[^/]+\//, '/images/')
                .replace(/\/fit\d+x\d+\//, '/');
        }
    }

    // Detect category from URL
    let category = 'Haber';
    if (url.includes('/reviews')) category = 'İnceleme';
    else if (url.includes('/interest/feature') || url.includes('/feature')) category = 'Röportaj';
    else if (url.includes('/interest/')) category = 'Özel';
    else if (url.includes('/encyclopedia/')) category = 'Ansiklopedi';

    // Batch translate title + excerpt + content in a single API call
    const parts2translate = [ogTitle, ogDesc || rawContent.slice(0, 300), rawContent];
    const joined = parts2translate.join('\n||||\n');
    const translated = await translateText(joined);
    const parts = translated.split('\n||||\n');

    return {
        title: parts[0]?.trim() || ogTitle,
        excerpt: parts[1]?.trim() || ogDesc,
        content: parts[2]?.trim() || rawContent,
        image: bestImage,
        category,
    };
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
  } else {
    // Admin her zaman mevcut olsun
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const adminExists = users.find((u: any) => u.id === 'admin-1');
    if (!adminExists) {
      users.unshift({ ...INITIAL_ADMIN, passwordHash: '123456' });
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    } else if (!adminExists.passwordHash) {
      const idx = users.findIndex((u: any) => u.id === 'admin-1');
      users[idx].passwordHash = '123456';
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
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
    const watchedCount = user.watchedEpisodes?.length || 0;
    const listCount = user.watchlist?.length || 0;
    const customListCount = (user.customLists || []).length;

    ACHIEVEMENTS.forEach(ach => {
        if (user.earnedAchievements?.includes(ach.id)) return;

        let earned = false;
        if (ach.conditionType === 'WATCH_COUNT' && watchedCount >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'LIST_COUNT' && listCount >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'LEVEL_REACHED' && user.level >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'COMMENT_COUNT' && commentsCount !== undefined && commentsCount >= ach.conditionValue) earned = true;
        if (ach.conditionType === 'LIST_CREATED_COUNT' && customListCount >= ach.conditionValue) earned = true;

        if (earned) {
            user.earnedAchievements = [...(user.earnedAchievements || []), ach.id];
            user = addXpToUser(user, ach.xpReward);
            user = createNotification(user, 'BADGE_EARNED', 'Yeni Başarım!', `${ach.icon} ${ach.title} başarımını kazandın!`);
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
    earnedAchievements: ['lvl-1'],
    displayedBadges: ['lvl-1'],
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
    if (!user) return false;
    if (!user.watchedEpisodes?.includes(episodeId)) {
        user.watchedEpisodes = [...(user.watchedEpisodes || []), episodeId];
        saveUser(user);
        return true;
    }
    return false;
};

export const unmarkEpisodeWatched = async (userId: string, episodeId: string) => {
    await delay(100);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let user = users.find((u: any) => u.id === userId);
    if (!user) return;
    user.watchedEpisodes = (user.watchedEpisodes || []).filter((id: string) => id !== episodeId);
    saveUser(user);
};

export const grantWatchXP = async (userId: string, episodeId: string) => {
    await delay(100);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let user = users.find((u: any) => u.id === userId);
    if (!user) return;
    if (user.watchedEpisodes?.includes(episodeId)) return; // already watched
    user.watchedEpisodes = [...(user.watchedEpisodes || []), episodeId];
    user = addXpToUser(user, 50);
    user = checkAchievements(user);
    saveUser(user);
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
// --- Genre translation map ---
const GENRE_MAP: Record<string, string> = {
    'Action': 'Aksiyon',
    'Adventure': 'Macera',
    'Comedy': 'Komedi',
    'Drama': 'Drama',
    'Ecchi': 'Ecchi',
    'Fantasy': 'Fantezi',
    'Horror': 'Korku',
    'Mahou Shoujo': 'Sihirli Kız',
    'Mecha': 'Robot',
    'Music': 'Müzik',
    'Mystery': 'Gizem',
    'Psychological': 'Psikolojik',
    'Romance': 'Romantizm',
    'Sci-Fi': 'Bilim Kurgu',
    'Slice of Life': 'Günlük Yaşam',
    'Sports': 'Spor',
    'Supernatural': 'Doğaüstü',
    'Thriller': 'Gerilim',
    'Hentai': 'Hentai',
    'Isekai': 'Isekai',
    'Historical': 'Tarihi',
    'School': 'Okul',
    'Military': 'Askeri',
    'Demons': 'Şeytan',
    'Magic': 'Büyü',
    'Game': 'Oyun',
    'Samurai': 'Samuray',
    'Martial Arts': 'Dövüş Sanatları',
    'Police': 'Polis',
    'Super Power': 'Süper Güç',
    'Space': 'Uzay',
    'Vampire': 'Vampir',
    'Shounen': 'Shōnen',
    'Shoujo': 'Shōjo',
    'Josei': 'Josei',
    'Seinen': 'Seinen',
};

const translateGenres = (genres: string[]): string[] =>
    genres.map(g => GENRE_MAP[g] || g);

const stripHtml = (html: string): string =>
    html.replace(/<[^>]*>?/gm, '').replace(/\n{3,}/g, '\n\n').trim();

const translateText = async (text: string): Promise<string> => {
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=tr&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        return (data[0] as any[]).map((item: any) => item[0]).join('');
    } catch {
        return text;
    }
};

export const fetchAniListData = async (search: string) => {
    const query = `
      query ($search: String) {
        Media (search: $search, type: ANIME) {
          id
          idMal
          title { romaji english }
          description
          coverImage { extraLarge }
          bannerImage
          genres
          averageScore
          characters(sort: ROLE, perPage: 12) {
            edges {
              node {
                id
                name { full }
                image { medium large }
              }
              role
            }
          }
        }
      }
    `;
    const response = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { search } })
    });
    const data = await response.json();
    const media = data.data.Media;
    if (!media) return null;

    // Translate description
    const rawDesc = media.description ? stripHtml(media.description) : '';
    const translatedDesc = rawDesc ? await translateText(rawDesc) : '';

    // Translate genres
    const translatedGenres = translateGenres(media.genres || []);

    // Map characters
    const characters = (media.characters?.edges || []).map((edge: any) => ({
        id: edge.node.id,
        name: edge.node.name.full,
        image: edge.node.image.large || edge.node.image.medium,
        role: edge.role,
    }));

    return {
        ...media,
        description: translatedDesc,
        genres: translatedGenres,
        characters,
    };
};

export const fetchMALEpisodes = async (anilistId: number): Promise<{ number: number; title: string; thumbnail: string }[]> => {
    // AniZip API: single request, returns episodes with TVDB thumbnails + multi-language titles
    const res = await fetch(`https://api.ani.zip/mappings?anilist_id=${anilistId}`);
    const data = await res.json();

    if (!data.episodes || typeof data.episodes !== 'object') return [];

    // Collect episodes (keys are episode numbers as strings)
    const entries = Object.entries(data.episodes)
        .filter(([key]) => !isNaN(Number(key)) && Number(key) > 0)
        .sort(([a], [b]) => Number(a) - Number(b)) as [string, any][];

    if (entries.length === 0) return [];

    // Separate episodes that already have Turkish titles vs need translation
    const needsTranslation: string[] = [];
    const needsTranslationIdx: number[] = [];

    entries.forEach(([, ep], i) => {
        const trTitle = ep.title?.tr;
        const enTitle = ep.title?.en || ep.title?.['x-jat'] || '';
        if (!trTitle && enTitle) {
            needsTranslation.push(enTitle);
            needsTranslationIdx.push(i);
        }
    });

    // Batch translate all missing titles in one request
    let translated: string[] = [];
    if (needsTranslation.length > 0) {
        const joined = needsTranslation.join('\n||||\n');
        const result = await translateText(joined);
        translated = result.split(/\n\|\|\|\|\n/);
    }

    // Build final episode array
    let translationCursor = 0;
    return entries.map(([epNum, ep], i) => {
        const trTitle = ep.title?.tr;
        let title: string;
        if (trTitle) {
            title = trTitle;
        } else if (needsTranslationIdx.includes(i)) {
            title = translated[translationCursor++] || ep.title?.en || `${epNum}. Bölüm`;
        } else {
            title = `${epNum}. Bölüm`;
        }
        return {
            number: Number(epNum),
            title: title.trim(),
            thumbnail: ep.image || '',
        };
    });
};
// ---- Turkish Anime Site Source Fetcher ----

const EMBED_PROVIDERS: { test: RegExp; name: string }[] = [
    { test: /sibnet\.ru/i, name: 'Sibnet' },
    { test: /tau\.com\.tr|taudtmi\.com|taudt/i, name: 'Tau' },
    { test: /streamtape\./i, name: 'Streamtape' },
    { test: /ok\.ru|odnoklassniki/i, name: 'OK.ru' },
    { test: /my\.mail\.ru|mail\.ru\/v\//i, name: 'Mail.ru' },
    { test: /drive\.google|docs\.google.*\/file\//i, name: 'Google Drive' },
    { test: /yourupload\./i, name: 'YourUpload' },
    { test: /dood\.|doodstream/i, name: 'Doodstream' },
    { test: /mp4upload\./i, name: 'MP4Upload' },
    { test: /vk\.com\/video_ext/i, name: 'VK' },
    { test: /filemoon\./i, name: 'Filemoon' },
    { test: /fembed\.|fembad\./i, name: 'Fembed' },
    { test: /vidmoly\./i, name: 'Vidmoly' },
    { test: /sendvid\./i, name: 'Sendvid' },
    { test: /youtu\.be|youtube\.com\/embed/i, name: 'YouTube' },
    { test: /dailymotion\.com\/embed/i, name: 'Dailymotion' },
    { test: /vimeo\.com\/video/i, name: 'Vimeo' },
];

const identifyProvider = (url: string): string => {
    for (const { test, name } of EMBED_PROVIDERS) {
        if (test.test(url)) return name;
    }
    try {
        const h = new URL(url).hostname.replace('www.', '');
        const part = h.split('.')[0];
        return part.charAt(0).toUpperCase() + part.slice(1);
    } catch { return 'Video'; }
};

// Extract video embed sources from an element or the full document
// Accepts ANY iframe from a different origin (not just known providers)
const extractSourcesFromRoot = (root: Element | Document, pageOrigin: string): VideoSource[] => {
    const sources: VideoSource[] = [];
    const seen = new Set<string>();

    const add = (raw: string) => {
        let url = raw.trim();
        if (url.startsWith('//')) url = 'https:' + url;
        if (!url.startsWith('http')) return;
        if (seen.has(url)) return;
        try {
            const u = new URL(url);
            // Skip same-origin and tracker/analytics URLs
            if (pageOrigin && u.origin === pageOrigin) return;
            if (/google-analytics|gtm|facebook|doubleclick|adservice/i.test(u.hostname)) return;
            // Accept if from a known provider OR if it looks like a video embed
            const isKnown = EMBED_PROVIDERS.some(p => p.test.test(url));
            const looksLikeEmbed = /embed|player|watch|video|shell|stream/i.test(u.pathname + u.search);
            if (!isKnown && !looksLikeEmbed) return;
        } catch { return; }
        seen.add(url);
        sources.push({ name: identifyProvider(url), url });
    };

    root.querySelectorAll('iframe,frame').forEach(el => {
        ['src', 'data-src', 'data-lazy-src', 'data-original'].forEach(attr => {
            const v = el.getAttribute(attr) || '';
            if (v) add(v);
        });
    });

    root.querySelectorAll('[data-video],[data-url],[data-embed],[data-iframe],[data-src],[data-player]').forEach(el => {
        ['data-video', 'data-url', 'data-embed', 'data-iframe', 'data-src', 'data-player'].forEach(attr => {
            const v = el.getAttribute(attr) || '';
            if (v && v.startsWith('http')) add(v);
        });
    });

    // Inline scripts — extract URLs that look like embeds
    root.querySelectorAll?.('script:not([src])') && (root as Document | Element).querySelectorAll('script:not([src])').forEach(script => {
        const text = (script as HTMLScriptElement).textContent || '';
        const matches = text.match(/https?:\/\/[^\s"'`<>{}\[\]\\]{10,}/g) || [];
        matches.forEach(u => {
            if (EMBED_PROVIDERS.some(p => p.test.test(u))) add(u);
        });
    });

    return sources;
};

// Detect multiple fansub groups within a single episode page
// Returns array of {name, sources} — one entry per fansub found
const detectFansubGroups = (doc: Document, siteName: string, pageOrigin: string): { name: string; sources: VideoSource[] }[] => {
    const groups: { name: string; sources: VideoSource[] }[] = [];

    // Strategy 0: Bootstrap .panel / .card structure (TurkAnime style)
    // Each panel = one fansub group; heading contains fansub name
    const panels = doc.querySelectorAll('.panel,.card');
    if (panels.length > 0) {
        panels.forEach(panel => {
            const heading = panel.querySelector('.panel-heading,.card-header,.panel-title,.card-title');
            if (!heading) return;
            const rawName = heading.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80) || '';
            if (!rawName) return;
            const sources = extractSourcesFromRoot(panel, pageOrigin);
            if (sources.length === 0) return;
            if (!groups.some(g => g.name === rawName)) groups.push({ name: rawName, sources });
        });
        if (groups.length > 0) return groups;
    }

    // Strategy 1: Explicit data-fansub / data-grup / data-sub containers
    const byDataAttr = doc.querySelectorAll('[data-fansub],[data-grup],[data-sub],[data-fansub-id],[data-subtitle]');
    if (byDataAttr.length >= 1) {
        byDataAttr.forEach(el => {
            const name = (el.getAttribute('data-fansub') || el.getAttribute('data-grup') || el.getAttribute('data-sub') || siteName).trim();
            const sources = extractSourcesFromRoot(el, pageOrigin);
            if (sources.length > 0) groups.push({ name, sources });
        });
        if (groups.length > 0) return groups;
    }

    // Strategy 2: Elements whose class name contains "fansub" or "grup"
    const byClass = doc.querySelectorAll('[class*="fansub"],[class*="FanSub"],[class*="fanSub"],[class*="grup"],[class*="Grup"]');
    if (byClass.length > 0) {
        byClass.forEach(el => {
            const sources = extractSourcesFromRoot(el, pageOrigin);
            if (sources.length === 0) return;
            const heading = el.querySelector('strong,b,h3,h4,h5,.name,.title,.label,span.fansub-name');
            const rawName = (heading?.textContent || el.getAttribute('title') || '').trim().slice(0, 60);
            const name = rawName || siteName;
            if (!groups.some(g => g.name === name)) groups.push({ name, sources });
        });
        if (groups.length > 0) return groups;
    }

    // Strategy 3: Bootstrap / custom tab panels (multiple siblings each with their own iframes)
    const tabPanes = doc.querySelectorAll('.tab-pane,.fansub-tab,.video-tab,[role="tabpanel"]');
    if (tabPanes.length > 1) {
        tabPanes.forEach((pane, i) => {
            const sources = extractSourcesFromRoot(pane, pageOrigin);
            if (sources.length === 0) return;
            const id = (pane as HTMLElement).id || '';
            const tabBtn = id
                ? doc.querySelector(`[href="#${id}"], [data-target="#${id}"], [data-bs-target="#${id}"], [data-tab="${id}"]`)
                : null;
            const name = tabBtn?.textContent?.trim() || `${siteName} ${i + 1}`;
            groups.push({ name, sources });
        });
        if (groups.length > 0) return groups;
    }

    // Strategy 4: Multiple sibling containers each wrapping an iframe
    const iframes = Array.from(doc.querySelectorAll('iframe'));
    if (iframes.length > 1) {
        // Find the first common wrapper level where iframes have distinct parents
        const parents = iframes
            .map(ifr => ifr.closest('div,section,article,li,p'))
            .filter(Boolean) as Element[];
        const uniqueParents = [...new Set(parents)];

        if (uniqueParents.length > 1 && uniqueParents.every(p => p.parentElement === uniqueParents[0].parentElement)) {
            uniqueParents.forEach((parent, i) => {
                const sources = extractSourcesFromRoot(parent, pageOrigin);
                if (sources.length === 0) return;
                // Try to get a label from a preceding sibling or heading inside
                const label =
                    parent.querySelector('strong,b,h3,h4,h5,span.name,.title')?.textContent?.trim() ||
                    (parent.previousElementSibling?.textContent?.trim().slice(0, 40)) ||
                    `${siteName} ${i + 1}`;
                groups.push({ name: label, sources });
            });
            if (groups.length > 1) return groups;
        }
    }

    // Fallback: everything as one group named after the site
    const allSources = extractSourcesFromRoot(doc, pageOrigin);
    if (allSources.length > 0) return [{ name: siteName, sources: allSources }];

    return [];
};

// Detect episode number in URL and its match span
const detectEpNumInUrl = (url: string): { num: number; start: number; end: number } | null => {
    const patterns: RegExp[] = [
        /[-/](\d{1,4})[.-]bolum/i,
        /bolum[-/](\d{1,4})/i,
        /[-/](\d{1,4})[.-]episode/i,
        /episode[-/](\d{1,4})/i,
        /[?&](?:ep|bolum|episode)=(\d{1,4})/i,
        /\/(\d{1,4})(?:$|[?#/])/,
    ];
    for (const rx of patterns) {
        const m = url.match(rx);
        if (m && m[1]) {
            const num = parseInt(m[1]);
            if (num >= 1 && num <= 2000) {
                const start = m.index! + m[0].indexOf(m[1]);
                return { num, start, end: start + m[1].length };
            }
        }
    }
    return null;
};

// Build URL for episode N, given the reference episode URL and its number
const buildEpUrl = (refUrl: string, refNum: number, targetNum: number): string => {
    if (refNum === targetNum) return refUrl;
    const refStr = String(refNum);
    const tgtStr = String(targetNum);

    // Strategy 1: Replace last occurrence of -N- or -N. or /N/ specifically around "bolum"/"episode"
    const replacePatterns = [
        new RegExp(`(-${refStr}-)(bolum|episode)`, 'i'),
        new RegExp(`(bolum[-/])${refStr}(?=$|[^0-9])`, 'i'),
        new RegExp(`(episode[-/])${refStr}(?=$|[^0-9])`, 'i'),
    ];
    for (const rx of replacePatterns) {
        const result = refUrl.replace(rx, (match, pre, post) => {
            if (post !== undefined) return `${pre}${tgtStr}-${post}`;
            return `${pre}${tgtStr}`;
        });
        // For first pattern, it matches -N-bolum so we need special handling:
        const r2 = refUrl.replace(new RegExp(`-${refStr}-bolum`, 'i'), `-${tgtStr}-bolum`);
        if (r2 !== refUrl) return r2;
        const r3 = refUrl.replace(new RegExp(`-${refStr}-episode`, 'i'), `-${tgtStr}-episode`);
        if (r3 !== refUrl) return r3;
        if (result !== refUrl) return result;
    }

    // Strategy 2: Simple replacement of the number at detected position
    const detected = detectEpNumInUrl(refUrl);
    if (detected && detected.num === refNum) {
        return refUrl.slice(0, detected.start) + tgtStr + refUrl.slice(detected.end);
    }

    // Strategy 3: Replace last occurrence of the number in path
    const pathEnd = refUrl.indexOf('?');
    const pathPart = pathEnd === -1 ? refUrl : refUrl.slice(0, pathEnd);
    const lastIdx = pathPart.lastIndexOf(refStr);
    if (lastIdx !== -1) {
        const before = pathPart.charAt(lastIdx - 1);
        const after = pathPart.charAt(lastIdx + refStr.length);
        if ((before === '-' || before === '/') && (after === '-' || after === '/' || after === '' || after === '.')) {
            return pathPart.slice(0, lastIdx) + tgtStr + pathPart.slice(lastIdx + refStr.length) + (pathEnd === -1 ? '' : refUrl.slice(pathEnd));
        }
    }

    return refUrl; // couldn't build — caller deduplicates
};

// Faster proxy for episode pages (3 proxies, 10s timeout)
const fetchEpisodePage = async (url: string): Promise<string> => {
    const enc = encodeURIComponent(url);
    const proxies: [string, boolean][] = [
        [`https://api.allorigins.win/get?url=${enc}`, true],
        [`https://corsproxy.io/?${enc}`, false],
        [`https://api.codetabs.com/v1/proxy?quest=${enc}`, false],
    ];
    for (const [pUrl, isJson] of proxies) {
        try {
            const res = await fetch(pUrl, { signal: AbortSignal.timeout(10000) });
            if (!res.ok) continue;
            const text = isJson ? (await res.json()).contents || '' : await res.text();
            if (text && text.length > 200) return text;
        } catch { continue; }
    }
    throw new Error('Sayfa alınamadı');
};

export interface TurkishSiteFansub {
    name: string;
    episodes: { epNum: number; sources: VideoSource[] }[];
}

export interface TurkishSiteResult {
    siteName: string;
    fansubs: TurkishSiteFansub[];
    fetchedCount: number;
    totalFound: number;
    error?: string;
}

export const fetchAnimeFromTurkishSite = async (
    inputUrl: string,
    totalEpisodes: number,
    onProgress?: (msg: string) => void
): Promise<TurkishSiteResult> => {
    const hostname = (() => { try { return new URL(inputUrl).hostname.replace('www.', ''); } catch { return ''; } })();
    const origin = (() => { try { return new URL(inputUrl).origin; } catch { return ''; } })();
    const siteName = hostname.includes('turkanime') ? 'TurkAnime'
                   : hostname.includes('anizm') ? 'Anizm'
                   : hostname.includes('seicode') ? 'Seicode'
                   : hostname.split('.')[0] || 'Kaynak';

    const toAbsolute = (href: string) =>
        href.startsWith('http') ? href
        : href.startsWith('//') ? 'https:' + href
        : href.startsWith('/') ? origin + href
        : origin + '/' + href;

    try {
        // ---- Determine episode 1 URL ----
        const epNumInInput = detectEpNumInUrl(inputUrl);
        let ep1Url: string;
        let ep1Num: number = 1;

        if (epNumInInput && /bolum|episode|video/i.test(inputUrl)) {
            // Input IS an episode page — use it directly as reference
            ep1Num = epNumInInput.num;
            ep1Url = ep1Num === 1 ? inputUrl : buildEpUrl(inputUrl, ep1Num, 1);
        } else {
            // Input is an anime listing page — parse it to find episode links
            onProgress?.(`${siteName} bölüm listesi aranıyor...`);
            const html = await fetchWithProxy(inputUrl);
            const parser = new DOMParser();
            const listDoc = parser.parseFromString(html, 'text/html');

            // Collect all episode links
            const epLinkMap = new Map<number, string>();
            listDoc.querySelectorAll('a[href]').forEach(a => {
                const href = a.getAttribute('href') || '';
                const full = toAbsolute(href);
                const detected = detectEpNumInUrl(href) || detectEpNumInUrl(full);
                if (!detected) return;
                const { num } = detected;
                if (num >= 1 && num <= Math.max(totalEpisodes + 10, 500) && !epLinkMap.has(num)) {
                    epLinkMap.set(num, full);
                }
            });

            if (epLinkMap.size === 0) {
                // Maybe the page itself has video embeds (single-episode page returned by listing page)
                const sources = extractSourcesFromRoot(listDoc, origin);
                if (sources.length > 0) {
                    return { siteName, fansubs: [{ name: siteName, episodes: [{ epNum: 1, sources }] }], fetchedCount: 1, totalFound: 1 };
                }
                return { siteName, fansubs: [], fetchedCount: 0, totalFound: 0, error: 'Bölüm listesi bulunamadı. 1. bölümün URL\'sini doğrudan girin.' };
            }

            // Fill missing episodes by pattern from the smallest episode number found
            const sortedNums = Array.from(epLinkMap.keys()).sort((a, b) => a - b);
            ep1Num = sortedNums[0];
            const refUrl = epLinkMap.get(ep1Num)!;
            for (let n = 1; n <= totalEpisodes; n++) {
                if (!epLinkMap.has(n)) {
                    const built = buildEpUrl(refUrl, ep1Num, n);
                    if (built !== refUrl) epLinkMap.set(n, built);
                }
            }

            ep1Url = epLinkMap.get(1) || epLinkMap.get(ep1Num)!;
        }

        // ---- Build all episode URLs ----
        const epUrlMap = new Map<number, string>();
        for (let n = 1; n <= totalEpisodes; n++) {
            const url = buildEpUrl(ep1Url, ep1Num === 1 ? 1 : ep1Num, n === 1 ? ep1Num : n);
            // Correct: for n=1 use ep1Url directly
            epUrlMap.set(n, n === 1 ? ep1Url : buildEpUrl(ep1Url, ep1Num, n));
        }
        // Correct ep1 to always be the actual episode 1 URL
        epUrlMap.set(1, ep1Num === 1 ? ep1Url : buildEpUrl(ep1Url, ep1Num, 1));

        // ---- Fetch each episode page and extract fansub groups ----
        // fansubEpMap: fansubName → (epNum → sources)
        const fansubEpMap = new Map<string, Map<number, VideoSource[]>>();
        const addGroup = (fansubName: string, epNum: number, sources: VideoSource[]) => {
            if (!fansubEpMap.has(fansubName)) fansubEpMap.set(fansubName, new Map());
            fansubEpMap.get(fansubName)!.set(epNum, sources);
        };

        const parser2 = new DOMParser();
        const epsToFetch = Array.from(epUrlMap.entries()).sort(([a], [b]) => a - b);
        let fetchedCount = 0;
        const BATCH = 3;

        for (let i = 0; i < epsToFetch.length; i += BATCH) {
            const batch = epsToFetch.slice(i, i + BATCH);
            onProgress?.(`${siteName}: ${i + 1}–${Math.min(i + BATCH, epsToFetch.length)} / ${epsToFetch.length} bölüm çekiliyor...`);

            const batchRes = await Promise.allSettled(
                batch.map(async ([epNum, url]) => {
                    const epHtml = await fetchEpisodePage(url);
                    const epDoc = parser2.parseFromString(epHtml, 'text/html');
                    const groups = detectFansubGroups(epDoc, siteName, origin);
                    return { epNum, groups };
                })
            );

            batchRes.forEach(r => {
                if (r.status !== 'fulfilled') return;
                const { epNum, groups } = r.value;
                if (groups.length > 0) fetchedCount++;
                groups.forEach(({ name, sources }) => {
                    if (sources.length > 0) addGroup(name, epNum, sources);
                });
            });
        }

        if (fansubEpMap.size === 0) {
            return { siteName, fansubs: [], fetchedCount: 0, totalFound: totalEpisodes, error: 'Hiçbir bölümden kaynak çekilemedi. Site CORS\'u engelliyor olabilir.' };
        }

        // ---- Build final fansubs array ----
        const fansubs: TurkishSiteFansub[] = Array.from(fansubEpMap.entries()).map(([name, epMap]) => ({
            name,
            episodes: Array.from(epMap.entries()).sort(([a], [b]) => a - b).map(([epNum, sources]) => ({ epNum, sources })),
        }));

        return { siteName, fansubs, fetchedCount, totalFound: totalEpisodes };
    } catch (e: any) {
        return { siteName, fansubs: [], fetchedCount: 0, totalFound: 0, error: e.message || `${siteName} sayfası alınamadı.` };
    }
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

export const deleteAnime = async (animeId: string) => {
    await delay(200);
    const animes = JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]');
    localStorage.setItem(ANIMES_KEY, JSON.stringify(animes.filter((a: Anime) => a.id !== animeId)));
};

export const deleteEpisode = async (animeId: string, episodeId: string) => {
    await delay(200);
    const animes = JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]');
    const idx = animes.findIndex((a: Anime) => a.id === animeId);
    if (idx === -1) throw new Error("Anime bulunamadı.");
    animes[idx].episodes = animes[idx].episodes.filter((e: Episode) => e.id !== episodeId);
    localStorage.setItem(ANIMES_KEY, JSON.stringify(animes));
};

export const createAnimeWithEpisodes = async (animeData: any, episodesData: any[], user: User) => {
    await delay(500);
    const animes = JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]');
    const isAdmin = user.role === UserRole.ADMIN;
    const episodes = episodesData.map((ep, i) => ({ ...ep, id: `ep-${Date.now()}-${i}`, likes: 0 }));
    const newAnime = {
        ...animeData,
        id: `anime-${Date.now()}`,
        createdAt: new Date().toISOString(),
        episodes,
        status: isAdmin ? AnimeStatus.APPROVED : AnimeStatus.PENDING,
        uploadedBy: user.id,
        averageRating: 0,
        ratingsCount: 0,
    };
    animes.push(newAnime);
    localStorage.setItem(ANIMES_KEY, JSON.stringify(animes));
    return newAnime;
};
export const updateEpisode = async (animeId: string, episodeId: string, data: Partial<Episode>) => {
    const animes = JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]');
    const idx = animes.findIndex((a: Anime) => a.id === animeId);
    if (idx === -1) throw new Error("Anime bulunamadı.");
    const epIdx = animes[idx].episodes.findIndex((e: Episode) => e.id === episodeId);
    if (epIdx === -1) throw new Error("Bölüm bulunamadı.");
    animes[idx].episodes[epIdx] = { ...animes[idx].episodes[epIdx], ...data };
    localStorage.setItem(ANIMES_KEY, JSON.stringify(animes));
};
export const addEpisode = async (animeId: string, episodeData: any) => {
    const animes = JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]');
    const idx = animes.findIndex((a: Anime) => a.id === animeId);
    if (idx === -1) throw new Error("Anime yok");
    animes[idx].episodes.push({ ...episodeData, id: `ep-${Date.now()}`, likes: 0 });
    localStorage.setItem(ANIMES_KEY, JSON.stringify(animes));
};
export const addEpisodes = async (animeId: string, episodesData: any[]) => {
    const animes = JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]');
    const idx = animes.findIndex((a: Anime) => a.id === animeId);
    if (idx === -1) throw new Error("Anime yok");
    episodesData.forEach((ep, i) => {
        animes[idx].episodes.push({ ...ep, id: `ep-${Date.now()}-${i}`, likes: 0 });
    });
    localStorage.setItem(ANIMES_KEY, JSON.stringify(animes));
};
export const saveAnimeEntry = async (userId: string, animeId: string, entry: { status: string; rating?: number; review?: string }) => {
    await delay(300);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let user = users.find((u: any) => u.id === userId);
    if (!user) throw new Error('Kullanıcı bulunamadı');

    const animeList: any[] = user.animeList || [];
    const existing = animeList.findIndex((e: any) => e.animeId === animeId);
    const newEntry = { animeId, ...entry, updatedAt: new Date().toISOString() };

    if (existing !== -1) {
        animeList[existing] = newEntry;
    } else {
        animeList.push(newEntry);
        // XP for first time adding to list
        user = addXpToUser(user, 20);
        user = checkAchievements(user);
    }
    user.animeList = animeList;
    saveUser(user);

    // Update anime average rating (only from users who rated)
    if (entry.rating) {
        const animes = JSON.parse(localStorage.getItem(ANIMES_KEY) || '[]');
        const allUsers = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
        const idx = animes.findIndex((a: any) => a.id === animeId);
        if (idx !== -1) {
            const allEntries = allUsers
                .filter((u: any) => u.animeList)
                .flatMap((u: any) => u.animeList)
                .filter((e: any) => e.animeId === animeId && e.rating);
            if (allEntries.length > 0) {
                const avg = allEntries.reduce((sum: number, e: any) => sum + e.rating, 0) / allEntries.length;
                animes[idx].averageRating = parseFloat(avg.toFixed(1));
                animes[idx].ratingsCount = allEntries.length;
                localStorage.setItem(ANIMES_KEY, JSON.stringify(animes));
            }
        }
    }
};

export const getAnimeEntry = async (userId: string, animeId: string): Promise<AnimeEntry | null> => {
    await delay(100);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find((u: any) => u.id === userId);
    if (!user || !user.animeList) return null;
    return user.animeList.find((e: any) => e.animeId === animeId) || null;
};

export const getUserAnimeList = async (userId: string): Promise<AnimeEntry[]> => {
    await delay(100);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find((u: any) => u.id === userId);
    return user?.animeList || [];
};

export const updatePrivacySettings = async (userId: string, settings: { showAnimeList: boolean }) => {
    await delay(100);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const idx = users.findIndex((u: any) => u.id === userId);
    if (idx !== -1) {
        users[idx] = { ...users[idx], ...settings };
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
        const currentUser = JSON.parse(localStorage.getItem('anipal_current_user') || 'null');
        if (currentUser && currentUser.id === userId) {
            localStorage.setItem('anipal_current_user', JSON.stringify({ ...currentUser, ...settings }));
        }
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

export const changeUsername = async (userId: string, newUsername: string): Promise<User> => {
    await delay(300);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (users.find((u: any) => u.username === newUsername && u.id !== userId)) {
        throw new Error("Bu kullanıcı adı zaten kullanılıyor.");
    }
    const idx = users.findIndex((u: any) => u.id === userId);
    if (idx === -1) throw new Error("Kullanıcı bulunamadı.");
    users[idx].username = newUsername;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const current = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
    if (current && current.id === userId) {
        current.username = newUsername;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(current));
    }
    return users[idx];
};

export const changeEmail = async (userId: string, newEmail: string): Promise<User> => {
    await delay(300);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    if (users.find((u: any) => u.email === newEmail && u.id !== userId)) {
        throw new Error("Bu e-posta adresi zaten kullanılıyor.");
    }
    const idx = users.findIndex((u: any) => u.id === userId);
    if (idx === -1) throw new Error("Kullanıcı bulunamadı.");
    users[idx].email = newEmail;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    const current = JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null');
    if (current && current.id === userId) {
        current.email = newEmail;
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(current));
    }
    return users[idx];
};
export const deleteAccount = async (id: string) => {
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    localStorage.setItem(USERS_KEY, JSON.stringify(users.filter((u: any) => u.id !== id)));
};
export const getUserComments = async (id: string) => JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]').filter((c: any) => c.userId === id);

// --- Custom Lists ---

const DEFAULT_LISTS: UserList[] = [
    { id: 'list-default-watch', name: 'İzlenecekler', isPublic: false, animeIds: [], createdAt: new Date().toISOString() },
];

const ensureDefaultLists = (user: any): any => {
    if (!user.customLists || user.customLists.length === 0) {
        user.customLists = DEFAULT_LISTS.map(l => ({ ...l, id: `list-${user.id}-default`, createdAt: new Date().toISOString() }));
    }
    return user;
};

export const getUserLists = async (userId: string): Promise<UserList[]> => {
    await delay(100);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let user = users.find((u: any) => u.id === userId);
    if (!user) return [];
    user = ensureDefaultLists(user);
    return user.customLists || [];
};

export const createUserList = async (userId: string, name: string, isPublic: boolean): Promise<UserList> => {
    await delay(200);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let user = users.find((u: any) => u.id === userId);
    if (!user) throw new Error('Kullanıcı bulunamadı');
    user = ensureDefaultLists(user);
    const newList: UserList = { id: `list-${Date.now()}`, name, isPublic, animeIds: [], createdAt: new Date().toISOString() };
    user.customLists = [...(user.customLists || []), newList];
    user = addXpToUser(user, 15);
    user = checkAchievements(user);
    saveUser(user);
    return newList;
};

export const deleteUserList = async (userId: string, listId: string): Promise<void> => {
    await delay(200);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let user = users.find((u: any) => u.id === userId);
    if (!user) return;
    user.customLists = (user.customLists || []).filter((l: UserList) => l.id !== listId);
    saveUser(user);
};

export const addAnimeToList = async (userId: string, listId: string, animeId: string): Promise<void> => {
    await delay(100);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let user = users.find((u: any) => u.id === userId);
    if (!user) return;
    user = ensureDefaultLists(user);
    const listIdx = (user.customLists || []).findIndex((l: UserList) => l.id === listId);
    if (listIdx === -1) return;
    if (!user.customLists[listIdx].animeIds.includes(animeId)) {
        user.customLists[listIdx].animeIds = [...user.customLists[listIdx].animeIds, animeId];
        saveUser(user);
    }
};

export const removeAnimeFromList = async (userId: string, listId: string, animeId: string): Promise<void> => {
    await delay(100);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let user = users.find((u: any) => u.id === userId);
    if (!user) return;
    const listIdx = (user.customLists || []).findIndex((l: UserList) => l.id === listId);
    if (listIdx === -1) return;
    user.customLists[listIdx].animeIds = user.customLists[listIdx].animeIds.filter((id: string) => id !== animeId);
    saveUser(user);
};

export const updateListVisibility = async (userId: string, listId: string, isPublic: boolean): Promise<void> => {
    await delay(100);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    let user = users.find((u: any) => u.id === userId);
    if (!user) return;
    const listIdx = (user.customLists || []).findIndex((l: UserList) => l.id === listId);
    if (listIdx === -1) return;
    user.customLists[listIdx].isPublic = isPublic;
    saveUser(user);
};

export const getPublicLists = async (userId: string): Promise<UserList[]> => {
    await delay(100);
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const user = users.find((u: any) => u.id === userId);
    if (!user) return [];
    return (user.customLists || []).filter((l: UserList) => l.isPublic);
};
export const toggleLikeEpisode = async (userId: string, animeId: string, episodeId: string) => ({ liked: true, likesCount: 10 });
export const getCommentsByEpisodeId = async (id: string) => JSON.parse(localStorage.getItem(COMMENTS_KEY) || '[]').filter((c: any) => c.episodeId === id);