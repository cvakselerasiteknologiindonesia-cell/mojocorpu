import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BookOpen, CalendarDays, CheckCircle2, Clock, CreditCard,
  Hourglass, LogIn, MapPin, Loader2, Tag, Users, User,
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

function formatPrice(price) {
  return 'Rp ' + Number(price).toLocaleString('id-ID');
}

function isUpcoming(startDate) {
  if (!startDate) return false;
  const s = startDate.length > 10 ? startDate.substring(0, 10) : startDate;
  return new Date(`${s}T00:00`) > new Date();
}

/* ── Midtrans Snap loader ───────────────────────────────────── */
function useSnapJs() {
  const { data: config } = useQuery({
    queryKey: ['payment-config'],
    queryFn: () => api.get('/payment/config').then((r) => r.data.data),
    staleTime: Infinity,
  });

  useEffect(() => {
    if (!config?.client_key) return;
    if (document.getElementById('midtrans-snap-js')) return;
    const src = config.is_production
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    const script = document.createElement('script');
    script.id = 'midtrans-snap-js';
    script.src = src;
    script.setAttribute('data-client-key', config.client_key);
    document.head.appendChild(script);
  }, [config]);

  return config;
}

/* ── tab button ─────────────────────────────────────────────── */
function TabBtn({ active, onClick, children, count }) {
  return (
    <button className={`ev-tab${active ? ' active' : ''}`} onClick={onClick} type="button">
      {children}
      {count != null && <span className="ev-tab-count">{count}</span>}
    </button>
  );
}

/* ── single event card ──────────────────────────────────────── */
function EventCard({ event, onEnroll, onPay, isEnrolling, isPaying, isAwaitingPayment, onEnter }) {
  const upcoming  = isUpcoming(event.start_date);
  const enrolled  = event.is_enrolled;
  const isPaid    = event.is_paid;
  const spotsLeft = event.quota ? Math.max(0, event.quota - (event.participants_count ?? 0)) : null;
  const full      = event.quota > 0 && spotsLeft === 0;
  const stateClass = enrolled ? 'enrolled' : upcoming ? 'upcoming' : 'ongoing';

  return (
    <div className={`ev-card ${stateClass}`}>
      {/* header */}
      <div className="ev-card-head">
        <h3 className="ev-card-title">{event.title}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span className={`ev-chip ${stateClass}`}>
            {enrolled
              ? <><CheckCircle2 size={11} /> Terdaftar</>
              : upcoming
              ? <><Clock size={11} /> Mendatang</>
              : <><BookOpen size={11} /> Berlangsung</>}
          </span>
          <span className={`ev-price-badge${isPaid ? ' paid' : ' free'}`}>
            {isPaid ? <><CreditCard size={10} /> {formatPrice(event.price)}</> : <><Tag size={10} /> Gratis</>}
          </span>
        </div>
      </div>

      {/* meta */}
      <div className="ev-meta-row">
        <span className="ev-meta-chip">
          <CalendarDays size={11} />
          {formatDateRange(event.start_date, event.end_date)}
        </span>
        {event.location && (
          <span className="ev-meta-chip"><MapPin size={11} /> {event.location}</span>
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

      {event.description && <p className="ev-card-desc">{event.description}</p>}

      {/* action */}
      <div className="ev-card-foot">
        {!upcoming && enrolled ? (
          <button className="primary-button compact" onClick={() => onEnter(event.uuid)}>
            <LogIn size={13} /> Masuk Kelas
          </button>
        ) : !upcoming ? (
          <span className="ev-chip ongoing">Berlangsung</span>
        ) : enrolled ? (
          <span className="ev-enrolled-label"><CheckCircle2 size={14} /> Sudah terdaftar</span>
        ) : full ? (
          <span className="ev-chip danger">Kuota Penuh</span>
        ) : isAwaitingPayment ? (
          <span className="ev-awaiting-label">
            <Hourglass size={13} className="spin-slow" /> Menunggu konfirmasi pembayaran…
          </span>
        ) : isPaid ? (
          <button
            className="primary-button compact ev-pay-btn"
            disabled={isPaying}
            onClick={() => onPay(event.uuid)}
          >
            {isPaying ? <Loader2 size={13} className="spin" /> : <CreditCard size={13} />}
            {isPaying ? 'Memproses…' : `Bayar & Daftar · ${formatPrice(event.price)}`}
          </button>
        ) : (
          <button
            className="primary-button compact"
            disabled={isEnrolling}
            onClick={() => onEnroll(event.uuid)}
          >
            {isEnrolling ? <Loader2 size={13} className="spin" /> : null}
            {isEnrolling ? 'Mendaftar…' : 'Daftar Sekarang'}
          </button>
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
            <div className="ev-card-foot"><Skel w={106} h={32} style={{ borderRadius: 6 }} /></div>
          </div>
        ))}
      </div>
    </>
  );
}

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 20; // 60s total

/* ── main page ──────────────────────────────────────────────── */
export default function AsnEvents() {
  const navigate      = useNavigate();
  const queryClient   = useQueryClient();
  const snapConfig    = useSnapJs();
  const [enrollingUuid,  setEnrollingUuid]  = useState(null);
  const [payingUuid,     setPayingUuid]     = useState(null);
  const [awaitingUuids,  setAwaitingUuids]  = useState(new Set());
  const [enrollError,    setEnrollError]    = useState(null);
  const [tab, setTab] = useState('all');
  const pollTimers = useRef({});

  const { data: eventsData, isLoading, isError } = useQuery({
    queryKey: ['training-events'],
    queryFn: async () => (await api.get('/training-events')).data.data.data,
  });
  const events = eventsData || [];

  /* ── free enroll ──────────────────────────────────────────── */
  const enrollMutation = useMutation({
    mutationFn: (uuid) => api.post(`/training-events/${uuid}/enroll`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['training-events'] });
      queryClient.invalidateQueries({ queryKey: ['asn-assigned-events-count'] });
      setEnrollingUuid(null);
      setEnrollError(null);
      toast.success('Berhasil mendaftar ke kegiatan pelatihan!');
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

  /* ── payment status polling ──────────────────────────────── */
  const stopPolling = useCallback((uuid) => {
    clearTimeout(pollTimers.current[uuid]);
    delete pollTimers.current[uuid];
    setAwaitingUuids((prev) => { const s = new Set(prev); s.delete(uuid); return s; });
  }, []);

  const startPolling = useCallback((uuid) => {
    if (pollTimers.current[uuid]) return;
    setAwaitingUuids((prev) => new Set([...prev, uuid]));

    let attempts = 0;

    const poll = async () => {
      attempts++;
      try {
        const res = await api.get(`/training-events/${uuid}/payment/status`);
        const { status } = res.data.data;

        if (status === 'paid') {
          queryClient.invalidateQueries({ queryKey: ['training-events'] });
          queryClient.invalidateQueries({ queryKey: ['asn-assigned-events-count'] });
          toast.success('Pembayaran dikonfirmasi! Anda telah terdaftar di kegiatan pelatihan.');
          stopPolling(uuid);
          return;
        }

        if (attempts < POLL_MAX_ATTEMPTS && status === 'pending') {
          pollTimers.current[uuid] = setTimeout(poll, POLL_INTERVAL_MS);
        } else {
          stopPolling(uuid);
        }
      } catch {
        stopPolling(uuid);
      }
    };

    pollTimers.current[uuid] = setTimeout(poll, 2000);
  }, [queryClient, stopPolling]);

  // Clean up timers on unmount
  useEffect(() => {
    const timers = pollTimers.current;
    return () => Object.values(timers).forEach(clearTimeout);
  }, []);

  /* ── paid enroll via Midtrans Snap ───────────────────────── */
  const handlePay = async (uuid) => {
    setPayingUuid(uuid);
    setEnrollError(null);
    try {
      const res = await api.post(`/training-events/${uuid}/payment/initiate`);
      const { snap_token } = res.data.data;

      if (!window.snap) {
        toast.error('Gerbang pembayaran belum siap. Muat ulang halaman dan coba lagi.');
        setPayingUuid(null);
        return;
      }

      window.snap.pay(snap_token, {
        onSuccess() {
          setPayingUuid(null);
          startPolling(uuid);
        },
        onPending() {
          toast.info('Pembayaran sedang diproses. Status akan diperbarui otomatis.');
          setPayingUuid(null);
          startPolling(uuid);
        },
        onError(result) {
          toast.error('Pembayaran gagal: ' + (result?.status_message || 'Coba lagi.'));
          setPayingUuid(null);
        },
        onClose() {
          // Pengguna menutup popup; instruksi VA mungkin sudah selesai.
          setPayingUuid(null);
          startPolling(uuid);
        },
      });
    } catch (err) {
      setEnrollError(err.response?.data?.message || 'Gagal memulai pembayaran. Coba lagi.');
      setPayingUuid(null);
    }
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
      <div className="page-head">
        <p className="mono-kicker text-muted">Pelatihan</p>
        <h1>Kegiatan Pelatihan</h1>
      </div>

      {enrollError && <div className="form-error-visible">{enrollError}</div>}

      {!isLoading && !isError && (
        <div className="ev-kpi-row">
          <div className="enterprise-card ev-kpi-card">
            <p className="mono-kicker text-muted">Total</p>
            <p className="ev-kpi-val">{events.length}</p>
            <p className="ev-kpi-sub">kegiatan tersedia</p>
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

      {!isLoading && !isError && events.length > 0 && (
        <div className="ev-tab-bar">
          <TabBtn active={tab === 'all'}      onClick={() => setTab('all')}      count={events.length}>Semua</TabBtn>
          <TabBtn active={tab === 'upcoming'} onClick={() => setTab('upcoming')} count={upcoming.length}>Mendatang</TabBtn>
          <TabBtn active={tab === 'ongoing'}  onClick={() => setTab('ongoing')}  count={ongoing.length}>Berlangsung</TabBtn>
          <TabBtn active={tab === 'enrolled'} onClick={() => setTab('enrolled')} count={enrolled.length}>Terdaftar</TabBtn>
        </div>
      )}

      {isLoading && <AsnEventsSkeleton />}
      {isError   && <div className="form-error-visible">Gagal memuat data. Pastikan Anda sudah login dan memiliki akses.</div>}
      {!isLoading && !isError && events.length === 0 && (
        <div className="resource-note">Belum ada kegiatan pelatihan yang tersedia saat ini.</div>
      )}
      {!isLoading && !isError && events.length > 0 && filtered.length === 0 && (
        <div className="resource-note">Tidak ada kegiatan untuk filter ini.</div>
      )}

      {!isLoading && !isError && filtered.length > 0 && (
        <div className="ev-grid">
          {filtered.map((event) => (
            <EventCard
              key={event.uuid}
              event={event}
              onEnroll={handleEnroll}
              onPay={handlePay}
              isEnrolling={enrollingUuid === event.uuid}
              isPaying={payingUuid === event.uuid}
              isAwaitingPayment={awaitingUuids.has(event.uuid)}
              onEnter={(uuid) => navigate(`/training-events/${uuid}/learn`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
