import React, { useState } from 'react';
import { Send, CheckCircle, Clock, Lightbulb } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { submitAnimeRequest, grantRequestXP } from '../services/mockBackend';
import { useNavigate } from 'react-router-dom';

const RATE_KEY = 'anipal_last_request';

const AnimeRequestPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const lastReq = localStorage.getItem(RATE_KEY);
  const cooldownMs = lastReq ? 86400000 - (Date.now() - parseInt(lastReq, 10)) : 0;
  const onCooldown = cooldownMs > 0;
  const hoursLeft = Math.ceil(cooldownMs / 3600000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!title.trim()) return;
    setError('');
    setLoading(true);
    try {
      const req = await submitAnimeRequest(
        user.id,
        user.username,
        user.displayName || user.username,
        title.trim(),
        note.trim()
      );
      if (req?.id) grantRequestXP(user.id, req.id).catch(() => {});
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">İstek göndermek için giriş yapmalısınız.</p>
          <button onClick={() => navigate('/login')} className="px-6 py-2 bg-amber-500 text-black font-bold rounded-lg">
            Giriş Yap
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Gönderildi!</h2>
          <p className="text-gray-400 text-sm mb-6">İsteğin / önerin adminlere iletildi. Teşekkürler!</p>
          <button onClick={() => navigate('/')} className="px-6 py-2 bg-amber-500 text-black font-bold rounded-lg text-sm">
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-12">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
          <Send size={26} className="text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-white">İstek & Öneri</h1>
        <p className="text-gray-500 text-sm mt-2 leading-relaxed">
          Siteye eklenmesini istediğin bir anime mi var? Ya da site hakkında bir fikrin, önerinm mi?<br />
          Admınlere doğrudan iletebilirsin.
        </p>
      </div>

      {/* Örnek kategoriler */}
      <div className="flex flex-wrap gap-2 mb-6 justify-center">
        {['Anime İsteği', 'Site Önerisi', 'Hata Bildirimi', 'Genel Öneri'].map(tag => (
          <span key={tag} className="text-xs px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-400">
            {tag}
          </span>
        ))}
      </div>

      {onCooldown ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <Clock size={32} className="text-amber-500 mx-auto mb-3" />
          <p className="text-white font-bold mb-1">Günlük limitine ulaştın</p>
          <p className="text-gray-400 text-sm">Bir sonraki isteği <span className="text-amber-400 font-bold">{hoursLeft} saat</span> sonra yapabilirsin.</p>
          <p className="text-gray-600 text-xs mt-3">Günde yalnızca 1 istek / öneri gönderilebilir.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">
              Başlık <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              maxLength={100}
              placeholder="örn: Mushoku Tensei  /  Arama motoru eklenmesi  /  Karanlık tema"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-1.5">
              Açıklama <span className="text-gray-500 text-xs font-normal">(isteğe bağlı)</span>
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Daha fazla detay vermek istersen buraya yaz. Neden öneriyor veya istiyorsun? Nasıl olmasını hayal ediyorsun?"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />
            <p className="text-[11px] text-gray-600 text-right mt-1">{note.length}/500</p>
          </div>

          {/* Info */}
          <div className="flex items-start gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3">
            <Lightbulb size={14} className="text-amber-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-400 leading-relaxed">
              Anime isteği, site önerisi, hata bildirimi veya aklına gelen her şeyi yazabilirsin. Günde 1 istek gönderebilirsin.
            </p>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2.5">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
            ) : (
              <Send size={15} />
            )}
            Gönder
          </button>
        </form>
      )}
    </div>
  );
};

export default AnimeRequestPage;
