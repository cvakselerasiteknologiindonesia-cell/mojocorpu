import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Ban,
  Bug,
  CheckCircle2,
  Clock,
  Code,
  Database,
  FileQuestion,
  Filter,
  FolderSearch,
  Globe,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldOff,
  Skull,
  Terminal,
  Unlock,
  UserX,
  X,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const SEVERITY_META = {
  low:      { label: 'Low',      color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' },
  medium:   { label: 'Medium',   color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  high:     { label: 'High',     color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  critical: { label: 'Critical', color: '#7c3aed', bg: '#faf5ff', border: '#e9d5ff' },
};

const TYPE_META = {
  brute_force:         { label: 'Brute Force',          Icon: Zap       },
  credential_stuffing: { label: 'Credential Stuffing',  Icon: Skull     },
  account_targeted:    { label: 'Account Targeted',     Icon: UserX     },
  sustained_attack:    { label: 'Sustained Attack',     Icon: ShieldOff },
};

const ATTACK_TYPE_META = {
  sql_injection:      { label: 'SQL Injection',      Icon: Database,    color: '#dc2626' },
  xss_attempt:        { label: 'XSS Attempt',        Icon: Bug,         color: '#d97706' },
  path_traversal:     { label: 'Path Traversal',     Icon: FolderSearch, color: '#dc2626' },
  command_injection:  { label: 'Command Injection',  Icon: Terminal,    color: '#7c3aed' },
  null_byte:          { label: 'Null Byte',          Icon: Code,        color: '#dc2626' },
  nosql_injection:    { label: 'NoSQL Injection',    Icon: Filter,      color: '#dc2626' },
  ldap_injection:     { label: 'LDAP Injection',     Icon: Globe,       color: '#d97706' },
  ssrf_attempt:       { label: 'SSRF Attempt',       Icon: Globe,       color: '#dc2626' },
  scanner_detected:   { label: 'Scanner Detected',   Icon: Skull,       color: '#7c3aed' },
  enumeration_404:    { label: '404 Enumeration',    Icon: FileQuestion, color: '#16a34a' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(d) {
  if (!d) return '—';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60)    return `${diff}s ago`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function fmtDt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function DashboardSkeleton() {
  return (
    <>
      <div className="sec-kpi-row">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="enterprise-card sec-kpi-card" style={{ opacity: Math.max(0.3, 1 - i * 0.12) }}>
            <Skel w={52} h={10} />
            <Skel w={42} h={30} />
            <Skel w={80} h={10} />
          </div>
        ))}
      </div>
      <div className="sec-grid">
        <div className="enterprise-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="sec-event-row" style={{ opacity: Math.max(0.18, 1 - i * 0.15) }}>
              <Skel w={56} h={20} style={{ borderRadius: 4 }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Skel w="70%" h={13} />
                <Skel w="50%" h={10} />
              </div>
              <Skel w={60} h={10} />
            </div>
          ))}
        </div>
        <div className="enterprise-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="sec-attempt-row" style={{ opacity: Math.max(0.18, 1 - i * 0.18) }}>
              <Skel w={90} h={11} />
              <Skel w={110} h={11} />
              <Skel w={56} h={18} style={{ borderRadius: 4 }} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Severity Badge ─────────────────────────────────────────────────────────────

function SeverityBadge({ severity }) {
  const m = SEVERITY_META[severity] || SEVERITY_META.medium;
  return (
    <span style={{
      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, letterSpacing: '.04em', textTransform: 'uppercase',
      color: m.color, background: m.bg, border: `1px solid ${m.border}`,
    }}>
      {m.label}
    </span>
  );
}

// ── Block IP Modal ─────────────────────────────────────────────────────────────

function BlockIpModal({ initial = '', onClose, onBlock }) {
  const [ip, setIp] = useState(initial);
  const [reason, setReason] = useState('');
  const [expires, setExpires] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ip.trim()) return;
    onBlock({ ip_address: ip.trim(), reason: reason.trim() || undefined, expires_at: expires || undefined });
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <h2>Block IP Address</h2>
          <button className="icon-action" onClick={onClose}><X size={16} /></button>
        </div>
        <form className="modal-body" style={{ display: 'grid', gap: 14 }} onSubmit={handleSubmit}>
          <div className="event-field">
            <span>IP Address</span>
            <input autoFocus required placeholder="e.g. 192.168.1.1" value={ip} onChange={(e) => setIp(e.target.value)} />
          </div>
          <div className="event-field">
            <span>Reason (optional)</span>
            <input placeholder="Suspicious activity…" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
          <div className="event-field">
            <span>Expires at (leave blank for permanent)</span>
            <input type="datetime-local" value={expires} onChange={(e) => setExpires(e.target.value)} />
          </div>
          <div className="modal-foot">
            <button type="button" className="outline-button compact" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button compact"><Ban size={13} /> Block IP</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Security Events Tab ────────────────────────────────────────────────────────

function EventsTab({ session }) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState({ type: '', severity: '', unresolved: false });
  const [page, setPage] = useState(1);
  const [blockModal, setBlockModal] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['sec-events', filter, page],
    queryFn: async () => (await api.get('/security/events', {
      params: { ...filter, page, per_page: 20 },
    })).data.data,
    refetchInterval: 30_000,
  });

  const resolveMut = useMutation({
    mutationFn: (id) => api.post(`/security/events/${id}/resolve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sec-events'] }); qc.invalidateQueries({ queryKey: ['sec-dashboard'] }); toast.success('Event resolved.'); },
    onError: () => toast.error('Failed to resolve event.'),
  });

  const blockMut = useMutation({
    mutationFn: (body) => api.post('/security/blocked-ips', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sec-dashboard'] }); qc.invalidateQueries({ queryKey: ['sec-blocked'] }); setBlockModal(null); toast.success('IP blocked.'); },
    onError: () => toast.error('Failed to block IP.'),
  });

  const events = data?.data ?? [];

  return (
    <div className="enterprise-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="sec-filter-select" value={filter.type} onChange={(e) => { setFilter((f) => ({ ...f, type: e.target.value })); setPage(1); }}>
          <option value="">All Types</option>
          {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className="sec-filter-select" value={filter.severity} onChange={(e) => { setFilter((f) => ({ ...f, severity: e.target.value })); setPage(1); }}>
          <option value="">All Severities</option>
          {Object.keys(SEVERITY_META).map((s) => <option key={s} value={s}>{SEVERITY_META[s].label}</option>)}
        </select>
        <label className="sec-filter-check">
          <input type="checkbox" checked={filter.unresolved} onChange={(e) => { setFilter((f) => ({ ...f, unresolved: e.target.checked })); setPage(1); }} />
          Unresolved only
        </label>
      </div>

      {isLoading && Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="sec-event-row" style={{ opacity: Math.max(0.18, 1 - i * 0.15) }}>
          <Skel w={56} h={20} style={{ borderRadius: 4 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}><Skel w="68%" h={13} /><Skel w="45%" h={10} /></div>
          <Skel w={60} h={10} />
        </div>
      ))}

      {!isLoading && events.length === 0 && (
        <div className="resource-note" style={{ textAlign: 'center', padding: '32px 0' }}>
          <Shield size={28} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--fg-3)' }} />
          No security events found.
        </div>
      )}

      {events.map((ev) => {
        const meta = TYPE_META[ev.type] || { label: ev.type, Icon: AlertTriangle };
        const { Icon } = meta;
        return (
          <div key={ev.id} className={`sec-event-row${ev.resolved ? ' sec-event--resolved' : ''}`}>
            <div className="sec-event-icon-col">
              <SeverityBadge severity={ev.severity} />
              <span className="sec-event-type"><Icon size={11} /> {meta.label}</span>
            </div>
            <div className="sec-event-body">
              <p className="sec-event-desc">{ev.description}</p>
              <div className="sec-event-meta">
                {ev.ip_address && <span><Globe size={10} /> {ev.ip_address}</span>}
                {ev.user && <span><UserX size={10} /> {ev.user.name}</span>}
                <span><Clock size={10} /> {timeAgo(ev.created_at)}</span>
                {ev.resolved && <span style={{ color: 'var(--emerald)' }}><CheckCircle2 size={10} /> Resolved by {ev.resolver?.name} · {timeAgo(ev.resolved_at)}</span>}
              </div>
            </div>
            <div className="sec-event-actions">
              {!ev.resolved && (
                <>
                  {ev.ip_address && (
                    <button className="outline-button compact" style={{ fontSize: 11 }} onClick={() => setBlockModal(ev.ip_address)}>
                      <Ban size={11} /> Block IP
                    </button>
                  )}
                  <button
                    className="primary-button compact" style={{ fontSize: 11 }}
                    disabled={resolveMut.isPending}
                    onClick={() => resolveMut.mutate(ev.id)}
                  >
                    <CheckCircle2 size={11} /> Resolve
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {/* Pagination */}
      {(data?.last_page ?? 1) > 1 && (
        <div className="picker-pagination">
          <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
          <span>{page} / {data.last_page}</span>
          <button className="outline-button compact" disabled={page >= data.last_page} onClick={() => setPage((p) => p + 1)}>Next ›</button>
        </div>
      )}

      {blockModal && <BlockIpModal initial={blockModal} onClose={() => setBlockModal(null)} onBlock={(body) => blockMut.mutate(body)} />}
    </div>
  );
}

// ── Login Attempts Tab ─────────────────────────────────────────────────────────

function AttemptsTab() {
  const [page, setPage] = useState(1);
  const [failedOnly, setFailedOnly] = useState(true);
  const [ipFilter, setIpFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['sec-attempts', page, failedOnly, ipFilter],
    queryFn: async () => (await api.get('/security/attempts', {
      params: { page, per_page: 25, failed_only: failedOnly, ip: ipFilter || undefined },
    })).data.data,
    refetchInterval: 30_000,
  });

  const attempts = data?.data ?? [];

  return (
    <div className="enterprise-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="sec-filter-select"
          placeholder="Filter by IP…"
          value={ipFilter}
          onChange={(e) => { setIpFilter(e.target.value); setPage(1); }}
          style={{ width: 160 }}
        />
        <label className="sec-filter-check">
          <input type="checkbox" checked={failedOnly} onChange={(e) => setFailedOnly(e.target.checked)} />
          Failed only
        </label>
      </div>

      <div className="sec-attempts-table-wrap">
        <table className="att-table">
          <thead>
            <tr>
              <th>IP Address</th>
              <th>Identifier</th>
              <th>User</th>
              <th>Result</th>
              <th>Reason</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} style={{ opacity: Math.max(0.18, 1 - i * 0.1) }}>
                <td><Skel w={90} h={11} /></td>
                <td><Skel w={110} h={11} /></td>
                <td><Skel w={80} h={11} /></td>
                <td><Skel w={52} h={18} /></td>
                <td><Skel w={70} h={11} /></td>
                <td><Skel w={60} h={11} /></td>
              </tr>
            ))}
            {!isLoading && attempts.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 20, color: 'var(--fg-3)' }}>No attempts found.</td></tr>
            )}
            {attempts.map((a) => (
              <tr key={a.id}>
                <td className="att-cell-nip" style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.ip_address}</td>
                <td style={{ fontSize: 12 }}>{a.identifier || '—'}</td>
                <td style={{ fontSize: 12 }}>{a.user?.name || '—'}</td>
                <td>
                  {a.success
                    ? <span style={{ fontSize: 10, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '2px 6px', borderRadius: 4 }}>Success</span>
                    : <span style={{ fontSize: 10, fontWeight: 700, color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', padding: '2px 6px', borderRadius: 4 }}>Failed</span>}
                </td>
                <td style={{ fontSize: 11, color: 'var(--fg-3)' }}>{a.failure_reason?.replace(/_/g, ' ') || '—'}</td>
                <td style={{ fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{timeAgo(a.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(data?.last_page ?? 1) > 1 && (
        <div className="picker-pagination">
          <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
          <span>{page} / {data.last_page} · {data.total} attempts</span>
          <button className="outline-button compact" disabled={page >= data.last_page} onClick={() => setPage((p) => p + 1)}>Next ›</button>
        </div>
      )}
    </div>
  );
}

// ── Blocked IPs Tab ────────────────────────────────────────────────────────────

function BlockedIpsTab() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [blockModal, setBlockModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['sec-blocked', page],
    queryFn: async () => (await api.get('/security/blocked-ips', { params: { page, per_page: 20 } })).data.data,
    refetchInterval: 30_000,
  });

  const blockMut = useMutation({
    mutationFn: (body) => api.post('/security/blocked-ips', body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sec-blocked'] }); qc.invalidateQueries({ queryKey: ['sec-dashboard'] }); setBlockModal(false); toast.success('IP blocked.'); },
    onError: () => toast.error('Failed to block IP.'),
  });

  const unblockMut = useMutation({
    mutationFn: (id) => api.delete(`/security/blocked-ips/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sec-blocked'] }); qc.invalidateQueries({ queryKey: ['sec-dashboard'] }); toast.success('IP unblocked.'); },
    onError: () => toast.error('Failed to unblock IP.'),
  });

  const ips = data?.data ?? [];

  return (
    <div className="enterprise-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="primary-button compact" onClick={() => setBlockModal(true)}>
          <Ban size={13} /> Block IP Manually
        </button>
      </div>

      {isLoading && Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="sec-blocked-row" style={{ opacity: Math.max(0.18, 1 - i * 0.15) }}>
          <Skel w={110} h={14} />
          <Skel w="45%" h={11} />
          <Skel w={60} h={11} />
          <Skel w={72} h={28} style={{ borderRadius: 6 }} />
        </div>
      ))}

      {!isLoading && ips.length === 0 && (
        <div className="resource-note" style={{ textAlign: 'center', padding: '32px 0' }}>
          <Shield size={28} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--fg-3)' }} />
          No IPs currently blocked.
        </div>
      )}

      {ips.map((b) => (
        <div key={b.id} className="sec-blocked-row">
          <div>
            <strong style={{ fontFamily: 'monospace', fontSize: 13 }}>{b.ip_address}</strong>
            <span className="sec-source-badge" data-source={b.source}>{b.source}</span>
          </div>
          <p className="sec-blocked-reason">{b.reason || 'No reason provided'}</p>
          <div className="sec-blocked-meta">
            {b.expires_at
              ? <span><Clock size={10} /> Expires {fmtDt(b.expires_at)}</span>
              : <span style={{ color: 'var(--crimson)' }}>Permanent</span>}
            {b.blocker && <span>· by {b.blocker.name}</span>}
          </div>
          <button
            className="outline-button compact"
            style={{ fontSize: 11, flexShrink: 0 }}
            disabled={unblockMut.isPending}
            onClick={() => unblockMut.mutate(b.id)}
          >
            {unblockMut.isPending ? <Loader2 size={11} className="spin" /> : <Unlock size={11} />}
            Unblock
          </button>
        </div>
      ))}

      {(data?.last_page ?? 1) > 1 && (
        <div className="picker-pagination">
          <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
          <span>{page} / {data.last_page}</span>
          <button className="outline-button compact" disabled={page >= data.last_page} onClick={() => setPage((p) => p + 1)}>Next ›</button>
        </div>
      )}

      {blockModal && <BlockIpModal onClose={() => setBlockModal(false)} onBlock={(body) => blockMut.mutate(body)} />}
    </div>
  );
}

// ── Attack Patterns Tab ────────────────────────────────────────────────────────

function AttackPatternsTab() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState({ attack_type: '', severity: '', ip: '', exclude_404: true });

  const { data, isLoading } = useQuery({
    queryKey: ['sec-suspicious', filter, page],
    queryFn: async () => (await api.get('/security/suspicious-requests', {
      params: { ...filter, page, per_page: 25 },
    })).data.data,
    refetchInterval: 30_000,
  });

  const requests = data?.requests?.data ?? [];
  const summary  = data?.summary ?? [];
  const maxCount = summary[0]?.count ?? 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* 24h Summary */}
      {summary.length > 0 && (
        <div className="enterprise-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div className="section-title" style={{ marginBottom: 4 }}>
            <h2><Activity size={14} /> Attack Distribution (24h)</h2>
          </div>
          {summary.map((row) => {
            const m = ATTACK_TYPE_META[row.attack_type] || { label: row.attack_type, Icon: AlertTriangle, color: 'var(--fg-2)' };
            const { Icon } = m;
            const pct = Math.max(4, (row.count / maxCount) * 100);
            return (
              <div key={row.attack_type} className="sec-ip-bar-row">
                <span className="sec-ip-addr" style={{ color: m.color, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Icon size={11} /> {m.label}
                </span>
                <div className="sec-ip-bar-wrap">
                  <div className="sec-ip-bar" style={{ width: `${pct}%`, background: m.color }} />
                </div>
                <span className="sec-ip-count">{row.count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      <div className="enterprise-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="sec-filter-select"
            value={filter.attack_type}
            onChange={(e) => { setFilter((f) => ({ ...f, attack_type: e.target.value })); setPage(1); }}
          >
            <option value="">All Attack Types</option>
            {Object.entries(ATTACK_TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select
            className="sec-filter-select"
            value={filter.severity}
            onChange={(e) => { setFilter((f) => ({ ...f, severity: e.target.value })); setPage(1); }}
          >
            <option value="">All Severities</option>
            {Object.keys(SEVERITY_META).map((s) => <option key={s} value={s}>{SEVERITY_META[s].label}</option>)}
          </select>
          <input
            className="sec-filter-select"
            placeholder="Filter by IP…"
            value={filter.ip}
            style={{ width: 150 }}
            onChange={(e) => { setFilter((f) => ({ ...f, ip: e.target.value })); setPage(1); }}
          />
          <label className="sec-filter-check">
            <input
              type="checkbox"
              checked={filter.exclude_404}
              onChange={(e) => { setFilter((f) => ({ ...f, exclude_404: e.target.checked })); setPage(1); }}
            />
            Exclude 404 noise
          </label>
        </div>

        <div className="sec-attempts-table-wrap">
          <table className="att-table">
            <thead>
              <tr>
                <th>IP Address</th>
                <th>Method</th>
                <th>Path</th>
                <th>Attack Type</th>
                <th>Severity</th>
                <th>Pattern</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ opacity: Math.max(0.18, 1 - i * 0.1) }}>
                  <td><Skel w={90} h={11} /></td>
                  <td><Skel w={40} h={11} /></td>
                  <td><Skel w={130} h={11} /></td>
                  <td><Skel w={90} h={18} /></td>
                  <td><Skel w={52} h={18} /></td>
                  <td><Skel w={100} h={11} /></td>
                  <td><Skel w={55} h={11} /></td>
                </tr>
              ))}
              {!isLoading && requests.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 20, color: 'var(--fg-3)' }}>No suspicious requests found.</td></tr>
              )}
              {requests.map((r) => {
                const m = ATTACK_TYPE_META[r.attack_type] || { label: r.attack_type, Icon: AlertTriangle, color: 'var(--fg-2)' };
                const { Icon } = m;
                return (
                  <tr key={r.id}>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{r.ip_address}</td>
                    <td style={{ fontSize: 11, fontWeight: 600 }}>{r.method}</td>
                    <td style={{ fontSize: 11, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.path}>{r.path}</td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: m.color }}>
                        <Icon size={11} /> {m.label}
                      </span>
                    </td>
                    <td><SeverityBadge severity={r.severity} /></td>
                    <td style={{ fontSize: 10, color: 'var(--fg-3)', fontFamily: 'monospace', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.pattern_matched}>{r.pattern_matched || '—'}</td>
                    <td style={{ fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{timeAgo(r.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {(data?.requests?.last_page ?? 1) > 1 && (
          <div className="picker-pagination">
            <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
            <span>{page} / {data.requests.last_page} · {data.requests.total} entries</span>
            <button className="outline-button compact" disabled={page >= data.requests.last_page} onClick={() => setPage((p) => p + 1)}>Next ›</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminSecurityDashboard({ session }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('events');

  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['sec-dashboard'],
    queryFn: async () => (await api.get('/security/dashboard')).data.data,
    refetchInterval: 30_000,
  });

  const kpis = data?.kpis ?? {};
  const recentEvents = data?.recent_events ?? [];
  const suspiciousIps = data?.suspicious_ips ?? [];
  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('id-ID') : null;

  return (
    <div className="page-stack">
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="mono-kicker text-muted">Security</p>
          <h1>Intrusion Detection</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
          {lastUpdated && <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>Updated {lastUpdated}</span>}
          <button className="outline-button compact" onClick={() => qc.invalidateQueries({ queryKey: ['sec-dashboard'] })}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </div>

      {/* ── KPI Strip ─── */}
      {isLoading ? <DashboardSkeleton /> : (
        <>
          <div className="sec-kpi-row">
            <div className="enterprise-card sec-kpi-card">
              <p className="mono-kicker text-muted">Failed Today</p>
              <p className="sec-kpi-val">{kpis.failed_today ?? 0}</p>
              <p className="sec-kpi-sub">login attempts</p>
            </div>
            <div className="enterprise-card sec-kpi-card">
              <p className="mono-kicker text-muted" style={{ color: '#dc2626' }}>Failed 24h</p>
              <p className="sec-kpi-val" style={{ color: '#dc2626' }}>{kpis.failed_24h ?? 0}</p>
              <p className="sec-kpi-sub">last 24 hours</p>
            </div>
            <div className="enterprise-card sec-kpi-card">
              <p className="mono-kicker text-muted" style={{ color: '#7c3aed' }}>Active Threats</p>
              <p className="sec-kpi-val" style={{ color: '#7c3aed' }}>{kpis.active_threats ?? 0}</p>
              <p className="sec-kpi-sub">{kpis.critical_events ?? 0} critical</p>
            </div>
            <div className="enterprise-card sec-kpi-card">
              <p className="mono-kicker text-muted" style={{ color: '#d97706' }}>Blocked IPs</p>
              <p className="sec-kpi-val" style={{ color: '#d97706' }}>{kpis.blocked_ips ?? 0}</p>
              <p className="sec-kpi-sub">currently active</p>
            </div>
            <div className="enterprise-card sec-kpi-card">
              <p className="mono-kicker text-muted" style={{ color: '#0891b2' }}>Attacks Today</p>
              <p className="sec-kpi-val" style={{ color: '#0891b2' }}>{kpis.attacks_today ?? 0}</p>
              <p className="sec-kpi-sub">attack patterns</p>
            </div>
          </div>

          {/* ── Overview Row ─── */}
          <div className="sec-overview-row">
            {/* Recent events mini-feed */}
            <div className="enterprise-card sec-overview-card">
              <div className="section-title" style={{ marginBottom: 12 }}>
                <h2><ShieldAlert size={15} /> Recent Threats</h2>
              </div>
              {recentEvents.length === 0 && (
                <div className="resource-note"><Shield size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />No threats detected.</div>
              )}
              {recentEvents.map((ev) => {
                const meta = TYPE_META[ev.type] || { label: ev.type, Icon: AlertTriangle };
                const { Icon } = meta;
                return (
                  <div key={ev.id} className="sec-mini-event">
                    <SeverityBadge severity={ev.severity} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="sec-mini-desc">{ev.description}</p>
                      <span className="sec-mini-time"><Icon size={9} /> {meta.label} · {timeAgo(ev.created_at)}</span>
                    </div>
                    {ev.resolved && <CheckCircle2 size={13} style={{ color: 'var(--emerald)', flexShrink: 0 }} />}
                  </div>
                );
              })}
            </div>

            {/* Top suspicious IPs */}
            <div className="enterprise-card sec-overview-card">
              <div className="section-title" style={{ marginBottom: 12 }}>
                <h2><Activity size={15} /> Top Suspicious IPs (24h)</h2>
              </div>
              {suspiciousIps.length === 0 && (
                <div className="resource-note">No suspicious IPs detected.</div>
              )}
              {suspiciousIps.map((row, i) => (
                <div key={i} className="sec-ip-bar-row">
                  <span className="sec-ip-addr">{row.ip_address}</span>
                  <div className="sec-ip-bar-wrap">
                    <div
                      className="sec-ip-bar"
                      style={{ width: `${Math.min(100, (row.attempts / (suspiciousIps[0]?.attempts || 1)) * 100)}%` }}
                    />
                  </div>
                  <span className="sec-ip-count">{row.attempts}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Tabs ─── */}
      <div className="ev-tab-bar">
        {[
          ['events',   'Security Events',  ShieldAlert],
          ['attempts', 'Login Attempts',   Activity],
          ['blocked',  'Blocked IPs',      Ban],
          ['attacks',  'Attack Patterns',  Bug],
        ].map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            className={`ev-tab${tab === key ? ' active' : ''}`}
            onClick={() => setTab(key)}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {tab === 'events'   && <EventsTab session={session} />}
      {tab === 'attempts' && <AttemptsTab />}
      {tab === 'blocked'  && <BlockedIpsTab />}
      {tab === 'attacks'  && <AttackPatternsTab />}
    </div>
  );
}
