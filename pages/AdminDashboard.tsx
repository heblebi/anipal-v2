import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, Anime, User, AnimeStatus, SiteStats } from '../types';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import { createAnime, addEpisode, getAnimes, fetchAniListData, getSiteStats, getUsers, toggleBanUser, approveAnime, updateUserRole } from '../services/mockBackend';
import { Activity, Download, Users, CheckCircle, ShieldAlert, PlaySquare, Search, Shield } from 'lucide-react';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'stats' | 'create' | 'episodes' | 'moderation' | 'users'>('stats');
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [userList, setUserList] = useState<User[]>([]);

  // User Search
  const [userSearch, setUserSearch] = useState('');

  // Anime Form
  const [fetchTitle, setFetchTitle] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [cover, setCover] = useState('');
  const [banner, setBanner] = useState('');
  const [genres, setGenres] = useState('');
  
  // Episode Form
  const [selectedAnimeId, setSelectedAnimeId] = useState('');
  const [epTitle, setEpTitle] = useState('');
  const [epNumber, setEpNumber] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [fansub, setFansub] = useState('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  useEffect(() => {
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR)) {
      navigate('/');
    }
    loadData();
  }, [user, activeTab]);

  const loadData = async () => {
      // Load Animes (All for Admin, but mockbackend handles filtering if needed, we want list for episode add)
      const data = await getAnimes({ status: undefined }); // Need a way to get all including pending
      setAnimes(data);

      if(user?.role === UserRole.ADMIN) {
          const s = await getSiteStats();
          setStats(s);
          const u = await getUsers();
          setUserList(u);
      }
  };

  const handleFetchAniList = async () => {
      if(!fetchTitle) return;
      setLoading(true);
      try {
          const data = await fetchAniListData(fetchTitle);
          if(data) {
              setTitle(data.title.romaji || data.title.english);
              setDesc(data.description?.replace(/<[^>]*>?/gm, '') || ''); // Remove HTML tags
              setCover(data.coverImage.extraLarge);
              setBanner(data.bannerImage || '');
              setGenres(data.genres.join(', '));
              setMsg({type: 'success', text: 'AniList verileri çekildi!'});
          }
      } catch (e) {
          setMsg({type:'error', text: 'AniList hatası: ' + e});
      } finally {
          setLoading(false);
      }
  };

  const handleCreateAnime = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!user) return;
    setLoading(true);
    try {
      await createAnime({
        title,
        description: desc,
        coverImage: cover,
        bannerImage: banner,
        genres: genres.split(',').map(g => g.trim()),
        averageRating: 0,
        ratingsCount: 0,
      }, user);
      
      const successMsg = user.role === UserRole.ADMIN 
        ? 'Anime başarıyla oluşturuldu ve yayına alındı.' 
        : 'Anime onaya gönderildi.';
        
      setMsg({ type: 'success', text: successMsg });
      // Reset
      setTitle(''); setDesc(''); setCover(''); setBanner(''); setGenres(''); setFetchTitle('');
      loadData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Anime oluşturulamadı.' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
      await approveAnime(id);
      loadData();
      setMsg({ type: 'success', text: 'Anime onaylandı.' });
  };

  const handleBan = async (uid: string) => {
      try {
        await toggleBanUser(uid);
        loadData();
      } catch (e: any) {
          alert(e.message);
      }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
      try {
          await updateUserRole(uid, newRole);
          loadData();
          setMsg({ type: 'success', text: `Kullanıcı yetkisi güncellendi: ${newRole}` });
      } catch (e: any) {
          setMsg({ type: 'error', text: 'Yetki güncellenemedi.' });
      }
  };
  
  const handleAddEpisode = async (e: React.FormEvent) => {
    // ... Existing logic adapted ...
    e.preventDefault();
    setLoading(true);
    try {
       await addEpisode(selectedAnimeId, {
           title: epTitle,
           number: parseInt(epNumber),
           videoUrl,
           fansub
       });
       setMsg({ type: 'success', text: 'Bölüm Eklendi' });
       setEpTitle(''); setEpNumber(''); setVideoUrl(''); setFansub('');
    } catch(e) {
        setMsg({type:'error', text: 'Hata'});
    } finally {
        setLoading(false);
    }
  };

  const isModerator = user?.role === UserRole.MODERATOR;

  const filteredUsers = userList.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto space-y-8 min-h-screen pb-20 pt-28 px-4">
      <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-white flex items-center gap-2">
             <ShieldAlert className="text-amber-500" /> 
             {isModerator ? 'Moderatör Paneli' : 'Yönetim Merkezi'}
          </h1>
          <div className="text-sm text-gray-500 bg-gray-900 px-4 py-2 rounded-full">
              Yetki: <span className="text-white font-bold uppercase">{user?.role}</span>
          </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-1">
          {!isModerator && (
             <TabButton active={activeTab==='stats'} onClick={()=>setActiveTab('stats')} icon={<Activity size={18}/>}>İstatistikler</TabButton>
          )}
          <TabButton active={activeTab==='create'} onClick={()=>setActiveTab('create')} icon={<PlaySquare size={18}/>}>Anime Ekle</TabButton>
          <TabButton active={activeTab==='episodes'} onClick={()=>setActiveTab('episodes')} icon={<Download size={18}/>}>Bölüm Yükle</TabButton>
          {!isModerator && (
             <>
                <TabButton active={activeTab==='moderation'} onClick={()=>setActiveTab('moderation')} icon={<CheckCircle size={18}/>}>Onay Bekleyenler</TabButton>
                <TabButton active={activeTab==='users'} onClick={()=>setActiveTab('users')} icon={<Users size={18}/>}>Kullanıcılar</TabButton>
             </>
          )}
      </div>

      {msg && (
        <div className={`p-4 rounded border ${msg.type === 'success' ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-red-900/20 border-red-800 text-red-400'}`}>
           {msg.text}
        </div>
      )}

      {/* CONTENT AREAS */}
      
      {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <StatCard title="Toplam Kullanıcı" value={stats.totalUsers} icon={<Users className="text-blue-500"/>} />
              <StatCard title="Toplam Anime" value={stats.totalAnimes} icon={<PlaySquare className="text-purple-500"/>} />
              <StatCard title="Onay Bekleyen" value={stats.pendingAnimes} icon={<CheckCircle className="text-amber-500"/>} />
              <StatCard title="Toplam Yorum" value={stats.totalComments} icon={<Activity className="text-green-500"/>} />
          </div>
      )}

      {activeTab === 'create' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                  <div className="bg-gray-900 p-6 rounded-xl border border-gray-800">
                      <div className="flex gap-2 mb-6">
                          <input 
                            className="flex-1 bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white" 
                            placeholder="AniList'ten çekmek için anime adı..."
                            value={fetchTitle}
                            onChange={e => setFetchTitle(e.target.value)}
                          />
                          <Button onClick={handleFetchAniList} isLoading={loading} variant="secondary">Verileri Çek</Button>
                      </div>
                      
                      <form onSubmit={handleCreateAnime} className="space-y-4">
                        <Input label="Anime Başlığı" value={title} onChange={e => setTitle(e.target.value)} required />
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-300">Açıklama</label>
                            <textarea className="w-full bg-gray-800 border border-gray-700 rounded p-3 text-white h-32" value={desc} onChange={e => setDesc(e.target.value)} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Kapak URL" value={cover} onChange={e => setCover(e.target.value)} required />
                            <Input label="Banner URL (Opsiyonel)" value={banner} onChange={e => setBanner(e.target.value)} />
                        </div>
                        <Input label="Türler (Virgülle)" value={genres} onChange={e => setGenres(e.target.value)} required />
                        
                        <Button type="submit" isLoading={loading} className="w-full">
                            {isModerator ? 'Onaya Gönder' : 'Yayınla'}
                        </Button>
                      </form>
                  </div>
              </div>
              
              {/* Preview */}
              <div className="hidden md:block">
                  <h3 className="text-gray-400 mb-2 font-bold">Önizleme</h3>
                  <div className="bg-[#18181b] rounded-xl overflow-hidden shadow-lg border border-gray-800">
                      <div className="h-40 bg-gray-800 relative">
                          {banner && <img src={banner} className="w-full h-full object-cover" />}
                          {cover && <img src={cover} className="absolute -bottom-10 left-4 w-24 h-36 object-cover rounded shadow-lg border-2 border-[#18181b]" />}
                      </div>
                      <div className="pt-12 p-4">
                          <h4 className="font-bold text-white text-lg truncate">{title || 'Anime Başlığı'}</h4>
                          <p className="text-xs text-gray-500 mt-2 line-clamp-3">{desc || 'Açıklama buraya gelecek...'}</p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {activeTab === 'moderation' && (
          <div className="space-y-4">
              <h3 className="text-xl font-bold text-white">Onay Bekleyen İçerikler</h3>
              {animes.filter(a => a.status === AnimeStatus.PENDING).length === 0 ? (
                  <p className="text-gray-500">Bekleyen içerik yok.</p>
              ) : (
                  animes.filter(a => a.status === AnimeStatus.PENDING).map(anime => (
                      <div key={anime.id} className="bg-gray-900 p-4 rounded-xl flex items-center justify-between border border-gray-800">
                          <div className="flex items-center gap-4">
                              <img src={anime.coverImage} className="w-12 h-16 object-cover rounded" />
                              <div>
                                  <div className="font-bold text-white">{anime.title}</div>
                                  <div className="text-xs text-gray-500">Yükleyen: {anime.uploadedBy}</div>
                              </div>
                          </div>
                          <div className="flex gap-2">
                              <Button size="sm" onClick={() => handleApprove(anime.id)}>Onayla</Button>
                              <Button size="sm" variant="danger">Reddet</Button>
                          </div>
                      </div>
                  ))
              )}
          </div>
      )}

      {activeTab === 'users' && (
           <div className="space-y-4">
               {/* User Search Bar */}
               <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                   <input 
                     type="text" 
                     placeholder="Kullanıcı adı ara..." 
                     className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-amber-500 focus:outline-none"
                     value={userSearch}
                     onChange={e => setUserSearch(e.target.value)}
                   />
               </div>

               <div className="overflow-x-auto rounded-lg border border-gray-800">
                   <table className="w-full text-left border-collapse">
                       <thead>
                           <tr className="text-gray-500 text-sm bg-gray-900/50 border-b border-gray-800">
                               <th className="p-4">Kullanıcı</th>
                               <th className="p-4">Rol</th>
                               <th className="p-4">Durum</th>
                               <th className="p-4">İşlemler</th>
                           </tr>
                       </thead>
                       <tbody>
                           {filteredUsers.map(u => (
                               <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                                   <td className="p-4">
                                      <div className="flex items-center gap-3">
                                          <img src={u.avatar} className="w-8 h-8 rounded-full border border-gray-700" alt="" />
                                          <div>
                                              <div className="text-white font-bold">{u.username}</div>
                                              <div className="text-xs text-gray-500">{u.email}</div>
                                          </div>
                                      </div>
                                   </td>
                                   <td className="p-4">
                                       <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${u.role === UserRole.ADMIN ? 'bg-red-900/30 text-red-500' : u.role === UserRole.MODERATOR ? 'bg-amber-900/30 text-amber-500' : 'bg-gray-800 text-gray-400'}`}>
                                           {u.role}
                                       </span>
                                   </td>
                                   <td className="p-4">
                                       {u.isBanned ? <span className="text-red-500 text-xs font-bold">BANLI</span> : <span className="text-green-500 text-xs font-bold">AKTİF</span>}
                                   </td>
                                   <td className="p-4">
                                       {u.role !== UserRole.ADMIN && (
                                           <div className="flex items-center gap-2">
                                               {/* Ban Button */}
                                               <button 
                                                 onClick={() => handleBan(u.id)}
                                                 className={`text-xs font-bold px-3 py-1.5 rounded transition-colors ${u.isBanned ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-red-500/10 text-red-500 border border-red-900/30 hover:bg-red-500/20'}`}
                                               >
                                                   {u.isBanned ? 'Yasağı Kaldır' : 'Banla'}
                                               </button>

                                               {/* Role Toggle Button */}
                                               <button 
                                                 onClick={() => handleRoleChange(u.id, u.role === UserRole.MODERATOR ? UserRole.USER : UserRole.MODERATOR)}
                                                 className={`text-xs font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-1 ${u.role === UserRole.MODERATOR ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-amber-500/10 text-amber-500 border border-amber-900/30 hover:bg-amber-500/20'}`}
                                                 title={u.role === UserRole.MODERATOR ? 'Kullanıcı yap' : 'Moderatör yap'}
                                               >
                                                   <Shield size={12} />
                                                   {u.role === UserRole.MODERATOR ? 'Yetkiyi Al' : 'Mod Yap'}
                                               </button>
                                           </div>
                                       )}
                                   </td>
                               </tr>
                           ))}
                           {filteredUsers.length === 0 && (
                               <tr>
                                   <td colSpan={4} className="p-8 text-center text-gray-500">
                                       Kullanıcı bulunamadı.
                                   </td>
                               </tr>
                           )}
                       </tbody>
                   </table>
               </div>
           </div>
      )}
      
      {/* Basic Episodes Tab (Simplified for brevity as it was working) */}
      {activeTab === 'episodes' && (
          <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 max-w-xl mx-auto">
             <form onSubmit={handleAddEpisode} className="space-y-4">
                 <select className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white" value={selectedAnimeId} onChange={e=>setSelectedAnimeId(e.target.value)} required>
                     <option value="">Anime Seç</option>
                     {animes.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
                 </select>
                 <Input label="Bölüm No" value={epNumber} onChange={e=>setEpNumber(e.target.value)} type="number" required />
                 <Input label="Başlık" value={epTitle} onChange={e=>setEpTitle(e.target.value)} required />
                 <Input label="Video Link/Embed" value={videoUrl} onChange={e=>setVideoUrl(e.target.value)} required />
                 <Input label="Fansub (Opsiyonel)" value={fansub} onChange={e=>setFansub(e.target.value)} placeholder="Örn: Anipal Subs" />
                 <Button type="submit" isLoading={loading} className="w-full">Ekle</Button>
             </form>
          </div>
      )}

    </div>
  );
};

const TabButton = ({active, onClick, children, icon}: any) => (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 ${active ? 'border-amber-500 text-amber-500 bg-amber-500/5' : 'border-transparent text-gray-400 hover:text-white'}`}
    >
        {icon} {children}
    </button>
);

const StatCard = ({title, value, icon}: any) => (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 flex items-center gap-4">
        <div className="p-3 bg-gray-800 rounded-lg">{icon}</div>
        <div>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-xs text-gray-500 uppercase font-bold">{title}</div>
        </div>
    </div>
);

export default AdminDashboard;