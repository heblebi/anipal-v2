import React, { useState, useEffect, useRef } from 'react';
import { X, Send, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getConversations, getMessages, sendMessage } from '../services/socialBackend';
import type { Conversation, Message } from '../types';
import { Link } from 'react-router-dom';

interface ChatModalProps {
  onClose: () => void;
  initialUserId?: string;
  initialUsername?: string;
  initialAvatar?: string;
}

const ChatModal: React.FC<ChatModalProps> = ({ onClose, initialUserId, initialUsername, initialAvatar }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<{ userId: string; username: string; avatar?: string } | null>(
    initialUserId ? { userId: initialUserId, username: initialUsername || '', avatar: initialAvatar } : null
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (activeConv) loadMessages();
    if (pollRef.current) clearInterval(pollRef.current);
    if (activeConv) {
      pollRef.current = setInterval(loadMessages, 5000);
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [activeConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await getConversations();
      setConversations(data);
      if (initialUserId && !data.find(c => c.userId === initialUserId)) {
        // New conversation, not in list yet
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!activeConv) return;
    try {
      const data = await getMessages(activeConv.userId);
      setMessages(data);
    } catch { /* ignore */ }
  };

  const handleSend = async () => {
    if (!input.trim() || !activeConv || sending) return;
    setSending(true);
    try {
      const msg = await sendMessage(activeConv.userId, input.trim());
      setMessages(prev => [...prev, msg]);
      setInput('');
      loadConversations();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  };

  const avatar = (u: { username: string; avatar?: string | null }) =>
    u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:w-96 h-[85vh] sm:h-[600px] bg-[#18181b] border border-gray-800 rounded-t-2xl sm:rounded-2xl flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
          {activeConv ? (
            <div className="flex items-center gap-3 min-w-0">
              <button onClick={() => setActiveConv(null)} className="text-gray-400 hover:text-white flex-shrink-0">
                <ArrowLeft size={18} />
              </button>
              <Link to={`/profile/${activeConv.userId}`} onClick={onClose} className="flex items-center gap-2 min-w-0 hover:opacity-80">
                <img src={avatar({ username: activeConv.username, avatar: activeConv.avatar })} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt="" />
                <span className="font-bold text-sm text-white truncate">{activeConv.username}</span>
              </Link>
            </div>
          ) : (
            <span className="font-bold text-white">Mesajlar</span>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-white flex-shrink-0 ml-2"><X size={18} /></button>
        </div>

        {/* Body */}
        {!activeConv ? (
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">Yükleniyor...</div>
            ) : conversations.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm text-center px-8">Henüz mesaj yok. Bir profil sayfasından mesaj gönderebilirsin.</div>
            ) : (
              conversations.map(conv => (
                <button key={conv.userId} onClick={() => setActiveConv(conv)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-800 transition-colors border-b border-gray-800/50 text-left">
                  <img src={avatar(conv)} className="w-10 h-10 rounded-full object-cover flex-shrink-0" alt="" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-white">{conv.displayName || conv.username}</span>
                      {conv.unreadCount > 0 && (
                        <span className="bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded-full">{conv.unreadCount}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{conv.lastMessage}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        ) : (
          <>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-gray-600 text-sm pt-8">Henüz mesaj yok. İlk mesajı gönder!</div>
              )}
              {messages.map(msg => {
                const isMe = msg.senderId === user?.id;
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

            {/* Input */}
            <div className="px-3 py-3 border-t border-gray-800 flex gap-2 flex-shrink-0">
              <input
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-amber-500 focus:outline-none"
                placeholder="Mesaj yaz..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black rounded-xl px-3 py-2 transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ChatModal;
