import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Users, MessageCircle, UserPlus, Check, X, Send, ArrowLeft, Search, UserCheck } from 'lucide-react';
import {
  getFriends, getPendingRequests, acceptFriendRequest, rejectFriendRequest,
  removeFriend, getConversations, getMessages, sendMessage, searchUsers,
  sendFriendRequest,
} from '../services/socialBackend';
import type { Friendship, Conversation, Message } from '../types';

type Tab = 'friends' | 'messages' | 'requests';

const FriendsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('friends');

  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pending, setPending] = useState<Friendship[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  // Active chat
  const [activeConv, setActiveConv] = useState<{ userId: string; username: string; avatar?: string } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Search
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<import('../types').User[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    loadAll();
  }, [user]);

  useEffect(() => {
    if (activeConv) {
      loadMessages();
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(loadMessages, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [f, p, c] = await Promise.all([
        getFriends(user!.id),
        getPendingRequests(user!.id),
        getConversations(),
      ]);
      setFriends(f);
      setPending(p);
      setConversations(c);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!activeConv) return;
    try { setMessages(await getMessages(activeConv.userId)); } catch { /* ignore */ }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConv || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(activeConv.userId, input.trim());
      setMessages(prev => [...prev, msg]);
      setInput('');
      getConversations().then(setConversations);
    } catch (e: any) { alert(e.message); } finally { setSending(false); }
  };

  const handleSearch = (q: string) => {
    setSearchQ(q);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const res = await searchUsers(q);
        setSearchResults(res.filter(r => r.id !== user?.id));
      } catch { /* ignore */ } finally { setSearchLoading(false); }
    }, 400);
  };

  const avatar = (username: string, av?: string | null) =>
    av || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`;

  if (!user) return null;

  // ── Active Chat View ──────────────────────────────────────────────────────
  if (activeConv) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-6 h-screen flex flex-col">
        <div className="flex items-center gap-3 mb-4 flex-shrink-0">
          <button onClick={() => setActiveConv(null)} className="text-gray-400 hover:text-white p-2 -ml-2">
            <ArrowLeft size={20} />
          </button>
          <Link to={`/profile/${activeConv.userId}`} className="flex items-center gap-3 hover:opacity-80">
            <img src={avatar(activeConv.username, activeConv.avatar)} className="w-9 h-9 rounded-full object-cover" alt="" />
            <div>
              <p className="font-bold text-white text-sm">{activeConv.username}</p>
              <p className="text-xs text-gray-500">@{activeConv.username}</p>
            </div>
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto bg-[#18181b] border border-gray-800 rounded-2xl p-4 space-y-3 mb-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-600 text-sm pt-8">Henüz mesaj yok. İlk mesajı gönder!</div>
          )}
          {messages.map(msg => {
            const isMe = msg.senderId === user.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-amber-500 text-black rounded-br-sm' : 'bg-gray-700 text-white rounded-bl-sm'}`}>
                  <p className="break-words">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? 'text-black/60' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <input
            className="flex-1 bg-[#18181b] border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
            placeholder="Mesaj yaz..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black rounded-xl px-4 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ── Main View ─────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto px-4 pt-24 pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-white p-2 -ml-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-black text-white">Sosyal</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 p-1 rounded-xl mb-6">
        {([
          { key: 'friends', label: 'Arkadaşlar', icon: <Users size={15}/> },
          { key: 'messages', label: 'Mesajlar', icon: <MessageCircle size={15}/> },
          { key: 'requests', label: 'İstekler', icon: <UserPlus size={15}/>, badge: pending.length },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-bold transition-colors relative ${tab === t.key ? 'bg-[#18181b] text-white' : 'text-gray-500 hover:text-gray-300'}`}
          >
            {t.icon} {t.label}
            {t.badge ? (
              <span className="absolute top-1 right-1 bg-amber-500 text-black text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Friends Tab ── */}
          {tab === 'friends' && (
            <div>
              {/* Search */}
              <div className="relative mb-4">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className="w-full bg-[#18181b] border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                  placeholder="Kullanıcı ara ve arkadaş ekle..."
                  value={searchQ}
                  onChange={e => handleSearch(e.target.value)}
                />
              </div>

              {searchQ.trim() ? (
                <div className="bg-[#18181b] border border-gray-800 rounded-xl overflow-hidden mb-4">
                  {searchLoading ? (
                    <div className="p-6 text-center text-gray-500 text-sm">Aranıyor...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">Kullanıcı bulunamadı.</div>
                  ) : searchResults.map(u => {
                    const isFriend = friends.some(f => f.requesterId === u.id || f.addresseeId === u.id);
                    return (
                      <div key={u.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors">
                        <Link to={`/profile/${u.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <img src={avatar(u.username, u.avatar)} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm truncate">{u.displayName || u.username}</p>
                            <p className="text-xs text-gray-500">@{u.username} · Seviye {u.level}</p>
                          </div>
                        </Link>
                        {isFriend ? (
                          <span className="flex items-center gap-1 text-xs text-green-400"><UserCheck size={14}/> Arkadaş</span>
                        ) : (
                          <button onClick={async () => { try { await sendFriendRequest(u.id); alert('İstek gönderildi!'); } catch(e:any) { alert(e.message); } }} className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-colors flex-shrink-0">
                            <UserPlus size={13}/> Ekle
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-16 text-gray-600">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Henüz arkadaşın yok.</p>
                  <p className="text-sm mt-1">Yukarıdan kullanıcı arayıp ekleyebilirsin.</p>
                </div>
              ) : (
                <div className="bg-[#18181b] border border-gray-800 rounded-xl overflow-hidden">
                  {friends.map(f => {
                    const other = f.requesterId === user.id ? f.addressee : f.requester;
                    if (!other) return null;
                    return (
                      <div key={f.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors">
                        <Link to={`/profile/${other.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <img src={avatar(other.username, other.avatar)} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm truncate">{other.displayName || other.username}</p>
                            <p className="text-xs text-gray-500">@{other.username}</p>
                          </div>
                        </Link>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => { setActiveConv({ userId: other.id, username: other.displayName || other.username, avatar: other.avatar }); }} className="p-2 text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors" title="Mesaj gönder">
                            <MessageCircle size={16} />
                          </button>
                          <button onClick={async () => { if (!window.confirm(`${other.username} arkadaşlıktan çıkarılsın mı?`)) return; await removeFriend(f.id); setFriends(prev => prev.filter(x => x.id !== f.id)); }} className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors" title="Arkadaşlıktan çıkar">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Messages Tab ── */}
          {tab === 'messages' && (
            <div>
              {conversations.length === 0 ? (
                <div className="text-center py-16 text-gray-600">
                  <MessageCircle size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Henüz mesajın yok.</p>
                </div>
              ) : (
                <div className="bg-[#18181b] border border-gray-800 rounded-xl overflow-hidden">
                  {conversations.map(conv => (
                    <button key={conv.userId} onClick={() => setActiveConv(conv)} className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-0 hover:bg-gray-800/50 transition-colors text-left">
                      <img src={avatar(conv.username, conv.avatar)} className="w-11 h-11 rounded-full object-cover flex-shrink-0" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-bold text-white text-sm">{conv.displayName || conv.username}</p>
                          <span className="text-[10px] text-gray-600">{new Date(conv.lastMessageAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <span className="bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0">{conv.unreadCount}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Requests Tab ── */}
          {tab === 'requests' && (
            <div>
              {pending.length === 0 ? (
                <div className="text-center py-16 text-gray-600">
                  <UserPlus size={40} className="mx-auto mb-3 opacity-30" />
                  <p>Bekleyen arkadaşlık isteği yok.</p>
                </div>
              ) : (
                <div className="bg-[#18181b] border border-gray-800 rounded-xl overflow-hidden">
                  {pending.map(req => {
                    const r = req.requester;
                    if (!r) return null;
                    return (
                      <div key={req.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800 last:border-0">
                        <Link to={`/profile/${r.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                          <img src={avatar(r.username, r.avatar)} className="w-11 h-11 rounded-full object-cover flex-shrink-0" alt="" />
                          <div className="min-w-0">
                            <p className="font-bold text-white text-sm truncate">{r.displayName || r.username}</p>
                            <p className="text-xs text-gray-500">@{r.username}</p>
                          </div>
                        </Link>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={async () => { await acceptFriendRequest(req.id); setPending(prev => prev.filter(x => x.id !== req.id)); loadAll(); }} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/30 hover:bg-green-500/20 transition-colors">
                            <Check size={13}/> Kabul
                          </button>
                          <button onClick={async () => { await rejectFriendRequest(req.id); setPending(prev => prev.filter(x => x.id !== req.id)); }} className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg bg-red-900/20 text-red-400 border border-red-900/30 hover:bg-red-900/30 transition-colors">
                            <X size={13}/> Reddet
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FriendsPage;
