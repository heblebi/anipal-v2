import React, { useState } from 'react';
import { X, Flag } from 'lucide-react';
import { reportUser, reportComment } from '../services/socialBackend';

interface ReportModalProps {
  type: 'profile' | 'comment';
  targetId: string; // userId for profile, commentId for comment
  reportedUserId?: string; // for comment reports
  onClose: () => void;
}

const REASONS = [
  'Uygunsuz içerik',
  'Taciz veya zorbalık',
  'Spam',
  'Sahte hesap',
  'Nefret söylemi',
  'Diğer',
];

const ReportModal: React.FC<ReportModalProps> = ({ type, targetId, reportedUserId, onClose }) => {
  const [selected, setSelected] = useState('');
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const reason = selected === 'Diğer' ? custom.trim() : selected;

  const handleSubmit = async () => {
    if (!reason) return;
    setLoading(true);
    try {
      if (type === 'profile') {
        await reportUser(targetId, reason);
      } else {
        await reportComment(targetId, reportedUserId || '', reason);
      }
      setDone(true);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#18181b] border border-gray-800 rounded-2xl w-full max-w-sm p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flag size={16} className="text-red-400" />
            <span className="font-bold text-white text-sm">
              {type === 'profile' ? 'Profili Şikayet Et' : 'Yorumu Şikayet Et'}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={16} /></button>
        </div>

        {done ? (
          <div className="text-center py-6">
            <div className="text-3xl mb-3">✅</div>
            <p className="text-white font-bold text-sm">Şikayetin alındı</p>
            <p className="text-gray-400 text-xs mt-1">Ekibimiz inceleyecek.</p>
            <button onClick={onClose} className="mt-4 text-amber-500 text-sm hover:text-amber-400">Kapat</button>
          </div>
        ) : (
          <>
            <p className="text-gray-400 text-xs mb-4">Bir neden seç:</p>
            <div className="space-y-2 mb-4">
              {REASONS.map(r => (
                <label key={r} className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${selected === r ? 'border-amber-500 bg-amber-500' : 'border-gray-600 group-hover:border-gray-400'}`} onClick={() => setSelected(r)} />
                  <span className="text-sm text-gray-300 group-hover:text-white" onClick={() => setSelected(r)}>{r}</span>
                </label>
              ))}
            </div>
            {selected === 'Diğer' && (
              <textarea
                className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none resize-none mb-4"
                rows={3}
                placeholder="Nedeni açıkla..."
                value={custom}
                onChange={e => setCustom(e.target.value)}
                maxLength={300}
              />
            )}
            <button
              onClick={handleSubmit}
              disabled={!reason || loading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              {loading ? 'Gönderiliyor...' : 'Şikayet Gönder'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportModal;
