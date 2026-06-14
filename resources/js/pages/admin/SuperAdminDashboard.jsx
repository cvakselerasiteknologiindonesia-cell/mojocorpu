import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award, BookOpen, CalendarDays, CheckCircle, Coins,
  GraduationCap, PieChart, ShoppingBag, TrendingUp, Trophy, Users,
} from 'lucide-react';
import api from '../../api.js';

function KpiCard({ label, value, sub, icon: Icon, accent = 'var(--grape)', to }) {
  const card = (
    <div className="enterprise-card" style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, minHeight: 82 }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: `color-mix(in srgb, ${accent} 12%, var(--bg))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={17} color={accent} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--fg)', lineHeight: 1.1 }}>
          {value ?? '—'}
        </div>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        {sub && <div style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>}
      </div>
    </div>
  );
  return to ? <NavLink to={to} style={{ textDecoration: 'none' }}>{card}</NavLink> : card;
}

const STATUS_COLOR = {
  submitted: { bg: 'color-mix(in srgb, #f59e0b 15%, var(--bg))', color: '#92400e' },
  approved:  { bg: 'color-mix(in srgb, var(--emerald) 12%, var(--bg))', color: 'var(--emerald)' },
  rejected:  { bg: 'color-mix(in srgb, var(--crimson) 12%, var(--bg))', color: 'var(--crimson)' },
  ongoing:   { bg: 'color-mix(in srgb, var(--sky) 12%, var(--bg))', color: 'var(--sky)' },
  scheduled: { bg: 'color-mix(in srgb, var(--grape) 10%, var(--bg))', color: 'var(--grape)' },
  completed: { bg: 'color-mix(in srgb, var(--emerald) 12%, var(--bg))', color: 'var(--emerald)' },
  pending:   { bg: 'color-mix(in srgb, #f59e0b 15%, var(--bg))', color: '#92400e' },
  fulfilled: { bg: 'color-mix(in srgb, var(--emerald) 12%, var(--bg))', color: 'var(--emerald)' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLOR[status] || { bg: 'var(--surface)', color: 'var(--fg-3)' };
  return (
    <span style={{
      background: s.bg, color: s.color, borderRadius: 6,
      fontSize: 10, fontWeight: 700, padding: '2px 8px', textTransform: 'capitalize', flexShrink: 0,
    }}>{status}</span>
  );
}

function ProposalRow({ p }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8,
        background: 'color-mix(in srgb, var(--sky) 12%, var(--bg))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <BookOpen size={15} color="var(--sky)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {p.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
          {p.proposer_name} · {p.opd_name}
        </div>
      </div>
      <StatusBadge status="submitted" />
    </div>
  );
}

function EventRow({ e }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: 8,
        background: 'color-mix(in srgb, var(--emerald) 12%, var(--bg))',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <CalendarDays size={15} color="var(--emerald)" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {e.title}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>
          {e.opd_name} · {e.start_date ? new Date(e.start_date).toLocaleDateString('id-ID') : '—'}
        </div>
      </div>
      <StatusBadge status={e.status} />
    </div>
  );
}

function ScorerRow({ scorer }) {
  const rankEmoji = ['🥇', '🥈', '🥉'];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 0', borderBottom: '1px solid var(--border)',
    }}>
      <div style={{ fontSize: 18, width: 28, textAlign: 'center', flexShrink: 0 }}>
        {rankEmoji[scorer.rank - 1] || `#${scorer.rank}`}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--fg)' }}>{scorer.name}</div>
        <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{scorer.nip}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--grape)' }}>{scorer.avg_score}</div>
        <div style={{ fontSize: 10, color: 'var(--fg-3)' }}>{scorer.submissions} asesmen</div>
      </div>
    </div>
  );
}

function StatRow({ label, value, accent }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '6px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 700, color: accent || 'var(--fg)' }}>
        {value ?? 0}
      </span>
    </div>
  );
}

const sumValues = (items) => items.reduce((total, item) => total + Number(item.value || 0), 0);

function ChartCard({ eyebrow, title, icon: Icon, accent = 'var(--grape)', children }) {
  return (
    <section className="enterprise-card" style={{ padding: 14, minHeight: 196 }}>
      <div className="section-title" style={{ marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon size={16} color={accent} />
          <div>
            <p className="mono-kicker text-muted" style={{ margin: 0 }}>{eyebrow}</p>
            <h2 style={{ margin: 0 }}>{title}</h2>
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}

function DonutChart({ items, centerLabel, centerValue }) {
  const total = Math.max(sumValues(items), 1);
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '112px 1fr', gap: 12, alignItems: 'center' }}>
      <div style={{ position: 'relative', width: 112, height: 112 }}>
        <svg viewBox="0 0 120 120" width="112" height="112" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--surface)" strokeWidth="16" />
          {items.map((item) => {
            const dash = (Number(item.value || 0) / total) * circumference;
            const segment = (
              <circle
                key={item.label}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={item.color}
                strokeWidth="16"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
              />
            );
            offset += dash;
            return segment;
          })}
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
          <div>
            <strong style={{ display: 'block', fontSize: 20, lineHeight: 1, color: 'var(--fg)' }}>{centerValue}</strong>
            <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>{centerLabel}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {items.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <i style={{ width: 9, height: 9, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: 'var(--fg-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.label}</span>
            </span>
            <strong style={{ fontSize: 12, color: 'var(--fg)' }}>{item.value ?? 0}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBars({ items }) {
  const max = Math.max(...items.map((item) => Number(item.value || 0)), 1);

  return (
    <div style={{ display: 'grid', gap: 9 }}>
      {items.map((item) => {
        const pct = Math.round((Number(item.value || 0) / max) * 100);
        return (
          <div key={item.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: 'var(--fg-2)', fontWeight: 600 }}>{item.label}</span>
              <strong style={{ fontSize: 12, color: item.color }}>{item.value ?? 0}</strong>
            </div>
            <div style={{ height: 8, background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
              <span style={{ display: 'block', width: `${pct}%`, height: '100%', background: item.color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CompletionChart({ completed = 0, total = 0, rate = 0 }) {
  const pending = Math.max(Number(total || 0) - Number(completed || 0), 0);
  const clampedRate = Math.min(Math.max(Number(rate || 0), 0), 100);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
        <strong style={{ fontSize: 30, lineHeight: 1, color: 'var(--emerald)' }}>{rate}%</strong>
        <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>peserta lulus</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `${Math.max(clampedRate, 2)}fr ${Math.max(100 - clampedRate, 2)}fr`, height: 24, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 10 }}>
        <span style={{ background: 'var(--emerald)' }} />
        <span style={{ background: 'var(--surface)' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ border: '1px solid var(--border)', padding: 8 }}>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)' }}>Lulus</span>
          <strong style={{ fontSize: 16, color: 'var(--fg)' }}>{completed?.toLocaleString?.() ?? completed}</strong>
        </div>
        <div style={{ border: '1px solid var(--border)', padding: 8 }}>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)' }}>Belum lulus</span>
          <strong style={{ fontSize: 16, color: 'var(--fg)' }}>{pending.toLocaleString()}</strong>
        </div>
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['super-admin-dashboard'],
    queryFn: () => api.get('/dashboard/super-admin').then((r) => r.data.data),
    staleTime: 120_000,
    refetchInterval: 120_000,
  });

  const d = data;

  return (
    <div className="page-stack">

      {/* Header */}
      <div className="page-head">
        <div>
          <p className="mono-kicker text-muted">Super Admin</p>
          <h1>Platform Overview</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>
            Corporate University BKPSDM Kab. Mojokerto — data diperbarui setiap 2 menit
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="resource-note" style={{ textAlign: 'center', padding: 48 }}>Memuat data platform…</div>
      ) : (
        <>
          {/* Compact KPI strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(176px, 1fr))', gap: 10, marginBottom: 14 }}>
            <KpiCard
              label="Pengguna"
              value={d?.users?.total?.toLocaleString()}
              sub={`${d?.users?.active} aktif · ${d?.users?.asn} ASN`}
              icon={Users} accent="var(--sky)" to="/users"
            />
            <KpiCard
              label="Event"
              value={d?.events?.total?.toLocaleString()}
              sub={`${d?.events?.ongoing} berjalan · ${d?.events?.scheduled} terjadwal`}
              icon={CalendarDays} accent="var(--emerald)" to="/training-events"
            />
            <KpiCard
              label="Perlu Review"
              value={d?.proposals?.pending?.toLocaleString()}
              sub={`${d?.proposals?.approved} approved · ${d?.proposals?.rejected} rejected`}
              icon={BookOpen} accent="#d97706" to="/proposal-review"
            />
            <KpiCard
              label="Kompletasi"
              value={`${d?.participants?.rate ?? 0}%`}
              sub={`${d?.participants?.completed?.toLocaleString()} dari ${d?.participants?.total?.toLocaleString()} peserta`}
              icon={CheckCircle} accent="var(--emerald)"
            />
            <KpiCard
              label="Nilai Rata-rata"
              value={d?.assessments?.avg_score ?? '—'}
              sub={`${d?.assessments?.passed?.toLocaleString()} lulus asesmen`}
              icon={TrendingUp} accent="var(--sky)"
            />
            <KpiCard
              label="Token Aktif"
              value={d?.wallet?.total_balance?.toLocaleString()}
              sub={`${d?.wallet?.total_credited?.toLocaleString()} issued`}
              icon={Coins} accent="#d97706" to="/wallet"
            />
            <KpiCard
              label="Store"
              value={d?.store?.total?.toLocaleString()}
              sub={`${d?.store?.pending} pending · ${d?.store?.fulfilled} fulfilled`}
              icon={ShoppingBag} accent="var(--crimson)" to="/store"
            />
            <KpiCard
              label="Badge"
              value={d?.badges?.total_awarded?.toLocaleString()}
              sub={`${d?.kms?.approved?.toLocaleString()} KMS approved`}
              icon={Award} accent="var(--grape)" to="/achievements"
            />
          </div>

          {/* Compact charts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(238px, 1fr))', gap: 14, marginBottom: 14 }}>
            <ChartCard eyebrow="Pipeline" title="Proposal" icon={PieChart} accent="var(--grape)">
              <DonutChart
                centerLabel="proposal"
                centerValue={d?.proposals?.total ?? 0}
                items={[
                  { label: 'Menunggu', value: d?.proposals?.pending ?? 0, color: '#d97706' },
                  { label: 'Disetujui', value: d?.proposals?.approved ?? 0, color: 'var(--emerald)' },
                  { label: 'Ditolak', value: d?.proposals?.rejected ?? 0, color: 'var(--crimson)' },
                ]}
              />
            </ChartCard>

            <ChartCard eyebrow="Training" title="Event" icon={CalendarDays} accent="var(--emerald)">
              <HorizontalBars
                items={[
                  { label: 'Berjalan', value: d?.events?.ongoing ?? 0, color: 'var(--sky)' },
                  { label: 'Terjadwal', value: d?.events?.scheduled ?? 0, color: 'var(--grape)' },
                  { label: 'Selesai', value: d?.events?.completed ?? 0, color: 'var(--emerald)' },
                ]}
              />
            </ChartCard>

            <ChartCard eyebrow="Progress" title="Peserta" icon={GraduationCap} accent="var(--emerald)">
              <CompletionChart
                completed={d?.participants?.completed ?? 0}
                total={d?.participants?.total ?? 0}
                rate={d?.participants?.rate ?? 0}
              />
            </ChartCard>

            <ChartCard eyebrow="Token" title="Wallet" icon={Coins} accent="#d97706">
              <HorizontalBars
                items={[
                  { label: 'Diterbitkan', value: d?.wallet?.total_credited ?? 0, color: 'var(--emerald)' },
                  { label: 'Digunakan', value: d?.wallet?.total_debited ?? 0, color: '#d97706' },
                  { label: 'Saldo Aktif', value: d?.wallet?.total_balance ?? 0, color: 'var(--grape)' },
                ]}
              />
            </ChartCard>
          </div>

          {/* Main content grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>

            {/* Pending Proposals */}
            <section className="enterprise-card" style={{ padding: 16 }}>
              <div className="section-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <BookOpen size={16} color="var(--sky)" />
                  <div>
                    <p className="mono-kicker text-muted" style={{ margin: 0 }}>Action Queue</p>
                    <h2 style={{ margin: 0 }}>
                      Proposal Review
                      {d?.proposals?.pending > 0 && (
                        <span className="badge-active" style={{ marginLeft: 8, fontSize: 11 }}>
                          {d.proposals.pending}
                        </span>
                      )}
                    </h2>
                  </div>
                </div>
                <NavLink to="/proposal-review" style={{ fontSize: 12, color: 'var(--grape)', fontWeight: 600, textDecoration: 'none' }}>
                  Semua
                </NavLink>
              </div>
              {d?.proposals?.recent?.length > 0 ? (
                d.proposals.recent.slice(0, 4).map((p) => <ProposalRow key={p.id} p={p} />)
              ) : (
                <div className="resource-note" style={{ textAlign: 'center' }}>Tidak ada proposal menunggu.</div>
              )}
            </section>

            {/* Recent Events */}
            <section className="enterprise-card" style={{ padding: 16 }}>
              <div className="section-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarDays size={16} color="var(--emerald)" />
                  <div>
                    <p className="mono-kicker text-muted" style={{ margin: 0 }}>Training</p>
                    <h2 style={{ margin: 0 }}>Event Terbaru</h2>
                  </div>
                </div>
                <NavLink to="/training-events" style={{ fontSize: 12, color: 'var(--grape)', fontWeight: 600, textDecoration: 'none' }}>
                  Semua
                </NavLink>
              </div>
              {d?.events?.recent?.length > 0 ? (
                d.events.recent.slice(0, 4).map((e, i) => <EventRow key={i} e={e} />)
              ) : (
                <div className="resource-note" style={{ textAlign: 'center' }}>Belum ada event.</div>
              )}
            </section>

            <section className="enterprise-card" style={{ padding: 16 }}>
              <div className="section-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Trophy size={16} color="#d97706" />
                  <div>
                    <p className="mono-kicker text-muted" style={{ margin: 0 }}>Leaderboard</p>
                    <h2 style={{ margin: 0 }}>Top Pelajar</h2>
                  </div>
                </div>
                <NavLink to="/leaderboard" style={{ fontSize: 12, color: 'var(--grape)', fontWeight: 600, textDecoration: 'none' }}>
                  Semua
                </NavLink>
              </div>
              {d?.top_scorers?.length > 0 ? (
                d.top_scorers.slice(0, 4).map((s) => <ScorerRow key={s.id} scorer={s} />)
              ) : (
                <div className="resource-note" style={{ textAlign: 'center' }}>Belum ada data nilai.</div>
              )}
            </section>

            <section className="enterprise-card" style={{ padding: 16 }}>
              <div className="section-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TrendingUp size={16} color="var(--grape)" />
                  <div>
                    <p className="mono-kicker text-muted" style={{ margin: 0 }}>Snapshot</p>
                    <h2 style={{ margin: 0 }}>Ringkasan</h2>
                  </div>
                </div>
              </div>

              <StatRow label="ASN" value={d?.users?.asn} />
              <StatRow label="Fasilitator" value={d?.users?.facilitators} />
              <StatRow label="Admin OPD" value={d?.users?.admins} />
              <StatRow label="KMS Assets" value={d?.kms?.total} />
              <StatRow label="KMS Disetujui" value={d?.kms?.approved} accent="var(--emerald)" />
              <StatRow label="Token Digunakan" value={d?.wallet?.total_debited?.toLocaleString()} />
              <StatRow label="Store Terpenuhi" value={d?.store?.fulfilled} accent="var(--emerald)" />
            </section>
          </div>
        </>
      )}
    </div>
  );
}
