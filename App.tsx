import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import ManagePanel from './pages/ManagePanel';
import AnimePage from './pages/AnimePage';
import Settings from './pages/Settings';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import { AuthProvider, useAuth } from './context/AuthContext';
import { getAdminSession } from './services/adminAuth';
import { UserRole } from './types';

// Normal kullanıcı korumalı rota
const ProtectedRoute = ({ children, requireRole }: { children?: React.ReactNode, requireRole?: UserRole[] }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (requireRole && user && !requireRole.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
};

// Admin korumalı rota — normal kullanıcı sisteminden bağımsız
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const session = getAdminSession();
  if (!session) return <Navigate to="/admin" />;
  return <>{children}</>;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/leaderboard" element={<Leaderboard />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/news/:id" element={<NewsDetailPage />} />
      <Route path="/anime/:id" element={<AnimePage />} />
      <Route path="/anime/:id/watch" element={<AnimeDetail />} />

      {/* Kullanıcı korumalı rotalar */}
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/profile/:userId" element={<Profile />} />

      {/* Admin — ayrı giriş sistemi */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/add-anime" element={<AdminRoute><AddAnimePage /></AdminRoute>} />

      {/* Moderatör / Editör paneli */}
      <Route path="/panel" element={
        <ProtectedRoute requireRole={[UserRole.MODERATOR, UserRole.EDITOR]}>
          <ManagePanel />
        </ProtectedRoute>
      } />

      {/* Eski /add-anime linkini admin'e yönlendir */}
      <Route path="/add-anime" element={<Navigate to="/admin/add-anime" />} />
    </Routes>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Layout>
          <AppRoutes />
        </Layout>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
