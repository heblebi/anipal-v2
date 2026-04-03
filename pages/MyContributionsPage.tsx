import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyContributions, requestEditContribution, requestDeleteContribution } from '../services/mockBackend';
import { EpisodeContribution } from '../types';
import { Plus, Loader2, X, Pencil, Trash2, AlertCircle, CheckCircle2, Clock } from 'lucide-react';

const PLAYER_PRESETS = ['Fembed', 'Sibnet', 'Okru', 'Odnoklassniki', 'Mail.ru', 'Filemoon', 'Streamtape', 'Diğer'];

interface EditSourceRow { id: string; name: string; url: string; }

const StatusBadge = ({ contribution }: { contribution: EpisodeContribution }) => {
  if (contribution.pendingAction === 'edit') {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-blue-500/10 text-blue-400 border-blue-500/30">Düzenleme İsteği Bekliyor</span>;
  }
  if (contribution.pendingAction === 'delete') {
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/30">Silme İsteği Bekliyor</span>;
  }
  switch (contribution.status) {
    case 'pending':
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30">Onay Bekliyor</span>;
    case 'approved':
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-green-500/10 text-green-400 border-green-500/30">Onaylandı</span>;
    case 'rejected':
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-red-500/10 text-red-400 border-red-500/30">Reddedildi</span>;
    default:
      return null;
  }
};

const MyContributionsPage = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();

  const [contributions, setContributions] = useState<EpisodeContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFansubName, setEditFansubName] = useState('');
  const [editSources, setEditSources] = useState<EditSourceRow[]>([]);
  const [editEpisodeTitle, setEditEpisodeTitle] = useState('');
  const [editThumbnail, setEditThumbnail] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editMsg, setEditMsg] = useState<string | null>(null);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Action message
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) { navigate('/login'); return; }
    loadContributions();
  }, [isLoading]);

  const loadContributions = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getMyContributions(user.id);
      setContributions(data);
    } catch (err: any) {
      setError(err.message || 'Yüklenirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (c: EpisodeContribution) => {
    setEditingId(c.id);
    setEditFansubName(c.fansubName);
    setEditEpisodeTitle(c.episodeTitle);
    setEditThumbnail(c.thumbnail || '');
    setEditSources((c.sources || []).map((s, i) => ({ id: `es-${i}`, name: s.name, url: s.url })));
    setEditMsg(null);
  };

  const handleEditSave = async () => {
    if (!editingId) return;
    setEditSaving(true);
    setEditMsg(null);
    try {
      const validSources = editSources.filter(s => s.url.trim()).map(s => ({ name: s.name, url: s.url }));
      await requestEditContribution(editingId, {
        fansubName: editFansubName.trim() || undefined,
        sources: validSources.length > 0 ? validSources : undefined,
        episodeTitle: editEpisodeTitle.trim() || undefined,
        thumbnail: editThumbnail.trim() || undefined,
      });
      setEditingId(null);
      setActionMsg({ type: 'success', text: 'Düzenleme isteği gönderildi. Admin onayından sonra uygulanacak.' });
      loadContributions();
    } catch (err: any) {
      setEditMsg(err.message || 'Hata oluştu.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await requestDeleteContribution(deletingId);
      setDeletingId(null);
      setActionMsg({ type: 'success', text: 'Silme isteği gönderildi. Admin onayından sonra kaldırılacak.' });
      loadContributions();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err.message || 'Hata oluştu.' });
      setDeletingId(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const pending = contributions.filter(c => c.status === 'pending' && !c.pendingAction);
  const approved = contributions.filter(c => c.status === 'approved');
  const rejected = contributions.filter(c => c.status === 'rejected');
  const withPendingAction = contributions.filter(c => c.pendingAction);

  const renderCard = (c: EpisodeContribution) => (
    <div key={c.id} className="bg-[#18181b] border border-gray-800 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge contribution={c} />
          </div>
          <p className="text-white font-bold text-sm">
            Bölüm {c.episodeNumber}: <span className="text-gray-300">{c.episodeTitle}</span>
          </p>
          <p className="text-xs text-gray-500">
            <span className="text-gray-400">Anime ID:</span> {c.animeId}
          </p>
          <p className="text-xs text-gray-400">
            <span className="text-gray-500">Fansub:</span> <span className="text-amber-400 font-medium">{c.fansubName}</span>
          </p>
          <p className="text-xs text-gray-500">{c.sources?.length || 0} kaynak</p>
          {c.adminNote && (
            <p className="text-xs text-red-400 mt-1 italic">Admin notu: "{c.adminNote}"</p>
          )}
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[10px] text-gray-600">{new Date(c.createdAt).toLocaleDateString('tr-TR')}</p>
        </div>
      </div>
      {c.sources && c.sources.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {c.sources.map((s, i) => (
            <span key={i} className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full border border-gray-700">{s.name}</span>
          ))}
        </div>
      )}
      {c.status === 'approved' && !c.pendingAction && (
        <div className="flex gap-2 pt-1">
          <button onClick={() => openEdit(c)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors">
            <Pencil size={12} /> Düzenle
          </button>
          <button onClick={() => setDeletingId(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors">
            <Trash2 size={12} /> Sil
          </button>
        </div>
      )}
      {c.pendingAction && (
        <p className="text-xs text-gray-500 italic flex items-center gap-1"><Clock size={11} /> İşleminiz inceleniyor...</p>
      )}
      {c.status === 'pending' && !c.pendingAction && (
        <p className="text-xs text-gray-500 italic flex items-center gap-1"><Clock size={11} /> Onay bekleniyor...</p>
      )}
    </div>
  );

  if (isLoading || loading) {
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
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-black text-white">Katkılarım</h1>
            <p className="text-xs text-gray-500 mt-0.5">Gönderdiğiniz bölüm katkılarını buradan takip edin</p>
          </div>
          <button
            onClick={() => navigate('/contribute')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
          >
            <Plus size={15} /> Yeni Katkı
          </button>
        </div>

        {actionMsg && (
          <div className={`p-3 rounded-xl text-sm font-medium border flex items-start gap-2 ${actionMsg.type === 'success' ? 'bg-green-900/20 border-green-800 text-green-400' : 'bg-red-900/20 border-red-800 text-red-400'}`}>
            {actionMsg.type === 'success' ? <CheckCircle2 size={15} className="flex-shrink-0 mt-0.5" /> : <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />}
            {actionMsg.text}
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl text-sm border bg-red-900/20 border-red-800 text-red-400">{error}</div>
        )}

        {contributions.length === 0 && !error && (
          <div className="text-center py-20 space-y-4">
            <p className="text-gray-500 text-sm">Henüz katkınız yok.</p>
            <button
              onClick={() => navigate('/contribute')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm rounded-xl transition-colors"
            >
              <Plus size={15} /> İlk Katkını Gönder
            </button>
          </div>
        )}

        {withPendingAction.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Değişiklik İstekleri</h2>
            {withPendingAction.map(c => {renderCard(c)})}
          </div>
        )}

        {pending.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-amber-500"></span>
              Onay Bekleyen ({pending.length})
            </h2>
            {pending.map(c => {renderCard(c)})}
          </div>
        )}

        {approved.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
              Onaylandı ({approved.length})
            </h2>
            {approved.map(c => {renderCard(c)})}
          </div>
        )}

        {rejected.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
              Reddedildi ({rejected.length})
            </h2>
            {rejected.map(c => {renderCard(c)})}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditingId(null)}>
          <div className="bg-[#18181b] border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-800">
              <h3 className="text-white font-bold text-base">Katkıyı Düzenle</h3>
              <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-white p-1"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
              {editMsg && (
                <div className="p-2.5 rounded-lg text-xs text-red-400 bg-red-900/20 border border-red-800">{editMsg}</div>
              )}
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Fansub Adı</label>
                <input type="text" value={editFansubName} onChange={e => setEditFansubName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Bölüm Başlığı</label>
                <input type="text" value={editEpisodeTitle} onChange={e => setEditEpisodeTitle(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-gray-400">Kapak URL</label>
                <input type="url" value={editThumbnail} onChange={e => setEditThumbnail(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-amber-500 focus:outline-none" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-400">Kaynaklar</label>
                  <button type="button" onClick={() => setEditSources(p => [...p, { id: `es-${Date.now()}`, name: 'Fembed', url: '' }])} className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1"><Plus size={11} /> Ekle</button>
                </div>
                <datalist id="my-contrib-player-presets">{PLAYER_PRESETS.map(p => <option key={p} value={p} />)}</datalist>
                {editSources.map(src => (
                  <div key={src.id} className="flex gap-2 items-center">
                    <input type="text" list="my-contrib-player-presets" value={src.name} onChange={e => setEditSources(p => p.map(s => s.id === src.id ? { ...s, name: e.target.value } : s))} className="w-20 flex-shrink-0 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-xs focus:border-amber-500 focus:outline-none" />
                    <input type="text" placeholder="Embed link..." value={src.url} onChange={e => setEditSources(p => p.map(s => s.id === src.id ? { ...s, url: e.target.value } : s))} className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-lg px-2 py-2 text-white text-xs focus:border-amber-500 focus:outline-none" />
                    {editSources.length > 1 && (
                      <button type="button" onClick={() => setEditSources(p => p.filter(s => s.id !== src.id))} className="text-red-500 hover:text-red-400 p-1 flex-shrink-0"><X size={13} /></button>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-3 p-4 border-t border-gray-800">
              <button onClick={() => setEditingId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors">İptal</button>
              <button onClick={handleEditSave} disabled={editSaving} className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {editSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                {editSaving ? 'Gönderiliyor...' : 'Düzenleme İste'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setDeletingId(null)}>
          <div className="bg-[#18181b] border border-gray-700 rounded-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-base mb-2">Silme İsteği Gönder</h3>
            <p className="text-gray-400 text-sm mb-5">Bu katkı için silme isteği gönderilecek. Admin onayından sonra kaldırılacak.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeletingId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-300 text-sm hover:bg-gray-800 transition-colors">İptal</button>
              <button onClick={handleDeleteConfirm} disabled={deleteLoading} className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-60">
                {deleteLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleteLoading ? 'Gönderiliyor...' : 'Silmeyi İste'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyContributionsPage;
