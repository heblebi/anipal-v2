export enum UserRole {
  USER = 'user',
  EDITOR = 'editor',
  MODERATOR = 'moderator',
  ADMIN = 'admin',
}

export interface Notification {
  id: string;
  userId: string;
  type: 'LEVEL_UP' | 'BADGE_EARNED' | 'NEW_EPISODE' | 'FOLLOW' | 'ANIME_REQUEST';
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
  conditionType: 'COMMENT_COUNT' | 'WATCH_COUNT' | 'LIST_COUNT' | 'LEVEL_REACHED' | 'LIST_CREATED_COUNT';
  conditionValue: number;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface NewsLink {
  label: string;
  url: string;
}

export interface NewsItem {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  image: string;
  category: string;
  createdAt: string;
  status: 'pending' | 'published';
  authorId: string;
  links?: NewsLink[];
}

export interface User {
  id: string;
  username: string;
  displayName?: string;
  email: string;
  role: UserRole;
  token?: string;
  avatar?: string;
  coverImage?: string;
  bio?: string;
  watchedEpisodes?: string[];
  likedEpisodes?: string[];
  watchlist?: string[]; // Anime IDs
  animeList?: AnimeEntry[];
  showAnimeList?: boolean;
  customLists?: UserList[];
  isBanned?: boolean;
  banExpiresAt?: string | null; // null = kalıcı ban
  createdAt?: string;
  // XP & Level System
  xp: number;
  level: number;
  earnedAchievements: string[]; // Achievement IDs
  displayedBadges?: string[]; // Up to 5 badge IDs shown on profile
  notifications: Notification[];
  // Privacy & Social
  allowMessages?: boolean;
  isPrivate?: boolean;
}

export interface VideoSource {
  name: string;
  url: string;
}

export interface FansubGroup {
  name: string;
  sources: VideoSource[];
  contributorUsername?: string;
  contributorAvatar?: string;
  contributorId?: string;
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  videoUrl: string;
  sources?: VideoSource[];
  fansubs?: FansubGroup[];
  likes: number;
  fansub?: string;
  thumbnail?: string;
  addedBy?: string; // user ID of whoever added this episode
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
  characters?: AnimeCharacter[];
}

export interface Comment {
  id: string;
  episodeId: string;
  userId: string;
  username: string;
  avatar?: string;
  content: string;
  isSpoiler: boolean;
  createdAt: string;
}

export enum AnimeWatchStatus {
  WATCHING = 'watching',
  COMPLETED = 'completed',
  PLAN_TO_WATCH = 'plan_to_watch',
}

export interface AnimeEntry {
  animeId: string;
  status: AnimeWatchStatus;
  rating?: number; // 1-10
  review?: string;
  updatedAt: string;
}

export interface UserList {
  id: string;
  name: string;
  isPublic: boolean;
  animeIds: string[];
  createdAt: string;
}

export interface AnimeCharacter {
  id: number;
  name: string;
  image: string;
  role: 'MAIN' | 'SUPPORTING';
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

export interface AnimeRequest {
  id: string;
  userId: string;
  username: string;
  displayName?: string;
  animeName: string;
  note?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface Friendship {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'blocked';
  createdAt: string;
  // Populated fields
  requester?: { id: string; username: string; displayName?: string; avatar?: string };
  addressee?: { id: string; username: string; displayName?: string; avatar?: string };
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  userId: string;
  username: string;
  displayName?: string;
  avatar?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterUsername?: string;
  reportedUserId?: string;
  reportedUsername?: string;
  commentId?: string;
  reason: string;
  type: 'profile' | 'comment';
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

export interface EpisodeContribution {
  id: string;
  animeId: string;
  animeTitle?: string;
  type?: 'episode' | 'source'; // 'episode' = new episode, 'source' = add to existing episode
  targetEpisodeId?: string;    // for source type: which episode to add the fansub to
  episodeNumber: number;
  episodeTitle: string;
  thumbnail?: string;
  fansubName: string;
  sources: VideoSource[];
  submittedBy: string;
  submitterUsername?: string;
  submitterAvatar?: string;
  status: 'pending' | 'approved' | 'rejected';
  pendingAction?: 'edit' | 'delete' | null;
  pendingData?: { fansubName?: string; sources?: VideoSource[]; episodeTitle?: string; thumbnail?: string } | null;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}