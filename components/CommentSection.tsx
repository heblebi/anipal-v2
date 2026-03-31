import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCommentsByEpisodeId, addComment } from '../services/mockBackend';
import { Comment } from '../types';
import Button from './Button';
import ReportModal from './ReportModal';
import { MessageSquare, AlertTriangle, Eye, EyeOff, Flag } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CommentSectionProps {
  episodeId: string;
}

const SingleComment: React.FC<{ comment: Comment; currentUserId?: string }> = ({ comment, currentUserId }) => {
  const [isRevealed, setIsRevealed] = useState(!comment.isSpoiler);
  const [showReport, setShowReport] = useState(false);

  return (
    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors">
      {showReport && (
        <ReportModal type="comment" targetId={comment.id} reportedUserId={comment.userId} onClose={() => setShowReport(false)} />
      )}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Link to={`/profile/${comment.userId}`} className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:ring-2 hover:ring-amber-500 transition-all overflow-hidden flex-shrink-0">
            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.username}`} alt="" className="w-full h-full object-cover" />
          </Link>
          <Link to={`/profile/${comment.userId}`} className="font-bold text-gray-200 text-sm hover:text-amber-400 transition-colors">
            {comment.username}
          </Link>
          <span className="text-xs text-gray-500">
            {new Date(comment.createdAt).toLocaleDateString('tr-TR')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {comment.isSpoiler && (
            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-400 bg-red-900/20 px-2 py-1 rounded border border-red-900/50">
              <AlertTriangle size={12} /> Spoiler
            </span>
          )}
          {currentUserId && currentUserId !== comment.userId && (
            <button onClick={() => setShowReport(true)} className="p-1 text-gray-600 hover:text-red-400 transition-colors" title="Şikayet et">
              <Flag size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <p className={`text-gray-300 text-sm leading-relaxed ${!isRevealed ? 'blur-sm select-none opacity-50' : ''}`}>
           {comment.content}
        </p>
        {!isRevealed && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={() => setIsRevealed(true)}
              className="bg-red-900/90 hover:bg-red-800 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 transition-all border border-red-700 backdrop-blur-sm"
            >
              <Eye size={14} /> Spoilerı Göster
            </button>
          </div>
        )}
        {isRevealed && comment.isSpoiler && (
          <button onClick={() => setIsRevealed(false)} className="mt-2 text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
            <EyeOff size={12} /> Gizle
          </button>
        )}
      </div>
    </div>
  );
};

const CommentSection: React.FC<CommentSectionProps> = ({ episodeId }) => {
  const { user, isAuthenticated } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadComments(); }, [episodeId]);

  const loadComments = async () => {
    const data = await getCommentsByEpisodeId(episodeId);
    setComments(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setLoading(true);
    try {
      await addComment({ episodeId, userId: user.id, username: user.username, content: newComment, isSpoiler });
      setNewComment('');
      setIsSpoiler(false);
      await loadComments();
    } catch (error) {
      console.error('Yorum yapılamadı', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#18181b] rounded-xl border border-gray-800 p-6">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-700 pb-4">
        <MessageSquare className="text-amber-500" />
        <h3 className="text-xl font-bold text-white">Yorumlar</h3>
        <span className="text-sm text-gray-500 ml-2">({comments.length})</span>
      </div>

      {isAuthenticated ? (
        <form onSubmit={handleSubmit} className="mb-8 space-y-3">
          <textarea
            className="w-full bg-gray-900 border border-gray-700 rounded-lg p-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm min-h-[100px]"
            placeholder="Bu bölüm hakkında ne düşünüyorsun?"
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            required
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer text-gray-400 hover:text-white transition-colors">
              <input type="checkbox" checked={isSpoiler} onChange={e => setIsSpoiler(e.target.checked)} className="w-4 h-4 rounded border-gray-600 text-amber-500 focus:ring-amber-500 bg-gray-800" />
              <span className="text-sm flex items-center gap-1">
                {isSpoiler ? <AlertTriangle size={14} className="text-red-500" /> : null}
                Spoiler içeriyor mu?
              </span>
            </label>
            <Button type="submit" isLoading={loading} disabled={!newComment.trim()} className="px-6">Gönder</Button>
          </div>
        </form>
      ) : (
        <div className="bg-gray-900/50 p-6 rounded-lg text-center border border-dashed border-gray-700 mb-8">
          <p className="text-gray-400 mb-3">Yorum yapmak için giriş yapmalısınız.</p>
          <div className="flex justify-center gap-3">
            <Link to="/login"><Button variant="secondary" className="text-sm">Giriş Yap</Button></Link>
            <Link to="/register"><Button variant="primary" className="text-sm">Kayıt Ol</Button></Link>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length > 0 ? (
          comments.map(comment => <SingleComment key={comment.id} comment={comment} currentUserId={user?.id} />)
        ) : (
          <div className="text-center py-10 text-gray-600">
            <p>Henüz yorum yapılmamış. İlk yorumu sen yap!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentSection;
