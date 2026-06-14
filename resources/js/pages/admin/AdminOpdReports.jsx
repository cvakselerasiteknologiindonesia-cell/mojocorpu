import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Award, BookOpen, CalendarDays, Download,
  FileText, Loader2, TrendingUp, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(a, b) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = '#2563eb', bg = '#eff6ff' }) {
  return (
    <div className="cp-stat" style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} strokeWidth={2} />
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--fg-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</p>
        <p style={{ margin: '0 0 2px', fontSize: 26, fontWeight: 800, color: 'var(--fg)', lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>{sub}</p>}
      </div>
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────────

function ProgressBar({ label, value, total, color }) {
  const p = pct(value, total);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{value} <span style={{ fontWeight: 400, color: 'var(--fg-3)' }}>({p}%)</span></span>
      </div>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────

const STATUS_MAP = {
  draft:     { label: 'Draft',     bg: '#f3f4f6', color: '#6b7280' },
  submitted: { label: 'Submitted', bg: '#eff6ff', color: '#2563eb' },
  approved:  { label: 'Approved',  bg: '#f0fdf4', color: '#16a34a' },
  rejected:  { label: 'Rejected',  bg: '#fef2f2', color: '#dc2626' },
  scheduled: { label: 'Scheduled', bg: '#fefce8', color: '#ca8a04' },
  ongoing:   { label: 'Ongoing',   bg: '#eff6ff', color: '#2563eb' },
  completed: { label: 'Selesai',   bg: '#f0fdf4', color: '#16a34a' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, bg: '#f3f4f6', color: '#6b7280' };
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', background: s.bg, color: s.color, border: `1px solid ${s.color}22`, borderRadius: 3, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

// ── Proposal table ─────────────────────────────────────────────────────────────

function ProposalTable({ data, isLoading }) {
  if (isLoading) return <div className="resource-note"><Loader2 size={14} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} /> Memuat…</div>;
  const rows = data?.data ?? [];
  if (!rows.length) return <div className="resource-note">Belum ada proposal.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {['Judul Proposal', 'Diusulkan oleh', 'Status', 'Tanggal'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--fg)' }}>{p.title}</td>
              <td style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>{p.proposer?.name ?? '—'}</td>
              <td style={{ padding: '10px 12px' }}><StatusBadge status={p.status} /></td>
              <td style={{ padding: '10px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Event table ────────────────────────────────────────────────────────────────

function EventTable({ data, isLoading }) {
  if (isLoading) return <div className="resource-note"><Loader2 size={14} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} /> Memuat…</div>;
  const rows = data?.data ?? [];
  if (!rows.length) return <div className="resource-note">Belum ada event.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {['Nama Event', 'Mulai', 'Selesai', 'Kuota', 'Status'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--fg)' }}>{e.title}</td>
              <td style={{ padding: '10px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{e.start_date ? new Date(e.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
              <td style={{ padding: '10px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{e.end_date ? new Date(e.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
              <td style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>{e.quota ?? '—'}</td>
              <td style={{ padding: '10px 12px' }}><StatusBadge status={e.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab button ─────────────────────────────────────────────────────────────────

function Tab({ label, active, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        padding: '8px 16px', fontSize: 13, fontWeight: active ? 700 : 400,
        border: 'none', borderBottom: `2px solid ${active ? 'var(--accent)' : 'transparent'}`,
        background: 'transparent', color: active ? 'var(--accent)' : 'var(--fg-3)',
        cursor: 'pointer', transition: 'all 0.15s',
      }}>
      {label}
    </button>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminOpdReports({ session }) {
  const [tab, setTab] = useState('proposals');

  const exportMut = useMutation({
    mutationFn: async () => {
      const res = await api.get('/reports/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `laporan-pelatihan-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success('Laporan berhasil diunduh.'),
    onError:   () => toast.error('Gagal mengekspor laporan.'),
  });

  const { data: summary, isLoading: loadingSum } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: () => api.get('/reports/summary').then((r) => r.data.data),
  });

  const { data: proposalsData, isLoading: loadingProp } = useQuery({
    queryKey: ['reports-proposals'],
    queryFn: () => api.get('/reports/proposals?per_page=20').then((r) => r.data.data),
    enabled: tab === 'proposals',
  });

  const { data: eventsData, isLoading: loadingEvt } = useQuery({
    queryKey: ['reports-events'],
    queryFn: () => api.get('/reports/events?per_page=20').then((r) => r.data.data),
    enabled: tab === 'events',
  });

  const s = summary ?? {};
  const opdName = session?.user?.opd_name ?? 'OPD';

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="mono-kicker text-muted">Reports</p>
          <h1>Laporan {opdName}</h1>
        </div>
        <button
          className="primary-button compact"
          style={{ marginTop: 4 }}
          disabled={exportMut.isPending}
          onClick={() => exportMut.mutate()}
        >
          {exportMut.isPending ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
          {exportMut.isPending ? 'Mengekspor…' : 'Export CSV'}
        </button>
      </div>

      {/* KPI Grid */}
      {loadingSum
        ? <div className="resource-note"><Loader2 size={14} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} /> Memuat statistik…</div>
        : <div className="cp-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <StatCard icon={Users}       label="Total ASN"       value={s.asn?.total ?? 0}              sub={`${s.asn?.active ?? 0} aktif`}                color="#2563eb" bg="#eff6ff" />
            <StatCard icon={BookOpen}    label="Proposals"       value={s.proposals?.total ?? 0}        sub={`${s.proposals?.approved ?? 0} disetujui`}    color="#7c3aed" bg="#f5f3ff" />
            <StatCard icon={CalendarDays} label="Training Events" value={s.events?.total ?? 0}          sub={`${s.events?.ongoing ?? 0} sedang berjalan`}  color="#0891b2" bg="#ecfeff" />
            <StatCard icon={Award}       label="Peserta Lulus"   value={s.participants?.completed ?? 0} sub={`dari ${s.participants?.total ?? 0} peserta`}  color="#16a34a" bg="#f0fdf4" />
            <StatCard icon={FileText}    label="Aset KMS"        value={s.kms?.total ?? 0}              sub={`${s.kms?.approved ?? 0} disetujui`}          color="#d97706" bg="#fffbeb" />
          </div>
      }

      {/* Two-column breakdown */}
      {!loadingSum && s.proposals && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Proposal breakdown */}
          <section className="enterprise-card">
            <div className="section-title">
              <div><p className="mono-kicker text-muted">Breakdown</p><h2>Status Proposal</h2></div>
              <BookOpen size={16} color="var(--fg-3)" />
            </div>
            <div style={{ padding: '4px 0' }}>
              <ProgressBar label="Draft"     value={s.proposals.draft}     total={s.proposals.total} color="#9ca3af" />
              <ProgressBar label="Submitted" value={s.proposals.submitted} total={s.proposals.total} color="#3b82f6" />
              <ProgressBar label="Approved"  value={s.proposals.approved}  total={s.proposals.total} color="#22c55e" />
              <ProgressBar label="Rejected"  value={s.proposals.rejected}  total={s.proposals.total} color="#ef4444" />
            </div>
          </section>

          {/* Event breakdown */}
          <section className="enterprise-card">
            <div className="section-title">
              <div><p className="mono-kicker text-muted">Breakdown</p><h2>Status Event</h2></div>
              <CalendarDays size={16} color="var(--fg-3)" />
            </div>
            <div style={{ padding: '4px 0' }}>
              <ProgressBar label="Terjadwal" value={s.events.scheduled} total={s.events.total} color="#f59e0b" />
              <ProgressBar label="Berjalan"  value={s.events.ongoing}   total={s.events.total} color="#3b82f6" />
              <ProgressBar label="Selesai"   value={s.events.completed} total={s.events.total} color="#22c55e" />
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--fg)' }}>{s.participants?.total ?? 0}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>Total Peserta</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{s.participants?.completed ?? 0}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>Lulus</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--fg)' }}>{pct(s.participants?.completed, s.participants?.total)}%</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>Tingkat Kelulusan</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Detail tables */}
      <section className="enterprise-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', gap: 0, padding: '0 16px' }}>
          <Tab label="Proposal"      active={tab === 'proposals'} onClick={() => setTab('proposals')} />
          <Tab label="Training Event" active={tab === 'events'}   onClick={() => setTab('events')} />
        </div>

        <div style={{ padding: 0 }}>
          {tab === 'proposals' && <ProposalTable data={proposalsData} isLoading={loadingProp} />}
          {tab === 'events'    && <EventTable    data={eventsData}    isLoading={loadingEvt} />}
        </div>
      </section>
    </div>
  );
}
