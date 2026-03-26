import React, { useState, useEffect, useRef } from 'react';
import { NewsItem } from '../types';
import { ChevronLeft, ChevronRight, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NewsSliderProps {
  news: NewsItem[];
}

const NewsSlider: React.FC<NewsSliderProps> = ({ news }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  // Auto-slide effect
  useEffect(() => {
    const interval = setInterval(() => {
       handleNext();
    }, 6000); // 6 seconds
    return () => clearInterval(interval);
  }, [currentIndex, news.length]);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? news.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === news.length - 1 ? 0 : prev + 1));
  };

  // Touch handlers for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
      setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
      if (touchStart - touchEnd > 75) {
          handleNext();
      }
      if (touchStart - touchEnd < -75) {
          handlePrev();
      }
  };

  if (news.length === 0) return null;

  return (
    <div className="relative w-full h-[60vh] md:h-[75vh] overflow-hidden bg-black group"
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}
    >
        {/* Slides */}
        {news.map((item, index) => (
            <div 
                key={item.id}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
            >
                <div className="absolute inset-0 bg-black/40 z-10"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f10] via-transparent to-transparent z-20"></div>
                
                <img 
                    src={item.image} 
                    alt={item.title} 
                    className="w-full h-full object-cover object-top"
                />

                <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 lg:p-20 z-30 pb-20 md:pb-28">
                    <span className="inline-block bg-amber-500 text-black font-bold text-xs px-2 py-1 rounded mb-4 uppercase tracking-wider">
                        {item.category}
                    </span>
                    <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight max-w-4xl drop-shadow-lg">
                        {item.title}
                    </h2>
                    <p className="text-gray-200 text-sm md:text-lg mb-6 max-w-2xl line-clamp-2 drop-shadow-md">
                        {item.excerpt}
                    </p>
                    <Link to={`/news/${item.id}`}>
                        <button className="bg-white text-black px-6 py-3 rounded font-bold hover:bg-gray-200 transition-colors flex items-center gap-2">
                            <Newspaper size={18} /> Haberi Oku
                        </button>
                    </Link>
                </div>
            </div>
        ))}

        {/* Indicators */}
        <div className="absolute bottom-8 left-6 md:left-12 flex gap-2 z-40">
            {news.map((_, idx) => (
                <button 
                    key={idx}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-8 bg-amber-500' : 'w-2 bg-gray-600 hover:bg-gray-400'}`}
                />
            ))}
        </div>

        {/* Navigation Arrows (Desktop) */}
        <button 
            onClick={handlePrev}
            className="absolute top-1/2 left-4 -translate-y-1/2 z-40 bg-black/50 p-3 rounded-full text-white hover:bg-amber-500 hover:text-black transition-all hidden md:flex opacity-0 group-hover:opacity-100"
        >
            <ChevronLeft size={24} />
        </button>
        <button 
            onClick={handleNext}
            className="absolute top-1/2 right-4 -translate-y-1/2 z-40 bg-black/50 p-3 rounded-full text-white hover:bg-amber-500 hover:text-black transition-all hidden md:flex opacity-0 group-hover:opacity-100"
        >
            <ChevronRight size={24} />
        </button>
    </div>
  );
};

export default NewsSlider;