import React, { useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Award, Bell, Coins, ExternalLink, LogOut, Menu, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api.js';
import { getSidebarItems, getRoleNames } from '../utils/permissions.js';
import Dashboard from './Dashboard.jsx';
import FacilitatorClasses from './FacilitatorClasses.jsx';
import FacilitatorAssessments from './facilitator/FacilitatorAssessments.jsx';
import FacilitatorAttendance from './facilitator/FacilitatorAttendance.jsx';
import FacilitatorParticipants from './facilitator/FacilitatorParticipants.jsx';
import FacilitatorMaterials from './facilitator/FacilitatorMaterials.jsx';
import FacilitatorCompletion from './facilitator/FacilitatorCompletion.jsx';
import FacilitatorEventSetup from './facilitator/FacilitatorEventSetup.jsx';
import FacilitatorReports from './facilitator/FacilitatorReports.jsx';
import FacilitatorKmsContribution from './facilitator/FacilitatorKmsContribution.jsx';
import AdminOpdUsers from './admin/AdminOpdUsers.jsx';
import AdminOpdOpd from './admin/AdminOpdOpd.jsx';
import AdminOpdFacilitators from './admin/AdminOpdFacilitators.jsx';
import AdminOpdProposals from './admin/AdminOpdProposals.jsx';
import SuperAdminProposalReview from './admin/SuperAdminProposalReview.jsx';
import AdminLms from './admin/AdminLms.jsx';
import AdminOpdEvents from './admin/AdminOpdEvents.jsx';
import AdminOpdKms from './admin/AdminOpdKms.jsx';
import AdminOpdReports from './admin/AdminOpdReports.jsx';
import AdminQuizzes from './admin/AdminQuizzes.jsx';
import AdminSettings from './admin/AdminSettings.jsx';
import AdminAuditLogs from './admin/AdminAuditLogs.jsx';
import AdminSecurityDashboard from './admin/AdminSecurityDashboard.jsx';
import AdminLearningPaths from './admin/AdminLearningPaths.jsx';
import LearningPaths from './LearningPaths.jsx';
import AsnAttendance from './asn/AsnAttendance.jsx';
import AsnEvents from './asn/AsnEvents.jsx';
import AsnEventLearn from './asn/AsnEventLearn.jsx';
import DiscussionForum from './DiscussionForum.jsx';
import Blog from './Blog.jsx';
import PublicBlogPost from './PublicBlogPost.jsx';
import CertificateBuilder from './CertificateBuilder.jsx';
import FacilitatorNotifications from './facilitator/FacilitatorNotifications.jsx';
import Leaderboard from './Leaderboard.jsx';
import Wallet from './Wallet.jsx';
import Store from './Store.jsx';
import Achievements from './Achievements.jsx';
import Profile from './Profile.jsx';
import ResourcePage from '../components/ResourcePage.jsx';

const FACILITATOR_ROLES = ['fasilitator-internal', 'fasilitator-eksternal'];

const TYPE_META = {
  learning_path: { label: 'Kurikulum',      dot: '#7c3aed' },
  event:         { label: 'Training Event', dot: '#2563eb' },
  proposal:      { label: 'Proposal',       dot: '#d97706' },
  kms:           { label: 'Aset KMS',       dot: '#16a34a' },
  blog:          { label: 'Artikel',        dot: '#0891b2' },
  user:          { label: 'Pengguna',       dot: '#6b7280' },
};

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

export default function Shell({ session, onLogout, onUpdateSession }) {
  const nav = getSidebarItems(session);
  const roleLabel = getRoleNames(session.user).join(', ') || session.user?.user_type || 'ASN';
  const isFacilitator = getRoleNames(session.user).some((r) => FACILITATOR_ROLES.includes(r));

  const isAsn = getRoleNames(session.user).includes('asn');

  const { data: activeEventsData } = useQuery({
    queryKey: ['training-events-badge'],
    queryFn: async () => (await api.get('/training-events?per_page=100')).data.data.data,
    enabled: isFacilitator,
    staleTime: 60 * 1000,
  });
  const activeEventBadge = isFacilitator
    ? (activeEventsData || []).filter((e) => e.status === 'active').length
    : 0;

  const { data: asnAssignedData } = useQuery({
    queryKey: ['asn-assigned-events-count'],
    queryFn: async () => (await api.get('/training-events/my-assigned-count')).data.data.count,
    enabled: isAsn,
    staleTime: 60 * 1000,
  });
  const asnEventBadge = isAsn ? (asnAssignedData || 0) : 0;

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

  const location = useLocation();
  const [badgeToasts, setBadgeToasts] = useState([]);
  const [sidebarHidden, setSidebarHidden] = useState(false);

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
            aria-label={sidebarHidden ? 'Show sidebar' : 'Hide sidebar'}
            title={sidebarHidden ? 'Tampilkan sidebar' : 'Sembunyikan sidebar'}
            onClick={() => setSidebarHidden((v) => !v)}
          >
            <Menu size={18} />
          </button>
          <div className="brand-lockup">
            <div className="brand-mark">CU</div>
            <div>
              <strong>CorpU BKPSDM</strong>
              <span>Kab. Mojokerto</span>
            </div>
          </div>
        </div>

        <GlobalSearch />

        <div className="user-box">
          <a className="topbar-site-link" href="/" title="Lihat frontpage" aria-label="Lihat frontpage">
            <ExternalLink size={16} />
          </a>
          <NavLink to="/notifications" style={{ position: 'relative', display: 'flex', alignItems: 'center', color: 'inherit', textDecoration: 'none' }} title="Notifikasi">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: '#dc2626', color: '#fff',
                borderRadius: '50%', width: 15, height: 15, fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </NavLink>
          <NavLink to="/wallet" style={{ display: 'flex', alignItems: 'center', gap: 5, textDecoration: 'none',
            background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '4px 10px',
            color: '#2563eb', fontWeight: 700, fontSize: 13 }} title="Dompet Token">
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
            const badge = to === '/training-events'
              ? (activeEventBadge > 0 ? activeEventBadge : asnEventBadge)
              : 0;
            return (
              <React.Fragment key={to}>
                {showSection && <p className="sidebar-section">{section}</p>}
                <NavLink to={to} className={({ isActive }) => `sb-link ${isActive ? 'active' : ''}`}>
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
          <Routes>
            <Route path="/dashboard" element={<Dashboard session={session} />} />
            <Route path="/users" element={<AdminOpdUsers />} />
            <Route path="/opds" element={<AdminOpdOpd />} />
            <Route path="/facilitators" element={<AdminOpdFacilitators />} />
            <Route path="/facilitator/classes" element={<FacilitatorClasses />} />
            <Route path="/facilitator/materials" element={<FacilitatorMaterials />} />
            <Route path="/facilitator/assessments" element={<FacilitatorAssessments />} />
            <Route path="/facilitator/participants" element={<FacilitatorParticipants />} />
            <Route path="/facilitator/completion" element={<FacilitatorCompletion />} />
            <Route path="/facilitator/reports" element={<FacilitatorReports />} />
            <Route path="/facilitator/kms-contribution" element={<FacilitatorKmsContribution />} />
            <Route path="/training-proposals" element={<AdminOpdProposals />} />
            <Route path="/proposal-review" element={<SuperAdminProposalReview />} />
            <Route path="/training-events" element={isAsn ? <AsnEvents /> : <AdminOpdEvents session={session} />} />
            <Route path="/training-events/:uuid/learn" element={<AsnEventLearn />} />
            <Route path="/training-events/:uuid" element={<FacilitatorEventSetup session={session} />} />
            <Route path="/lms" element={<AdminLms />} />
            <Route path="/kms-assets" element={<AdminOpdKms />} />
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
          </div>
        </main>
      </div>
    </div>

    {/* Badge earned toasts */}
    {badgeToasts.length > 0 && (
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {badgeToasts.map((toast) => (
          <div key={toast.id} style={{
            background: '#fff', border: '2px solid #7c3aed', borderRadius: 14,
            padding: '14px 18px', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            minWidth: 280, animation: 'slideIn 0.3s ease',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#7c3aed', marginBottom: 8 }}>
              🏅 Badge Baru Diraih!
            </div>
            {toast.badges.map((b, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: '#f5f3ff', border: '2px solid #7c3aed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Award size={16} color={b.color || '#7c3aed'} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{b.name}</div>
                  <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'capitalize' }}>{b.tier}</div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    )}
    </>
  );
}
