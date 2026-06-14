import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../api.js';
import KpiCard from '../components/KpiCard.jsx';

const READINESS_LABELS = {
  ready: 'Ready',
  almost_ready: 'Almost Ready',
  needs_attention: 'Needs Attention',
};

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function ClassCardSkeleton() {
  return (
    <div className="class-grid">
      {Array.from({ length: 4 }).map((_, i) => (
        <section key={i} className="class-card" style={{ opacity: Math.max(0.2, 1 - i * 0.15) }}>
          <div className="class-card-head">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Skel w={62} h={10} />
              <Skel w="68%" h={18} />
            </div>
            <Skel w={56} h={20} />
          </div>
          <Skel w="85%" h={12} />
          <Skel w="70%" h={12} />
          <div className="class-meta-grid">
            {[0, 1, 2, 3].map((j) => (
              <div key={j} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <Skel w="55%" h={10} />
                <Skel w="42%" h={13} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
            {[0, 1].map((j) => (
              <div key={j} style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Skel w={80} h={10} /><Skel w={28} h={10} />
                </div>
                <Skel w="100%" h={3} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function FacilitatorClasses() {
  const { data, isLoading } = useQuery({
    queryKey: ['facilitator-classes'],
    queryFn: async () => (await api.get('/facilitator/classes')).data.data,
  });
  const classes = data || [];
  const activeCount = classes.filter((item) => item.status === 'active').length;
  const totalParticipants = classes.reduce((total, item) => total + (item.participants_count || 0), 0);
  const pendingEvaluations = classes.reduce((total, item) => total + (item.pending_evaluations || 0), 0);

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Facilitator LMS</p>
        <h1>Assigned Classes</h1>
      </div>

      <div className="kpi-grid">
        {[
          ['Assigned Classes', classes.length, 'Kelas dalam scope fasilitator'],
          ['Active Classes', activeCount, 'Sedang berlangsung'],
          ['Participants', totalParticipants, 'Peserta terdaftar'],
          ['Pending Reviews', pendingEvaluations, 'Evaluasi belum selesai'],
        ].map(([label, value, note]) => (
          <KpiCard key={label} label={label} value={value} note={note} loading={isLoading} />
        ))}
      </div>

      {isLoading && <ClassCardSkeleton />}

      {!isLoading && classes.length === 0 && (
        <section className="enterprise-card">
          <div className="section-title">
            <h2>Belum ada kelas</h2>
            <span className="badge-active">OWNERSHIP SCOPED</span>
          </div>
          <div className="resource-note">Kelas akan muncul setelah admin menugaskan event pelatihan ke profil fasilitator Anda.</div>
        </section>
      )}

      <div className="class-grid">
        {classes.map((item) => (
          <section className="class-card" key={item.uuid}>
            <div className="class-card-head">
              <div>
                <p className="mono-kicker text-muted">Assigned Class</p>
                <h2>{item.title}</h2>
              </div>
              <span className={`status-badge ${item.status === 'active' ? 'active' : ''}`}>{item.status}</span>
            </div>

            <p className="class-description">{item.description || 'Kelas pelatihan yang ditugaskan kepada fasilitator.'}</p>

            <div className="class-meta-grid">
              <div><span>Schedule</span><strong>{item.start_date || '-'} - {item.end_date || '-'}</strong></div>
              <div><span>Quota</span><strong>{item.participants_count || 0}/{item.quota || 0}</strong></div>
              <div><span>Materials</span><strong>{item.materials_count || 0}</strong></div>
              <div><span>Assessments</span><strong>{item.assessments_count || 0}</strong></div>
            </div>

            <div className={`readiness-panel ${item.readiness?.status || 'needs_attention'}`}>
              <div className="readiness-head">
                <div>
                  <span>Class Readiness</span>
                  <strong>{item.readiness?.percent ?? 0}%</strong>
                </div>
                <em>{READINESS_LABELS[item.readiness?.status] || 'Needs Attention'}</em>
              </div>
              <div className="progress-track readiness-track"><span style={{ width: `${item.readiness?.percent ?? 0}%` }} /></div>
              <div className="readiness-checks">
                {(item.readiness?.checks || []).map((check) => (
                  <span key={check.key} className={check.done ? 'done' : ''}>{check.label}</span>
                ))}
              </div>
              {item.readiness?.needs?.length > 0 && (
                <div className="readiness-needs">
                  <span>Needs</span>
                  <strong>{item.readiness.needs.slice(0, 3).join(', ')}</strong>
                </div>
              )}
            </div>

            <div className="class-progress">
              <div>
                <span>Learning Progress</span>
                <strong>{item.progress_percent || 0}%</strong>
              </div>
              <div className="progress-track"><span style={{ width: `${item.progress_percent || 0}%` }} /></div>
            </div>

            <div className="class-progress">
              <div>
                <span>Attendance</span>
                <strong>{item.attendance_percent || 0}%</strong>
              </div>
              <div className="progress-track"><span style={{ width: `${item.attendance_percent || 0}%` }} /></div>
            </div>

            <div className="class-actions">
              <Link className="outline-button compact" to={`/facilitator/materials?class=${item.uuid}`}>Materials</Link>
              <Link className="outline-button compact" to={`/facilitator/participants?class=${item.uuid}`}>Participants</Link>
              <Link className="outline-button compact" to={`/facilitator/assessments?class=${item.uuid}`}>Assessments</Link>
              <Link className="primary-button compact" to={`/training-events/${item.uuid}`}>Open Class</Link>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
