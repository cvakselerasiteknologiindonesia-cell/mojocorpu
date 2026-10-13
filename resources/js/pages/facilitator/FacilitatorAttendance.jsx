import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight,
  ClipboardCheck,
  Download,
  Search,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';
import { loadXlsx } from '../../utils/xlsx.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  const s = d.length > 10 ? d.substring(0, 10) : d;
  return new Date(`${s}T00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return null;
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Attendance Toggle Button ──────────────────────────────────────────────────

function AttendanceToggle({ checked, checkedAt, onMark, onUnmark, isPending }) {
  return (
    <button
      className={`att-toggle${checked ? ' att-toggle--on' : ''}`}
      disabled={isPending}
      onClick={() => checked ? onUnmark() : onMark()}
      title={checked ? `Hadir — ${formatDateTime(checkedAt) ?? ''}` : 'Tandai Hadir'}
    >
      {checked ? '✓ Hadir' : 'Absen'}
    </button>
  );
}

// ── Export to Excel ───────────────────────────────────────────────────────────

async function exportAttendance(eventTitle, participants, sessions) {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();

  // Sheet 1: event-level attendance
  const rows = [
    ['No', 'Nama', 'NIP', 'OPD', 'Status Presensi', 'Waktu Check-in', ...sessions.map((s) => s.title)],
    ...participants.map((p, i) => [
      i + 1,
      p.user?.name ?? '—',
      p.user?.nip ?? '—',
      p.user?.opd_name ?? '—',
      p.event_attendance.checked_in ? 'Hadir' : 'Tidak Hadir',
      p.event_attendance.checked_in_at ? formatDateTime(p.event_attendance.checked_in_at) : '—',
      ...sessions.map((s) => (p.session_attendances?.[s.id] ? 'Hadir' : '—')),
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Presensi');
  XLSX.writeFile(wb, `presensi-${eventTitle.replace(/\s+/g, '-')}.xlsx`);
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar({ stats }) {
  const pct = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
  return (
    <div className="att-stats">
      <div className="att-stat">
        <span className="att-stat-val">{stats.total}</span>
        <span className="att-stat-lbl">Peserta</span>
      </div>
      <div className="att-stat att-stat--present">
        <span className="att-stat-val">{stats.present}</span>
        <span className="att-stat-lbl">Hadir</span>
      </div>
      <div className="att-stat att-stat--absent">
        <span className="att-stat-val">{stats.absent}</span>
        <span className="att-stat-lbl">Belum Hadir</span>
      </div>
      <div className="att-stat">
        <span className="att-stat-val">{pct}%</span>
        <span className="att-stat-lbl">Kehadiran</span>
      </div>
      <div className="att-progress-wrap">
        <div className="att-progress-bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function EventListSkeleton() {
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="fm-event-item" style={{ opacity: Math.max(0.18, 1 - i * 0.1), pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <Skel w="72%" h={13} />
            <Skel w="45%" h={10} />
          </div>
          <Skel w={14} h={14} />
        </div>
      ))}
    </>
  );
}

function AttendancePanelSkeleton() {
  return (
    <>
      {/* Stats bar */}
      <div className="att-stats">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="att-stat" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skel w={36} h={22} />
            <Skel w={52} h={10} />
          </div>
        ))}
        <div className="att-progress-wrap">
          <div className="att-progress-bar" style={{ width: '0%' }} />
        </div>
      </div>

      {/* Table */}
      <div className="att-table-wrap">
        <table className="att-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}><Skel w={16} h={16} /></th>
              <th><Skel w={60} h={11} /></th>
              <th><Skel w={32} h={11} /></th>
              <th><Skel w={36} h={11} /></th>
              <th><Skel w={44} h={11} /></th>
              <th><Skel w={80} h={11} /></th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} style={{ opacity: Math.max(0.18, 1 - i * 0.1) }}>
                <td><Skel w={16} h={16} /></td>
                <td><Skel w={110} h={13} /></td>
                <td><Skel w={90} h={11} /></td>
                <td><Skel w={100} h={11} /></td>
                <td><Skel w={64} h={26} style={{ borderRadius: 5 }} /></td>
                <td><Skel w={80} h={11} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Main Attendance Panel ─────────────────────────────────────────────────────

function AttendancePanel({ uuid, eventTitle }) {
  const queryClient = useQueryClient();
  const qk = ['attendance', uuid];
  const [search, setSearch] = useState('');
  const [activeSession, setActiveSession] = useState('event');
  const [selected, setSelected] = useState(new Set());
  const selectAllRef = useRef(null);

  // Reset selection when event or tab changes
  useEffect(() => { setSelected(new Set()); }, [uuid, activeSession]);

  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => (await api.get(`/training-events/${uuid}/attendance`)).data.data,
    enabled: !!uuid,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk });
  const clearAndInvalidate = () => { setSelected(new Set()); invalidate(); };

  // Event-level mark/unmark
  const markMut = useMutation({
    mutationFn: (userId) => api.post(`/training-events/${uuid}/attendance/${userId}/mark`),
    onSuccess: () => { invalidate(); toast.success('Presensi dicatat.'); },
    onError: () => toast.error('Gagal mencatat presensi.'),
  });
  const unmarkMut = useMutation({
    mutationFn: (userId) => api.delete(`/training-events/${uuid}/attendance/${userId}`),
    onSuccess: () => { invalidate(); toast.success('Presensi dihapus.'); },
    onError: () => toast.error('Gagal menghapus presensi.'),
  });

  // Session-level mark/unmark
  const markSessionMut = useMutation({
    mutationFn: ({ sessionId, userId }) => api.post(`/training-events/${uuid}/sessions/${sessionId}/attendance/${userId}/mark`),
    onSuccess: () => { invalidate(); toast.success('Presensi sesi dicatat.'); },
    onError: () => toast.error('Gagal mencatat presensi sesi.'),
  });
  const unmarkSessionMut = useMutation({
    mutationFn: ({ sessionId, userId }) => api.delete(`/training-events/${uuid}/sessions/${sessionId}/attendance/${userId}`),
    onSuccess: () => { invalidate(); toast.success('Presensi sesi dihapus.'); },
    onError: () => toast.error('Gagal menghapus presensi sesi.'),
  });

  // Bulk mutations
  const bulkMarkMut = useMutation({
    mutationFn: (userIds) => api.post(`/training-events/${uuid}/attendance/bulk-mark`, { user_ids: userIds }),
    onSuccess: () => { clearAndInvalidate(); toast.success('Presensi massal dicatat.'); },
    onError: () => toast.error('Gagal mencatat presensi massal.'),
  });
  const bulkUnmarkMut = useMutation({
    mutationFn: (userIds) => api.post(`/training-events/${uuid}/attendance/bulk-unmark`, { user_ids: userIds }),
    onSuccess: () => { clearAndInvalidate(); toast.success('Presensi massal dihapus.'); },
    onError: () => toast.error('Gagal menghapus presensi massal.'),
  });
  const bulkMarkSessionMut = useMutation({
    mutationFn: ({ sessionId, userIds }) => api.post(`/training-events/${uuid}/sessions/${sessionId}/attendance/bulk-mark`, { user_ids: userIds }),
    onSuccess: () => { clearAndInvalidate(); toast.success('Presensi sesi massal dicatat.'); },
    onError: () => toast.error('Gagal mencatat presensi sesi massal.'),
  });
  const bulkUnmarkSessionMut = useMutation({
    mutationFn: ({ sessionId, userIds }) => api.post(`/training-events/${uuid}/sessions/${sessionId}/attendance/bulk-unmark`, { user_ids: userIds }),
    onSuccess: () => { clearAndInvalidate(); toast.success('Presensi sesi massal dihapus.'); },
    onError: () => toast.error('Gagal menghapus presensi sesi massal.'),
  });

  const participants = data?.participants ?? [];
  const sessions     = data?.sessions ?? [];
  const stats        = data?.stats ?? { total: 0, present: 0, absent: 0 };

  const filtered = search.trim()
    ? participants.filter((p) => {
        const q = search.toLowerCase();
        return p.user?.name?.toLowerCase().includes(q) || p.user?.nip?.includes(q);
      })
    : participants;

  // Select-all indeterminate state
  const filteredIds = filtered.map((p) => p.user_id);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someSelected = filteredIds.some((id) => selected.has(id));
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected((prev) => { const s = new Set(prev); filteredIds.forEach((id) => s.delete(id)); return s; });
    } else {
      setSelected((prev) => new Set([...prev, ...filteredIds]));
    }
  };

  const toggleRow = (userId) => {
    setSelected((prev) => {
      const s = new Set(prev);
      s.has(userId) ? s.delete(userId) : s.add(userId);
      return s;
    });
  };

  const selectedArr = [...selected];
  const isBulkPending = bulkMarkMut.isPending || bulkUnmarkMut.isPending || bulkMarkSessionMut.isPending || bulkUnmarkSessionMut.isPending;

  const handleBulkMark = () => {
    if (activeSession === 'event') bulkMarkMut.mutate(selectedArr);
    else bulkMarkSessionMut.mutate({ sessionId: activeSession, userIds: selectedArr });
  };
  const handleBulkUnmark = () => {
    if (activeSession === 'event') bulkUnmarkMut.mutate(selectedArr);
    else bulkUnmarkSessionMut.mutate({ sessionId: activeSession, userIds: selectedArr });
  };

  if (isLoading) return <AttendancePanelSkeleton />;

  if (participants.length === 0) {
    return (
      <div className="material-empty">
        <Users size={32} />
        <p>Belum ada peserta terdaftar.</p>
        <span>Tambahkan peserta di halaman Participants terlebih dahulu.</span>
      </div>
    );
  }

  const sessionTabs = [{ id: 'event', title: 'Event' }, ...sessions.map((s) => ({ id: s.id, title: s.title }))];

  return (
    <>
      <StatsBar stats={stats} />

      {/* Toolbar */}
      <div className="att-toolbar">
        <div className="picker-search" style={{ flex: 1, maxWidth: 300 }}>
          <Search size={14} />
          <input
            placeholder="Cari nama atau NIP…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          className="outline-button compact"
          onClick={() => exportAttendance(eventTitle, participants, sessions)}
        >
          <Download size={13} /> Export Excel
        </button>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fp-toolbar" style={{ padding: '8px 12px' }}>
          <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{selected.size} dipilih</span>
          <div className="fp-toolbar-right">
            <button
              className="primary-button compact"
              onClick={handleBulkMark}
              disabled={isBulkPending}
            >
              Tandai Hadir ({selected.size})
            </button>
            <button
              className="danger-button compact"
              onClick={handleBulkUnmark}
              disabled={isBulkPending}
            >
              Hapus Presensi ({selected.size})
            </button>
          </div>
        </div>
      )}

      {/* Session tabs (only shown if event has sessions) */}
      {sessions.length > 0 && (
        <div className="att-session-tabs">
          {sessionTabs.map((t) => (
            <button
              key={t.id}
              className={`att-session-tab${activeSession === t.id ? ' active' : ''}`}
              onClick={() => setActiveSession(t.id)}
            >
              {t.id === 'event' ? <ClipboardCheck size={12} /> : null}
              {t.title}
              {t.id !== 'event' && (
                <em className="att-session-count">
                  {sessions.find((s) => s.id === t.id)?.attendance_count ?? 0}
                </em>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Attendance table */}
      <div className="att-table-wrap">
        <table className="att-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  ref={selectAllRef}
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
              </th>
              <th>Peserta</th>
              <th>NIP</th>
              <th>OPD</th>
              {activeSession === 'event' ? (
                <>
                  <th className="att-col-status">Status</th>
                  <th className="att-col-time">Waktu Check-in</th>
                </>
              ) : (
                <th className="att-col-status">Presensi Sesi</th>
              )}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: 'var(--fg-3)' }}>Tidak ada peserta yang cocok.</td></tr>
            )}
            {filtered.map((p) => {
              const isChecked = selected.has(p.user_id);
              const isPendingToggle = markMut.isPending || unmarkMut.isPending;
              const isPendingSession = markSessionMut.isPending || unmarkSessionMut.isPending;

              if (activeSession === 'event') {
                const att = p.event_attendance;
                return (
                  <tr key={p.id} className={isChecked ? 'row-selected' : ''}>
                    <td>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleRow(p.user_id)} />
                    </td>
                    <td className="att-cell-name">{p.user?.name ?? '—'}</td>
                    <td className="att-cell-nip">{p.user?.nip ?? '—'}</td>
                    <td className="att-cell-opd">{p.user?.opd_name ?? '—'}</td>
                    <td className="att-col-status">
                      <AttendanceToggle
                        checked={att.checked_in}
                        checkedAt={att.checked_in_at}
                        onMark={() => markMut.mutate(p.user_id)}
                        onUnmark={() => unmarkMut.mutate(p.user_id)}
                        isPending={isPendingToggle}
                      />
                    </td>
                    <td className="att-col-time att-time-cell">
                      {att.checked_in_at ? formatDateTime(att.checked_in_at) : <em style={{ color: 'var(--fg-3)' }}>—</em>}
                    </td>
                  </tr>
                );
              }

              // Session tab
              const sessionId  = activeSession;
              const sessionAtt = p.session_attendances?.[sessionId];
              const checkedIn  = !!sessionAtt;
              return (
                <tr key={p.id} className={isChecked ? 'row-selected' : ''}>
                  <td>
                    <input type="checkbox" checked={isChecked} onChange={() => toggleRow(p.user_id)} />
                  </td>
                  <td className="att-cell-name">{p.user?.name ?? '—'}</td>
                  <td className="att-cell-nip">{p.user?.nip ?? '—'}</td>
                  <td className="att-cell-opd">{p.user?.opd_name ?? '—'}</td>
                  <td className="att-col-status" colSpan={2}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <AttendanceToggle
                        checked={checkedIn}
                        checkedAt={sessionAtt}
                        onMark={() => markSessionMut.mutate({ sessionId, userId: p.user_id })}
                        onUnmark={() => unmarkSessionMut.mutate({ sessionId, userId: p.user_id })}
                        isPending={isPendingSession}
                      />
                      {checkedIn && (
                        <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{formatDateTime(sessionAtt)}</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FacilitatorAttendance() {
  const [selectedUuid, setSelectedUuid] = useState(null);

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['facilitator-events-list'],
    queryFn: async () => (await api.get('/training-events?per_page=100')).data.data.data,
  });

  const selectedEvent = events.find((e) => e.uuid === selectedUuid);

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Facilitator</p>
        <h1>Attendance</h1>
      </div>

      <div className="fm-layout">
        {/* Event list */}
        <aside className="fm-events-list">
          <div className="fm-events-header">Training Events</div>
          {eventsLoading && <EventListSkeleton />}
          {!eventsLoading && events.length === 0 && <div className="resource-note">Tidak ada event.</div>}
          {events.map((ev) => (
            <button
              key={ev.uuid}
              className={`fm-event-item${selectedUuid === ev.uuid ? ' active' : ''}`}
              onClick={() => setSelectedUuid(ev.uuid)}
            >
              <div className="fm-event-item-body">
                <strong>{ev.title}</strong>
                <span>{formatDate(ev.start_date)}</span>
              </div>
              <ChevronRight size={14} className="fm-event-chevron" />
            </button>
          ))}
        </aside>

        {/* Attendance panel */}
        <div className="fm-materials-panel">
          {!selectedUuid && (
            <div className="fm-no-event">
              <ClipboardCheck size={36} />
              <p>Pilih training event untuk mengelola presensi.</p>
            </div>
          )}

          {selectedUuid && (
            <>
              <div className="fm-panel-head">
                <div>
                  <strong className="fm-panel-title">{selectedEvent?.title}</strong>
                  <span className="fm-panel-sub">
                    {formatDate(selectedEvent?.start_date)}
                    {selectedEvent?.end_date && selectedEvent.end_date !== selectedEvent.start_date
                      && ` – ${formatDate(selectedEvent.end_date)}`}
                    {selectedEvent?.location && ` · ${selectedEvent.location}`}
                  </span>
                </div>
                <em className={`status-badge${selectedEvent?.status === 'active' ? ' active' : ''}`}>
                  {selectedEvent?.status ?? '—'}
                </em>
              </div>
              <AttendancePanel uuid={selectedUuid} eventTitle={selectedEvent?.title ?? 'event'} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
