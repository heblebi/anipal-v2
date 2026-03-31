import React, { useState, useEffect } from 'react';
import { getLeaderboard } from '../services/mockBackend';
import { User } from '../types';
import { useAuth } from '../context/AuthContext';
import { Trophy, Medal, Star } from 'lucide-react';
import { Link } from 'react-router-dom';

const Leaderboard = () => {
  const [users, setUsers] = useState<User[]>([]);
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      const data = await getLeaderboard();
      setUsers(data);
      setLoading(false);
    };
    fetchUsers();
  }, []);

  const getCurrentUserRank = () => {
    if (!currentUser) return null;
    const rank = users.findIndex(u => u.id === currentUser.id);
    return rank !== -1 ? rank + 1 : '10+';
  };

  const getRankIcon = (index: number) => {
    switch(index) {
        case 0: return <Trophy className="text-yellow-400 w-8 h-8" />;
        case 1: return <Medal className="text-gray-300 w-8 h-8" />;
        case 2: return <Medal className="text-amber-700 w-8 h-8" />;
        default: return <span className="text-2xl font-bold text-gray-600 font-mono">#{index + 1}</span>;
    }
  };

  if(loading) return <div className="min-h-screen pt-24 text-center">Yükleniyor...</div>;

  return (
    <div className="min-h-screen pt-24 px-4 pb-20 max-w-4xl mx-auto">
        <div className="text-center mb-12">
            <h1 className="text-4xl font-black text-white mb-2 flex justify-center items-center gap-3">
                <Trophy className="text-amber-500" /> Ayın Sıralaması
            </h1>
            <p className="text-gray-400">En aktif üyelerimiz ve XP şampiyonları</p>
        </div>

        <div className="bg-[#18181b] border border-gray-800 rounded-xl overflow-hidden shadow-2xl">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 p-4 border-b border-gray-800 text-xs font-bold text-gray-500 uppercase tracking-wider bg-black/20">
                <div className="col-span-2 text-center">Sıra</div>
                <div className="col-span-6">Kullanıcı</div>
                <div className="col-span-2 text-center">Level</div>
                <div className="col-span-2 text-right">XP</div>
            </div>

            {/* List */}
            <div className="divide-y divide-gray-800">
                {users.map((u, index) => (
                    <div key={u.id} className={`grid grid-cols-12 gap-4 p-4 items-center hover:bg-white/5 transition-colors ${currentUser?.id === u.id ? 'bg-amber-500/10 border-l-4 border-l-amber-500' : ''}`}>
                        <div className="col-span-2 flex justify-center">
                            {getRankIcon(index)}
                        </div>
                        <div className="col-span-6 flex items-center gap-3">
                            <Link to={`/profile/${u.id}`}>
                                <img src={u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.username}`} className="w-10 h-10 rounded-full border border-gray-700 hover:border-amber-500 transition-colors object-cover" alt="" />
                            </Link>
                            <div>
                                <Link to={`/profile/${u.id}`} className={`font-bold hover:text-amber-400 transition-colors ${currentUser?.id === u.id ? 'text-amber-500' : 'text-white'}`}>{u.username}</Link>
                                <div className="text-xs text-gray-500">{u.earnedAchievements?.length || 0} Başarım</div>
                            </div>
                        </div>
                        <div className="col-span-2 text-center">
                            <span className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-bold">Lvl {u.level || 1}</span>
                        </div>
                        <div className="col-span-2 text-right font-mono text-amber-500 font-bold">
                            {u.xp || 0} XP
                        </div>
                    </div>
                ))}
            </div>

            {/* Current User Sticky Footer */}
            {currentUser && getCurrentUserRank() && (
                <div className="bg-gray-900 border-t border-gray-700 p-4 sticky bottom-0">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Senin Sıran:</span>
                        <span className="font-bold text-white text-lg">#{getCurrentUserRank()}</span>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};

export default Leaderboard;