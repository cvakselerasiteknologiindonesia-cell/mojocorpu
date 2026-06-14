import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Award, BookOpen, Coins, Crown, Flame, Medal,
  ShoppingBag, Star, TrendingUp, Trophy, Zap,
} from 'lucide-react';
import api from '../api.js';

const ICON_MAP = {
  Award, BookOpen, Coins, Crown, Flame, Medal, ShoppingBag, Star, TrendingUp, Trophy, Zap,
};

const TIER_META = {
  bronze:   { label: 'Bronze',   accent: '#d97706',      symbol: '·' },
  silver:   { label: 'Silver',   accent: 'var(--fg-3)',  symbol: '◆' },
  gold:     { label: 'Gold',     accent: 'var(--gold)',  symbol: '✦' },
  platinum: { label: 'Platinum', accent: 'var(--grape)', symbol: '★' },
};

const CRITERIA_LABEL = {
  submission_count: (v) => `Selesaikan ${v} asesmen`,
  pass_count:       (v) => `Lulus ${v} asesmen`,
  score_gte:        (v) => `Raih nilai ≥${v}`,
  score_perfect:    ()  => 'Raih nilai sempurna 100',
  streak_days:      (v) => `${v} hari berturut-turut`,
  tokens_earned:    (v) => `Kumpulkan ${v.toLocaleString()} token`,
  store_purchase:   (v) => `Beli ${v} item di Store`,
};

const FILTER_TIERS = ['all', 'platinum', 'gold', 'silver', 'bronze'];
const SHOW_OPTIONS = [
  { value: 'all',    label: 'Semua' },
  { value: 'earned', label: 'Diraih' },
  { value: 'locked', label: 'Terkunci' },
];

/* ── Tab button (underline style matching app nav) ─────────────────────────── */
function TabBtn({ label, value, active, onClick, icon: Icon }) {
  const isActive = active === value;
  return (
    <button
      onClick={() => onClick(value)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '9px 14px',
        border: 'none',
        borderBottom: `2px solid ${isActive ? 'var(--grape)' : 'transparent'}`,
        background: 'none', cursor: 'pointer',
        fontSize: 13, fontWeight: 700,
        color: isActive ? 'var(--grape)' : 'var(--fg-3)',
        marginBottom: -1,
        transition: 'color .15s, border-color .15s',
      }}
    >
      <Icon size={14} /> {label}
    </button>
  );
}

/* ── Tier pip for leaderboard ──────────────────────────────────────────────── */
function TierPip({ tier, count }) {
  const m = TIER_META[tier] || TIER_META.bronze;
  return (
    <span style={{
      background: 'var(--surface)', color: m.accent,
      border: '1px solid var(--border)',
      fontSize: 11, fontWeight: 700, padding: '2px 7px',
      fontFamily: '"Space Mono", monospace',
    }}>
      {count}{m.symbol}
    </span>
  );
}

/* ── Badge card ────────────────────────────────────────────────────────────── */
function BadgeCard({ badge }) {
  const tier = TIER_META[badge.tier] || TIER_META.bronze;
  const Ic   = ICON_MAP[badge.icon] || Award;
  const dim  = !badge.earned;

  return (
    <div
      className="enterprise-card"
      style={{
        padding: 14, position: 'relative',
        opacity: dim ? 0.46 : 1,
        display: 'flex', flexDirection: 'column', gap: 8,
        borderColor: badge.earned ? tier.accent : undefined,
      }}
    >
      {badge.earned && (
        <span style={{
          position: 'absolute', top: 10, right: 10,
          fontFamily: '"Space Mono", monospace',
          fontSize: 9, fontWeight: 700,
          letterSpacing: '.06em', textTransform: 'uppercase',
          color: tier.accent,
        }}>
          {tier.label}
        </span>
      )}

      {/* Icon */}
      <div style={{
        width: 42, height: 42,
        background: 'var(--surface)',
        border: `1px solid ${badge.earned ? tier.accent : 'var(--border)'}`,
        display: 'grid', placeItems: 'center',
        flexShrink: 0,
      }}>
        <Ic size={20} color={dim ? 'var(--fg-3)' : (badge.color || tier.accent)} />
      </div>

      <div>
        <div style={{ fontWeight: 700, fontSize: 12, color: dim ? 'var(--fg-3)' : 'var(--fg)', marginBottom: 3, lineHeight: 1.3 }}>
          {badge.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--fg-3)', lineHeight: 1.4 }}>
          {badge.description}
        </div>
      </div>

      <div style={{ marginTop: 'auto', fontSize: 11, fontWeight: 600, color: dim ? 'var(--fg-3)' : tier.accent }}>
        {CRITERIA_LABEL[badge.criteria_type]?.(badge.criteria_value)}
      </div>

      {badge.earned && badge.awarded_at && (
        <div style={{
          border: '1px solid var(--border)', padding: '4px 8px',
          fontSize: 10, color: 'var(--fg-3)',
          fontFamily: '"Space Mono", monospace',
        }}>
          {new Date(badge.awarded_at).toLocaleDateString('id-ID')}
        </div>
      )}
    </div>
  );
}

/* ── Streak panel ──────────────────────────────────────────────────────────── */
function StreakPanel({ streak }) {
  if (!streak) return null;

  return (
    <section className="enterprise-card" style={{ padding: 20 }}>
      <div className="section-title" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'color-mix(in srgb, var(--gold) 12%, var(--bg))',
            border: '1px solid var(--border)',
            display: 'grid', placeItems: 'center',
          }}>
            <Flame size={17} color="var(--gold)" />
          </div>
          <div>
            <p className="mono-kicker text-muted" style={{ margin: 0 }}>Konsistensi</p>
            <h2 style={{ margin: 0 }}>Streak Belajar</h2>
          </div>
        </div>
        {streak.current_streak > 0 && (
          <span className="badge-active" style={{ color: 'var(--gold)', background: 'color-mix(in srgb, var(--gold) 10%, var(--bg))' }}>
            {streak.current_streak} hari
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ border: '1px solid var(--border)', padding: 14 }}>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)' }}>Streak Aktif</span>
          <strong style={{ display: 'block', fontSize: 32, lineHeight: 1.1, color: 'var(--gold)', marginTop: 2 }}>
            {streak.current_streak}
          </strong>
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>hari berturut-turut</span>
        </div>
        <div style={{ border: '1px solid var(--border)', padding: 14 }}>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)' }}>Terpanjang</span>
          <strong style={{ display: 'block', fontSize: 32, lineHeight: 1.1, color: 'var(--fg)', marginTop: 2 }}>
            {streak.longest_streak}
          </strong>
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>hari terbaik</span>
        </div>
      </div>

      {streak.last_activity_date && (
        <div style={{ marginTop: 10, fontSize: 11, color: 'var(--fg-3)', fontFamily: '"Space Mono", monospace', letterSpacing: '.03em' }}>
          Terakhir: {new Date(streak.last_activity_date).toLocaleDateString('id-ID')}
        </div>
      )}
    </section>
  );
}

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function BadgeLeaderboardSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'var(--bg)', padding: '12px 16px', opacity: Math.max(0.15, 1 - i * 0.1) }}>
          <Skel w={28} h={28} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Skel w="48%" h={13} />
            <Skel w="34%" h={10} />
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <Skel w={42} h={20} />
            <Skel w={42} h={20} />
          </div>
          <Skel w={34} h={16} />
        </div>
      ))}
    </div>
  );
}

function AchievementBadgeSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, .42fr) minmax(0, 1fr)', gap: 14 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <section className="enterprise-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Skel w={36} h={36} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skel w={60} h={10} />
              <Skel w={110} h={16} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[0, 1].map((i) => (
              <div key={i} style={{ border: '1px solid var(--border)', padding: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Skel w="55%" h={10} />
                <Skel w={36} h={28} />
                <Skel w="65%" h={10} />
              </div>
            ))}
          </div>
        </section>
        <section className="enterprise-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Skel w={120} h={18} />
            <Skel w={32} h={20} />
          </div>
          <Skel w="100%" h={10} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 16 }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '10px 0' }}>
                <Skel w={60} h={12} />
                <Skel w={18} h={14} />
              </div>
            ))}
          </div>
        </section>
      </div>
      <section className="enterprise-card" style={{ padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Skel w={80} h={18} />
          <Skel w={42} h={12} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10 }}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="enterprise-card" style={{ padding: 14, opacity: Math.max(0.2, 1 - i * 0.06), display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skel w={42} h={42} />
              <Skel w="70%" h={12} />
              <Skel w="90%" h={10} />
              <Skel w="55%" h={10} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Leaderboard ───────────────────────────────────────────────────────────── */
function BadgeLeaderboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['achievement-leaderboard'],
    queryFn: () => api.get('/achievements/leaderboard').then((r) => r.data.data),
    staleTime: 60_000,
  });

  if (isLoading) return <BadgeLeaderboardSkeleton />;
  if (!data?.length) return <div className="resource-note">Belum ada data leaderboard.</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'var(--border)' }}>
      {data.map((row, idx) => (
        <div
          key={row.user_id}
          style={{
            display: 'flex', alignItems: 'center', gap: 14,
            background: idx < 3 ? 'color-mix(in srgb, var(--grape) 4%, var(--bg))' : 'var(--bg)',
            padding: '12px 16px',
          }}
        >
          <div style={{
            width: 28, height: 28, flexShrink: 0,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'grid', placeItems: 'center',
            fontFamily: '"Space Mono", monospace',
            fontSize: 11, fontWeight: 700,
            color: idx === 0 ? 'var(--gold)' : idx === 1 ? 'var(--fg-2)' : idx === 2 ? '#d97706' : 'var(--fg-3)',
          }}>
            #{row.rank}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--fg)' }}>{row.name}</div>
            <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{row.opd_name || row.nip}</div>
          </div>

          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center' }}>
            {row.platinum_count > 0 && <TierPip tier="platinum" count={row.platinum_count} />}
            {row.gold_count     > 0 && <TierPip tier="gold"     count={row.gold_count}     />}
            {row.silver_count   > 0 && <TierPip tier="silver"   count={row.silver_count}   />}
            {row.bronze_count   > 0 && <TierPip tier="bronze"   count={row.bronze_count}   />}
          </div>

          <div style={{ textAlign: 'right', minWidth: 52, flexShrink: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--grape)' }}>{row.score}</div>
            <div style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: '"Space Mono", monospace' }}>poin</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────────── */
export default function Achievements() {
  const [tab, setTab]         = useState('my-badges');
  const [filter, setFilter]   = useState('all');
  const [showOnly, setShowOnly] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['my-badges'],
    queryFn: () => api.get('/achievements/badges').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const badges      = data?.badges || [];
  const streak      = data?.streak;
  const earned      = badges.filter((b) => b.earned);
  const earnedCount = earned.length;
  const totalCount  = badges.length;
  const pct         = totalCount ? Math.round((earnedCount / totalCount) * 100) : 0;

  const filtered = badges.filter((b) => {
    if (filter !== 'all' && b.tier !== filter) return false;
    if (showOnly === 'earned' && !b.earned) return false;
    if (showOnly === 'locked' && b.earned)  return false;
    return true;
  });

  const tierCounts = ['platinum', 'gold', 'silver', 'bronze'].map((t) => ({
    tier: t,
    label: TIER_META[t].label,
    accent: TIER_META[t].accent,
    count: earned.filter((b) => b.tier === t).length,
  }));

  return (
    <div className="page-stack">

      {/* ── Page head ───────────────────────────────────────────────────────── */}
      <div className="page-head">
        <div>
          <p className="mono-kicker text-muted">Gamifikasi</p>
          <h1>Achievement</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>
            Badge, pencapaian, dan streak belajar Anda.
          </p>
        </div>
      </div>

      {/* ── KPI row ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {/* Total earned */}
        <div className="enterprise-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38,
            background: 'color-mix(in srgb, var(--grape) 12%, var(--bg))',
            border: '1px solid var(--border)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <Trophy size={17} color="var(--grape)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 22, lineHeight: 1.1, color: 'var(--fg)' }}>
              {earnedCount}<span style={{ fontSize: 13, color: 'var(--fg-3)', fontWeight: 400 }}> / {totalCount}</span>
            </strong>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--fg-2)' }}>Badge Diraih</span>
          </div>
        </div>

        {/* Streak */}
        <div className="enterprise-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38,
            background: 'color-mix(in srgb, var(--gold) 12%, var(--bg))',
            border: '1px solid var(--border)',
            display: 'grid', placeItems: 'center', flexShrink: 0,
          }}>
            <Flame size={17} color="var(--gold)" />
          </div>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: 'block', fontSize: 22, lineHeight: 1.1, color: 'var(--fg)' }}>
              {streak?.current_streak ?? 0}
            </strong>
            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--fg-2)' }}>Hari Streak</span>
          </div>
        </div>

        {/* Tier counts */}
        {tierCounts.map(({ tier, label, accent, count }) => (
          <div key={tier} className="enterprise-card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 38, height: 38,
              background: 'var(--surface)', border: '1px solid var(--border)',
              display: 'grid', placeItems: 'center', flexShrink: 0,
            }}>
              <Award size={17} color={accent} />
            </div>
            <div style={{ minWidth: 0 }}>
              <strong style={{ display: 'block', fontSize: 22, lineHeight: 1.1, color: accent }}>{count}</strong>
              <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--fg-2)' }}>{label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: -4 }}>
        <TabBtn label="Badge Saya"         value="my-badges"   active={tab} onClick={setTab} icon={Trophy} />
        <TabBtn label="Leaderboard Badge"  value="leaderboard" active={tab} onClick={setTab} icon={Medal}  />
      </div>

      {/* ── My badges tab ───────────────────────────────────────────────────── */}
      {tab === 'my-badges' && (
        isLoading ? (
          <AchievementBadgeSkeleton />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, .42fr) minmax(0, 1fr)', gap: 14 }}>

            {/* Left: streak + progress */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <StreakPanel streak={streak} />

              <section className="enterprise-card" style={{ padding: 20 }}>
                <div className="section-title" style={{ marginBottom: 14 }}>
                  <div>
                    <p className="mono-kicker text-muted" style={{ margin: 0 }}>Koleksi</p>
                    <h2 style={{ margin: 0 }}>Progress Badge</h2>
                  </div>
                  <span className="badge-active">{pct}%</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
                  <strong style={{ fontSize: 34, lineHeight: 1, color: 'var(--grape)' }}>{earnedCount}</strong>
                  <span style={{ fontSize: 13, color: 'var(--fg-3)' }}>dari {totalCount} badge</span>
                </div>

                <div style={{ height: 10, background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 16 }}>
                  <div style={{
                    height: '100%', width: `${pct}%`,
                    background: 'var(--grape)', transition: 'width .6s ease',
                  }} />
                </div>

                {tierCounts.map(({ tier, label, accent, count }, i) => (
                  <div key={tier} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 0', borderTop: i === 0 ? '1px solid var(--border)' : undefined,
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{label}</span>
                    <strong style={{ fontSize: 14, color: accent }}>{count}</strong>
                  </div>
                ))}
              </section>
            </div>

            {/* Right: badge grid */}
            <section className="enterprise-card" style={{ padding: 20 }}>
              <div className="section-title" style={{ marginBottom: 14 }}>
                <div>
                  <p className="mono-kicker text-muted" style={{ margin: 0 }}>Koleksi</p>
                  <h2 style={{ margin: 0 }}>Badge</h2>
                </div>
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{filtered.length} tampil</span>
              </div>

              {/* Filter row */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
                {FILTER_TIERS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    className={filter === t ? 'primary-button compact' : 'outline-button compact'}
                    style={{ fontSize: 12 }}
                  >
                    {t === 'all' ? 'Semua' : TIER_META[t].label}
                  </button>
                ))}
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
                  {SHOW_OPTIONS.map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setShowOnly(value)}
                      className={showOnly === value ? 'primary-button compact' : 'outline-button compact'}
                      style={{ fontSize: 12 }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="resource-note">Tidak ada badge dengan filter ini.</div>
              ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                  gap: 10,
                }}>
                  {filtered.map((badge) => <BadgeCard key={badge.id} badge={badge} />)}
                </div>
              )}
            </section>
          </div>
        )
      )}

      {/* ── Leaderboard tab ─────────────────────────────────────────────────── */}
      {tab === 'leaderboard' && (
        <section className="enterprise-card" style={{ padding: 20 }}>
          <div className="section-title" style={{ marginBottom: 16 }}>
            <div>
              <p className="mono-kicker text-muted" style={{ margin: 0 }}>Ranking</p>
              <h2 style={{ margin: 0 }}>Leaderboard Badge</h2>
            </div>
          </div>
          <BadgeLeaderboard />
        </section>
      )}

    </div>
  );
}
