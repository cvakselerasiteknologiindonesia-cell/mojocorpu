import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, CalendarDays, CheckCircle2, Clock, LogIn,
  MapPin, Loader2, Users, User,
} from 'lucide-react';
import api from '../../api.js';

function formatDateRange(start, end) {
  const fmt = (d) => {
    if (!d) return null;
    const s = d.length > 10 ? d.substring(0, 10) : d;
    return new Date(`${s}T00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const s = fmt(start);
  const e = fmt(end);
  if (!s && !e) return '—';
  if (s === e || !e) return s || '—';
  return `${s} – ${e}`;
}

function isUpcoming(startDate) {
  if (!startDate) return false;
  const s = startDate.length > 10 ? startDate.substring(0, 10) : startDate;
  return new Date(`${s}T00:00`) > new Date();
}

/* ── tab button ─────────────────────────────────────────── */
function TabBtn({ active, onClick, children, count }) {
  return (
    <button
      className={`ev-tab${active ? ' active' : ''}`}
      onClick={onClick}
      type="button"
    >
      {children}
      {count != null && <span className="ev-tab-count">{count}</span>}
    </button>
  );
}

/* ── single event card ──────────────────────────────────── */
function EventCard({ event, onEnroll, isEnrolling, onEnter }) {
  const upcoming = isUpcoming(event.start_date);
  const enrolled = event.is_enrolled;
  const spotsLeft = event.quota ? Math.max(0, event.quota - (event.participants_count ?? 0)) : null;
  const full = event.quota > 0 && spotsLeft === 0;

  const stateClass = enrolled ? 'enrolled' : upcoming ? 'upcoming' : 'ongoing';

  return (
    <div className={`ev-card ${stateClass}`}>
      {/* status chip */}
      <div className="ev-card-head">
        <h3 className="ev-card-title">{event.title}</h3>
        <span className={`ev-chip ${stateClass}`}>
          {enrolled
            ? <><CheckCircle2 size={11} /> Terdaftar</>
            : upcoming
            ? <><Clock size={11} /> Mendatang</>
            : <><BookOpen size={11} /> Berlangsung</>}
        </span>
      </div>

      {/* meta row */}
      <div className="ev-meta-row">
        <span className="ev-meta-chip">
          <CalendarDays size={11} />
          {formatDateRange(event.start_date, event.end_date)}
        </span>
        {event.location && (
          <span className="ev-meta-chip">
            <MapPin size={11} /> {event.location}
          </span>
        )}
        {(event.facilitators || []).length > 0 && (
          <span className="ev-meta-chip">
            <User size={11} />
            {event.facilitators.map((f) => f.user?.name).filter(Boolean).join(', ')}
          </span>
        )}
        {event.quota > 0 && (
          <span className={`ev-meta-chip${full ? ' danger' : ''}`}>
            <Users size={11} />
            {full ? 'Kuota penuh' : `${spotsLeft} tempat tersisa`}
          </span>
        )}
      </div>

      {event.description && (
        <p className="ev-card-desc">{event.description}</p>
      )}

      {/* action */}
      <div className="ev-card-foot">
        {!upcoming && enrolled ? (
          <button className="primary-button compact" onClick={() => onEnter(event.uuid)}>
            <LogIn size={13} /> Masuk Kelas
          </button>
        ) : !upcoming ? (
          <span className="ev-chip ongoing">Berlangsung</span>
        ) : enrolled ? (
          <span className="ev-enrolled-label">
            <CheckCircle2 size={14} /> Sudah terdaftar
          </span>
        ) : !full ? (
          <button
            className="primary-button compact"
            disabled={isEnrolling}
            onClick={() => onEnroll(event.uuid)}
          >
            {isEnrolling ? <Loader2 size={13} className="spin" /> : null}
            {isEnrolling ? 'Mendaftar…' : 'Daftar Sekarang'}
          </button>
        ) : (
          <span className="ev-chip danger">Kuota Penuh</span>
        )}
      </div>
    </div>
  );
}

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function AsnEventsSkeleton() {
  return (
    <>
      <div className="ev-kpi-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="enterprise-card ev-kpi-card" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Skel w={52} h={10} />
            <Skel w={42} h={28} />
            <Skel w={82} h={10} />
          </div>
        ))}
      </div>
      <div className="ev-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="ev-card" style={{ opacity: Math.max(0.18, 1 - i * 0.1) }}>
            <div className="ev-card-head">
              <Skel w="62%" h={16} />
              <Skel w={72} h={22} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <Skel w={102} h={22} style={{ borderRadius: 20 }} />
              <Skel w={82} h={22} style={{ borderRadius: 20 }} />
            </div>
            <Skel w="88%" h={12} style={{ marginTop: 10 }} />
            <Skel w="72%" h={12} />
            <div className="ev-card-foot">
              <Skel w={106} h={32} style={{ borderRadius: 6 }} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── main page ──────────────────────────────────────────── */
export default function AsnEvents() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [enrollingUuid, setEnrollingUuid] = useState(null);
  const [enrollError, setEnrollError] = useState(null);
  const [tab, setTab] = useState('all');

  const { data: eventsData, isLoading, isError } = useQuery({
    queryKey: ['training-events'],
    queryFn: async () => (await api.get('/training-events')).data.data.data,
  });
  const events = eventsData || [];

  const enrollMutation = useMutation({
    mutationFn: (uuid) => api.post(`/training-events/${uuid}/enroll`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-events'] });
      queryClient.invalidateQueries({ queryKey: ['asn-assigned-events-count'] });
      setEnrollingUuid(null);
      setEnrollError(null);
    },
    onError: (err) => {
      setEnrollError(err.response?.data?.message || 'Gagal mendaftar. Coba lagi.');
      setEnrollingUuid(null);
    },
  });

  const handleEnroll = (uuid) => {
    setEnrollingUuid(uuid);
    setEnrollError(null);
    enrollMutation.mutate(uuid);
  };

  const upcoming = events.filter((e) => isUpcoming(e.start_date));
  const ongoing  = events.filter((e) => !isUpcoming(e.start_date));
  const enrolled = events.filter((e) => e.is_enrolled);

  const filtered =
    tab === 'upcoming' ? upcoming :
    tab === 'ongoing'  ? ongoing  :
    tab === 'enrolled' ? enrolled :
    events;

  return (
    <div className="page-stack">
      {/* ── header ──────────────────────────────────────── */}
      <div className="page-head">
        <p className="mono-kicker text-muted">Pelatihan</p>
        <h1>Training Events</h1>
      </div>

      {enrollError && <div className="form-error-visible">{enrollError}</div>}

      {/* ── KPI strip ───────────────────────────────────── */}
      {!isLoading && !isError && (
        <div className="ev-kpi-row">
          <div className="enterprise-card ev-kpi-card">
            <p className="mono-kicker text-muted">Total</p>
            <p className="ev-kpi-val">{events.length}</p>
            <p className="ev-kpi-sub">event tersedia</p>
          </div>
          <div className="enterprise-card ev-kpi-card">
            <p className="mono-kicker text-muted" style={{ color: 'var(--sky)' }}>Mendatang</p>
            <p className="ev-kpi-val" style={{ color: 'var(--sky)' }}>{upcoming.length}</p>
            <p className="ev-kpi-sub">buka pendaftaran</p>
          </div>
          <div className="enterprise-card ev-kpi-card">
            <p className="mono-kicker text-muted" style={{ color: 'var(--emerald)' }}>Berlangsung</p>
            <p className="ev-kpi-val" style={{ color: 'var(--emerald)' }}>{ongoing.length}</p>
            <p className="ev-kpi-sub">sedang aktif</p>
          </div>
          <div className="enterprise-card ev-kpi-card">
            <p className="mono-kicker text-muted" style={{ color: 'var(--grape)' }}>Terdaftar</p>
            <p className="ev-kpi-val" style={{ color: 'var(--grape)' }}>{enrolled.length}</p>
            <p className="ev-kpi-sub">kelas saya</p>
          </div>
        </div>
      )}

      {/* ── filter tabs ─────────────────────────────────── */}
      {!isLoading && !isError && events.length > 0 && (
        <div className="ev-tab-bar">
          <TabBtn active={tab === 'all'}      onClick={() => setTab('all')}      count={events.length}>Semua</TabBtn>
          <TabBtn active={tab === 'upcoming'} onClick={() => setTab('upcoming')} count={upcoming.length}>Mendatang</TabBtn>
          <TabBtn active={tab === 'ongoing'}  onClick={() => setTab('ongoing')}  count={ongoing.length}>Berlangsung</TabBtn>
          <TabBtn active={tab === 'enrolled'} onClick={() => setTab('enrolled')} count={enrolled.length}>Terdaftar</TabBtn>
        </div>
      )}

      {/* ── state messages ──────────────────────────────── */}
      {isLoading && <AsnEventsSkeleton />}
      {isError   && <div className="form-error-visible">Gagal memuat data. Pastikan Anda sudah login dan memiliki akses.</div>}
      {!isLoading && !isError && events.length === 0 && (
        <div className="resource-note">Belum ada event pelatihan yang tersedia saat ini.</div>
      )}
      {!isLoading && !isError && events.length > 0 && filtered.length === 0 && (
        <div className="resource-note">Tidak ada event untuk filter ini.</div>
      )}

      {/* ── event grid ──────────────────────────────────── */}
      {!isLoading && !isError && filtered.length > 0 && (
        <div className="ev-grid">
          {filtered.map((event) => (
            <EventCard
              key={event.uuid}
              event={event}
              onEnroll={handleEnroll}
              isEnrolling={enrollingUuid === event.uuid}
              onEnter={(uuid) => navigate(`/training-events/${uuid}/learn`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
