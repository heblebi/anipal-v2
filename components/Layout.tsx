import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './Button';
import { UserRole, Notification } from '../types';
import { LogOut, Menu, X, Settings, User as UserIcon, Search, Bell, ChevronDown, Send } from 'lucide-react';
import { useSiteSettings } from '../context/SiteSettingsContext';
import { getNotifications, markNotificationsAsRead } from '../services/mockBackend';

const Layout = ({ children }: { children?: React.ReactNode }) => {
  const { user, isAuthenticated, logoutUser } = useAuth();
  const { settings: siteSettings } = useSiteSettings();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  // Notification State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Profile dropdown
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const location = useLocation();

  useEffect(() => {
      const handleScroll = () => setScrolled(window.scrollY > 20);
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Poll for notifications every 60 seconds
  useEffect(() => {
      if(!user) return;
      let pending = false;
      const fetchNotifs = async () => {
          if (pending) return;
          pending = true;
          try {
              const data = await getNotifications(user.id);
              setNotifications(data);
              setUnreadCount(data.filter(n => !n.isRead).length);
          } catch { /* ignore */ } finally {
              pending = false;
          }
      };
      fetchNotifs();
      const interval = setInterval(fetchNotifs, 60000);
      return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    logoutUser();
    setShowProfileMenu(false);
  };

  // Close profile menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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
                <Link to="/" className="flex items-center gap-1 group">
                    <img src={siteSettings.navbar_logo || '/logo.png'} alt="Anipal Logo" className="w-12 h-12 md:w-20 md:h-20 object-contain -mr-2 md:-mr-5 transform group-hover:-rotate-12 transition-transform" />
                    <span className="text-xl md:text-2xl font-black tracking-tighter bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(251,146,60,0.4)]">ANIPAL</span>
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
                   {user.role === UserRole.ADMIN && (
                    <Link to="/admin">
                        <Button variant="secondary" className="px-3 py-1.5 text-xs h-8">Yönetim</Button>
                    </Link>
                   )}
                   {(user.role === UserRole.MODERATOR || user.role === UserRole.EDITOR) && (
                    <Link to="/panel">
                        <Button variant="secondary" className="px-3 py-1.5 text-xs h-8">Panel</Button>
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
                           <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm bg-[#18181b] border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                               <div className="p-3 border-b border-gray-800 font-bold text-sm text-gray-300">Bildirimler</div>
                               <div className="max-h-72 overflow-y-auto custom-scrollbar">
                                   {notifications.length > 0 ? (
                                       notifications.map(notif => (
                                           <div key={notif.id} className={`p-3 border-b border-gray-800/50 hover:bg-gray-800 transition-colors ${!notif.isRead ? 'bg-amber-500/5' : ''}`}>
                                               <div className="flex items-start gap-3">
                                                   <div className="text-xl">
                                                       {notif.type === 'LEVEL_UP' && '🆙'}
                                                       {notif.type === 'BADGE_EARNED' && '🏆'}
                                                       {notif.type === 'NEW_EPISODE' && '📺'}
                                                       {notif.type === 'FOLLOW' && '👤'}
                                                       {notif.type === 'ANIME_REQUEST' && '🎌'}
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

                   <div className="relative" ref={profileMenuRef}>
                      <button
                        onClick={() => setShowProfileMenu(v => !v)}
                        className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                          alt=""
                          className="w-8 h-8 rounded-full border border-gray-700 object-cover"
                        />
                        <div className="hidden lg:flex flex-col text-left">
                            <span className="text-xs font-bold text-white">{user.displayName || user.username}</span>
                            <span className="text-[10px] text-gray-500">@{user.username}</span>
                        </div>
                        <ChevronDown size={14} className={`text-gray-400 transition-transform hidden lg:block ${showProfileMenu ? 'rotate-180' : ''}`} />
                      </button>

                      {showProfileMenu && (
                        <div className="absolute right-0 mt-3 w-48 bg-[#18181b] border border-gray-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                          <div className="p-3 border-b border-gray-800">
                            <p className="text-xs font-bold text-white truncate">{user.displayName || user.username}</p>
                            <p className="text-[10px] text-gray-500">@{user.username}</p>
                            <p className="text-[10px] text-amber-500">Seviye {user.level} · {user.xp} XP</p>
                          </div>
                          <Link
                            to="/profile"
                            onClick={() => setShowProfileMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                          >
                            <UserIcon size={15} /> Profil
                          </Link>
                          <Link
                            to="/settings"
                            onClick={() => setShowProfileMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                          >
                            <Settings size={15} /> Ayarlar
                          </Link>
                          <Link
                            to="/request"
                            onClick={() => setShowProfileMenu(false)}
                            className="flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                          >
                            <Send size={15} /> İstek / Öneri
                          </Link>
                          <div className="border-t border-gray-800">
                            <button
                              onClick={handleLogout}
                              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors"
                            >
                              <LogOut size={15} /> Çıkış Yap
                            </button>
                          </div>
                        </div>
                      )}
                   </div>
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

            {/* Mobile: bell + menu */}
            <div className="md:hidden flex items-center gap-1">
              {isAuthenticated && user && (
                <button onClick={handleNotifClick} className="relative p-3 text-gray-300 hover:text-white">
                  <Bell size={20} />
                  {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse border border-[#0f0f10]"></span>
                  )}
                </button>
              )}
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-white p-3">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-[#18181b] border-b border-gray-800 animate-in slide-in-from-top-5 duration-200 absolute w-full">
            <div className="px-5 pt-4 pb-6 space-y-1">
              {[
                { to: '/', label: 'Ana Sayfa' },
                { to: '/news', label: 'Haberler' },
                { to: '/explore', label: 'Keşfet' },
                { to: '/leaderboard', label: 'Sıralama' },
              ].map(({ to, label }) => (
                <Link key={to} to={to} onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center py-3 text-base font-bold border-b border-gray-800 ${location.pathname === to ? 'text-amber-500' : 'text-gray-300'}`}
                >{label}</Link>
              ))}
              <div className="pt-2">
                {isAuthenticated && user ? (
                  <>
                    {user.role === UserRole.ADMIN && (
                      <Link to="/admin" onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center py-3 text-base font-bold text-amber-500 border-b border-gray-800"
                      >Yönetim</Link>
                    )}
                    {(user.role === UserRole.MODERATOR || user.role === UserRole.EDITOR) && (
                      <Link to="/panel" onClick={() => setIsMobileMenuOpen(false)}
                        className="flex items-center py-3 text-base font-bold text-amber-500 border-b border-gray-800"
                      >Panel</Link>
                    )}
                    <Link to="/profile" onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 py-3 border-b border-gray-800"
                    >
                      <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`}
                        className="w-9 h-9 rounded-full border border-gray-700 object-cover" alt="" />
                      <div>
                        <div className="text-white font-bold text-sm">{user.username}</div>
                        <div className="text-amber-500 text-xs">Seviye {user.level}</div>
                      </div>
                    </Link>
                    <Link to="/settings" onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-3 text-gray-400 border-b border-gray-800 text-sm"
                    ><Settings size={16} /> Ayarlar</Link>
                    <Link to="/request" onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-2 py-3 text-gray-400 border-b border-gray-800 text-sm"
                    ><Send size={16} /> İstek / Öneri</Link>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 py-3 text-red-400 text-sm font-bold w-full"
                    ><LogOut size={16} /> Çıkış Yap</button>
                  </>
                ) : (
                  <div className="flex gap-3 pt-2">
                    <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}
                      className="flex-1 text-center py-3 text-sm font-bold text-gray-300 border border-gray-700 rounded-xl"
                    >Giriş Yap</Link>
                    <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}
                      className="flex-1 text-center py-3 text-sm font-bold text-black bg-amber-500 rounded-xl"
                    >Kayıt Ol</Link>
                  </div>
                )}
              </div>
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
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8">
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