import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAnimes, submitContribution } from '../services/mockBackend';
import { UserRole, Anime, Episode } from '../types';
import { Plus, Trash2, ArrowLeft, CheckCircle2, AlertCircle, Loader2, X, Film, Link2 } from 'lucide-react';

interface SourceRow { id: string; name: string; url: string; }

const PLAYER_PRESETS = ['Fembed', 'Sibnet', 'Okru', 'Odnoklassniki', 'Mail.ru', 'Filemoon', 'Streamtape', 'Diğer'];

const newSource = (): SourceRow => ({ id: `s-${Date.now()}-${Math.random()}`, name: 'Fembed', url: '' });

const parseVideoLink = (url: string) => {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return { name: 'YouTube', embedUrl: `https://www.youtube.com/embed/${yt[1]}`, thumbnail: `https://img.youtube.com/vi/${yt[1]}/maxresdefault.jpg` };
  const ok = url.match(/ok\.ru\/video\/(\d+)/);
  if (ok) return { name: 'Okru', embedUrl: `https://ok.ru/videoembed/${ok[1]}`, thumbnail: '' };
  const sib = url.match(/video\.sibnet\.ru\/video(\d+)/);
  if (sib) return { name: 'Sibnet', embedUrl: `https://video.sibnet.ru/shell.php?videoid=${sib[1]}`, thumbnail: '' };
  const dm = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (dm) return { name: 'Dailymotion', embedUrl: `https://www.dailymotion.com/embed/video/${dm[1]}`, thumbnail: '' };
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { name: 'Vimeo', embedUrl: `https://player.vimeo.com/video/${vimeo[1]}`, thumbnail: '' };
  if (/tau\.com\.tr|taudt|tau-video|taudtmi/i.test(url)) return { name: 'Tau', embedUrl: url, thumbnail: '' };
  return { name: 'Diğer', embedUrl: url, thumbnail: '' };
};

const ContributePage = () => {
  const { animeId: paramAnimeId } = useParams<{ animeId: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const [animes, setAnimes] = useState<Anime[]>([]);
  const [animesLoading, setAnimesLoading] = useState(true);

  // Mode: 'episode' = new episode, 'source' = add source to existing episode
  const [mode, setMode] = useState<'episode' | 'source'>('episode');

  // Form state
  const [selectedAnimeId, setSelectedAnimeId] = useState(paramAnimeId || '');
  const [animeSearch, setAnimeSearch] = useState('');
  const [showAnimeDropdown, setShowAnimeDropdown] = useState(false);

  // Episode mode fields
  const [episodeNumber, setEpisodeNumber] = useState('');
  const [episodeTitle, setEpisodeTitle] = useState('');
  const [thumbnail, setThumbnail] = useState('');

  // Source mode: pick existing episode
  const [targetEpisodeId, setTargetEpisodeId] = useState('');

  const [fansubName, setFansubName] = useState('');
  const [sources, setSources] = useState<SourceRow[]>([newSource()]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { navigate('/login'); return; }
    if (user.role !== UserRole.EDITOR && user.role !== UserRole.ADMIN && user.role !== UserRole.MODERATOR) {
      navigate('/');
      return;
    }
    loadAnimes();
  }, [isLoading]);

  const loadAnimes = async () => {
    setAnimesLoading(true);
    try {
      const list = await getAnimes({ status: undefined });
      const approved = list.filter(a => a.status === 'approved');
      setAnimes(approved);
      if (paramAnimeId) {
        const found = approved.find(a => a.id === paramAnimeId);
        if (found) setAnimeSearch(found.title);
      }
    } catch {
      /* ignore */
    } finally {
      setAnimesLoading(false);
    }
  };

  const selectedAnime = animes.find(a => a.id === selectedAnimeId);
  const sortedEpisodes = (selectedAnime?.episodes || []).slice().sort((a, b) => a.number - b.number);
  const targetEpisode = sortedEpisodes.find(e => e.id === targetEpisodeId);

  const filteredAnimes = animes.filter(a =>
    a.title.toLowerCase().includes(animeSearch.toLowerCase())
  );

  const addSource = () => setSources(p => [...p, newSource()]);
  const removeSource = (id: string) => setSources(p => p.filter(s => s.id !== id));
  const updateSource = (id: string, field: 'name' | 'url', val: string) =>
    setSources(p => p.map(s => s.id === id ? { ...s, [field]: val } : s));

  const handlePaste = (id: string, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (!text.startsWith('http')) return;
    e.preventDefault();
    const parsed = parseVideoLink(text);
    updateSource(id, 'name', parsed.name);
    updateSource(id, 'url', parsed.embedUrl);
    if (parsed.thumbnail && !thumbnail) setThumbnail(parsed.thumbnail);
  };

  const handleModeChange = (newMode: 'episode' | 'source') => {
    setMode(newMode);
    setTargetEpisodeId('');
    setEpisodeNumber('');
    setEpisodeTitle('');
    setThumbnail('');
    setMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!selectedAnimeId) { setMsg({ type: 'error', text: 'Lütfen bir anime seçin.' }); return; }
    if (!fansubName.trim()) { setMsg({ type: 'error', text: 'Fansub adı gereklidir.' }); return; }
    const validSources = sources.filter(s => s.url.trim());
    if (validSources.length === 0) { setMsg({ type: 'error', text: 'En az bir kaynak URL gereklidir.' }); return; }

    if (mode === 'source') {
      if (!targetEpisodeId) { setMsg({ type: 'error', text: 'Lütfen bir bölüm seçin.' }); return; }
      if (!targetEpisode) { setMsg({ type: 'error', text: 'Seçilen bölüm bulunamadı.' }); return; }
    } else {
      if (!episodeNumber) { setMsg({ type: 'error', text: 'Bölüm numarası gereklidir.' }); return; }
      if (!episodeTitle.trim()) { setMsg({ type: 'error', text: 'Bölüm başlığı gereklidir.' }); return; }
    }

    setLoading(true);
    setMsg(null);
    try {
      await submitContribution(user.id, {
        animeId: selectedAnimeId,
        episodeNumber: mode === 'source' ? targetEpisode!.number : parseInt(episodeNumber),
        episodeTitle: mode === 'source' ? targetEpisode!.title : episodeTitle.trim(),
        thumbnail: mode === 'source' ? targetEpisode!.thumbnail : (thumbnail.trim() || undefined),
        fansubName: fansubName.trim(),
        sources: validSources.map(s => ({ name: s.name, url: s.url })),
        type: mode,
        targetEpisodeId: mode === 'source' ? targetEpisodeId : undefined,
      });
      setMsg({ type: 'success', text: 'Katkınız başarıyla gönderildi! Admin onayından sonra yayınlanacak.' });
      setEpisodeNumber('');
      setEpisodeTitle('');
      setThumbnail('');
      setTargetEpisodeId('');
      setFansubName('');
      setSources([newSource()]);
    } catch (err: any) {
      setMsg({ type: 'error', text: 'Hata: ' + (err.message || 'Bilinmeyen hata') });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || animesLoading) {
    return (
      <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f10] text-gray-100 pt-24 pb-20 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black text-white">Katkı Gönder</h1>
            <p className="text-xs text-gray-500 mt-0.5">Katkılarınız admin onayından sonra yayınlanır</p>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-[#18181b] border border-gray-800 rounded-xl">
          <button
            type="button"
            onClick={() => handleModeChange('episode')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors ${mode === 'episode' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            <Film size={15} /> Yeni Bölüm Ekle
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('source')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-colors ${mode === 'source' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
          >
            <Link2 size={15} /> Var Olan Bölüme Kaynak Ekle
          </button>
        </div>

        {msg && (
          <div className={`p-4 rounded-xl text-sm font-medium border flex items-start gap-3 ${msg.type === 'success' ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-red-900/20 border-red-800 text-red-400'}`}>
            {msg.type === 'success' ? <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Anime Seçimi */}
          <div className="bg-[#18181b] border border-gray-800 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-amber-500 uppercase">Anime Seç</h2>
            <div className="relative">
              <input
                type="text"
                placeholder="Anime adı ara..."
                value={animeSearch}
                onChange={e => { setAnimeSearch(e.target.value); setShowAnimeDropdown(true); if (!e.target.value) { setSelectedAnimeId(''); setTargetEpisodeId(''); } }}
                onFocus={() => setShowAnimeDropdown(true)}
                onBlur={() => setTimeout(() => setShowAnimeDropdown(false), 150)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
              />
              {showAnimeDropdown && filteredAnimes.length > 0 && (
                <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-gray-900 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {filteredAnimes.slice(0, 20).map(a => (
                    <button
                      key={a.id}
                      type="button"
                      onMouseDown={() => { setSelectedAnimeId(a.id); setAnimeSearch(a.title); setShowAnimeDropdown(false); setTargetEpisodeId(''); }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left"
                    >
                      <img src={a.coverImage} className="w-7 h-10 object-cover rounded flex-shrink-0" alt="" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                      <span className="text-sm text-white truncate">{a.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedAnime && (
              <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-800">
                <img src={selectedAnime.coverImage} className="w-10 h-14 object-cover rounded flex-shrink-0" alt="" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                <div className="min-w-0">
                  <p className="text-white font-bold text-sm truncate">{selectedAnime.title}</p>
                  <p className="text-xs text-gray-500">{sortedEpisodes.length} mevcut bölüm</p>
                </div>
              </div>
            )}
          </div>

          {/* Source Mode: Episode Picker */}
          {mode === 'source' && selectedAnime && (
            <div className="bg-[#18181b] border border-gray-800 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-amber-500 uppercase">Bölüm Seç</h2>
              {sortedEpisodes.length === 0 ? (
                <p className="text-gray-500 text-sm">Bu animenin henüz bölümü yok.</p>
              ) : (
                <select
                  value={targetEpisodeId}
                  onChange={e => setTargetEpisodeId(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- Bölüm seçin --</option>
                  {sortedEpisodes.map(ep => (
                    <option key={ep.id} value={ep.id}>Bölüm {ep.number}: {ep.title}</option>
                  ))}
                </select>
              )}
              {targetEpisode && (
                <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-800">
                  {targetEpisode.thumbnail && (
                    <img src={targetEpisode.thumbnail} className="w-16 h-10 object-cover rounded flex-shrink-0" alt="" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                  )}
                  <div className="min-w-0">
                    <p className="text-white font-bold text-sm">Bölüm {targetEpisode.number}: {targetEpisode.title}</p>
                    <p className="text-xs text-gray-500">{(targetEpisode.fansubs || []).length} mevcut fansub grubu</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Episode Mode: Bölüm Bilgileri */}
          {mode === 'episode' && (
            <div className="bg-[#18181b] border border-gray-800 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-amber-500 uppercase">Bölüm Bilgileri</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Bölüm No *</label>
                  <input
                    type="number"
                    required={mode === 'episode'}
                    min="1"
                    value={episodeNumber}
                    onChange={e => setEpisodeNumber(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400">Bölüm Başlığı *</label>
                  <input
                    type="text"
                    required={mode === 'episode'}
                    value={episodeTitle}
                    onChange={e => setEpisodeTitle(e.target.value)}
                    placeholder="örn: Yeni Başlangıç"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Kapak URL (isteğe bağlı)</label>
                <input
                  type="url"
                  value={thumbnail}
                  onChange={e => setThumbnail(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                />
                {thumbnail && (
                  <img src={thumbnail} className="w-full h-24 object-cover rounded-lg border border-gray-700 mt-1" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />
                )}
              </div>
            </div>
          )}

          {/* Fansub & Kaynaklar */}
          <div className="bg-[#18181b] border border-gray-800 rounded-xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-amber-500 uppercase">Fansub & Kaynaklar</h2>
            <div className="space-y-1">
              <label className="text-xs text-gray-400">Fansub Adı *</label>
              <input
                type="text"
                required
                value={fansubName}
                onChange={e => setFansubName(e.target.value)}
                placeholder="örn: TurkAnime, AnimeTR..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-gray-400 font-bold uppercase">Kaynak Linkleri</label>
              <datalist id="contribute-player-presets">{PLAYER_PRESETS.map(p => <option key={p} value={p} />)}</datalist>
              {sources.map((src, si) => (
                <div key={src.id} className="flex gap-2 items-center">
                  <input
                    type="text"
                    list="contribute-player-presets"
                    value={src.name}
                    onChange={e => updateSource(src.id, 'name', e.target.value)}
                    className="w-24 flex-shrink-0 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Embed link (yapıştırınca otomatik dönüştürülür)..."
                    value={src.url}
                    onChange={e => updateSource(src.id, 'url', e.target.value)}
                    onPaste={e => handlePaste(src.id, e)}
                    required={si === 0}
                    className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                  {sources.length > 1 && (
                    <button type="button" onClick={() => removeSource(src.id)} className="text-red-500 hover:text-red-400 p-1 flex-shrink-0">
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addSource}
                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-medium"
              >
                <Plus size={12} /> Kaynak Ekle
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="flex-1 py-3 rounded-xl border border-gray-700 text-gray-300 text-sm font-bold hover:bg-gray-800 transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Gönderiliyor...' : 'Katkıyı Gönder'}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="bg-blue-900/10 border border-blue-900/30 rounded-xl p-4 text-xs text-blue-300 space-y-1">
          <p className="font-bold text-blue-200">Nasıl çalışır?</p>
          {mode === 'episode'
            ? <p>Gönderdiğiniz yeni bölümler admin onayına girer. Onaylandıktan sonra animenin bölüm listesine eklenir.</p>
            : <p>Mevcut bir bölüme yeni fansub/kaynak ekleyebilirsiniz. Admin onaylandıktan sonra izleme sayfasında görünür.</p>
          }
          <p>Katkılarınızı Panel &gt; Animelerim sekmesinden takip edebilirsiniz.</p>
        </div>
      </div>
    </div>
  );
};

export default ContributePage;
