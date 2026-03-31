import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getNewsById, grantNewsReadXP } from '../services/mockBackend';
import { useAuth } from '../context/AuthContext';
import { NewsItem } from '../types';
import { Calendar, ChevronLeft, ExternalLink } from 'lucide-react';
import CommentSection from '../components/CommentSection';

const NewsDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [item, setItem] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getNewsById(id).then(data => {
      setItem(data);
      setLoading(false);
    });
  }, [id]);

  // Grant XP after 15 seconds of reading
  useEffect(() => {
    if (!id || !user) return;
    const timer = setTimeout(() => {
      grantNewsReadXP(user.id, id).catch(() => {});
    }, 15000);
    return () => clearTimeout(timer);
  }, [id, user]);

  if (loading) return <div className="text-center pt-32 text-amber-500">Yükleniyor...</div>;
  if (!item) return (
    <div className="text-center pt-32 text-gray-400">
      Haber bulunamadı.
      <Link to="/news" className="block mt-4 text-amber-500 hover:text-amber-400">← Haberlere Dön</Link>
    </div>
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Hero */}
      {item.image && (
        <div className="relative w-full h-[45vh] md:h-[60vh] overflow-hidden">
          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f10] via-black/30 to-transparent" />
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-8 pb-20">
        {/* Back */}
        <Link to="/news" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-amber-500 text-sm font-medium mb-6 transition-colors">
          <ChevronLeft size={16} /> Haberlere Dön
        </Link>

        {/* Category + date */}
        <div className="flex items-center gap-3 mb-4">
          <span className="bg-amber-500 text-black text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wide">
            {item.category}
          </span>
          <span className="flex items-center gap-1.5 text-gray-500 text-sm">
            <Calendar size={13} />
            {new Date(item.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-4xl font-black text-white leading-tight mb-6">
          {item.title}
        </h1>

        {/* Excerpt */}
        {item.excerpt && (
          <p className="text-gray-300 text-base sm:text-lg border-l-4 border-amber-500 pl-4 mb-8 italic leading-relaxed">
            {item.excerpt}
          </p>
        )}

        {/* Content */}
        <div className="space-y-4">
          {item.content.split('\n\n').filter(Boolean).map((para, i) => (
            <p key={i} className="text-gray-300 leading-relaxed text-sm sm:text-base">
              {para}
            </p>
          ))}
        </div>

        {/* Links (trailers, videos, etc.) */}
        {item.links && item.links.length > 0 && (
          <div className="mt-10 border-t border-gray-800 pt-8">
            <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Bağlantılar</h3>
            <div className="flex flex-wrap gap-3">
              {item.links.map((link, i) => (
                <a
                  key={i}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-amber-500 hover:text-black text-white text-sm font-bold rounded-lg transition-colors border border-gray-700 hover:border-amber-500"
                >
                  <ExternalLink size={14} />
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Source credit */}
        <div className="mt-10 pt-6 border-t border-gray-800 text-xs text-gray-600">
          Kaynak: Anime News Network
        </div>

        {/* Comments */}
        <div className="mt-10">
          <CommentSection episodeId={`news-${item.id}`} />
        </div>
      </div>
    </div>
  );
};

export default NewsDetailPage;
