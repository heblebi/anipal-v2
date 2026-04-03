import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole, Anime, NewsItem } from '../types';
import Input from '../components/Input';
import Button from '../components/Button';
import {
  getAnimes, createAnimeWithEpisodes, deleteAnime, deleteEpisode, updateEpisode, updateAnime,
  getNews, createNews, updateNews, deleteNews, fetchANNArticle,
  getMyContributions, requestEditContribution, requestDeleteContribution,
} from '../services/mockBackend';
import { EpisodeContribution } from '../types';
import { Plus, Trash2, Pencil, X, Save, ChevronDown, ChevronRight, Globe, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface SourceRow { id: string; name: string; url: string; }
interface FansubRow { id: string; name: string; sources: SourceRow[]; }
interface EpisodeRow { id: string; number: string; title: string; thumbnail: string; fansubs: FansubRow[]; }
interface EditingEp { animeId: string; episodeId: string; number: string; title: string; thumbnail: string; fansubs: FansubRow[]; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
const newSource = (): SourceRow => ({ id: `s-${Date.now()}-${Math.random()}`, name: 'Fembed', url: '' });
const newFansub = (): FansubRow => ({ id: `fb-${Date.now()}-${Math.random()}`, name: '', sources: [newSource()] });
const newEpRow = (num = ''): EpisodeRow => ({ id: `ep-${Date.now()}-${Math.random()}`, number: num, title: '', thumbnail: '', fansubs: [newFansub()] });

const GENRES = ['Aksiyon', 'Macera', 'Komedi', 'Drama', 'Fantezi', 'Korku', 'Romantik', 'Bilim Kurgu', 'Spor', 'Gerilim', 'Psikolojik', 'Ecchi', 'Shounen', 'Shoujo', 'Seinen', 'Josei', 'Isekai', 'Mecha', 'Müzik', 'Gizem'];
const PLAYER_PRESETS = ['Fembed', 'Sibnet', 'Okru', 'Dailymotion', 'Filemoon', 'Streamtape', 'Diğer'];

const Msg = ({ msg }: { msg: { type: 'success' | 'error'; text: string } | null }) =>
  msg ? (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm mb-4 ${msg.type === 'success' ? 'bg-green-900/40 text-green-300 border border-green-800' : 'bg-red-900/40 text-red-300 border border-red-800'}`}>
      {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {msg.text}
    </div>
  ) : null;

// ─── ManagePanel ─────────────────────────────────────────────────────────────
const ManagePanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isMod = user?.role === UserRole.MODERATOR;
  const isEditor = user?.role === UserRole.EDITOR;

  const [tab, setTab] = useState<'add' | 'mine' | 'all' | 'news-add' | 'news-mine'>(isMod ? 'add' : 'news-add');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!user || (user.role !== UserRole.MODERATOR && user.role !== UserRole.EDITOR)) {
      navigate('/');
    }
  }, [user]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  // ─── Anime state ───────────────────────────────────────────────────────────
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loadingAnimes, setLoadingAnimes] = useState(false);
  const [allAnimes, setAllAnimes] = useState<Anime[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allSearch, setAllSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingEp, setEditingEp] = useState<EditingEp | null>(null);
  const [epSaving, setEpSaving] = useState(false);

  // Anime form
  const [animeForm, setAnimeForm] = useState({ title: '', description: '', coverImage: '', bannerImage: '' });
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [epRows, setEpRows] = useState<EpisodeRow[]>([newEpRow()]);
  const [addingAnime, setAddingAnime] = useState(false);

  const loadAnimes = async () => {
    setLoadingAnimes(true);
    try {
      const all = await getAnimes({ status: undefined });
      setAnimes(all.filter(a => a.uploadedBy === user?.id));
    } finally {
      setLoadingAnimes(false);
    }
  };

  const loadAllAnimes = async () => {
    setLoadingAll(true);
    try {
      const all = await getAnimes({ status: undefined });
      setAllAnimes(all.filter(a => a.status === 'approved'));
    } finally {
      setLoadingAll(false);
    }
  };

  // ─── Contribution state ────────────────────────────────────────────────────
  const [contributions, setContributions] = useState<EpisodeContribution[]>([]);
  const [loadingContribs, setLoadingContribs] = useState(false);
  const [deletingContribId, setDeletingContribId] = useState<string | null>(null);

  const loadContributions = async () => {
    if (!user) return;
    setLoadingContribs(true);
    try { setContributions(await getMyContributions(user.id)); } catch {} finally { setLoadingContribs(false); }
  };

  useEffect(() => {
    if (isMod && tab === 'mine') { loadAnimes(); loadContributions(); }
    if (isMod && tab === 'all') loadAllAnimes();
  }, [tab]);

  // Episode row ops
  const addEpRow = () => setEpRows(p => [...p, newEpRow()]);
  const removeEpRow = (id: string) => setEpRows(p => p.filter(r => r.id !== id));
  const updateEpRow = (id: string, field: 'number' | 'title' | 'thumbnail', val: string) =>
    setEpRows(p => p.map(r => r.id === id ? { ...r, [field]: val } : r));
  const addFansubToRow = (rowId: string) =>
    setEpRows(p => p.map(r => r.id === rowId ? { ...r, fansubs: [...r.fansubs, newFansub()] } : r));
  const removeFansubFromRow = (rowId: string, fbId: string) =>
    setEpRows(p => p.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.filter(f => f.id !== fbId) } : r));
  const updateFansubName = (rowId: string, fbId: string, name: string) =>
    setEpRows(p => p.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, name } : f) } : r));
  const addSourceToFansub = (rowId: string, fbId: string) =>
    setEpRows(p => p.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, sources: [...f.sources, newSource()] } : f) } : r));
  const removeSourceFromFansub = (rowId: string, fbId: string, srcId: string) =>
    setEpRows(p => p.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, sources: f.sources.filter(s => s.id !== srcId) } : f) } : r));
  const updateSource = (rowId: string, fbId: string, srcId: string, field: 'name' | 'url', val: string) =>
    setEpRows(p => p.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, sources: f.sources.map(s => s.id === srcId ? { ...s, [field]: val } : s) } : f) } : r));

  const handleAddAnime = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!animeForm.title.trim()) { showMsg('error', 'Başlık zorunludur.'); return; }
    setAddingAnime(true);
    try {
      const episodes = epRows
        .filter(r => r.number.trim())
        .map(r => ({
          number: parseInt(r.number),
          title: r.title,
          thumbnail: r.thumbnail,
          videoUrl: r.fansubs[0]?.sources[0]?.url || '',
          sources: r.fansubs[0]?.sources.filter(s => s.url).map(s => ({ name: s.name, url: s.url })) || [],
          fansubs: r.fansubs.map(f => ({ name: f.name, sources: f.sources.filter(s => s.url).map(s => ({ name: s.name, url: s.url })) })).filter(f => f.sources.length > 0),
        }));
      await createAnimeWithEpisodes({ ...animeForm, genres: selectedGenres }, episodes, user);
      showMsg('success', 'Anime onaya gönderildi.');
      setAnimeForm({ title: '', description: '', coverImage: '', bannerImage: '' });
      setSelectedGenres([]);
      setEpRows([newEpRow()]);
    } catch (err: any) {
      showMsg('error', err.message || 'Hata oluştu.');
    } finally {
      setAddingAnime(false);
    }
  };

  const handleDeleteAnime = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" silinsin mi?`)) return;
    try {
      await deleteAnime(id);
      showMsg('success', 'Silindi.');
      loadAnimes();
    } catch { showMsg('error', 'Silinemedi.'); }
  };

  const handleDeleteEp = async (animeId: string, epId: string, title: string) => {
    if (!window.confirm(`"${title}" bölümü silinsin mi?`)) return;
    try {
      await deleteEpisode(animeId, epId);
      showMsg('success', 'Bölüm silindi.');
      loadAnimes();
    } catch { showMsg('error', 'Silinemedi.'); }
  };

  const openEditEp = (animeId: string, ep: any) => {
    let fansubs: FansubRow[];
    if (ep.fansubs?.length) {
      fansubs = ep.fansubs.map((f: any, fi: number) => ({
        id: `ef${fi}`, name: f.name,
        sources: f.sources.map((s: any, si: number) => ({ id: `es${fi}-${si}`, name: s.name, url: s.url })),
      }));
    } else {
      fansubs = [{ id: 'ef0', name: ep.fansub || '', sources: [{ id: 'es0', name: 'Fembed', url: ep.videoUrl || '' }] }];
    }
    setEditingEp({ animeId, episodeId: ep.id, number: String(ep.number), title: ep.title || '', thumbnail: ep.thumbnail || '', fansubs });
  };

  const saveEditEp = async () => {
    if (!editingEp) return;
    setEpSaving(true);
    try {
      const fansubs = editingEp.fansubs
        .map(f => ({ name: f.name, sources: f.sources.filter(s => s.url).map(s => ({ name: s.name, url: s.url })) }))
        .filter(f => f.sources.length > 0);
      await updateEpisode(editingEp.animeId, editingEp.episodeId, {
        number: parseInt(editingEp.number),
        title: editingEp.title,
        thumbnail: editingEp.thumbnail,
        fansub: editingEp.fansubs[0]?.name || '',
        videoUrl: editingEp.fansubs[0]?.sources[0]?.url || '',
        sources: editingEp.fansubs[0]?.sources.filter(s => s.url).map(s => ({ name: s.name, url: s.url })) || [],
        fansubs,
      } as any);
      showMsg('success', 'Bölüm güncellendi.');
      setEditingEp(null);
      loadAnimes();
    } catch { showMsg('error', 'Güncellenemedi.'); }
    finally { setEpSaving(false); }
  };

  // ─── News state ────────────────────────────────────────────────────────────
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [newsForm, setNewsForm] = useState({ title: '', excerpt: '', content: '', image: '', category: 'Haber' });
  const [newsLinks, setNewsLinks] = useState<{ id: string; label: string; url: string }[]>([]);
  const [annUrl, setAnnUrl] = useState('');
  const [annLoading, setAnnLoading] = useState(false);
  const [newsSaving, setNewsSaving] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [newsEditForm, setNewsEditForm] = useState({ title: '', excerpt: '', content: '', image: '', category: '' });

  const loadNews = async () => {
    const all = await getNews(true);
    setNewsList(all.filter(n => n.authorId === user?.id));
  };

  useEffect(() => {
    if (isEditor && (tab === 'news-mine' || tab === 'news-add')) loadNews();
  }, [tab]);

  const handleFetchANN = async () => {
    if (!annUrl.trim()) return;
    setAnnLoading(true);
    try {
      const r = await fetchANNArticle(annUrl.trim());
      setNewsForm({ title: r.title, excerpt: r.excerpt, content: r.content, image: r.image, category: r.category });
      showMsg('success', 'Haber çekildi.');
    } catch (e: any) { showMsg('error', e.message); }
    finally { setAnnLoading(false); }
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setNewsSaving(true);
    try {
      const links = newsLinks.filter(l => l.label && l.url).map(l => ({ label: l.label, url: l.url }));
      await createNews({ ...newsForm, links }, user);
      showMsg('success', 'Haber onaya gönderildi.');
      setNewsForm({ title: '', excerpt: '', content: '', image: '', category: 'Haber' });
      setNewsLinks([]);
      setAnnUrl('');
      loadNews();
    } catch { showMsg('error', 'Haber oluşturulamadı.'); }
    finally { setNewsSaving(false); }
  };

  const openEditNews = (n: NewsItem) => {
    setEditingNews(n);
    setNewsEditForm({ title: n.title, excerpt: n.excerpt, content: n.content, image: n.image, category: n.category });
  };

  const saveEditNews = async () => {
    if (!editingNews) return;
    try {
      await updateNews(editingNews.id, newsEditForm);
      showMsg('success', 'Haber güncellendi.');
      setEditingNews(null);
      loadNews();
    } catch { showMsg('error', 'Güncellenemedi.'); }
  };

  const handleDeleteNews = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" silinsin mi?`)) return;
    try {
      await deleteNews(id);
      showMsg('success', 'Silindi.');
      loadNews();
    } catch { showMsg('error', 'Silinemedi.'); }
  };

  // ─── UI ───────────────────────────────────────────────────────────────────
  const tabClass = (t: string) =>
    `px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${tab === t ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`;

  return (
    <div className="min-h-screen bg-[#0f0f10] pt-24 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white">
            {isMod ? 'Moderatör Paneli' : 'Editör Paneli'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {isMod ? 'Anime ekle ve yönet' : 'Haber ekle ve yönet'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 flex-wrap">
          {isMod && (
            <>
              <button className={tabClass('add')} onClick={() => setTab('add')}>+ Anime Ekle</button>
              <button className={tabClass('mine')} onClick={() => setTab('mine')}>Animelerim</button>
              <button className={tabClass('all')} onClick={() => setTab('all')}>Animeler</button>
            </>
          )}
          {isEditor && (
            <>
              <button className={tabClass('news-add')} onClick={() => setTab('news-add')}>+ Haber Ekle</button>
              <button className={tabClass('news-mine')} onClick={() => setTab('news-mine')}>Haberlerim</button>
            </>
          )}
        </div>

        <Msg msg={msg} />

        {/* ── Anime Ekle ── */}
        {tab === 'add' && isMod && (
          <form onSubmit={handleAddAnime} className="space-y-6">
            <div className="bg-[#18181b] rounded-2xl border border-gray-800 p-6 space-y-4">
              <h2 className="font-bold text-white text-lg">Anime Bilgileri</h2>
              <Input label="Başlık *" value={animeForm.title} onChange={e => setAnimeForm(f => ({ ...f, title: e.target.value }))} placeholder="Anime adı" />
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Açıklama</label>
                <textarea value={animeForm.description} onChange={e => setAnimeForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-amber-500 transition-colors"
                  rows={3} placeholder="Anime hakkında kısa açıklama..." />
              </div>
              <Input label="Kapak Görseli URL" value={animeForm.coverImage} onChange={e => setAnimeForm(f => ({ ...f, coverImage: e.target.value }))} placeholder="https://..." />
              <Input label="Banner Görseli URL" value={animeForm.bannerImage} onChange={e => setAnimeForm(f => ({ ...f, bannerImage: e.target.value }))} placeholder="https://..." />
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-2">Türler</label>
                <div className="flex flex-wrap gap-2">
                  {GENRES.map(g => (
                    <button key={g} type="button"
                      onClick={() => setSelectedGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g])}
                      className={`px-3 py-1 text-xs rounded-full border transition-colors ${selectedGenres.includes(g) ? 'bg-amber-500 text-black border-amber-500' : 'border-gray-700 text-gray-400 hover:border-amber-500 hover:text-amber-500'}`}>
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Episodes */}
            <div className="bg-[#18181b] rounded-2xl border border-gray-800 p-6 space-y-4">
              <h2 className="font-bold text-white text-lg">Bölümler</h2>
              {epRows.map((row, idx) => (
                <div key={row.id} className="border border-gray-700 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-500">Bölüm #{idx + 1}</span>
                    {epRows.length > 1 && (
                      <button type="button" onClick={() => removeEpRow(row.id)} className="text-red-400 hover:text-red-300">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="No" value={row.number} onChange={e => updateEpRow(row.id, 'number', e.target.value)} placeholder="1" />
                    <Input label="Başlık" value={row.title} onChange={e => updateEpRow(row.id, 'title', e.target.value)} placeholder="Bölüm adı" />
                  </div>
                  <Input label="Thumbnail URL" value={row.thumbnail} onChange={e => updateEpRow(row.id, 'thumbnail', e.target.value)} placeholder="https://..." />
                  {row.fansubs.map((fb, fi) => (
                    <div key={fb.id} className="bg-gray-900/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input value={fb.name} onChange={e => updateFansubName(row.id, fb.id, e.target.value)}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                          placeholder="Fansub adı (ör: TR Altyazılı)" />
                        {row.fansubs.length > 1 && (
                          <button type="button" onClick={() => removeFansubFromRow(row.id, fb.id)} className="text-red-400 hover:text-red-300"><X size={14} /></button>
                        )}
                      </div>
                      {fb.sources.map(src => (
                        <div key={src.id} className="flex gap-2">
                          <select value={src.name} onChange={e => updateSource(row.id, fb.id, src.id, 'name', e.target.value)}
                            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
                            {PLAYER_PRESETS.map(p => <option key={p}>{p}</option>)}
                          </select>
                          <input value={src.url} onChange={e => updateSource(row.id, fb.id, src.id, 'url', e.target.value)}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                            placeholder="Embed URL" />
                          {fb.sources.length > 1 && (
                            <button type="button" onClick={() => removeSourceFromFansub(row.id, fb.id, src.id)} className="text-red-400"><X size={14} /></button>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <button type="button" onClick={() => addSourceToFansub(row.id, fb.id)} className="text-xs text-amber-500 hover:text-amber-400">+ Kaynak</button>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => addFansubToRow(row.id)} className="text-xs text-gray-400 hover:text-amber-500">+ Fansub Grubu Ekle</button>
                </div>
              ))}
              <button type="button" onClick={addEpRow}
                className="w-full py-2.5 border border-dashed border-gray-700 rounded-xl text-sm text-gray-400 hover:text-amber-500 hover:border-amber-500 transition-colors">
                + Bölüm Ekle
              </button>
            </div>

            <Button type="submit" variant="primary" className="w-full py-3 font-bold" disabled={addingAnime}>
              {addingAnime ? <><Loader2 size={16} className="animate-spin inline mr-2" />Gönderiliyor...</> : 'Onaya Gönder'}
            </Button>
          </form>
        )}

        {/* ── Animelerim ── */}
        {tab === 'mine' && isMod && (
          <div className="space-y-3">
            {loadingAnimes ? (
              <div className="text-center py-12 text-gray-500"><Loader2 size={24} className="animate-spin inline" /></div>
            ) : animes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Henüz anime eklemediniz.</div>
            ) : animes.map(anime => (
              <div key={anime.id} className="bg-[#18181b] border border-gray-800 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {anime.coverImage && <img src={anime.coverImage} className="w-10 h-14 object-cover rounded-lg" alt="" />}
                    <div className="min-w-0">
                      <p className="font-bold text-white text-sm truncate">{anime.title}</p>
                      <p className="text-xs text-gray-500">{anime.episodes.length} bölüm · <span className={`${anime.status === 'approved' ? 'text-green-400' : 'text-amber-400'}`}>{anime.status === 'approved' ? 'Yayında' : 'Onay Bekliyor'}</span></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => navigate(`/contribute/${anime.id}`)}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors whitespace-nowrap">
                      + Bölüm
                    </button>
                    <button onClick={() => setExpandedId(expandedId === anime.id ? null : anime.id)}
                      className="p-2 text-gray-400 hover:text-white">
                      {expandedId === anime.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <button onClick={() => handleDeleteAnime(anime.id, anime.title)}
                      className="p-2 text-red-400 hover:text-red-300">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {expandedId === anime.id && (
                  <div className="border-t border-gray-800 p-4 space-y-2">
                    <p className="text-xs font-bold text-gray-400 mb-3">BÖLÜMLER</p>
                    {anime.episodes.length === 0 ? (
                      <p className="text-xs text-gray-600">Bölüm yok.</p>
                    ) : anime.episodes.map(ep => (
                      <div key={ep.id} className="flex items-center justify-between bg-gray-900/50 rounded-lg px-3 py-2">
                        <span className="text-xs text-gray-300">Bölüm {ep.number}{ep.title ? ` — ${ep.title}` : ''}</span>
                        <div className="flex gap-2">
                          <button onClick={() => openEditEp(anime.id, ep)} className="text-amber-400 hover:text-amber-300"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteEp(anime.id, ep.id, `Bölüm ${ep.number}`)} className="text-red-400 hover:text-red-300"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Katkılarım */}
            <div className="pt-4 border-t border-gray-800 space-y-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bölüm Katkılarım</p>
              {loadingContribs ? (
                <div className="text-center py-6 text-gray-500"><Loader2 size={20} className="animate-spin inline" /></div>
              ) : contributions.length === 0 ? (
                <p className="text-xs text-gray-600 py-4 text-center">Henüz katkınız yok.</p>
              ) : contributions.map(c => (
                <div key={c.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3 flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        c.pendingAction ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                        c.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/30' :
                        c.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}>
                        {c.pendingAction === 'delete' ? 'Silme Bekleniyor' :
                         c.pendingAction === 'edit' ? 'Düzenleme Bekleniyor' :
                         c.status === 'approved' ? 'Onaylandı' :
                         c.status === 'rejected' ? 'Reddedildi' : 'Onay Bekliyor'}
                      </span>
                    </div>
                    <p className="text-sm text-white font-medium">Bölüm {c.episodeNumber}: {c.episodeTitle}</p>
                    <p className="text-xs text-amber-400">{c.fansubName}</p>
                    {c.adminNote && <p className="text-xs text-red-400 italic">"{c.adminNote}"</p>}
                  </div>
                  {c.status === 'approved' && !c.pendingAction && (
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => setDeletingContribId(c.id)}
                        className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Silme isteği gönder"
                      ><Trash2 size={13} /></button>
                    </div>
                  )}
                  {c.pendingAction && (
                    <Clock size={13} className="text-gray-600 flex-shrink-0 mt-1" />
                  )}
                </div>
              ))}
            </div>

            {/* Silme onay dialog */}
            {deletingContribId && (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
                <div className="bg-[#18181b] border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4">
                  <p className="text-white font-bold">Silme isteği gönderilsin mi?</p>
                  <p className="text-xs text-gray-400">Admin onayladıktan sonra katkınız kaldırılacak.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setDeletingContribId(null)} className="flex-1 py-2 rounded-xl border border-gray-700 text-gray-300 text-sm font-bold">İptal</button>
                    <button onClick={async () => {
                      try { await requestDeleteContribution(deletingContribId); loadContributions(); } catch {}
                      setDeletingContribId(null);
                    }} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold">Gönder</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Animeler (tüm onaylı animeler) ── */}
        {tab === 'all' && isMod && (
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Anime ara..."
              value={allSearch}
              onChange={e => setAllSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-amber-500 focus:outline-none"
            />
            {loadingAll ? (
              <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
            ) : allAnimes.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Anime bulunamadı.</div>
            ) : allAnimes
                .filter(a => a.title.toLowerCase().includes(allSearch.toLowerCase()))
                .map(anime => (
              <div key={anime.id} className="bg-[#18181b] border border-gray-800 rounded-xl p-4 flex items-center gap-3">
                {anime.coverImage && <img src={anime.coverImage} className="w-10 h-14 object-cover rounded-lg flex-shrink-0" alt="" />}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">{anime.title}</p>
                  <p className="text-xs text-gray-500">{anime.episodes.length} bölüm</p>
                </div>
                <button
                  onClick={() => navigate(`/contribute/${anime.id}`)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors whitespace-nowrap flex-shrink-0"
                >
                  + Bölüm Ekle
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Haber Ekle ── */}
        {tab === 'news-add' && isEditor && (
          <form onSubmit={handleCreateNews} className="space-y-6">
            <div className="bg-[#18181b] rounded-2xl border border-gray-800 p-6 space-y-4">
              <h2 className="font-bold text-white text-lg">Haber Ekle</h2>
              {/* ANN Fetch */}
              <div className="flex gap-2">
                <input value={annUrl} onChange={e => setAnnUrl(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  placeholder="ANN makale URL'si (opsiyonel)" />
                <button type="button" onClick={handleFetchANN} disabled={annLoading}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-sm text-white rounded-xl transition-colors">
                  {annLoading ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
                  Çek
                </button>
              </div>
              <Input label="Başlık *" value={newsForm.title} onChange={e => setNewsForm(f => ({ ...f, title: e.target.value }))} placeholder="Haber başlığı" />
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Özet</label>
                <textarea value={newsForm.excerpt} onChange={e => setNewsForm(f => ({ ...f, excerpt: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-amber-500"
                  rows={2} placeholder="Kısa özet..." />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">İçerik</label>
                <textarea value={newsForm.content} onChange={e => setNewsForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-amber-500"
                  rows={6} placeholder="Haber içeriği..." />
              </div>
              <Input label="Görsel URL" value={newsForm.image} onChange={e => setNewsForm(f => ({ ...f, image: e.target.value }))} placeholder="https://..." />
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Kategori</label>
                <select value={newsForm.category} onChange={e => setNewsForm(f => ({ ...f, category: e.target.value }))}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none">
                  {['Haber', 'Duyuru', 'Fragman', 'Röportaj', 'Genel'].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              {/* Links */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-gray-400">Bağlantılar</label>
                  <button type="button" onClick={() => setNewsLinks(l => [...l, { id: Date.now().toString(), label: '', url: '' }])}
                    className="text-xs text-amber-500 hover:text-amber-400">+ Ekle</button>
                </div>
                {newsLinks.map(link => (
                  <div key={link.id} className="flex gap-2 mb-2">
                    <input value={link.label} onChange={e => setNewsLinks(l => l.map(x => x.id === link.id ? { ...x, label: e.target.value } : x))}
                      className="w-32 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      placeholder="Etiket" />
                    <input value={link.url} onChange={e => setNewsLinks(l => l.map(x => x.id === link.id ? { ...x, url: e.target.value } : x))}
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                      placeholder="URL" />
                    <button type="button" onClick={() => setNewsLinks(l => l.filter(x => x.id !== link.id))} className="text-red-400"><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" variant="primary" className="w-full py-3 font-bold" disabled={newsSaving}>
              {newsSaving ? <><Loader2 size={16} className="animate-spin inline mr-2" />Gönderiliyor...</> : 'Onaya Gönder'}
            </Button>
          </form>
        )}

        {/* ── Haberlerim ── */}
        {tab === 'news-mine' && isEditor && (
          <div className="space-y-3">
            {newsList.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Henüz haber eklemediniz.</div>
            ) : newsList.map(news => (
              <div key={news.id} className="bg-[#18181b] border border-gray-800 rounded-2xl p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">{news.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{news.category} · <span className={news.status === 'published' ? 'text-green-400' : 'text-amber-400'}>{news.status === 'published' ? 'Yayında' : 'Onay Bekliyor'}</span></p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEditNews(news)} className="p-2 text-amber-400 hover:text-amber-300"><Pencil size={15} /></button>
                  <button onClick={() => handleDeleteNews(news.id, news.title)} className="p-2 text-red-400 hover:text-red-300"><Trash2 size={15} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Episode Edit Modal ── */}
      {editingEp && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="font-bold text-white">Bölümü Düzenle</h3>
              <button onClick={() => setEditingEp(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input label="Bölüm No" value={editingEp.number} onChange={e => setEditingEp(ep => ep ? { ...ep, number: e.target.value } : ep)} />
                <Input label="Başlık" value={editingEp.title} onChange={e => setEditingEp(ep => ep ? { ...ep, title: e.target.value } : ep)} />
              </div>
              <Input label="Thumbnail" value={editingEp.thumbnail} onChange={e => setEditingEp(ep => ep ? { ...ep, thumbnail: e.target.value } : ep)} />
              {editingEp.fansubs.map((fb, fi) => (
                <div key={fb.id} className="bg-gray-900/50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input value={fb.name} onChange={e => setEditingEp(ep => ep ? { ...ep, fansubs: ep.fansubs.map(f => f.id === fb.id ? { ...f, name: e.target.value } : f) } : ep)}
                      className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      placeholder="Fansub adı" />
                    {editingEp.fansubs.length > 1 && (
                      <button onClick={() => setEditingEp(ep => ep ? { ...ep, fansubs: ep.fansubs.filter(f => f.id !== fb.id) } : ep)} className="text-red-400"><X size={14} /></button>
                    )}
                  </div>
                  {fb.sources.map(src => (
                    <div key={src.id} className="flex gap-2">
                      <select value={src.name} onChange={e => setEditingEp(ep => ep ? { ...ep, fansubs: ep.fansubs.map(f => f.id === fb.id ? { ...f, sources: f.sources.map(s => s.id === src.id ? { ...s, name: e.target.value } : s) } : f) } : ep)}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none">
                        {PLAYER_PRESETS.map(p => <option key={p}>{p}</option>)}
                      </select>
                      <input value={src.url} onChange={e => setEditingEp(ep => ep ? { ...ep, fansubs: ep.fansubs.map(f => f.id === fb.id ? { ...f, sources: f.sources.map(s => s.id === src.id ? { ...s, url: e.target.value } : s) } : f) } : ep)}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                        placeholder="Embed URL" />
                    </div>
                  ))}
                  <button onClick={() => setEditingEp(ep => ep ? { ...ep, fansubs: ep.fansubs.map(f => f.id === fb.id ? { ...f, sources: [...f.sources, newSource()] } : f) } : ep)}
                    className="text-xs text-amber-500 hover:text-amber-400">+ Kaynak</button>
                </div>
              ))}
              <button onClick={() => setEditingEp(ep => ep ? { ...ep, fansubs: [...ep.fansubs, newFansub()] } : ep)}
                className="text-xs text-gray-400 hover:text-amber-500">+ Fansub Grubu Ekle</button>
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setEditingEp(null)}>İptal</Button>
              <Button variant="primary" className="flex-1" onClick={saveEditEp} disabled={epSaving}>
                {epSaving ? <Loader2 size={16} className="animate-spin inline mr-1" /> : <Save size={16} className="inline mr-1" />}
                Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── News Edit Modal ── */}
      {editingNews && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-[#18181b] border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h3 className="font-bold text-white">Haberi Düzenle</h3>
              <button onClick={() => setEditingNews(null)} className="text-gray-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-4">
              <Input label="Başlık" value={newsEditForm.title} onChange={e => setNewsEditForm(f => ({ ...f, title: e.target.value }))} />
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Özet</label>
                <textarea value={newsEditForm.excerpt} onChange={e => setNewsEditForm(f => ({ ...f, excerpt: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-amber-500"
                  rows={2} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">İçerik</label>
                <textarea value={newsEditForm.content} onChange={e => setNewsEditForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white resize-none focus:outline-none focus:border-amber-500"
                  rows={5} />
              </div>
              <Input label="Görsel URL" value={newsEditForm.image} onChange={e => setNewsEditForm(f => ({ ...f, image: e.target.value }))} />
            </div>
            <div className="p-5 border-t border-gray-800 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setEditingNews(null)}>İptal</Button>
              <Button variant="primary" className="flex-1" onClick={saveEditNews}>
                <Save size={16} className="inline mr-1" />Kaydet
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagePanel;
