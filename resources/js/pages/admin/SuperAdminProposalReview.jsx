import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, Calendar, CheckCircle, ClipboardList, Search, User, X, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function useDebounce(value, delay) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const STATUS_CONFIG = {
  draft:     { label: 'Draft',      bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db' },
  submitted: { label: 'Diajukan',   bg: '#fef9c3', color: '#854d0e', border: '#fde047' },
  approved:  { label: 'Disetujui',  bg: '#dcfce7', color: '#166534', border: '#86efac' },
  rejected:  { label: 'Ditolak',    bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
};

const ACCENT = {
  draft:     'var(--border)',
  submitted: '#fde047',
  approved:  '#86efac',
  rejected:  '#fca5a5',
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span style={{ fontSize: 11, padding: '2px 9px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {cfg.label}
    </span>
  );
}

// ── Pagination ─────────────────────────────────────────────────────────────────

function Pagination({ page, lastPage, total, perPage, onChange }) {
  if (lastPage <= 1) return null;
  const from = (page - 1) * perPage + 1;
  const to   = Math.min(page * perPage, total);

  const pages = [];
  const delta = 2;
  const left  = Math.max(1, page - delta);
  const right = Math.min(lastPage, page + delta);
  if (left > 1)          { pages.push(1); if (left > 2) pages.push('…'); }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < lastPage)  { if (right < lastPage - 1) pages.push('…'); pages.push(lastPage); }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Menampilkan {from}–{to} dari {total} proposal</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="outline-button compact" disabled={page <= 1} onClick={() => onChange(page - 1)}>←</button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} style={{ display: 'flex', alignItems: 'center', padding: '0 6px', fontSize: 13, color: 'var(--fg-3)' }}>…</span>
            : <button key={p} className="outline-button compact"
                style={p === page ? { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' } : {}}
                onClick={() => onChange(p)}>{p}</button>
        )}
        <button className="outline-button compact" disabled={page >= lastPage} onClick={() => onChange(page + 1)}>→</button>
      </div>
    </div>
  );
}

// ── Review Modal ───────────────────────────────────────────────────────────────

function ReviewModal({ proposal, onClose }) {
  const qc = useQueryClient();
  const [rejectReason, setRejectReason] = useState('');
  const [confirmReject, setConfirmReject] = useState(false);

  const approveMut = useMutation({
    mutationFn: (status) => api.post(`/training-proposals/${proposal.uuid}/approve`, { status }),
    onSuccess: (_, status) => {
      toast.success(status === 'approved' ? 'Proposal disetujui.' : 'Proposal ditolak.');
      qc.invalidateQueries({ queryKey: ['proposals-review'] });
      qc.invalidateQueries({ queryKey: ['proposals-review-stats'] });
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal memproses proposal.'),
  });

  const isPending = proposal.status === 'submitted';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <strong>Tinjau Proposal</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
              <StatusBadge status={proposal.status} />
              <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{proposal.opd_name} · {proposal.proposer_name}</span>
            </div>
          </div>
          <button className="icon-button" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto', maxHeight: '55vh' }}>
          {/* Title */}
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Judul Proposal</p>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--fg)', lineHeight: 1.4 }}>{proposal.title}</p>
          </div>

          {/* Description */}
          {proposal.description && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deskripsi</p>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{proposal.description}</p>
            </div>
          )}

          {/* Recommendation */}
          {proposal.recommendation && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rekomendasi</p>
              <div style={{ background: 'var(--surface)', padding: '10px 14px', borderLeft: '3px solid var(--accent)', fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6 }}>
                {proposal.recommendation}
              </div>
            </div>
          )}

          {/* Meta */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 18px', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fg-3)' }}>
              <Building2 size={12} /> {proposal.opd_name}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fg-3)' }}>
              <User size={12} /> {proposal.proposer_name}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fg-3)' }}>
              <Calendar size={12} /> {formatDate(proposal.created_at)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--fg-3)' }}>
              <ClipboardList size={12} /> {proposal.events_count ?? 0} event terkait
            </span>
          </div>

          {/* Reject reason field (only shown when confirming reject) */}
          {isPending && confirmReject && (
            <div className="fm-field" style={{ marginTop: 4 }}>
              <label>Alasan Penolakan <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>(opsional)</span></label>
              <textarea
                autoFocus
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Jelaskan alasan penolakan proposal ini…"
                style={{ resize: 'vertical' }}
              />
            </div>
          )}
        </div>

        <div className="modal-foot">
          {isPending ? (
            <>
              <button className="outline-button compact" onClick={onClose}>Batal</button>

              {confirmReject ? (
                <>
                  <button className="outline-button compact" onClick={() => setConfirmReject(false)}>← Kembali</button>
                  <button
                    className="primary-button compact"
                    style={{ background: '#dc2626' }}
                    disabled={approveMut.isPending}
                    onClick={() => approveMut.mutate('rejected')}
                  >
                    <XCircle size={14} /> {approveMut.isPending ? 'Memproses…' : 'Konfirmasi Tolak'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="outline-button compact danger-lite"
                    disabled={approveMut.isPending}
                    onClick={() => setConfirmReject(true)}
                  >
                    <XCircle size={13} /> Tolak
                  </button>
                  <button
                    className="primary-button compact"
                    disabled={approveMut.isPending}
                    onClick={() => approveMut.mutate('approved')}
                  >
                    <CheckCircle size={13} /> {approveMut.isPending ? 'Memproses…' : 'Setujui'}
                  </button>
                </>
              )}
            </>
          ) : (
            <button className="outline-button compact" onClick={onClose}>Tutup</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Proposal card ──────────────────────────────────────────────────────────────

function ProposalCard({ p, onReview }) {
  const accent = ACCENT[p.status] ?? 'var(--border)';
  return (
    <div className="work-row" style={{ alignItems: 'flex-start', gap: 0, padding: 0, overflow: 'hidden', borderLeft: `3px solid ${accent}` }}>
      <div style={{ flex: 1, minWidth: 0, padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          <StatusBadge status={p.status} />
          <strong style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.3, flex: 1, minWidth: 160 }}>{p.title}</strong>
        </div>

        {p.description && (
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {p.description}
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--fg-3)' }}>
            <Building2 size={11} /> {p.opd_name}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--fg-3)' }}>
            <User size={11} /> {p.proposer_name}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--fg-3)' }}>
            <Calendar size={11} /> {formatDate(p.created_at)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--fg-3)' }}>
            <ClipboardList size={11} /> {p.events_count ?? 0} event
          </span>
        </div>
      </div>

      <div style={{ padding: '14px 16px', flexShrink: 0, display: 'flex', alignItems: 'center' }}>
        <button
          className={p.status === 'submitted' ? 'primary-button compact' : 'outline-button compact'}
          onClick={() => onReview(p)}
        >
          {p.status === 'submitted' ? 'Tinjau' : 'Detail'}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'submitted', label: 'Menunggu' },
  { key: 'approved',  label: 'Disetujui' },
  { key: 'rejected',  label: 'Ditolak' },
  { key: '',          label: 'Semua' },
];

const PER_PAGE = 15;

export default function SuperAdminProposalReview() {
  const [activeTab, setActiveTab] = useState('submitted');
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [reviewing, setReviewing] = useState(null);
  const debouncedSearch           = useDebounce(search, 350);

  useEffect(() => { setPage(1); }, [debouncedSearch, activeTab]);

  const { data: stats } = useQuery({
    queryKey: ['proposals-review-stats'],
    queryFn: () => api.get('/training-proposals/stats').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['proposals-review', activeTab, debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams({ per_page: PER_PAGE, page });
      if (activeTab) params.set('status', activeTab);
      if (debouncedSearch) params.set('search', debouncedSearch);
      return api.get(`/training-proposals?${params}`).then((r) => r.data.data);
    },
    keepPreviousData: true,
    staleTime: 15_000,
  });

  const proposals = data?.data ?? [];
  const lastPage  = data?.last_page ?? 1;
  const total     = data?.total ?? 0;

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-head">
        <p className="mono-kicker text-muted">Pelatihan</p>
        <h1>Proposal Review</h1>
      </div>

      {/* Stats strip */}
      <div className="cp-stats">
        <div className="cp-stat" style={stats?.submitted > 0 ? { boxShadow: '0 0 0 2px #fde047' } : {}}>
          <span className="cp-stat-val" style={stats?.submitted > 0 ? { color: '#854d0e' } : {}}>{stats?.submitted ?? '—'}</span>
          <span className="cp-stat-lbl">Menunggu Review</span>
        </div>
        <div className="cp-stat cp-stat--approved">
          <span className="cp-stat-val">{stats?.approved ?? '—'}</span>
          <span className="cp-stat-lbl">Disetujui</span>
        </div>
        <div className="cp-stat">
          <span className="cp-stat-val">{stats?.rejected ?? '—'}</span>
          <span className="cp-stat-lbl">Ditolak</span>
        </div>
        <div className="cp-stat">
          <span className="cp-stat-val">{stats?.total ?? '—'}</span>
          <span className="cp-stat-lbl">Total Proposal</span>
        </div>
      </div>

      {/* Search + Tabs row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Filter tabs */}
        <div className="cp-filter-tabs" style={{ flex: 1 }}>
          {TABS.map(({ key, label }) => {
            const count = key === 'submitted' ? stats?.submitted : key === 'approved' ? stats?.approved : key === 'rejected' ? stats?.rejected : stats?.total;
            return (
              <button key={key} className={`cp-filter-tab${activeTab === key ? ' active' : ''}`}
                onClick={() => { setActiveTab(key); setPage(1); }}>
                {label}
                {count != null && (
                  <em className="sb-badge" style={key === 'submitted' && count > 0 ? { background: '#854d0e' } : {}}>
                    {count}
                  </em>
                )}
              </button>
            );
          })}
        </div>

        {/* Live search */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', pointerEvents: 'none' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari proposal…"
            style={{ paddingLeft: 28, paddingRight: search ? 28 : 10, paddingTop: 7, paddingBottom: 7, border: '1px solid var(--border)', font: 'inherit', fontSize: 12, outline: 'none', width: 200 }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', fontSize: 15, padding: 0, display: 'flex' }}>×</button>
          )}
        </div>
      </div>

      {/* List */}
      <section className="enterprise-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="section-title" style={{ padding: '12px 16px' }}>
          <h2>{TABS.find((t) => t.key === activeTab)?.label ?? 'Semua'}</h2>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isFetching && !isLoading && <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>Memuat…</span>}
            <span className="badge-active">{total} PROPOSAL</span>
          </div>
        </div>

        {isLoading && <div className="resource-note">Memuat proposal…</div>}

        {!isLoading && proposals.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <ClipboardList size={32} style={{ color: 'var(--fg-3)', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-3)' }}>
              {activeTab === 'submitted' ? 'Tidak ada proposal yang menunggu review.' : 'Tidak ada proposal ditemukan.'}
            </p>
          </div>
        )}

        <div className="work-list" style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.15s' }}>
          {proposals.map((p) => (
            <ProposalCard key={p.uuid} p={p} onReview={setReviewing} />
          ))}
        </div>

        <Pagination page={page} lastPage={lastPage} total={total} perPage={PER_PAGE} onChange={setPage} />
      </section>

      {reviewing && <ReviewModal proposal={reviewing} onClose={() => setReviewing(null)} />}
    </div>
  );
}
