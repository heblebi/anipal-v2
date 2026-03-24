import React from 'react';
import { Anime } from '../types';
import { Link } from 'react-router-dom';
import { Play, Info } from 'lucide-react';

interface HeroSectionProps {
  anime: Anime;
}

const HeroSection: React.FC<HeroSectionProps> = ({ anime }) => {
  return (
    <div className="relative w-full h-[70vh] md:h-[85vh] overflow-hidden group">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src={anime.bannerImage || anime.coverImage} 
          alt={anime.title} 
          className="w-full h-full object-cover object-center"
        />
        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f10] via-[#0f0f10]/40 to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f10] via-[#0f0f10]/60 to-transparent"></div>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 lg:p-20 z-10 flex flex-col justify-end h-full max-w-4xl pb-24 md:pb-32">
         {/* Title */}
         <h1 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight drop-shadow-xl animate-in fade-in slide-in-from-bottom-5 duration-700">
           {anime.title}
         </h1>

         {/* Meta Tags */}
         <div className="flex items-center gap-3 text-sm font-medium text-gray-300 mb-6">
            <span className="text-green-400 font-bold">%98 Eşleşme</span>
            <span>2024</span>
            <span className="border border-gray-600 px-1 rounded text-xs">18+</span>
            <span>{anime.episodes.length} Bölüm</span>
            <span className="bg-amber-500 text-black px-2 py-0.5 rounded text-xs font-bold">HD</span>
         </div>

         {/* Description */}
         <p className="text-gray-200 text-sm md:text-lg mb-8 line-clamp-3 md:line-clamp-4 max-w-2xl drop-shadow-md">
            {anime.description}
         </p>

         {/* Buttons */}
         <div className="flex items-center gap-4">
            <Link 
              to={`/anime/${anime.id}`}
              className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded hover:bg-white/90 font-bold text-lg transition-transform hover:scale-105"
            >
               <Play fill="black" size={24} /> Oynat
            </Link>
            <Link 
              to={`/anime/${anime.id}`}
              className="flex items-center gap-2 bg-gray-500/40 backdrop-blur-md text-white px-8 py-3 rounded hover:bg-gray-500/60 font-bold text-lg transition-transform hover:scale-105"
            >
               <Info size={24} /> Daha Fazla Bilgi
            </Link>
         </div>
      </div>
    </div>
  );
};

export default HeroSection;