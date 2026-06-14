import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDownLeft, ArrowUpRight, Coins, Gift, Info, Loader2, TrendingUp, Zap } from 'lucide-react';
import api from '../api.js';
import { getRoleNames } from '../utils/permissions.js';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function WalletTxSkeleton() {
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="wlt-tx-row" style={{ opacity: Math.max(0.15, 1 - i * 0.12) }}>
          <Skel w={32} h={32} style={{ borderRadius: '50%', flexShrink: 0 }} />
          <div className="wlt-tx-meta">
            <Skel w="62%" h={13} />
            <Skel w="38%" h={10} />
          </div>
          <Skel w={54} h={13} />
          <Skel w={38} h={11} />
        </div>
      ))}
    </>
  );
}

function TxRow({ tx }) {
  const credit = tx.type === 'credit';
  return (
    <div className="wlt-tx-row">
      <div className={`wlt-tx-icon ${credit ? 'credit' : 'debit'}`}>
        {credit
          ? <ArrowDownLeft size={14} />
          : <ArrowUpRight  size={14} />}
      </div>
      <div className="wlt-tx-meta">
        <span className="wlt-tx-desc">{tx.description}</span>
        <span className="wlt-tx-date">{formatDate(tx.created_at)}</span>
      </div>
      <span className={`wlt-tx-amount ${credit ? 'credit' : 'debit'}`}>
        {credit ? '+' : '−'}{tx.amount.toLocaleString()}
      </span>
      <span className="wlt-tx-after">{tx.balance_after.toLocaleString()} T</span>
    </div>
  );
}

/* tier colour tokens: excellent→gold, good→sky, pass→emerald, below→crimson */
function tierClass(label = '') {
  if (label.startsWith('Excellent')) return 'wlt-tier-gold';
  if (label.startsWith('Good'))      return 'wlt-tier-sky';
  if (label.startsWith('Pass'))      return 'wlt-tier-em';
  return 'wlt-tier-cr';
}

function TierBadge({ tier }) {
  return (
    <div className={`wlt-tier-row ${tierClass(tier.label)}`}>
      <span className="wlt-tier-label">{tier.label}</span>
      <span className="wlt-tier-range">Skor {tier.min_score}–{tier.max_score}</span>
    </div>
  );
}

function TopUpModal({ onClose }) {
  const queryClient = useQueryClient();
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [desc,   setDesc]   = useState('');

  const mut = useMutation({
    mutationFn: () => api.post('/wallet/top-up', {
      user_id:     parseInt(userId),
      amount:      parseInt(amount),
      description: desc || undefined,
    }),
    onSuccess: () => {
      toast.success('Token berhasil ditambahkan.');
      queryClient.invalidateQueries({ queryKey: ['wallet-all'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menambahkan token.'),
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <strong>Top-up Token</strong>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label className="event-field">
            <span>User ID</span>
            <input type="number" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="ID pengguna" />
          </label>
          <label className="event-field">
            <span>Jumlah Token</span>
            <input type="number" min="1" max="10000" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1–10000" />
          </label>
          <label className="event-field">
            <span>Keterangan (opsional)</span>
            <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Misal: Reward bulanan" />
          </label>
        </div>
        <div className="modal-foot">
          <button type="button" className="outline-button compact" onClick={onClose}>Batal</button>
          <button
            type="button"
            className="primary-button compact"
            onClick={() => mut.mutate()}
            disabled={!userId || !amount || mut.isPending}
          >
            {mut.isPending ? <Loader2 size={13} className="spin" /> : <Gift size={13} />}
            Tambahkan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Wallet({ session }) {
  const [showTopUp, setShowTopUp] = useState(false);
  const [showAll,   setShowAll]   = useState(false);

  const roles   = getRoleNames(session?.user);
  const isAdmin = roles.includes('super-admin') || roles.includes('admin-opd');

  const { data: wallet, isLoading } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet').then((r) => r.data.data),
  });

  const { data: allWallets } = useQuery({
    queryKey: ['wallet-all'],
    queryFn: () => api.get('/wallet/all?per_page=20').then((r) => r.data.data.data),
    enabled: isAdmin && showAll,
  });

  const { data: tokenInfo } = useQuery({
    queryKey: ['wallet-token-info'],
    queryFn: () => api.get('/wallet/token-info').then((r) => r.data.data),
  });

  const balance      = wallet?.balance ?? 0;
  const transactions = wallet?.transactions ?? [];
  const totalIn  = transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.type === 'debit' ).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="page-stack">
      {/* ── header ────────────────────────────────────── */}
      <div className="page-head">
        <p className="mono-kicker text-muted">Token</p>
        <h1>Dompet Saya</h1>
      </div>

      {/* ── KPI strip ─────────────────────────────────── */}
      <div className="wlt-kpi-row">
        {/* balance hero */}
        <div className="wlt-balance-card">
          <div className="wlt-balance-icon">
            <Coins size={26} />
          </div>
          <div className="wlt-balance-body">
            <p className="wlt-balance-label">Saldo Token</p>
            {isLoading
              ? <Loader2 size={22} className="spin" />
              : <p className="wlt-balance-val">{balance.toLocaleString()}</p>}
            <p className="wlt-balance-sub">token tersedia</p>
          </div>
        </div>

        {/* total in */}
        <div className="enterprise-card wlt-mini-stat">
          <div className="wlt-mini-icon em">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="mono-kicker text-muted">Total Masuk</p>
            <p className="wlt-mini-val em">{totalIn.toLocaleString()}</p>
          </div>
        </div>

        {/* total out */}
        <div className="enterprise-card wlt-mini-stat">
          <div className="wlt-mini-icon cr">
            <Zap size={18} />
          </div>
          <div>
            <p className="mono-kicker text-muted">Total Keluar</p>
            <p className="wlt-mini-val cr">{totalOut.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* ── main grid ─────────────────────────────────── */}
      <div className={`wlt-main-grid ${isAdmin ? 'two-col' : ''}`}>
        {/* transactions */}
        <section className="enterprise-card wlt-tx-card">
          <div className="section-title">
            <div>
              <p className="mono-kicker text-muted">RIWAYAT</p>
              <h2>Transaksi Terbaru</h2>
            </div>
          </div>
          {isLoading && <WalletTxSkeleton />}
          {!isLoading && transactions.length === 0 && (
            <div className="resource-note">Belum ada transaksi.</div>
          )}
          <div className="wlt-tx-list">
            {transactions.map((tx) => <TxRow key={tx.id} tx={tx} />)}
          </div>
        </section>

        {/* token info */}
        <section className="enterprise-card">
          <div className="section-title">
            <div>
              <p className="mono-kicker text-muted">INFO</p>
              <h2>Cara Mendapat Token</h2>
            </div>
            <Info size={15} color="var(--fg-3)" />
          </div>
          <p className="wlt-info-desc">
            Token diperoleh otomatis saat menyelesaikan asesmen. Skor lebih tinggi = lebih banyak token.
          </p>
          <div className="wlt-tier-list">
            {(tokenInfo?.tiers || []).map((tier) => <TierBadge key={tier.label} tier={tier} />)}
          </div>

          {isAdmin && (
            <div className="wlt-topup-wrap">
              <button className="primary-button compact" style={{ width: '100%' }} onClick={() => setShowTopUp(true)}>
                <Gift size={14} /> Top-up Token Pengguna
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ── admin: all wallets ─────────────────────────── */}
      {isAdmin && (
        <section className="enterprise-card">
          <div className="section-title">
            <div>
              <p className="mono-kicker text-muted">ADMIN</p>
              <h2>Semua Wallet Pengguna</h2>
            </div>
            {!showAll && (
              <button className="outline-button compact" onClick={() => setShowAll(true)}>Tampilkan</button>
            )}
          </div>
          {showAll && (
            <div className="work-list">
              {(allWallets || []).length === 0 && <div className="resource-note">Belum ada data wallet.</div>}
              {(allWallets || []).map((w, i) => (
                <div key={w.id} className="wlt-admin-row work-row">
                  <span className="wlt-admin-rank">#{i + 1}</span>
                  <div className="wlt-admin-meta">
                    <span className="wlt-admin-name">{w.user?.name || '—'}</span>
                    <span className="wlt-admin-sub">
                      {w.user?.nip || ''}{w.user?.opd_name ? ` · ${w.user.opd_name}` : ''}
                    </span>
                  </div>
                  <span className="wlt-admin-balance">
                    {w.balance.toLocaleString()}
                    <em> T</em>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {showTopUp && <TopUpModal onClose={() => setShowTopUp(false)} />}
    </div>
  );
}
