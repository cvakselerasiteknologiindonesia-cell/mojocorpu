import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Award, Bell, CheckCircle, Coins, ExternalLink, KeyRound, LogOut, Menu, Search, X } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '../api.js';
import { getSidebarItems, getRoleNames } from '../utils/permissions.js';

const Dashboard = React.lazy(() => import('./Dashboard.jsx'));
const FacilitatorClasses = React.lazy(() => import('./FacilitatorClasses.jsx'));
const FacilitatorAssessments = React.lazy(() => import('./facilitator/FacilitatorAssessments.jsx'));
const FacilitatorAttendance = React.lazy(() => import('./facilitator/FacilitatorAttendance.jsx'));
const FacilitatorParticipants = React.lazy(() => import('./facilitator/FacilitatorParticipants.jsx'));
const FacilitatorMaterials = React.lazy(() => import('./facilitator/FacilitatorMaterials.jsx'));
const FacilitatorCompletion = React.lazy(() => import('./facilitator/FacilitatorCompletion.jsx'));
const FacilitatorEventSetup = React.lazy(() => import('./facilitator/FacilitatorEventSetup.jsx'));
const FacilitatorReports = React.lazy(() => import('./facilitator/FacilitatorReports.jsx'));
const FacilitatorKmsContribution = React.lazy(() => import('./facilitator/FacilitatorKmsContribution.jsx'));
const AdminRoles = React.lazy(() => import('./admin/AdminRoles.jsx'));
const AdminOpdUsers = React.lazy(() => import('./admin/AdminOpdUsers.jsx'));
const AdminOpdOpd = React.lazy(() => import('./admin/AdminOpdOpd.jsx'));
const AdminOpdFacilitators = React.lazy(() => import('./admin/AdminOpdFacilitators.jsx'));
const AdminOpdProposals = React.lazy(() => import('./admin/AdminOpdProposals.jsx'));
const AdminLms = React.lazy(() => import('./admin/AdminLms.jsx'));
const AdminOpdEvents = React.lazy(() => import('./admin/AdminOpdEvents.jsx'));
const AdminOpdKms = React.lazy(() => import('./admin/AdminOpdKms.jsx'));
const AdminOpdReports = React.lazy(() => import('./admin/AdminOpdReports.jsx'));
const AdminQuizzes = React.lazy(() => import('./admin/AdminQuizzes.jsx'));
const AdminSettings = React.lazy(() => import('./admin/AdminSettings.jsx'));
const AdminAuditLogs = React.lazy(() => import('./admin/AdminAuditLogs.jsx'));
const AdminSecurityDashboard = React.lazy(() => import('./admin/AdminSecurityDashboard.jsx'));
const AdminLearningPaths = React.lazy(() => import('./admin/AdminLearningPaths.jsx'));
const LearningPaths = React.lazy(() => import('./LearningPaths.jsx'));
const AsnAttendance = React.lazy(() => import('./asn/AsnAttendance.jsx'));
const AsnEvents = React.lazy(() => import('./asn/AsnEvents.jsx'));
const AsnEventLearn = React.lazy(() => import('./asn/AsnEventLearn.jsx'));
const DiscussionForum = React.lazy(() => import('./DiscussionForum.jsx'));
const Blog = React.lazy(() => import('./Blog.jsx'));
const PublicBlogPost = React.lazy(() => import('./PublicBlogPost.jsx'));
const CertificateBuilder = React.lazy(() => import('./CertificateBuilder.jsx'));
const FacilitatorNotifications = React.lazy(() => import('./facilitator/FacilitatorNotifications.jsx'));
const Leaderboard = React.lazy(() => import('./Leaderboard.jsx'));
const Wallet = React.lazy(() => import('./Wallet.jsx'));
const Store = React.lazy(() => import('./Store.jsx'));
const Achievements = React.lazy(() => import('./Achievements.jsx'));
const Profile = React.lazy(() => import('./Profile.jsx'));

const FACILITATOR_ROLES = ['fasilitator-internal', 'fasilitator-eksternal'];

const TYPE_META = {
  learning_path: { label: 'Kurikulum',      dot: '#c42007' },
  event:         { label: 'Kegiatan Pelatihan', dot: '#f4934a' },
  proposal:      { label: 'Usulan',             dot: '#f09040' },
  kms:           { label: 'Aset Pengetahuan',   dot: '#009e7a' },
  blog:          { label: 'Artikel',        dot: '#8b1200' },
  user:          { label: 'Pengguna',       dot: '#806b64' },
};

function PageLoader() {
  return (
    <div className="enterprise-card" style={{ padding: 18, color: 'var(--fg-3)', fontSize: 13 }}>
      Memuat halaman...
    </div>
  );
}

function useDebounce(value, delay) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
}

function GlobalSearch() {
  const navigate   = useNavigate();
  const wrapRef    = useRef(null);
  const inputRef   = useRef(null);
  const [query, setQuery]   = useState('');
  const [open,  setOpen]    = useState(false);
  const [active, setActive] = useState(0);
  const debounced = useDebounce(query, 280);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: () => api.get(`/search?q=${encodeURIComponent(debounced)}`).then((r) => r.data.data),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
  });

  useEffect(() => { setActive(0); }, [results]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const go = (path) => {
    navigate(path);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKey = (e) => {
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter')     { e.preventDefault(); if (results[active]) go(results[active].path); }
    if (e.key === 'Escape')    { setOpen(false); inputRef.current?.blur(); }
  };

  const showDrop = open && query.length >= 2;

  return (
    <div className="global-search" ref={wrapRef} style={{ position: 'relative' }}>
      <Search size={15} style={{ pointerEvents: 'none' }} />
      <input
        ref={inputRef}
        value={query}
        placeholder="Cari modul, kelas, pengetahuan..."
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKey}
      />
      {isFetching && query.length >= 2 && (
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 10, color: 'var(--fg-3)' }}>…</span>
      )}
      {showDrop && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'var(--bg)', border: '1px solid var(--border)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.14)', borderRadius: 8,
          zIndex: 9000, overflow: 'hidden', minWidth: 360,
        }}>
          {results.length === 0 && !isFetching && (
            <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--fg-3)' }}>Tidak ada hasil untuk "{query}"</div>
          )}
          {results.map((r, i) => {
            const meta = TYPE_META[r.type] ?? { label: r.label, dot: '#9ca3af' };
            return (
              <button
                key={i}
                type="button"
                onMouseDown={() => go(r.path)}
                onMouseEnter={() => setActive(i)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', padding: '10px 14px',
                  background: i === active ? 'var(--surface)' : 'transparent',
                  border: 'none', borderBottom: i < results.length - 1 ? '1px solid var(--border)' : 'none',
                  textAlign: 'left', cursor: 'pointer', transition: 'background 0.1s',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.dot, flexShrink: 0, marginTop: 5 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 1 }}>
                    <span style={{ fontWeight: 700, color: meta.dot }}>{meta.label}</span>
                    {r.sub ? <span> · {r.sub}</span> : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PasswordSetupModal({ user, onSkip, onSaved }) {
  const [form, setForm] = useState({ password: '', password_confirmation: '' });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (payload) => api.post('/profile/set-password', payload),
    onSuccess: (res) => {
      const payload = res.data?.data || {};
      toast.success('Password lokal berhasil dibuat.');
      onSaved(payload.user, { requires_password_setup: false });
    },
    onError: (e) => setError(e?.response?.data?.message || 'Gagal membuat password lokal.'),
  });

  const submit = (e) => {
    e.preventDefault();
    setError('');

    if (form.password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }

    if (form.password !== form.password_confirmation) {
      setError('Konfirmasi password belum sama.');
      return;
    }

    mutation.mutate(form);
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onSkip()}>
      <form className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 440 }} onSubmit={submit}>
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <KeyRound size={18} />
            <h3 style={{ margin: 0 }}>Buat Password Lokal</h3>
          </div>
          <button type="button" className="modal-close" onClick={onSkip} aria-label="Tutup"><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: 14 }}>
          <p style={{ margin: 0, color: 'var(--fg-3)', lineHeight: 1.6 }}>
            Akun SSO {user?.nip || user?.email || user?.name} belum memiliki password lokal.
            Password ini bisa dipakai sebagai akses cadangan selain SSO.
          </p>
          {error && <div className="profile-modal-err">{error}</div>}
          <label className="profile-modal-field">
            <span>Password Baru</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              autoFocus
            />
          </label>
          <label className="profile-modal-field">
            <span>Konfirmasi Password Baru</span>
            <input
              type="password"
              value={form.password_confirmation}
              onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
              autoComplete="new-password"
            />
          </label>
        </div>
        <div className="modal-foot">
          <button type="button" className="outline-button compact" onClick={onSkip}>Nanti saja</button>
          <button type="submit" className="primary-button compact" disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan...' : (
              <>
                <CheckCircle size={15} /> Simpan Password
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function Shell({ session, onLogout, onUpdateSession }) {
  const queryClient = useQueryClient();
  const nav = getSidebarItems(session);
  const roleLabel = getRoleNames(session.user).join(', ') || session.user?.user_type || 'ASN';
  const roles = getRoleNames(session.user);
  const isFacilitator = roles.some((r) => FACILITATOR_ROLES.includes(r));
  const isAsn = roles.includes('asn');
  const isSuperAdmin = roles.includes('super-admin');
  const isAdminOpd = roles.includes('admin-opd');
  const isAdminRole = isSuperAdmin || isAdminOpd;

  const { data: asnEventSidebarBadge = 0 } = useQuery({
    queryKey: ['notif-unread-count', 'training_event_asn', '/training-events'],
    queryFn: () => api.get('/notifications/unread-count', { params: { type: 'training_event_asn', link: '/training-events' } }).then((r) => r.data.data.count),
    enabled: isAsn,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const { data: adminProposalsData } = useQuery({
    queryKey: ['training-proposals-admin-badge'],
    queryFn: async () => (await api.get('/training-proposals?per_page=100')).data.data.data,
    enabled: isAdminRole,
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const adminProposalBadge = isAdminRole
    ? (adminProposalsData || []).filter((p) => {
        if (isSuperAdmin) return p.status === 'submitted';
        return p.updated_at && new Date(p.updated_at) >= sevenDaysAgo && ['approved', 'rejected'].includes(p.status);
      }).length
    : 0;

  const { data: walletBalance } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet').then((r) => r.data.data),
    staleTime: 60 * 1000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notif-unread-count'],
    queryFn: () => api.get('/notifications/unread-count').then((r) => r.data.data.count),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const { data: kmsSidebarBadge = 0 } = useQuery({
    queryKey: ['notif-unread-count', 'kms', '/kms-assets'],
    queryFn: () => api.get('/notifications/unread-count', { params: { type: 'kms', link: '/kms-assets' } }).then((r) => r.data.data.count),
    enabled: isSuperAdmin || isAdminOpd,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const { data: facilitatorEventSidebarBadge = 0 } = useQuery({
    queryKey: ['notif-unread-count', 'training_event', '/training-events'],
    queryFn: () => api.get('/notifications/unread-count', { params: { type: 'training_event', link: '/training-events' } }).then((r) => r.data.data.count),
    enabled: isFacilitator,
    refetchInterval: 10_000,
    staleTime: 5_000,
  });

  const markKmsBadgeRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all', { type: 'kms', link: '/kms-assets' }),
    onMutate: () => {
      queryClient.setQueryData(['notif-unread-count', 'kms', '/kms-assets'], 0);
      queryClient.setQueryData(['notif-unread-count'], (count) => (
        Number.isFinite(count) ? Math.max(0, count - kmsSidebarBadge) : count
      ));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notif-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notif-unread-count', 'kms', '/kms-assets'] });
    },
  });

  const markTrainingEventBadgeRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all', { type: 'training_event', link: '/training-events' }),
    onMutate: () => {
      queryClient.setQueryData(['notif-unread-count', 'training_event', '/training-events'], 0);
      queryClient.setQueryData(['notif-unread-count'], (count) => (
        Number.isFinite(count) ? Math.max(0, count - facilitatorEventSidebarBadge) : count
      ));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notif-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notif-unread-count', 'training_event', '/training-events'] });
    },
  });

  const markAsnTrainingEventBadgeRead = useMutation({
    mutationFn: () => api.patch('/notifications/read-all', { type: 'training_event_asn', link: '/training-events' }),
    onMutate: () => {
      queryClient.setQueryData(['notif-unread-count', 'training_event_asn', '/training-events'], 0);
      queryClient.setQueryData(['notif-unread-count'], (count) => (
        Number.isFinite(count) ? Math.max(0, count - asnEventSidebarBadge) : count
      ));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['notif-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notif-unread-count', 'training_event_asn', '/training-events'] });
    },
  });

  const location = useLocation();
  const [badgeToasts, setBadgeToasts] = useState([]);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [passwordPromptDismissed, setPasswordPromptDismissed] = useState(false);
  const shouldShowPasswordSetup = Boolean(session.requires_password_setup) && !passwordPromptDismissed;

  useEffect(() => {
    const handler = (e) => {
      const badges = e.detail || [];
      if (!badges.length) return;
      const id = Date.now();
      setBadgeToasts((prev) => [...prev, { id, badges }]);
      setTimeout(() => setBadgeToasts((prev) => prev.filter((t) => t.id !== id)), 5000);
    };
    window.addEventListener('badgesEarned', handler);
    return () => window.removeEventListener('badgesEarned', handler);
  }, []);

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      onLogout();
    }
  };

  return (
    <>
    <div className={`app-shell ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
      <header className="topbar">
        <div className="topbar-left">
          <button
            className="icon-button"
            aria-label={sidebarHidden ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
            title={sidebarHidden ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
            onClick={() => setSidebarHidden((v) => !v)}
          >
            <Menu size={18} />
          </button>
          <a className="topbar-brand" href="/" aria-label="CorpU BKPSDM Kabupaten Mojokerto">
            <img src="/images/corpu-topbar-logo.png" alt="CorpU BKPSDM Kabupaten Mojokerto" />
          </a>
        </div>

        <GlobalSearch />

        <div className="user-box">
          <a className="topbar-site-link" href="/" title="Lihat frontpage" aria-label="Lihat frontpage">
            <ExternalLink size={16} />
          </a>
          <NavLink to="/notifications" style={{ position: 'relative', display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }} title="Notifikasi">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--grape)', color: '#fff',
                borderRadius: '50%', width: 15, height: 15, fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/wallet" style={{ display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none',
            background: 'color-mix(in srgb, var(--sky) 12%, var(--bg))', border: '1px solid color-mix(in srgb, var(--sky) 30%, transparent)', borderRadius: 8, padding: '4px 10px',
            color: 'var(--grape)', fontWeight: 700, fontSize: 13 }} title="Dompet Token">
            <Coins size={14} />
            {walletBalance?.balance?.toLocaleString() ?? '—'}
          </NavLink>
          <NavLink to="/profile" style={{ textDecoration: 'none', color: 'inherit' }}>
            <strong>{session.user?.name || 'Pengguna CorpU'}</strong>
            <span>{roleLabel}</span>
          </NavLink>
          <button className="outline-button compact" onClick={logout}><LogOut size={15} /> Keluar</button>
        </div>
      </header>

      <div className="app-layout">
        <aside className="sidebar">
          {nav.map(({ section, to, label, icon: Icon }, index) => {
            const showSection = index === 0 || nav[index - 1].section !== section;
            const trainingBadge = isFacilitator ? facilitatorEventSidebarBadge : asnEventSidebarBadge;
            const badge = to === '/training-events'
              ? trainingBadge
              : to === '/training-proposals'
                ? adminProposalBadge
              : to === '/kms-assets'
                ? kmsSidebarBadge
                : 0;
            return (
              <React.Fragment key={to}>
                {showSection && <p className="sidebar-section">{section}</p>}
                <NavLink
                  to={to}
                  className={({ isActive }) => `sb-link ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (to === '/kms-assets' && kmsSidebarBadge > 0) {
                      markKmsBadgeRead.mutate();
                    }
                    if (to === '/training-events' && isFacilitator && facilitatorEventSidebarBadge > 0) {
                      markTrainingEventBadgeRead.mutate();
                    }
                    if (to === '/training-events' && isAsn && asnEventSidebarBadge > 0) {
                      markAsnTrainingEventBadgeRead.mutate();
                    }
                  }}
                >
                  <Icon size={16} />
                  <span>{label}</span>
                  {badge > 0 && <em className="sb-badge">{badge}</em>}
                </NavLink>
              </React.Fragment>
            );
          })}
        </aside>

        <main className="main-content">
          <div key={location.pathname} className="page-animate">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/dashboard" element={<Dashboard session={session} />} />
              <Route path="/users" element={<AdminOpdUsers />} />
              <Route path="/roles" element={<AdminRoles />} />
              <Route path="/opds" element={<AdminOpdOpd />} />
              <Route path="/facilitators" element={<AdminOpdFacilitators />} />
              <Route path="/facilitator/classes" element={<FacilitatorClasses />} />
              <Route path="/facilitator/materials" element={<FacilitatorMaterials />} />
              <Route path="/facilitator/assessments" element={<FacilitatorAssessments />} />
              <Route path="/facilitator/participants" element={<FacilitatorParticipants />} />
              <Route path="/facilitator/completion" element={<FacilitatorCompletion />} />
              <Route path="/facilitator/reports" element={<FacilitatorReports />} />
              <Route path="/facilitator/kms-contribution" element={<FacilitatorKmsContribution session={session} />} />
              <Route path="/training-proposals" element={<AdminOpdProposals />} />
              <Route path="/proposal-review" element={<Navigate to="/training-proposals" replace />} />
              <Route
                path="/training-events"
                element={isAsn
                  ? <AsnEvents />
                  : isAdminRole
                    ? <Navigate to="/training-proposals" replace />
                    : <AdminOpdEvents session={session} />}
              />
              <Route path="/training-events/:uuid/learn" element={<AsnEventLearn />} />
              <Route path="/training-events/:uuid" element={<FacilitatorEventSetup session={session} />} />
              <Route path="/lms" element={<AdminLms />} />
              <Route path="/kms-assets" element={<AdminOpdKms session={session} />} />
              <Route path="/quizzes" element={<AdminQuizzes />} />
              <Route
                path="/certificates"
                element={<CertificateBuilder session={session} sidebarHidden={sidebarHidden} onToggleSidebar={() => setSidebarHidden((v) => !v)} />}
              />
              <Route path="/discussion-forum" element={<DiscussionForum session={session} />} />
              <Route path="/blog" element={<Blog session={session} />} />
              <Route path="/artikel/:slug" element={<PublicBlogPost />} />
              <Route path="/attendance" element={isAsn ? <AsnAttendance /> : <FacilitatorAttendance />} />
              <Route path="/notifications" element={<FacilitatorNotifications />} />
              <Route path="/audit-logs" element={<AdminAuditLogs />} />
              <Route path="/security" element={<AdminSecurityDashboard session={session} />} />
              <Route path="/curriculum" element={<AdminLearningPaths />} />
              <Route path="/learning-paths" element={<LearningPaths />} />
              <Route path="/reports" element={<AdminOpdReports />} />
              <Route path="/settings" element={<AdminSettings />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/wallet" element={<Wallet session={session} />} />
              <Route path="/store" element={<Store session={session} />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/profile" element={<Profile onUpdateSession={onUpdateSession} />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
          </div>
        </main>
      </div>
    </div>

    {/* Badge earned toasts */}
    {badgeToasts.length > 0 && (
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {badgeToasts.map((toast) => (
          <div key={toast.id} style={{
            background: 'var(--bg)', border: '2px solid var(--grape)', borderRadius: 14,
            padding: '14px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            minWidth: 280, animation: 'slideIn 0.3s ease',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--grape)', marginBottom: 8 }}>
              🏅 Badge Baru Diraih!
            </div>
            {toast.badges.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'color-mix(in srgb, var(--grape) 8%, var(--bg))', border: '2px solid var(--grape)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Award size={16} color={b.color || '#c42007'} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg)' }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--fg-3)', textTransform: 'capitalize' }}>{b.tier}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    )}
    {shouldShowPasswordSetup && (
      <PasswordSetupModal
        user={session.user}
        onSkip={() => setPasswordPromptDismissed(true)}
        onSaved={(user, sessionPatch) => {
          setPasswordPromptDismissed(true);
          onUpdateSession?.(user || {}, sessionPatch);
        }}
      />
    )}
    </>
  );
}
