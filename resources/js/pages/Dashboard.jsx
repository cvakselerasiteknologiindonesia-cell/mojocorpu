import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import {
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Coins,
  FileBadge,
  GraduationCap,
  Library,
  PlayCircle,
  ShoppingBag,
  Trophy,
} from 'lucide-react';
import api from '../api.js';
import { isFacilitator, isAdminOpd, hasAnyPermission, getRoleNames } from '../utils/permissions.js';
import FacilitatorDashboard from './FacilitatorDashboard.jsx';
import AdminOpdDashboard from './admin/AdminOpdDashboard.jsx';
import SuperAdminDashboard from './admin/SuperAdminDashboard.jsx';

function formatDate(d) {
  if (!d) return '—';
  const s = d.length > 10 ? d.substring(0, 10) : d;
  return new Date(`${s}T00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isUpcoming(startDate) {
  if (!startDate) return false;
  const s = startDate.length > 10 ? startDate.substring(0, 10) : startDate;
  return new Date(`${s}T00:00`) > new Date();
}

const EVENT_STATUS_LABEL = {
  active: 'Aktif',
  cancelled: 'Dibatalkan',
  completed: 'Selesai',
  done: 'Selesai',
  draft: 'Draf',
  ongoing: 'Berjalan',
  scheduled: 'Terjadwal',
};

function AsnMetric({ label, value, sub, icon: Icon, accent = 'var(--grape)', to }) {
  const content = (
    <div className="enterprise-card" style={{ padding: 14, minHeight: 92, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 40,
        height: 40,
        borderRadius: 8,
        background: `color-mix(in srgb, ${accent} 12%, var(--bg))`,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}>
        <Icon size={18} color={accent} />
      </div>
      <div style={{ minWidth: 0 }}>
        <strong style={{ display: 'block', fontSize: 22, lineHeight: 1.1, color: 'var(--fg)' }}>{value ?? '—'}</strong>
        <span style={{ display: 'block', marginTop: 3, fontSize: 12, fontWeight: 700, color: 'var(--fg-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        {sub && <span style={{ display: 'block', marginTop: 1, fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</span>}
      </div>
    </div>
  );

  return to ? <NavLink to={to} style={{ textDecoration: 'none' }}>{content}</NavLink> : content;
}

function ProgressPanel({ enrolled, completed, certificates }) {
  const total = Math.max(enrolled, 1);
  const pct = Math.round((completed / total) * 100);

  return (
    <section className="enterprise-card" style={{ padding: 18 }}>
      <div className="section-title" style={{ marginBottom: 12 }}>
        <div>
          <p className="mono-kicker text-muted" style={{ margin: 0 }}>Progres Belajar</p>
          <h2 style={{ margin: 0 }}>Perjalanan Belajar</h2>
        </div>
        <span className="badge-active">{pct}%</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
        <strong style={{ fontSize: 36, lineHeight: 1, color: 'var(--emerald)' }}>{completed}</strong>
        <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>kegiatan selesai dari {enrolled} terdaftar</span>
      </div>
      <div style={{ height: 12, background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 14 }}>
        <span style={{ display: 'block', width: `${Math.min(Math.max(pct, 0), 100)}%`, height: '100%', background: 'var(--emerald)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ border: '1px solid var(--border)', padding: 10 }}>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)' }}>Sertifikat</span>
          <strong style={{ fontSize: 18 }}>{certificates}</strong>
        </div>
        <div style={{ border: '1px solid var(--border)', padding: 10 }}>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)' }}>Aktif</span>
          <strong style={{ fontSize: 18 }}>{Math.max(enrolled - completed, 0)}</strong>
        </div>
      </div>
    </section>
  );
}

function EventMiniCard({ event }) {
  const enrolled = !!event.is_enrolled;
  return (
    <div style={{ border: '1px solid var(--border)', padding: 12, display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <strong style={{ fontSize: 13, color: 'var(--fg)', lineHeight: 1.35 }}>{event.title}</strong>
        <span className={`status-badge ${event.status === 'ongoing' ? 'active' : ''}`} style={{ height: 'fit-content' }}>
          {EVENT_STATUS_LABEL[event.status] || 'Kegiatan'}
        </span>
      </div>
      <span style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--fg-3)', fontSize: 11 }}>
        <CalendarDays size={12} /> {formatDate(event.start_date)}
      </span>
      {enrolled ? (
        <NavLink to={`/training-events/${event.uuid}/learn`} className="primary-button compact" style={{ justifyContent: 'center', textDecoration: 'none' }}>
          <PlayCircle size={13} /> Lanjutkan
        </NavLink>
      ) : (
        <NavLink to="/training-events" className="outline-button compact" style={{ justifyContent: 'center', textDecoration: 'none' }}>
          Detail Kegiatan
        </NavLink>
      )}
    </div>
  );
}

function LinkPanel() {
  const links = [
    { to: '/training-events', label: 'Cari Kegiatan', Icon: CalendarDays, color: 'var(--emerald)' },
    { to: '/lms', label: 'Materi LMS', Icon: GraduationCap, color: 'var(--sky)' },
    { to: '/kms-assets', label: 'Pengetahuan', Icon: Library, color: 'var(--grape)' },
    { to: '/store', label: 'Toko Token', Icon: ShoppingBag, color: 'var(--gold)' },
  ];

  return (
    <section className="enterprise-card" style={{ padding: 18 }}>
      <div className="section-title" style={{ marginBottom: 12 }}>
        <div>
          <p className="mono-kicker text-muted" style={{ margin: 0 }}>Pintasan</p>
          <h2 style={{ margin: 0 }}>Akses Cepat</h2>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {links.map(({ to, label, Icon, color }) => (
          <NavLink key={to} to={to} style={{ textDecoration: 'none', border: '1px solid var(--border)', padding: 10, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg)' }}>
            <Icon size={16} color={color} />
            <span style={{ fontSize: 12, fontWeight: 700 }}>{label}</span>
          </NavLink>
        ))}
      </div>
    </section>
  );
}

function AsnDashboard({ session }) {
  const name = session?.user?.name?.split(' ')[0] || 'ASN';

  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['asn-dashboard-events'],
    queryFn: async () => (await api.get('/training-events?per_page=100')).data.data.data,
  });

  const { data: certData } = useQuery({
    queryKey: ['asn-dashboard-certificates'],
    queryFn: () => api.get('/certificates?per_page=20').then((r) => r.data.data),
  });

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet').then((r) => r.data.data),
  });

  const { data: achievements } = useQuery({
    queryKey: ['my-badges'],
    queryFn: () => api.get('/achievements/badges').then((r) => r.data.data),
  });

  const certificates = certData?.data ?? [];
  const enrolled = events.filter((e) => e.is_enrolled);
  const completed = enrolled.filter((e) => ['completed', 'done'].includes(e.status)).length;
  const activeLearning = enrolled.filter((e) => e.status !== 'completed').slice(0, 3);
  const recommended = events.filter((e) => !e.is_enrolled && isUpcoming(e.start_date)).slice(0, 3);
  const earnedBadges = (achievements?.badges ?? []).filter((b) => b.earned).length;
  const latestCertificate = certificates[0];

  return (
    <div className="page-stack">
      <div className="page-head" style={{ alignItems: 'flex-start' }}>
        <div>
          <p className="mono-kicker text-muted">Pusat Belajar ASN</p>
          <h1>Selamat belajar, {name}</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>
            Pantau kelas aktif, progres, token, dan sertifikat Anda dalam satu tempat.
          </p>
        </div>
        <NavLink to="/training-events" className="primary-button compact" style={{ textDecoration: 'none' }}>
          <BookOpen size={14} /> Jelajahi Kegiatan
        </NavLink>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 10 }}>
        <AsnMetric label="Kelas Diikuti" value={enrolled.length} sub={`${activeLearning.length} perlu dilanjutkan`} icon={GraduationCap} accent="var(--emerald)" to="/training-events" />
        <AsnMetric label="Sertifikat" value={certificates.length} sub={latestCertificate?.certificate_number || 'Belum ada sertifikat'} icon={FileBadge} accent="var(--grape)" to="/certificates" />
        <AsnMetric label="Token" value={wallet?.balance?.toLocaleString() ?? 0} sub="Saldo tersedia" icon={Coins} accent="var(--gold)" to="/wallet" />
        <AsnMetric label="Lencana" value={earnedBadges} sub={`Runtun ${achievements?.streak?.current_streak ?? 0} hari`} icon={Award} accent="var(--sky)" to="/achievements" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, .9fr) minmax(320px, 1.1fr)', gap: 14 }}>
        <ProgressPanel enrolled={enrolled.length} completed={completed} certificates={certificates.length} />

        <section className="enterprise-card" style={{ padding: 18 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>
            <div>
              <p className="mono-kicker text-muted" style={{ margin: 0 }}>Tindak Lanjut</p>
              <h2 style={{ margin: 0 }}>Lanjutkan Pembelajaran</h2>
            </div>
            <NavLink to="/training-events" style={{ fontSize: 12, color: 'var(--grape)', fontWeight: 700, textDecoration: 'none' }}>Semua</NavLink>
          </div>
          {loadingEvents && <div className="resource-note">Memuat kegiatan...</div>}
          {!loadingEvents && activeLearning.length === 0 && <div className="resource-note">Belum ada kelas aktif. Pilih kegiatan baru untuk mulai belajar.</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {activeLearning.map((event) => <EventMiniCard key={event.uuid} event={event} />)}
          </div>
        </section>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(260px, .8fr)', gap: 14 }}>
        <section className="enterprise-card" style={{ padding: 18 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>
            <div>
              <p className="mono-kicker text-muted" style={{ margin: 0 }}>Rekomendasi</p>
              <h2 style={{ margin: 0 }}>Kegiatan Mendatang</h2>
            </div>
            <NavLink to="/training-events" style={{ fontSize: 12, color: 'var(--grape)', fontWeight: 700, textDecoration: 'none' }}>Daftar</NavLink>
          </div>
          {!loadingEvents && recommended.length === 0 && <div className="resource-note">Belum ada rekomendasi kegiatan baru.</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            {recommended.map((event) => <EventMiniCard key={event.uuid} event={event} />)}
          </div>
        </section>

        <LinkPanel />
      </div>
    </div>
  );
}

export default function Dashboard({ session }) {
  if (getRoleNames(session.user).includes('super-admin')) {
    return <SuperAdminDashboard />;
  }

  if (isFacilitator(session.user) && hasAnyPermission(session, 'view facilitator dashboard')) {
    return <FacilitatorDashboard session={session} />;
  }

  if (isAdminOpd(session.user)) {
    return <AdminOpdDashboard session={session} />;
  }

  return <AsnDashboard session={session} />;
}
