import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getAnimeById, saveAnimeEntry, getAnimeEntry,
  getUserLists, createUserList, addAnimeToList, removeAnimeFromList, updateListVisibility, deleteUserList
} from '../services/mockBackend';
import { useAuth } from '../context/AuthContext';
import { Anime, AnimeWatchStatus, UserList } from '../types';
import CommentSection from '../components/CommentSection';
import {
  PlayCircle, Star, List, Plus, Check, X, Globe, Lock, Trash2
} from 'lucide-react';

const AnimePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSeason, setSelectedSeason] = useState<number>(1);

  // Anime entry / rating
  const [animeEntry, setAnimeEntry] = useState<{ status: string; rating: number; review: string } | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingForm, setRatingForm] = useState({ status: AnimeWatchStatus.WATCHING, rating: 0, review: '' });

  // Lists
  const [userLists, setUserLists] = useState<UserList[]>([]);
  const [showListModal, setShowListModal] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);

  useEffect(() => {
    if (id) {
      getAnimeById(id).then(data => {
        setAnime(data || null);
        setLoading(false);
      });
    }
  }, [id]);

  useEffect(() => {
    if (user && id) {
      getAnimeEntry(user.id, id).then(entry => {
        if (entry) {
          setAnimeEntry({ status: entry.status, rating: entry.rating || 0, review: entry.review || '' });
          setRatingForm({ status: entry.status as AnimeWatchStatus, rating: entry.rating || 0, review: entry.review || '' });
        }
      });
      getUserLists(user.id).then(setUserLists);
    }
  }, [user, id]);

const handleSaveEntry = async () => {
    if (!user || !anime) return;
    await saveAnimeEntry(user.id, anime.id, ratingForm);
    setAnimeEntry(ratingForm);
    setShowRatingModal(false);
  };

  const handleToggleAnimeInList = async (listId: string, animeId: string) => {
    if (!user) return navigate('/login');
    const list = userLists.find(l => l.id === listId);
    if (!list) return;
    if (list.animeIds.includes(animeId)) {
      await removeAnimeFromList(user.id, listId, animeId);
    } else {
      await addAnimeToList(user.id, listId, animeId);
    }
    const updated = await getUserLists(user.id);
    setUserLists(updated);
  };

  const handleCreateList = async () => {
    if (!user || !newListName.trim()) return;
    setCreatingList(true);
    await createUserList(user.id, newListName.trim(), true);
    setNewListName('');
    const updated = await getUserLists(user.id);
    setUserLists(updated);
    setCreatingList(false);
  };

  const handleDeleteList = async (listId: string) => {
    if (!user) return;
    // Don't allow deleting the default list
    const list = userLists.find(l => l.id === listId);
    if (!list || list.id.includes('default')) return;
    await deleteUserList(user.id, listId);
    const updated = await getUserLists(user.id);
    setUserLists(updated);
  };

  const handleToggleListVisibility = async (listId: string, current: boolean) => {
    if (!user) return;
    await updateListVisibility(user.id, listId, !current);
    const updated = await getUserLists(user.id);
    setUserLists(updated);
  };

  const isInAnyList = anime ? userLists.some(l => l.animeIds.includes(anime.id)) : false;

  if (loading) return <div className="text-center p-10 text-amber-500">Yükleniyor...</div>;
  if (!anime) return <div className="text-center p-10 text-red-500">Anime bulunamadı</div>;

  const sortedEps = [...anime.episodes].sort((a, b) => a.number - b.number);
  const firstEpId = sortedEps.length > 0 ? sortedEps[0].id : null;
  const lastSeenEpId = user && id ? localStorage.getItem(`last_ep_${user.id}_${id}`) : null;
  const watchEpId = lastSeenEpId && sortedEps.find(e => e.id === lastSeenEpId) ? lastSeenEpId : firstEpId;
  // Initialize season from last seen ep (or first ep)
  React.useEffect(() => {
    const ep = sortedEps.find(e => e.id === watchEpId);
    if (ep) setSelectedSeason(ep.season || 1);
  }, [anime.id]);

  return (
    <div className="animate-in fade-in duration-500 bg-[#0f0f10] min-h-screen">

      {/* Hero Banner */}
      <div className="relative w-full h-[38vh] sm:h-[45vh] md:h-[52vh] overflow-hidden">
        <img
          src={anime.bannerImage || anime.coverImage}
          className="w-full h-full object-cover opacity-40 blur-sm scale-105"
          alt=""
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f10] via-[#0f0f10]/50 to-transparent" />

        <div className="absolute bottom-0 left-0 w-full px-4 pb-5 md:px-12 md:pb-10 max-w-7xl mx-auto flex items-end gap-5 z-10">
          {/* Cover */}
          <div className="hidden sm:block w-28 md:w-44 flex-shrink-0 rounded-xl overflow-hidden shadow-2xl border-2 border-gray-700 self-end">
            <img src={anime.coverImage} className="w-full h-full object-cover" alt={anime.title} />
          </div>

          <div className="flex-1 min-w-0 pb-1">
            <h1 className="text-xl sm:text-3xl md:text-5xl font-black text-white mb-1 md:mb-2 leading-tight drop-shadow-lg">
              {anime.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs sm:text-sm font-bold text-gray-300 mb-3">
              <span className="text-amber-500 flex items-center gap-1">
                <Star fill="currentColor" size={14} /> {anime.averageRating || 'N/A'}
              </span>
              <span>{anime.episodes.length} Bölüm</span>
              <div className="flex flex-wrap gap-1">
                {anime.genres.slice(0, 4).map(g => (
                  <span key={g} className="bg-gray-800/80 px-2 py-0.5 rounded text-xs border border-gray-700">{g}</span>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap items-center">
              {/* Watch button */}
              <button
                onClick={() => watchEpId ? navigate(`/anime/${anime.id}/watch?ep=${watchEpId}`) : null}
                disabled={!watchEpId}
                className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-full text-sm transition-all shadow-lg shadow-amber-500/20 disabled:opacity-40"
              >
                <PlayCircle size={18} /> {lastSeenEpId && sortedEps.find(e => e.id === lastSeenEpId) ? 'Devam Et' : 'İzle'}
              </button>

              {/* Add to list button */}
              <button
                onClick={() => isAuthenticated ? setShowListModal(true) : navigate('/login')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm transition-all border ${
                  isInAnyList
                    ? 'bg-green-600/20 text-green-400 border-green-800 hover:bg-green-600/30'
                    : 'bg-gray-800/90 text-white border-gray-700 hover:bg-gray-700'
                }`}
              >
                {isInAnyList ? <Check size={16} /> : <Plus size={16} />}
                Listeye Ekle
              </button>

              {/* Rate button */}
              <button
                onClick={() => isAuthenticated ? setShowRatingModal(true) : navigate('/login')}
                className="bg-gray-800/90 text-white rounded-full hover:bg-gray-700 transition-colors border border-gray-700 flex items-center gap-2 px-4 py-2.5 text-sm font-bold"
              >
                <Star size={14} className={animeEntry?.rating ? 'text-amber-500 fill-amber-500' : ''} />
                {animeEntry ? (
                  <span className="text-amber-500">
                    {animeEntry.status === AnimeWatchStatus.COMPLETED ? 'Bitti' :
                      animeEntry.status === AnimeWatchStatus.WATCHING ? 'İzliyorum' : 'Daha Sonra'}
                    {animeEntry.rating ? ` · ${animeEntry.rating}/10` : ''}
                  </span>
                ) : 'Değerlendir'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-12 py-4 md:py-8 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-8">

        {/* Left: Description + Comments */}
        <div className="lg:col-span-2 space-y-6">

          {/* Description */}
          <div className="bg-[#18181b] p-5 rounded-xl border border-gray-800">
            <h2 className="font-black text-lg mb-3 text-white flex items-center gap-2">
              <span className="w-1 h-5 bg-amber-500 rounded-full inline-block" />
              Anime Hakkında
            </h2>
            <p className="text-gray-300 leading-relaxed text-sm">{anime.description.replace(/\s*\(Kaynak:[^)]*\)/gi, '').trim()}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {anime.genres.map(g => (
                <span key={g} className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-xs border border-gray-700">{g}</span>
              ))}
            </div>
          </div>

          {/* Stats row */}
          {!!(anime.averageRating || anime.ratingsCount) && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {anime.averageRating ? (
                <div className="bg-[#18181b] border border-gray-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-amber-500">{anime.averageRating}</div>
                  <div className="text-xs text-gray-500 mt-1">Ortalama Puan</div>
                </div>
              ) : null}
              <div className="bg-[#18181b] border border-gray-800 rounded-xl p-4 text-center">
                <div className="text-2xl font-black text-white">{anime.episodes.length}</div>
                <div className="text-xs text-gray-500 mt-1">Bölüm</div>
              </div>
              {anime.ratingsCount ? (
                <div className="bg-[#18181b] border border-gray-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-black text-white">{anime.ratingsCount}</div>
                  <div className="text-xs text-gray-500 mt-1">Değerlendirme</div>
                </div>
              ) : null}
            </div>
          )}

          {/* Characters */}
          {anime.characters && anime.characters.length > 0 && (
            <div className="bg-[#18181b] p-5 rounded-xl border border-gray-800">
              <h2 className="font-black text-lg mb-4 text-white flex items-center gap-2">
                <span className="w-1 h-5 bg-amber-500 rounded-full inline-block" />
                Karakterler
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                {anime.characters.map(char => (
                  <div key={char.id} className="flex flex-col items-center gap-1.5 group">
                    <div className="w-full aspect-[3/4] rounded-lg overflow-hidden bg-gray-900 border border-gray-800 group-hover:border-amber-500/40 transition-colors">
                      {char.image ? (
                        <img
                          src={char.image}
                          alt={char.name}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-700 text-2xl">?</div>
                      )}
                    </div>
                    <p className="text-xs text-gray-300 text-center font-medium leading-tight line-clamp-2">{char.name}</p>
                    {char.role === 'MAIN' && (
                      <span className="text-[10px] text-amber-500 font-bold uppercase">Ana Karakter</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comments */}
          <div>
            <h2 className="font-black text-lg mb-3 text-white flex items-center gap-2">
              <span className="w-1 h-5 bg-amber-500 rounded-full inline-block" />
              Yorumlar
            </h2>
            <CommentSection episodeId={`anime-${anime.id}`} />
          </div>
        </div>

        {/* Right: Episode List */}
        <div className="lg:col-span-1">
          {(() => {
            const seasons = [...new Set(anime.episodes.map(e => e.season || 1))].sort((a, b) => a - b);
            const multiSeason = seasons.length > 1;
            const filteredEps = [...anime.episodes].filter(e => (e.season || 1) === selectedSeason).sort((a, b) => a.number - b.number);
            return (
              <div className="bg-[#18181b] rounded-xl border border-gray-800 overflow-hidden lg:sticky lg:top-24">
                <div className="p-4 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between">
                  <h3 className="font-bold text-white flex items-center gap-2">
                    <List className="text-amber-500" size={18} />
                    Bölümler ({anime.episodes.length})
                  </h3>
                </div>

                {/* Season Tabs */}
                {multiSeason && (
                  <div className="flex gap-1 p-2 border-b border-gray-800 overflow-x-auto custom-scrollbar bg-gray-900/30 flex-nowrap">
                    {seasons.map(s => (
                      <button
                        key={s}
                        onClick={() => setSelectedSeason(s)}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${selectedSeason === s ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                      >
                        {s}. Sezon
                      </button>
                    ))}
                  </div>
                )}

                <div className="max-h-[50vh] sm:max-h-[60vh] lg:max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {filteredEps.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">Henüz bölüm eklenmemiş.</div>
                  ) : (
                    filteredEps.map(ep => (
                      <Link
                        key={ep.id}
                        to={`/anime/${anime.id}/watch?ep=${ep.id}`}
                        className="flex items-center gap-3 p-3 sm:p-4 border-b border-gray-800/50 hover:bg-gray-800 transition-colors group"
                      >
                        {ep.thumbnail ? (
                          <img src={ep.thumbnail} className="w-16 h-10 object-cover rounded flex-shrink-0" alt="" />
                        ) : (
                          <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/10 transition-colors">
                            <span className="text-base font-black text-gray-600 group-hover:text-amber-500">{ep.number}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-gray-200 group-hover:text-white line-clamp-1">
                            {ep.number}. {ep.title}
                          </div>
                          {ep.fansub && <div className="text-xs text-amber-500/80">{ep.fansub}</div>}
                          {ep.sources && ep.sources.length > 1 && (
                            <div className="text-xs text-gray-600">{ep.sources.length} oynatıcı</div>
                          )}
                        </div>
                        <PlayCircle size={16} className="text-gray-700 group-hover:text-amber-500 flex-shrink-0 transition-colors" />
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* List Modal */}
      {showListModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
          onClick={e => e.target === e.currentTarget && setShowListModal(false)}
        >
          <div className="bg-[#18181b] border border-gray-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h3 className="font-bold text-white">Listelerim</h3>
              <button onClick={() => setShowListModal(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {userLists.length === 0 ? (
                <p className="p-5 text-sm text-gray-500 text-center">Henüz liste yok.</p>
              ) : userLists.map(list => {
                const inList = list.animeIds.includes(anime.id);
                const isDefault = list.id.includes('default');
                return (
                  <div key={list.id} className="flex items-center gap-2 px-4 py-3 hover:bg-gray-800/50 border-b border-gray-800/50 group">
                    <button
                      onClick={() => handleToggleAnimeInList(list.id, anime.id)}
                      className="flex-1 flex items-center gap-3 text-sm text-left font-medium"
                    >
                      <span className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        inList ? 'bg-green-600 border-green-500' : 'border-gray-600'
                      }`}>
                        {inList && <Check size={12} />}
                      </span>
                      <span className={`truncate ${inList ? 'text-green-400' : 'text-gray-200'}`}>{list.name}</span>
                    </button>
                    <button
                      onClick={() => handleToggleListVisibility(list.id, list.isPublic)}
                      className="text-gray-500 hover:text-gray-200 transition-colors min-w-[28px] flex justify-center"
                      title={list.isPublic ? 'Herkese Açık' : 'Gizli'}
                    >
                      {list.isPublic ? <Globe size={15} /> : <Lock size={15} />}
                    </button>
                    {!isDefault && (
                      <button
                        onClick={() => handleDeleteList(list.id)}
                        className="text-gray-700 hover:text-red-500 transition-colors min-w-[28px] flex justify-center"
                      >
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
                <button
                  onClick={handleCreateList}
                  disabled={creatingList || !newListName.trim()}
                  className="px-4 py-2 bg-amber-500 text-black font-bold rounded-lg text-sm hover:bg-amber-400 disabled:opacity-40 transition-colors"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRatingModal && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={e => e.target === e.currentTarget && setShowRatingModal(false)}
        >
          <div className="bg-[#18181b] border border-gray-800 rounded-2xl p-6 w-full max-w-md space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{anime.title}</h3>
              <button onClick={() => setShowRatingModal(false)} className="text-gray-500 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { value: AnimeWatchStatus.WATCHING, label: 'İzliyorum' },
                { value: AnimeWatchStatus.COMPLETED, label: 'Bitti' },
                { value: AnimeWatchStatus.PLAN_TO_WATCH, label: 'Daha Sonra' },
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

            <div>
              <p className="text-xs text-gray-500 font-bold uppercase mb-2">
                Puan {ratingForm.rating > 0 ? `· ${ratingForm.rating}/10` : ''}
              </p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
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

export default AnimePage;
