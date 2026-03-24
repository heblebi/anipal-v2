import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getAnimeById, toggleLikeEpisode, toggleWatchlist, rateAnime, markEpisodeWatched } from '../services/mockBackend';
import { useAuth } from '../context/AuthContext';
import { Anime, Episode } from '../types';
import VideoPlayer from '../components/VideoPlayer';
import CommentSection from '../components/CommentSection';
import { PlayCircle, List, Heart, MessageSquare, Plus, Check, Star, Share2, CheckCircle2 } from 'lucide-react';
import Button from '../components/Button';

const AnimeDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [anime, setAnime] = useState<Anime | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  
  // Interaction States
  const [isLiked, setIsLiked] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [userRating, setUserRating] = useState<number>(0);
  const [showRating, setShowRating] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  
  const commentsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchAnime = async () => {
      if (id) {
        const data = await getAnimeById(id);
        if (data) {
          setAnime(data);
          if (data.episodes.length > 0) setSelectedEpisode(data.episodes[0]);
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

  const handleWatchlist = async () => {
      if (!isAuthenticated || !user || !anime) return navigate('/login');
      const newState = await toggleWatchlist(user.id, anime.id);
      setInWatchlist(!newState);
  };

  const handleRate = async (score: number) => {
      if (!isAuthenticated || !user || !anime) return navigate('/login');
      await rateAnime(anime.id, score);
      setUserRating(score);
      setShowRating(false);
      const updated = await getAnimeById(anime.id);
      if(updated) setAnime(updated);
  };

  const handleMarkWatched = async () => {
      if (!isAuthenticated || !user || !selectedEpisode) return navigate('/login');
      // Optimistic UI
      setIsWatched(true);
      await markEpisodeWatched(user.id, selectedEpisode.id);
  };

  if (loading) return <div className="text-center p-10 text-amber-500">Yükleniyor...</div>;
  if (!anime) return <div className="text-center p-10 text-red-500">Anime bulunamadı</div>;

  return (
    <div className="animate-in fade-in duration-500 bg-[#0f0f10] min-h-screen">
      
      {/* Detail Hero Backdrop */}
      <div className="relative w-full h-[50vh] overflow-hidden">
          <img src={anime.bannerImage || anime.coverImage} className="w-full h-full object-cover opacity-50 blur-sm mask-image-bottom" alt="" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f10] to-transparent"></div>
          
          <div className="absolute bottom-0 left-0 w-full p-4 md:p-12 max-w-7xl mx-auto flex flex-col md:flex-row items-end gap-8 z-10">
              {/* Cover Art */}
              <div className="hidden md:block w-48 rounded-lg overflow-hidden shadow-2xl border-2 border-gray-800">
                  <img src={anime.coverImage} className="w-full h-full object-cover" alt={anime.title} />
              </div>
              
              {/* Info */}
              <div className="flex-1 mb-4">
                  <h1 className="text-4xl md:text-5xl font-black text-white mb-2">{anime.title}</h1>
                  <div className="flex items-center gap-4 text-sm font-bold text-gray-300 mb-4">
                      <span className="text-amber-500 flex items-center gap-1">
                          <Star fill="currentColor" size={16} /> {anime.averageRating || 'N/A'}
                      </span>
                      <span>{anime.episodes.length} Bölüm</span>
                      <div className="flex gap-2">
                          {anime.genres.map(g => <span key={g} className="bg-gray-800 px-2 py-0.5 rounded text-xs border border-gray-700">{g}</span>)}
                      </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex gap-3 relative">
                      <button 
                        onClick={handleWatchlist}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all ${inWatchlist ? 'bg-green-600 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'}`}
                      >
                          {inWatchlist ? <Check size={20} /> : <Plus size={20} />}
                          {inWatchlist ? 'Listemde' : 'Listeme Ekle'}
                      </button>
                      
                      {/* Rating Dropdown */}
                      <div className="relative">
                          <button 
                            onClick={() => setShowRating(!showRating)}
                            className="bg-amber-500/20 text-amber-500 p-3 rounded-full hover:bg-amber-500 hover:text-black transition-colors border border-amber-500/50"
                          >
                             <Star size={20} />
                          </button>
                          
                          {showRating && (
                             <div className="absolute bottom-full left-0 mb-4 bg-gray-900 border border-gray-700 p-3 rounded-lg gap-1 shadow-2xl flex flex-wrap w-64 z-50 animate-in slide-in-from-bottom-2">
                                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                      <button 
                                        key={n} 
                                        onClick={() => handleRate(n)} 
                                        className={`w-8 h-8 flex items-center justify-center text-sm font-bold rounded hover:bg-amber-500 hover:text-black transition-colors ${userRating === n ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400'}`}
                                      >
                                          {n}
                                      </button>
                                  ))}
                             </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-12 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content (Player) */}
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800">
                {selectedEpisode ? (
                <VideoPlayer 
                    key={selectedEpisode.id} 
                    embedUrl={selectedEpisode.videoUrl} 
                    poster={anime.bannerImage || anime.coverImage} 
                />
                ) : (
                    <div className="aspect-video flex items-center justify-center bg-gray-900 text-gray-500">
                        <p>Bölüm seçilmedi.</p>
                    </div>
                )}
            </div>

            {selectedEpisode && (
                <div className="bg-[#18181b] p-4 rounded-xl border border-gray-800 flex flex-wrap justify-between items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white">{selectedEpisode.number}. Bölüm: {selectedEpisode.title}</h2>
                        {selectedEpisode.fansub && <span className="text-xs text-amber-500 font-medium">Fansub: {selectedEpisode.fansub}</span>}
                    </div>
                    
                    <div className="flex gap-2">
                        {/* Watch Button (XP Trigger) */}
                        <Button 
                             onClick={handleMarkWatched}
                             variant="secondary"
                             className={`flex items-center gap-2 ${isWatched ? 'text-green-500 border-green-900 bg-green-900/10' : ''}`}
                             disabled={isWatched}
                        >
                            <CheckCircle2 size={18} />
                            {isWatched ? 'İzlendi (+50 XP)' : 'İzlendi İşaretle'}
                        </Button>

                        <Button variant="ghost" onClick={() => commentsRef.current?.scrollIntoView({behavior:'smooth'})} className="gap-2">
                            <MessageSquare size={18} /> Yorumlar
                        </Button>
                    </div>
                </div>
            )}

            <div className="bg-[#18181b] p-6 rounded-xl border border-gray-800">
                <h3 className="font-bold text-lg mb-2">Özet</h3>
                <p className="text-gray-400 leading-relaxed text-sm">{anime.description}</p>
            </div>

            <div ref={commentsRef}>
                {selectedEpisode && <CommentSection episodeId={selectedEpisode.id} />}
            </div>
        </div>

        {/* Sidebar (Episode List) */}
        <div className="lg:col-span-1">
            <div className="bg-[#18181b] rounded-xl border border-gray-800 p-0 overflow-hidden sticky top-24">
                <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <List className="text-amber-500" size={18} /> Bölümler
                    </h3>
                </div>
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                    {anime.episodes.map((ep) => (
                        <button
                            key={ep.id}
                            onClick={() => setSelectedEpisode(ep)}
                            className={`w-full text-left p-4 border-b border-gray-800/50 hover:bg-gray-800 transition-colors flex items-center gap-3 group ${selectedEpisode?.id === ep.id ? 'bg-gray-800 border-l-4 border-l-amber-500' : ''}`}
                        >
                            <span className="text-2xl font-black text-gray-700 group-hover:text-gray-500 w-8">{ep.number}</span>
                            <div className="flex-1">
                                <div className="text-sm font-bold text-gray-200 group-hover:text-white line-clamp-1">{ep.title}</div>
                                <div className="text-xs text-gray-500">24dk</div>
                            </div>
                            {selectedEpisode?.id === ep.id && <PlayCircle className="text-amber-500" size={20} />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AnimeDetail;