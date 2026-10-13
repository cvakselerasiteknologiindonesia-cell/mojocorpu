import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, Award, BookOpen, CalendarDays, Download,
  Eye, FileText, Loader2, TrendingUp, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function pct(a, b) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = 'var(--grape)', bg = 'color-mix(in srgb, var(--grape) 12%, var(--bg))' }) {
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
  draft:     { label: 'Draf',      bg: 'var(--surface)',                                      color: 'var(--fg-3)' },
  submitted: { label: 'Diajukan',  bg: 'color-mix(in srgb, var(--sky) 12%, var(--bg))',      color: 'var(--sky)' },
  approved:  { label: 'Disetujui', bg: 'color-mix(in srgb, var(--emerald) 12%, var(--bg))',  color: 'var(--emerald)' },
  rejected:  { label: 'Ditolak',   bg: 'color-mix(in srgb, var(--crimson) 12%, var(--bg))',  color: 'var(--crimson)' },
  scheduled: { label: 'Terjadwal', bg: 'color-mix(in srgb, var(--gold) 12%, var(--bg))',     color: 'var(--gold)' },
  ongoing:   { label: 'Berjalan',  bg: 'color-mix(in srgb, var(--sky) 12%, var(--bg))',      color: 'var(--sky)' },
  completed: { label: 'Selesai',   bg: 'color-mix(in srgb, var(--emerald) 12%, var(--bg))',  color: 'var(--emerald)' },
  published: { label: 'Terbit',    bg: 'color-mix(in srgb, var(--emerald) 12%, var(--bg))',  color: 'var(--emerald)' },
};

const STEP_TYPE_LABELS = {
  module: 'Modul',
  training_event: 'Kegiatan Pelatihan',
  material: 'Materi',
  quiz: 'Kuis',
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, bg: 'var(--surface)', color: 'var(--fg-3)' };
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
  if (!rows.length) return <div className="resource-note">Belum ada usulan.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {['Judul Usulan', 'Diusulkan oleh', 'Status', 'Tanggal'].map((h) => (
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
  if (!rows.length) return <div className="resource-note">Belum ada kegiatan pelatihan.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {['Nama Kegiatan', 'Mulai', 'Selesai', 'Kuota', 'Status'].map((h) => (
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

// ── Curriculum table ──────────────────────────────────────────────────────────

function CurriculumTable({ data, isLoading, onSelect }) {
  if (isLoading) return <div className="resource-note"><Loader2 size={14} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} /> Memuat…</div>;
  const rows = data?.data ?? [];
  if (!rows.length) return <div className="resource-note">Belum ada kurikulum.</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)' }}>
            {['Nama Kurikulum', 'Status', 'Template', 'Langkah', 'Peserta', 'Selesai', 'Sertifikat', 'Progress', 'Aksi'].map((h) => (
              <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((path) => {
            const progress = pct(path.completed_enrollments_count, path.enrollments_count);
            return (
              <tr key={path.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--fg)' }}>{path.title}</td>
                <td style={{ padding: '10px 12px' }}><StatusBadge status={path.status} /></td>
                <td style={{ padding: '10px 12px', color: 'var(--fg-2)', minWidth: 140 }}>{path.certificate_template?.name ?? 'Default'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>{path.steps_count ?? 0}</td>
                <td style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>{path.enrollments_count ?? 0}</td>
                <td style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>{path.completed_enrollments_count ?? 0}</td>
                <td style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>{path.certificates_count ?? 0}</td>
                <td style={{ padding: '10px 12px', minWidth: 150 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ height: 6, flex: 1, minWidth: 80, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${progress}%`, height: '100%', background: 'var(--emerald)', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{progress}%</span>
                  </div>
                </td>
                <td style={{ padding: '10px 12px' }}>
                  <button type="button" className="outline-button compact" onClick={() => onSelect(path)}>
                    <Eye size={13} /> Detail
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CurriculumEnrollmentPanel({ selected, onBack }) {
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['reports-learning-path-enrollments', selected?.uuid],
    queryFn: () => api.get(`/reports/learning-paths/${selected.uuid}/enrollments?per_page=30`).then((r) => r.data.data),
    enabled: !!selected?.uuid,
  });

  const rows = data?.enrollments?.data ?? [];
  const path = data?.path ?? selected;

  if (selectedEnrollment) {
    return (
      <CurriculumEnrollmentSteps
        path={path}
        enrollment={selectedEnrollment}
        onBack={() => setSelectedEnrollment(null)}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ minWidth: 0 }}>
          <p className="mono-kicker text-muted" style={{ margin: 0 }}>Peserta Kurikulum</p>
          <h2 style={{ margin: '2px 0 0', fontSize: 16, lineHeight: 1.25 }}>{path?.title ?? 'Kurikulum'}</h2>
        </div>
        <button type="button" className="outline-button compact" onClick={onBack}>
          <ArrowLeft size={13} /> Kembali
        </button>
      </div>

      {isLoading && <div className="resource-note"><Loader2 size={14} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} /> Memuat peserta…</div>}
      {!isLoading && !rows.length && <div className="resource-note">Belum ada peserta pada kurikulum ini.</div>}
      {!isLoading && rows.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)' }}>
                {['Peserta', 'OPD', 'Mulai', 'Selesai', 'Sertifikat', 'Langkah', 'Progress', 'Aksi'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 12px', minWidth: 190 }}>
                    <strong style={{ display: 'block', color: 'var(--fg)' }}>{row.user?.name ?? '—'}</strong>
                    <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>{row.user?.nip || row.user?.email || '—'}</span>
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>{row.user?.opd_name ?? row.user?.organization_unit_name ?? '—'}</td>
                  <td style={{ padding: '10px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{formatDate(row.enrolled_at)}</td>
                  <td style={{ padding: '10px 12px', color: row.completed_at ? 'var(--emerald)' : 'var(--fg-3)', whiteSpace: 'nowrap', fontWeight: row.completed_at ? 700 : 400 }}>
                    {row.completed_at ? formatDate(row.completed_at) : 'Belum selesai'}
                  </td>
                  <td style={{ padding: '10px 12px', color: row.certificate ? 'var(--emerald)' : 'var(--fg-3)', minWidth: 130 }}>
                    {row.certificate ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700 }}>
                        <Award size={12} /> {row.certificate.certificate_number}
                      </span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>
                    {row.completed_steps_count ?? 0}/{row.total_steps ?? 0}
                  </td>
                  <td style={{ padding: '10px 12px', minWidth: 150 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ height: 6, flex: 1, minWidth: 80, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${row.progress ?? 0}%`, height: '100%', background: row.completed_at ? 'var(--emerald)' : 'var(--sky)', borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{row.progress ?? 0}%</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <button type="button" className="outline-button compact" onClick={() => setSelectedEnrollment(row)}>
                      <Eye size={13} /> Langkah
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CurriculumEnrollmentSteps({ path, enrollment, onBack }) {
  const { data, isLoading } = useQuery({
    queryKey: ['reports-learning-path-enrollment-steps', path?.uuid, enrollment?.id],
    queryFn: () => api.get(`/reports/learning-paths/${path.uuid}/enrollments/${enrollment.id}/steps`).then((r) => r.data.data),
    enabled: !!path?.uuid && !!enrollment?.id,
  });

  const steps = data?.steps ?? [];
  const user = data?.enrollment?.user ?? enrollment.user;
  const done = steps.filter((step) => step.completed).length;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ minWidth: 0 }}>
          <p className="mono-kicker text-muted" style={{ margin: 0 }}>Langkah Peserta</p>
          <h2 style={{ margin: '2px 0 0', fontSize: 16, lineHeight: 1.25 }}>{user?.name ?? 'Peserta'}</h2>
          <p style={{ margin: '3px 0 0', color: 'var(--fg-3)', fontSize: 12 }}>{path?.title ?? data?.path?.title}</p>
        </div>
        <button type="button" className="outline-button compact" onClick={onBack}>
          <ArrowLeft size={13} /> Peserta
        </button>
      </div>

      {isLoading && <div className="resource-note"><Loader2 size={14} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} /> Memuat langkah…</div>}
      {!isLoading && (
        <>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--fg)' }}>{done}/{steps.length}</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>Langkah Selesai</p>
            </div>
            <div>
              <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--emerald)' }}>{pct(done, steps.length)}%</p>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>Progress</p>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  {['No', 'Langkah', 'Tipe', 'Wajib', 'Estimasi', 'Status', 'Selesai Pada'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {steps.map((step) => (
                  <tr key={step.uuid} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-3)', fontWeight: 700 }}>{step.order}</td>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--fg)', minWidth: 190 }}>{step.title}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>{STEP_TYPE_LABELS[step.type] ?? step.type}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-2)' }}>{step.is_required ? 'Ya' : 'Tidak'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>{step.estimated_minutes ?? 0} menit</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '2px 8px',
                        borderRadius: 3,
                        fontSize: 11,
                        fontWeight: 700,
                        color: step.completed ? 'var(--emerald)' : 'var(--fg-3)',
                        background: step.completed ? 'color-mix(in srgb, var(--emerald) 12%, var(--bg))' : 'var(--surface)',
                        border: `1px solid ${step.completed ? 'var(--emerald)' : 'var(--border)'}`,
                      }}>
                        {step.completed ? 'Selesai' : 'Belum'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{formatDate(step.completed_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
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
  const [selectedCurriculum, setSelectedCurriculum] = useState(null);

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

  const { data: curriculumData, isLoading: loadingCur } = useQuery({
    queryKey: ['reports-learning-paths'],
    queryFn: () => api.get('/reports/learning-paths?per_page=20').then((r) => r.data.data),
    enabled: tab === 'curriculum',
  });

  const s = summary ?? {};
  const opdName = session?.user?.opd_name ?? 'OPD';

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="mono-kicker text-muted">Laporan</p>
          <h1>Laporan {opdName}</h1>
        </div>
        <button
          className="primary-button compact"
          style={{ marginTop: 4 }}
          disabled={exportMut.isPending}
          onClick={() => exportMut.mutate()}
        >
          {exportMut.isPending ? <Loader2 size={13} className="spin" /> : <Download size={13} />}
          {exportMut.isPending ? 'Mengekspor…' : 'Ekspor CSV'}
        </button>
      </div>

      {/* KPI Grid */}
      {loadingSum
        ? <div className="resource-note"><Loader2 size={14} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} /> Memuat statistik…</div>
        : <div className="cp-stats" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
            <StatCard icon={Users}       label="Total ASN"       value={s.asn?.total ?? 0}              sub={`${s.asn?.active ?? 0} aktif`}                color="var(--sky)"     bg="color-mix(in srgb, var(--sky) 12%, var(--bg))" />
            <StatCard icon={BookOpen}    label="Usulan"          value={s.proposals?.total ?? 0}        sub={`${s.proposals?.approved ?? 0} disetujui`}    color="var(--grape)"   bg="color-mix(in srgb, var(--grape) 12%, var(--bg))" />
            <StatCard icon={CalendarDays} label="Kegiatan Pelatihan" value={s.events?.total ?? 0}      sub={`${s.events?.ongoing ?? 0} sedang berjalan`}  color="var(--sky)"     bg="color-mix(in srgb, var(--sky) 12%, var(--bg))" />
            <StatCard icon={Award}       label="Peserta Lulus"   value={s.participants?.completed ?? 0} sub={`dari ${s.participants?.total ?? 0} peserta`}  color="var(--emerald)" bg="color-mix(in srgb, var(--emerald) 12%, var(--bg))" />
            <StatCard icon={TrendingUp}  label="Kurikulum"       value={s.learning_paths?.published ?? 0} sub={`${s.learning_paths?.enrollments ?? 0} peserta, ${s.learning_paths?.completed ?? 0} selesai`} color="var(--emerald)" bg="color-mix(in srgb, var(--emerald) 12%, var(--bg))" />
            <StatCard icon={FileText}    label="Aset KMS"        value={s.kms?.total ?? 0}              sub={`${s.kms?.approved ?? 0} disetujui`}          color="var(--gold)"    bg="color-mix(in srgb, var(--gold) 12%, var(--bg))" />
          </div>
      }

      {/* Two-column breakdown */}
      {!loadingSum && s.proposals && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {/* Proposal breakdown */}
          <section className="enterprise-card">
            <div className="section-title">
              <div><p className="mono-kicker text-muted">Rincian</p><h2>Status Usulan</h2></div>
              <BookOpen size={16} color="var(--fg-3)" />
            </div>
            <div style={{ padding: '4px 0' }}>
              <ProgressBar label="Draf"      value={s.proposals.draft}     total={s.proposals.total} color="var(--fg-3)" />
              <ProgressBar label="Diajukan"  value={s.proposals.submitted} total={s.proposals.total} color="var(--sky)" />
              <ProgressBar label="Disetujui" value={s.proposals.approved}  total={s.proposals.total} color="var(--emerald)" />
              <ProgressBar label="Ditolak"   value={s.proposals.rejected}  total={s.proposals.total} color="var(--crimson)" />
            </div>
          </section>

          {/* Event breakdown */}
          <section className="enterprise-card">
            <div className="section-title">
              <div><p className="mono-kicker text-muted">Rincian</p><h2>Status Kegiatan</h2></div>
              <CalendarDays size={16} color="var(--fg-3)" />
            </div>
            <div style={{ padding: '4px 0' }}>
              <ProgressBar label="Terjadwal" value={s.events.scheduled} total={s.events.total} color="var(--gold)" />
              <ProgressBar label="Berjalan"  value={s.events.ongoing}   total={s.events.total} color="var(--sky)" />
              <ProgressBar label="Selesai"   value={s.events.completed} total={s.events.total} color="var(--emerald)" />
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--fg)' }}>{s.participants?.total ?? 0}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>Total Peserta</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--emerald)' }}>{s.participants?.completed ?? 0}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>Lulus</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--fg)' }}>{pct(s.participants?.completed, s.participants?.total)}%</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>Tingkat Kelulusan</p>
                </div>
              </div>
            </div>
          </section>

          {/* Learning path breakdown */}
          <section className="enterprise-card">
            <div className="section-title">
              <div><p className="mono-kicker text-muted">Rincian</p><h2>Kontinuitas Kurikulum</h2></div>
              <TrendingUp size={16} color="var(--fg-3)" />
            </div>
            <div style={{ padding: '4px 0' }}>
              <ProgressBar label="Terbit" value={s.learning_paths?.published ?? 0} total={s.learning_paths?.total ?? 0} color="var(--emerald)" />
              <ProgressBar label="Draf" value={s.learning_paths?.draft ?? 0} total={s.learning_paths?.total ?? 0} color="var(--fg-3)" />
              <ProgressBar label="Selesai" value={s.learning_paths?.completed ?? 0} total={s.learning_paths?.enrollments ?? 0} color="var(--sky)" />
            </div>
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--fg)' }}>{s.learning_paths?.enrollments ?? 0}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>Peserta Kurikulum</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--emerald)' }}>{pct(s.learning_paths?.completed, s.learning_paths?.enrollments)}%</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>Tingkat Selesai</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Detail tables */}
      <section className="enterprise-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', gap: 0, padding: '0 16px' }}>
          <Tab label="Usulan" active={tab === 'proposals'} onClick={() => setTab('proposals')} />
          <Tab label="Kegiatan Pelatihan" active={tab === 'events'} onClick={() => setTab('events')} />
          <Tab label="Kurikulum" active={tab === 'curriculum'} onClick={() => setTab('curriculum')} />
        </div>

        <div style={{ padding: 0 }}>
          {tab === 'proposals'  && <ProposalTable data={proposalsData} isLoading={loadingProp} />}
          {tab === 'events'     && <EventTable data={eventsData} isLoading={loadingEvt} />}
          {tab === 'curriculum' && (
            selectedCurriculum
              ? <CurriculumEnrollmentPanel selected={selectedCurriculum} onBack={() => setSelectedCurriculum(null)} />
              : <CurriculumTable data={curriculumData} isLoading={loadingCur} onSelect={setSelectedCurriculum} />
          )}
        </div>
      </section>
    </div>
  );
}
