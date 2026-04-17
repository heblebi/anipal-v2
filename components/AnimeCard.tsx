import React from 'react';
import { Anime } from '../types';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

interface AnimeCardProps {
  anime: Anime;
  variant?: 'portrait' | 'landscape';
  to?: string;
  continueLabel?: string;
}

const AnimeCard: React.FC<AnimeCardProps> = ({ anime, variant = 'portrait', to, continueLabel }) => {
  const isLandscape = variant === 'landscape';

  return (
    <Link
      to={to || `/anime/${anime.id}`}
      className={`group relative block flex-shrink-0 transition-all duration-300 hover:z-20 hover:scale-110 ${isLandscape ? 'w-64 md:w-80' : 'w-36 md:w-48'}`}
    >
      <div className={`relative overflow-hidden rounded-md bg-[#18181b] shadow-lg ${isLandscape ? 'aspect-video' : 'aspect-[2/3]'}`}>
        <img 
          src={isLandscape ? (anime.bannerImage || anime.coverImage) : anime.coverImage} 
          alt={anime.title} 
          className="h-full w-full object-cover transition-opacity duration-300 group-hover:opacity-80"
        />
        
        {/* Rating Badge */}
        {anime.averageRating && (
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur text-amber-400 text-xs font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                <Star size={10} fill="currentColor" /> {anime.averageRating}
            </div>
        )}

        {/* Play Icon Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/20 backdrop-blur-sm p-3 rounded-full border border-white/50">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </div>
        </div>
      </div>

      <div className="mt-2 opacity-100 group-hover:opacity-100 transition-opacity">
        <h3 className="text-sm font-bold text-gray-200 truncate group-hover:text-white">{anime.title}</h3>
        <div className="flex items-center gap-2 text-[10px] text-gray-400">
          {continueLabel ? (
            <span className="text-amber-400 font-semibold">{continueLabel}</span>
          ) : (
            <>
              <span>{anime.genres[0]}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span>{anime.episodes.length} Bölüm</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
};

export default AnimeCard;