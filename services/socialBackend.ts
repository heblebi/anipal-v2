import { supabase } from './supabase';
import type { User, Friendship, Message, Conversation, Report } from '../types';
import { UserRole } from '../types';

const mapProfile = (p: any): User => ({
    id: p.id, username: p.username, displayName: p.display_name || p.username,
    email: '', role: p.role as UserRole, avatar: p.avatar || '',
    coverImage: p.cover_image || '', bio: p.bio || '', xp: p.xp || 0, level: p.level || 1,
    isBanned: p.is_banned || false, showAnimeList: p.show_anime_list !== false,
    watchlist: [], watchedEpisodes: [], likedEpisodes: [], animeList: [], customLists: [],
    earnedAchievements: [], displayedBadges: [], notifications: [],
    allowMessages: p.allow_messages !== false, isPrivate: p.is_private || false,
    createdAt: p.created_at,
});

// ─── Friends ──────────────────────────────────────────────────────────────────

export const sendFriendRequest = async (addresseeId: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Giriş yapmalısın');
    const uid = session.user.id;
    const { data: blocked } = await supabase.from('friendships')
        .select('id').eq('requester_id', addresseeId).eq('addressee_id', uid).eq('status', 'blocked').maybeSingle();
    if (blocked) throw new Error('Bu kullanıcıyla bağlantı kurulamaz');
    const { error } = await supabase.from('friendships').insert({ requester_id: uid, addressee_id: addresseeId });
    if (error) throw new Error(error.message);
    // Notify addressee
    const [{ data: addrProf }, { data: me }] = await Promise.all([
        supabase.from('profiles').select('notifications').eq('id', addresseeId).single(),
        supabase.from('profiles').select('username,display_name').eq('id', uid).single(),
    ]);
    if (addrProf && me) {
        const notifs = addrProf.notifications || [];
        await supabase.from('profiles').update({
            notifications: [{ id: `notif-${Date.now()}`, userId: addresseeId, type: 'FOLLOW', title: 'Arkadaşlık İsteği', message: `${me.display_name || me.username} sana arkadaşlık isteği gönderdi.`, isRead: false, createdAt: new Date().toISOString() }, ...notifs]
        }).eq('id', addresseeId);
    }
};

export const acceptFriendRequest = async (friendshipId: string): Promise<void> => {
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    if (error) throw new Error(error.message);
};

export const rejectFriendRequest = async (friendshipId: string): Promise<void> => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
};

export const removeFriend = async (friendshipId: string): Promise<void> => {
    await supabase.from('friendships').delete().eq('id', friendshipId);
};

export const blockUser = async (targetId: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Giriş yapmalısın');
    const uid = session.user.id;
    await supabase.from('friendships').delete()
        .or(`and(requester_id.eq.${uid},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${uid})`);
    const { error } = await supabase.from('friendships').insert({ requester_id: uid, addressee_id: targetId, status: 'blocked' });
    if (error) throw new Error(error.message);
};

export const unblockUser = async (targetId: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase.from('friendships').delete().eq('requester_id', session.user.id).eq('addressee_id', targetId).eq('status', 'blocked');
};

export const getFriendshipStatus = async (targetId: string): Promise<Friendship | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    const uid = session.user.id;
    const { data } = await supabase.from('friendships').select('*')
        .or(`and(requester_id.eq.${uid},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${uid})`)
        .maybeSingle();
    if (!data) return null;
    return { id: data.id, requesterId: data.requester_id, addresseeId: data.addressee_id, status: data.status, createdAt: data.created_at };
};

export const getFriends = async (userId: string): Promise<Friendship[]> => {
    const { data } = await supabase.from('friendships')
        .select('*, requester:profiles!friendships_requester_id_fkey(id,username,display_name,avatar), addressee:profiles!friendships_addressee_id_fkey(id,username,display_name,avatar)')
        .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
        .eq('status', 'accepted');
    return (data || []).map((f: any) => ({
        id: f.id, requesterId: f.requester_id, addresseeId: f.addressee_id, status: f.status, createdAt: f.created_at,
        requester: f.requester ? { id: f.requester.id, username: f.requester.username, displayName: f.requester.display_name, avatar: f.requester.avatar } : undefined,
        addressee: f.addressee ? { id: f.addressee.id, username: f.addressee.username, displayName: f.addressee.display_name, avatar: f.addressee.avatar } : undefined,
    }));
};

export const getPendingRequests = async (userId: string): Promise<Friendship[]> => {
    const { data } = await supabase.from('friendships')
        .select('*, requester:profiles!friendships_requester_id_fkey(id,username,display_name,avatar)')
        .eq('addressee_id', userId).eq('status', 'pending');
    return (data || []).map((f: any) => ({
        id: f.id, requesterId: f.requester_id, addresseeId: f.addressee_id, status: f.status, createdAt: f.created_at,
        requester: f.requester ? { id: f.requester.id, username: f.requester.username, displayName: f.requester.display_name, avatar: f.requester.avatar } : undefined,
    }));
};

export const searchUsers = async (query: string): Promise<User[]> => {
    if (!query.trim()) return [];
    const { data } = await supabase.from('profiles')
        .select('id,username,display_name,avatar,level,xp,role,allow_messages,is_private,created_at,is_banned,show_anime_list,cover_image,bio')
        .ilike('username', `%${query}%`).limit(10);
    return (data || []).map(mapProfile);
};

// ─── Messages ─────────────────────────────────────────────────────────────────

export const sendMessage = async (receiverId: string, content: string): Promise<Message> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Giriş yapmalısın');
    const { data: rec } = await supabase.from('profiles').select('allow_messages').eq('id', receiverId).single();
    if (rec && rec.allow_messages === false) throw new Error('Bu kullanıcı mesaj almıyor.');
    const { data, error } = await supabase.from('messages')
        .insert({ sender_id: session.user.id, receiver_id: receiverId, content })
        .select().single();
    if (error) throw new Error(error.message);
    return { id: data.id, senderId: data.sender_id, receiverId: data.receiver_id, content: data.content, isRead: data.is_read, createdAt: data.created_at };
};

export const getMessages = async (otherUserId: string): Promise<Message[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const uid = session.user.id;
    const { data } = await supabase.from('messages').select('*')
        .or(`and(sender_id.eq.${uid},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${uid})`)
        .order('created_at', { ascending: true });
    await supabase.from('messages').update({ is_read: true }).eq('sender_id', otherUserId).eq('receiver_id', uid).eq('is_read', false);
    return (data || []).map(m => ({ id: m.id, senderId: m.sender_id, receiverId: m.receiver_id, content: m.content, isRead: m.is_read, createdAt: m.created_at }));
};

export const getConversations = async (): Promise<Conversation[]> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return [];
    const uid = session.user.id;
    const { data } = await supabase.from('messages').select('*')
        .or(`sender_id.eq.${uid},receiver_id.eq.${uid}`)
        .order('created_at', { ascending: false });
    if (!data) return [];
    const seen = new Map<string, any>();
    for (const m of data) {
        const otherId = m.sender_id === uid ? m.receiver_id : m.sender_id;
        if (!seen.has(otherId)) seen.set(otherId, m);
    }
    const convs: Conversation[] = [];
    for (const [otherId, lastMsg] of seen.entries()) {
        const { data: p } = await supabase.from('profiles').select('id,username,display_name,avatar').eq('id', otherId).single();
        const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true })
            .eq('sender_id', otherId).eq('receiver_id', uid).eq('is_read', false);
        if (p) convs.push({ userId: p.id, username: p.username, displayName: p.display_name, avatar: p.avatar, lastMessage: lastMsg.content, lastMessageAt: lastMsg.created_at, unreadCount: count || 0 });
    }
    return convs.slice(0, 10);
};

export const getTotalUnreadMessages = async (): Promise<number> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return 0;
    const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true })
        .eq('receiver_id', session.user.id).eq('is_read', false);
    return count || 0;
};

// ─── Reports ──────────────────────────────────────────────────────────────────

export const reportUser = async (reportedUserId: string, reason: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Giriş yapmalısın');
    const { error } = await supabase.from('reports').insert({ reporter_id: session.user.id, reported_user_id: reportedUserId, reason, type: 'profile' });
    if (error) throw new Error(error.message);
};

export const reportComment = async (commentId: string, reportedUserId: string, reason: string): Promise<void> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Giriş yapmalısın');
    const { error } = await supabase.from('reports').insert({ reporter_id: session.user.id, reported_user_id: reportedUserId, comment_id: commentId, reason, type: 'comment' });
    if (error) throw new Error(error.message);
};

export const getReports = async (): Promise<Report[]> => {
    const { data } = await supabase.from('reports')
        .select('*, reporter:profiles!reports_reporter_id_fkey(username), reported:profiles!reports_reported_user_id_fkey(username)')
        .order('created_at', { ascending: false });
    return (data || []).map((r: any) => ({
        id: r.id, reporterId: r.reporter_id, reporterUsername: r.reporter?.username,
        reportedUserId: r.reported_user_id, reportedUsername: r.reported?.username,
        commentId: r.comment_id, reason: r.reason, type: r.type, status: r.status, createdAt: r.created_at,
    }));
};

export const updateReportStatus = async (id: string, status: 'resolved' | 'dismissed'): Promise<void> => {
    await supabase.from('reports').update({ status }).eq('id', id);
};
