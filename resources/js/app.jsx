import React, { Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import useStoredSession from './hooks/useStoredSession.js';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx';

const queryClient = new QueryClient();
const LandingPage = React.lazy(() => import('./pages/LandingPage.jsx'));
const LoginPage = React.lazy(() => import('./pages/LoginPage.jsx'));
const PublicBlogPost = React.lazy(() => import('./pages/PublicBlogPost.jsx'));
const PublicBlogList = React.lazy(() => import('./pages/PublicBlogList.jsx'));
const Shell = React.lazy(() => import('./pages/Shell.jsx'));

function AppLoader() {
  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#806b64', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13 }}>
      Memuat aplikasi...
    </div>
  );
}

function App() {
  const [session, setSession] = useStoredSession();
  const location = useLocation();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(location.search);

  const handleLogin = (newSession) => {
    setSession(newSession);
    const target = location.pathname === '/login'
      ? (searchParams.get('redirect') || '/dashboard')
      : location.pathname;

    navigate(target === '/' ? '/dashboard' : target, { replace: true });
  };

  const handleLogout = () => {
    localStorage.removeItem('corpu_session');
    window.location.assign('/');
  };

  const handleUpdateSession = (updatedUser, sessionPatch = {}) => {
    setSession({ ...session, ...sessionPatch, user: { ...session?.user, ...updatedUser } });
  };

  if (!session) {
    return (
      <Routes>
        <Route
          path="/"
          element={searchParams.get('sso_unavailable') === '1' ? <Navigate to="/login?sso_unavailable=1" replace /> : <LandingPage />}
        />
        <Route path="/blog" element={<PublicBlogList />} />
        <Route path="/artikel/:slug" element={<PublicBlogPost />} />
        <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route
        path="/"
        element={searchParams.get('sso_unavailable') === '1' ? <Navigate to="/login?sso_unavailable=1" replace /> : <LandingPage />}
      />
      <Route path="/artikel/:slug" element={<PublicBlogPost />} />
      <Route path="/login" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Shell session={session} onLogout={handleLogout} onUpdateSession={handleUpdateSession} />} />
    </Routes>
  );
}

function ThemedToaster() {
  const { ui } = useTheme();

  return (
    <Toaster
      position={ui.toastPosition || 'top-right'}
      richColors={ui.toastStyle !== 'minimal'}
      closeButton
      toastOptions={{ className: `toast-${ui.toastStyle || 'solid'}` }}
    />
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<AppLoader />}>
            <App />
          </Suspense>
          <ThemedToaster />
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
