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
        <p className="mono-kicker text-muted">Ruang Kerja Fasilitator</p>
        <h1>Dashboard Fasilitator</h1>
      </div>

      <section className="enterprise-card">
        <div className="section-title">
          <div>
            <p className="mono-kicker text-muted">Profil</p>
            <h2>{session.user?.name || 'Fasilitator'}</h2>
          </div>
          <span className="badge-active">{getRoleNames(session.user).join(', ')}</span>
        </div>
        <div className="resource-note">
          {session.user?.nip || session.user?.email} · {session.user?.position_name || 'Instruktur'}
        </div>
      </section>

      <div className="kpi-grid">
        {[
          ['Kelas Ditugaskan', stats.assigned_classes ?? 0, 'Kelas yang menjadi tanggung jawab Anda'],
          ['Peserta', stats.participants ?? 0, 'Peserta dalam kelas yang ditugaskan'],
          ['Materi', stats.materials_uploaded ?? 0, 'Materi yang telah diunggah'],
          ['Evaluasi Menunggu', stats.pending_evaluations ?? 0, 'Evaluasi yang perlu ditinjau'],
        ].map(([label, value, note]) => (
          <KpiCard key={label} label={label} value={value} note={note} loading={isLoading} />
        ))}
      </div>

      <section className="enterprise-card">
        <div className="section-title">
          <h2>Jadwal Pelatihan Ditugaskan</h2>
          <span className="badge-active">KELAS SAYA</span>
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
