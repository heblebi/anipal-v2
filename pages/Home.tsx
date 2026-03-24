import React, { useEffect, useState } from 'react';
import { getAnimes, getNews } from '../services/mockBackend';
import { Anime, NewsItem } from '../types';
import NewsSlider from '../components/NewsSlider';
import AnimeCard from '../components/AnimeCard';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

const Home = () => {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [animeData, newsData] = await Promise.all([getAnimes(), getNews()]);
        setAnimes(animeData);
        setNews(newsData);
      } catch (error) {
        console.error("Veriler yüklenemedi", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#0f0f10]">
        <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Derived Data for Sections
  const trendingAnimes = animes.slice(0, 5);
  const newEpisodes = [...animes].reverse().slice(0, 5);
  const recommended = animes.filter(a => a.genres.includes('Aksiyon') || a.genres.includes('Macera'));

  // Mock "Continue Watching" based on user history (mocked implementation)
  const continueWatching = user?.watchedEpisodes?.length 
    ? animes.filter(a => a.episodes.some(e => user.watchedEpisodes!.includes(e.id))) 
    : animes.slice(1, 3); // Fallback mock

  return (
    <div className="bg-[#0f0f10] min-h-screen pb-20">
      
      {/* 1. News Slider - Takes top spot as requested */}
      <NewsSlider news={news} />

      {/* Main Content Container */}
      <div className="relative z-20 space-y-12 pl-4 md:pl-12 overflow-hidden pt-8">
        
        {/* Continue Watching */}
        {user && continueWatching.length > 0 && (
          <Section title="İzlemeye Devam Et" linkTo="/history">
            {continueWatching.map(anime => (
               <AnimeCard key={anime.id} anime={anime} variant="landscape" />
            ))}
          </Section>
        )}

        {/* Recently Added */}
        <Section title="Son Eklenen Bölümler">
           {newEpisodes.map(anime => (
              <AnimeCard key={anime.id} anime={anime} />
           ))}
        </Section>

        {/* Weekly Top - Numbers removed based on request */}
        <Section title="Haftanın Animeleri - Top 10" highlight>
           {trendingAnimes.map((anime) => (
              <div key={anime.id} className="relative flex-shrink-0">
                 <AnimeCard anime={anime} />
              </div>
           ))}
        </Section>

        {/* Recommended */}
        <Section title="Sizin İçin Önerilenler">
           {recommended.map(anime => (
              <AnimeCard key={anime.id} anime={anime} />
           ))}
        </Section>

        {/* Explore CTA */}
        <div className="pr-4 md:pr-12 mt-10">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-center justify-between border border-gray-700/50">
                <div className="mb-6 md:mb-0">
                    <h3 className="text-2xl font-bold text-white mb-2">Hala ne izleyeceğini bulamadın mı?</h3>
                    <p className="text-gray-400">Binlerce anime arasından zevkine uygun olanı keşfet.</p>
                </div>
                <Link to="/explore">
                    <button className="bg-amber-500 hover:bg-amber-600 text-black px-8 py-3 rounded-full font-bold flex items-center gap-2 transition-transform hover:scale-105">
                        <Compass size={20} /> Keşfetmeye Başla
                    </button>
                </Link>
            </div>
        </div>

      </div>
    </div>
  );
};

// Reusable Scrollable Section Component
interface SectionProps {
  title: string;
  children?: React.ReactNode;
  linkTo?: string;
  highlight?: boolean;
}

const Section = ({ title, children, linkTo, highlight }: SectionProps) => (
    <div className="space-y-4">
        <div className="flex items-end justify-between pr-4 md:pr-12">
            <h2 className={`text-xl md:text-2xl font-bold ${highlight ? 'text-amber-500' : 'text-gray-100'}`}>{title}</h2>
            {linkTo && <Link to={linkTo} className="text-xs text-gray-400 hover:text-white uppercase font-bold tracking-widest">Tümünü Gör</Link>}
        </div>
        <div className="flex gap-4 overflow-x-auto pb-8 pt-4 scrollbar-hide snap-x pr-4 md:pr-12 mask-image-right">
            {children}
        </div>
    </div>
);

export default Home;