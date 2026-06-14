import { useQuery } from '@tanstack/react-query';
import api from '../api.js';
import { getRoleNames } from '../utils/permissions.js';
import KpiCard from '../components/KpiCard.jsx';

export default function FacilitatorDashboard({ session }) {
  const { data, isLoading } = useQuery({
    queryKey: ['facilitator-dashboard'],
    queryFn: async () => (await api.get('/facilitator/dashboard')).data.data,
  });

  const stats = data?.stats || {};
  const schedule = data?.schedule || [];

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Facilitator Workspace</p>
        <h1>Facilitator Dashboard</h1>
      </div>

      <section className="enterprise-card">
        <div className="section-title">
          <div>
            <p className="mono-kicker text-muted">Profile</p>
            <h2>{session.user?.name || 'Facilitator'}</h2>
          </div>
          <span className="badge-active">{getRoleNames(session.user).join(', ')}</span>
        </div>
        <div className="resource-note">
          {session.user?.nip || session.user?.email} · {session.user?.position_name || 'Instructor'}
        </div>
      </section>

      <div className="kpi-grid">
        {[
          ['Assigned Classes', stats.assigned_classes ?? 0, 'Kelas yang menjadi tanggung jawab Anda'],
          ['Participants', stats.participants ?? 0, 'Peserta dalam kelas yang ditugaskan'],
          ['Materials', stats.materials_uploaded ?? 0, 'Materi yang telah diunggah'],
          ['Pending Evaluations', stats.pending_evaluations ?? 0, 'Evaluasi yang perlu ditinjau'],
        ].map(([label, value, note]) => (
          <KpiCard key={label} label={label} value={value} note={note} loading={isLoading} />
        ))}
      </div>

      <section className="enterprise-card">
        <div className="section-title">
          <h2>Assigned Training Schedule</h2>
          <span className="badge-active">OWN CLASSES</span>
        </div>
        <div className="resource-note">
          {schedule.length === 0
            ? 'Belum ada jadwal kelas yang ditugaskan.'
            : schedule.map((item) => (
              <div key={item.uuid}>{item.title} · {item.start_date || '-'} sampai {item.end_date || '-'}</div>
            ))}
        </div>
      </section>
    </div>
  );
}
