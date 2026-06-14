import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  ChevronRight,
  Clock,
  GraduationCap,
  Layers,
  Lock,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../api.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const STEP_TYPES = {
  module:         { label: 'Module',         color: 'var(--grape)' },
  training_event: { label: 'Training Event', color: 'var(--sky)'   },
  material:       { label: 'Material',       color: 'var(--emerald)' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function ProgressBar({ pct, completed }) {
  return (
    <div className="lp-progress-bar">
      <div
        className="lp-progress-fill"
        style={{ width: `${pct}%`, background: completed ? 'var(--emerald)' : 'var(--grape)' }}
      />
      <span className="lp-progress-label">{completed ? 'Completed!' : `${pct}%`}</span>
    </div>
  );
}

// ── Path Cards Grid ────────────────────────────────────────────────────────────

function BrowseGrid({ onSelect }) {
  const { data: paths, isLoading } = useQuery({
    queryKey: ['my-learning-paths'],
    queryFn: async () => (await api.get('/learning-paths')).data.data,
  });

  if (isLoading) {
    return (
      <div className="lp-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="enterprise-card lp-card" style={{ opacity: Math.max(0.3, 1 - i * 0.12) }}>
            <div className="lp-card-body">
              <Skel w="50%" h={12} />
              <Skel w="75%" h={15} />
              <Skel w="90%" h={10} />
              <Skel w="60%" h={10} />
              <div style={{ marginTop: 10 }}><Skel w="100%" h={6} style={{ borderRadius: 3 }} /></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!paths?.length) {
    return (
      <div className="resource-note" style={{ textAlign: 'center', padding: '64px 0' }}>
        <BookMarked size={36} style={{ margin: '0 auto 12px', display: 'block', color: 'var(--fg-3)' }} />
        <p style={{ fontWeight: 600, marginBottom: 4 }}>No learning paths available yet.</p>
        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Check back later for new curricula.</p>
      </div>
    );
  }

  return (
    <div className="lp-grid">
      {paths.map((p) => (
        <button key={p.uuid} className="enterprise-card lp-card lp-card--clickable" onClick={() => onSelect(p.uuid)}>
          {p.thumbnail_url && (
            <div className="lp-card-thumb" style={{ backgroundImage: `url(${p.thumbnail_url})` }} />
          )}
          <div className="lp-card-body">
            <div style={{ display: 'flex', gap: 6, marginBottom: 6, flexWrap: 'wrap' }}>
              {p.completed && (
                <span className="lp-pill lp-pill--done"><CheckCircle2 size={10} /> Completed</span>
              )}
              {p.enrolled && !p.completed && (
                <span className="lp-pill lp-pill--enrolled">In Progress</span>
              )}
              {p.target_role && (
                <span className="lp-pill lp-pill--role">{p.target_role}</span>
              )}
            </div>
            <h3 className="lp-card-title">{p.title}</h3>
            {p.description && <p className="lp-card-desc">{p.description}</p>}
            <div className="lp-card-meta">
              <span><Layers size={11} /> {p.steps_count} steps</span>
              <span><Users size={11} /> {p.enrollments_count} enrolled</span>
              {p.estimated_hours > 0 && <span><Clock size={11} /> {p.estimated_hours}h</span>}
            </div>
            {p.enrolled && (
              <ProgressBar pct={p.progress} completed={p.completed} />
            )}
          </div>
          <div className="lp-card-arrow">
            <ChevronRight size={16} />
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Path Detail View ───────────────────────────────────────────────────────────

function PathDetail({ uuid, onBack }) {
  const qc = useQueryClient();

  const { data: path, isLoading } = useQuery({
    queryKey: ['my-lp-detail', uuid],
    queryFn: async () => (await api.get(`/learning-paths/${uuid}`)).data.data,
  });

  const enrollMut = useMutation({
    mutationFn: () => api.post(`/learning-paths/${uuid}/enroll`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-lp-detail', uuid] });
      qc.invalidateQueries({ queryKey: ['my-learning-paths'] });
      toast.success('Enrolled! Start with the first step.');
    },
    onError: () => toast.error('Failed to enroll.'),
  });

  const completeMut = useMutation({
    mutationFn: (stepUuid) => api.post(`/learning-paths/${uuid}/steps/${stepUuid}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-lp-detail', uuid] });
      qc.invalidateQueries({ queryKey: ['my-learning-paths'] });
      toast.success('Step completed!');
    },
    onError: () => toast.error('Failed to mark step.'),
  });

  if (isLoading) {
    return (
      <div className="page-stack">
        <button className="outline-button compact" style={{ alignSelf: 'flex-start' }} onClick={onBack}>
          <ArrowLeft size={13} /> Back
        </button>
        <div className="enterprise-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Skel w="60%" h={24} />
          <Skel w="85%" h={13} />
          <Skel w="50%" h={13} />
          <Skel w="100%" h={8} style={{ borderRadius: 4, marginTop: 8 }} />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="enterprise-card lp-step-item" style={{ opacity: Math.max(0.2, 1 - i * 0.18) }}>
            <Skel w={28} h={28} style={{ borderRadius: '50%', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Skel w="55%" h={14} />
              <Skel w="75%" h={11} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!path) {
    return (
      <div className="resource-note" style={{ textAlign: 'center', padding: 48 }}>
        Path not found.
        <button className="outline-button compact" style={{ marginLeft: 12 }} onClick={onBack}>
          <ArrowLeft size={13} /> Back
        </button>
      </div>
    );
  }

  const totalSteps    = path.steps?.length ?? 0;
  const doneCount     = path.steps?.filter((s) => s.completed).length ?? 0;
  const requiredCount = path.steps?.filter((s) => s.is_required).length ?? 0;

  return (
    <div className="page-stack">
      {/* Back */}
      <button className="outline-button compact" style={{ alignSelf: 'flex-start' }} onClick={onBack}>
        <ArrowLeft size={13} /> All Learning Paths
      </button>

      {/* Header card */}
      <div className="enterprise-card lp-detail-header">
        {path.thumbnail_url && (
          <div className="lp-detail-thumb" style={{ backgroundImage: `url(${path.thumbnail_url})` }} />
        )}
        <div className="lp-detail-info">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {path.completed && <span className="lp-pill lp-pill--done"><CheckCircle2 size={10} /> Completed</span>}
            {path.enrolled && !path.completed && <span className="lp-pill lp-pill--enrolled">In Progress</span>}
            {path.target_role && <span className="lp-pill lp-pill--role">{path.target_role}</span>}
            {path.is_sequential && <span className="lp-pill lp-pill--seq"><ChevronRight size={10} /> Sequential</span>}
          </div>
          <h1 className="lp-detail-title">{path.title}</h1>
          {path.description && <p className="lp-detail-desc">{path.description}</p>}
          <div className="lp-card-meta" style={{ marginTop: 10 }}>
            <span><Layers size={12} /> {totalSteps} steps</span>
            <span><CheckCircle2 size={12} /> {requiredCount} required</span>
            {path.estimated_hours > 0 && <span><Clock size={12} /> {path.estimated_hours}h estimated</span>}
            {path.creator && <span><GraduationCap size={12} /> {path.creator.name}</span>}
          </div>

          {path.enrolled && (
            <div style={{ marginTop: 14 }}>
              <ProgressBar pct={path.progress} completed={path.completed} />
              <p style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                {doneCount} of {totalSteps} steps completed
              </p>
            </div>
          )}

          {!path.enrolled && (
            <button
              className="primary-button"
              style={{ marginTop: 16, alignSelf: 'flex-start' }}
              disabled={enrollMut.isPending}
              onClick={() => enrollMut.mutate()}
            >
              {enrollMut.isPending ? 'Enrolling…' : 'Enroll Now'}
            </button>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="section-title">
        <h2><Layers size={14} /> Curriculum Steps</h2>
      </div>

      <div className="lp-steps-list">
        {(path.steps ?? []).map((step, i) => {
          const typeMeta = STEP_TYPES[step.type] || { label: step.type, color: 'var(--fg-2)' };
          const canComplete = path.enrolled && !step.completed && step.available;

          return (
            <div
              key={step.uuid}
              className={`enterprise-card lp-step-item${step.completed ? ' lp-step-item--done' : ''}${!step.available && !step.completed ? ' lp-step-item--locked' : ''}`}
            >
              {/* Step number / status icon */}
              <div className="lp-step-status-icon">
                {step.completed
                  ? <CheckCircle2 size={18} style={{ color: 'var(--emerald)' }} />
                  : !step.available
                    ? <Lock size={16} style={{ color: 'var(--fg-3)' }} />
                    : <span className="lp-step-num-badge">{i + 1}</span>}
              </div>

              {/* Content */}
              <div className="lp-step-content">
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                  <span className="lp-step-type-tag" style={{ color: typeMeta.color }}>{typeMeta.label}</span>
                  {!step.is_required && <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>Optional</span>}
                  {step.estimated_minutes > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>
                      <Clock size={9} style={{ verticalAlign: 'middle' }} /> {step.estimated_minutes} min
                    </span>
                  )}
                </div>
                <p className="lp-step-title">{step.title}</p>
                {step.description && <p className="lp-step-desc">{step.description}</p>}
              </div>

              {/* Action */}
              <div className="lp-step-action">
                {step.completed && (
                  <span style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 600 }}>Done</span>
                )}
                {canComplete && (
                  <button
                    className="primary-button compact"
                    style={{ fontSize: 11 }}
                    disabled={completeMut.isPending}
                    onClick={() => completeMut.mutate(step.uuid)}
                  >
                    <CheckCircle2 size={11} /> Complete
                  </button>
                )}
                {!path.enrolled && (
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>Enroll to start</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function LearningPaths() {
  const [selected, setSelected] = useState(null);

  return selected
    ? <PathDetail uuid={selected} onBack={() => setSelected(null)} />
    : (
      <div className="page-stack">
        <div className="page-head">
          <p className="mono-kicker text-muted">Learning</p>
          <h1>Learning Paths</h1>
          <p style={{ color: 'var(--fg-2)', fontSize: 14, marginTop: 4 }}>
            Structured curricula to guide your professional development.
          </p>
        </div>
        <BrowseGrid onSelect={setSelected} />
      </div>
    );
}
