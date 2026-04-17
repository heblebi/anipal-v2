import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAnimes, addEpisodes } from '../services/mockBackend';
import { UserRole, Anime } from '../types';
import Button from '../components/Button';
import { Plus, Trash2, ArrowLeft, Globe, CheckCircle2, AlertCircle, Loader2, X, Layers } from 'lucide-react';

interface SourceRow { id: string; name: string; url: string; }
interface FansubRow { id: string; name: string; sources: SourceRow[]; }
interface EpisodeRow { id: string; number: string; title: string; thumbnail: string; fansubs: FansubRow[]; }
interface SeasonSection { id: string; number: number; episodes: EpisodeRow[]; }

const PLAYER_PRESETS = ['Fembed', 'Sibnet', 'Okru', 'Odnoklassniki', 'Mail.ru', 'Filemoon', 'Streamtape', 'Diğer'];

const newSource = (): SourceRow => ({ id: `s-${Date.now()}-${Math.random()}`, name: 'Fembed', url: '' });
const newFansub = (): FansubRow => ({ id: `fb-${Date.now()}-${Math.random()}`, name: '', sources: [newSource()] });
const newRow = (num = ''): EpisodeRow => ({ id: `${Date.now()}-${Math.random()}`, number: num, title: '', thumbnail: '', fansubs: [newFansub()] });
const newSeasonSection = (num: number): SeasonSection => ({ id: `season-${num}-${Date.now()}`, number: num, episodes: [newRow()] });

const parseVideoLink = (url: string) => {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (yt) return { name: 'YouTube', embedUrl: `https://www.youtube.com/embed/${yt[1]}`, thumbnail: `https://img.youtube.com/vi/${yt[1]}/maxresdefault.jpg` };
  const ytEmbed = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (ytEmbed) return { name: 'YouTube', embedUrl: url, thumbnail: `https://img.youtube.com/vi/${ytEmbed[1]}/maxresdefault.jpg` };
  if (url.includes('ok.ru')) return { name: 'Okru', embedUrl: url.includes('videoembed') ? url : url.replace(/ok\.ru\/video\/(\d+)/, 'ok.ru/videoembed/$1'), thumbnail: '' };
  if (url.includes('sibnet.ru')) {
    const sib = url.match(/videoid=(\d+)/) || url.match(/video\.sibnet\.ru\/video(\d+)/);
    return { name: 'Sibnet', embedUrl: sib ? `https://video.sibnet.ru/shell.php?videoid=${sib[1]}` : url, thumbnail: '' };
  }
  if (url.includes('dailymotion.com')) return { name: 'Dailymotion', embedUrl: url.includes('/embed/') ? url : url.replace(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/, 'dailymotion.com/embed/video/$1'), thumbnail: '' };
  if (url.includes('vimeo.com')) return { name: 'Vimeo', embedUrl: url.includes('player.vimeo') ? url : url.replace(/vimeo\.com\/(\d+)/, 'player.vimeo.com/video/$1'), thumbnail: '' };
  if (url.includes('drive.google.com')) return { name: 'Drive', embedUrl: url, thumbnail: '' };
  if (url.includes('mail.ru') || url.includes('mycdn.me')) return { name: 'Mail.ru', embedUrl: url, thumbnail: '' };
  if (url.includes('filemoon')) return { name: 'Filemoon', embedUrl: url, thumbnail: '' };
  if (url.includes('streamtape')) return { name: 'Streamtape', embedUrl: url, thumbnail: '' };
  if (/tau\.com\.tr|taudt|tau-video|taudtmi/i.test(url)) return { name: 'Tau', embedUrl: url, thumbnail: '' };
  return { name: 'Diğer', embedUrl: url, thumbnail: '' };
};

const AddEpisodePage = () => {
  const { id: animeId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const [anime, setAnime] = useState<Anime | null>(null);
  const [seasonSections, setSeasonSections] = useState<SeasonSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState<Record<string, boolean>>({});
  const [fetchStatus, setFetchStatus] = useState<Record<string, 'ok' | 'error' | null>>({});
  const [fetchUrl, setFetchUrl] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== UserRole.ADMIN) { navigate('/'); return; }
    if (!animeId) { navigate('/admin/dashboard'); return; }
    getAnimes({ status: undefined }).then(list => {
      const found = list.find(a => a.id === animeId);
      if (!found) { navigate('/admin/dashboard'); return; }
      setAnime(found);
      // Mevcut sezonları al, yeni bölüm eklemek için sonraki sezonu varsayılan yap
      const existingSeasons = [...new Set(found.episodes.map(e => e.season || 1))].sort((a, b) => a - b);
      const defaultSeason = existingSeasons.length > 0 ? Math.max(...existingSeasons) : 1;
      setSeasonSections([newSeasonSection(defaultSeason)]);
    });
  }, [isLoading, animeId]);

  // Season helpers
  const addSeason = () => setSeasonSections(prev => [...prev, newSeasonSection(prev.length > 0 ? Math.max(...prev.map(s => s.number)) + 1 : 1)]);
  const removeSeason = (sId: string) => setSeasonSections(prev => prev.length <= 1 ? prev : prev.filter(s => s.id !== sId));

  const updateEpisodesInSeason = (sId: string, fn: (eps: EpisodeRow[]) => EpisodeRow[]) =>
    setSeasonSections(prev => prev.map(s => s.id === sId ? { ...s, episodes: fn(s.episodes) } : s));

  const addRow = (sId: string) => {
    const sec = seasonSections.find(s => s.id === sId);
    updateEpisodesInSeason(sId, eps => [...eps, newRow(String((sec?.episodes.length ?? 0) + 1))]);
  };
  const removeRow = (sId: string, rowId: string) =>
    updateEpisodesInSeason(sId, eps => eps.filter(r => r.id !== rowId));
  const updateRow = (sId: string, rowId: string, field: 'number' | 'title' | 'thumbnail', val: string) =>
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, [field]: val } : r));
  const addFansub = (sId: string, rowId: string) =>
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, fansubs: [...r.fansubs, newFansub()] } : r));
  const removeFansub = (sId: string, rowId: string, fbId: string) =>
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.filter(f => f.id !== fbId) } : r));
  const updateFansubName = (sId: string, rowId: string, fbId: string, val: string) =>
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, name: val } : f) } : r));
  const addSource = (sId: string, rowId: string, fbId: string) =>
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, sources: [...f.sources, newSource()] } : f) } : r));
  const removeSource = (sId: string, rowId: string, fbId: string, srcId: string) =>
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, sources: f.sources.filter(s => s.id !== srcId) } : f) } : r));
  const updateSource = (sId: string, rowId: string, fbId: string, srcId: string, field: 'name' | 'url', val: string) => {
    const extra = field === 'url' && val.startsWith('http') ? { name: parseVideoLink(val).name } : {};
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, sources: f.sources.map(s => s.id === srcId ? { ...s, [field]: val, ...extra } : s) } : f) } : r));
  };
  const handlePaste = (sId: string, rowId: string, fbId: string, srcId: string, e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (!text.startsWith('http')) return;
    e.preventDefault();
    const parsed = parseVideoLink(text);
    updateSource(sId, rowId, fbId, srcId, 'name', parsed.name);
    updateSource(sId, rowId, fbId, srcId, 'url', parsed.embedUrl);
    if (parsed.thumbnail) updateRow(sId, rowId, 'thumbnail', parsed.thumbnail);
  };

  const handleFetchEmbed = async (rowId: string) => {
    const url = (fetchUrl[rowId] || '').trim();
    if (!url) return;
    setFetchLoading(p => ({ ...p, [rowId]: true }));
    setFetchStatus(p => ({ ...p, [rowId]: null }));
    try {
      const res = await fetch('http://localhost:3001/api/embeds', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }),
      });
      const result = await res.json();
      if (result.embeds?.length || result.fansubs?.length) {
        setSeasonSections(prev => prev.map(sec => ({
          ...sec,
          episodes: sec.episodes.map(r => {
            if (r.id !== rowId) return r;
            let newFansubs = [...r.fansubs];
            const groups = result.fansubs?.length ? result.fansubs : [{ name: result.source || '', embeds: result.embeds }];
            groups.forEach((g: any) => {
              const srcs = g.embeds.map((e: any) => ({ id: `s-${Date.now()}-${Math.random()}`, name: e.name, url: e.url }));
              const idx = newFansubs.findIndex(f => f.name === g.name);
              if (idx >= 0) newFansubs[idx] = { ...newFansubs[idx], sources: srcs };
              else newFansubs.push({ id: `fb-${Date.now()}-${Math.random()}`, name: g.name, sources: srcs });
            });
            if (newFansubs[0]?.name === '' && !newFansubs[0]?.sources.some(s => s.url)) newFansubs.shift();
            return { ...r, fansubs: newFansubs.length > 0 ? newFansubs : r.fansubs };
          })
        })));
        setFetchStatus(p => ({ ...p, [rowId]: 'ok' }));
      } else {
        setFetchStatus(p => ({ ...p, [rowId]: 'error' }));
      }
    } catch {
      setFetchStatus(p => ({ ...p, [rowId]: 'error' }));
    }
    setFetchLoading(p => ({ ...p, [rowId]: false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animeId) return;
    setLoading(true);
    setMsg('');
    try {
      const eps = seasonSections.flatMap(sec =>
        sec.episodes.map(r => ({
          number: parseInt(r.number),
          season: sec.number,
          title: r.title,
          videoUrl: r.fansubs[0]?.sources[0]?.url || '',
          sources: r.fansubs[0]?.sources.filter(s => s.url).map(s => ({ name: s.name, url: s.url })) || [],
          fansubs: r.fansubs.map(f => ({ name: f.name, sources: f.sources.filter(s => s.url).map(s => ({ name: s.name, url: s.url })) })).filter(f => f.sources.length > 0),
          thumbnail: r.thumbnail,
          fansub: r.fansubs[0]?.name || '',
          addedBy: user?.id,
        }))
      );
      await addEpisodes(animeId, eps);
      const totalEps = eps.length;
      setMsg(`${totalEps} bölüm başarıyla eklendi!`);
      // Reset — keep same season structure but empty episodes
      setSeasonSections(prev => prev.map(s => ({ ...s, episodes: [newRow()] })));
    } catch (err: any) {
      setMsg('Hata: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      setLoading(false);
    }
  };

  if (!anime) return (
    <div className="min-h-screen bg-[#0f0f10] flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-amber-500" />
    </div>
  );

  const existingSeasons = [...new Set(anime.episodes.map(e => e.season || 1))].sort((a, b) => a - b);
  const totalNewEps = seasonSections.reduce((t, s) => t + s.episodes.length, 0);

  return (
    <div className="min-h-screen bg-[#0f0f10] text-gray-100 pt-24 pb-20 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/dashboard')} className="p-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 min-w-0">
            <img src={anime.coverImage} className="w-10 h-14 object-cover rounded flex-shrink-0" alt="" onError={e => (e.target as HTMLImageElement).style.display='none'} />
            <div className="min-w-0">
              <h1 className="text-lg font-black text-white truncate">{anime.title}</h1>
              <p className="text-xs text-gray-500">
                {anime.episodes.length} mevcut bölüm
                {existingSeasons.length > 1 && ` · ${existingSeasons.length} sezon`}
              </p>
            </div>
          </div>
        </div>

        {/* Mevcut sezon özeti */}
        {existingSeasons.length > 0 && (
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-3 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-gray-500 font-bold uppercase">Mevcut:</span>
            {existingSeasons.map(s => {
              const count = anime.episodes.filter(e => (e.season || 1) === s).length;
              return (
                <span key={s} className="text-xs bg-gray-800 border border-gray-700 text-gray-300 px-2.5 py-1 rounded-lg">
                  {s}. Sezon — {count} bölüm
                </span>
              );
            })}
          </div>
        )}

        {msg && (
          <div className={`p-3 rounded-xl text-sm font-medium border ${msg.startsWith('Hata') ? 'bg-red-900/20 border-red-800 text-red-400' : 'bg-green-900/20 border-green-800 text-green-400'}`}>
            {msg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <datalist id="player-presets">{PLAYER_PRESETS.map(p => <option key={p} value={p} />)}</datalist>

          {/* Season Sections */}
          {seasonSections.map(sec => (
            <div key={sec.id} className="bg-[#18181b] border border-gray-800 rounded-2xl overflow-hidden">
              {/* Season Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-900/60 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <Layers size={15} className="text-amber-500" />
                  <span className="font-bold text-white text-sm">{sec.number}. Sezon</span>
                  <span className="text-xs text-gray-500">({sec.episodes.length} bölüm)</span>
                  {existingSeasons.includes(sec.number) && (
                    <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-700/30 px-2 py-0.5 rounded-full">Mevcut</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {/* Season number edit */}
                  <div className="flex items-center gap-1">
                    <label className="text-xs text-gray-500">Sezon No:</label>
                    <input
                      type="number"
                      min="1"
                      value={sec.number}
                      onChange={e => setSeasonSections(prev => prev.map(s => s.id === sec.id ? { ...s, number: parseInt(e.target.value) || 1 } : s))}
                      className="w-14 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  {seasonSections.length > 1 && (
                    <button type="button" onClick={() => removeSeason(sec.id)} className="text-red-500 hover:text-red-400 p-1">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 space-y-3">
                {sec.episodes.map((row, idx) => (
                  <div key={row.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-500 font-bold text-sm">{sec.number}.S {idx + 1}. Bölüm</span>
                      {sec.episodes.length > 1 && (
                        <button type="button" onClick={() => removeRow(sec.id, row.id)} className="text-red-500 hover:text-red-400 p-1">
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">Bölüm No *</label>
                        <input type="number" required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none" value={row.number} onChange={e => updateRow(sec.id, row.id, 'number', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">Başlık *</label>
                        <input type="text" required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none" value={row.title} onChange={e => updateRow(sec.id, row.id, 'title', e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Kapak URL</label>
                      <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none" placeholder="https://..." value={row.thumbnail} onChange={e => updateRow(sec.id, row.id, 'thumbnail', e.target.value)} />
                      {row.thumbnail && <img src={row.thumbnail} className="w-full h-20 object-cover rounded-lg border border-gray-700 mt-1" onError={e => (e.target as HTMLImageElement).style.display='none'} />}
                    </div>

                    {/* Fansublar */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-400 font-bold uppercase">Fansublar</label>
                        <button type="button" onClick={() => addFansub(sec.id, row.id)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus size={11}/> Fansub Ekle</button>
                      </div>
                      {row.fansubs.map((fb, fi) => (
                        <div key={fb.id} className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-2.5 space-y-2">
                          <div className="flex items-center gap-2">
                            <input type="text" placeholder="Fansub adı" value={fb.name} onChange={e => updateFansubName(sec.id, row.id, fb.id, e.target.value)} className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs font-bold focus:border-blue-500 focus:outline-none" />
                            {row.fansubs.length > 1 && <button type="button" onClick={() => removeFansub(sec.id, row.id, fb.id)} className="text-red-500 p-1"><X size={13}/></button>}
                          </div>
                          {fb.sources.map((src, si) => (
                            <div key={src.id} className="flex gap-1.5 items-center">
                              <input type="text" list="player-presets" value={src.name} onChange={e => updateSource(sec.id, row.id, fb.id, src.id, 'name', e.target.value)} className="w-20 flex-shrink-0 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none" />
                              <input type="text" placeholder="Embed link..." value={src.url} onChange={e => updateSource(sec.id, row.id, fb.id, src.id, 'url', e.target.value)} onPaste={e => handlePaste(sec.id, row.id, fb.id, src.id, e)} required={fi === 0 && si === 0} className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none" />
                              {fb.sources.length > 1 && <button type="button" onClick={() => removeSource(sec.id, row.id, fb.id, src.id)} className="text-red-500 p-1"><Trash2 size={12}/></button>}
                            </div>
                          ))}
                          <button type="button" onClick={() => addSource(sec.id, row.id, fb.id)} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"><Plus size={10}/> Kaynak Ekle</button>
                        </div>
                      ))}
                    </div>

                    {/* Embed çek */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-gray-800/60">
                      <Globe size={12} className="text-blue-400 flex-shrink-0" />
                      <input
                        type="url"
                        placeholder="Bölüm sayfası URL'si (Seicode, Efsaneyiz...)"
                        value={fetchUrl[row.id] || ''}
                        onChange={e => setFetchUrl(p => ({ ...p, [row.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleFetchEmbed(row.id))}
                        className="flex-1 min-w-0 bg-gray-800/80 border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <button type="button" onClick={() => handleFetchEmbed(row.id)} disabled={fetchLoading[row.id] || !fetchUrl[row.id]?.trim()} className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded transition-colors">
                        {fetchLoading[row.id] ? <Loader2 size={11} className="animate-spin" /> : <Globe size={11} />} Çek
                      </button>
                      {fetchStatus[row.id] === 'ok' && <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />}
                      {fetchStatus[row.id] === 'error' && <AlertCircle size={14} className="text-red-400 flex-shrink-0" />}
                    </div>
                  </div>
                ))}

                <button type="button" onClick={() => addRow(sec.id)} className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:border-amber-500 hover:text-amber-500 transition-colors text-sm font-medium">
                  <Plus size={16} /> Bölüm Ekle
                </button>
              </div>
            </div>
          ))}

          {/* Sezon Ekle */}
          <button type="button" onClick={addSeason} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-blue-900/50 rounded-2xl text-blue-400 hover:border-blue-600 hover:text-blue-300 transition-colors text-sm font-bold">
            <Layers size={16} /> Yeni Sezon Ekle
          </button>

          <Button type="submit" isLoading={loading} className="w-full">
            {totalNewEps} Bölümü Yükle
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AddEpisodePage;
