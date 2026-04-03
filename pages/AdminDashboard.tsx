import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole, Anime, User, AnimeStatus, SiteStats, NewsItem, AnimeRequest, EpisodeContribution } from '../types';
import { useNavigate } from 'react-router-dom';
import Input from '../components/Input';
import Button from '../components/Button';
import { addEpisodes, getAnimes, getSiteStats, getUsers, banUser, unbanUser, approveAnime, updateUserRole, deleteAnime, deleteEpisode, updateEpisode, getNews, createNews, updateNews, deleteNews, approveNews, fetchANNArticle, getAnimeRequests, updateAnimeRequestStatus, deleteUser, getPendingContributions, approveContribution, rejectContribution, approveContributionAction, rejectContributionAction } from '../services/mockBackend';
import { getReports, updateReportStatus } from '../services/socialBackend';
import type { Report } from '../types';

interface EmbedResult {
  source: string;
  title: string;
  episode: number | null;
  embeds: { name: string; url: string }[];
  fansubs: { name: string; embeds: { name: string; url: string }[] }[] | null;
  error?: string;
  url?: string;
}
import { Activity, Download, Users, CheckCircle, ShieldAlert, PlaySquare, Search, Shield, Plus, Trash2, Image, ChevronDown, ChevronRight, Pencil, X, Save, Globe, Loader2, CheckCircle2, AlertCircle, ImageIcon, Upload, Send, UserX, Flag, MessageSquare, Film, Link2 } from 'lucide-react';
import ImageCropModal from '../components/ImageCropModal';
import { SITE_ASSETS, SiteAsset } from '../services/siteSettings';
import { useSiteSettings } from '../context/SiteSettingsContext';

interface SourceRow { id: string; name: string; url: string; }
interface FansubRow { id: string; name: string; sources: SourceRow[]; }
interface EpisodeRow { id: string; number: string; title: string; thumbnail: string; fansubs: FansubRow[]; }

const newFansubRow = (suffix = ''): FansubRow => ({ id: `fb-${Date.now()}-${suffix}`, name: '', sources: [{ id: `s-${Date.now()}-${suffix}`, name: 'Fembed', url: '' }] });
const newEpisodeRow = (num = ''): EpisodeRow => { const id = Date.now().toString(); return { id, number: num, title: '', thumbnail: '', fansubs: [newFansubRow(id)] }; };

const PLAYER_PRESETS = ['Fembed', 'Sibnet', 'Okru', 'Odnoklassniki', 'Mail.ru', 'Filemoon', 'Streamtape', 'Diğer'];

const AdminDashboard = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isEditor = user?.role === UserRole.EDITOR;
  const [activeTab, setActiveTab] = useState<'stats' | 'manage' | 'news' | 'moderation' | 'users' | 'assets' | 'community'>(isEditor ? 'news' : 'stats');
  const [communityTab, setCommunityTab] = useState<'requests' | 'reports'>('requests');
  const [moderationTab, setModerationTab] = useState<'animes' | 'episodes' | 'sources' | 'news'>('animes');
  const { settings: siteSettings, uploadAndSave } = useSiteSettings();
  const [assetCrop, setAssetCrop] = useState<{ src: string; asset: SiteAsset } | null>(null);
  const [assetSaving, setAssetSaving] = useState<string | null>(null);
  const [assetMsg, setAssetMsg] = useState<{ key: string; type: 'success' | 'error'; text: string } | null>(null);
  const [requests, setRequests] = useState<AnimeRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [contributions, setContributions] = useState<EpisodeContribution[]>([]);
  const [contributionsLoading, setContributionsLoading] = useState(false);

  const [requestSearch, setRequestSearch] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [visitorCount, setVisitorCount] = useState(0);
  const assetFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [userList, setUserList] = useState<User[]>([]);

  // User Search
  const [userSearch, setUserSearch] = useState('');

  // Ban modal
  const [banModal, setBanModal] = useState<{ userId: string; username: string } | null>(null);
  const [banDuration, setBanDuration] = useState<string>('7');

  // Manage tab
  const [expandedAnimeId, setExpandedAnimeId] = useState<string | null>(null);
  const [manageSearch, setManageSearch] = useState('');

  // Episode edit modal
  interface EditingEp { animeId: string; episodeId: string; number: string; title: string; thumbnail: string; fansubs: FansubRow[]; }
  const [editingEp, setEditingEp] = useState<EditingEp | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  
  // Episode Form
  const [selectedAnimeId, setSelectedAnimeId] = useState('');
  const [episodeRows, setEpisodeRows] = useState<EpisodeRow[]>([newEpisodeRow()]);
  const [epFetchUrl, setEpFetchUrl] = useState<Record<string, string>>({});
  const [epFetchLoading, setEpFetchLoading] = useState<Record<string, boolean>>({});
  const [epFetchStatus, setEpFetchStatus] = useState<Record<string, 'ok' | 'error' | null>>({});

  const addRow = () => setEpisodeRows(prev => [...prev, newEpisodeRow()]);
  const removeRow = (id: string) => setEpisodeRows(prev => prev.filter(r => r.id !== id));
  const updateRow = (id: string, field: 'number' | 'title' | 'thumbnail', value: string) =>
    setEpisodeRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));

  // Fansub ops
  const addFansub = (rowId: string) =>
    setEpisodeRows(prev => prev.map(r => r.id === rowId ? { ...r, fansubs: [...r.fansubs, newFansubRow(rowId + r.fansubs.length)] } : r));
  const removeFansub = (rowId: string, fbId: string) =>
    setEpisodeRows(prev => prev.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.filter(f => f.id !== fbId) } : r));
  const updateFansubName = (rowId: string, fbId: string, name: string) =>
    setEpisodeRows(prev => prev.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, name } : f) } : r));

  // Source ops (within a fansub)
  const addSource = (rowId: string, fbId: string) =>
    setEpisodeRows(prev => prev.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, sources: [...f.sources, { id: Date.now().toString(), name: 'Sibnet', url: '' }] } : f) } : r));
  const removeSource = (rowId: string, fbId: string, srcId: string) =>
    setEpisodeRows(prev => prev.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, sources: f.sources.filter(s => s.id !== srcId) } : f) } : r));
  const updateSource = (rowId: string, fbId: string, srcId: string, field: 'name' | 'url', value: string) =>
    setEpisodeRows(prev => prev.map(r => r.id === rowId ? { ...r, fansubs: r.fansubs.map(f => f.id === fbId ? { ...f, sources: f.sources.map(s => s.id === srcId ? { ...s, [field]: value } : s) } : f) } : r));
  const handleSourcePaste = (rowId: string, fbId: string, srcId: string, e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').trim();
    if (!pasted.startsWith('http')) return;
    e.preventDefault();
    const parsed = parseVideoLink(pasted);
    setEpisodeRows(prev => prev.map(r => {
      if (r.id !== rowId) return r;
      const newFansubs = r.fansubs.map(f => f.id !== fbId ? f : { ...f, sources: f.sources.map(s => s.id === srcId ? { ...s, name: parsed.name, url: parsed.embedUrl } : s) });
      const newThumbnail = parsed.thumbnail && !r.thumbnail ? parsed.thumbnail : r.thumbnail;
      return { ...r, fansubs: newFansubs, thumbnail: newThumbnail };
    }));
  };

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  // News state
  const [newsList, setNewsList] = useState<NewsItem[]>([]);
  const [newsForm, setNewsForm] = useState({ title: '', excerpt: '', content: '', image: '', category: 'Haber' });
  const [newsLinks, setNewsLinks] = useState<{ id: string; label: string; url: string }[]>([]);
  const [annUrl, setAnnUrl] = useState('');
  const [annLoading, setAnnLoading] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [newsEditForm, setNewsEditForm] = useState({ title: '', excerpt: '', content: '', image: '', category: '' });
  const [newsSaving, setNewsSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== UserRole.ADMIN) {
      navigate('/');
      return;
    }
    loadData();
  }, [authLoading, activeTab]); // user intentionally omitted — ProtectedRoute handles auth

  const loadRequests = async () => {
    setRequestsLoading(true);
    try { setRequests(await getAnimeRequests()); } catch { /* ignore */ } finally { setRequestsLoading(false); }
  };

  const loadReports = async () => {
    setReportsLoading(true);
    try { setReports(await getReports()); } catch { /* ignore */ } finally { setReportsLoading(false); }
  };

  const loadContributions = async () => {
    setContributionsLoading(true);
    try { setContributions(await getPendingContributions()); } catch { /* ignore */ } finally { setContributionsLoading(false); }
  };

  // Unique visitor count (localStorage based, device+browser = 1 visit per day)
  const getVisitorCount = () => {
    try {
      const KEY = 'anipal_visitors';
      const TODAY = new Date().toISOString().slice(0, 10);
      // Register this device's visit
      const myKey = 'anipal_my_visit';
      const myVisit = localStorage.getItem(myKey);
      if (myVisit !== TODAY) {
        localStorage.setItem(myKey, TODAY);
        const visitors: Record<string, number> = JSON.parse(localStorage.getItem(KEY) || '{}');
        visitors[TODAY] = (visitors[TODAY] || 0) + 1;
        // Keep last 30 days only
        const sorted = Object.entries(visitors).sort(([a], [b]) => b.localeCompare(a)).slice(0, 30);
        localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(sorted)));
      }
      const visitors: Record<string, number> = JSON.parse(localStorage.getItem(KEY) || '{}');
      const total = Object.values(visitors).reduce((a, b) => a + b, 0);
      setVisitorCount(total);
    } catch {}
  };

  const loadData = async () => {
    getVisitorCount();
    try {
      const isAdmin = user?.role === UserRole.ADMIN;
      const [nl, animeData, statsData, userData] = await Promise.all([
        getNews(true),
        !isEditor ? getAnimes({ status: undefined }) : Promise.resolve([]),
        isAdmin ? getSiteStats() : Promise.resolve(null),
        isAdmin ? getUsers() : Promise.resolve([]),
      ]);
      setNewsList(nl);
      if (!isEditor) setAnimes(animeData);
      if (isAdmin) { setStats(statsData); setUserList(userData); }
    } catch (err) {
      console.error('AdminDashboard loadData error:', err);
      setMsg({ type: 'error', text: 'Veriler yüklenirken hata oluştu.' });
    }
  };

  const handleDeleteAnime = async (animeId: string, title: string) => {
    if (!window.confirm(`"${title}" animesini silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteAnime(animeId);
      setMsg({ type: 'success', text: 'Anime silindi.' });
      setExpandedAnimeId(null);
      loadData();
    } catch {
      setMsg({ type: 'error', text: 'Silinemedi.' });
    }
  };

  const handleDeleteEpisode = async (animeId: string, episodeId: string, epTitle: string) => {
    if (!window.confirm(`"${epTitle}" bölümünü silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteEpisode(animeId, episodeId);
      setMsg({ type: 'success', text: 'Bölüm silindi.' });
      loadData();
    } catch {
      setMsg({ type: 'error', text: 'Silinemedi.' });
    }
  };

  const handleEditEpisode = (animeId: string, ep: any) => {
    let fansubs: FansubRow[];
    if (ep.fansubs?.length) {
      fansubs = ep.fansubs.map((f: any, fi: number) => ({
        id: `ef${fi}`,
        name: f.name,
        sources: f.sources.map((s: any, si: number) => ({ id: `es${fi}-${si}`, name: s.name, url: s.url })),
      }));
    } else {
      const sources = ep.sources?.length
        ? ep.sources.map((s: any, i: number) => ({ id: `es${i}`, name: s.name, url: s.url }))
        : [{ id: 'es0', name: 'Fembed', url: ep.videoUrl || '' }];
      fansubs = [{ id: 'ef0', name: ep.fansub || '', sources }];
    }
    setEditingEp({ animeId, episodeId: ep.id, number: String(ep.number), title: ep.title || '', thumbnail: ep.thumbnail || '', fansubs });
  };

  const handleSaveEdit = async () => {
    if (!editingEp) return;
    setEditSaving(true);
    try {
      const fansubs = editingEp.fansubs.map(f => ({ name: f.name, sources: f.sources.filter(s => s.url).map(s => ({ name: s.name, url: s.url })) })).filter(f => f.sources.length > 0);
      await updateEpisode(editingEp.animeId, editingEp.episodeId, {
        number: parseInt(editingEp.number),
        title: editingEp.title,
        thumbnail: editingEp.thumbnail,
        fansub: editingEp.fansubs[0]?.name || '',
        videoUrl: editingEp.fansubs[0]?.sources[0]?.url || '',
        sources: editingEp.fansubs[0]?.sources.filter(s => s.url).map(s => ({ name: s.name, url: s.url })) || [],
        fansubs,
      });
      setMsg({ type: 'success', text: 'Bölüm güncellendi.' });
      setEditingEp(null);
      loadData();
    } catch {
      setMsg({ type: 'error', text: 'Güncellenemedi.' });
    } finally {
      setEditSaving(false);
    }
  };

  const handleFetchANN = async () => {
    if (!annUrl.trim()) return;
    setAnnLoading(true);
    try {
      const result = await fetchANNArticle(annUrl.trim());
      setNewsForm({ title: result.title, excerpt: result.excerpt, content: result.content, image: result.image, category: result.category });
      setMsg({ type: 'success', text: 'Haber çekildi, formu kontrol edip yayınlayabilirsiniz.' });
    } catch (e: any) {
      setMsg({ type: 'error', text: 'ANN sayfası alınamadı: ' + e.message });
    } finally {
      setAnnLoading(false);
    }
  };

  const handleCreateNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setNewsSaving(true);
    try {
      const links = newsLinks.filter(l => l.label && l.url).map(l => ({ label: l.label, url: l.url }));
      await createNews({ ...newsForm, links }, user);
      setMsg({ type: 'success', text: user.role === UserRole.ADMIN ? 'Haber yayınlandı.' : 'Haber onaya gönderildi.' });
      setNewsForm({ title: '', excerpt: '', content: '', image: '', category: 'Haber' });
      setNewsLinks([]);
      setAnnUrl('');
      loadData();
    } catch {
      setMsg({ type: 'error', text: 'Haber oluşturulamadı.' });
    } finally {
      setNewsSaving(false);
    }
  };

  const [newsEditLinks, setNewsEditLinks] = useState<{ id: string; label: string; url: string }[]>([]);

  const handleOpenEditNews = (item: NewsItem) => {
    setEditingNews(item);
    setNewsEditForm({ title: item.title, excerpt: item.excerpt, content: item.content, image: item.image, category: item.category });
    setNewsEditLinks((item.links || []).map((l, i) => ({ id: `el${i}`, label: l.label, url: l.url })));
  };

  const handleSaveEditNews = async () => {
    if (!editingNews) return;
    setNewsSaving(true);
    try {
      const links = newsEditLinks.filter(l => l.label && l.url).map(l => ({ label: l.label, url: l.url }));
      await updateNews(editingNews.id, { ...newsEditForm, links, ...(isEditor ? { status: 'pending' as const } : {}) });
      setMsg({ type: 'success', text: 'Haber güncellendi.' });
      setEditingNews(null);
      loadData();
    } catch {
      setMsg({ type: 'error', text: 'Güncellenemedi.' });
    } finally {
      setNewsSaving(false);
    }
  };

  const handleDeleteNews = async (id: string, title: string) => {
    if (!window.confirm(`"${title}" haberini silmek istiyor musunuz?`)) return;
    await deleteNews(id);
    setMsg({ type: 'success', text: 'Haber silindi.' });
    loadData();
  };

  const handleApproveNews = async (id: string) => {
    await approveNews(id);
    setMsg({ type: 'success', text: 'Haber yayınlandı.' });
    loadData();
  };

  const handleApprove = async (id: string) => {
      await approveAnime(id);
      loadData();
      setMsg({ type: 'success', text: 'Anime onaylandı.' });
  };

  const handleUnban = async (uid: string) => {
      try {
          await unbanUser(uid);
          loadData();
      } catch (e: any) {
          alert(e.message);
      }
  };

  const handleBanConfirm = async () => {
      if (!banModal) return;
      try {
          const days = banDuration === 'permanent' ? null : parseInt(banDuration, 10);
          await banUser(banModal.userId, days);
          setBanModal(null);
          loadData();
      } catch (e: any) {
          alert(e.message);
      }
  };

  const handleDeleteUser = async (uid: string, username: string) => {
      if (!window.confirm(`"${username}" kullanıcısını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
      try {
          await deleteUser(uid);
          setUserList(prev => prev.filter(u => u.id !== uid));
      } catch (e: any) {
          alert(e.message);
      }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
      try {
          await updateUserRole(uid, newRole);
          loadData();
          setMsg({ type: 'success', text: `Kullanıcı yetkisi güncellendi: ${newRole}` });
      } catch (e: any) {
          setMsg({ type: 'error', text: 'Yetki güncellenemedi.' });
      }
  };
  
  const handleFetchEpisodeEmbed = async (rowId: string) => {
    const url = (epFetchUrl[rowId] || '').trim();
    if (!url) return;
    setEpFetchLoading(p => ({ ...p, [rowId]: true }));
    setEpFetchStatus(p => ({ ...p, [rowId]: null }));

    let result: EmbedResult;
    try {
      const res = await fetch('http://localhost:3001/api/embeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      result = await res.json();
    } catch {
      setEpFetchStatus(p => ({ ...p, [rowId]: 'error' }));
      setEpFetchLoading(p => ({ ...p, [rowId]: false }));
      return;
    }

    if (!result.error && (result.embeds.length > 0 || result.fansubs?.length)) {
      setEpisodeRows(prev => prev.map(row => {
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
      }));
      setEpFetchStatus(p => ({ ...p, [rowId]: 'ok' }));
    } else {
      setEpFetchStatus(p => ({ ...p, [rowId]: 'error' }));
    }
    setEpFetchLoading(p => ({ ...p, [rowId]: false }));
  };

  const handleAddEpisodes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAnimeId) { setMsg({ type: 'error', text: 'Lütfen bir anime seçin.' }); return; }
    setLoading(true);
    try {
      const eps = episodeRows.map(r => ({
        number: parseInt(r.number),
        title: r.title,
        videoUrl: r.fansubs[0]?.sources[0]?.url || '',
        sources: r.fansubs[0]?.sources.filter(s => s.url).map(s => ({ name: s.name, url: s.url })) || [],
        fansubs: r.fansubs.map(f => ({ name: f.name, sources: f.sources.filter(s => s.url).map(s => ({ name: s.name, url: s.url })) })).filter(f => f.sources.length > 0),
        thumbnail: r.thumbnail,
        fansub: r.fansubs[0]?.name || '',
      }));
      await addEpisodes(selectedAnimeId, eps);
      setMsg({ type: 'success', text: `${eps.length} bölüm başarıyla eklendi!` });
      setEpisodeRows([newEpisodeRow()]);
      loadData();
    } catch (err) {
      setMsg({ type: 'error', text: 'Bölüm eklenemedi.' });
    } finally {
      setLoading(false);
    }
  };

  const isModerator = user?.role === UserRole.MODERATOR;
  const NEWS_CATEGORIES = ['Haber', 'Duyuru', 'Yeni Sezon', 'Live Action', 'İnceleme', 'Röportaj', 'Platform', 'Özel'];

  const filteredUsers = userList.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <>
    <div className="max-w-6xl mx-auto space-y-6 min-h-screen pb-20 pt-24 sm:pt-28 px-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <h1 className="text-xl sm:text-3xl font-black text-white flex items-center gap-2">
             <ShieldAlert className="text-amber-500" size={24} />
             {isEditor ? 'Editör Paneli' : isModerator ? 'Moderatör Paneli' : 'Yönetim Merkezi'}
          </h1>
          <div className="text-xs sm:text-sm text-gray-500 bg-gray-900 px-3 py-1.5 rounded-full">
              Yetki: <span className="text-white font-bold uppercase">{user?.role}</span>
          </div>
      </div>

      {/* Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-800 pb-1">
          {!isModerator && !isEditor && (
             <TabButton active={activeTab==='stats'} onClick={()=>setActiveTab('stats')} icon={<Activity size={18}/>}>İstatistikler</TabButton>
          )}
          <TabButton active={activeTab==='news'} onClick={()=>setActiveTab('news')} icon={<Activity size={18}/>}>Haberler</TabButton>
          {!isEditor && (
            <>
              <TabButton active={activeTab==='manage'} onClick={()=>setActiveTab('manage')} icon={<Trash2 size={18}/>}>Düzenle & Sil</TabButton>
            </>
          )}
          {!isModerator && !isEditor && (
             <>
                <TabButton active={activeTab==='moderation'} onClick={()=>{ setActiveTab('moderation'); loadContributions(); }} icon={<CheckCircle size={18}/>}>Onay Bekleyenler</TabButton>
                <TabButton active={activeTab==='users'} onClick={()=>setActiveTab('users')} icon={<Users size={18}/>}>Kullanıcılar</TabButton>
                <TabButton active={activeTab==='community'} onClick={()=>{ setActiveTab('community'); loadRequests(); loadReports(); }} icon={<Flag size={18}/>}>İstek & Şikayetler</TabButton>
                <TabButton active={activeTab==='assets'} onClick={()=>setActiveTab('assets')} icon={<ImageIcon size={18}/>}>Site Görselleri</TabButton>
             </>
          )}
      </div>

      {msg && (
        <div className={`p-4 rounded border ${msg.type === 'success' ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-red-900/20 border-red-800 text-red-400'}`}>
           {msg.text}
        </div>
      )}

      {/* CONTENT AREAS */}
      
      {activeTab === 'stats' && (
        stats ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6">
              <StatCard title="Toplam Kullanıcı" value={stats.totalUsers} icon={<Users className="text-blue-500"/>} />
              <StatCard title="Toplam Anime" value={stats.totalAnimes} icon={<PlaySquare className="text-purple-500"/>} />
              <StatCard title="Onay Bekleyen" value={stats.pendingAnimes} icon={<CheckCircle className="text-amber-500"/>} />
              <StatCard title="Toplam Yorum" value={stats.totalComments} icon={<Activity className="text-green-500"/>} />
            </div>
            <div className="bg-[#18181b] border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-bold text-sm mb-4 flex items-center gap-2"><Globe size={16} className="text-amber-500"/> Site Trafiği</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-900 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-amber-500">{visitorCount}</p>
                  <p className="text-xs text-gray-500 mt-1">Son 30 gün ziyaretçi</p>
                  <p className="text-[10px] text-gray-600 mt-1">Her cihaz günde 1 kez sayılır</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-blue-400">
                    {(() => {
                      try {
                        const visitors: Record<string, number> = JSON.parse(localStorage.getItem('anipal_visitors') || '{}');
                        const today = new Date().toISOString().slice(0, 10);
                        return visitors[today] || 0;
                      } catch { return 0; }
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Bugünkü ziyaretçi</p>
                </div>
                <div className="bg-gray-900 rounded-xl p-4 text-center">
                  <p className="text-3xl font-black text-green-400">
                    {(() => {
                      try {
                        const visitors: Record<string, number> = JSON.parse(localStorage.getItem('anipal_visitors') || '{}');
                        const entries = Object.entries(visitors).sort(([a], [b]) => b.localeCompare(a));
                        return entries.length > 0 ? Math.max(...Object.values(visitors)) : 0;
                      } catch { return 0; }
                    })()}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Tek günde en fazla</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-amber-500" />
          </div>
        )
      )}

      {activeTab === 'assets' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">Site Görselleri</h2>
            <p className="text-sm text-gray-500">Yüklenen görseller Supabase Storage'a kaydedilir. Her yüklemede URL değişir, tarayıcı önbelleği sorunu olmaz.</p>
          </div>

          {/* Crop modal */}
          {assetCrop && (
            <ImageCropModal
              imageSrc={assetCrop.src}
              type={assetCrop.asset.cropType}
              outputOverride={{ w: assetCrop.asset.outputW, h: assetCrop.asset.outputH }}
              onCancel={() => setAssetCrop(null)}
              onConfirm={async (dataUrl) => {
                setAssetCrop(null);
                setAssetSaving(assetCrop.asset.key);
                setAssetMsg(null);
                try {
                  await uploadAndSave(assetCrop.asset.key, dataUrl);
                  setAssetMsg({ key: assetCrop.asset.key, type: 'success', text: 'Başarıyla güncellendi!' });
                } catch (e: any) {
                  setAssetMsg({ key: assetCrop.asset.key, type: 'error', text: e.message || 'Yükleme başarısız.' });
                } finally {
                  setAssetSaving(null);
                }
              }}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SITE_ASSETS.map(asset => {
              const currentUrl = siteSettings[asset.key];
              const saving = assetSaving === asset.key;
              const msg = assetMsg?.key === asset.key ? assetMsg : null;
              return (
                <div key={asset.key} className="bg-[#18181b] border border-gray-800 rounded-xl p-5 space-y-4">
                  <div>
                    <h3 className="font-bold text-white text-sm">{asset.label}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{asset.description}</p>
                  </div>

                  {/* Current preview */}
                  <div className="flex items-center gap-4">
                    <div className={`flex-shrink-0 bg-gray-900 border border-gray-700 flex items-center justify-center overflow-hidden ${asset.key === 'favicon' ? 'w-16 h-16 rounded-lg' : 'w-20 h-20 rounded-xl'}`}>
                      {currentUrl
                        ? <img src={currentUrl} alt={asset.label} className="w-full h-full object-contain" />
                        : <ImageIcon size={24} className="text-gray-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      {currentUrl
                        ? <p className="text-xs text-gray-500 break-all line-clamp-2">{currentUrl}</p>
                        : <p className="text-xs text-gray-600 italic">Henüz özel görsel yok, varsayılan kullanılıyor.</p>
                      }
                    </div>
                  </div>

                  {msg && (
                    <div className={`text-xs px-3 py-2 rounded-lg font-medium ${msg.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
                      {msg.text}
                    </div>
                  )}

                  {/* Hidden file input */}
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    ref={el => { assetFileRefs.current[asset.key] = el; }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (!file) return;
                      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
                      if (!allowed.includes(file.type)) {
                        setAssetMsg({ key: asset.key, type: 'error', text: 'Sadece JPG, PNG, WEBP kabul edilir.' });
                        return;
                      }
                      if (file.size > 3 * 1024 * 1024) {
                        setAssetMsg({ key: asset.key, type: 'error', text: 'Dosya 3MB sınırını aşıyor.' });
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => setAssetCrop({ src: reader.result as string, asset });
                      reader.readAsDataURL(file);
                    }}
                  />

                  <button
                    onClick={() => assetFileRefs.current[asset.key]?.click()}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-sm rounded-xl transition-colors"
                  >
                    {saving ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {saving ? 'Yükleniyor...' : 'Görsel Seç & Değiştir'}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Info box */}
          <div className="bg-blue-900/10 border border-blue-900/30 rounded-xl p-4 text-sm text-blue-300">
            <p className="font-bold mb-1">Supabase kurulumu gerekiyor mu?</p>
            <p className="text-xs text-blue-400 leading-relaxed">
              Bu özellik için Supabase'de <code className="bg-blue-900/40 px-1 rounded">site-assets</code> adlı bir <strong>public Storage bucket</strong> ve
              <code className="bg-blue-900/40 px-1 rounded mx-1">site_settings</code> tablosu gerekir.
              <br/>SQL: <code className="bg-blue-900/40 px-1 rounded">CREATE TABLE site_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ DEFAULT now());</code>
            </p>
          </div>
        </div>
      )}

      {activeTab === 'manage' && (
          <div className="space-y-3">
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => navigate('/admin/add-anime')} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors">
                  <PlaySquare size={15}/> Anime Ekle
                </button>
              </div>
              {/* Search bar */}
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                  <input
                      type="text"
                      placeholder="Anime ara..."
                      value={manageSearch}
                      onChange={e => setManageSearch(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2.5 pl-9 pr-4 text-white text-sm focus:border-amber-500 focus:outline-none"
                  />
              </div>

              {animes.length === 0 && <p className="text-gray-600 text-center py-10">Henüz anime yok.</p>}
              {animes
                .filter(a => a.title.toLowerCase().includes(manageSearch.toLowerCase()))
                .map(anime => (
                  <div key={anime.id} className="bg-[#18181b] border border-gray-800 rounded-xl overflow-hidden">
                      {/* Anime row */}
                      <div className="flex items-center gap-3 p-3 sm:p-4">
                          <img src={anime.coverImage} className="w-10 h-14 object-cover rounded flex-shrink-0" alt="" onError={e => (e.target as HTMLImageElement).style.display='none'} />
                          <div className="flex-1 min-w-0">
                              <p className="text-white font-bold text-sm truncate">{anime.title}</p>
                              <p className="text-xs text-gray-500">{(anime.episodes || []).length} bölüm · <span className={anime.status === AnimeStatus.APPROVED ? 'text-green-500' : 'text-amber-500'}>{anime.status === AnimeStatus.APPROVED ? 'Yayında' : 'Onay Bekliyor'}</span></p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                  onClick={() => setExpandedAnimeId(expandedAnimeId === anime.id ? null : anime.id)}
                                  className="p-2 text-gray-400 hover:text-white transition-colors"
                              >
                                  {expandedAnimeId === anime.id ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                              </button>
                              <button
                                  onClick={() => handleDeleteAnime(anime.id, anime.title)}
                                  className="p-2 text-red-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
                              >
                                  <Trash2 size={16}/>
                              </button>
                          </div>
                      </div>

                      {/* Episodes (expanded) */}
                      {expandedAnimeId === anime.id && (
                          <div className="border-t border-gray-800 bg-gray-900/50">
                              {(anime.episodes || []).length === 0 && (
                                  <p className="text-gray-600 text-sm p-4 text-center">Bölüm yok.</p>
                              )}
                              {[...(anime.episodes || [])].sort((a,b) => a.number - b.number).map(ep => (
                                  <div key={ep.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/50 last:border-0">
                                      {ep.thumbnail
                                          ? <img src={ep.thumbnail} className="w-14 h-9 object-cover rounded flex-shrink-0" alt="" />
                                          : <div className="w-14 h-9 bg-gray-800 rounded flex-shrink-0 flex items-center justify-center text-gray-600 text-xs font-bold">{ep.number}</div>
                                      }
                                      <div className="flex-1 min-w-0">
                                          <p className="text-sm text-gray-300 truncate">{ep.number}. {ep.title}</p>
                                          {ep.fansub && <p className="text-xs text-amber-500">{ep.fansub}</p>}
                                          {ep.sources && ep.sources.length > 0 && (
                                              <p className="text-xs text-gray-600 truncate">{ep.sources.map((s: any) => s.name).join(', ')}</p>
                                          )}
                                      </div>
                                      <div className="flex items-center gap-1 flex-shrink-0">
                                          <button
                                              onClick={() => handleEditEpisode(anime.id, ep)}
                                              className="p-1.5 text-amber-500 hover:text-amber-400 hover:bg-amber-900/20 rounded transition-colors"
                                              title="Düzenle"
                                          >
                                              <Pencil size={13}/>
                                          </button>
                                          <button
                                              onClick={() => handleDeleteEpisode(anime.id, ep.id, ep.title)}
                                              className="p-1.5 text-red-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
                                          >
                                              <Trash2 size={13}/>
                                          </button>
                                      </div>
                                  </div>
                              ))}
                              <div className="p-3 border-t border-gray-800">
                                  <button
                                      onClick={() => navigate(`/admin/add-episode/${anime.id}`)}
                                      className="text-xs text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1"
                                  >
                                      <Plus size={11}/> Bu animeye bölüm ekle
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              ))}
          </div>
      )}

      {activeTab === 'moderation' && (
          <div className="space-y-4">
            {/* Moderation inner tabs */}
            <div className="flex gap-2 border-b border-gray-800 pb-1 flex-wrap">
              <button onClick={() => setModerationTab('animes')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px ${moderationTab === 'animes' ? 'text-amber-500 border-amber-500' : 'text-gray-400 border-transparent hover:text-white'}`}>
                <PlaySquare size={15}/> Anime Onayları <span className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">{animes.filter(a => a.status === AnimeStatus.PENDING).length}</span>
              </button>
              <button onClick={() => setModerationTab('episodes')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px ${moderationTab === 'episodes' ? 'text-amber-500 border-amber-500' : 'text-gray-400 border-transparent hover:text-white'}`}>
                <Film size={15}/> Bölüm Onayları <span className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">{contributions.filter(c => (c.type || 'episode') === 'episode' && (c.status === 'pending' || c.pendingAction)).length}</span>
              </button>
              <button onClick={() => setModerationTab('sources')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px ${moderationTab === 'sources' ? 'text-amber-500 border-amber-500' : 'text-gray-400 border-transparent hover:text-white'}`}>
                <Link2 size={15}/> Kaynak Onayları <span className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">{contributions.filter(c => c.type === 'source' && (c.status === 'pending' || c.pendingAction)).length}</span>
              </button>
              <button onClick={() => setModerationTab('news')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px ${moderationTab === 'news' ? 'text-amber-500 border-amber-500' : 'text-gray-400 border-transparent hover:text-white'}`}>
                <Activity size={15}/> Haber Onayları <span className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">{newsList.filter(n => n.status === 'pending').length}</span>
              </button>
            </div>

            {/* Anime Onayları */}
            {moderationTab === 'animes' && (
              <div className="space-y-3">
                {animes.filter(a => a.status === AnimeStatus.PENDING).length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-10">Bekleyen anime yok.</p>
                ) : (
                  animes.filter(a => a.status === AnimeStatus.PENDING).map(anime => (
                    <div key={anime.id} className="bg-gray-900 p-4 rounded-xl flex items-center justify-between border border-gray-800">
                      <div className="flex items-center gap-4">
                        <img src={anime.coverImage} className="w-12 h-16 object-cover rounded" />
                        <div>
                          <div className="font-bold text-white">{anime.title}</div>
                          <div className="text-xs text-gray-500">Yükleyen: {anime.uploadedBy}</div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleApprove(anime.id)}>Onayla</Button>
                        <Button size="sm" variant="danger">Reddet</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Bölüm Onayları & Kaynak Onayları (shared contribution card UI) */}
            {(moderationTab === 'episodes' || moderationTab === 'sources') && (() => {
              const typeFilter = moderationTab === 'episodes' ? 'episode' : 'source';
              const filtered = contributions.filter(c => (c.type || 'episode') === typeFilter);
              const sorted = [
                ...filtered.filter(c => c.pendingAction),
                ...filtered.filter(c => !c.pendingAction && c.status === 'pending'),
                ...filtered.filter(c => !c.pendingAction && c.status === 'approved'),
                ...filtered.filter(c => !c.pendingAction && c.status === 'rejected'),
              ];
              if (contributionsLoading) return <div className="text-gray-500 text-sm text-center py-10">Yükleniyor...</div>;
              if (sorted.length === 0) return <div className="text-center py-12 text-gray-600 text-sm">Bekleyen onay yok.</div>;
              return (
                <div className="space-y-3">
                  {sorted.map(c => (
                    <div key={c.id} className="bg-[#18181b] border border-gray-800 rounded-xl p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            {c.type === 'source' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-purple-500/10 text-purple-400 border-purple-500/30">Kaynak Katkısı</span>}
                            {c.pendingAction === 'edit' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/30">Düzenleme İsteği</span>}
                            {c.pendingAction === 'delete' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/30">Silme İsteği</span>}
                            {!c.pendingAction && c.status === 'pending' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30">Onay Bekliyor</span>}
                            {!c.pendingAction && c.status === 'approved' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/30">Onaylandı</span>}
                            {!c.pendingAction && c.status === 'rejected' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/30">Reddedildi</span>}
                          </div>
                          <p className="text-xs text-gray-400">
                            <span className="text-gray-500">Gönderen:</span> <span className="text-white font-bold">{c.submitterUsername || c.submittedBy.slice(0, 8)}</span>
                          </p>
                          <p className="text-sm text-white font-medium">
                            Bölüm {c.episodeNumber}: {c.episodeTitle}
                          </p>
                          <p className="text-xs text-gray-500">
                            <span className="text-gray-600">Anime:</span> {c.animeId} &nbsp;·&nbsp;
                            <span className="text-amber-400 font-medium">{c.fansubName}</span> &nbsp;·&nbsp;
                            {c.sources?.length || 0} kaynak
                          </p>
                          {c.pendingAction === 'edit' && c.pendingData && (
                            <div className="text-xs text-blue-300 bg-blue-900/10 border border-blue-900/30 rounded-lg p-2 mt-1 space-y-0.5">
                              <p className="font-bold">İstenen Değişiklikler:</p>
                              {c.pendingData.fansubName && <p>Fansub: <span className="text-white">{c.pendingData.fansubName}</span></p>}
                              {c.pendingData.episodeTitle && <p>Başlık: <span className="text-white">{c.pendingData.episodeTitle}</span></p>}
                              {c.pendingData.sources && <p>Kaynaklar: <span className="text-white">{c.pendingData.sources.length} kaynak</span></p>}
                            </div>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-600 flex-shrink-0">{new Date(c.createdAt).toLocaleDateString('tr-TR')}</p>
                      </div>

                      {rejectTarget === c.id && (
                        <div className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Admin notu (isteğe bağlı)..."
                            value={rejectNote}
                            onChange={e => setRejectNote(e.target.value)}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs focus:border-red-500 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={async () => {
                              try {
                                if (c.pendingAction) await rejectContributionAction(c.id);
                                else await rejectContribution(c.id, rejectNote || undefined);
                                setRejectTarget(null); setRejectNote(''); loadContributions();
                              } catch (e: any) { alert(e.message); }
                            }}
                            className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex-shrink-0"
                          >
                            Reddet
                          </button>
                          <button onClick={() => { setRejectTarget(null); setRejectNote(''); }} className="text-xs text-gray-400 hover:text-white p-1"><X size={14}/></button>
                        </div>
                      )}

                      <div className="flex gap-2 flex-wrap">
                        {c.pendingAction ? (
                          <>
                            <button
                              onClick={async () => { try { await approveContributionAction(c.id); loadContributions(); } catch (e: any) { alert(e.message); } }}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors"
                            >
                              Değişikliği Onayla
                            </button>
                            {rejectTarget !== c.id && (
                              <button onClick={() => { setRejectTarget(c.id); setRejectNote(''); }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                                Reddet
                              </button>
                            )}
                          </>
                        ) : c.status === 'pending' ? (
                          <>
                            <button
                              onClick={async () => { try { await approveContribution(c.id); loadContributions(); } catch (e: any) { alert(e.message); } }}
                              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors"
                            >
                              Onayla
                            </button>
                            {rejectTarget !== c.id && (
                              <button onClick={() => { setRejectTarget(c.id); setRejectNote(''); }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">
                                Reddet
                              </button>
                            )}
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Haber Onayları */}
            {moderationTab === 'news' && (
              <div className="space-y-3">
                {newsList.filter(n => n.status === 'pending').length === 0 ? (
                  <p className="text-gray-500 text-sm text-center py-10">Bekleyen haber yok.</p>
                ) : (
                  newsList.filter(n => n.status === 'pending').map(item => (
                    <div key={item.id} className="bg-gray-900 p-4 rounded-xl flex items-start gap-4 border border-gray-800">
                      {item.image && <img src={item.image} className="w-20 h-14 object-cover rounded flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display='none'} />}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-white text-sm truncate">{item.title}</div>
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.excerpt}</div>
                        <div className="text-xs text-gray-600 mt-1">{item.category} · {new Date(item.createdAt).toLocaleDateString('tr-TR')}</div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <Button size="sm" onClick={() => handleApproveNews(item.id)}>Onayla</Button>
                        <Button size="sm" variant="danger" onClick={() => handleDeleteNews(item.id, item.title)}>Reddet</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
      )}

      {activeTab === 'news' && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left: add form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-[#18181b] border border-gray-800 rounded-xl p-4 space-y-3">
              <h3 className="text-white font-bold text-sm">ANN'den Haber Çek</h3>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://www.animenewsnetwork.com/news/..."
                  value={annUrl}
                  onChange={e => setAnnUrl(e.target.value)}
                  className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-xs focus:border-amber-500 focus:outline-none"
                />
                <button
                  onClick={handleFetchANN}
                  disabled={annLoading || !annUrl.trim()}
                  className="px-3 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {annLoading ? 'Çekiliyor...' : 'Çek'}
                </button>
              </div>
              <p className="text-xs text-gray-600">Link yapıştır, içerik otomatik Türkçeye çevrilir.</p>
            </div>

            <form onSubmit={handleCreateNews} className="bg-[#18181b] border border-gray-800 rounded-xl p-4 space-y-3">
              <h3 className="text-white font-bold text-sm">Haber Formu</h3>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Başlık *</label>
                <input required type="text" value={newsForm.title} onChange={e => setNewsForm(p => ({ ...p, title: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Özet *</label>
                <textarea required rows={2} value={newsForm.excerpt} onChange={e => setNewsForm(p => ({ ...p, excerpt: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">İçerik *</label>
                <textarea required rows={5} value={newsForm.content} onChange={e => setNewsForm(p => ({ ...p, content: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Resim URL</label>
                <input type="url" value={newsForm.image} onChange={e => setNewsForm(p => ({ ...p, image: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none" placeholder="https://..." />
                {newsForm.image && <img src={newsForm.image} className="w-full h-24 object-cover rounded-lg border border-gray-700 mt-1" onError={e => (e.target as HTMLImageElement).style.display='none'} />}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Kategori</label>
                <select value={newsForm.category} onChange={e => setNewsForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none">
                  {NEWS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Bağlantılar (fragman, video...)</label>
                  <button type="button" onClick={() => setNewsLinks(p => [...p, { id: Date.now().toString(), label: '', url: '' }])} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"><Plus size={11}/> Ekle</button>
                </div>
                {newsLinks.map(link => (
                  <div key={link.id} className="flex gap-2 items-center">
                    <input type="text" placeholder="Etiket (Fragman...)" value={link.label} onChange={e => setNewsLinks(p => p.map(l => l.id === link.id ? { ...l, label: e.target.value } : l))} className="w-28 flex-shrink-0 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-xs focus:border-amber-500 focus:outline-none" />
                    <input type="url" placeholder="https://..." value={link.url} onChange={e => setNewsLinks(p => p.map(l => l.id === link.id ? { ...l, url: e.target.value } : l))} className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-xs focus:border-amber-500 focus:outline-none" />
                    <button type="button" onClick={() => setNewsLinks(p => p.filter(l => l.id !== link.id))} className="text-red-500 hover:text-red-400 p-1 flex-shrink-0"><X size={13}/></button>
                  </div>
                ))}
              </div>
              <button type="submit" disabled={newsSaving} className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors disabled:opacity-60">
                {newsSaving ? 'Gönderiliyor...' : user?.role === UserRole.ADMIN ? 'Yayınla' : 'Onaya Gönder'}
              </button>
            </form>
          </div>

          {/* Right: news list */}
          <div className="lg:col-span-3 space-y-3">
            <h3 className="text-white font-bold text-sm">Tüm Haberler ({newsList.length})</h3>
            {newsList.length === 0 && <p className="text-gray-600 text-center py-10">Henüz haber yok.</p>}
            {newsList.map(item => (
              <div key={item.id} className="bg-[#18181b] border border-gray-800 rounded-xl overflow-hidden flex gap-0">
                {item.image && <img src={item.image} className="w-24 h-full min-h-[72px] object-cover flex-shrink-0" onError={e => (e.target as HTMLImageElement).style.display='none'} />}
                <div className="flex-1 min-w-0 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-white text-sm font-bold line-clamp-2 leading-tight">{item.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{item.category} · {new Date(item.createdAt).toLocaleDateString('tr-TR')}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 ${item.status === 'published' ? 'bg-green-900/30 text-green-400' : 'bg-amber-900/30 text-amber-400'}`}>
                      {item.status === 'published' ? 'Yayında' : 'Bekliyor'}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {user?.role === UserRole.ADMIN && item.status === 'pending' && (
                      <button onClick={() => handleApproveNews(item.id)} className="text-xs text-green-400 hover:text-green-300 font-medium">Onayla</button>
                    )}
                    <button onClick={() => handleOpenEditNews(item)} className="text-xs text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1"><Pencil size={11}/> Düzenle</button>
                    <button onClick={() => handleDeleteNews(item.id, item.title)} className="text-xs text-red-500 hover:text-red-400 font-medium flex items-center gap-1"><Trash2 size={11}/> Sil</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'users' && (
           <div className="space-y-4">
               <div className="relative">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                   <input
                     type="text"
                     placeholder="Kullanıcı adı ara..."
                     className="w-full bg-gray-900 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-amber-500 focus:outline-none"
                     value={userSearch}
                     onChange={e => setUserSearch(e.target.value)}
                   />
               </div>

               {/* Mobile: cards, Desktop: table */}
               <div className="sm:hidden space-y-3">
                   {filteredUsers.map(u => (
                       <div key={u.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                           <div className="flex items-center gap-3 mb-3">
                               <img src={u.avatar} className="w-10 h-10 rounded-full border border-gray-700 flex-shrink-0" alt="" />
                               <div className="min-w-0">
                                   <div className="text-white font-bold truncate">{u.username}</div>
                                   <div className="text-xs text-gray-500 truncate">{u.email}</div>
                               </div>
                               <div className="ml-auto flex-shrink-0 flex flex-col items-end gap-1">
                                   <span className={`px-2 py-0.5 rounded text-xs uppercase font-bold ${u.role === UserRole.ADMIN ? 'bg-red-900/30 text-red-500' : u.role === UserRole.MODERATOR ? 'bg-amber-900/30 text-amber-500' : 'bg-gray-800 text-gray-400'}`}>{u.role}</span>
                                   {u.isBanned ? (
                                       <div className="text-right">
                                           <span className="text-red-500 text-xs font-bold block">BANLI</span>
                                           <span className="text-[10px] text-red-400/70">{u.banExpiresAt ? `${new Date(u.banExpiresAt).toLocaleDateString('tr-TR')}'e kadar` : 'Kalıcı'}</span>
                                       </div>
                                   ) : <span className="text-green-500 text-xs font-bold">AKTİF</span>}
                               </div>
                           </div>
                           {u.role !== UserRole.ADMIN && (
                               <div className="flex gap-2 flex-wrap">
                                   {u.isBanned ? (
                                       <button onClick={() => handleUnban(u.id)} className="flex-1 text-xs font-bold py-2.5 rounded-lg transition-colors bg-gray-700 text-white hover:bg-gray-600">
                                           Yasağı Kaldır
                                       </button>
                                   ) : (
                                       <button onClick={() => { setBanDuration('7'); setBanModal({ userId: u.id, username: u.username }); }} className="flex-1 text-xs font-bold py-2.5 rounded-lg transition-colors bg-red-500/10 text-red-500 border border-red-900/30 hover:bg-red-500/20">
                                           Banla
                                       </button>
                                   )}
                                   <button onClick={() => handleRoleChange(u.id, u.role === UserRole.EDITOR ? UserRole.USER : UserRole.EDITOR)} className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${u.role === UserRole.EDITOR ? 'bg-gray-700 text-white' : 'bg-blue-500/10 text-blue-400 border border-blue-900/30'}`}>
                                       {u.role === UserRole.EDITOR ? 'Editörü Al' : 'Editör Yap'}
                                   </button>
                                   <button onClick={() => handleRoleChange(u.id, u.role === UserRole.MODERATOR ? UserRole.USER : UserRole.MODERATOR)} className={`flex-1 text-xs font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-1 ${u.role === UserRole.MODERATOR ? 'bg-gray-700 text-white' : 'bg-amber-500/10 text-amber-500 border border-amber-900/30'}`}>
                                       <Shield size={12} />
                                       {u.role === UserRole.MODERATOR ? 'Yetkiyi Al' : 'Mod Yap'}
                                   </button>
                                   <button onClick={() => handleDeleteUser(u.id, u.username)} className="flex-1 text-xs font-bold py-2.5 rounded-lg bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50 transition-colors flex items-center justify-center gap-1">
                                       <UserX size={12} /> Hesabı Sil
                                   </button>
                               </div>
                           )}
                       </div>
                   ))}
                   {filteredUsers.length === 0 && <p className="text-center text-gray-500 py-8">Kullanıcı bulunamadı.</p>}
               </div>

               <div className="hidden sm:block overflow-x-auto rounded-lg border border-gray-800">
                   <table className="w-full text-left border-collapse">
                       <thead>
                           <tr className="text-gray-500 text-sm bg-gray-900/50 border-b border-gray-800">
                               <th className="p-4">Kullanıcı</th>
                               <th className="p-4">Rol</th>
                               <th className="p-4">Durum</th>
                               <th className="p-4">İşlemler</th>
                           </tr>
                       </thead>
                       <tbody>
                           {filteredUsers.map(u => (
                               <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 transition-colors">
                                   <td className="p-4">
                                      <div className="flex items-center gap-3">
                                          <img src={u.avatar} className="w-8 h-8 rounded-full border border-gray-700" alt="" />
                                          <div>
                                              <div className="text-white font-bold">{u.username}</div>
                                              <div className="text-xs text-gray-500">{u.email}</div>
                                          </div>
                                      </div>
                                   </td>
                                   <td className="p-4">
                                       <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${u.role === UserRole.ADMIN ? 'bg-red-900/30 text-red-500' : u.role === UserRole.MODERATOR ? 'bg-amber-900/30 text-amber-500' : 'bg-gray-800 text-gray-400'}`}>
                                           {u.role}
                                       </span>
                                   </td>
                                   <td className="p-4">
                                       {u.isBanned ? (
                                           <div>
                                               <span className="text-red-500 text-xs font-bold block">BANLI</span>
                                               <span className="text-[10px] text-red-400/70">{u.banExpiresAt ? `${new Date(u.banExpiresAt).toLocaleDateString('tr-TR')}'e kadar` : 'Kalıcı'}</span>
                                           </div>
                                       ) : <span className="text-green-500 text-xs font-bold">AKTİF</span>}
                                   </td>
                                   <td className="p-4">
                                       {u.role !== UserRole.ADMIN && (
                                           <div className="flex items-center gap-2 flex-wrap">
                                               {u.isBanned ? (
                                                   <button onClick={() => handleUnban(u.id)} className="text-xs font-bold px-3 py-1.5 rounded transition-colors bg-gray-700 text-white hover:bg-gray-600">
                                                       Yasağı Kaldır
                                                   </button>
                                               ) : (
                                                   <button onClick={() => { setBanDuration('7'); setBanModal({ userId: u.id, username: u.username }); }} className="text-xs font-bold px-3 py-1.5 rounded transition-colors bg-red-500/10 text-red-500 border border-red-900/30 hover:bg-red-500/20">
                                                       Banla
                                                   </button>
                                               )}
                                               <button onClick={() => handleRoleChange(u.id, u.role === UserRole.EDITOR ? UserRole.USER : UserRole.EDITOR)} className={`text-xs font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-1 ${u.role === UserRole.EDITOR ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-blue-500/10 text-blue-400 border border-blue-900/30 hover:bg-blue-500/20'}`}>
                                                   {u.role === UserRole.EDITOR ? 'Editörü Al' : 'Editör Yap'}
                                               </button>
                                               <button onClick={() => handleRoleChange(u.id, u.role === UserRole.MODERATOR ? UserRole.USER : UserRole.MODERATOR)} className={`text-xs font-bold px-3 py-1.5 rounded transition-colors flex items-center gap-1 ${u.role === UserRole.MODERATOR ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-amber-500/10 text-amber-500 border border-amber-900/30 hover:bg-amber-500/20'}`}>
                                                   <Shield size={12} />
                                                   {u.role === UserRole.MODERATOR ? 'Yetkiyi Al' : 'Mod Yap'}
                                               </button>
                                               <button onClick={() => handleDeleteUser(u.id, u.username)} className="text-xs font-bold px-3 py-1.5 rounded bg-red-900/30 text-red-400 border border-red-900/50 hover:bg-red-900/50 transition-colors flex items-center gap-1">
                                                   <UserX size={12} /> Sil
                                               </button>
                                           </div>
                                       )}
                                   </td>
                               </tr>
                           ))}
                           {filteredUsers.length === 0 && (
                               <tr><td colSpan={4} className="p-8 text-center text-gray-500">Kullanıcı bulunamadı.</td></tr>
                           )}
                       </tbody>
                   </table>
               </div>
           </div>
      )}
      
      {activeTab === 'community' && (
        <div className="space-y-4">
          {/* Inner tabs */}
          <div className="flex gap-2 border-b border-gray-800 pb-1 flex-wrap">
            <button onClick={() => setCommunityTab('requests')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px ${communityTab === 'requests' ? 'text-amber-500 border-amber-500' : 'text-gray-400 border-transparent hover:text-white'}`}>
              <Send size={15}/> İstekler & Öneriler <span className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">{requests.length}</span>
            </button>
            <button onClick={() => setCommunityTab('reports')} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-bold transition-colors border-b-2 -mb-px ${communityTab === 'reports' ? 'text-amber-500 border-amber-500' : 'text-gray-400 border-transparent hover:text-white'}`}>
              <Flag size={15}/> Şikayetler <span className="bg-gray-800 text-gray-400 text-[10px] px-1.5 py-0.5 rounded-full">{reports.filter(r => r.status === 'pending').length}</span>
            </button>
          </div>

          {communityTab === 'requests' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                <input type="text" placeholder="Anime adı veya kullanıcı ara..." value={requestSearch} onChange={e => setRequestSearch(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-white text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              {requestsLoading ? (
                <div className="text-center py-10 text-gray-500">Yükleniyor...</div>
              ) : requests.filter(r => !requestSearch || r.animeName.toLowerCase().includes(requestSearch.toLowerCase()) || r.username.toLowerCase().includes(requestSearch.toLowerCase())).length === 0 ? (
                <div className="text-center py-10 text-gray-500">Henüz istek yok.</div>
              ) : requests.filter(r => !requestSearch || r.animeName.toLowerCase().includes(requestSearch.toLowerCase()) || r.username.toLowerCase().includes(requestSearch.toLowerCase())).map(req => (
                <div key={req.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-bold text-white">{req.animeName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${req.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : req.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-red-500/10 text-red-400 border-red-500/30'}`}>
                        {req.status === 'pending' ? 'Bekliyor' : req.status === 'approved' ? 'Onaylandı' : 'Reddedildi'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      <span className="font-bold text-gray-300">{req.displayName || req.username}</span>
                      <span className="text-gray-600"> @{req.username}</span>
                      <span className="text-gray-600 ml-2">· {new Date(req.createdAt).toLocaleDateString('tr-TR')}</span>
                    </p>
                    {req.note && <p className="text-xs text-gray-500 mt-1 italic">"{req.note}"</p>}
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={async () => { try { await updateAnimeRequestStatus(req.id, 'approved'); loadRequests(); } catch(e: any) { alert(e.message); } }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors">Onayla</button>
                      <button onClick={async () => { try { await updateAnimeRequestStatus(req.id, 'rejected'); loadRequests(); } catch(e: any) { alert(e.message); } }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">Reddet</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {communityTab === 'reports' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                <input type="text" placeholder="Sebep veya kullanıcı ara..." value={reportSearch} onChange={e => setReportSearch(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-white text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              {reportsLoading ? (
                <div className="text-gray-500 text-sm text-center py-10">Yükleniyor...</div>
              ) : reports.filter(r => !reportSearch || r.reason.toLowerCase().includes(reportSearch.toLowerCase()) || (r.reporterUsername || '').toLowerCase().includes(reportSearch.toLowerCase()) || (r.reportedUsername || '').toLowerCase().includes(reportSearch.toLowerCase())).length === 0 ? (
                <div className="text-center py-12 text-gray-600 text-sm">Şikayet yok.</div>
              ) : reports.filter(r => !reportSearch || r.reason.toLowerCase().includes(reportSearch.toLowerCase()) || (r.reporterUsername || '').toLowerCase().includes(reportSearch.toLowerCase()) || (r.reportedUsername || '').toLowerCase().includes(reportSearch.toLowerCase())).map(r => (
                <div key={r.id} className="bg-[#18181b] border border-gray-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.type === 'profile' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
                        {r.type === 'profile' ? 'Profil' : 'Yorum'}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : r.status === 'resolved' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-gray-700 text-gray-500 border-gray-700'}`}>
                        {r.status === 'pending' ? 'Bekliyor' : r.status === 'resolved' ? 'Çözüldü' : 'Reddedildi'}
                      </span>
                    </div>
                    <p className="text-sm text-white"><span className="text-gray-400">Şikayet eden:</span> {r.reporterUsername || r.reporterId.slice(0, 8)}</p>
                    <p className="text-sm text-white"><span className="text-gray-400">Şikayet edilen:</span> {r.reportedUsername || r.reportedUserId?.slice(0, 8) || '-'}</p>
                    <p className="text-sm text-gray-300 mt-1 italic">"{r.reason}"</p>
                    <p className="text-xs text-gray-600 mt-1">{new Date(r.createdAt).toLocaleDateString('tr-TR')}</p>
                  </div>
                  {r.status === 'pending' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={async () => { await updateReportStatus(r.id, 'resolved'); setReports(prev => prev.map(x => x.id === r.id ? {...x, status: 'resolved'} : x)); }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors">Çözüldü</button>
                      <button onClick={async () => { await updateReportStatus(r.id, 'dismissed'); setReports(prev => prev.map(x => x.id === r.id ? {...x, status: 'dismissed'} : x)); }} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-gray-700 text-gray-400 border border-gray-600 hover:bg-gray-600 transition-colors">Reddet</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {false && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <select
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none"
              value={selectedAnimeId}
              onChange={e => setSelectedAnimeId(e.target.value)}
            >
              <option value="">-- Anime Seç --</option>
              {animes.map(a => <option key={a.id} value={a.id}>{a.title}</option>)}
            </select>

            {selectedAnimeId && (() => {
              const anime = animes.find(a => a.id === selectedAnimeId);
              if (!anime) return null;
              return (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-800">
                    <img src={anime.coverImage} className="w-12 h-16 object-cover rounded" />
                    <div>
                      <div className="text-white font-bold text-sm">{anime.title}</div>
                      <div className="text-gray-500 text-xs">{anime.episodes?.length || 0} bölüm</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 font-bold uppercase px-1">Mevcut Bölümler</div>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {(anime.episodes || []).length === 0 && (
                      <div className="text-gray-600 text-sm p-3 bg-gray-900 rounded-lg border border-gray-800">Henüz bölüm yok.</div>
                    )}
                    {[...(anime.episodes || [])].sort((a, b) => a.number - b.number).map(ep => (
                      <div key={ep.id} className="flex items-center gap-3 bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                        {ep.thumbnail ? (
                          <img src={ep.thumbnail} className="w-20 h-12 object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-20 h-12 bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <Image size={16} className="text-gray-600" />
                          </div>
                        )}
                        <div className="py-2 pr-2 min-w-0">
                          <div className="text-white text-xs font-bold truncate">Bölüm {ep.number}</div>
                          <div className="text-gray-400 text-xs truncate">{ep.title}</div>
                          {ep.fansub && <div className="text-amber-500 text-xs">{ep.fansub}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Sağ: Çoklu bölüm ekleme formu */}
          <div className="lg:col-span-2">
            <form onSubmit={handleAddEpisodes} className="space-y-4">
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                <datalist id="player-presets">{PLAYER_PRESETS.map(p => <option key={p} value={p} />)}</datalist>
                {episodeRows.map((row, idx) => (
                  <div key={row.id} className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4 space-y-3">
                    {/* Başlık satırı */}
                    <div className="flex items-center justify-between">
                      <span className="text-amber-500 font-bold text-sm">Bölüm #{idx + 1}</span>
                      {episodeRows.length > 1 && <button type="button" onClick={() => removeRow(row.id)} className="text-red-500 hover:text-red-400 p-1"><Trash2 size={15}/></button>}
                    </div>
                    {/* No + Başlık + Thumbnail */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">Bölüm No *</label>
                        <input type="number" required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none" value={row.number} onChange={e => updateRow(row.id, 'number', e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">Başlık *</label>
                        <input type="text" required className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none" value={row.title} onChange={e => updateRow(row.id, 'title', e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-gray-400">Kapak URL</label>
                      <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:border-amber-500 focus:outline-none" placeholder="https://..." value={row.thumbnail} onChange={e => updateRow(row.id, 'thumbnail', e.target.value)} />
                      {row.thumbnail && <img src={row.thumbnail} className="w-full h-20 object-cover rounded-lg border border-gray-700 mt-1" onError={e => (e.target as HTMLImageElement).style.display='none'} />}
                    </div>

                    {/* Fansub grupları */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-gray-400 font-bold uppercase">Fansublar</label>
                        <button type="button" onClick={() => addFansub(row.id)} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"><Plus size={11}/> Fansub Ekle</button>
                      </div>
                      {row.fansubs.map((fb, fi) => (
                        <div key={fb.id} className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-2.5 space-y-2">
                          <div className="flex items-center gap-2">
                            <input type="text" placeholder="Fansub adı (ör: TurkAnime)" value={fb.name} onChange={e => updateFansubName(row.id, fb.id, e.target.value)} className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:border-blue-500 focus:outline-none font-bold" />
                            {row.fansubs.length > 1 && <button type="button" onClick={() => removeFansub(row.id, fb.id)} className="text-red-500 hover:text-red-400 p-1 flex-shrink-0"><X size={13}/></button>}
                          </div>
                          <div className="space-y-1.5">
                            {fb.sources.map((src, si) => (
                              <div key={src.id} className="flex gap-1.5 items-center">
                                <input type="text" list="player-presets" placeholder="Sibnet..." value={src.name} onChange={e => updateSource(row.id, fb.id, src.id, 'name', e.target.value)} className="w-20 flex-shrink-0 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none" />
                                <input type="text" placeholder="Embed link yapıştır..." value={src.url} onChange={e => updateSource(row.id, fb.id, src.id, 'url', e.target.value)} onPaste={e => handleSourcePaste(row.id, fb.id, src.id, e)} required={fi === 0 && si === 0} className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none" />
                                {fb.sources.length > 1 && <button type="button" onClick={() => removeSource(row.id, fb.id, src.id)} className="text-red-500 hover:text-red-400 p-1 flex-shrink-0"><Trash2 size={12}/></button>}
                              </div>
                            ))}
                            <button type="button" onClick={() => addSource(row.id, fb.id)} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 mt-0.5"><Plus size={10}/> Kaynak Ekle</button>
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Per-episode embed fetch */}
                    <div className="flex items-center gap-1.5 pt-1 border-t border-gray-800/60">
                      <Globe size={12} className="text-blue-400 flex-shrink-0" />
                      <input
                        type="url"
                        placeholder="Bölüm sayfası URL'si (Seicode, Efsaneyiz...)"
                        value={epFetchUrl[row.id] || ''}
                        onChange={e => setEpFetchUrl(p => ({ ...p, [row.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleFetchEpisodeEmbed(row.id))}
                        className="flex-1 min-w-0 bg-gray-800/80 border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:border-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleFetchEpisodeEmbed(row.id)}
                        disabled={epFetchLoading[row.id] || !epFetchUrl[row.id]?.trim()}
                        className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded transition-colors"
                      >
                        {epFetchLoading[row.id] ? <Loader2 size={11} className="animate-spin" /> : <Globe size={11} />}
                        Çek
                      </button>
                      {epFetchStatus[row.id] === 'ok' && <CheckCircle2 size={14} className="text-green-400 flex-shrink-0" />}
                      {epFetchStatus[row.id] === 'error' && <AlertCircle size={14} className="text-red-400 flex-shrink-0" title="Server çevrimdışı veya kaynak bulunamadı" />}
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addRow}
                className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-700 rounded-xl text-gray-400 hover:border-amber-500 hover:text-amber-500 transition-colors text-sm font-medium"
              >
                <Plus size={18} /> Yeni Bölüm Satırı Ekle
              </button>

              <Button type="submit" isLoading={loading} className="w-full">
                {episodeRows.length} Bölümü Yükle
              </Button>
            </form>
          </div>
        </div>
      )}

    </div>

      {/* News Edit Modal */}
      {editingNews && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditingNews(null)}>
          <div className="bg-[#18181b] border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-white font-bold text-base">Haberi Düzenle</h3>
              <button onClick={() => setEditingNews(null)} className="text-gray-400 hover:text-white p-1"><X size={18}/></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Başlık</label>
                <input type="text" value={newsEditForm.title} onChange={e => setNewsEditForm(p => ({ ...p, title: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Özet</label>
                <textarea rows={2} value={newsEditForm.excerpt} onChange={e => setNewsEditForm(p => ({ ...p, excerpt: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">İçerik</label>
                <textarea rows={6} value={newsEditForm.content} onChange={e => setNewsEditForm(p => ({ ...p, content: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none resize-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Resim URL</label>
                <input type="url" value={newsEditForm.image} onChange={e => setNewsEditForm(p => ({ ...p, image: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none" />
                {newsEditForm.image && <img src={newsEditForm.image} className="w-full h-24 object-cover rounded-lg border border-gray-700 mt-1" onError={e => (e.target as HTMLImageElement).style.display='none'} />}
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Kategori</label>
                <select value={newsEditForm.category} onChange={e => setNewsEditForm(p => ({ ...p, category: e.target.value }))} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none">
                  {NEWS_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Bağlantılar</label>
                  <button type="button" onClick={() => setNewsEditLinks(p => [...p, { id: Date.now().toString(), label: '', url: '' }])} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"><Plus size={11}/> Ekle</button>
                </div>
                {newsEditLinks.map(link => (
                  <div key={link.id} className="flex gap-2 items-center">
                    <input type="text" placeholder="Etiket" value={link.label} onChange={e => setNewsEditLinks(p => p.map(l => l.id === link.id ? { ...l, label: e.target.value } : l))} className="w-24 flex-shrink-0 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-xs focus:border-amber-500 focus:outline-none" />
                    <input type="url" placeholder="https://..." value={link.url} onChange={e => setNewsEditLinks(p => p.map(l => l.id === link.id ? { ...l, url: e.target.value } : l))} className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-xs focus:border-amber-500 focus:outline-none" />
                    <button type="button" onClick={() => setNewsEditLinks(p => p.filter(l => l.id !== link.id))} className="text-red-500 hover:text-red-400 p-1 flex-shrink-0"><X size={13}/></button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-gray-800">
              <button onClick={() => setEditingNews(null)} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors">İptal</button>
              <button onClick={handleSaveEditNews} disabled={newsSaving} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {newsSaving ? 'Kaydediliyor...' : <><Save size={14}/> Kaydet</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Episode Edit Modal */}

      {editingEp && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditingEp(null)}>
          <div className="bg-[#18181b] border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-white font-bold text-base">Bölümü Düzenle</h3>
              <button onClick={() => setEditingEp(null)} className="text-gray-400 hover:text-white p-1"><X size={18}/></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">Bölüm No</label>
                  <input type="number" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none" value={editingEp.number} onChange={e => setEditingEp(prev => prev && ({ ...prev, number: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-gray-400 font-medium">Başlık</label>
                  <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none" value={editingEp.title} onChange={e => setEditingEp(prev => prev && ({ ...prev, title: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400 font-medium">Kapak Fotoğrafı URL</label>
                <input type="text" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none" placeholder="https://..." value={editingEp.thumbnail} onChange={e => setEditingEp(prev => prev && ({ ...prev, thumbnail: e.target.value }))} />
                {editingEp.thumbnail && <img src={editingEp.thumbnail} className="w-full h-20 object-cover rounded-lg border border-gray-700 mt-1" onError={e => (e.target as HTMLImageElement).style.display='none'} />}
              </div>
              {/* Fansub grupları */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400 font-bold uppercase">Fansublar</label>
                  <button type="button" onClick={() => setEditingEp(prev => prev && ({ ...prev, fansubs: [...prev.fansubs, { id: Date.now().toString(), name: '', sources: [{ id: `s${Date.now()}`, name: 'Fembed', url: '' }] }] }))} className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"><Plus size={11}/> Fansub Ekle</button>
                </div>
                <datalist id="ep-edit-presets">{PLAYER_PRESETS.map(p => <option key={p} value={p} />)}</datalist>
                {editingEp.fansubs.map((fb, fi) => (
                  <div key={fb.id} className="bg-gray-800/60 border border-gray-700/60 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center gap-2">
                      <input type="text" placeholder="Fansub adı" value={fb.name} onChange={e => setEditingEp(prev => prev && ({ ...prev, fansubs: prev.fansubs.map(f => f.id === fb.id ? { ...f, name: e.target.value } : f) }))} className="flex-1 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs font-bold focus:border-blue-500 focus:outline-none" />
                      {editingEp.fansubs.length > 1 && <button type="button" onClick={() => setEditingEp(prev => prev && ({ ...prev, fansubs: prev.fansubs.filter(f => f.id !== fb.id) }))} className="text-red-500 p-1"><X size={13}/></button>}
                    </div>
                    {fb.sources.map((src) => (
                      <div key={src.id} className="flex gap-1.5 items-center">
                        <input type="text" list="ep-edit-presets" value={src.name} onChange={e => setEditingEp(prev => prev && ({ ...prev, fansubs: prev.fansubs.map(f => f.id !== fb.id ? f : { ...f, sources: f.sources.map(s => s.id === src.id ? { ...s, name: e.target.value } : s) }) }))} className="w-20 flex-shrink-0 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none" />
                        <input type="text" placeholder="Embed link..." value={src.url} onChange={e => setEditingEp(prev => prev && ({ ...prev, fansubs: prev.fansubs.map(f => f.id !== fb.id ? f : { ...f, sources: f.sources.map(s => s.id === src.id ? { ...s, url: e.target.value } : s) }) }))} className="flex-1 min-w-0 bg-gray-800 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:border-amber-500 focus:outline-none" />
                        {fb.sources.length > 1 && <button type="button" onClick={() => setEditingEp(prev => prev && ({ ...prev, fansubs: prev.fansubs.map(f => f.id !== fb.id ? f : { ...f, sources: f.sources.filter(s => s.id !== src.id) }) }))} className="text-red-500 p-1"><X size={12}/></button>}
                      </div>
                    ))}
                    <button type="button" onClick={() => setEditingEp(prev => prev && ({ ...prev, fansubs: prev.fansubs.map(f => f.id !== fb.id ? f : { ...f, sources: [...f.sources, { id: Date.now().toString(), name: 'Sibnet', url: '' }] }) }))} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"><Plus size={10}/> Kaynak Ekle</button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-gray-800">
              <button onClick={() => setEditingEp(null)} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors">İptal</button>
              <button onClick={handleSaveEdit} disabled={editSaving} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {editSaving ? 'Kaydediliyor...' : <><Save size={14}/> Kaydet</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban Duration Modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-white font-black text-lg mb-1">Kullanıcıyı Banla</h3>
            <p className="text-gray-400 text-sm mb-5">
              <span className="text-amber-400 font-bold">@{banModal.username}</span> için ban süresi seçin.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: '1 Gün', value: '1' },
                { label: '3 Gün', value: '3' },
                { label: '7 Gün', value: '7' },
                { label: '30 Gün', value: '30' },
                { label: '90 Gün', value: '90' },
                { label: '180 Gün', value: '180' },
                { label: '1 Yıl', value: '365' },
                { label: 'Kalıcı', value: 'permanent' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setBanDuration(opt.value)}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-colors border ${banDuration === opt.value ? 'bg-red-500 text-white border-red-500' : 'bg-gray-800 text-gray-300 border-gray-700 hover:border-red-500/50'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {banDuration !== 'permanent' && (
              <p className="text-xs text-gray-500 mb-4 text-center">
                Ban bitiş: <span className="text-amber-400">{new Date(Date.now() + parseInt(banDuration) * 86400000).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </p>
            )}
            {banDuration === 'permanent' && (
              <p className="text-xs text-red-400 mb-4 text-center font-bold">Kalıcı ban — süresiz yasaklama</p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setBanModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
                İptal
              </button>
              <button onClick={handleBanConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors">
                Banla
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const parseVideoLink = (url: string): { embedUrl: string; thumbnail: string; name: string } => {
  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (ytMatch) return {
    name: 'YouTube',
    embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}`,
    thumbnail: `https://img.youtube.com/vi/${ytMatch[1]}/maxresdefault.jpg`,
  };
  const ytEmbed = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (ytEmbed) return {
    name: 'YouTube',
    embedUrl: url,
    thumbnail: `https://img.youtube.com/vi/${ytEmbed[1]}/maxresdefault.jpg`,
  };
  // ok.ru
  const okruWatch = url.match(/ok\.ru\/video\/(\d+)/);
  if (okruWatch) return { name: 'Okru', embedUrl: `https://ok.ru/videoembed/${okruWatch[1]}`, thumbnail: '' };
  if (url.includes('ok.ru/videoembed')) return { name: 'Okru', embedUrl: url, thumbnail: '' };
  // Sibnet
  if (url.includes('sibnet.ru')) {
    const sib = url.match(/videoid=(\d+)/);
    return { name: 'Sibnet', embedUrl: sib ? `https://video.sibnet.ru/shell.php?videoid=${sib[1]}` : url, thumbnail: '' };
  }
  // Dailymotion
  const dm = url.match(/dailymotion\.com\/video\/([a-z0-9]+)/i);
  if (dm) return { name: 'Dailymotion', embedUrl: `https://www.dailymotion.com/embed/video/${dm[1]}`, thumbnail: '' };
  // Vimeo
  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return { name: 'Vimeo', embedUrl: `https://player.vimeo.com/video/${vimeo[1]}`, thumbnail: '' };
  // Google Drive
  const drive = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (drive) return { name: 'Drive', embedUrl: `https://drive.google.com/file/d/${drive[1]}/preview`, thumbnail: '' };
  // Fembed / diğer embed linkleri — olduğu gibi kullan
  return { name: 'Fembed', embedUrl: url, thumbnail: '' };
};

const TabButton = ({active, onClick, children, icon}: any) => (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors border-b-2 ${active ? 'border-amber-500 text-amber-500 bg-amber-500/5' : 'border-transparent text-gray-400 hover:text-white'}`}
    >
        {icon} {children}
    </button>
);

const StatCard = ({title, value, icon}: any) => (
    <div className="bg-gray-900 p-6 rounded-xl border border-gray-800 flex items-center gap-4">
        <div className="p-3 bg-gray-800 rounded-lg">{icon}</div>
        <div>
            <div className="text-2xl font-black text-white">{value}</div>
            <div className="text-xs text-gray-500 uppercase font-bold">{title}</div>
        </div>
    </div>
);

export default AdminDashboard;