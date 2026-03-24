import React, { useState, useEffect } from 'react';
import { getNews } from '../services/mockBackend';
import { NewsItem } from '../types';
import { Newspaper, Calendar } from 'lucide-react';

const NewsPage = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNews = async () => {
        const data = await getNews();
        setNews(data);
        setLoading(false);
    };
    fetchNews();
  }, []);

  if (loading) return <div className="text-center pt-32 text-amber-500">Yükleniyor...</div>;

  return (
    <div className="pt-24 px-4 pb-20 max-w-7xl mx-auto min-h-screen">
       <div className="mb-10 border-b border-gray-800 pb-4">
           <h1 className="text-4xl font-black text-white flex items-center gap-3 mb-2">
               <Newspaper className="text-amber-500" size={32} /> Anime Haberleri
           </h1>
           <p className="text-gray-400">Anime dünyasından son gelişmeler, duyurular ve güncellemeler.</p>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {news.map(item => (
               <article key={item.id} className="bg-[#18181b] rounded-xl overflow-hidden border border-gray-800 hover:border-gray-600 transition-all group">
                   <div className="h-48 overflow-hidden relative">
                       <img 
                         src={item.image} 
                         alt={item.title} 
                         className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                       />
                       <div className="absolute top-4 left-4 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded shadow">
                           {item.category}
                       </div>
                   </div>
                   <div className="p-6">
                       <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                           <Calendar size={12} />
                           {new Date(item.createdAt).toLocaleDateString()}
                       </div>
                       <h2 className="text-xl font-bold text-white mb-3 line-clamp-2 group-hover:text-amber-500 transition-colors">
                           {item.title}
                       </h2>
                       <p className="text-sm text-gray-400 mb-4 line-clamp-3">
                           {item.excerpt}
                       </p>
                       <button className="text-sm font-bold text-amber-500 hover:text-amber-400 flex items-center gap-1">
                           Devamını Oku &rarr;
                       </button>
                   </div>
               </article>
           ))}
       </div>
    </div>
  );
};

export default NewsPage;