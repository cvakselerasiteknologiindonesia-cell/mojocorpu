import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { BarChart2, ChevronRight, Download, FileText } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

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

function ReportPanelSkeleton() {
  return (
    <>
      <div className="fm-panel-head">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkeletonLine w="55%" h={16} />
          <SkeletonLine w="35%" h={11} />
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
          <SkeletonLine w={62} h={22} />
          <SkeletonLine w={122} h={32} />
        </div>
      </div>

      <div className="cp-skel-stats" style={{ marginBottom: 20 }}>
        {[48, 36, 36, 36].map((w, i) => (
          <div key={i} className="cp-skel-stat">
            <SkeletonLine w={w} h={22} />
            <SkeletonLine w={44} h={10} />
          </div>
        ))}
      </div>

      <div className="enterprise-card" style={{ padding: '16px 20px', display: 'grid', gap: 18 }}>
        {[1, 2].map((i) => (
          <div key={i} style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <SkeletonLine w="38%" h={11} />
              <SkeletonLine w={28} h={11} />
            </div>
            <SkeletonLine w="100%" h={3} />
          </div>
        ))}
      </div>

      <div className="enterprise-card" style={{ padding: '16px 20px', marginTop: 12 }}>
        <SkeletonLine w={82} h={10} />
        <div className="class-meta-grid" style={{ marginTop: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <SkeletonLine w="55%" h={10} />
              <SkeletonLine w="40%" h={13} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  const s = d.length > 10 ? d.substring(0, 10) : d;
  return new Date(`${s}T00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatBar({ label, value, max = 100, color }) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="class-progress">
      <div>
        <span>{label}</span>
        <strong style={{ color }}>{pct}%</strong>
      </div>
      <div className="progress-track">
        <span style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function ReportPanel({ cls, onExport, isExporting }) {
  return (
    <>
      <div className="fm-panel-head">
        <div>
          <strong className="fm-panel-title">{cls.title}</strong>
          <span className="fm-panel-sub">
            {formatDate(cls.start_date)}
            {cls.end_date && cls.end_date !== cls.start_date && ` – ${formatDate(cls.end_date)}`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <em className={`status-badge${cls.status === 'active' ? ' active' : ''}`}>{cls.status ?? '—'}</em>
          <button
            className="primary-button compact"
            onClick={onExport}
            disabled={isExporting}
          >
            <Download size={14} />
            {isExporting ? 'Mengekspor…' : 'Export Report'}
          </button>
        </div>
      </div>

      {/* KPI stats */}
      <div className="cp-stats" style={{ marginBottom: 20 }}>
        {[
          { val: cls.participants_count ?? 0, lbl: 'Peserta', cls: '' },
          { val: cls.materials_count ?? 0, lbl: 'Materi', cls: '' },
          { val: cls.pending_evaluations ?? 0, lbl: 'Pending Evaluasi', cls: 'cp-stat--pending' },
          { val: cls.average_score ?? 0, lbl: 'Rata-rata Nilai', cls: 'cp-stat--approved' },
        ].map(({ val, lbl, cls: statCls }) => (
          <div key={lbl} className={`cp-stat ${statCls}`}>
            <span className="cp-stat-val">{val}</span>
            <span className="cp-stat-lbl">{lbl}</span>
          </div>
        ))}
      </div>

      {/* Progress bars */}
      <div className="enterprise-card" style={{ padding: '16px 20px', display: 'grid', gap: 12 }}>
        <StatBar label="Learning Progress" value={cls.progress_percent ?? 0} color="var(--accent)" />
        <StatBar label="Attendance Rate" value={cls.attendance_percent ?? 0} color="#16a34a" />
      </div>

      {/* Class meta */}
      <div className="enterprise-card" style={{ padding: '16px 20px', marginTop: 12 }}>
        <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--fg-3)', textTransform: 'uppercase', margin: '0 0 12px' }}>Detail Kelas</p>
        <div className="class-meta-grid">
          <div><span>Kuota</span><strong>{cls.quota ?? '—'}</strong></div>
          <div><span>Peserta Aktual</span><strong>{cls.participants_count ?? 0}</strong></div>
          <div><span>Materi Tersedia</span><strong>{cls.materials_count ?? 0}</strong></div>
          <div><span>Evaluasi Tertunda</span><strong>{cls.pending_evaluations ?? 0}</strong></div>
          <div><span>Mulai</span><strong>{formatDate(cls.start_date)}</strong></div>
          <div><span>Selesai</span><strong>{formatDate(cls.end_date)}</strong></div>
        </div>
      </div>

      {/* Assessment breakdown */}
      {cls.assessment_breakdown && (
        <div className="enterprise-card" style={{ padding: '16px 20px', marginTop: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--fg-3)', textTransform: 'uppercase', margin: '0 0 12px' }}>Asesmen</p>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Asesmen',  val: cls.assessment_breakdown.total },
              { label: 'Pre-Test',       val: cls.assessment_breakdown.pre_tests },
              { label: 'Post-Test',      val: cls.assessment_breakdown.post_tests },
              { label: 'Dipublikasikan', val: cls.assessment_breakdown.published },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
                <strong style={{ fontSize: 20, fontWeight: 700, color: 'var(--fg)' }}>{val}</strong>
                <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {cls.description && (
        <div className="enterprise-card" style={{ padding: '16px 20px', marginTop: 12 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'var(--fg-3)', textTransform: 'uppercase', margin: '0 0 8px' }}>Deskripsi</p>
          <p style={{ fontSize: 13, color: 'var(--fg-2)', lineHeight: 1.6, margin: 0 }}>{cls.description}</p>
        </div>
      )}
    </>
  );
}

export default function FacilitatorReports() {
  const [selectedUuid, setSelectedUuid] = useState(null);

  const { data: classes = [], isLoading } = useQuery({
    queryKey: ['facilitator-classes'],
    queryFn: async () => (await api.get('/facilitator/classes')).data.data,
  });

  const exportMut = useMutation({
    mutationFn: async (uuid) => {
      const cls = classes.find((c) => c.uuid === uuid);
      const res = await api.get(`/facilitator/classes/${uuid}/reports`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `laporan-${cls?.title?.replace(/\s+/g, '-').toLowerCase() ?? uuid}-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    },
    onSuccess: () => toast.success('Report berhasil diunduh.'),
    onError: () => toast.error('Gagal mengekspor report.'),
  });

  const selectedClass = classes.find((c) => c.uuid === selectedUuid);

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Facilitator</p>
        <h1>Class Reports</h1>
      </div>

      <div className="fm-layout">
        {/* Class list */}
        <aside className="fm-events-list">
          <div className="fm-events-header">Assigned Classes</div>
          {isLoading && <EventListSkeleton />}
          {!isLoading && classes.length === 0 && (
            <div className="resource-note">Tidak ada kelas yang ditemukan.</div>
          )}
          {classes.map((cls) => (
            <button
              key={cls.uuid}
              className={`fm-event-item${selectedUuid === cls.uuid ? ' active' : ''}`}
              onClick={() => setSelectedUuid(cls.uuid)}
            >
              <div className="fm-event-item-body">
                <strong>{cls.title}</strong>
                <span>{formatDate(cls.start_date)}</span>
              </div>
              <ChevronRight size={14} className="fm-event-chevron" />
            </button>
          ))}
        </aside>

        {/* Report panel */}
        <div className="fm-materials-panel">
          {!selectedUuid && (
            <div className="fm-no-event">
              <BarChart2 size={36} />
              <p>Pilih kelas untuk melihat laporan dan statistik.</p>
            </div>
          )}

          {selectedUuid && isLoading && <ReportPanelSkeleton />}

          {selectedUuid && !isLoading && !selectedClass && (
            <div className="fm-no-event">
              <FileText size={36} />
              <p>Kelas tidak ditemukan.</p>
            </div>
          )}

          {selectedClass && (
            <ReportPanel
              cls={selectedClass}
              onExport={() => exportMut.mutate(selectedUuid)}
              isExporting={exportMut.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}
