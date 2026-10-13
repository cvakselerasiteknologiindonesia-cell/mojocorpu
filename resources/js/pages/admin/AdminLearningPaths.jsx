import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  BookMarked,
  ChevronRight,
  Clock,
  Copy,
  EyeOff,
  Globe,
  Award,
  Loader2,
  MoreHorizontal,
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
  module:         { label: 'Modul',              color: 'var(--grape)' },
  training_event: { label: 'Kegiatan Pelatihan', color: 'var(--sky)'   },
  material:       { label: 'Materi',             color: 'var(--emerald)' },
  quiz:           { label: 'Kuis',               color: 'var(--gold)' },
};

const ROLES = ['', 'asn', 'fasilitator-internal', 'fasilitator-eksternal', 'admin-opd'];
const ROLE_LABELS = {
  '': 'Semua Peran',
  asn: 'ASN',
  'fasilitator-internal': 'Fasilitator Internal',
  'fasilitator-eksternal': 'Fasilitator Eksternal',
  'admin-opd': 'Admin OPD',
};
const STATUS_LABELS = {
  draft: 'Draf',
  published: 'Terbit',
};

const EMPTY_STEP = { title: '', description: '', type: 'module', reference_id: '', is_required: true, estimated_minutes: 60 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function StatusBadge({ status }) {
  return (
    <span className={`lp-status-badge lp-status-badge--${status}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function normalizeNumberText(value) {
  return String(value ?? '').replace(/[^\d]/g, '');
}

function formatRole(role) {
  return ROLE_LABELS[role ?? ''] ?? role;
}

function formatHours(hours) {
  return Number(hours) > 0 ? `${hours} jam` : 'Belum diisi';
}

function apiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  const errors = data?.errors;
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat().find(Boolean);
    if (first) return first;
  }
  return data?.message || fallback;
}

// ── Step Builder ───────────────────────────────────────────────────────────────

function StepsEditor({ steps, onChange }) {
  const { data: references = {} } = useQuery({
    queryKey: ['lp-reference-options'],
    queryFn: async () => {
      const [events, materials, quizzes] = await Promise.all([
        api.get('/admin/learning-paths/references', { params: { type: 'training_event' } }),
        api.get('/admin/learning-paths/references', { params: { type: 'material' } }),
        api.get('/admin/learning-paths/references', { params: { type: 'quiz' } }),
      ]);

      return {
        training_event: events.data.data ?? [],
        material: materials.data.data ?? [],
        quiz: quizzes.data.data ?? [],
      };
    },
  });

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

  const updateType = (i, value) => {
    const next = [...steps];
    next[i] = { ...next[i], type: value, reference_id: '' };
    onChange(next);
  };

  const referenceOptions = (step) => references[step.type] ?? [];

  return (
    <div className="lp-step-builder">
      {steps.length === 0 && (
        <div className="resource-note" style={{ textAlign: 'center', padding: '28px 0' }}>
          <BookMarked size={22} style={{ margin: '0 auto 8px', display: 'block', color: 'var(--fg-3)' }} />
          Belum ada langkah. Tambahkan langkah pertama di bawah.
        </div>
      )}

      {steps.map((step, i) => (
        <div key={i} className="lp-step-row">
          <div className="lp-step-num">{i + 1}</div>

          <div className="lp-step-fields">
            <div className="lp-step-row-top">
              <input
                className="lp-step-title-input"
                placeholder="Judul langkah..."
                value={step.title}
                onChange={(e) => update(i, 'title', e.target.value)}
              />
              <select
                className="sec-filter-select"
                value={step.type}
                onChange={(e) => updateType(i, e.target.value)}
                style={{ flexShrink: 0, width: 140 }}
              >
                {Object.entries(STEP_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
              <input
                type="number"
                className="sec-filter-select"
                placeholder="Menit"
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
                Wajib
              </label>
            </div>
            <textarea
              className="lp-step-desc-input"
              placeholder="Deskripsi singkat (opsional)..."
              rows={2}
              value={step.description}
              onChange={(e) => update(i, 'description', e.target.value)}
            />
            {step.type !== 'module' && (
              <select
                className="lp-step-title-input"
                value={step.reference_id}
                onChange={(e) => update(i, 'reference_id', e.target.value)}
              >
                <option value="">Pilih {STEP_TYPES[step.type]?.label ?? 'referensi'}...</option>
                {step.reference_id && !referenceOptions(step).some((item) => item.id === step.reference_id) && (
                  <option value={step.reference_id}>{step.reference_id}</option>
                )}
                {referenceOptions(step).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}{item.meta ? ` - ${item.meta}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="lp-step-controls">
            <button type="button" className="icon-action" title="Naikkan" aria-label="Naikkan langkah" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={13} /></button>
            <button type="button" className="icon-action" title="Turunkan" aria-label="Turunkan langkah" onClick={() => move(i, 1)}  disabled={i === steps.length - 1}><ArrowDown size={13} /></button>
            <button type="button" className="icon-action" title="Hapus langkah" aria-label="Hapus langkah" onClick={() => remove(i)} style={{ color: 'var(--crimson)' }}><Trash2 size={13} /></button>
          </div>
        </div>
      ))}

      <button type="button" className="outline-button compact" onClick={add} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
        <Plus size={13} /> Tambah Langkah
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
    estimated_hours: normalizeNumberText(path?.estimated_hours ?? 0),
    is_sequential:   path?.is_sequential   ?? true,
    certificate_template_id: path?.certificate_template_id ? String(path.certificate_template_id) : '',
  });
  const [steps, setSteps] = useState(path?.steps ?? []);
  const [savedUuid, setSavedUuid] = useState(path?.uuid ?? null);

  const { data: certificateTemplates = [] } = useQuery({
    queryKey: ['lp-certificate-templates'],
    queryFn: async () => {
      const res = await api.get('/certificate-templates', { params: { per_page: 50 } });
      const templates = res.data.data?.data ?? res.data.data ?? [];
      return templates.filter((template) => template.is_active !== false);
    },
  });

  const infoMut = useMutation({
    mutationFn: (body) => isNew && !savedUuid
      ? api.post('/admin/learning-paths', body)
      : api.put(`/admin/learning-paths/${savedUuid}`, body),
    onSuccess: (res) => {
      const saved = res.data.data;
      setSavedUuid(saved.uuid);
      qc.invalidateQueries({ queryKey: ['admin-lp-list'] });
      toast.success(isNew ? 'Alur belajar berhasil dibuat.' : 'Informasi alur belajar tersimpan.');
      if (isNew && !savedUuid) setTab('steps');
      onSaved?.(saved);
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Gagal menyimpan informasi alur belajar.')),
  });

  const stepsMut = useMutation({
    mutationFn: (s) => api.put(`/admin/learning-paths/${savedUuid}/steps`, { steps: s }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-lp-list'] }); toast.success('Langkah belajar tersimpan.'); },
    onError: (error) => toast.error(apiErrorMessage(error, 'Gagal menyimpan langkah belajar.')),
  });

  const handleInfoSubmit = (e) => {
    e.preventDefault();
    if (!info.title.trim()) return toast.error('Judul wajib diisi.');
    if (!/^\d*$/.test(info.estimated_hours)) return toast.error('Estimasi jam harus berupa angka.');

    infoMut.mutate({
      ...info,
      estimated_hours: Number(info.estimated_hours || 0),
      certificate_template_id: info.certificate_template_id ? Number(info.certificate_template_id) : null,
    });
  };

  return (
    <div className="modal-backdrop lp-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box lp-path-modal" role="dialog" aria-modal="true" aria-labelledby="lp-modal-title">
        {/* Head */}
        <div className="modal-head lp-modal-head">
          <div>
            <p className="mono-kicker text-muted">Kurikulum</p>
            <h2 id="lp-modal-title">{isNew ? 'Alur Belajar Baru' : 'Edit Alur Belajar'}</h2>
            <span>{tab === 'info' ? 'Lengkapi informasi utama sebelum menyusun langkah belajar.' : 'Susun urutan aktivitas yang akan diikuti peserta.'}</span>
          </div>
          <button className="icon-action" onClick={onClose} aria-label="Tutup modal"><X size={16} /></button>
        </div>

        {/* Stepper */}
        <div className="lp-modal-stepper">
          <button className={`lp-stepper-item${tab === 'info' ? ' active' : ''}`} onClick={() => setTab('info')}>
            <span>1</span>
            Informasi
          </button>
          <button
            className={`lp-stepper-item${tab === 'steps' ? ' active' : ''}`}
            onClick={() => setTab('steps')}
            disabled={!savedUuid && isNew}
            title={!savedUuid && isNew ? 'Simpan informasi dulu' : ''}
          >
            <span>2</span>
            Langkah {steps.length > 0 && `(${steps.length})`}
          </button>
        </div>

        {/* Body */}
        <div className="lp-modal-body">
          {tab === 'info' && (
            <form id="lp-info-form" className="lp-modal-form lp-modal-form--with-preview" onSubmit={handleInfoSubmit}>
              <div className="lp-modal-form-main">
                <section className="lp-form-section">
                  <div className="lp-form-section-head">
                    <strong>Detail kurikulum</strong>
                    <span>Nama dan ringkasan yang akan dilihat peserta.</span>
                  </div>
                  <div className="event-field">
                    <span>Judul *</span>
                    <input autoFocus required placeholder="Contoh: Orientasi ASN Kabupaten Mojokerto..." value={info.title} onChange={(e) => setInfo((f) => ({ ...f, title: e.target.value }))} />
                  </div>
                  <div className="event-field">
                    <span>Deskripsi</span>
                    <textarea rows={4} placeholder="Jelaskan tujuan belajar, hasil yang diharapkan, dan sasaran peserta..." value={info.description} onChange={(e) => setInfo((f) => ({ ...f, description: e.target.value }))} />
                  </div>
                  <div className="event-field">
                    <span>URL Thumbnail (opsional)</span>
                    <input type="url" inputMode="url" placeholder="https://..." value={info.thumbnail_url} onChange={(e) => setInfo((f) => ({ ...f, thumbnail_url: e.target.value }))} />
                  </div>
                </section>

                <section className="lp-form-section">
                  <div className="lp-form-section-head">
                    <strong>Pengaturan publikasi</strong>
                    <span>Tentukan status, audiens, dan aturan urutan belajar.</span>
                  </div>
                  <div className="lp-modal-grid">
                    <div className="event-field">
                      <span>Status</span>
                      <select value={info.status} onChange={(e) => setInfo((f) => ({ ...f, status: e.target.value }))}>
                        <option value="draft">Draf</option>
                        <option value="published">Terbit</option>
                      </select>
                      {info.status === 'published' && (
                        <em className="lp-field-note">Alur terbit akan terlihat oleh peserta sesuai target peran.</em>
                      )}
                    </div>
                    <div className="event-field">
                      <span>Target Peran</span>
                      <select value={info.target_role} onChange={(e) => setInfo((f) => ({ ...f, target_role: e.target.value }))}>
                        {ROLES.map((r) => <option key={r || 'all'} value={r}>{ROLE_LABELS[r] ?? r}</option>)}
                      </select>
                    </div>
                    <div className="event-field">
                      <span>Estimasi Jam</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="0"
                        value={info.estimated_hours}
                        onChange={(e) => setInfo((f) => ({ ...f, estimated_hours: normalizeNumberText(e.target.value) }))}
                      />
                    </div>
                    <div className="event-field">
                      <span>Template Sertifikat</span>
                      <select
                        value={info.certificate_template_id}
                        onChange={(e) => setInfo((f) => ({ ...f, certificate_template_id: e.target.value }))}
                      >
                        <option value="">Gunakan template default</option>
                        {certificateTemplates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}{template.is_default ? ' - Default' : ''}
                          </option>
                        ))}
                      </select>
                      <em className="lp-field-note">Dipakai saat peserta menyelesaikan seluruh langkah wajib.</em>
                    </div>
                    <div className="lp-sequential-box">
                      <label className="sec-filter-check">
                        <input type="checkbox" checked={info.is_sequential} onChange={(e) => setInfo((f) => ({ ...f, is_sequential: e.target.checked }))} />
                        Wajib berurutan
                      </label>
                      <span>Peserta harus menyelesaikan langkah sesuai urutan.</span>
                    </div>
                  </div>
                </section>
              </div>

              <aside className="lp-path-preview" aria-label="Preview alur belajar">
                <div className="lp-path-preview-thumb">
                  {info.thumbnail_url ? <img src={info.thumbnail_url} alt="" /> : <BookMarked size={20} />}
                </div>
                <StatusBadge status={info.status} />
                <strong>{info.title || 'Judul alur belajar'}</strong>
                <p>{info.description || 'Ringkasan singkat akan membantu admin dan peserta memahami tujuan kurikulum.'}</p>
                <dl>
                  <div>
                    <dt>Target</dt>
                    <dd>{formatRole(info.target_role)}</dd>
                  </div>
                  <div>
                    <dt>Estimasi</dt>
                    <dd>{formatHours(info.estimated_hours)}</dd>
                  </div>
                  <div>
                    <dt>Aturan</dt>
                    <dd>{info.is_sequential ? 'Berurutan' : 'Bebas'}</dd>
                  </div>
                  <div>
                    <dt>Sertifikat</dt>
                    <dd>
                      {certificateTemplates.find((template) => String(template.id) === info.certificate_template_id)?.name ?? 'Template default'}
                    </dd>
                  </div>
                </dl>
              </aside>
            </form>
          )}

          {tab === 'steps' && (
            <div className="lp-steps-panel">
              <div className="lp-form-section-head">
                <strong>Langkah belajar</strong>
                <span>Tambahkan modul, kegiatan pelatihan, atau materi sesuai urutan pelaksanaan.</span>
              </div>
              <StepsEditor steps={steps} onChange={setSteps} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-foot lp-modal-foot">
          <button type="button" className="outline-button compact" onClick={onClose}>Batal</button>
          {tab === 'info' && (
            <button type="submit" form="lp-info-form" className="primary-button compact" disabled={infoMut.isPending}>
              {infoMut.isPending ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
              {isNew && !savedUuid ? 'Simpan & Lanjutkan' : 'Simpan Informasi'}
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
              Simpan Langkah
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function PathActions({
  path,
  isEditing,
  onEdit,
  onToggle,
  onDuplicate,
  onDelete,
  disabled,
}) {
  const [open, setOpen] = useState(false);
  const isPublished = path.status === 'published';

  const close = () => setOpen(false);

  return (
    <div className="lp-table-actions">
      <button className="primary-button compact lp-edit-action" disabled={isEditing} onClick={() => onEdit(path)}>
        {isEditing ? <Loader2 size={12} className="spin" /> : <Pencil size={12} />}
        Edit
      </button>
      <button
        className="outline-button compact"
        disabled={disabled}
        title={isPublished ? 'Jadikan draf' : 'Terbitkan'}
        onClick={() => onToggle({ uuid: path.uuid, status: isPublished ? 'draft' : 'published' })}
      >
        {isPublished ? <EyeOff size={12} /> : <Globe size={12} />}
        {isPublished ? 'Jadikan Draf' : 'Terbitkan'}
      </button>
      <div className="row-menu-wrap">
        <button className="icon-action" type="button" aria-label="Aksi lainnya" onClick={() => setOpen((value) => !value)}>
          <MoreHorizontal size={14} />
        </button>
        {open && (
          <div className="row-menu lp-action-menu">
            <button type="button" disabled={disabled} onClick={() => { close(); onDuplicate(path.uuid); }}>
              <Copy size={13} /> Salin sebagai draf
            </button>
            <button type="button" className="danger-menu" disabled={disabled} onClick={() => { close(); onDelete(path); }}>
              <Trash2 size={13} /> Hapus alur
            </button>
          </div>
        )}
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
      toast.error('Gagal memuat detail alur belajar.');
    } finally {
      setEditLoading(null);
    }
  };

  const toggleMut = useMutation({
    mutationFn: ({ uuid, status }) => api.put(`/admin/learning-paths/${uuid}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-lp-list'] }); },
    onError: (error) => toast.error(apiErrorMessage(error, 'Gagal memperbarui status.')),
  });

  const duplicateMut = useMutation({
    mutationFn: (uuid) => api.post(`/admin/learning-paths/${uuid}/duplicate`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-lp-list'] }); toast.success('Alur belajar disalin sebagai draf.'); },
    onError: () => toast.error('Gagal menyalin alur belajar.'),
  });

  const deleteMut = useMutation({
    mutationFn: (uuid) => api.delete(`/admin/learning-paths/${uuid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-lp-list'] }); toast.success('Alur belajar dihapus.'); },
    onError: () => toast.error('Gagal menghapus alur belajar.'),
  });

  const paths      = data?.data ?? [];
  const published  = paths.filter((p) => p.status === 'published').length;
  const draft      = paths.filter((p) => p.status === 'draft').length;
  const totalEnrol = paths.reduce((s, p) => s + (p.enrollments_count ?? 0), 0);
  const stats = [
    { label: 'Total Alur', val: data?.total ?? paths.length, tone: 'default' },
    { label: 'Terbit',     val: published,                   tone: 'success' },
    { label: 'Draf',       val: draft,                       tone: 'muted'   },
    { label: 'Pendaftar',  val: totalEnrol,                  tone: 'accent'  },
  ];

  const confirmDelete = (path) => {
    if (confirm(`Hapus "${path.title}"?`)) deleteMut.mutate(path.uuid);
  };

  return (
    <div className="page-stack">
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <p className="mono-kicker text-muted">Pembelajaran</p>
          <h1>Penyusun Kurikulum</h1>
        </div>
        <button className="primary-button" onClick={() => setModal({})}>
          <Plus size={14} /> Alur Belajar Baru
        </button>
      </div>

      {/* Stats bar */}
      {!isLoading && paths.length > 0 && (
        <div className="lp-stats-strip" aria-label="Ringkasan alur belajar">
          {stats.map(({ label, val, tone }) => (
            <div key={label} className={`enterprise-card lp-stat-card lp-stat-card--${tone}`}>
              <strong>{val}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      )}

      <section className="enterprise-card lp-table-card">
        <div className="lp-list-toolbar">
          <div>
            <h2>Daftar Alur Belajar</h2>
            <span>{data?.total ?? paths.length} alur tersedia untuk dikelola</span>
          </div>
          <div className="lp-filter-row">
            <input
              className="sec-filter-select"
              placeholder="Cari alur belajar..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
            <select className="sec-filter-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">Semua Status</option>
              <option value="draft">Draf</option>
              <option value="published">Terbit</option>
            </select>
          </div>
        </div>

        {isLoading && (
          <div className="lp-table-wrap">
            <table className="lp-admin-table">
              <tbody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td><Skel w="70%" h={14} /></td>
                    <td><Skel w={64} h={18} /></td>
                    <td><Skel w={78} h={12} /></td>
                    <td><Skel w={46} h={12} /></td>
                    <td><Skel w={54} h={12} /></td>
                    <td><Skel w={84} h={28} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && paths.length === 0 && (
          <div className="lp-empty-state">
            <BookMarked size={32} />
            <p>{search ? `Tidak ada alur belajar yang cocok dengan "${search}".` : 'Belum ada alur belajar. Buat kurikulum pertama Anda.'}</p>
            {!search && (
              <button className="primary-button compact" onClick={() => setModal({})}>
                <Plus size={14} /> Alur Belajar Baru
              </button>
            )}
          </div>
        )}

        {!isLoading && paths.length > 0 && (
          <div className="lp-table-wrap">
            <table className="lp-admin-table">
              <thead>
                <tr>
                  <th>Judul</th>
                  <th>Status</th>
                  <th>Target</th>
                  <th>Langkah</th>
                  <th>Peserta</th>
                  <th>Estimasi</th>
                  <th>Sertifikat</th>
                  <th>Aturan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paths.map((p) => (
                  <tr key={p.uuid}>
                    <td className="lp-title-cell">
                      <strong>{p.title}</strong>
                      {p.description && <span>{p.description}</span>}
                    </td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>{p.target_role ? <span className="lp-role-tag">{formatRole(p.target_role)}</span> : <span className="lp-muted">Semua Peran</span>}</td>
                    <td><span className="lp-table-metric"><BookMarked size={12} /> {p.steps_count}</span></td>
                    <td><span className="lp-table-metric"><Users size={12} /> {p.enrollments_count}</span></td>
                    <td><span className="lp-table-metric"><Clock size={12} /> {formatHours(p.estimated_hours)}</span></td>
                    <td>
                      <span className="lp-table-metric">
                        <Award size={12} /> {p.certificate_template?.name ?? 'Default'}
                      </span>
                    </td>
                    <td>{p.is_sequential ? <span className="lp-seq-tag"><ChevronRight size={12} /> Berurutan</span> : <span className="lp-muted">Bebas</span>}</td>
                    <td>
                      <PathActions
                        path={p}
                        isEditing={editLoading === p.uuid}
                        disabled={toggleMut.isPending || duplicateMut.isPending || deleteMut.isPending}
                        onEdit={editPath}
                        onToggle={(payload) => toggleMut.mutate(payload)}
                        onDuplicate={(uuid) => duplicateMut.mutate(uuid)}
                        onDelete={confirmDelete}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {(data?.last_page ?? 1) > 1 && (
          <div className="picker-pagination lp-table-pagination">
            <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Sebelumnya</button>
            <span>{page} / {data.last_page} · {data.total} alur</span>
            <button className="outline-button compact" disabled={page >= data.last_page} onClick={() => setPage((p) => p + 1)}>Berikutnya ›</button>
          </div>
        )}
      </section>

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
