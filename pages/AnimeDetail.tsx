import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { getAnimeById, toggleLikeEpisode, toggleWatchlist, markEpisodeWatched, unmarkEpisodeWatched, saveAnimeEntry, getAnimeEntry, grantWatchXP, getUserLists, createUserList, addAnimeToList, removeAnimeFromList, updateListVisibility, deleteUserList } from '../services/mockBackend';
import { useAuth } from '../context/AuthContext';
import { Anime, Episode, VideoSource, FansubGroup, AnimeWatchStatus } from '../types';
import VideoPlayer from '../components/VideoPlayer';
import CommentSection from '../components/CommentSection';
import { PlayCircle, List, Heart, MessageSquare, Plus, Check, Star, CheckCircle2, X, ChevronLeft, ChevronRight, Globe, Lock, Trash2 } from 'lucide-react';
import { UserList } from '../types';
import Button from '../components/Button';

const AnimeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [selectedSource, setSelectedSource] = useState<VideoSource | null>(null);
  const [selectedFansubName, setSelectedFansubName] = useState<string | null>(null);

  // Interaction States
  const [isLiked, setIsLiked] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [isWatched, setIsWatched] = useState(false);

  // Anime Entry / Rating States
  const [animeEntry, setAnimeEntry] = useState<{status: string; rating: number; review: string} | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingForm, setRatingForm] = useState({ status: AnimeWatchStatus.WATCHING, rating: 0, review: '' });

  // List States
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [showListModal, setShowListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  // Watch Timer States
  const [playerStarted, setPlayerStarted] = useState(false);
  const [xpGranted, setXpGranted] = useState(false);

  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAnime = async () => {
      if (id) {
        const data = await getAnimeById(id);
        if (data) {
          setAnime(data);
          if (data.episodes.length > 0) {
            const epIdFromQuery = searchParams.get('ep');
            const sorted = [...data.episodes].sort((a, b) => a.number - b.number);
            const targetEp = epIdFromQuery ? sorted.find(e => e.id === epIdFromQuery) || sorted[0] : sorted[0];
            setSelectedEpisode(targetEp);
            const fansubs = getEpFansubs(targetEp);
            setSelectedFansubName(fansubs[0].name);
            setSelectedSource(fansubs[0].sources[0] || null);
          }
        }
      }
      setLoading(false);
    };
    fetchAnime();
  }, [id]);

  useEffect(() => {
    if (user && anime) {
       setInWatchlist(user.watchlist?.includes(anime.id) || false);
       if(selectedEpisode) {
           setIsLiked(user.likedEpisodes?.includes(selectedEpisode.id) || false);
           setIsWatched(user.watchedEpisodes?.includes(selectedEpisode.id) || false);
       }
    }
  }, [user, anime, selectedEpisode]);

  // Load lists
  useEffect(() => {
    if (user) getUserLists(user.id).then(setUserLists);
  }, [user]);

  // Load anime entry
  useEffect(() => {
    if (user && id) {
      getAnimeEntry(user.id, id).then(entry => {
        if (entry) {
          setAnimeEntry({ status: entry.status, rating: entry.rating || 0, review: entry.review || '' });
          setRatingForm({ status: entry.status as AnimeWatchStatus, rating: entry.rating || 0, review: entry.review || '' });
        }
      });
    }
  }, [user, id]);

  // Helper: normalize episode into FansubGroup[]
  const getEpFansubs = (ep: Episode): FansubGroup[] => {
    if (ep.fansubs && ep.fansubs.length > 0) return ep.fansubs;
    const sources = ep.sources && ep.sources.length > 0 ? ep.sources : [{ name: 'Varsayılan', url: ep.videoUrl }];
    return [{ name: ep.fansub || 'Varsayılan', sources }];
  };

  // Reset fansub/source when episode changes
  useEffect(() => {
    setXpGranted(false);
    setPlayerStarted(false);
    if (selectedEpisode) {
      const fansubs = getEpFansubs(selectedEpisode);
      setSelectedFansubName(fansubs[0].name);
      setSelectedSource(fansubs[0].sources[0] || null);
    }
  }, [selectedEpisode?.id]);

  // Watch timer — starts after play click, only counts when tab is visible
  useEffect(() => {
    if (!playerStarted || !selectedEpisode || !user || xpGranted) return;
    let seconds = 0;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        seconds += 1;
        if (seconds >= 1080) { // 18 minutes of actual visible time
          clearInterval(interval);
          grantWatchXP(user.id, selectedEpisode.id).then(() => setXpGranted(true));
        }
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [playerStarted, selectedEpisode?.id]);

  const handleToggleAnimeInList = async (listId: string, animeId: string) => {
    if (!user) return navigate('/login');
    const list = userLists.find(l => l.id === listId);
    if (!list) return;
    if (list.animeIds.includes(animeId)) {
      await removeAnimeFromList(user.id, listId, animeId);
    } else {
      await addAnimeToList(user.id, listId, animeId);
    }
    getUserLists(user.id).then(setUserLists);
  };

  const handleCreateList = async () => {
    if (!user || !newListName.trim()) return;
    setCreatingList(true);
    await createUserList(user.id, newListName.trim(), true);
    setNewListName('');
    getUserLists(user.id).then(setUserLists);
    setCreatingList(false);
  };

  const handleDeleteList = async (listId: string) => {
    if (!user) return;
    const list = userLists.find(l => l.id === listId);
    if (!list || list.id.includes('default')) return;
    await deleteUserList(user.id, listId);
    getUserLists(user.id).then(setUserLists);
  };

  const handleToggleListVisibility = async (listId: string, current: boolean) => {
    if (!user) return;
    await updateListVisibility(user.id, listId, !current);
    getUserLists(user.id).then(setUserLists);
  };

  const isInAnyList = anime ? userLists.some(l => l.animeIds.includes(anime.id)) : false;

  const handleWatchlist = async () => {
      if (!isAuthenticated || !user || !anime) return navigate('/login');
      const newState = await toggleWatchlist(user.id, anime.id);
      setInWatchlist(newState);
  };

  const handleToggleWatched = async () => {
      if (!isAuthenticated || !user || !selectedEpisode) return navigate('/login');
      if (isWatched) {
          setIsWatched(false);
          await unmarkEpisodeWatched(user.id, selectedEpisode.id);
      } else {
          setIsWatched(true);
          await markEpisodeWatched(user.id, selectedEpisode.id);
      }
  };

  const handleSaveEntry = async () => {
      if (!user || !anime) return;
      await saveAnimeEntry(user.id, anime.id, ratingForm);
      setAnimeEntry(ratingForm);
      setShowRatingModal(false);
  };

  if (loading) return <div className="text-center p-10 text-amber-500">Yükleniyor...</div>;
  if (!anime) return <div className="text-center p-10 text-red-500">Anime bulunamadı</div>;

  return (
    <div className="animate-in fade-in duration-500 bg-[#0f0f10] min-h-screen">

      {/* Back link */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-12 pt-4">
        <Link to={`/anime/${anime.id}`} className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-sm font-medium transition-colors">
          <ChevronLeft size={16} /> Anime Sayfasına Dön
        </Link>
      </div>

      {/* Detail Hero Backdrop */}
      <div className="relative w-full h-[38vh] sm:h-[45vh] md:h-[50vh] overflow-hidden">
          <img src={anime.bannerImage || anime.coverImage} className="w-full h-full object-cover opacity-50 blur-sm" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f10] via-[#0f0f10]/40 to-transparent"></div>

          <div className="absolute bottom-0 left-0 w-full px-4 pb-4 md:px-12 md:pb-8 max-w-7xl mx-auto flex items-end gap-5 z-10">
              {/* Cover Art - hidden on small mobile */}
              <div className="hidden sm:block w-28 md:w-44 flex-shrink-0 rounded-lg overflow-hidden shadow-2xl border-2 border-gray-800 self-end">
                  <img src={anime.coverImage} className="w-full h-full object-cover" alt={anime.title} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 pb-1">
                  <h1 className="text-xl sm:text-3xl md:text-5xl font-black text-white mb-1 md:mb-2 leading-tight">{anime.title}</h1>
                  <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs sm:text-sm font-bold text-gray-300 mb-3">
                      <span className="text-amber-500 flex items-center gap-1">
                          <Star fill="currentColor" size={14} /> {anime.averageRating || 'N/A'}
                      </span>
                      <span>{anime.episodes.length} Bölüm</span>
                      <div className="flex flex-wrap gap-1">
                          {anime.genres.slice(0, 3).map(g => <span key={g} className="bg-gray-800/80 px-2 py-0.5 rounded text-xs border border-gray-700">{g}</span>)}
                      </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={handleWatchlist}
                        className={`flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-full font-bold text-sm transition-all ${inWatchlist ? 'bg-green-600 text-white' : 'bg-gray-800/90 text-white hover:bg-gray-700'}`}
                      >
                          {inWatchlist ? <Check size={16} /> : <Plus size={16} />}
                          {inWatchlist ? 'Listemde' : 'Listeme Ekle'}
                      </button>

                      <button
                        onClick={() => setShowRatingModal(true)}
                        className="bg-gray-800/90 text-white rounded-full hover:bg-gray-700 transition-colors border border-gray-700 flex items-center gap-2 px-4 py-2.5 text-sm font-bold"
                      >
                        <Star size={14} className={animeEntry?.rating ? 'text-amber-500 fill-amber-500' : ''} />
                        {animeEntry ? (
                          <span className="text-amber-500">{
                            animeEntry.status === AnimeWatchStatus.COMPLETED ? 'Bitti' :
                            animeEntry.status === AnimeWatchStatus.WATCHING ? 'İzliyorum' : 'Daha Sonra'
                          } {animeEntry.rating ? `· ${animeEntry.rating}/10` : ''}</span>
                        ) : 'Değerlendir'}
                      </button>
                  </div>
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-12 py-4 md:py-8 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">
        {/* Main Content (Player) */}
        <div className="lg:col-span-2 space-y-6">
            {/* Oynatıcı Seçimi */}
            {selectedEpisode && (() => {
              const fansubs = getEpFansubs(selectedEpisode);
              const activeFansub = fansubs.find(f => f.name === selectedFansubName) || fansubs[0];
              return (
                <div className="bg-[#18181b] rounded-xl border border-gray-800 p-3 space-y-3">
                  {/* Fansub seçici — birden fazla varsa göster */}
                  {fansubs.length > 1 && (
                    <div>
                      <p className="text-xs text-gray-500 font-bold uppercase mb-2">Fansub Seç</p>
                      <div className="flex gap-2 flex-wrap">
                        {fansubs.map((fb, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              setSelectedFansubName(fb.name);
                              setSelectedSource(fb.sources[0] || null);
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                              activeFansub.name === fb.name
                                ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20'
                                : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-blue-500 hover:text-white'
                            }`}
                          >
                            {fb.name || 'Fansub'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Kaynak seçici */}
                  <div>
                    <p className="text-xs text-gray-500 font-bold uppercase mb-2">Oynatıcı Seç</p>
                    <div className="flex gap-2 flex-wrap">
                      {activeFansub.sources.map((src, i) => (
                        <button
                          key={i}
                          onClick={() => setSelectedSource(src)}
                          className={`px-5 py-2 rounded-lg text-sm font-bold transition-all border ${
                            selectedSource?.url === src.url
                              ? 'bg-amber-500 text-black border-amber-500 shadow-lg shadow-amber-500/20'
                              : 'bg-gray-900 text-gray-300 border-gray-700 hover:border-amber-500 hover:text-white'
                          }`}
                        >
                          {src.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
                {selectedEpisode ? (
                <VideoPlayer
                    key={`${selectedEpisode.id}-${selectedSource?.url}`}
                    embedUrl={selectedSource?.url || selectedEpisode.videoUrl}
                    poster={anime.bannerImage || anime.coverImage}
                    onPlay={() => setPlayerStarted(true)}
                />
                ) : (
                    <div className="aspect-video flex items-center justify-center bg-gray-900 text-gray-500">
                        <p>Bölüm seçilmedi.</p>
                    </div>
                )}
            </div>

            {selectedEpisode && (() => {
                const sorted = [...anime.episodes].sort((a, b) => a.number - b.number);
                const currentIdx = sorted.findIndex(e => e.id === selectedEpisode.id);
                const prevEp = currentIdx > 0 ? sorted[currentIdx - 1] : null;
                const nextEp = currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null;
                const goToEp = (ep: Episode) => {
                    setSelectedEpisode(ep);
                    const fansubs = getEpFansubs(ep);
                    setSelectedFansubName(fansubs[0].name);
                    setSelectedSource(fansubs[0].sources[0] || null);
                    navigate(`/anime/${id}/watch?ep=${ep.id}`, { replace: true });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                };
                return (
                <div className="bg-[#18181b] p-3 sm:p-4 rounded-xl border border-gray-800 space-y-3">
                    <div className="space-y-2">
                        <div className="min-w-0">
                            <h2 className="text-base sm:text-xl font-bold text-white leading-tight">{selectedEpisode.number}. Bölüm: {selectedEpisode.title}</h2>
                            {selectedFansubName && selectedFansubName !== 'Varsayılan' && (
                              <span className="text-xs text-amber-500 font-medium">Fansub: {selectedFansubName}</span>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                 onClick={handleToggleWatched}
                                 variant="secondary"
                                 className={`flex items-center gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 py-2 h-auto flex-1 sm:flex-none justify-center ${isWatched ? 'text-green-500 border-green-900 bg-green-900/10 hover:text-red-400 hover:border-red-900 hover:bg-red-900/10' : ''}`}
                            >
                                <CheckCircle2 size={15} />
                                <span>{isWatched ? 'İzlendi' : 'İzlendi İşaretle'}</span>
                            </Button>

                            <Button
                                variant="secondary"
                                onClick={() => isAuthenticated ? setShowListModal(true) : navigate('/login')}
                                className={`flex items-center gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 py-2 h-auto flex-1 sm:flex-none justify-center ${isInAnyList ? 'text-amber-400 border-amber-900 bg-amber-900/10' : ''}`}
                            >
                                <List size={15} />
                                <span>Listeye Ekle</span>
                            </Button>

                            <Button variant="ghost" onClick={() => commentsRef.current?.scrollIntoView({behavior:'smooth'})} className="flex items-center gap-1.5 text-xs sm:text-sm px-2.5 sm:px-3 py-2 h-auto flex-1 sm:flex-none justify-center">
                                <MessageSquare size={15} />
                                <span>Yorumlar</span>
                            </Button>
                        </div>
                    </div>

                    {/* Prev / Next Episode Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => prevEp && goToEp(prevEp)}
                            disabled={!prevEp}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all border border-gray-700 bg-gray-900 hover:bg-gray-800 hover:border-amber-500 hover:text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-700 disabled:hover:text-white"
                        >
                            <ChevronLeft size={16} />
                            <span>{prevEp ? `${prevEp.number}. Bölüm` : 'Önceki Bölüm'}</span>
                        </button>
                        <button
                            onClick={() => nextEp && goToEp(nextEp)}
                            disabled={!nextEp}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-sm transition-all border border-gray-700 bg-gray-900 hover:bg-gray-800 hover:border-amber-500 hover:text-amber-500 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:border-gray-700 disabled:hover:text-white"
                        >
                            <span>{nextEp ? `${nextEp.number}. Bölüm` : 'Sonraki Bölüm'}</span>
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
                );
            })()}

            {xpGranted && (
                <div className="bg-amber-500/10 border border-amber-800/40 rounded-xl px-4 py-2 text-amber-400 text-sm font-bold flex items-center gap-2">
                    ⚡ +50 XP kazandın!
                </div>
            )}

            <div ref={commentsRef}>
                {selectedEpisode && <CommentSection episodeId={selectedEpisode.id} />}
            </div>
        </div>

        {/* Sidebar (Episode List) */}
        <div className="lg:col-span-1">
            <div className="bg-[#18181b] rounded-xl border border-gray-800 p-0 overflow-hidden lg:sticky lg:top-24">
                <div className="p-3 sm:p-4 border-b border-gray-800 bg-gray-900/50">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <List className="text-amber-500" size={18} /> Bölümler ({anime.episodes.length})
                    </h3>
                </div>
                <div className="max-h-64 sm:max-h-80 lg:max-h-[600px] overflow-y-auto custom-scrollbar">
                    {[...anime.episodes].sort((a, b) => a.number - b.number).map((ep) => (
                        <button
                            key={ep.id}
                            onClick={() => {
                              setSelectedEpisode(ep);
                              const sources = ep.sources && ep.sources.length > 0 ? ep.sources : [{ name: 'Varsayılan', url: ep.videoUrl }];
                              setSelectedSource(sources[0]);
                              navigate(`/anime/${id}/watch?ep=${ep.id}`, { replace: true });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`w-full text-left p-3 sm:p-4 border-b border-gray-800/50 hover:bg-gray-800 transition-colors flex items-center gap-3 group ${selectedEpisode?.id === ep.id ? 'bg-gray-800 border-l-4 border-l-amber-500' : ''}`}
                        >
                            {ep.thumbnail ? (
                              <img src={ep.thumbnail} className="w-16 h-10 sm:w-14 sm:h-9 object-cover rounded flex-shrink-0" />
                            ) : (
                              <span className="text-xl font-black text-gray-700 group-hover:text-gray-500 w-8 flex-shrink-0 text-center">{ep.number}</span>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-gray-200 group-hover:text-white line-clamp-1">{ep.number}. {ep.title}</div>
                                {ep.fansub && <div className="text-xs text-amber-500">{ep.fansub}</div>}
                                {ep.sources && ep.sources.length > 1 && (
                                  <div className="text-xs text-gray-500">{ep.sources.length} oynatıcı</div>
                                )}
                            </div>
                            {selectedEpisode?.id === ep.id && <PlayCircle className="text-amber-500 flex-shrink-0" size={18} />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* List Modal */}
      {showListModal && anime && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={e => e.target === e.currentTarget && setShowListModal(false)}>
          <div className="bg-[#18181b] border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="font-bold text-white">Listelerim</h3>
              <button onClick={() => setShowListModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {userLists.length === 0 ? (
                <p className="p-5 text-sm text-gray-500 text-center">Henüz liste yok.</p>
              ) : userLists.map(list => {
                const inList = list.animeIds.includes(anime.id);
                const isDefault = list.id.includes('default');
                return (
                  <div key={list.id} className="flex items-center gap-2 px-4 py-3 hover:bg-gray-800/50 border-b border-gray-800/50 group">
                    <button onClick={() => handleToggleAnimeInList(list.id, anime.id)} className="flex-1 flex items-center gap-3 text-sm text-left font-medium">
                      <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${inList ? 'bg-green-600 border-green-500' : 'border-gray-600'}`}>
                        {inList && <Check size={12} />}
                      </span>
                      <span className={`truncate ${inList ? 'text-green-400' : 'text-gray-200'}`}>{list.name}</span>
                    </button>
                    <button onClick={() => handleToggleListVisibility(list.id, list.isPublic)} className="text-gray-500 hover:text-gray-200 transition-colors min-w-[28px] flex justify-center" title={list.isPublic ? 'Herkese Açık' : 'Gizli'}>
                      {list.isPublic ? <Globe size={15} /> : <Lock size={15} />}
                    </button>
                    {!isDefault && (
                      <button onClick={() => handleDeleteList(list.id)} className="text-gray-700 hover:text-red-500 transition-colors min-w-[28px] flex justify-center">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="p-4 border-t border-gray-800">
              <p className="text-xs text-gray-500 font-bold uppercase mb-2">Yeni Liste Oluştur</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Liste adı..."
                  value={newListName}
                  onChange={e => setNewListName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreateList()}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
                <button onClick={handleCreateList} disabled={creatingList || !newListName.trim()} className="px-4 py-2 bg-amber-500 text-black font-bold rounded-lg text-sm hover:bg-amber-400 disabled:opacity-40 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating / Anime Entry Modal */}
      {showRatingModal && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={e => e.target === e.currentTarget && setShowRatingModal(false)}>
              <div className="bg-[#18181b] border border-gray-800 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">{anime?.title}</h3>
                      <button onClick={() => setShowRatingModal(false)} className="text-gray-500 hover:text-white"><X size={20} /></button>
                  </div>

                  {/* Status */}
                  <div className="grid grid-cols-3 gap-2">
                      {[
                          { value: AnimeWatchStatus.WATCHING, label: 'İzliyorum', color: 'blue' },
                          { value: AnimeWatchStatus.COMPLETED, label: 'Bitti', color: 'green' },
                          { value: AnimeWatchStatus.PLAN_TO_WATCH, label: 'Daha Sonra', color: 'gray' },
                      ].map(s => (
                          <button
                              key={s.value}
                              onClick={() => setRatingForm(p => ({ ...p, status: s.value }))}
                              className={`py-2 px-3 rounded-lg text-sm font-bold border transition-all ${
                                  ratingForm.status === s.value
                                      ? s.value === AnimeWatchStatus.COMPLETED ? 'bg-green-600 border-green-500 text-white'
                                      : s.value === AnimeWatchStatus.WATCHING ? 'bg-blue-600 border-blue-500 text-white'
                                      : 'bg-gray-600 border-gray-500 text-white'
                                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
                              }`}
                          >
                              {s.label}
                          </button>
                      ))}
                  </div>

                  {/* Star Rating */}
                  <div>
                      <p className="text-xs text-gray-500 font-bold uppercase mb-2">Puan {ratingForm.rating > 0 ? `· ${ratingForm.rating}/10` : ''}</p>
                      <div className="flex gap-1">
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                              <button
                                  key={n}
                                  onClick={() => setRatingForm(p => ({ ...p, rating: p.rating === n ? 0 : n }))}
                                  className={`flex-1 h-8 rounded text-xs font-bold transition-all ${
                                      ratingForm.rating >= n ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                                  }`}
                              >
                                  {n}
                              </button>
                          ))}
                      </div>
                  </div>

                  {/* Review */}
                  <div>
                      <p className="text-xs text-gray-500 font-bold uppercase mb-2">Yorum (Opsiyonel)</p>
                      <textarea
                          className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-amber-500 focus:outline-none resize-none"
                          rows={3}
                          placeholder="Bu anime hakkında ne düşünüyorsunuz?"
                          value={ratingForm.review}
                          onChange={e => setRatingForm(p => ({ ...p, review: e.target.value }))}
                      />
                  </div>

                  <button
                      onClick={handleSaveEntry}
                      className="w-full py-3 bg-amber-500 text-black font-bold rounded-xl hover:bg-amber-400 transition-colors"
                  >
                      Kaydet
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default AnimeDetail;
