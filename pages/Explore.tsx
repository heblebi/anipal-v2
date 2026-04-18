import React, { useState, useEffect } from 'react';
import { getAnimes } from '../services/mockBackend';
import { Anime } from '../types';
import AnimeCard from '../components/AnimeCard';
import { Filter, Search, ChevronDown, X } from 'lucide-react';

const GENRES = [
  "Aksiyon", "Macera", "Bilim Kurgu", "Dram", "Komedi", "Fantastik",
  "Romantizm", "Korku", "Spor", "Müzik", "Isekai", "Psikolojik",
  "Gizem", "Doğaüstü", "Günlük Yaşam", "Shōnen", "Seinen", "Shōjo",
  "Büyü", "Robot", "Samuray", "Tarihi", "Okul", "Gerilim",
];

type SortOption = 'newest' | 'oldest' | 'rating' | 'episodes';
type EpRange = 'all' | 'short' | 'medium' | 'long';

const Explore = () => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [filteredAnimes, setFilteredAnimes] = useState<Anime[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [epRange, setEpRange] = useState<EpRange>('all');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    getAnimes().then(data => {
      setAnimes(data);
      setFilteredAnimes(data);
    });
  }, []);

  useEffect(() => {
    let result = [...animes];

    // Genre filter (multi-select AND logic)
    if (selectedGenres.length > 0) {
      result = result.filter(a => selectedGenres.every(g => a.genres.includes(g)));
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(q) ||
        (a.alternativeTitles || []).some(t => t.toLowerCase().includes(q))
      );
    }

    // Episode range
    if (epRange === 'short') result = result.filter(a => a.episodes.length <= 12);
    if (epRange === 'medium') result = result.filter(a => a.episodes.length >= 13 && a.episodes.length <= 26);
    if (epRange === 'long') result = result.filter(a => a.episodes.length >= 27);

    // Sort
    if (sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (sortBy === 'oldest') result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (sortBy === 'rating') result.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    if (sortBy === 'episodes') result.sort((a, b) => b.episodes.length - a.episodes.length);

    setFilteredAnimes(result);
  }, [selectedGenres, search, sortBy, epRange, animes]);

  const toggleGenre = (g: string) => {
    setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  };

  const clearAll = () => {
    setSelectedGenres([]);
    setSearch('');
    setSortBy('newest');
    setEpRange('all');
  };

  const hasActiveFilters = selectedGenres.length > 0 || sortBy !== 'newest' || epRange !== 'all';

  return (
    <div className="pt-20 sm:pt-24 px-3 sm:px-4 max-w-7xl mx-auto pb-20 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Keşfet</h1>
          <p className="text-gray-400 text-sm mt-0.5">Yeni favori animeni bul.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input
              type="text"
              placeholder="Anime ara..."
              className="w-full bg-gray-900 border border-gray-700 rounded-full py-2.5 pl-10 pr-4 text-white focus:border-amber-500 focus:outline-none text-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold border transition-colors ${showFilters || hasActiveFilters ? 'bg-amber-500 text-black border-amber-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-500'}`}
          >
            <Filter size={15} />
            Filtrele
            {hasActiveFilters && <span className="bg-black/30 text-xs rounded-full px-1.5 py-0.5">{selectedGenres.length + (sortBy !== 'newest' ? 1 : 0) + (epRange !== 'all' ? 1 : 0)}</span>}
            <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-[#18181b] border border-gray-800 rounded-2xl p-4 mb-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold text-sm">Gelişmiş Filtreler</h3>
            {hasActiveFilters && (
              <button onClick={clearAll} className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1">
                <X size={12} /> Temizle
              </button>
            )}
          </div>

          {/* Sort */}
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold mb-2">Sırala</p>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'newest', label: 'En Yeni' },
                { value: 'oldest', label: 'En Eski' },
                { value: 'rating', label: 'En Yüksek Puan' },
                { value: 'episodes', label: 'En Çok Bölüm' },
              ] as { value: SortOption; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setSortBy(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${sortBy === opt.value ? 'bg-amber-500 text-black border-amber-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Episode Range */}
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold mb-2">Bölüm Sayısı</p>
            <div className="flex flex-wrap gap-2">
              {([
                { value: 'all', label: 'Tümü' },
                { value: 'short', label: 'Kısa (≤12)' },
                { value: 'medium', label: 'Orta (13–26)' },
                { value: 'long', label: 'Uzun (27+)' },
              ] as { value: EpRange; label: string }[]).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setEpRange(opt.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${epRange === opt.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Genres */}
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold mb-2">
              Türler
              {selectedGenres.length > 0 && <span className="ml-1 text-amber-500">({selectedGenres.length} seçili)</span>}
            </p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(g => (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${selectedGenres.includes(g) ? 'bg-amber-500 text-black border-amber-500' : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active genre chips (quick remove) */}
      {selectedGenres.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedGenres.map(g => (
            <button
              key={g}
              onClick={() => toggleGenre(g)}
              className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full text-xs font-bold hover:bg-amber-500/30 transition-colors"
            >
              {g} <X size={11} />
            </button>
          ))}
          <button onClick={() => setSelectedGenres([])} className="px-3 py-1 bg-gray-800 text-gray-500 border border-gray-700 rounded-full text-xs hover:text-gray-300 transition-colors">
            Tümünü Kaldır
          </button>
        </div>
      )}

      {/* Results count */}
      <p className="text-xs text-gray-600 mb-4 font-bold uppercase">{filteredAnimes.length} anime bulundu</p>

      {/* Grid */}
      {filteredAnimes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8">
          {filteredAnimes.map(anime => (
            <div key={anime.id} className="flex justify-center">
              <AnimeCard anime={anime} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-gray-500">
          <Filter size={48} className="mx-auto mb-4 opacity-50" />
          <p>Aradığınız kriterlere uygun anime bulunamadı.</p>
          <button onClick={clearAll} className="mt-4 text-amber-500 hover:text-amber-400 text-sm font-bold">
            Filtreleri Temizle
          </button>
        </div>
      )}
    </div>
  );
};

export default Explore;
