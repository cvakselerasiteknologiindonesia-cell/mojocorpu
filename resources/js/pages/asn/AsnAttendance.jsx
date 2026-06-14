import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api.js';

function formatDate(d) {
  if (!d) return '—';
  const s = d.length > 10 ? d.substring(0, 10) : d;
  return new Date(`${s}T00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return null;
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function StatusBadge({ checked, checkedAt }) {
  if (checked) {
    return (
      <span className="asn-att-badge asn-att-badge--present">
        ✓ Hadir{checkedAt && <span className="asn-att-badge-time">{formatDateTime(checkedAt)}</span>}
      </span>
    );
  }
  return <span className="asn-att-badge asn-att-badge--absent">Belum Hadir</span>;
}

function AttendanceDetail({ uuid }) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['asn-learn', uuid],
    queryFn: async () => (await api.get(`/training-events/${uuid}/learn`)).data.data,
    enabled: !!uuid,
  });

  if (isLoading) return <div className="resource-note">Memuat data presensi…</div>;
  if (!data) return null;

  const { attendance, sessions = [] } = data;
  const sessionsWithAtt = sessions.filter((s) => s.my_attendance !== null || s.my_attendance === null);

  return (
    <div className="asn-att-detail">
      {/* Event-level attendance card */}
      <div className="asn-att-card">
        <div className="asn-att-card-head">
          <ClipboardCheck size={16} />
          <strong>Presensi Event</strong>
        </div>
        <div className="asn-att-card-body">
          <StatusBadge checked={attendance?.checked_in} checkedAt={attendance?.checked_in_at} />
          {!attendance?.checked_in && (
            <p className="asn-att-hint">
              Lakukan presensi melalui halaman{' '}
              <button className="text-link-sm" onClick={() => navigate(`/training-events/${uuid}/learn`)}>
                Learning
              </button>
              .
            </p>
          )}
        </div>
      </div>

      {/* Session-level attendance */}
      {sessionsWithAtt.length > 0 && (
        <div className="asn-att-sessions">
          <p className="mono-kicker text-muted" style={{ margin: '0 0 8px' }}>Presensi Sesi</p>
          {sessionsWithAtt.map((s, i) => (
            <div key={s.id} className="asn-att-session-row">
              <span className="asn-att-session-num">{i + 1}</span>
              <div className="asn-att-session-info">
                <strong>{s.title}</strong>
                {s.start_date && <span>{formatDate(s.start_date)}</span>}
              </div>
              <StatusBadge
                checked={!!s.my_attendance}
                checkedAt={s.my_attendance?.checked_in_at}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AsnAttendance() {
  const [selectedUuid, setSelectedUuid] = useState(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['asn-enrolled-events'],
    queryFn: async () => (await api.get('/training-events?per_page=100')).data.data.data,
  });

  const selectedEvent = events.find((e) => e.uuid === selectedUuid);

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Learning</p>
        <h1>Presensi Saya</h1>
      </div>

      <div className="fm-layout">
        {/* Event list */}
        <aside className="fm-events-list">
          <div className="fm-events-header">Training Events</div>
          {isLoading && <div className="resource-note">Memuat…</div>}
          {!isLoading && events.length === 0 && (
            <div className="resource-note">Belum ada event yang diikuti.</div>
          )}
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

        {/* Attendance detail panel */}
        <div className="fm-materials-panel">
          {!selectedUuid && (
            <div className="fm-no-event">
              <ClipboardCheck size={36} />
              <p>Pilih event untuk melihat status presensi Anda.</p>
            </div>
          )}

          {selectedUuid && (
            <>
              <div className="fm-panel-head">
                <div>
                  <strong className="fm-panel-title">{selectedEvent?.title}</strong>
                  <span className="fm-panel-sub">
                    {formatDate(selectedEvent?.start_date)}
                    {selectedEvent?.location && ` · ${selectedEvent.location}`}
                  </span>
                </div>
                <em className={`status-badge${selectedEvent?.status === 'active' ? ' active' : ''}`}>
                  {selectedEvent?.status ?? '—'}
                </em>
              </div>
              <AttendanceDetail uuid={selectedUuid} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
