import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './Button';
import { UserRole, Notification } from '../types';
import { Cat, LogOut, Menu, X, Settings, User as UserIcon, Compass, Search, Trophy, Bell, Newspaper } from 'lucide-react';
import { getNotifications, markNotificationsAsRead } from '../services/mockBackend';

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { user, isAuthenticated, logoutUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const location = useLocation();

  useEffect(() => {
      const handleScroll = () => setScrolled(window.scrollY > 20);
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Poll for notifications every 10 seconds (Mock real-time)
  useEffect(() => {
      if(!user) return;
      const fetchNotifs = async () => {
          const data = await getNotifications(user.id);
          setNotifications(data);
          setUnreadCount(data.filter(n => !n.isRead).length);
      };
      fetchNotifs(); // Initial
      const interval = setInterval(fetchNotifs, 5000);
      return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logoutUser();
  };

  const handleNotifClick = async () => {
      setShowNotifs(!showNotifs);
      if (!showNotifs && unreadCount > 0 && user) {
          await markNotificationsAsRead(user.id);
          setUnreadCount(0);
          // Update local state to show read immediately
          setNotifications(notifications.map(n => ({...n, isRead: true})));
      }
  };

  const navLinkClass = (path: string) => 
    `text-sm font-medium transition-colors hover:text-amber-500 ${location.pathname === path ? 'text-amber-500' : 'text-gray-300'}`;

  return (
    <div className="min-h-screen bg-[#0f0f10] text-gray-100 flex flex-col font-sans selection:bg-amber-500 selection:text-black">
      {/* Navbar - Fixed & Transparent to Solid */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${scrolled ? 'bg-[#0f0f10]/95 backdrop-blur-md border-b border-gray-800' : 'bg-gradient-to-b from-black/80 to-transparent border-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            
            <div className="flex items-center gap-8">
                {/* Brand */}
                <Link to="/" className="flex items-center gap-2 group">
                    <Cat className="w-8 h-8 text-amber-500 transform group-hover:-rotate-12 transition-transform" />
                    <span className="text-2xl font-black tracking-tighter text-white">ANIPAL</span>
                </Link>

                {/* Desktop Nav */}
                <div className="hidden md:flex items-center space-x-6">
                    <Link to="/" className={navLinkClass('/')}>Ana Sayfa</Link>
                    <Link to="/news" className={navLinkClass('/news')}>Haberler</Link>
                    <Link to="/explore" className={navLinkClass('/explore')}>Keşfet</Link>
                    <Link to="/leaderboard" className={navLinkClass('/leaderboard')}>Sıralama</Link>
                </div>
            </div>

            {/* Desktop Auth & Actions */}
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/explore" className="text-gray-400 hover:text-white mr-2"><Search size={20}/></Link>
              
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-4">
                   {(user.role === UserRole.ADMIN || user.role === UserRole.MODERATOR) && (
                    <Link to="/admin">
                        <Button variant="secondary" className="px-3 py-1.5 text-xs h-8">Yönetim</Button>
                    </Link>
                   )}

                   {/* Notification Bell */}
                   <div className="relative">
                       <button onClick={handleNotifClick} className="relative p-2 text-gray-300 hover:text-white">
                           <Bell size={20} />
                           {unreadCount > 0 && (
                               <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-[#0f0f10]"></span>
                           )}
                       </button>

                       {/* Dropdown */}
                       {showNotifs && (
                           <div className="absolute right-0 mt-2 w-80 bg-[#18181b] border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                               <div className="p-3 border-b border-gray-800 font-bold text-sm text-gray-300">Bildirimler</div>
                               <div className="max-h-64 overflow-y-auto custom-scrollbar">
                                   {notifications.length > 0 ? (
                                       notifications.map(notif => (
                                           <div key={notif.id} className={`p-3 border-b border-gray-800/50 hover:bg-gray-800 transition-colors ${!notif.isRead ? 'bg-amber-500/5' : ''}`}>
                                               <div className="flex items-start gap-3">
                                                   <div className="text-xl">
                                                       {notif.type === 'LEVEL_UP' && '🆙'}
                                                       {notif.type === 'BADGE_EARNED' && '🏆'}
                                                       {notif.type === 'NEW_EPISODE' && '📺'}
                                                       {notif.type === 'FOLLOW' && '👤'}
                                                   </div>
                                                   <div>
                                                       <p className="text-xs font-bold text-amber-500 mb-0.5">{notif.title}</p>
                                                       <p className="text-xs text-gray-300 leading-tight">{notif.message}</p>
                                                       <p className="text-[10px] text-gray-600 mt-1">{new Date(notif.createdAt).toLocaleTimeString()}</p>
                                                   </div>
                                               </div>
                                           </div>
                                       ))
                                   ) : (
                                       <div className="p-4 text-center text-xs text-gray-500">Bildirim yok.</div>
                                   )}
                               </div>
                           </div>
                       )}
                   </div>

                   <div className="relative group">
                      <Link to="/profile" className="flex items-center gap-2">
                        <img src={user.avatar} alt="" className="w-8 h-8 rounded-full border border-gray-700" />
                        <div className="hidden lg:flex flex-col text-left">
                            <span className="text-xs font-bold text-white">{user.username}</span>
                            <span className="text-[10px] text-amber-500 font-bold">Lvl {user.level}</span>
                        </div>
                      </Link>
                   </div>
                   
                   <Button variant="ghost" onClick={handleLogout} title="Çıkış" className="p-2"><LogOut size={18} /></Button>
                </div>
              ) : (
                <>
                  <Link to="/login" className="text-sm font-bold text-gray-300 hover:text-white">Giriş Yap</Link>
                  <Link to="/register">
                    <Button variant="primary" className="px-5 py-1.5 text-sm h-9 font-bold">Kayıt Ol</Button>
                  </Link>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-2">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#18181b] border-b border-gray-800 animate-in slide-in-from-top-5 duration-200 absolute w-full">
            <div className="px-4 pt-4 pb-8 space-y-4">
              <Link to="/" className="block text-lg font-bold text-white">Ana Sayfa</Link>
              <Link to="/news" className="block text-lg font-bold text-gray-400">Haberler</Link>
              <Link to="/explore" className="block text-lg font-bold text-gray-400">Keşfet</Link>
              <Link to="/leaderboard" className="block text-lg font-bold text-amber-500">Sıralama</Link>
              <hr className="border-gray-800" />
              {isAuthenticated ? (
                  <>
                     <Link to="/profile" className="block text-gray-300">Profilim (Lvl {user?.level})</Link>
                     <button onClick={handleLogout} className="text-red-400">Çıkış Yap</button>
                  </>
              ) : (
                  <Link to="/login" className="block text-amber-500 font-bold">Giriş Yap</Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-[#0f0f10] py-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
                <span className="text-xl font-black text-white tracking-tighter mb-4 block">ANIPAL</span>
                <p className="text-gray-500 text-sm max-w-xs">En sevdiğiniz animeleri yüksek kalitede, reklamsız ve kesintisiz izleyin.</p>
            </div>
            <div>
                <h4 className="font-bold text-white mb-4">Keşfet</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                    <li><Link to="/news" className="hover:text-amber-500">Haberler</Link></li>
                    <li><Link to="/explore" className="hover:text-amber-500">Yeni Eklenenler</Link></li>
                    <li><Link to="/explore" className="hover:text-amber-500">Popüler</Link></li>
                    <li><Link to="/leaderboard" className="hover:text-amber-500">Sıralama</Link></li>
                </ul>
            </div>
            <div>
                <h4 className="font-bold text-white mb-4">Topluluk</h4>
                <ul className="space-y-2 text-sm text-gray-500">
                    <li><a href="#" className="hover:text-amber-500">Discord</a></li>
                    <li><a href="#" className="hover:text-amber-500">Twitter</a></li>
                    <li><a href="#" className="hover:text-amber-500">İstek Yap</a></li>
                </ul>
            </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-gray-900 text-center text-gray-600 text-xs">
          &copy; {new Date().getFullYear()} Anipal Inc.
        </div>
      </footer>
    </div>
  );
};

export default Layout;