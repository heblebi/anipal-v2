export enum UserRole {
  USER = 'user',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export interface Notification {
  id: string;
  userId: string;
  type: 'LEVEL_UP' | 'BADGE_EARNED' | 'NEW_EPISODE' | 'FOLLOW';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  icon: string; // Emoji or icon name
  conditionType: 'COMMENT_COUNT' | 'WATCH_COUNT' | 'LIST_COUNT' | 'LEVEL_REACHED';
  conditionValue: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  createdAt: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  token?: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  watchedEpisodes?: string[]; 
  likedEpisodes?: string[];
  watchlist?: string[]; // Anime IDs
  isBanned?: boolean;
  createdAt?: string;
  // XP & Level System
  xp: number;
  level: number;
  earnedAchievements: string[]; // Achievement IDs
  notifications: Notification[];
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  videoUrl: string;
  likes: number;
  fansub?: string;
}

export enum AnimeStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
}

export interface Anime {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  bannerImage?: string;
  genres: string[];
  episodes: Episode[];
  status: AnimeStatus;
  uploadedBy: string; // User ID
  averageRating?: number;
  ratingsCount?: number;
  createdAt: string;
}

export interface Comment {
  id: string;
  episodeId: string;
  userId: string;
  username: string;
  content: string;
  isSpoiler: boolean;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface SiteStats {
  totalUsers: number;
  totalAnimes: number;
  pendingAnimes: number;
  totalComments: number;
}