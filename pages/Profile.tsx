import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUserById, getUserComments, updateUserProfile, getAllAchievements } from '../services/mockBackend';
import { User, Comment, Achievement } from '../types';
import Button from '../components/Button';
import { Calendar, MessageSquare, PlayCircle, Heart, Edit2, Save, X, Trophy, Zap, Upload, Camera } from 'lucide-react';

const Profile = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  
  const targetId = userId || currentUser?.id;
  
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [stats, setStats] = useState({ likedCount: 0, watchedCount: 0 });
  const [activeTab, setActiveTab] = useState<'overview'|'comments'|'badges'>('overview');
  const [loading, setLoading] = useState(true);
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);

  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editCover, setEditCover] = useState('');
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
            
            const userComments = await getUserComments(targetId);
            setComments(userComments);
            setStats({
                likedCount: u.likedEpisodes?.length || 0,
                watchedCount: u.watchedEpisodes?.length || 0
            });
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

      // Basic validation for size (e.g., max 2MB to prevent localStorage crash)
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
              coverImage: editCover
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
  const nextLevelXP = currentLevel * 100; // Formula: Level * 100
  const progressPercent = Math.min(100, ((currentXP % 100) / 100) * 100);

  // Helper for Rarity Colors
  const getRarityClass = (rarity: string = 'common') => {
      switch(rarity) {
          case 'rare': return 'border-blue-500/50 bg-blue-500/10 shadow-[0_0_15px_rgba(59,130,246,0.15)]';
          case 'epic': return 'border-purple-500/50 bg-purple-500/10 shadow-[0_0_15px_rgba(168,85,247,0.15)]';
          case 'legendary': return 'border-amber-500/80 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-500';
          default: return 'border-gray-700 bg-gray-900';
      }
  };

  // Determine images to show (Edit preview or Saved)
  const displayCover = isEditing ? editCover : profileUser.coverImage;
  const displayAvatar = isEditing ? editAvatar : profileUser.avatar;

  return (
    <div className="animate-in fade-in duration-500 pb-10">
      
      {/* Header / Cover */}
      <div className="relative h-48 md:h-64 rounded-xl overflow-hidden bg-gray-800 border border-gray-800 group">
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
      <div className="relative px-6 -mt-16 flex flex-col md:flex-row items-end md:items-start gap-6">
         {/* Avatar */}
         <div className="relative group/avatar">
            <div className="w-32 h-32 rounded-full border-4 border-[#0f0f10] overflow-hidden bg-gray-700 shadow-2xl relative">
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

                {/* Level Badge Overlay (Only show if not editing or overlaying) */}
                <div className="absolute bottom-0 right-0 bg-amber-500 text-black font-black text-xs px-2 py-1 rounded-tl-lg z-10">
                    LVL {currentLevel}
                </div>
            </div>
         </div>

         {/* Name & Bio & XP Bar */}
         <div className="flex-1 pt-2 md:pt-16 w-full">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                        {profileUser.username}
                        <span className="text-xs font-normal text-gray-500 bg-gray-900 border border-gray-700 px-2 py-0.5 rounded-full capitalize">
                            {profileUser.role}
                        </span>
                    </h1>
                    
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
                                <Button size="sm" variant="secondary" onClick={() => { setIsEditing(false); setEditAvatar(profileUser.avatar || ''); setEditCover(profileUser.coverImage || ''); }} className="text-xs h-8 border-gray-700 hover:border-amber-500">
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
         </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 mb-10 px-2">
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
              <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                  <Trophy size={20} />
              </div>
              <div>
                  <div className="text-2xl font-bold text-white">{profileUser.earnedAchievements?.length || 0}</div>
                  <div className="text-xs text-gray-500 uppercase font-bold">Başarımlar</div>
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

             {activeTab === 'badges' && (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                     {allAchievements.map(ach => {
                         const earned = profileUser.earnedAchievements?.includes(ach.id);
                         if (!earned) return null; // Only show earned ones for now or toggle to show all
                         return (
                             <div key={ach.id} className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center text-center ${getRarityClass(ach.rarity)}`}>
                                 <div className="text-4xl mb-2">{ach.icon}</div>
                                 <h4 className="font-bold text-white text-sm mb-1">{ach.title}</h4>
                                 <p className="text-[10px] text-gray-400 leading-tight mb-2">{ach.description}</p>
                                 <div className="text-[10px] font-mono text-amber-500 bg-black/40 rounded px-2 py-0.5">
                                     +{ach.xpReward} XP
                                 </div>
                             </div>
                         );
                     })}
                     {profileUser.earnedAchievements?.length === 0 && (
                         <div className="col-span-full text-gray-500 text-center py-10">Henüz başarım kazanılmamış.</div>
                     )}
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