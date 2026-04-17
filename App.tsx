import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './services/supabase';
import Layout from './components/Layout';
import Home from './pages/Home';
import Explore from './pages/Explore';
import NewsPage from './pages/NewsPage';
import Login from './pages/Login';
import Register from './pages/Register';
import AnimeDetail from './pages/AnimeDetail';
import NewsDetailPage from './pages/NewsDetailPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import AddAnimePage from './pages/AddAnimePage';
import AddEpisodePage from './pages/AddEpisodePage';
import ManagePanel from './pages/ManagePanel';
import AnimePage from './pages/AnimePage';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import AnimeRequestPage from './pages/AnimeRequestPage';
import FriendsPage from './pages/FriendsPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SiteSettingsProvider } from './context/SiteSettingsContext';
import { UserRole } from './types';
import ContributePage from './pages/ContributePage';
import MyContributionsPage from './pages/MyContributionsPage';
import ForgotPassword from './pages/ForgotPassword';
import PrivacyPage from './pages/PrivacyPage';

// Supabase PASSWORD_RECOVERY eventini global olarak dinle
const RecoveryHandler = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('pw_recovery', '1');
        navigate('/forgot-password', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);
  return null;
};

// Normal kullanıcı korumalı rota
const ProtectedRoute = ({ children, requireRole }: { children?: React.ReactNode, requireRole?: UserRole[] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-[#0f0f10]">
      <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (requireRole && user && !requireRole.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
};


const AppRoutes = () => {
  return (
    <>
      <RecoveryHandler />
      <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/news/:id" element={<NewsDetailPage />} />
      <Route path="/anime/:id" element={<AnimePage />} />
      <Route path="/anime/:id/watch" element={<AnimeDetail />} />

      {/* Kullanıcı korumalı rotalar */}
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/request" element={<AnimeRequestPage />} />
      <Route path="/profile/:userId" element={<Profile />} />
      <Route path="/social" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />

      {/* Admin paneli — normal Supabase auth, ADMIN rolü gerekli */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<ProtectedRoute requireRole={[UserRole.ADMIN, UserRole.EDITOR]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/add-anime" element={<ProtectedRoute requireRole={[UserRole.ADMIN]}><AddAnimePage /></ProtectedRoute>} />
      <Route path="/admin/add-episode/:id" element={<ProtectedRoute requireRole={[UserRole.ADMIN, UserRole.MODERATOR]}><AddEpisodePage /></ProtectedRoute>} />

      {/* Moderatör / Editör paneli */}
      <Route path="/panel" element={
        <ProtectedRoute requireRole={[UserRole.MODERATOR, UserRole.EDITOR]}>
          <ManagePanel />
        </ProtectedRoute>
      } />

      {/* Bölüm katkısı */}
      <Route path="/contribute" element={<ProtectedRoute requireRole={[UserRole.EDITOR, UserRole.ADMIN, UserRole.MODERATOR]}><ContributePage /></ProtectedRoute>} />
      <Route path="/contribute/:animeId" element={<ProtectedRoute requireRole={[UserRole.EDITOR, UserRole.ADMIN, UserRole.MODERATOR]}><ContributePage /></ProtectedRoute>} />
      <Route path="/my-contributions" element={<ProtectedRoute><MyContributionsPage /></ProtectedRoute>} />

      <Route path="/privacy" element={<PrivacyPage />} />

      {/* Eski /add-anime linkini admin'e yönlendir */}
      <Route path="/add-anime" element={<Navigate to="/admin/add-anime" />} />
    </Routes>
    </>
  );
};

const App = () => {
  return (
    <SiteSettingsProvider>
      <AuthProvider>
        <HashRouter>
          <Layout>
            <AppRoutes />
          </Layout>
        </HashRouter>
      </AuthProvider>
    </SiteSettingsProvider>
  );
};

export default App;
