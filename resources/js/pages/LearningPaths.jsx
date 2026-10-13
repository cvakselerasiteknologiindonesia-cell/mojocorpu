import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Award,
  BookMarked,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  GraduationCap,
  Layers,
  Lock,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../api.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const STEP_TYPES = {
  module:         { label: 'Modul',              color: 'var(--grape)' },
  training_event: { label: 'Kegiatan Pelatihan', color: 'var(--sky)'   },
  material:       { label: 'Materi',             color: 'var(--emerald)' },
  quiz:           { label: 'Kuis',               color: 'var(--gold)' },
};

const EXTERNAL_STEP_TYPES = ['training_event', 'material', 'quiz'];

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
      <span className="lp-progress-label">{completed ? 'Selesai!' : `${pct}%`}</span>
    </div>
  );
}

function externalProgressLabel(type) {
  return {
    training_event: 'event',
    material: 'materi',
    quiz: 'kuis',
  }[type] ?? 'modul terkait';
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
        <p style={{ fontWeight: 600, marginBottom: 4 }}>Belum ada alur belajar.</p>
        <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Silakan cek kembali saat kurikulum baru tersedia.</p>
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
                <span className="lp-pill lp-pill--done"><CheckCircle2 size={10} /> Selesai</span>
              )}
              {p.certificate && (
                <span className="lp-pill lp-pill--role"><Award size={10} /> Sertifikat</span>
              )}
              {p.enrolled && !p.completed && (
                <span className="lp-pill lp-pill--enrolled">Sedang Berjalan</span>
              )}
              {p.target_role && (
                <span className="lp-pill lp-pill--role">{p.target_role}</span>
              )}
            </div>
            <h3 className="lp-card-title">{p.title}</h3>
            {p.description && <p className="lp-card-desc">{p.description}</p>}
            <div className="lp-card-meta">
              <span><Layers size={11} /> {p.steps_count} langkah</span>
              <span><Users size={11} /> {p.enrollments_count} peserta</span>
              {p.estimated_hours > 0 && <span><Clock size={11} /> {p.estimated_hours} jam</span>}
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
      toast.success('Berhasil bergabung. Mulai dari langkah pertama.');
    },
    onError: () => toast.error('Gagal bergabung ke alur belajar.'),
  });

  const completeMut = useMutation({
    mutationFn: (stepUuid) => api.post(`/learning-paths/${uuid}/steps/${stepUuid}/complete`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-lp-detail', uuid] });
      qc.invalidateQueries({ queryKey: ['my-learning-paths'] });
      toast.success('Langkah selesai.');
    },
    onError: () => toast.error('Gagal menandai langkah.'),
  });

  const openMaterial = async (step) => {
    const popup = window.open('about:blank', '_blank');
    if (popup) popup.opener = null;

    try {
      const res = await api.post(step.reference.track_url || `/lms/${step.reference.id}/track-open`);
      const url = res.data?.data?.url || step.reference.action_url;

      if (url) {
        if (popup) {
          popup.location.href = url;
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
      } else if (popup) {
        popup.close();
      }

      qc.invalidateQueries({ queryKey: ['my-lp-detail', uuid] });
      qc.invalidateQueries({ queryKey: ['my-learning-paths'] });
      toast.success('Materi dibuka dan progres dicatat.');
    } catch (error) {
      if (popup) popup.close();
      toast.error('Gagal membuka materi.');
    }
  };

  if (isLoading) {
    return (
      <div className="page-stack">
        <button className="outline-button compact" style={{ alignSelf: 'flex-start' }} onClick={onBack}>
          <ArrowLeft size={13} /> Kembali
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
        Alur belajar tidak ditemukan.
        <button className="outline-button compact" style={{ marginLeft: 12 }} onClick={onBack}>
          <ArrowLeft size={13} /> Kembali
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
        <ArrowLeft size={13} /> Semua Alur Belajar
      </button>

      {/* Header card */}
      <div className="enterprise-card lp-detail-header">
        {path.thumbnail_url && (
          <div className="lp-detail-thumb" style={{ backgroundImage: `url(${path.thumbnail_url})` }} />
        )}
        <div className="lp-detail-info">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
            {path.completed && <span className="lp-pill lp-pill--done"><CheckCircle2 size={10} /> Selesai</span>}
            {path.enrolled && !path.completed && <span className="lp-pill lp-pill--enrolled">Sedang Berjalan</span>}
            {path.target_role && <span className="lp-pill lp-pill--role">{path.target_role}</span>}
            {path.is_sequential && <span className="lp-pill lp-pill--seq"><ChevronRight size={10} /> Berurutan</span>}
          </div>
          <h1 className="lp-detail-title">{path.title}</h1>
          {path.description && <p className="lp-detail-desc">{path.description}</p>}
          <div className="lp-card-meta" style={{ marginTop: 10 }}>
            <span><Layers size={12} /> {totalSteps} langkah</span>
            <span><CheckCircle2 size={12} /> {requiredCount} wajib</span>
            {path.estimated_hours > 0 && <span><Clock size={12} /> estimasi {path.estimated_hours} jam</span>}
            {path.creator && <span><GraduationCap size={12} /> {path.creator.name}</span>}
          </div>

          {path.enrolled && (
            <div style={{ marginTop: 14 }}>
              <ProgressBar pct={path.progress} completed={path.completed} />
              <p style={{ fontSize: 11, color: 'var(--fg-3)', marginTop: 4 }}>
                {doneCount} dari {totalSteps} langkah selesai
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
              {enrollMut.isPending ? 'Bergabung…' : 'Gabung Sekarang'}
            </button>
          )}

          {path.completed && (
            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {path.certificate ? (
                <>
                  <NavLink className="primary-button compact" to="/certificates">
                    <Award size={13} /> Lihat Sertifikat
                  </NavLink>
                  {path.certificate.verification_token && (
                    <a
                      className="outline-button compact"
                      href={`/api/certificates/verify/${path.certificate.verification_token}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink size={13} /> Verifikasi
                    </a>
                  )}
                </>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                  Sertifikat akan muncul otomatis setelah sistem menyelesaikan penerbitan.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="section-title">
        <h2><Layers size={14} /> Langkah Kurikulum</h2>
      </div>

      <div className="lp-steps-list">
        {(path.steps ?? []).map((step, i) => {
          const typeMeta = STEP_TYPES[step.type] || { label: step.type, color: 'var(--fg-2)' };
          const waitsForExternalProgress = EXTERNAL_STEP_TYPES.includes(step.type);
          const canComplete = path.enrolled && !step.completed && step.available && !waitsForExternalProgress;
          const canOpenReference = path.enrolled && step.available && step.reference?.action_url;
          const referenceIsInternal = step.reference?.action_url?.startsWith('/');

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
                  {!step.is_required && <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>Opsional</span>}
                  {step.estimated_minutes > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>
                      <Clock size={9} style={{ verticalAlign: 'middle' }} /> {step.estimated_minutes} menit
                    </span>
                  )}
                </div>
                <p className="lp-step-title">{step.title}</p>
                {step.description && <p className="lp-step-desc">{step.description}</p>}
                {step.reference && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--fg-2)' }}>
                      {step.reference.title}
                    </span>
                    {step.reference.meta && (
                      <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{step.reference.meta}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action */}
              <div className="lp-step-action">
                {canOpenReference && (
                  step.type === 'material'
                    ? (
                      <button
                        type="button"
                        className="outline-button compact"
                        style={{ fontSize: 11 }}
                        onClick={() => openMaterial(step)}
                      >
                        <ExternalLink size={11} /> {step.reference.action_label ?? 'Buka materi'}
                      </button>
                    )
                    : (
                      <a
                        className="outline-button compact"
                        href={step.reference.action_url}
                        target={referenceIsInternal ? undefined : '_blank'}
                        rel={referenceIsInternal ? undefined : 'noreferrer'}
                        style={{ fontSize: 11 }}
                      >
                        <ExternalLink size={11} /> {step.reference.action_label ?? 'Buka'}
                      </a>
                    )
                )}
                {step.completed && (
                  <span style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 600 }}>Selesai</span>
                )}
                {canComplete && (
                  <button
                    className="primary-button compact"
                    style={{ fontSize: 11 }}
                    disabled={completeMut.isPending}
                    onClick={() => completeMut.mutate(step.uuid)}
                  >
                    <CheckCircle2 size={11} /> Selesai
                  </button>
                )}
                {path.enrolled && !step.completed && step.available && waitsForExternalProgress && (
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                    Selesai otomatis dari {externalProgressLabel(step.type)}
                  </span>
                )}
                {!path.enrolled && (
                  <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>Gabung untuk mulai</span>
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
          <p className="mono-kicker text-muted">Pembelajaran</p>
          <h1>Alur Belajar</h1>
          <p style={{ color: 'var(--fg-2)', fontSize: 14, marginTop: 4 }}>
            Kurikulum terarah untuk memandu pengembangan kompetensi Anda.
          </p>
        </div>
        <BrowseGrid onSelect={setSelected} />
      </div>
    );
}
