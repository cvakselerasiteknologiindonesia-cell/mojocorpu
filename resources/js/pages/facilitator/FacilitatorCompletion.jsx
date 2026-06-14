import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award,
  CheckCircle,
  ChevronRight,
  ClipboardList,
  Search,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  const s = d.length > 10 ? d.substring(0, 10) : d;
  return new Date(`${s}T00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────

function SkeletonLine({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function EventListSkeleton() {
  return (
    <>
      {[80, 65, 90, 55, 75, 70, 60].map((w, i) => (
        <div key={i} className="cp-skel-event">
          <SkeletonLine w={`${w}%`} h={13} />
          <SkeletonLine w="40%" h={10} />
        </div>
      ))}
    </>
  );
}

function CompletionLoadingSkeleton() {
  return (
    <div className="cp-skel-wrap">
      <div className="cp-skel-stats">
        {[48, 36, 36, 36].map((w, i) => (
          <div key={i} className="cp-skel-stat">
            <SkeletonLine w={w} h={22} />
            <SkeletonLine w={44} h={10} />
          </div>
        ))}
      </div>
      <div className="cp-skel-thead" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="cp-skel-row" style={{ opacity: Math.max(0.18, 1 - i * 0.1) }}>
          <SkeletonLine w={16} h={16} />
          <div className="cp-skel-name">
            <SkeletonLine w="65%" h={13} />
            <SkeletonLine w="45%" h={10} />
          </div>
          <SkeletonLine w="70%" h={12} />
          <SkeletonLine w={52} h={12} />
          <SkeletonLine w={72} h={20} />
          <SkeletonLine w={64} h={22} />
          <div className="cp-skel-actions">
            <SkeletonLine w={28} h={28} />
            <SkeletonLine w={28} h={28} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Completion status badge ───────────────────────────────────────────────────

function CompletionBadge({ status }) {
  const map = {
    pending:  { label: 'Menunggu', cls: 'cp-badge--pending' },
    approved: { label: 'Disetujui', cls: 'cp-badge--approved' },
    rejected: { label: 'Ditolak', cls: 'cp-badge--rejected' },
  };
  const { label, cls } = map[status] ?? map.pending;
  return <span className={`cp-badge ${cls}`}>{label}</span>;
}

// ── Assessment score chips ────────────────────────────────────────────────────

function ScoreChips({ assessments }) {
  if (!assessments?.length) return <span style={{ color: 'var(--fg-3)', fontSize: 12 }}>—</span>;
  return (
    <div className="cp-score-chips">
      {assessments.map((a) => (
        <span
          key={a.id}
          className={`cp-score-chip${a.submitted ? (a.is_passed ? ' passed' : ' failed') : ' unsub'}`}
          title={`${a.title} — passing: ${a.passing_score ?? '—'}`}
        >
          {a.type === 'pre_test' ? 'Pre' : a.type === 'post_test' ? 'Post' : a.title.slice(0, 6)}
          {a.submitted ? `: ${a.score ?? '?'}` : ': —'}
        </span>
      ))}
    </div>
  );
}

// ── Attendance cell ───────────────────────────────────────────────────────────

function AttendanceCell({ attendance, sessionAttendanceCount, totalSessions }) {
  return (
    <div className="cp-att-cell">
      <span className={`cp-att-dot${attendance.checked_in ? ' present' : ''}`} title={attendance.checked_in ? formatDateTime(attendance.checked_in_at) : 'Belum hadir'}>
        {attendance.checked_in ? '✓' : '✗'}
      </span>
      {totalSessions > 0 && (
        <span className="cp-att-sessions">{sessionAttendanceCount}/{totalSessions} sesi</span>
      )}
    </div>
  );
}

// ── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({ participant, onClose, onConfirm, isPending }) {
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Tolak Kelulusan</h3>
          <button className="icon-button" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--fg-2)', margin: '0 0 12px' }}>
            Tolak kelulusan <strong>{participant.user?.name}</strong>?
          </p>
          <label className="form-label">Alasan penolakan <em style={{ fontWeight: 400, color: 'var(--fg-3)' }}>(opsional)</em></label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Tuliskan alasan penolakan…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ resize: 'vertical' }}
            maxLength={500}
          />
          <div className="modal-actions">
            <button className="outline-button" onClick={onClose}>Batal</button>
            <button className="danger-button" onClick={() => onConfirm(reason)} disabled={isPending}>
              {isPending ? 'Memproses…' : 'Tolak Kelulusan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Participant detail drawer ─────────────────────────────────────────────────

function ParticipantDrawer({ participant: p, onClose, onApprove, onReject, isPending }) {
  const [showReject, setShowReject] = useState(false);

  const isApproved = p.completion_status === 'approved';
  const isRejected = p.completion_status === 'rejected';

  return (
    <>
      <div className="cp-drawer-overlay" onClick={onClose} />
      <div className="cp-drawer">
        <div className="cp-drawer-head">
          <div>
            <strong className="cp-drawer-name">{p.user?.name}</strong>
            <span className="cp-drawer-nip">{p.user?.nip ?? '—'} · {p.user?.opd_name ?? '—'}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <CompletionBadge status={p.completion_status} />
            <button className="icon-button" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="cp-drawer-body">
          {/* Attendance */}
          <section className="cp-drawer-section">
            <p className="cp-drawer-section-title">Kehadiran</p>
            <div className="cp-drawer-row">
              <span>Presensi Event</span>
              <span className={`cp-att-dot${p.attendance.checked_in ? ' present' : ''}`} style={{ fontWeight: 600 }}>
                {p.attendance.checked_in ? `✓ Hadir (${formatDateTime(p.attendance.checked_in_at)})` : '✗ Belum hadir'}
              </span>
            </div>
            {p.total_sessions > 0 && (
              <div className="cp-drawer-row">
                <span>Presensi Sesi</span>
                <span>{p.session_attendance_count} / {p.total_sessions} sesi</span>
              </div>
            )}
          </section>

          {/* Assessments */}
          {p.assessments?.length > 0 && (
            <section className="cp-drawer-section">
              <p className="cp-drawer-section-title">Penilaian</p>
              {p.assessments.map((a) => (
                <div key={a.id} className="cp-drawer-row">
                  <span>{a.title} <em style={{ fontSize: 11, color: 'var(--fg-3)' }}>({a.type})</em></span>
                  <span>
                    {a.submitted
                      ? <span className={a.is_passed ? 'text-success' : 'text-danger'}>{a.score ?? '—'} / {a.passing_score ?? '—'} {a.is_passed ? '✓' : '✗'}</span>
                      : <em style={{ color: 'var(--fg-3)' }}>Belum dikerjakan</em>
                    }
                  </span>
                </div>
              ))}
            </section>
          )}

          {/* Certificate */}
          {isApproved && p.certificate && (
            <section className="cp-drawer-section">
              <p className="cp-drawer-section-title">Sertifikat</p>
              <div className="cp-cert-box">
                <Award size={20} />
                <div>
                  <strong>{p.certificate.certificate_number}</strong>
                  <span>Diterbitkan {formatDateTime(p.certificate.issued_at)}</span>
                </div>
              </div>
            </section>
          )}

          {/* Rejection reason */}
          {isRejected && p.rejection_reason && (
            <section className="cp-drawer-section">
              <p className="cp-drawer-section-title">Alasan Penolakan</p>
              <p className="cp-rejection-note">{p.rejection_reason}</p>
            </section>
          )}

          {/* Approval info */}
          {(isApproved || isRejected) && (
            <section className="cp-drawer-section">
              <p className="cp-drawer-section-title">{isApproved ? 'Info Persetujuan' : 'Info Penolakan'}</p>
              <div className="cp-drawer-row">
                <span>Tanggal</span>
                <span>{formatDateTime(p.approved_at)}</span>
              </div>
            </section>
          )}
        </div>

        {/* Actions */}
        <div className="cp-drawer-footer">
          {!isApproved && (
            <button className="primary-button" onClick={onApprove} disabled={isPending}>
              <ThumbsUp size={14} /> Setujui Kelulusan
            </button>
          )}
          {!isRejected && (
            <button className="danger-button" onClick={() => setShowReject(true)} disabled={isPending}>
              <ThumbsDown size={14} /> Tolak
            </button>
          )}
          {isApproved && (
            <button className="outline-button" onClick={() => setShowReject(true)} disabled={isPending}>
              <XCircle size={14} /> Batalkan Persetujuan
            </button>
          )}
        </div>
      </div>

      {showReject && (
        <RejectModal
          participant={p}
          onClose={() => setShowReject(false)}
          onConfirm={(reason) => { onReject(reason); setShowReject(false); }}
          isPending={isPending}
        />
      )}
    </>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────────

function StatsBar({ stats }) {
  return (
    <div className="cp-stats">
      <div className="cp-stat">
        <span className="cp-stat-val">{stats.total}</span>
        <span className="cp-stat-lbl">Peserta</span>
      </div>
      <div className="cp-stat cp-stat--pending">
        <span className="cp-stat-val">{stats.pending}</span>
        <span className="cp-stat-lbl">Menunggu</span>
      </div>
      <div className="cp-stat cp-stat--approved">
        <span className="cp-stat-val">{stats.approved}</span>
        <span className="cp-stat-lbl">Disetujui</span>
      </div>
      <div className="cp-stat cp-stat--rejected">
        <span className="cp-stat-val">{stats.rejected}</span>
        <span className="cp-stat-lbl">Ditolak</span>
      </div>
    </div>
  );
}

// ── Completion Panel ──────────────────────────────────────────────────────────

function CompletionPanel({ uuid }) {
  const queryClient = useQueryClient();
  const qk = ['completion', uuid];
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [drawer, setDrawer] = useState(null);
  const selectAllRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => (await api.get(`/training-events/${uuid}/completion`)).data.data,
    enabled: !!uuid,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk });
    setSelected(new Set());
  };

  const approveMut = useMutation({
    mutationFn: (userId) => api.patch(`/training-events/${uuid}/completion/${userId}/approve`),
    onSuccess: () => { invalidate(); setDrawer(null); toast.success('Kelulusan disetujui.'); },
    onError: () => toast.error('Gagal menyetujui kelulusan.'),
  });

  const rejectMut = useMutation({
    mutationFn: ({ userId, reason }) => api.patch(`/training-events/${uuid}/completion/${userId}/reject`, { reason }),
    onSuccess: () => { invalidate(); setDrawer(null); toast.success('Kelulusan ditolak.'); },
    onError: () => toast.error('Gagal menolak kelulusan.'),
  });

  const bulkApproveMut = useMutation({
    mutationFn: (userIds) => api.post(`/training-events/${uuid}/completion/bulk-approve`, { user_ids: userIds }),
    onSuccess: (res) => {
      invalidate();
      toast.success(`${res.data.data.approved_count} kelulusan disetujui.`);
    },
    onError: () => toast.error('Gagal menyetujui massal.'),
  });

  const participants = data?.participants ?? [];
  const stats        = data?.stats ?? { total: 0, pending: 0, approved: 0, rejected: 0 };

  // Filter + search
  const visible = participants.filter((p) => {
    if (filterTab !== 'all' && p.completion_status !== filterTab) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return p.user?.name?.toLowerCase().includes(q) || p.user?.nip?.includes(q);
    }
    return true;
  });

  // Select-all logic (only pending are bulk-actionable)
  const pendingVisible = visible.filter((p) => p.completion_status === 'pending');
  const pendingIds = pendingVisible.map((p) => p.user_id);
  const allPendingSelected = pendingIds.length > 0 && pendingIds.every((id) => selected.has(id));
  const somePendingSelected = pendingIds.some((id) => selected.has(id));

  // Update indeterminate state
  if (selectAllRef.current) {
    selectAllRef.current.indeterminate = somePendingSelected && !allPendingSelected;
  }

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelected((prev) => { const s = new Set(prev); pendingIds.forEach((id) => s.delete(id)); return s; });
    } else {
      setSelected((prev) => new Set([...prev, ...pendingIds]));
    }
  };

  const toggleRow = (userId) => {
    setSelected((prev) => { const s = new Set(prev); s.has(userId) ? s.delete(userId) : s.add(userId); return s; });
  };

  const selectedArr = [...selected];
  const isPending = approveMut.isPending || rejectMut.isPending || bulkApproveMut.isPending;

  // Update drawer data from latest query result
  const drawerParticipant = drawer ? participants.find((p) => p.user_id === drawer) : null;

  if (isLoading) return <CompletionLoadingSkeleton />;

  if (participants.length === 0) {
    return (
      <div className="material-empty">
        <ClipboardList size={32} />
        <p>Belum ada peserta terdaftar.</p>
        <span>Tambahkan peserta di halaman Participants terlebih dahulu.</span>
      </div>
    );
  }

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

        <div className="cp-filter-tabs">
          {[['all','Semua'], ['pending','Menunggu'], ['approved','Disetujui'], ['rejected','Ditolak']].map(([val, lbl]) => (
            <button
              key={val}
              className={`cp-filter-tab${filterTab === val ? ' active' : ''}`}
              onClick={() => setFilterTab(val)}
            >
              {lbl}
              {val !== 'all' && <em className="cp-filter-count">{stats[val]}</em>}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="fp-toolbar" style={{ padding: '8px 12px' }}>
          <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>{selected.size} peserta dipilih</span>
          <div className="fp-toolbar-right">
            <button
              className="primary-button compact"
              onClick={() => bulkApproveMut.mutate(selectedArr)}
              disabled={isPending}
            >
              <CheckCircle size={13} /> Setujui ({selected.size})
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="att-table-wrap">
        <table className="att-table cp-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  ref={selectAllRef}
                  checked={allPendingSelected}
                  onChange={toggleSelectAll}
                  disabled={pendingIds.length === 0}
                  title="Pilih semua yang menunggu"
                />
              </th>
              <th>Peserta</th>
              <th>OPD</th>
              <th>Kehadiran</th>
              <th>Nilai</th>
              <th>Status</th>
              <th style={{ width: 120 }}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: 20, textAlign: 'center', color: 'var(--fg-3)' }}>
                  Tidak ada peserta yang cocok.
                </td>
              </tr>
            )}
            {visible.map((p) => {
              const isPending2 = p.completion_status === 'pending';
              const isChecked = selected.has(p.user_id);
              return (
                <tr key={p.id} className={isChecked ? 'row-selected' : ''} style={{ cursor: 'pointer' }}>
                  <td onClick={(e) => e.stopPropagation()}>
                    {isPending2 && (
                      <input type="checkbox" checked={isChecked} onChange={() => toggleRow(p.user_id)} />
                    )}
                  </td>
                  <td onClick={() => setDrawer(p.user_id)}>
                    <div className="att-cell-name">{p.user?.name ?? '—'}</div>
                    <div className="att-cell-nip">{p.user?.nip ?? '—'}</div>
                  </td>
                  <td className="att-cell-opd" onClick={() => setDrawer(p.user_id)}>{p.user?.opd_name ?? '—'}</td>
                  <td onClick={() => setDrawer(p.user_id)}>
                    <AttendanceCell
                      attendance={p.attendance}
                      sessionAttendanceCount={p.session_attendance_count}
                      totalSessions={p.total_sessions}
                    />
                  </td>
                  <td onClick={() => setDrawer(p.user_id)}>
                    <ScoreChips assessments={p.assessments} />
                  </td>
                  <td onClick={() => setDrawer(p.user_id)}>
                    <CompletionBadge status={p.completion_status} />
                  </td>
                  <td>
                    <div className="cp-row-actions">
                      {p.completion_status !== 'approved' && (
                        <button
                          className="cp-action-btn cp-action-btn--approve"
                          title="Setujui"
                          onClick={(e) => { e.stopPropagation(); approveMut.mutate(p.user_id); }}
                          disabled={isPending}
                        >
                          <ThumbsUp size={12} />
                        </button>
                      )}
                      {p.completion_status !== 'rejected' && (
                        <button
                          className="cp-action-btn cp-action-btn--reject"
                          title="Tolak"
                          onClick={(e) => { e.stopPropagation(); setDrawer(p.user_id); }}
                          disabled={isPending}
                        >
                          <ThumbsDown size={12} />
                        </button>
                      )}
                      {p.completion_status === 'approved' && (
                        <span className="cp-cert-issued" title={`Sertifikat: ${p.certificate?.certificate_number ?? '—'}`}>
                          <Award size={13} />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Participant detail drawer */}
      {drawerParticipant && (
        <ParticipantDrawer
          participant={drawerParticipant}
          onClose={() => setDrawer(null)}
          onApprove={() => approveMut.mutate(drawerParticipant.user_id)}
          onReject={(reason) => rejectMut.mutate({ userId: drawerParticipant.user_id, reason })}
          isPending={isPending}
        />
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FacilitatorCompletion() {
  const [selectedUuid, setSelectedUuid] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['facilitator-events-list'],
    queryFn: async () => (await api.get('/training-events?per_page=100')).data.data.data,
  });

  const selectedEvent = events.find((e) => e.uuid === selectedUuid);

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Facilitator</p>
        <h1>Completion Approval</h1>
      </div>

      <div className="fm-layout">
        {/* Event list */}
        <aside className="fm-events-list">
          <div className="fm-events-header">Training Events</div>
          {isLoading && <EventListSkeleton />}
          {!isLoading && events.length === 0 && <div className="resource-note">Tidak ada event.</div>}
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

        {/* Completion panel */}
        <div className="fm-materials-panel">
          {!selectedUuid && (
            <div className="fm-no-event">
              <Award size={36} />
              <p>Pilih training event untuk mengelola persetujuan kelulusan.</p>
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
              <CompletionPanel uuid={selectedUuid} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
