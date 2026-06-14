import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Building2, RefreshCw, Search, Users } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
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

  if (left > 1)     { pages.push(1); if (left > 2) pages.push('…'); }
  for (let i = left; i <= right; i++) pages.push(i);
  if (right < lastPage) { if (right < lastPage - 1) pages.push('…'); pages.push(lastPage); }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderTop: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Menampilkan {from}–{to} dari {total} OPD</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="outline-button compact" disabled={page <= 1} onClick={() => onChange(page - 1)}>←</button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`ellipsis-${i}`} style={{ display: 'flex', alignItems: 'center', padding: '0 6px', fontSize: 13, color: 'var(--fg-3)' }}>…</span>
            : <button key={p} className="outline-button compact"
                style={p === page ? { background: 'var(--accent)', color: '#fff', border: '1px solid var(--accent)' } : {}}
                onClick={() => onChange(p)}>{p}</button>
        )}
        <button className="outline-button compact" disabled={page >= lastPage} onClick={() => onChange(page + 1)}>→</button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminOpdOpd() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [page, setPage]       = useState(1);
  const debounceRef           = useRef(null);

  // Live search — debounce 350 ms, reset page on change
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPage(1), 350);
  };

  // Reset page whenever debounced search fires
  const debouncedSearch = useDebounce(search, 350);
  useEffect(() => { setPage(1); }, [debouncedSearch]);

  const PER_PAGE = 12;

  const { data: stats } = useQuery({
    queryKey: ['opds-stats'],
    queryFn: () => api.get('/opds/stats').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['opds-admin', debouncedSearch, page],
    queryFn: () => {
      const params = new URLSearchParams({ per_page: PER_PAGE, page });
      if (debouncedSearch) params.set('search', debouncedSearch);
      return api.get(`/opds?${params}`).then((r) => r.data.data);
    },
    keepPreviousData: true,
    staleTime: 30_000,
  });

  const opds     = data?.data ?? [];
  const lastPage = data?.last_page ?? 1;
  const total    = data?.total ?? 0;

  const syncMut = useMutation({
    mutationFn: () => api.post('/opds/sync-sso'),
    onSuccess: (res) => {
      toast.success(res.data.message || 'Sinkronisasi berhasil.');
      qc.invalidateQueries({ queryKey: ['opds-admin'] });
      qc.invalidateQueries({ queryKey: ['opds-stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal sinkronisasi dengan SSO.'),
  });

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="mono-kicker text-muted">Administrasi</p>
          <h1>OPD</h1>
        </div>
        <button
          className="primary-button compact"
          disabled={syncMut.isPending}
          onClick={() => syncMut.mutate()}
        >
          <RefreshCw size={14} style={syncMut.isPending ? { animation: 'spin 1s linear infinite' } : {}} />
          {syncMut.isPending ? 'Menyinkronkan…' : 'Sinkronisasi dari SSO'}
        </button>
      </div>

      {/* Stats strip */}
      <div className="cp-stats">
        <div className="cp-stat">
          <span className="cp-stat-val">{stats?.total ?? '—'}</span>
          <span className="cp-stat-lbl">Total OPD</span>
        </div>
        <div className="cp-stat cp-stat--approved">
          <span className="cp-stat-val">{stats?.active ?? '—'}</span>
          <span className="cp-stat-lbl">Aktif</span>
        </div>
        <div className="cp-stat">
          <span className="cp-stat-val">{stats?.total_units ?? '—'}</span>
          <span className="cp-stat-lbl">Unit Kerja</span>
        </div>
        <div className="cp-stat">
          <span className="cp-stat-val">{stats?.total_asn ?? '—'}</span>
          <span className="cp-stat-lbl">Total ASN</span>
        </div>
      </div>

      {/* Live search */}
      <div style={{ position: 'relative', maxWidth: 400 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={handleSearchChange}
          placeholder="Cari nama atau kode OPD…"
          style={{ width: '100%', paddingLeft: 32, paddingRight: search ? 32 : 12, paddingTop: 9, paddingBottom: 9, border: '1px solid var(--border)', font: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
        />
        {search && (
          <button
            onClick={() => { setSearch(''); setPage(1); }}
            style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', padding: 2, display: 'flex' }}
          >
            ×
          </button>
        )}
      </div>

      {/* Table card */}
      <section className="enterprise-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="section-title" style={{ padding: '14px 18px' }}>
          <h2>Daftar OPD</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isFetching && !isLoading && <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>Memuat…</span>}
            <span className="badge-active">{total} OPD</span>
          </div>
        </div>

        {isLoading && <div className="resource-note">Memuat data OPD…</div>}

        {!isLoading && opds.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px' }}>
            <Building2 size={32} style={{ color: 'var(--fg-3)', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-3)' }}>
              {search ? `Tidak ada OPD yang cocok dengan "${search}".` : 'Belum ada data OPD. Klik "Sinkronisasi dari SSO" untuk mengimpor.'}
            </p>
          </div>
        )}

        {opds.length > 0 && (
          <div style={{ overflowX: 'auto', opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.15s' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
                  {['Nama OPD', 'Kode', 'Kontak', 'Unit Kerja', 'ASN', 'Status', 'Sejak'].map((h) => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 11, color: 'var(--fg-3)', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {opds.map((opd, i) => (
                  <tr key={opd.uuid} style={{ borderBottom: i < opds.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    {/* Nama */}
                    <td style={{ padding: '12px 14px', paddingLeft: 18 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--fg-3)' }}>
                          <Building2 size={15} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ display: 'block', fontSize: 13 }}>{opd.name}</strong>
                          {opd.address && <span style={{ fontSize: 11, color: 'var(--fg-3)', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>{opd.address}</span>}
                        </div>
                      </div>
                    </td>

                    {/* Kode */}
                    <td style={{ padding: '12px 14px', fontFamily: 'Space Mono, monospace', fontSize: 12, color: 'var(--fg-2)', whiteSpace: 'nowrap' }}>
                      {opd.code || '—'}
                    </td>

                    {/* Kontak */}
                    <td style={{ padding: '12px 14px' }}>
                      {opd.email && <div style={{ fontSize: 12, color: 'var(--fg-2)' }}>{opd.email}</div>}
                      {opd.phone && <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>{opd.phone}</div>}
                      {!opd.email && !opd.phone && <span style={{ color: 'var(--fg-3)' }}>—</span>}
                    </td>

                    {/* Unit Kerja */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: opd.unit_count > 0 ? 'var(--fg)' : 'var(--fg-3)' }}>
                        <Building2 size={13} style={{ opacity: 0.5 }} />
                        {opd.unit_count}
                      </div>
                    </td>

                    {/* ASN */}
                    <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 600, color: opd.asn_count > 0 ? 'var(--grape)' : 'var(--fg-3)' }}>
                        <Users size={13} style={{ opacity: 0.7 }} />
                        {opd.asn_count}
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: 11, padding: '3px 10px',
                        background: opd.is_active ? '#dcfce7' : '#f3f4f6',
                        color: opd.is_active ? '#166534' : 'var(--fg-3)',
                        border: `1px solid ${opd.is_active ? '#86efac' : 'var(--border)'}`,
                      }}>
                        {opd.is_active ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </td>

                    {/* Sejak */}
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>
                      {formatDate(opd.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          lastPage={lastPage}
          total={total}
          perPage={PER_PAGE}
          onChange={setPage}
        />
      </section>
    </div>
  );
}

// ── useDebounce hook ───────────────────────────────────────────────────────────

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
