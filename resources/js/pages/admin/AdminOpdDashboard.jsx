import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
import {
  Award, BookOpen, CalendarDays, CheckCircle,
  GraduationCap, TrendingUp, Users,
} from 'lucide-react';
import api from '../../api.js';
import KpiCard from '../../components/KpiCard.jsx';

function pct(a, b) {
  if (!b) return 0;
  return Math.round((a / b) * 100);
}

const STATUS_COLOR = {
  submitted: { bg: 'color-mix(in srgb, var(--gold) 15%, var(--bg))',    color: 'var(--crimson)' },
  draft:     { bg: 'var(--surface)',                                      color: 'var(--fg-3)' },
  approved:  { bg: 'color-mix(in srgb, var(--emerald) 12%, var(--bg))', color: 'var(--emerald)' },
  rejected:  { bg: 'color-mix(in srgb, var(--crimson) 12%, var(--bg))', color: 'var(--crimson)' },
  ongoing:   { bg: 'color-mix(in srgb, var(--sky) 12%, var(--bg))',     color: 'var(--sky)' },
  scheduled: { bg: 'color-mix(in srgb, var(--grape) 10%, var(--bg))',   color: 'var(--grape)' },
  completed: { bg: 'color-mix(in srgb, var(--emerald) 12%, var(--bg))', color: 'var(--emerald)' },
};

function Badge({ status }) {
  const s = STATUS_COLOR[status] ?? { bg: 'var(--surface)', color: 'var(--fg-3)' };
  const label = {
    submitted: 'diajukan',
    draft: 'draf',
    approved: 'disetujui',
    rejected: 'ditolak',
    ongoing: 'berjalan',
    scheduled: 'terjadwal',
    completed: 'selesai',
  }[status] ?? status;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 8px',
      background: s.bg, color: s.color, borderRadius: 4,
      textTransform: 'capitalize', flexShrink: 0,
    }}>{label}</span>
  );
}

function ProgressBar({ value, total, color }) {
  const p = pct(value, total);
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ height: 6, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ width: `${p}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s' }} />
      </div>
    </div>
  );
}

export default function AdminOpdDashboard({ session }) {
  const { data, isLoading } = useQuery({
    queryKey: ['opd-admin-dashboard'],
    queryFn: () => api.get('/dashboard/opd-admin').then((r) => r.data.data),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const d = data;
  const opdName = session?.user?.opd_name || 'OPD Anda';

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Admin OPD</p>
        <h1>Dashboard {opdName}</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>
          {session?.user?.email} — data diperbarui setiap 2 menit
        </p>
      </div>

      {/* KPI strip */}
      <div className="kpi-grid">
        <KpiCard
          label="ASN"
          value={isLoading ? '…' : d?.asn?.total ?? 0}
          note={isLoading ? '' : `${d?.asn?.active ?? 0} aktif`}
          loading={isLoading}
        />
        <KpiCard
          label="Usulan"
          value={isLoading ? '…' : d?.proposals?.total ?? 0}
          note={isLoading ? '' : `${d?.proposals?.approved ?? 0} disetujui`}
          loading={isLoading}
        />
        <KpiCard
          label="Event Pelatihan"
          value={isLoading ? '…' : d?.events?.total ?? 0}
          note={isLoading ? '' : `${d?.events?.ongoing ?? 0} berjalan`}
          loading={isLoading}
        />
        <KpiCard
          label="Aset KMS"
          value={isLoading ? '…' : d?.kms?.total ?? 0}
          note={isLoading ? '' : `${d?.kms?.approved ?? 0} disetujui`}
          loading={isLoading}
        />
      </div>

      {/* Stats cards */}
      {!isLoading && d && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
            {/* Proposal breakdown */}
            <section className="enterprise-card" style={{ padding: 16 }}>
              <div className="section-title" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={16} color="var(--sky)" />
                  <div>
                    <p className="mono-kicker text-muted" style={{ margin: 0 }}>Alur Usulan</p>
                    <h2 style={{ margin: 0 }}>Usulan</h2>
                  </div>
                </div>
              </div>
              {[
                { label: 'Draf',      value: d.proposals.draft,     total: d.proposals.total, color: 'var(--fg-3)' },
                { label: 'Diajukan',  value: d.proposals.submitted, total: d.proposals.total, color: 'var(--gold)' },
                { label: 'Disetujui', value: d.proposals.approved,  total: d.proposals.total, color: 'var(--emerald)' },
                { label: 'Ditolak',   value: d.proposals.rejected,  total: d.proposals.total, color: 'var(--crimson)' },
              ].map(({ label, value, total, color }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>
                      {value} <span style={{ fontWeight: 400, color: 'var(--fg-3)' }}>({pct(value, total)}%)</span>
                    </span>
                  </div>
                  <ProgressBar value={value} total={total} color={color} />
                </div>
              ))}
            </section>

            {/* Event breakdown */}
            <section className="enterprise-card" style={{ padding: 16 }}>
              <div className="section-title" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarDays size={16} color="var(--emerald)" />
                  <div>
                    <p className="mono-kicker text-muted" style={{ margin: 0 }}>Pelatihan</p>
                    <h2 style={{ margin: 0 }}>Event</h2>
                  </div>
                </div>
              </div>
              {[
                { label: 'Terjadwal', value: d.events.scheduled, total: d.events.total, color: 'var(--grape)' },
                { label: 'Berjalan',  value: d.events.ongoing,   total: d.events.total, color: 'var(--sky)' },
                { label: 'Selesai',   value: d.events.completed, total: d.events.total, color: 'var(--emerald)' },
              ].map(({ label, value, total, color }) => (
                <div key={label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>
                      {value} <span style={{ fontWeight: 400, color: 'var(--fg-3)' }}>({pct(value, total)}%)</span>
                    </span>
                  </div>
                  <ProgressBar value={value} total={total} color={color} />
                </div>
              ))}
            </section>

            {/* Participant completion */}
            <section className="enterprise-card" style={{ padding: 16 }}>
              <div className="section-title" style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <GraduationCap size={16} color="var(--emerald)" />
                  <div>
                    <p className="mono-kicker text-muted" style={{ margin: 0 }}>Progres</p>
                    <h2 style={{ margin: 0 }}>Peserta</h2>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                <strong style={{ fontSize: 32, lineHeight: 1, color: 'var(--emerald)' }}>{d.participants.rate}%</strong>
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>tingkat kelulusan</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `${Math.max(d.participants.rate, 2)}fr ${Math.max(100 - d.participants.rate, 2)}fr`, height: 20, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 10 }}>
                <span style={{ background: 'var(--emerald)' }} />
                <span style={{ background: 'var(--surface)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
                {[
                  { label: 'Total', value: d.participants.total, color: 'var(--fg)' },
                  { label: 'Lulus',  value: d.participants.completed, color: 'var(--emerald)' },
                  { label: 'Belum',  value: Math.max(d.participants.total - d.participants.completed, 0), color: 'var(--fg-2)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ border: '1px solid var(--border)', padding: '6px 8px' }}>
                    <span style={{ display: 'block', fontSize: 10, color: 'var(--fg-3)' }}>{label}</span>
                    <strong style={{ fontSize: 16, color }}>{value}</strong>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Recent proposals + upcoming events */}
          <div className="admin-work-grid">
            <section className="enterprise-card" style={{ padding: 16 }}>
              <div className="section-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={15} color="var(--sky)" />
                  <div>
                    <p className="mono-kicker text-muted" style={{ margin: 0 }}>Antrean Tindak Lanjut</p>
                    <h2 style={{ margin: 0 }}>Proposal Terbaru</h2>
                  </div>
                </div>
                <NavLink to="/proposals" style={{ fontSize: 12, color: 'var(--grape)', fontWeight: 600, textDecoration: 'none' }}>Semua</NavLink>
              </div>
              {d.proposals.recent?.length > 0 ? (
                <div>
                  {d.proposals.recent.map((p) => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {p.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                          {p.proposer_name ?? '—'} · {p.created_at ? new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </div>
                      </div>
                      <Badge status={p.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="resource-note" style={{ textAlign: 'center' }}>Tidak ada proposal terbaru.</div>
              )}
            </section>

            <section className="enterprise-card" style={{ padding: 16 }}>
              <div className="section-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarDays size={15} color="var(--emerald)" />
                  <div>
                    <p className="mono-kicker text-muted" style={{ margin: 0 }}>Jadwal</p>
                    <h2 style={{ margin: 0 }}>Event Mendatang</h2>
                  </div>
                </div>
                <NavLink to="/events" style={{ fontSize: 12, color: 'var(--grape)', fontWeight: 600, textDecoration: 'none' }}>Semua</NavLink>
              </div>
              {d.events.upcoming?.length > 0 ? (
                <div>
                  {d.events.upcoming.map((e) => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {e.title}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                          {e.start_date ? new Date(e.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          {e.quota ? ` · ${e.quota} kuota` : ''}
                        </div>
                      </div>
                      <Badge status={e.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="resource-note" style={{ textAlign: 'center' }}>Tidak ada event mendatang.</div>
              )}
            </section>
          </div>
        </>
      )}

      {isLoading && (
        <div className="resource-note" style={{ textAlign: 'center', padding: 32 }}>Memuat data dashboard…</div>
      )}
    </div>
  );
}
