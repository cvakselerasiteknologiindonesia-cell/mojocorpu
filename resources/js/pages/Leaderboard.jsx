import { useQuery } from '@tanstack/react-query';
import { Crown, Trophy } from 'lucide-react';
import api from '../api.js';

/* ── deterministic avatar colour (same palette as Profile) ── */
const AVATAR_PALETTE = ['#5b02ad','#007a5e','#b8651c','#0b3d91','#123b35','#a0271e'];
function avatarBg(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function InitialsAvatar({ name, size = 40 }) {
  const raw  = (name || '').trim();
  const init = raw ? raw.split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('') : '?';
  const fs   = init.length === 1 ? size * 0.42 : size * 0.32;
  const uid  = `lb-${raw.charCodeAt(0) || 0}-${size}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ borderRadius: '50%', flexShrink: 0 }}>
      <defs>
        <pattern id={uid} width="6" height="6" patternUnits="userSpaceOnUse">
          <path d={`M6 0H0V6`} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        </pattern>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={avatarBg(raw)} />
      <circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${uid})`} />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        fill="rgba(255,255,255,0.92)" fontSize={fs} fontWeight="700"
        fontFamily="'Space Mono','Courier New',monospace"
        letterSpacing={init.length > 1 ? '1' : '0'}>
        {init}
      </text>
    </svg>
  );
}

/* rank 1-5 get a CSS class that exposes --rc (rank colour) */
function rankClass(rank) {
  if (rank === 1) return 'lb-r1';
  if (rank === 2) return 'lb-r2';
  if (rank === 3) return 'lb-r3';
  if (rank <= 5)  return 'lb-r45';
  return '';
}

function RankBox({ rank }) {
  return (
    <span className={`lb-rank-box ${rankClass(rank)}`}>
      {rank <= 3 ? <Crown size={11} strokeWidth={2} style={{ marginRight: 2 }} /> : null}
      {rank}
    </span>
  );
}

function ScoreBar({ value }) {
  const pct  = Math.min(100, Math.max(0, parseFloat(value) || 0));
  const cls  = pct >= 80 ? 'lb-bar-fill hi' : pct >= 60 ? 'lb-bar-fill mid' : 'lb-bar-fill lo';
  return (
    <div className="lb-bar-wrap">
      <div className="lb-bar-track">
        <div className={cls} style={{ width: `${pct}%` }} />
      </div>
      <span className="lb-bar-val">{value}</span>
    </div>
  );
}

function PodiumCard({ entry }) {
  if (!entry) return null;
  const podiumH = entry.rank === 1 ? 104 : entry.rank === 2 ? 76 : 56;
  return (
    <div className={`lb-podium-card ${rankClass(entry.rank)}`}>
      {/* avatar */}
      <div className="lb-podium-avatar">
        <InitialsAvatar name={entry.name} size={entry.rank === 1 ? 64 : 50} />
        <span className="lb-podium-badge">
          {entry.rank === 1 && <Crown size={12} strokeWidth={2} />}
          {entry.rank}
        </span>
      </div>

      <p className="lb-podium-name">{entry.name}</p>
      <p className="lb-podium-sub">{entry.opd_name || entry.nip || '—'}</p>

      <div className="lb-podium-score">
        <Trophy size={12} strokeWidth={1.8} />
        <span>{entry.avg_score}</span>
      </div>

      {/* podium block */}
      <div className="lb-podium-block" style={{ height: podiumH }}>
        <span className="lb-podium-num">{entry.rank}</span>
      </div>
    </div>
  );
}

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function LeaderboardSkeleton() {
  return (
    <>
      <section className="enterprise-card lb-podium-section">
        <div className="section-title" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skel w={72} h={10} />
            <Skel w={150} h={22} />
          </div>
        </div>
        <div className="lb-podium-row">
          {[50, 64, 50].map((sz, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: 1 }}>
              <Skel w={sz} h={sz} style={{ borderRadius: '50%' }} />
              <Skel w={80} h={13} />
              <Skel w={60} h={10} />
              <div style={{ height: [76, 104, 56][i], background: 'var(--surface)', border: '1px solid var(--border)', width: '100%', marginTop: 8 }} />
            </div>
          ))}
        </div>
      </section>
      <section className="enterprise-card">
        <div className="section-title" style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
            <Skel w={80} h={10} />
            <Skel w={130} h={18} />
          </div>
        </div>
        <div className="lb-table">
          <div className="lb-thead" style={{ opacity: 0.25 }} />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="lb-row" style={{ opacity: Math.max(0.15, 1 - i * 0.09) }}>
              <div className="lb-row-rank"><Skel w={28} h={28} /></div>
              <div className="lb-row-user">
                <Skel w={32} h={32} style={{ borderRadius: '50%', flexShrink: 0 }} />
                <div className="lb-row-meta">
                  <Skel w="58%" h={13} />
                  <Skel w="42%" h={10} />
                </div>
              </div>
              <div className="lb-row-stat"><Skel w={22} h={13} /></div>
              <div className="lb-row-stat"><Skel w={22} h={13} /></div>
              <div className="lb-bar-wrap"><Skel w="100%" h={8} /></div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function Leaderboard() {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.get('/leaderboard').then((r) => r.data.data),
    staleTime: 2 * 60 * 1000,
  });

  const top3 = data.slice(0, 3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Rangking</p>
        <h1>Leaderboard</h1>
      </div>

      {isLoading && <LeaderboardSkeleton />}
      {isError   && <div className="form-error-visible">Gagal memuat leaderboard.</div>}

      {!isLoading && !isError && data.length === 0 && (
        <div className="resource-note">Belum ada data skor.</div>
      )}

      {!isLoading && data.length > 0 && (
        <>
          {/* ── Podium ─────────────────────────────────────── */}
          <section className="enterprise-card lb-podium-section">
            <div className="section-title">
              <div>
                <p className="mono-kicker text-muted">TOP SCORER</p>
                <h2 className="lb-hall-title">
                  <Trophy size={18} strokeWidth={1.5} />
                  Hall of Fame
                </h2>
              </div>
            </div>
            <div className="lb-podium-row">
              {podiumOrder.map((e) => <PodiumCard key={e.user_id} entry={e} />)}
            </div>
          </section>

          {/* ── Full table ──────────────────────────────────── */}
          <section className="enterprise-card">
            <div className="section-title">
              <div>
                <p className="mono-kicker text-muted">SEMUA PESERTA</p>
                <h2>Top {data.length} Scorer</h2>
              </div>
              <span className="lb-table-note">Berdasarkan rata-rata skor asesmen</span>
            </div>

            <div className="lb-table">
              {/* header */}
              <div className="lb-thead">
                <span>#</span>
                <span>Peserta</span>
                <span>Asesmen</span>
                <span>Lulus</span>
                <span>Skor Rata-rata</span>
              </div>

              {data.map((entry) => (
                <div key={entry.user_id} className={`lb-row ${rankClass(entry.rank)}`}>
                  <div className="lb-row-rank">
                    <RankBox rank={entry.rank} />
                  </div>

                  <div className="lb-row-user">
                    <InitialsAvatar name={entry.name} size={32} />
                    <div className="lb-row-meta">
                      <span className="lb-row-name">{entry.name}</span>
                      <span className="lb-row-nip">
                        {entry.nip && entry.opd_name
                          ? `${entry.nip} · ${entry.opd_name}`
                          : entry.nip || entry.opd_name || '—'}
                      </span>
                    </div>
                  </div>

                  <div className="lb-row-stat">
                    <span className="lb-stat-val">{entry.submission_count}</span>
                  </div>

                  <div className="lb-row-stat">
                    <span className="lb-stat-val" style={{ color: 'var(--emerald)' }}>
                      {entry.passed_count}
                    </span>
                  </div>

                  <ScoreBar value={parseFloat(entry.avg_score)} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
