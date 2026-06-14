import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  BookMarked,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  EyeOff,
  Globe,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const STEP_TYPES = {
  module:         { label: 'Module',         color: 'var(--grape)' },
  training_event: { label: 'Training Event', color: 'var(--sky)'   },
  material:       { label: 'Material',       color: 'var(--emerald)' },
};

const ROLES = ['', 'asn', 'fasilitator-internal', 'fasilitator-eksternal', 'admin-opd'];

const EMPTY_STEP = { title: '', description: '', type: 'module', reference_id: '', is_required: true, estimated_minutes: 60 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function StatusBadge({ status }) {
  return (
    <span className={`lp-status-badge lp-status-badge--${status}`}>
      {status === 'published' ? 'Published' : 'Draft'}
    </span>
  );
}

// ── Step Builder ───────────────────────────────────────────────────────────────

function StepsEditor({ steps, onChange }) {
  const update = (i, field, value) => {
    const next = [...steps];
    next[i] = { ...next[i], [field]: value };
    onChange(next);
  };

  const move = (i, dir) => {
    const next = [...steps];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  const remove = (i) => onChange(steps.filter((_, idx) => idx !== i));

  const add = () => onChange([...steps, { ...EMPTY_STEP }]);

  return (
    <div className="lp-step-builder">
      {steps.length === 0 && (
        <div className="resource-note" style={{ textAlign: 'center', padding: '28px 0' }}>
          <BookMarked size={22} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--fg-3)' }} />
          No steps yet. Add your first step below.
        </div>
      )}

      {steps.map((step, i) => (
        <div key={i} className="lp-step-row">
          <div className="lp-step-num">{i + 1}</div>

          <div className="lp-step-fields">
            <div className="lp-step-row-top">
              <input
                className="lp-step-title-input"
                placeholder="Step title…"
                value={step.title}
                onChange={(e) => update(i, 'title', e.target.value)}
              />
              <select
                className="sec-filter-select"
                value={step.type}
                onChange={(e) => update(i, 'type', e.target.value)}
                style={{ flexShrink: 0, width: 140 }}
              >
                {Object.entries(STEP_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <input
                type="number"
                className="sec-filter-select"
                placeholder="Min"
                min={1}
                value={step.estimated_minutes}
                onChange={(e) => update(i, 'estimated_minutes', Number(e.target.value))}
                style={{ width: 72, flexShrink: 0 }}
              />
              <label className="sec-filter-check" style={{ flexShrink: 0 }}>
                <input
                  type="checkbox"
                  checked={step.is_required}
                  onChange={(e) => update(i, 'is_required', e.target.checked)}
                />
                Required
              </label>
            </div>
            <textarea
              className="lp-step-desc-input"
              placeholder="Description (optional)…"
              rows={2}
              value={step.description}
              onChange={(e) => update(i, 'description', e.target.value)}
            />
            {step.type !== 'module' && (
              <input
                className="lp-step-title-input"
                placeholder="Reference ID (UUID of the linked item)…"
                value={step.reference_id}
                onChange={(e) => update(i, 'reference_id', e.target.value)}
              />
            )}
          </div>

          <div className="lp-step-controls">
            <button type="button" className="icon-action" title="Move up"    onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={13} /></button>
            <button type="button" className="icon-action" title="Move down"  onClick={() => move(i, 1)}  disabled={i === steps.length - 1}><ArrowDown size={13} /></button>
            <button type="button" className="icon-action" title="Delete step" onClick={() => remove(i)} style={{ color: 'var(--crimson)' }}><Trash2 size={13} /></button>
          </div>
        </div>
      ))}

      <button type="button" className="outline-button compact" onClick={add} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
        <Plus size={13} /> Add Step
      </button>
    </div>
  );
}

// ── Path Modal (Create / Edit) ─────────────────────────────────────────────────

function PathModal({ path, onClose, onSaved }) {
  const qc = useQueryClient();
  const isNew = !path?.uuid;

  const [tab, setTab] = useState('info');
  const [info, setInfo] = useState({
    title:           path?.title           ?? '',
    description:     path?.description     ?? '',
    thumbnail_url:   path?.thumbnail_url   ?? '',
    status:          path?.status          ?? 'draft',
    target_role:     path?.target_role     ?? '',
    estimated_hours: path?.estimated_hours ?? 0,
    is_sequential:   path?.is_sequential   ?? true,
  });
  const [steps, setSteps] = useState(path?.steps ?? []);
  const [savedUuid, setSavedUuid] = useState(path?.uuid ?? null);

  const infoMut = useMutation({
    mutationFn: (body) => isNew && !savedUuid
      ? api.post('/admin/learning-paths', body)
      : api.put(`/admin/learning-paths/${savedUuid}`, body),
    onSuccess: (res) => {
      const saved = res.data.data;
      setSavedUuid(saved.uuid);
      qc.invalidateQueries({ queryKey: ['admin-lp-list'] });
      toast.success(isNew ? 'Learning path created!' : 'Path info saved.');
      if (isNew && !savedUuid) setTab('steps');
      onSaved?.(saved);
    },
    onError: () => toast.error('Failed to save path info.'),
  });

  const stepsMut = useMutation({
    mutationFn: (s) => api.put(`/admin/learning-paths/${savedUuid}/steps`, { steps: s }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-lp-list'] }); toast.success('Steps saved.'); },
    onError: () => toast.error('Failed to save steps.'),
  });

  const handleInfoSubmit = (e) => {
    e.preventDefault();
    if (!info.title.trim()) return toast.error('Title is required.');
    infoMut.mutate(info);
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 720, width: '95vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Head */}
        <div className="modal-head" style={{ flexShrink: 0 }}>
          <h2>{isNew ? 'New Learning Path' : 'Edit Learning Path'}</h2>
          <button className="icon-action" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Tabs */}
        <div className="ev-tab-bar" style={{ flexShrink: 0, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
          <button className={`ev-tab${tab === 'info' ? ' active' : ''}`} onClick={() => setTab('info')}>Info</button>
          <button
            className={`ev-tab${tab === 'steps' ? ' active' : ''}`}
            onClick={() => setTab('steps')}
            disabled={!savedUuid && isNew}
            title={!savedUuid && isNew ? 'Save info first' : ''}
          >
            Steps {steps.length > 0 && `(${steps.length})`}
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px' }}>
          {tab === 'info' && (
            <form id="lp-info-form" style={{ display: 'grid', gap: 14 }} onSubmit={handleInfoSubmit}>
              <div className="event-field">
                <span>Title *</span>
                <input autoFocus required placeholder="e.g. Onboarding Curriculum for ASN" value={info.title} onChange={(e) => setInfo((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="event-field">
                <span>Description</span>
                <textarea rows={3} placeholder="What will participants learn?" value={info.description} onChange={(e) => setInfo((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="event-field">
                  <span>Status</span>
                  <select value={info.status} onChange={(e) => setInfo((f) => ({ ...f, status: e.target.value }))}>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
                <div className="event-field">
                  <span>Target Role (blank = all)</span>
                  <select value={info.target_role} onChange={(e) => setInfo((f) => ({ ...f, target_role: e.target.value }))}>
                    <option value="">All Roles</option>
                    {ROLES.filter(Boolean).map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="event-field">
                  <span>Estimated Hours</span>
                  <input type="number" min={0} value={info.estimated_hours} onChange={(e) => setInfo((f) => ({ ...f, estimated_hours: Number(e.target.value) }))} />
                </div>
                <div className="event-field" style={{ justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <label className="sec-filter-check" style={{ marginTop: 20 }}>
                    <input type="checkbox" checked={info.is_sequential} onChange={(e) => setInfo((f) => ({ ...f, is_sequential: e.target.checked }))} />
                    Sequential (unlock steps in order)
                  </label>
                </div>
              </div>
              <div className="event-field">
                <span>Thumbnail URL (optional)</span>
                <input type="url" placeholder="https://…" value={info.thumbnail_url} onChange={(e) => setInfo((f) => ({ ...f, thumbnail_url: e.target.value }))} />
              </div>
            </form>
          )}

          {tab === 'steps' && (
            <StepsEditor steps={steps} onChange={setSteps} />
          )}
        </div>

        {/* Footer */}
        <div className="modal-foot" style={{ flexShrink: 0, borderTop: '1px solid var(--border)' }}>
          <button type="button" className="outline-button compact" onClick={onClose}>Cancel</button>
          {tab === 'info' && (
            <button type="submit" form="lp-info-form" className="primary-button compact" disabled={infoMut.isPending}>
              {infoMut.isPending ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
              {isNew && !savedUuid ? 'Save & Continue' : 'Save Info'}
            </button>
          )}
          {tab === 'steps' && (
            <button
              type="button"
              className="primary-button compact"
              disabled={stepsMut.isPending || !savedUuid}
              onClick={() => stepsMut.mutate(steps)}
            >
              {stepsMut.isPending ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
              Save Steps
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminLearningPaths() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [editLoading, setEditLoading] = useState(null); // uuid of path being fetched

  const { data, isLoading } = useQuery({
    queryKey: ['admin-lp-list', statusFilter, search, page],
    queryFn: async () => (await api.get('/admin/learning-paths', {
      params: { status: statusFilter || undefined, search: search || undefined, page, per_page: 12 },
    })).data.data,
  });

  const editPath = async (path) => {
    setEditLoading(path.uuid);
    try {
      const res = await api.get(`/admin/learning-paths/${path.uuid}`);
      setModal(res.data.data);
    } catch {
      toast.error('Failed to load path details.');
    } finally {
      setEditLoading(null);
    }
  };

  const toggleMut = useMutation({
    mutationFn: ({ uuid, status }) => api.put(`/admin/learning-paths/${uuid}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-lp-list'] }); },
    onError: () => toast.error('Failed to update status.'),
  });

  const duplicateMut = useMutation({
    mutationFn: (uuid) => api.post(`/admin/learning-paths/${uuid}/duplicate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-lp-list'] }); toast.success('Path duplicated as draft.'); },
    onError: () => toast.error('Failed to duplicate.'),
  });

  const deleteMut = useMutation({
    mutationFn: (uuid) => api.delete(`/admin/learning-paths/${uuid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-lp-list'] }); toast.success('Deleted.'); },
    onError: () => toast.error('Failed to delete.'),
  });

  const paths      = data?.data ?? [];
  const published  = paths.filter((p) => p.status === 'published').length;
  const draft      = paths.filter((p) => p.status === 'draft').length;
  const totalEnrol = paths.reduce((s, p) => s + (p.enrollments_count ?? 0), 0);

  return (
    <div className="page-stack">
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="mono-kicker text-muted">Learning</p>
          <h1>Curriculum Builder</h1>
        </div>
        <button className="primary-button" onClick={() => setModal({})}>
          <Plus size={14} /> New Learning Path
        </button>
      </div>

      {/* Stats bar */}
      {!isLoading && paths.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            { label: 'Total Paths',  val: data?.total ?? paths.length,  color: 'var(--fg)'      },
            { label: 'Published',    val: published,                     color: 'var(--emerald)' },
            { label: 'Draft',        val: draft,                         color: 'var(--fg-3)'    },
            { label: 'Enrollments',  val: totalEnrol,                    color: 'var(--grape)'   },
          ].map(({ label, val, color }) => (
            <div key={label} className="enterprise-card" style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 110 }}>
              <strong style={{ fontSize: 22, fontWeight: 700, color }}>{val}</strong>
              <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          className="sec-filter-select"
          placeholder="Search paths…"
          value={search}
          style={{ width: 220 }}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="sec-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      {/* Grid */}
      <div className="lp-grid">
        {isLoading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="enterprise-card lp-card" style={{ opacity: Math.max(0.3, 1 - i * 0.1) }}>
            <div className="lp-card-body" style={{ gap: 10 }}>
              <div style={{ display: 'flex', gap: 6 }}><Skel w={60} h={18} /><Skel w={44} h={18} /></div>
              <Skel w="80%" h={15} />
              <Skel w="95%" h={11} />
              <Skel w="70%" h={11} />
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <Skel w={55} h={10} /><Skel w={65} h={10} /><Skel w={40} h={10} />
              </div>
            </div>
            <div className="lp-card-actions">
              <Skel w={58} h={28} /><Skel w={58} h={28} />
            </div>
          </div>
        ))}

        {!isLoading && paths.length === 0 && (
          <div className="resource-note" style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0' }}>
            <BookMarked size={32} style={{ margin: '0 auto 10px', display: 'block', color: 'var(--fg-3)' }} />
            No learning paths found. Create your first curriculum.
          </div>
        )}

        {paths.map((p) => (
          <div key={p.uuid} className="enterprise-card lp-card">
            {p.thumbnail_url && (
              <div className="lp-card-thumb" style={{ backgroundImage: `url(${p.thumbnail_url})` }} />
            )}
            <div className="lp-card-body">
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
                <StatusBadge status={p.status} />
                {p.target_role && (
                  <span style={{ fontSize: 10, color: 'var(--fg-3)', border: '1px solid var(--border)', borderRadius: 3, padding: '1px 5px' }}>
                    {p.target_role}
                  </span>
                )}
              </div>
              <h3 className="lp-card-title">{p.title}</h3>
              {p.description && <p className="lp-card-desc">{p.description}</p>}
              <div className="lp-card-meta">
                <span><BookMarked size={11} /> {p.steps_count} steps</span>
                <span><Users size={11} /> {p.enrollments_count} enrolled</span>
                {p.estimated_hours > 0 && <span><Clock size={11} /> {p.estimated_hours}h</span>}
                {p.is_sequential && <span style={{ color: 'var(--grape)' }}><ChevronRight size={11} /> Sequential</span>}
              </div>
            </div>
            <div className="lp-card-actions" style={{ flexWrap: 'wrap' }}>
              {/* Publish / Unpublish toggle */}
              <button
                className="outline-button compact"
                style={{ fontSize: 11 }}
                disabled={toggleMut.isPending}
                title={p.status === 'published' ? 'Unpublish' : 'Publish'}
                onClick={() => toggleMut.mutate({ uuid: p.uuid, status: p.status === 'published' ? 'draft' : 'published' })}
              >
                {p.status === 'published'
                  ? <><EyeOff size={11} /> Unpublish</>
                  : <><Globe size={11} /> Publish</>}
              </button>

              {/* Edit */}
              <button
                className="outline-button compact"
                style={{ fontSize: 11 }}
                disabled={editLoading === p.uuid}
                onClick={() => editPath(p)}
              >
                {editLoading === p.uuid ? <Loader2 size={11} className="spin" /> : <Pencil size={11} />} Edit
              </button>

              {/* Duplicate */}
              <button
                className="outline-button compact"
                style={{ fontSize: 11 }}
                disabled={duplicateMut.isPending}
                title="Duplicate as draft"
                onClick={() => duplicateMut.mutate(p.uuid)}
              >
                <Copy size={11} /> Duplicate
              </button>

              {/* Delete */}
              <button
                className="outline-button compact"
                style={{ fontSize: 11, color: 'var(--crimson)', borderColor: 'var(--crimson)' }}
                disabled={deleteMut.isPending}
                onClick={() => { if (confirm(`Delete "${p.title}"?`)) deleteMut.mutate(p.uuid); }}
              >
                <Trash2 size={11} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {(data?.last_page ?? 1) > 1 && (
        <div className="picker-pagination">
          <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
          <span>{page} / {data.last_page} · {data.total} paths</span>
          <button className="outline-button compact" disabled={page >= data.last_page} onClick={() => setPage((p) => p + 1)}>Next ›</button>
        </div>
      )}

      {modal !== null && (
        <PathModal
          path={modal}
          onClose={() => setModal(null)}
          onSaved={() => {}}
        />
      )}
    </div>
  );
}
