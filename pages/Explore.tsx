import React, { useState, useEffect } from 'react';
import { getAnimes } from '../services/mockBackend';
import { Anime } from '../types';
import AnimeCard from '../components/AnimeCard';
import { Filter, Search } from 'lucide-react';

const GENRES = ["Aksiyon", "Macera", "Bilim Kurgu", "Dram", "Komedi", "Fantastik", "Romantizm", "Korku", "Spor", "Müzik"];

const Explore = () => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [filteredAnimes, setFilteredAnimes] = useState<Anime[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
        const data = await getAnimes();
        setAnimes(data);
        setFilteredAnimes(data);
    };
    load();
  }, []);

  useEffect(() => {
    let result = animes;
    
    if (selectedGenre) {
        result = result.filter(a => a.genres.includes(selectedGenre));
    }

    if (search) {
        result = result.filter(a => a.title.toLowerCase().includes(search.toLowerCase()));
    }

    setFilteredAnimes(result);
  }, [selectedGenre, search, animes]);

  return (
    <div className="pt-20 px-4 max-w-7xl mx-auto pb-20 min-h-screen">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
           <div>
               <h1 className="text-3xl font-black text-white">Keşfet</h1>
               <p className="text-gray-400 text-sm mt-1">Yeni favori animeni bul.</p>
           </div>

           <div className="relative w-full md:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
               <input 
                 type="text" 
                 placeholder="Anime ara..." 
                 className="w-full bg-gray-900 border border-gray-700 rounded-full py-2 pl-10 pr-4 text-white focus:border-amber-500 focus:outline-none"
                 value={search}
                 onChange={e => setSearch(e.target.value)}
               />
           </div>
       </div>

       {/* Categories */}
       <div className="flex flex-wrap gap-2 mb-8">
           <button 
             onClick={() => setSelectedGenre(null)}
             className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${!selectedGenre ? 'bg-white text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
           >
             Tümü
           </button>
           {GENRES.map(g => (
               <button 
                 key={g}
                 onClick={() => setSelectedGenre(g)}
                 className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${selectedGenre === g ? 'bg-amber-500 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
               >
                 {g}
               </button>
           ))}
       </div>

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
           </div>
       )}
    </div>
  );
};

export default Explore;