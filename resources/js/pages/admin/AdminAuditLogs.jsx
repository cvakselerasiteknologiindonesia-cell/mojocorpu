import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, CalendarDays, Clock3, Database, Eye, Filter, Search, UserRound } from 'lucide-react';
import api from '../../api.js';
import KpiCard from '../../components/KpiCard.jsx';

function formatDateTime(value) {
  if (!value) return '-';
  return new Date(value.replace(' ', 'T')).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function compactSubject(type, id) {
  if (!type && !id) return '-';
  const name = (type || 'Subject').split('\\').pop();
  return `${name}${id ? ` #${id}` : ''}`;
}

function JsonBlock({ data }) {
  if (!data || (Array.isArray(data) && data.length === 0) || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return <span className="audit-muted">Tidak ada detail.</span>;
  }

  return <pre className="audit-json">{JSON.stringify(data, null, 2)}</pre>;
}

function AuditDetail({ log }) {
  if (!log) {
    return (
      <div className="audit-detail-empty">
        <Eye size={34} />
        <p>Pilih log untuk melihat detail aktivitas.</p>
      </div>
    );
  }

  return (
    <div className="audit-detail">
      <div className="audit-detail-head">
        <span className="audit-event">{log.event || 'activity'}</span>
        <h2>{log.description}</h2>
        <p>{formatDateTime(log.created_at)}</p>
      </div>

      <div className="audit-detail-grid">
        <div><span>Log</span><strong>{log.log_name || '-'}</strong></div>
        <div><span>Actor</span><strong>{log.causer_name || 'System'}</strong></div>
        <div><span>Actor Email</span><strong>{log.causer_email || '-'}</strong></div>
        <div><span>Subject</span><strong>{compactSubject(log.subject_type, log.subject_id)}</strong></div>
      </div>

      <section>
        <h3>Properties</h3>
        <JsonBlock data={log.properties} />
      </section>

      <section>
        <h3>Attribute Changes</h3>
        <JsonBlock data={log.attribute_changes} />
      </section>
    </div>
  );
}

export default function AdminAuditLogs() {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    log_name: '',
    event: '',
    date_from: '',
    date_to: '',
  });
  const [selectedId, setSelectedId] = useState(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page, per_page: 20 });
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return params.toString();
  }, [filters, page]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['audit-logs', queryString],
    queryFn: () => api.get(`/audit-logs?${queryString}`).then((r) => r.data.data),
    keepPreviousData: true,
  });

  const logs = data?.logs?.data || [];
  const summary = data?.summary || {};
  const serverFilters = data?.filters || {};
  const selected = logs.find((log) => log.id === selectedId) || logs[0] || null;

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">System</p>
        <h1>Audit Logs</h1>
      </div>

      <div className="admin-mini-grid">
        <KpiCard label="Total Logs" value={summary.total ?? 0} note="Semua aktivitas terekam" loading={isLoading} />
        <KpiCard label="Today" value={summary.today ?? 0} note="Aktivitas hari ini" loading={isLoading} />
        <KpiCard label="Actors" value={summary.actors ?? 0} note="Pengguna yang memicu log" loading={isLoading} />
        <KpiCard label="Filtered" value={summary.filtered ?? 0} note="Hasil sesuai filter" loading={isLoading} />
      </div>

      <section className="audit-filter-card">
        <div className="audit-search">
          <Search size={15} />
          <input
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            placeholder="Cari deskripsi, event, log, nama, atau email..."
          />
        </div>
        <select value={filters.log_name} onChange={(e) => updateFilter('log_name', e.target.value)}>
          <option value="">Semua log</option>
          {(serverFilters.log_names || []).map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select value={filters.event} onChange={(e) => updateFilter('event', e.target.value)}>
          <option value="">Semua event</option>
          {(serverFilters.events || []).map((event) => <option key={event} value={event}>{event}</option>)}
        </select>
        <input type="date" value={filters.date_from} onChange={(e) => updateFilter('date_from', e.target.value)} />
        <input type="date" value={filters.date_to} onChange={(e) => updateFilter('date_to', e.target.value)} />
      </section>

      <div className="audit-layout">
        <section className="enterprise-card audit-list-card">
          <div className="section-title">
            <div>
              <p className="mono-kicker text-muted">Activity Stream</p>
              <h2>Log Aktivitas</h2>
            </div>
            <span className="badge-active">{isFetching ? 'SYNCING' : `${data?.logs?.total ?? 0} LOGS`}</span>
          </div>

          {isLoading && <div className="resource-note">Memuat audit logs...</div>}
          {!isLoading && logs.length === 0 && (
            <div className="audit-empty">
              <Filter size={30} />
              <p>Tidak ada audit log yang cocok.</p>
              <span>Coba ubah pencarian atau rentang tanggal.</span>
            </div>
          )}

          <div className="audit-list">
            {logs.map((log) => (
              <button
                className={`audit-row${selected?.id === log.id ? ' active' : ''}`}
                key={log.id}
                onClick={() => setSelectedId(log.id)}
                type="button"
              >
                <span className="audit-row-icon"><Activity size={15} /></span>
                <span className="audit-row-main">
                  <strong>{log.description}</strong>
                  <em>
                    <Database size={11} /> {log.log_name || 'default'}
                    <UserRound size={11} /> {log.causer_name || 'System'}
                    <CalendarDays size={11} /> {formatDateTime(log.created_at)}
                  </em>
                </span>
                <span className="audit-event">{log.event || 'activity'}</span>
              </button>
            ))}
          </div>

          {data?.logs && data.logs.last_page > 1 && (
            <div className="audit-pagination">
              <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
              <span>Page {data.logs.current_page} / {data.logs.last_page}</span>
              <button className="outline-button compact" disabled={page >= data.logs.last_page} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </section>

        <aside className="enterprise-card audit-detail-card">
          <div className="section-title">
            <div>
              <p className="mono-kicker text-muted">Detail</p>
              <h2>Audit Entry</h2>
            </div>
            <Clock3 size={16} color="var(--fg-3)" />
          </div>
          <AuditDetail log={selected} />
        </aside>
      </div>
    </div>
  );
}
