import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createAnimeWithEpisodes, fetchAniListData, fetchAllSeasons, fetchMALEpisodes } from '../services/mockBackend';

interface EmbedResult {
  source: string;
  title: string;
  episode: number | null;
  embeds: { name: string; url: string }[];
  fansubs: { name: string; embeds: { name: string; url: string }[] }[] | null;
  error?: string;
}
import { UserRole, AnimeCharacter } from '../types';
import Input from '../components/Input';
import Button from '../components/Button';
import { Plus, Trash2, ArrowLeft, Sparkles, Globe, CheckCircle2, AlertCircle, Loader2, Layers, FileSpreadsheet } from 'lucide-react';

interface SourceRow { id: string; name: string; url: string; }
interface FansubRow { id: string; name: string; sources: SourceRow[]; }
interface EpisodeRow { id: string; number: string; title: string; thumbnail: string; fansubs: FansubRow[]; }
interface SeasonSection { id: string; number: number; episodes: EpisodeRow[]; }

const newFansubRow = (suffix = ''): FansubRow => ({ id: `fb-${Date.now()}-${suffix}`, name: '', sources: [{ id: `s-${Date.now()}-${suffix}`, name: 'Fembed', url: '' }] });
const newEpisodeRow = (num = ''): EpisodeRow => { const id = Date.now().toString(); return { id, number: num, title: '', thumbnail: '', fansubs: [newFansubRow(id)] }; };
const newSeasonSection = (num: number): SeasonSection => ({ id: `season-${num}-${Date.now()}`, number: num, episodes: [] });

const PLAYER_PRESETS = ['Fembed', 'Sibnet', 'Okru', 'Odnoklassniki', 'Mail.ru', 'Filemoon', 'Streamtape', 'Diğer'];

const parseVideoLink = (url: string): { embedUrl: string; thumbnail: string; name: string } => {
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return { name: 'YouTube', embedUrl: 'https://www.youtube.com/embed/' + ytMatch[1], thumbnail: 'https://img.youtube.com/vi/' + ytMatch[1] + '/maxresdefault.jpg' };
  const okMatch = url.match(/ok\.ru\/video\/(\d+)/);
  if (okMatch) return { name: 'Okru', embedUrl: 'https://ok.ru/videoembed/' + okMatch[1], thumbnail: '' };
  const sibnetMatch = url.match(/video\.sibnet\.ru\/video(\d+)/);
  if (sibnetMatch) return { name: 'Sibnet', embedUrl: 'https://video.sibnet.ru/shell.php?videoid=' + sibnetMatch[1], thumbnail: '' };
  const dmMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/);
  if (dmMatch) return { name: 'Dailymotion', embedUrl: 'https://www.dailymotion.com/embed/video/' + dmMatch[1], thumbnail: '' };
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { name: 'Vimeo', embedUrl: 'https://player.vimeo.com/video/' + vimeoMatch[1], thumbnail: '' };
  const gdMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (gdMatch) return { name: 'Google Drive', embedUrl: 'https://drive.google.com/file/d/' + gdMatch[1] + '/preview', thumbnail: '' };
  return { name: 'Diğer', embedUrl: url, thumbnail: '' };
};

// --- Google Sheets import helpers ---
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function extractSheetId(url: string): string | null {
  const m = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : null;
}

function sheetCsvToSeasonSections(csvText: string): SeasonSection[] {
  const lines = csvText.split('\n').map(l => l.replace(/\r$/, '')).filter(Boolean);
  if (!lines.length) return [];

  interface RawRow { season: number; number: number; title: string; translator: string; player: string; url: string; }
  const rows: RawRow[] = [];
  for (const line of lines) {
    const cols = parseCSVLine(line);
    if (cols.length < 8) continue;
    const [, seasonStr, numStr, title, translator, , player, url] = cols;
    const season = parseInt(seasonStr);
    const number = parseInt(numStr);
    if (isNaN(season) || isNaN(number) || !url) continue;
    rows.push({ season, number, title, translator, player, url });
  }

  // Deduplicate: same (season, number, translator, player) → keep only first
  const seen = new Set<string>();
  const filtered = rows.filter(r => {
    const k = `${r.season}|${r.number}|${r.translator}|${r.player}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const epMap = new Map<string, { season: number; number: number; title: string; fansubMap: Map<string, { name: string; url: string }[]> }>();
  for (const r of filtered) {
    const k = `${r.season}-${r.number}`;
    if (!epMap.has(k)) epMap.set(k, { season: r.season, number: r.number, title: r.title, fansubMap: new Map() });
    const ep = epMap.get(k)!;
    const fansubName = r.translator.trim() || 'Bilinmiyor';
    if (!ep.fansubMap.has(fansubName)) ep.fansubMap.set(fansubName, []);
    ep.fansubMap.get(fansubName)!.push({ name: r.player, url: r.url });
  }

  const seasonMap = new Map<number, EpisodeRow[]>();
  for (const ep of epMap.values()) {
    if (!seasonMap.has(ep.season)) seasonMap.set(ep.season, []);
    const rowId = `ep-${ep.season}-${ep.number}-${Date.now()}`;
    const fansubs: FansubRow[] = Array.from(ep.fansubMap.entries()).map(([name, srcs]) => ({
      id: `fb-${Date.now()}-${Math.random()}`,
      name,
      sources: srcs.map(s => ({ id: `s-${Date.now()}-${Math.random()}`, name: s.name, url: s.url })),
    }));
    seasonMap.get(ep.season)!.push({
      id: rowId,
      number: String(ep.number),
      title: ep.title,
      thumbnail: '',
      fansubs: fansubs.length > 0 ? fansubs : [newFansubRow(rowId)],
    });
  }

  return Array.from(seasonMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([num, episodes]) => ({
      id: `season-${num}-${Date.now()}`,
      number: num,
      episodes: episodes.sort((a, b) => parseInt(a.number) - parseInt(b.number)),
    }));
}
// --- end helpers ---

const AddAnimePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isModerator = user?.role === UserRole.MODERATOR;

  // Anime fields
  const [fetchTitle, setFetchTitle] = useState('');
  const [title, setTitle] = useState('');
  const [alternativeTitles, setAlternativeTitles] = useState<string[]>([]);
  const [altTitleInput, setAltTitleInput] = useState('');
  const [desc, setDesc] = useState('');
  const [cover, setCover] = useState('');
  const [banner, setBanner] = useState('');
  const [genres, setGenres] = useState('');
  const [characters, setCharacters] = useState<AnimeCharacter[]>([]);

  const [seasonSections, setSeasonSections] = useState<SeasonSection[]>([newSeasonSection(1)]);

  const [anilistId, setAnilistId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [epFetchLoading, setEpFetchLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [sheetsUrl, setSheetsUrl] = useState('');
  const [sheetsLoading, setSheetsLoading] = useState(false);
  const [sheetsMsg, setSheetsMsg] = useState('');

  // Per-section MAL fetch
  const [secMalId, setSecMalId] = useState<Record<string, string>>({});
  const [secMalLoading, setSecMalLoading] = useState<Record<string, boolean>>({});

  // Per-episode embed fetching
  const [rowEmbedUrl, setRowEmbedUrl] = useState<Record<string, string>>({});
  const [rowEmbedLoading, setRowEmbedLoading] = useState<Record<string, boolean>>({});
  const [rowEmbedStatus, setRowEmbedStatus] = useState<Record<string, 'ok' | 'error' | null>>({});

  const handleImportSheets = async () => {
    const sheetId = extractSheetId(sheetsUrl.trim());
    if (!sheetId) { setSheetsMsg('Hata: Geçerli bir Google Sheets linki değil.'); return; }
    setSheetsLoading(true);
    setSheetsMsg('');
    try {
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const sections = sheetCsvToSeasonSections(text);
      if (!sections.length) { setSheetsMsg('Hata: Tabloda uygun veri bulunamadı.'); return; }
      // Mevcut episode'lardan thumbnail'ları koru
      setSeasonSections(prev => {
        const thumbMap = new Map<string, string>();
        prev.forEach(s => s.episodes.forEach(e => { if (e.thumbnail) thumbMap.set(`${s.number}-${e.number}`, e.thumbnail); }));
        return sections.map(s => ({
          ...s,
          episodes: s.episodes.map(e => ({ ...e, thumbnail: thumbMap.get(`${s.number}-${e.number}`) || e.thumbnail })),
        }));
      });
      const totalEps = sections.reduce((t, s) => t + s.episodes.length, 0);
      setSheetsMsg(`${sections.length} sezon, ${totalEps} bölüm aktarıldı!`);
    } catch (e: any) {
      setSheetsMsg('Hata: ' + (e.message || 'Tablo çekilemedi. Tablonun herkese açık olduğundan emin ol.'));
    } finally {
      setSheetsLoading(false);
    }
  };

  const handleFetch = async () => {
    if (!fetchTitle.trim()) return;
    setFetchLoading(true);
    try {
      const data = await fetchAniListData(fetchTitle);
      if (data) {
        setTitle(data.title.romaji || data.title.english || '');
        setDesc(data.description || '');
        setCover(data.coverImage.extraLarge || '');
        setBanner(data.bannerImage || '');
        setGenres(data.genres.join(', '));
        setCharacters(data.characters || []);
        setAnilistId(data.id || null);
        const charMsg = data.characters?.length ? ` ${data.characters.length} karakter bulundu.` : '';
        setMsg({ type: 'success', text: `AniList verileri çekildi!${charMsg} Şimdi "Bölümleri Çek" ile bölümleri ekleyebilirsin.` });
      }
    } catch (e) {
      setMsg({ type: 'error', text: 'AniList hatası.' });
    } finally {
      setFetchLoading(false);
    }
  };

  const handleFetchEpisodes = async () => {
    if (!anilistId) return;
    setEpFetchLoading(true);
    setMsg(null);
    try {
      const seasons = await fetchAllSeasons(anilistId);
      if (!seasons.length || seasons.every(s => s.episodes.length === 0)) {
        setMsg({ type: 'error', text: 'MAL\'dan bölüm verisi bulunamadı. Manuel ekleyebilirsin.' });
        return;
      }
      const newSections: SeasonSection[] = seasons.map(s => ({
        id: `season-${s.season}-${Date.now()}`,
        number: s.season,
        episodes: s.episodes.map(ep => {
          const rowId = `ep-s${s.season}-${ep.number}-${Date.now()}`;
          return { id: rowId, number: String(ep.number), title: ep.title, thumbnail: ep.thumbnail, fansubs: [newFansubRow(rowId)] };
        }),
      }));
      setSeasonSections(newSections);
      const totalEps = seasons.reduce((t, s) => t + s.episodes.length, 0);
      setMsg({ type: 'success', text: `${seasons.length} sezon, ${totalEps} bölüm çekildi! Link eklemeni yeterli.` });
    } catch {
      setMsg({ type: 'error', text: 'Bölüm çekilirken hata oluştu.' });
    } finally {
      setEpFetchLoading(false);
    }
  };

  const handleFetchSectionEpisodes = async (sId: string) => {
    const idStr = (secMalId[sId] || '').trim();
    const id = parseInt(idStr);
    if (!id) return;
    setSecMalLoading(p => ({ ...p, [sId]: true }));
    try {
      const eps = await fetchMALEpisodes(id);
      if (!eps.length) { setMsg({ type: 'error', text: 'Bu AniList ID için bölüm bulunamadı.' }); return; }
      setSeasonSections(prev => prev.map(s => s.id !== sId ? s : {
        ...s,
        episodes: eps.map(ep => {
          const rowId = `ep-${ep.number}-${Date.now()}-${Math.random()}`;
          return { id: rowId, number: String(ep.number), title: ep.title, thumbnail: ep.thumbnail, fansubs: [newFansubRow(rowId)] };
        }),
      }));
      setMsg({ type: 'success', text: `${eps.length} bölüm çekildi!` });
    } catch {
      setMsg({ type: 'error', text: 'Bölüm çekilirken hata oluştu.' });
    } finally {
      setSecMalLoading(p => ({ ...p, [sId]: false }));
    }
  };

  // Season helpers
  const addSeason = () => setSeasonSections(prev => [...prev, newSeasonSection(prev.length + 1)]);
  const removeSeason = (sId: string) => setSeasonSections(prev => {
    if (prev.length <= 1) return prev;
    const filtered = prev.filter(s => s.id !== sId);
    return filtered.map((s, i) => ({ ...s, number: i + 1 }));
  });

  // Episode row helpers — season-aware
  const updateEpisodesInSeason = (sId: string, fn: (eps: EpisodeRow[]) => EpisodeRow[]) =>
    setSeasonSections(prev => prev.map(s => s.id === sId ? { ...s, episodes: fn(s.episodes) } : s));

  const addRow = (sId: string) => {
    const sec = seasonSections.find(s => s.id === sId);
    updateEpisodesInSeason(sId, eps => [...eps, newEpisodeRow(String((sec?.episodes.length ?? 0) + 1))]);
  };
  const removeRow = (sId: string, rowId: string) =>
    updateEpisodesInSeason(sId, eps => eps.filter(r => r.id !== rowId));
  const updateRow = (sId: string, rowId: string, field: 'number' | 'title' | 'thumbnail', value: string) =>
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, [field]: value } : r));

  const addFansub = (sId: string, rowId: string) =>
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, fansubs: [...r.fansubs, newFansubRow(rowId + r.fansubs.length)] } : r));
  const removeFansub = (sId: string, rowId: string, fbId: string) =>
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.filter(f => f.id !== fbId) } : r));
  const updateFansubName = (sId: string, rowId: string, fbId: string, name: string) =>
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, name } : f) } : r));

  const addSource = (sId: string, rowId: string, fbId: string) =>
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, sources: [...f.sources, { id: Date.now().toString(), name: 'Sibnet', url: '' }] } : f) } : r));
  const removeSource = (sId: string, rowId: string, fbId: string, srcId: string) =>
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, sources: f.sources.filter(s => s.id !== srcId) } : f) } : r));
  const updateSource = (sId: string, rowId: string, fbId: string, srcId: string, field: 'name' | 'url', value: string) =>
    updateEpisodesInSeason(sId, eps => eps.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, sources: f.sources.map(s => s.id === srcId ? { ...s, [field]: value } : s) } : f) } : r));
  const handleSourcePaste = (sId: string, rowId: string, fbId: string, srcId: string, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (!pasted.startsWith('http')) return;
    e.preventDefault();
    const parsed = parseVideoLink(pasted);
    updateEpisodesInSeason(sId, eps => eps.map(r => {
      if (r.id !== rowId) return r;
      const newFansubs = r.fansubs.map(f => f.id !== fbId ? f : { ...f, sources: f.sources.map(s => s.id === srcId ? { ...s, name: parsed.name, url: parsed.embedUrl } : s) });
      return { ...r, fansubs: newFansubs, thumbnail: parsed.thumbnail && !r.thumbnail ? parsed.thumbnail : r.thumbnail };
    }));
  };

  const handleFetchEpisodeEmbed = async (rowId: string) => {
    const url = (rowEmbedUrl[rowId] || '').trim();
    if (!url) return;
    setRowEmbedLoading(p => ({ ...p, [rowId]: true }));
    setRowEmbedStatus(p => ({ ...p, [rowId]: null }));

    let result: EmbedResult;
    try {
      const res = await fetch('http://localhost:3001/api/embeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      result = await res.json();
    } catch {
      setRowEmbedStatus(p => ({ ...p, [rowId]: 'error' }));
      setRowEmbedLoading(p => ({ ...p, [rowId]: false }));
      return;
    }

    if (!result.error && (result.embeds.length > 0 || result.fansubs?.length)) {
      setSeasonSections(prev => prev.map(sec => ({
        ...sec,
        episodes: sec.episodes.map(row => {
          if (row.id !== rowId) return row;
          const newFansubs = [...row.fansubs];
          const groups = result.fansubs?.length
            ? result.fansubs
            : [{ name: result.source || 'Kaynak', embeds: result.embeds }];
          groups.forEach(g => {
            if (!g.embeds.length) return;
            const idx = newFansubs.findIndex(f => f.name === g.name);
            const srcs = g.embeds.map(s => ({ id: `s-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: s.name, url: s.url }));
            if (idx >= 0) newFansubs[idx] = { ...newFansubs[idx], sources: srcs };
            else newFansubs.push({ id: `fb-${Date.now()}-${Math.random().toString(36).slice(2)}`, name: g.name, sources: srcs });
          });
          const hasReal = newFansubs.some(f => f.name && f.sources.some(s => s.url));
          if (hasReal && newFansubs[0]?.name === '' && !newFansubs[0]?.sources.some(s => s.url)) newFansubs.shift();
          return { ...row, fansubs: newFansubs.length > 0 ? newFansubs : row.fansubs };
        })
      })));
      setRowEmbedStatus(p => ({ ...p, [rowId]: 'ok' }));
    } else {
      setRowEmbedStatus(p => ({ ...p, [rowId]: 'error' }));
    }
    setRowEmbedLoading(p => ({ ...p, [rowId]: false }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !cover.trim()) {
      setMsg({ type: 'error', text: 'Başlık ve kapak fotoğrafı zorunludur.' });
      return;
    }
    setLoading(true);
    try {
      const eps = seasonSections.flatMap(sec =>
        sec.episodes.map(r => ({
          number: parseInt(r.number) || 0,
          season: sec.number,
          title: r.title,
          videoUrl: r.fansubs[0]?.sources[0]?.url || '',
          sources: r.fansubs[0]?.sources.filter(s => s.url).map(s => ({ name: s.name, url: s.url })) || [],
          fansubs: r.fansubs.map(f => ({ name: f.name, sources: f.sources.filter(s => s.url).map(s => ({ name: s.name, url: s.url })) })).filter(f => f.sources.length > 0),
          thumbnail: r.thumbnail,
          fansub: r.fansubs[0]?.name || '',
        }))
      );
      await createAnimeWithEpisodes({ title, alternativeTitles, description: desc, coverImage: cover, bannerImage: banner, genres: genres.split(',').map(g => g.trim()).filter(Boolean), characters }, eps, user);
      const successMsg = isModerator
        ? 'Anime onaya gönderildi. Yönetici onayladıktan sonra yayına alınacak.'
        : 'Anime başarıyla yayınlandı!';
      setMsg({ type: 'success', text: successMsg });
      setTimeout(() => navigate('/admin'), 2000);
    } catch (err) {
      setMsg({ type: 'error', text: 'Bir hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 pt-24 pb-20 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/admin')} className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Yeni Anime Ekle</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {isModerator ? 'Eklediğiniz anime admin onayından sonra yayınlanacak.' : 'Admin olarak direkt yayınlanır.'}
          </p>
        </div>
        {isModerator && (
          <span className="ml-auto text-xs bg-amber-500/10 text-amber-500 border border-amber-700/30 px-3 py-1 rounded-full font-bold">Onay Gerekli</span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {msg && (
          <div className={`p-4 rounded-xl border text-sm font-medium ${msg.type === 'success' ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-red-900/20 border-red-800 text-red-400'}`}>
            {msg.text}
          </div>
        )}

        {/* Anime Bilgileri */}
        <div className="bg-[#18181b] border border-gray-800 rounded-2xl p-4 sm:p-6 space-y-4">
          <h2 className="text-base font-bold text-white border-b border-gray-800 pb-3 flex items-center gap-2">
            <Sparkles size={16} className="text-amber-500" /> Anime Bilgileri
          </h2>

          {/* AniList Fetch */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none"
              placeholder="AniList'ten otomatik doldur (anime adı)..."
              value={fetchTitle}
              onChange={e => setFetchTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleFetch())}
            />
            <Button type="button" onClick={handleFetch} isLoading={fetchLoading} variant="secondary" className="text-sm">
              Verileri Çek
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input label="Anime Başlığı *" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label className="text-sm font-medium text-gray-300">Alternatif İsimler <span className="text-gray-500 font-normal">(opsiyonel — arama için)</span></label>
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none"
                  placeholder="ör. Shingeki no Kyojin"
                  value={altTitleInput}
                  onChange={e => setAltTitleInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const v = altTitleInput.trim();
                      if (v && !alternativeTitles.includes(v)) setAlternativeTitles(p => [...p, v]);
                      setAltTitleInput('');
                    }
                  }}
                />
                <button type="button" onClick={() => {
                  const v = altTitleInput.trim();
                  if (v && !alternativeTitles.includes(v)) setAlternativeTitles(p => [...p, v]);
                  setAltTitleInput('');
                }} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-xl">Ekle</button>
              </div>
              {alternativeTitles.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {alternativeTitles.map(t => (
                    <span key={t} className="flex items-center gap-1 bg-gray-800 border border-gray-700 text-gray-300 text-xs px-2 py-1 rounded-lg">
                      {t}
                      <button type="button" onClick={() => setAlternativeTitles(p => p.filter(x => x !== t))} className="text-gray-500 hover:text-red-400">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <Input label="Kapak Görseli URL *" value={cover} onChange={e => setCover(e.target.value)} required />
            <Input label="Banner Görseli URL (Opsiyonel)" value={banner} onChange={e => setBanner(e.target.value)} />
            <div className="sm:col-span-2">
              <Input label="Türler (virgülle ayır)" value={genres} onChange={e => setGenres(e.target.value)} required />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <label className="text-sm font-medium text-gray-300">Açıklama *</label>
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white text-sm h-28 focus:border-amber-500 focus:outline-none resize-none"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Preview */}
          {(cover || title) && (
            <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl border border-gray-800">
              {cover && <img src={cover} className="w-12 h-16 object-cover rounded-lg flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display = 'none'} />}
              <div>
                <p className="text-white font-bold text-sm">{title || 'Başlık...'}</p>
                {genres && <p className="text-xs text-gray-500 mt-0.5">{genres}</p>}
              </div>
            </div>
          )}
        </div>

        {/* Google Sheets Import */}
        <div className="bg-[#18181b] border border-green-900/40 rounded-2xl p-4 sm:p-6 space-y-3">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileSpreadsheet size={16} className="text-green-400" /> Google Sheets'ten Bölüm Aktar
          </h2>
          <p className="text-xs text-gray-500">
            Sütun sırası: Anime, Sezon, Bölüm, Bölüm Adı, Çevirmen, Dil, Oynatıcı, Embed Link
            &nbsp;—&nbsp;Aynı fansub'da aynı oynatıcı için sadece ilk link alınır.
          </p>
          <div className="flex gap-2">
            <input
              type="url"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetsUrl}
              onChange={e => setSheetsUrl(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleImportSheets())}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-white text-sm focus:border-green-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={handleImportSheets}
              disabled={sheetsLoading || !sheetsUrl.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors flex-shrink-0"
            >
              {sheetsLoading ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
              Aktar
            </button>
          </div>
          {sheetsMsg && (
            <p className={`text-xs font-medium ${sheetsMsg.startsWith('Hata') ? 'text-red-400' : 'text-green-400'}`}>
              {sheetsMsg}
            </p>
          )}
        </div>

        {/* Sezonlar & Bölümler */}
        <datalist id="pp-presets">{PLAYER_PRESETS.map(p => <option key={p} value={p} />)}</datalist>
        {seasonSections.map(sec => (
          <div key={sec.id} className="bg-[#18181b] border border-gray-800 rounded-2xl p-4 sm:p-6 space-y-4">
            {/* Sezon başlığı */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-800 pb-3 gap-3">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers size={16} className="text-amber-500" />
                {sec.number}. Sezon
                <span className="text-xs text-gray-500 font-normal">({sec.episodes.length} bölüm)</span>
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Per-section MAL fetch */}
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="AniList ID"
                    value={secMalId[sec.id] || ''}
                    onChange={e => setSecMalId(p => ({ ...p, [sec.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleFetchSectionEpisodes(sec.id))}
                    className="w-28 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs focus:border-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleFetchSectionEpisodes(sec.id)}
                    disabled={secMalLoading[sec.id] || !secMalId[sec.id]?.trim()}
                    className="flex items-center gap-1 px-2 py-1 bg-blue-700 hover:bg-blue-600 disabled:opacity-50 text-white text-xs font-bold rounded transition-colors"
                  >
                    {secMalLoading[sec.id] ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    Çek
                  </button>
                </div>
                {sec.number === 1 && anilistId && (
                  <Button
                    type="button"
                    onClick={handleFetchEpisodes}
                    isLoading={epFetchLoading}
                    variant="secondary"
                    className="text-xs h-8 border-blue-800 text-blue-400 hover:border-blue-600"
                  >
                    <Sparkles size={13} className="mr-1" />
                    {epFetchLoading ? 'Çekiliyor...' : 'Tüm Sezonları Çek'}
                  </Button>
                )}
                {seasonSections.length > 1 && (
                  <button type="button" onClick={() => removeSeason(sec.id)} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1 border border-red-900/40 rounded-lg px-2 py-1">
                    <Trash2 size={11} /> Sezonu Sil
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
              {sec.episodes.length === 0 && (
                <p className="text-gray-600 text-sm text-center py-4">Bu sezonda henüz bölüm yok.</p>
              )}
              {sec.episodes.map((row, idx) => (
                <div key={row.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-500 font-bold text-sm">{sec.number}.S {idx + 1}. Bölüm</span>
                    <button type="button" onClick={() => removeRow(sec.id, row.id)} className="text-red-500 hover:text-red-400 p-1.5"><Trash2 size={15}/></button>
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
                  {/* Fansub grupları */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-400 font-bold uppercase">Fansublar</label>
                      <button type="button" onClick={() => addFansub(sec.id, row.id)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus size={11}/> Fansub Ekle</button>
                    </div>
                    {row.fansubs.map((fb, fi) => (
                      <div key={fb.id} className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-2.5 space-y-2">
                        <div className="flex items-center gap-2">
                          <input type="text" placeholder="Fansub adı (ör: TurkAnime)" value={fb.name} onChange={e => updateFansubName(sec.id, row.id, fb.id, e.target.value)} className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs font-bold focus:border-blue-500 focus:outline-none" />
                          {row.fansubs.length > 1 && <button type="button" onClick={() => removeFansub(sec.id, row.id, fb.id)} className="text-red-500 p-1"><Plus size={13} className="rotate-45"/></button>}
                        </div>
                        {fb.sources.map((src, si) => (
                          <div key={src.id} className="flex gap-1.5 items-center">
                            <input type="text" list="pp-presets" placeholder="Sibnet..." value={src.name} onChange={e => updateSource(sec.id, row.id, fb.id, src.id, 'name', e.target.value)} className="w-20 flex-shrink-0 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none" />
                            <input type="text" placeholder="Embed link yapıştır..." value={src.url} onChange={e => updateSource(sec.id, row.id, fb.id, src.id, 'url', e.target.value)} onPaste={e => handleSourcePaste(sec.id, row.id, fb.id, src.id, e)} required={fi === 0 && si === 0} className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none" />
                            {fb.sources.length > 1 && <button type="button" onClick={() => removeSource(sec.id, row.id, fb.id, src.id)} className="text-red-500 p-1 flex-shrink-0"><Trash2 size={12}/></button>}
                          </div>
                        ))}
                        <button type="button" onClick={() => addSource(sec.id, row.id, fb.id)} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"><Plus size={10}/> Kaynak Ekle</button>
                      </div>
                    ))}
                  </div>
                  {/* Per-episode embed fetch */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-gray-800/60">
                    <Globe size={12} className="text-blue-400 flex-shrink-0" />
                    <input
                      type="url"
                      placeholder="Bölüm sayfası URL'si (Seicode, Efsaneyiz...)"
                      value={rowEmbedUrl[row.id] || ''}
                      onChange={e => setRowEmbedUrl(p => ({ ...p, [row.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleFetchEpisodeEmbed(row.id))}
                      className="flex-1 min-w-0 bg-gray-800/80 border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleFetchEpisodeEmbed(row.id)}
                      disabled={rowEmbedLoading[row.id] || !rowEmbedUrl[row.id]?.trim()}
                      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors"
                    >
                      {rowEmbedLoading[row.id] ? <Loader2 size={11} className="animate-spin" /> : <Globe size={11} />}
                      Çek
                    </button>
                    {rowEmbedStatus[row.id] === 'ok' && <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />}
                    {rowEmbedStatus[row.id] === 'error' && <AlertCircle size={14} className="text-red-400 flex-shrink-0" title="Server çevrimdışı veya kaynak bulunamadı" />}
                  </div>
                </div>
              ))}
            </div>

            <button type="button" onClick={() => addRow(sec.id)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:border-amber-500 hover:text-amber-500 transition-colors text-sm font-medium">
              <Plus size={18} /> Bölüm Ekle
            </button>
          </div>
        ))}

        {/* Sezon Ekle butonu */}
        <button type="button" onClick={addSeason} className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-blue-900/50 rounded-2xl text-blue-400 hover:border-blue-600 hover:text-blue-300 transition-colors text-sm font-bold">
          <Layers size={16} /> {seasonSections.length + 1}. Sezon Ekle
        </button>

        {/* Submit */}
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/admin')} className="flex-1">
            İptal
          </Button>
          <Button type="submit" isLoading={loading} className="flex-2 flex-grow-[2]">
            {isModerator ? 'Onaya Gönder' : `Yayınla (${seasonSections.reduce((t, s) => t + s.episodes.length, 0)} Bölüm)`}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AddAnimePage;
