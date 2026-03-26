import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserById, getUserComments, updateUserProfile, getAllAchievements, getUserAnimeList, getAnimes, getUserLists, getPublicLists } from '../services/mockBackend';
import { User, Comment, Achievement, AnimeEntry, AnimeWatchStatus, Anime, UserList } from '../types';
import Button from '../components/Button';
import { MessageSquare, PlayCircle, Heart, Edit2, Save, X, Upload, Camera, List, Globe, Lock } from 'lucide-react';

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const targetId = userId || currentUser?.id;

  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState({ likedCount: 0, watchedCount: 0 });
  const [activeTab, setActiveTab] = useState<'overview'|'animelist'|'comments'|'badges'>('overview');
  const [loading, setLoading] = useState(true);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);

  // Anime List States
  const [animeList, setAnimeList] = useState<AnimeEntry[]>([]);
  const [animeData, setAnimeData] = useState<Anime[]>([]);
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [listSubTab, setListSubTab] = useState<'lists' | 'status'>('lists');

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editCover, setEditCover] = useState('');
  const [editDisplayedBadges, setEditDisplayedBadges] = useState<string[]>([]);
  const [saveLoading, setSaveLoading] = useState(false);

  // File Input Refs
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!targetId) {
        navigate('/login');
        return;
    }
    loadData();
    setAllAchievements(getAllAchievements());
  }, [targetId]);

  const loadData = async () => {
    if(!targetId) return;
    try {
        const u = await getUserById(targetId);
        if(u) {
            setProfileUser(u);
            setEditBio(u.bio || '');
            setEditAvatar(u.avatar || '');
            setEditCover(u.coverImage || '');
            setEditDisplayedBadges(u.displayedBadges || []);

            const userComments = await getUserComments(targetId);
            setComments(userComments);
            setStats({
                likedCount: u.likedEpisodes?.length || 0,
                watchedCount: u.watchedEpisodes?.length || 0
            });

            // Load anime list (watch status entries)
            const list = await getUserAnimeList(targetId);
            setAnimeList(list);

            // Load custom lists (public only for others, all for own profile)
            const isOwn = currentUser?.id === targetId;
            const lists = isOwn ? await getUserLists(targetId) : await getPublicLists(targetId);
            setUserLists(lists);

            // Load anime data for covers/titles
            const allAnimes = await getAnimes();
            setAnimeData(allAnimes);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 2 * 1024 * 1024) {
          alert("Dosya boyutu çok büyük! Lütfen 2MB'dan küçük bir resim seçin.");
          return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
          const result = reader.result as string;
          if (type === 'avatar') setEditAvatar(result);
          if (type === 'cover') setEditCover(result);
      };
      reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
      if(!profileUser) return;
      setSaveLoading(true);
      try {
          const updated = await updateUserProfile(profileUser.id, {
              bio: editBio,
              avatar: editAvatar,
              coverImage: editCover,
              displayedBadges: editDisplayedBadges,
          });
          setProfileUser(updated);
          setIsEditing(false);
      } catch (e) {
          console.error(e);
      } finally {
          setSaveLoading(false);
      }
  };

  if (loading) return <div className="text-center p-10">Yükleniyor...</div>;
  if (!profileUser) return <div className="text-center p-10 text-red-500">Kullanıcı bulunamadı</div>;

  const isOwnProfile = currentUser?.id === profileUser.id;
  const currentXP = profileUser.xp || 0;
  const currentLevel = profileUser.level || 1;
  const nextLevelXP = currentLevel * 100;
  const progressPercent = Math.min(100, ((currentXP % 100) / 100) * 100);

  const getRarityClass = (rarity: string = 'common') => {
      switch(rarity) {
          case 'rare': return 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]';
          case 'epic': return 'border-purple-500/50 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
          case 'legendary': return 'border-amber-500/80 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-500';
          default: return 'border-gray-700 bg-gray-900';
      }
  };

  const getStatusBadge = (status: string) => {
      switch(status) {
          case AnimeWatchStatus.COMPLETED: return 'bg-green-600/20 text-green-400 border border-green-700/50';
          case AnimeWatchStatus.WATCHING: return 'bg-blue-600/20 text-blue-400 border border-blue-700/50';
          case AnimeWatchStatus.PLAN_TO_WATCH: return 'bg-gray-600/20 text-gray-400 border border-gray-700/50';
          default: return 'bg-gray-600/20 text-gray-400';
      }
  };

  const getStatusLabel = (status: string) => {
      switch(status) {
          case AnimeWatchStatus.COMPLETED: return 'Bitti';
          case AnimeWatchStatus.WATCHING: return 'İzliyorum';
          case AnimeWatchStatus.PLAN_TO_WATCH: return 'Daha Sonra';
          default: return status;
      }
  };

  const displayCover = isEditing ? editCover : profileUser.coverImage;
  const displayAvatar = isEditing ? editAvatar : profileUser.avatar;
  const animeListVisible = profileUser.showAnimeList !== false;

  // Badge display helpers
  const isNovice = (profileUser.level || 1) < 5;
  const showcaseBadgeIds: string[] = (() => {
    const base = isNovice ? ['lvl-1'] : [];
    const selected = (profileUser.displayedBadges || []).filter(id => id !== 'lvl-1' || !isNovice);
    return [...new Set([...base, ...selected])].slice(0, 5);
  })();
  const showcaseBadges = showcaseBadgeIds.map(id => allAchievements.find(a => a.id === id)).filter(Boolean) as Achievement[];

  const toggleDisplayedBadge = (id: string) => {
    if (isNovice && id === 'lvl-1') return; // can't deselect novice
    setEditDisplayedBadges(prev => {
      if (prev.includes(id)) return prev.filter(b => b !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  return (
    <div className="animate-in fade-in duration-500 pb-10">

      {/* Header / Cover */}
      <div className="relative h-36 sm:h-48 md:h-64 rounded-xl overflow-hidden bg-gray-800 border border-gray-800 group">
         <img
            src={displayCover || "https://picsum.photos/1200/400?grayscale"}
            alt="Cover"
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity"
         />
         <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f10] to-transparent"></div>

         {isOwnProfile && isEditing && (
             <>
                <input
                    type="file"
                    ref={coverInputRef}
                    onChange={(e) => handleFileChange(e, 'cover')}
                    accept="image/*"
                    className="hidden"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <button
                        onClick={() => coverInputRef.current?.click()}
                        className="bg-black/70 hover:bg-black text-white px-6 py-2 rounded-full backdrop-blur-sm border border-gray-600 flex items-center gap-2 transition-colors font-bold text-sm"
                    >
                        <Camera size={18} /> Kapak Fotoğrafını Değiştir
                    </button>
                </div>
             </>
         )}
      </div>

      {/* Profile Info Section */}
      <div className="relative px-3 sm:px-6 -mt-12 sm:-mt-16 flex flex-col md:flex-row items-end md:items-start gap-4 sm:gap-6">
         {/* Avatar */}
         <div className="relative group/avatar">
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-[#0f0f10] overflow-hidden bg-gray-700 shadow-2xl relative">
                <img
                    src={displayAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileUser.username}`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                />

                {isOwnProfile && isEditing && (
                    <>
                        <input
                            type="file"
                            ref={avatarInputRef}
                            onChange={(e) => handleFileChange(e, 'avatar')}
                            accept="image/*"
                            className="hidden"
                        />
                        <div
                            className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer hover:bg-black/70 transition-colors"
                            onClick={() => avatarInputRef.current?.click()}
                        >
                            <Upload size={24} className="text-white" />
                        </div>
                    </>
                )}

                <div className="absolute bottom-0 right-0 bg-amber-500 text-black font-black text-xs px-2 py-1 rounded-tl-lg z-10">
                    LVL {currentLevel}
                </div>
            </div>
         </div>

         {/* Name & Bio & XP Bar */}
         <div className="flex-1 pt-1 md:pt-16 w-full min-w-0">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-xl sm:text-3xl font-bold text-white flex items-center gap-2 flex-wrap">
                        {profileUser.username}
                        <span className="text-xs font-normal text-gray-500 bg-gray-900 border border-gray-700 px-2 py-0.5 rounded-full capitalize">
                            {profileUser.role}
                        </span>
                    </h1>
                    {showcaseBadges.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {showcaseBadges.map(ach => (
                                <span
                                    key={ach.id}
                                    title={`${ach.title} — ${ach.description}`}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border ${getRarityClass(ach.rarity)} cursor-default`}
                                >
                                    {ach.icon} <span className="hidden sm:inline">{ach.title.split(' (')[0]}</span>
                                </span>
                            ))}
                        </div>
                    )}

                    {/* XP BAR */}
                    <div className="mt-2 w-full max-w-sm">
                        <div className="flex justify-between text-[10px] text-gray-400 mb-1 font-bold uppercase">
                            <span>{currentXP} XP</span>
                            <span>Sonraki: {currentXP - (currentXP%100) + 100}</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-amber-600 to-amber-400"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {isOwnProfile && (
                    <div>
                        {isEditing ? (
                            <div className="flex gap-2">
                                <Button size="sm" onClick={handleSaveProfile} isLoading={saveLoading} className="text-xs h-8">
                                    <Save size={14} className="mr-1" /> Kaydet
                                </Button>
                                <Button size="sm" variant="secondary" onClick={() => { setIsEditing(false); setEditAvatar(profileUser.avatar || ''); setEditCover(profileUser.coverImage || ''); setEditDisplayedBadges(profileUser.displayedBadges || []); }} className="text-xs h-8 border-gray-700 hover:border-amber-500">
                                    <X size={14} className="mr-1" /> İptal
                                </Button>
                            </div>
                        ) : (
                            <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)} className="text-xs h-8 border-gray-700 hover:border-amber-500">
                                <Edit2 size={14} className="mr-1" /> Düzenle
                            </Button>
                        )}
                    </div>
                )}
            </div>

            {/* Bio Field */}
            <div className="mt-4 max-w-2xl">
                {isEditing ? (
                    <textarea
                        className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-sm text-gray-200 focus:border-amber-500 outline-none"
                        rows={3}
                        value={editBio}
                        onChange={e => setEditBio(e.target.value)}
                        placeholder="Hakkınızda bir şeyler yazın..."
                    />
                ) : (
                    <p className="text-gray-400 text-sm leading-relaxed italic">
                        "{profileUser.bio || 'Henüz biyografi eklenmemiş.'}"
                    </p>
                )}
            </div>

            {/* Badge Picker (edit mode) */}
            {isEditing && profileUser.earnedAchievements?.length > 0 && (
                <div className="mt-4 max-w-2xl">
                    <p className="text-xs text-gray-400 font-bold uppercase mb-2">
                        Vitrin Rozetleri <span className="text-gray-600 font-normal normal-case">(en fazla 5 — profilde görünür)</span>
                    </p>
                    <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-2 bg-gray-900/50 rounded-lg border border-gray-800">
                        {allAchievements.filter(a => profileUser.earnedAchievements.includes(a.id)).map(ach => {
                            const isLocked = isNovice && ach.id === 'lvl-1';
                            const isSelected = editDisplayedBadges.includes(ach.id) || isLocked;
                            return (
                                <button
                                    key={ach.id}
                                    type="button"
                                    onClick={() => toggleDisplayedBadge(ach.id)}
                                    title={ach.description}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold border transition-all ${
                                        isLocked ? 'border-amber-600 bg-amber-500/20 text-amber-400 cursor-not-allowed opacity-80' :
                                        isSelected ? 'border-amber-500 bg-amber-500/20 text-amber-400' :
                                        'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500'
                                    }`}
                                >
                                    {ach.icon} {ach.title.split(' (')[0]}
                                    {isLocked && <span className="ml-0.5 text-[10px]">🔒</span>}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[10px] text-gray-600 mt-1">{editDisplayedBadges.length}/5 seçildi</p>
                </div>
            )}
         </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-10 mb-6 sm:mb-10 px-1 sm:px-2">
          <div className="bg-[#18181b] p-4 rounded-xl border border-gray-800 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <PlayCircle size={20} />
              </div>
              <div>
                  <div className="text-2xl font-bold text-white">{stats.watchedCount}</div>
                  <div className="text-xs text-gray-500 uppercase font-bold">İzlenen Bölüm</div>
              </div>
          </div>
          <div className="bg-[#18181b] p-4 rounded-xl border border-gray-800 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                  <Heart size={20} />
              </div>
              <div>
                  <div className="text-2xl font-bold text-white">{stats.likedCount}</div>
                  <div className="text-xs text-gray-500 uppercase font-bold">Beğeniler</div>
              </div>
          </div>
          <div className="bg-[#18181b] p-4 rounded-xl border border-gray-800 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                  <MessageSquare size={20} />
              </div>
              <div>
                  <div className="text-2xl font-bold text-white">{comments.length}</div>
                  <div className="text-xs text-gray-500 uppercase font-bold">Yorumlar</div>
              </div>
          </div>
          <div className="bg-[#18181b] p-4 rounded-xl border border-gray-800 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
                  <List size={20} />
              </div>
              <div>
                  <div className="text-2xl font-bold text-white">{animeList.length}</div>
                  <div className="text-xs text-gray-500 uppercase font-bold">Anime Listesi</div>
              </div>
          </div>
      </div>

      {/* Content Tabs */}
      <div>
         <div className="flex border-b border-gray-800 mb-6 overflow-x-auto">
             <button
                onClick={() => setActiveTab('overview')}
                className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'overview' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-white'}`}
             >
                Genel Bakış
             </button>
             <button
                onClick={() => setActiveTab('animelist')}
                className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'animelist' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-white'}`}
             >
                Anime Listesi ({animeList.length})
             </button>
             <button
                onClick={() => setActiveTab('badges')}
                className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'badges' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-white'}`}
             >
                Rozetler & Başarımlar ({profileUser.earnedAchievements?.length || 0})
             </button>
             <button
                onClick={() => setActiveTab('comments')}
                className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'comments' ? 'border-amber-500 text-amber-500' : 'border-transparent text-gray-400 hover:text-white'}`}
             >
                Yorum Geçmişi ({comments.length})
             </button>
         </div>

         <div className="min-h-[200px]">
             {activeTab === 'overview' && (
                 <div className="text-gray-400 text-center py-10 bg-[#18181b] rounded-xl border border-gray-800 border-dashed">
                     <p>Hoşgeldin, {profileUser.username}! Profilin harika görünüyor.</p>
                 </div>
             )}

             {activeTab === 'animelist' && (
                 <div>
                     {/* Sub-tabs */}
                     <div className="flex gap-1 mb-5 bg-gray-900/60 border border-gray-800 rounded-xl p-1 w-fit">
                         <button
                             onClick={() => setListSubTab('lists')}
                             className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${listSubTab === 'lists' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                         >
                             Listeler
                         </button>
                         <button
                             onClick={() => setListSubTab('status')}
                             className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${listSubTab === 'status' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                         >
                             İzleme Durumu
                         </button>
                     </div>

                     {/* Sub-tab: Listeler */}
                     {listSubTab === 'lists' && (
                         <div className="space-y-8">
                             {userLists.length === 0 && (
                                 <div className="text-gray-500 text-center py-10 bg-[#18181b] rounded-xl border border-gray-800 border-dashed">
                                     {isOwnProfile ? 'Henüz liste oluşturmadın. Bir animeye giderek liste ekleyebilirsin.' : 'Herkese açık liste yok.'}
                                 </div>
                             )}
                             {userLists.map(list => {
                                 const listAnimes = list.animeIds.map(aid => animeData.find(a => a.id === aid)).filter(Boolean) as Anime[];
                                 return (
                                     <div key={list.id}>
                                         <div className="flex items-center gap-2 mb-3">
                                             <h3 className="font-bold text-white text-base">{list.name}</h3>
                                             <span className="text-gray-600 text-xs flex items-center gap-1">
                                                 {list.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                                                 {list.isPublic ? 'Herkese açık' : 'Gizli'}
                                             </span>
                                             <span className="text-gray-700 text-xs">· {list.animeIds.length} anime</span>
                                         </div>
                                         {listAnimes.length === 0 ? (
                                             <p className="text-gray-600 text-sm italic">Bu liste boş.</p>
                                         ) : (
                                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                 {listAnimes.map(anime => (
                                                     <Link key={anime.id} to={`/anime/${anime.id}`} className="bg-[#18181b] border border-gray-800 rounded-xl overflow-hidden hover:border-amber-500/40 transition-colors group">
                                                         <div className="aspect-[3/4] bg-gray-900">
                                                             <img src={anime.coverImage} alt={anime.title} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                                                         </div>
                                                         <div className="p-2">
                                                             <p className="text-white text-xs font-bold line-clamp-2">{anime.title}</p>
                                                         </div>
                                                     </Link>
                                                 ))}
                                             </div>
                                         )}
                                     </div>
                                 );
                             })}
                         </div>
                     )}

                     {/* Sub-tab: İzleme Durumu */}
                     {listSubTab === 'status' && (
                         <div className="space-y-8">
                             {!animeListVisible && !isOwnProfile ? (
                                 <div className="text-gray-500 text-center py-10 bg-[#18181b] rounded-xl border border-gray-800 border-dashed">
                                     Bu kullanıcının izleme listesi gizli.
                                 </div>
                             ) : animeList.length === 0 ? (
                                 <div className="text-gray-500 text-center py-10 bg-[#18181b] rounded-xl border border-gray-800 border-dashed">
                                     Henüz hiç anime değerlendirilmemiş.
                                 </div>
                             ) : (
                                 [
                                     { key: AnimeWatchStatus.WATCHING, label: 'İzliyorum', color: 'text-blue-400', dot: 'bg-blue-400' },
                                     { key: AnimeWatchStatus.COMPLETED, label: 'Bitti', color: 'text-green-400', dot: 'bg-green-400' },
                                     { key: AnimeWatchStatus.PLAN_TO_WATCH, label: 'Daha Sonra', color: 'text-gray-400', dot: 'bg-gray-400' },
                                 ].map(group => {
                                     const entries = animeList.filter(e => e.status === group.key);
                                     if (entries.length === 0) return null;
                                     return (
                                         <div key={group.key}>
                                             <h3 className={`font-bold text-base mb-3 flex items-center gap-2 ${group.color}`}>
                                                 <span className={`w-2 h-2 rounded-full ${group.dot}`} />
                                                 {group.label} <span className="text-gray-600 font-normal text-sm">({entries.length})</span>
                                             </h3>
                                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                 {entries.map(entry => {
                                                     const anime = animeData.find(a => a.id === entry.animeId);
                                                     return (
                                                         <Link key={entry.animeId} to={`/anime/${entry.animeId}`} className="bg-[#18181b] border border-gray-800 rounded-xl overflow-hidden hover:border-amber-500/40 transition-colors group">
                                                             <div className="aspect-[3/4] bg-gray-900 relative">
                                                                 {anime?.coverImage
                                                                     ? <img src={anime.coverImage} alt={anime.title} className="w-full h-full object-cover group-hover:opacity-80 transition-opacity" />
                                                                     : <div className="w-full h-full flex items-center justify-center text-gray-700"><List size={32} /></div>
                                                                 }
                                                             </div>
                                                             <div className="p-2">
                                                                 <p className="text-white text-xs font-bold line-clamp-2 mb-1">{anime?.title || entry.animeId}</p>
                                                                 {entry.rating ? (
                                                                     <span className="text-amber-400 text-xs font-bold">★ {entry.rating}/10</span>
                                                                 ) : null}
                                                             </div>
                                                         </Link>
                                                     );
                                                 })}
                                             </div>
                                         </div>
                                     );
                                 })
                             )}
                         </div>
                     )}
                 </div>
             )}

             {activeTab === 'badges' && (
                 <div>
                     {isOwnProfile && (
                         <p className="text-xs text-gray-500 mb-4">Profilinde göstermek istediğin rozetleri <button className="text-amber-500 hover:underline" onClick={() => setIsEditing(true)}>Düzenle</button> modunda seçebilirsin (maks. 5).</p>
                     )}
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                         {allAchievements.map(ach => {
                             const earned = profileUser.earnedAchievements?.includes(ach.id);
                             const isShowcased = showcaseBadgeIds.includes(ach.id);
                             if (!earned) return null;
                             return (
                                 <div key={ach.id} className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center text-center relative ${getRarityClass(ach.rarity)}`}>
                                     {isShowcased && (
                                         <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-amber-500 border border-amber-600" title="Vitrinleniyor" />
                                     )}
                                     <div className="text-4xl mb-2">{ach.icon}</div>
                                     <h4 className="font-bold text-white text-sm mb-1">{ach.title}</h4>
                                     <p className="text-[10px] text-gray-400 leading-tight mb-2">{ach.description}</p>
                                     {ach.xpReward > 0 && (
                                         <div className="text-[10px] font-mono text-amber-500 bg-black/40 rounded px-2 py-0.5">
                                             +{ach.xpReward} XP
                                         </div>
                                     )}
                                 </div>
                             );
                         })}
                         {profileUser.earnedAchievements?.length === 0 && (
                             <div className="col-span-full text-gray-500 text-center py-10">Henüz başarım kazanılmamış.</div>
                         )}
                     </div>
                 </div>
             )}

             {activeTab === 'comments' && (
                 <div className="space-y-4">
                     {comments.map(c => (
                         <div key={c.id} className="bg-[#18181b] p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-colors">
                             <div className="flex justify-between items-start mb-2">
                                <span className="text-amber-500 font-bold text-sm">Bölüm ID: {c.episodeId}</span>
                                <span className="text-xs text-gray-600">{new Date(c.createdAt).toLocaleDateString()}</span>
                             </div>
                             <p className="text-gray-300 text-sm">{c.content}</p>
                         </div>
                     ))}
                     {comments.length === 0 && (
                         <div className="text-gray-500 text-center">Henüz yorum bulunmuyor.</div>
                     )}
                 </div>
             )}
         </div>
      </div>

    </div>
  );
};

export default Profile;
