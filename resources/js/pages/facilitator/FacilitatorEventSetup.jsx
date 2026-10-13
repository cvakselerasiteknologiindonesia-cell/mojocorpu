import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { safe } from '../../utils/sanitize.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlignLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpDown,
  Award,
  BookOpen,
  Building2,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleDot,
  ClipboardList,
  Clock,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  HelpCircle,
  Image,
  Link,
  ListChecks,
  MapPin,
  Pencil,
  Plus,
  Search,
  Send,
  SquareCheck,
  TextCursorInput,
  ToggleLeft,
  Trash2,
  Upload,
  User,
  UserCheck,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { toast } from 'sonner';
import api from '../../api.js';
import { getRoleNames, hasAnyPermission } from '../../utils/permissions.js';
import { loadXlsx } from '../../utils/xlsx.js';

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

function formatQuota(q) {
  if (q == null) return null;
  return q === 0 ? 'Tidak terbatas' : `${q} peserta`;
}

function fileExt(name = '') {
  return name.split('.').pop().toLowerCase();
}

function guessMediaType(url = '', fileObj = null) {
  const name = fileObj ? fileObj.name : url;
  const ext = fileExt(name);
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

const MATERIAL_TYPE_ICONS = { document: FileText, video: Video, link: Link, presentation: BookOpen };
const MATERIAL_TYPE_LABELS = { document: 'Dokumen', video: 'Video', link: 'Tautan', presentation: 'Presentasi' };
const MATERIAL_TYPE_ACCENTS = { document: 'emerald', video: 'crimson', link: 'grape', presentation: 'amber' };
const SESSION_STATUS_LABELS = { draft: 'Draft', active: 'Aktif', completed: 'Selesai' };
const ASSESSMENT_TYPE_LABELS = { pre_test: 'Pre-Test', post_test: 'Post-Test' };
const ASSESSMENT_STATUS_LABELS = { draft: 'Draft', published: 'Diterbitkan' };

// ── File preview ──────────────────────────────────────────────────────────────

function UrlPreview({ url }) {
  if (!url) return null;
  let parsed;
  try { parsed = new URL(url); } catch { return null; }

  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  if (ytMatch) {
    const vid = ytMatch[1];
    return (
      <div className="url-preview-box">
        <img
          src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`}
          alt="YouTube thumbnail"
          className="url-preview-thumb"
        />
        <div className="url-preview-label"><Video size={13} /> YouTube Video</div>
      </div>
    );
  }

  if (/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i.test(parsed.pathname)) {
    return (
      <div className="url-preview-box">
        <img src={url} alt="Preview" className="url-preview-thumb" />
      </div>
    );
  }

  return (
    <div className="url-preview-box url-preview-link">
      <ExternalLink size={13} />
      <div>
        <span className="url-preview-domain">{parsed.hostname}</span>
        <span className="url-preview-path">{parsed.pathname}</span>
      </div>
    </div>
  );
}

function FilePreview({ src, fileName, className = '' }) {
  if (!src) return null;
  const kind = guessMediaType(fileName || src);
  if (kind === 'image') {
    return <img src={src} alt={fileName} className={`file-preview-img ${className}`} />;
  }
  if (kind === 'video') {
    return <video src={src} controls className={`file-preview-video ${className}`} />;
  }
  if (kind === 'pdf') {
    return <iframe src={src} title={fileName} className={`file-preview-pdf ${className}`} />;
  }
  return (
    <div className={`file-preview-other ${className}`}>
      <FileText size={20} />
      <span>{fileName || 'File'}</span>
    </div>
  );
}

// ── Shared form primitives ─────────────────────────────────────────────────────

function FormField({ label, children }) {
  return (
    <label className="event-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function RowModal({ title, onClose, onSubmit, isSaving, error, maxWidth = 520, children }) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth }}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>
        <form
          className="modal-body"
          style={{ display: 'grid', gap: 12 }}
          onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        >
          {children}
          {error && (
            <div className="form-error-visible">{error.response?.data?.message || 'Gagal menyimpan.'}</div>
          )}
          <div className="modal-foot" style={{ marginTop: 4 }}>
            <button type="button" className="outline-button compact" onClick={onClose}>Batal</button>
            <button type="submit" className="primary-button compact" disabled={isSaving}>
              {isSaving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function SetupSection({ icon: Icon, title, count, accent, children }) {
  const [open, setOpen] = useState(true);
  return (
    <section className={`setup-section setup-section--${accent}`}>
      <button type="button" className="setup-section-head" onClick={() => setOpen((v) => !v)}>
        <span className={`setup-section-icon setup-icon--${accent}`}><Icon size={16} /></span>
        <span className="setup-section-title">{title}</span>
        {count > 0 && <em className="setup-count">{count}</em>}
        {open ? <ChevronUp size={15} className="setup-chevron" /> : <ChevronDown size={15} className="setup-chevron" />}
      </button>
      {open && <div className="setup-section-body">{children}</div>}
    </section>
  );
}

// ── Learning Path (sessions) ──────────────────────────────────────────────────

const EMPTY_SESSION = { title: '', description: '', order: '', duration_minutes: '', start_date: '', end_date: '', status: 'active' };

function SessionsSection({ uuid, eventStart, eventEnd }) {
  const queryClient = useQueryClient();
  const qk = ['event-sessions', uuid];
  const [formModal, setFormModal] = useState(null);
  const [form, setForm] = useState(EMPTY_SESSION);
  const [overlapError, setOverlapError] = useState(null);

  const { data = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => (await api.get(`/training-events/${uuid}/sessions`)).data.data,
  });

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: qk }); setFormModal(null); };
  const createMut = useMutation({ mutationFn: (d) => api.post(`/training-events/${uuid}/sessions`, d), onSuccess: () => { invalidate(); toast.success('Sesi ditambahkan.'); }, onError: () => toast.error('Gagal menyimpan sesi.') });
  const updateMut = useMutation({ mutationFn: ({ id, ...d }) => api.put(`/training-events/${uuid}/sessions/${id}`, d), onSuccess: () => { invalidate(); toast.success('Sesi diperbarui.'); }, onError: () => toast.error('Gagal memperbarui sesi.') });
  const deleteMut = useMutation({ mutationFn: (id) => api.delete(`/training-events/${uuid}/sessions/${id}`), onSuccess: () => { invalidate(); toast.success('Sesi dihapus.'); }, onError: () => toast.error('Gagal menghapus sesi.') });

  const isSaving = createMut.isPending || updateMut.isPending;
  const saveError = createMut.error || updateMut.error;

  const calcDuration = (start, end) => {
    if (!start || !end) return '';
    const diff = Math.round((new Date(end) - new Date(start)) / 60000);
    return diff > 0 ? String(diff) : '';
  };

  const checkOverlap = (startDate, endDate, excludeId = null) => {
    if (!startDate || !endDate) return null;
    const newStart = new Date(startDate).getTime();
    const newEnd = new Date(endDate).getTime();
    return data.find((s) => {
      if (s.id === excludeId) return false;
      if (!s.start_date || !s.end_date) return false;
      const sStart = new Date(s.start_date).getTime();
      const sEnd = new Date(s.end_date).getTime();
      return newStart < sEnd && newEnd > sStart;
    }) || null;
  };

  const openCreate = () => { createMut.reset(); setOverlapError(null); setForm(EMPTY_SESSION); setFormModal({ type: 'create' }); };
  const openEdit = (s) => {
    updateMut.reset();
    setOverlapError(null);
    const start = s.start_date ? s.start_date.substring(0, 16) : '';
    const end   = s.end_date   ? s.end_date.substring(0, 16)   : '';
    setForm({ title: s.title, description: s.description || '', order: s.order?.toString() || '', duration_minutes: calcDuration(start, end) || s.duration_minutes?.toString() || '', start_date: start, end_date: end, status: s.status });
    setFormModal({ type: 'edit', id: s.id });
  };

  const submit = () => {
    if (!form.title.trim()) return;
    const editingId = formModal.type === 'edit' ? formModal.id : null;
    const conflict = checkOverlap(form.start_date, form.end_date, editingId);
    if (conflict) {
      setOverlapError(`Jadwal bertabrakan dengan sesi "${conflict.title}". Sesi tidak boleh tumpang tindih.`);
      return;
    }
    setOverlapError(null);
    const payload = { title: form.title, description: form.description || null, order: parseInt(form.order, 10) || 1, duration_minutes: parseInt(form.duration_minutes, 10) || null, start_date: form.start_date || null, end_date: form.end_date || null, status: form.status };
    if (formModal.type === 'edit') updateMut.mutate({ id: formModal.id, ...payload });
    else createMut.mutate(payload);
  };

  return (
    <SetupSection icon={GraduationCap} title="Learning Path" count={data.length} accent="grape">
      {isLoading && <div className="resource-note">Memuat sesi…</div>}
      {!isLoading && data.length === 0 && <div className="resource-note">Belum ada sesi. Tambahkan topik atau sesi pembelajaran.</div>}

      <div className="setup-list">
        {data.map((s, i) => (
          <div className="setup-row" key={s.id}>
            <span className="setup-order">{i + 1}</span>
            <div className="setup-row-main">
              <strong>{s.title}</strong>
              {(s.start_date || s.duration_minutes) && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {s.start_date && <><Clock size={11} /> {formatDateTime(s.start_date)}{s.end_date ? ` – ${formatDateTime(s.end_date)}` : ''}</>}
                  {s.duration_minutes && !s.start_date && <><Clock size={11} /> {s.duration_minutes} menit</>}
                </span>
              )}
            </div>
            <em className={`status-badge ${s.status === 'active' ? 'active' : s.status === 'completed' ? 'scheduled' : ''}`}>
              {SESSION_STATUS_LABELS[s.status] || s.status}
            </em>
            <div className="setup-row-actions">
              <button className="icon-action" title="Edit" onClick={() => openEdit(s)}><Pencil size={13} /></button>
              <button className="icon-action danger-icon" title="Hapus" onClick={() => deleteMut.mutate(s.id)}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      <button className="setup-add-btn" onClick={openCreate}><Plus size={14} /> Tambah Sesi</button>

      {formModal && (
        <RowModal title={formModal.type === 'edit' ? 'Edit Sesi' : 'Sesi Baru'} onClose={() => setFormModal(null)} onSubmit={submit} isSaving={isSaving} error={saveError}>
          <FormField label="Judul Sesi">
            <input autoFocus required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder="Contoh: Pengenalan Kompetensi ASN" />
          </FormField>
          <FormField label="Deskripsi">
            <textarea rows={2} value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="Tujuan dan materi sesi ini…" />
          </FormField>
          {(eventStart || eventEnd) && (
            <div style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--surface-2, #f5f5f5)', borderRadius: 6, padding: '6px 10px' }}>
              Rentang event: <strong>{eventStart ? formatDateTime(eventStart) : '—'}</strong> s/d <strong>{eventEnd ? formatDateTime(eventEnd) : '—'}</strong>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Mulai Sesi">
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((c) => ({ ...c, start_date: val, duration_minutes: calcDuration(val, c.end_date) }));
                  const editingId = formModal?.type === 'edit' ? formModal.id : null;
                  const conflict = checkOverlap(val, form.end_date, editingId);
                  setOverlapError(conflict ? `Jadwal bertabrakan dengan sesi "${conflict.title}".` : null);
                }}
              />
            </FormField>
            <FormField label="Selesai Sesi">
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => {
                  const val = e.target.value;
                  setForm((c) => ({ ...c, end_date: val, duration_minutes: calcDuration(c.start_date, val) }));
                  const editingId = formModal?.type === 'edit' ? formModal.id : null;
                  const conflict = checkOverlap(form.start_date, val, editingId);
                  setOverlapError(conflict ? `Jadwal bertabrakan dengan sesi "${conflict.title}".` : null);
                }}
              />
            </FormField>
          </div>
          {overlapError && (
            <div className="form-error-visible" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>⚠️</span> {overlapError}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Urutan">
              <input type="number" min="1" value={form.order} onChange={(e) => setForm((c) => ({ ...c, order: e.target.value }))} placeholder="1" />
            </FormField>
            <FormField label="Durasi (menit)">
              <input type="number" readOnly value={form.duration_minutes} placeholder="Otomatis" style={{ background: 'var(--surface-2, #f5f5f5)', cursor: 'default' }} />
            </FormField>
          </div>
          <FormField label="Status">
            <select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}>
              {Object.entries(SESSION_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </FormField>
        </RowModal>
      )}
    </SetupSection>
  );
}

// ── Learning Materials ────────────────────────────────────────────────────────

const EMPTY_MATERIAL = { title: '', type: 'document', url: '', description: '', duration_minutes: '', order: '' };
const MAX_FILE_BYTES = 1000 * 1024 * 1024; // 1000 MB

function MaterialsSection({ uuid }) {
  const queryClient = useQueryClient();
  const qk = ['event-materials', uuid];
  const [formModal, setFormModal] = useState(null);
  const [form, setForm] = useState(EMPTY_MATERIAL);
  const [inputMode, setInputMode] = useState('url'); // 'url' | 'file'
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!selectedFile) return;
    const url = URL.createObjectURL(selectedFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const { data = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => (await api.get(`/training-events/${uuid}/materials`)).data.data,
  });

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: qk }); setFormModal(null); };

  const buildFormData = (extra = {}) => {
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('type', form.type);
    fd.append('description', form.description || '');
    if (form.duration_minutes) fd.append('duration_minutes', parseInt(form.duration_minutes, 10));
    fd.append('order', parseInt(form.order, 10) || 1);
    if (inputMode === 'file' && selectedFile) {
      if (formModal?.type === 'create' && selectedFiles.length > 0) {
        selectedFiles.forEach((file) => fd.append('files[]', file));
      } else {
        fd.append('file', selectedFile);
      }
    } else if (inputMode === 'url') {
      fd.append('url', form.url || '');
    }
    Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    return fd;
  };

  const createMut = useMutation({
    mutationFn: () => api.post(`/training-events/${uuid}/materials`, buildFormData()),
    onSuccess: () => { invalidate(); toast.success('Materi ditambahkan.'); },
    onError: () => toast.error('Gagal menyimpan materi.'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, clearFile }) => api.post(`/training-events/${uuid}/materials/${id}?_method=PUT`, buildFormData(clearFile ? { clear_file: '1' } : {})),
    onSuccess: () => { invalidate(); toast.success('Materi diperbarui.'); },
    onError: () => toast.error('Gagal memperbarui materi.'),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/training-events/${uuid}/materials/${id}`),
    onSuccess: () => { invalidate(); toast.success('Materi dihapus.'); },
    onError: () => toast.error('Gagal menghapus materi.'),
  });

  const isSaving = createMut.isPending || updateMut.isPending;
  const saveError = createMut.error || updateMut.error;

  const pickFiles = (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;
    const oversized = files.find((f) => f.size > MAX_FILE_BYTES);
    if (oversized) {
      setFileError(`Ukuran file "${oversized.name}" (${(oversized.size / 1024 / 1024).toFixed(1)} MB) melebihi batas maksimum 1000 MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFileError(null);
    setSelectedFiles(files);
    setSelectedFile(files[0]);
  };

  const pickFile = (f) => {
    pickFiles(f ? [f] : []);
  };

  const openCreate = () => {
    createMut.reset();
    setForm(EMPTY_MATERIAL);
    setInputMode('url');
    setSelectedFile(null);
    setSelectedFiles([]);
    setFilePreviewUrl(null);
    setFileError(null);
    setFormModal({ type: 'create' });
  };

  const openEdit = (m) => {
    updateMut.reset();
    setForm({ title: m.title, type: m.type, url: m.url || '', description: m.description || '', duration_minutes: m.duration_minutes?.toString() || '', order: m.order?.toString() || '' });
    setInputMode(m.file_url ? 'file' : 'url');
    setSelectedFile(null);
    setSelectedFiles([]);
    setFilePreviewUrl(m.file_url || null);
    setFileError(null);
    setFormModal({ type: 'edit', id: m.id, hasFile: !!m.file_url, existingFileUrl: m.file_url });
  };

  const clearFile = () => {
    setSelectedFile(null);
    setSelectedFiles([]);
    setFilePreviewUrl(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    pickFiles(e.dataTransfer.files);
  };

  const submit = () => {
    if (!form.title.trim()) return;
    if (fileError) return;
    if (formModal.type === 'edit') {
      const shouldClearFile = formModal.hasFile && inputMode === 'file' && !selectedFile && !filePreviewUrl;
      updateMut.mutate({ id: formModal.id, clearFile: shouldClearFile });
    } else {
      createMut.mutate();
    }
  };

  return (
    <SetupSection icon={BookOpen} title="Learning Materials" count={data.length} accent="emerald">
      {isLoading && <div className="resource-note">Memuat materi…</div>}

      {!isLoading && data.length === 0 && (
        <div className="material-empty">
          <BookOpen size={28} />
          <p>Belum ada materi pembelajaran.</p>
          <span>Tambahkan dokumen, video, atau tautan untuk peserta.</span>
        </div>
      )}

      <div className="material-cards">
        {data.map((m) => {
          const Icon = MATERIAL_TYPE_ICONS[m.type] || FileText;
          const accent = MATERIAL_TYPE_ACCENTS[m.type] || 'emerald';
          return (
            <div className="material-card" key={m.id}>
              <div className={`material-card-icon-wrap setup-icon--${accent}`}>
                <Icon size={18} />
              </div>
              <div className="material-card-body">
                <span className="material-card-type">{MATERIAL_TYPE_LABELS[m.type] || m.type}</span>
                <strong className="material-card-title">{m.title}</strong>
                {m.description && <p className="material-card-desc">{m.description}</p>}
                {m.file_url && (
                  <div className="material-card-link">
                    <FileText size={10} />
                    <span>{m.file_url.split('/').pop()}</span>
                  </div>
                )}
                {!m.file_url && m.url && (
                  <a href={m.url} target="_blank" rel="noreferrer" className="material-card-link">
                    <Link size={10} />
                    <span>{m.url}</span>
                  </a>
                )}
              </div>
              <div className="material-card-actions">
                <button className="icon-action" title="Edit" onClick={() => openEdit(m)}><Pencil size={13} /></button>
                <button className="icon-action danger-icon" title="Hapus" onClick={() => deleteMut.mutate(m.id)}><Trash2 size={13} /></button>
              </div>
            </div>
          );
        })}
      </div>

      <button className="setup-add-btn" onClick={openCreate}><Plus size={14} /> Tambah Materi</button>

      {formModal && (
        <RowModal title={formModal.type === 'edit' ? 'Edit Materi' : 'Materi Baru'} onClose={() => setFormModal(null)} onSubmit={submit} isSaving={isSaving} error={saveError} maxWidth={740}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

            {/* Left column: title, type, order */}
            <div style={{ display: 'grid', gap: 14 }}>
              <FormField label="Judul Materi">
                <input autoFocus required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder="Contoh: Modul 1 – Dasar Kompetensi" />
              </FormField>

              <FormField label="Tipe Materi">
                <div className="material-type-selector">
                  {Object.entries(MATERIAL_TYPE_LABELS).map(([v, l]) => {
                    const Icon = MATERIAL_TYPE_ICONS[v] || FileText;
                    const accent = MATERIAL_TYPE_ACCENTS[v] || 'emerald';
                    const isActive = form.type === v;
                    return (
                      <button
                        key={v}
                        type="button"
                        className={`material-type-btn${isActive ? ` active accent-${accent}` : ''}`}
                        onClick={() => setForm((c) => ({ ...c, type: v }))}
                      >
                        <span className={`material-type-btn-icon${isActive ? ` setup-icon--${accent}` : ''}`}>
                          <Icon size={15} />
                        </span>
                        <span>{l}</span>
                      </button>
                    );
                  })}
                </div>
              </FormField>

              <FormField label="Urutan">
                <input type="number" min="1" value={form.order} onChange={(e) => setForm((c) => ({ ...c, order: e.target.value }))} placeholder="1" />
              </FormField>

              <FormField label="Durasi Materi (menit)">
                <input type="number" min="1" value={form.duration_minutes} onChange={(e) => setForm((c) => ({ ...c, duration_minutes: e.target.value }))} placeholder="Contoh: 90" />
                <small>{form.duration_minutes ? `${Math.ceil(Number(form.duration_minutes) / 45)} JP` : '1 JP = 45 menit'}</small>
              </FormField>
            </div>

            {/* Right column: source (URL/file) + description */}
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <div className="material-mode-tabs">
                  <button type="button" className={`material-mode-tab${inputMode === 'url' ? ' active' : ''}`} onClick={() => { setInputMode('url'); clearFile(); }}>
                    <Link size={13} /> URL
                  </button>
                  <button type="button" className={`material-mode-tab${inputMode === 'file' ? ' active' : ''}`} onClick={() => setInputMode('file')}>
                    <Upload size={13} /> Upload File
                  </button>
                </div>

                {inputMode === 'url' && (
                  <>
                    <input
                      type="url"
                      value={form.url}
                      onChange={(e) => setForm((c) => ({ ...c, url: e.target.value }))}
                      placeholder="https://…"
                      style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '9px 11px', width: '100%', background: '#fff', color: 'var(--fg)', font: 'inherit', boxSizing: 'border-box', outline: 'none' }}
                    />
                    <UrlPreview url={form.url} />
                  </>
                )}

                {inputMode === 'file' && (
                  <div className="material-file-area">
                    {formModal.type === 'create' && selectedFiles.length > 1 ? (
                      <div className="material-file-preview">
                        <div className="excel-preview-list" style={{ maxHeight: 180, overflow: 'auto' }}>
                          <p className="mono-kicker text-muted" style={{ marginBottom: 4 }}>
                            {selectedFiles.length} file dipilih
                          </p>
                          {selectedFiles.map((file) => (
                            <div key={`${file.name}-${file.size}`} className="excel-preview-row">
                              <span>{file.name}</span>
                              <small>{(file.size / 1024 / 1024).toFixed(1)} MB</small>
                            </div>
                          ))}
                        </div>
                        <button type="button" className="material-file-clear" onClick={clearFile}>
                          <X size={12} /> Hapus semua file
                        </button>
                      </div>
                    ) : filePreviewUrl ? (
                      <div className="material-file-preview">
                        <FilePreview src={filePreviewUrl} fileName={selectedFile?.name || ''} className="material-preview-media" />
                        <button type="button" className="material-file-clear" onClick={clearFile}>
                          <X size={12} /> Hapus file
                        </button>
                      </div>
                    ) : (
                      <label
                        className={`material-upload-zone${isDragging ? ' drag-over' : ''}${fileError ? ' upload-error' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                      >
                        <Upload size={20} />
                        <span>Seret file ke sini atau <em>klik untuk memilih</em></span>
                        <small>Dokumen, gambar, video — Maks. 1000 MB</small>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple={formModal.type === 'create'}
                          style={{ display: 'none' }}
                          onChange={(e) => pickFiles(e.target.files)}
                        />
                      </label>
                    )}
                    {fileError && <p className="material-file-error">{fileError}</p>}
                  </div>
                )}
              </div>

              <FormField label="Deskripsi">
                <textarea rows={4} value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} placeholder="Keterangan singkat tentang materi ini…" />
              </FormField>
            </div>

          </div>
        </RowModal>
      )}
    </SetupSection>
  );
}

// ── Assessments ───────────────────────────────────────────────────────────────

const EMPTY_ASSESSMENT = { type: 'pre_test', title: '', instructions: '', passing_score: '70', time_limit_minutes: '', bank_draw_count: '', status: 'draft' };
const EMPTY_QUESTION = { question: '', type: 'multiple_choice', options: ['', '', '', ''], correct_answer: '0', points: '1', order: '', in_bank: false };
const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Pilihan Ganda',  desc: 'Satu jawaban benar',     Icon: CircleDot      },
  { value: 'multiple_select', label: 'Multi Pilih',    desc: 'Beberapa jawaban benar', Icon: SquareCheck    },
  { value: 'true_false',      label: 'Benar / Salah',  desc: 'Dua pilihan biner',      Icon: ToggleLeft     },
  { value: 'fill_in_blank',   label: 'Isian Singkat',  desc: 'Ketik jawaban',          Icon: TextCursorInput},
  { value: 'matching',        label: 'Jodohkan',       desc: 'Pasangkan item',         Icon: ArrowLeftRight },
  { value: 'ordering',        label: 'Pengurutan',     desc: 'Urutkan item',           Icon: ArrowUpDown    },
  { value: 'essay',           label: 'Esai',           desc: 'Jawaban bebas',          Icon: AlignLeft      },
];
const QUESTION_TYPE_LABELS = Object.fromEntries(QUESTION_TYPES.map(t => [t.value, t.label]));
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

function stripHtml(html) {
  return html ? html.replace(/<[^>]*>/g, '').trim() : '';
}

// ── Question Excel Import ─────────────────────────────────────────────────────

const Q_TYPE_MAP = {
  pilihan_ganda: 'multiple_choice', pg: 'multiple_choice',
  multi_pilih:   'multiple_select',  ms: 'multiple_select',
  benar_salah:   'true_false',       bs: 'true_false',
  isian_singkat: 'fill_in_blank',    is: 'fill_in_blank',
  jodohkan:      'matching',         jd: 'matching',
  pengurutan:    'ordering',         pn: 'ordering',
  esai:          'essay',            es: 'essay',
};
const LETTER_TO_IDX = { a: '0', b: '1', c: '2', d: '3', e: '4', f: '5' };

function parseQuestionRow(row, rowIndex) {
  const cell = (i) => String(row[i] ?? '').trim();
  const type = Q_TYPE_MAP[cell(0).toLowerCase().replace(/\s/g, '_')];
  if (!type) throw new Error(`Tipe tidak dikenal: "${cell(0)}"`);

  const question = cell(1);
  if (!question) throw new Error('Pertanyaan kosong');

  const opts = [cell(2), cell(3), cell(4), cell(5), cell(6), cell(7)].filter(Boolean);
  const raw  = cell(8); // jawaban_benar column
  const pts  = parseInt(cell(9), 10) || 1;
  const bank = cell(10).toLowerCase() === 'ya';
  const ord  = parseInt(cell(11), 10) || (rowIndex + 1);

  let options = null;
  let correct_answer = null;

  if (type === 'multiple_choice' || type === 'multiple_select') {
    options = opts;
    if (type === 'multiple_choice') {
      const letters = raw.toLowerCase().split(',').map((l) => l.trim());
      correct_answer = LETTER_TO_IDX[letters[0]] ?? '0';
    } else {
      correct_answer = raw.split(',').map((l) => LETTER_TO_IDX[l.trim().toLowerCase()] ?? l.trim()).join(',');
    }
  } else if (type === 'true_false') {
    correct_answer = raw.toLowerCase().startsWith('benar') || raw.toLowerCase() === 'ya' ? '0' : '1';
  } else if (type === 'fill_in_blank') {
    correct_answer = raw;
    options = opts.length ? opts : null; // alternatives
  } else if (type === 'matching') {
    options = opts.map((o) => { const [left, right] = o.split('||'); return { left: left?.trim() ?? '', right: right?.trim() ?? '' }; });
    correct_answer = options.map((_, i) => i).join(',');
  } else if (type === 'ordering') {
    options = opts;
    correct_answer = opts.map((_, i) => i).join(',');
  }
  // essay: options and correct_answer stay null

  return { question, type, options, correct_answer, points: pts, in_bank: bank, order: ord };
}

const QUESTION_TEMPLATE_HEADERS = ['tipe', 'pertanyaan', 'pilihan_a', 'pilihan_b', 'pilihan_c', 'pilihan_d', 'pilihan_e', 'pilihan_f', 'jawaban_benar', 'poin', 'bank_soal', 'urutan'];
const QUESTION_TEMPLATE_EXAMPLES = [
  ['pilihan_ganda', 'Apa singkatan dari ASN?', 'Aparatur Sipil Negara', 'Aparat Sipil Negara', 'Anggota Sipil Negara', 'Asisten Sipil Negara', '', '', 'A', '5', 'tidak', '1'],
  ['multi_pilih', 'Pilih nilai-nilai dasar ASN yang benar:', 'Berorientasi Pelayanan', 'Akuntabel', 'Kompeten', 'Koruptif', '', '', 'A,B,C', '10', 'ya', '2'],
  ['benar_salah', 'ASN wajib mengikuti pelatihan dasar.', '', '', '', '', '', '', 'Benar', '5', 'tidak', '3'],
  ['isian_singkat', 'Nilai dasar ASN yang berkaitan dengan kejujuran disebut ____', '', '', '', '', '', '', 'Akuntabel', '5', 'tidak', '4'],
  ['jodohkan', 'Jodohkan konsep dengan definisinya:', 'Integritas||Kejujuran dan komitmen', 'Loyalitas||Setia kepada negara', 'Adaptif||Mampu berubah', '', '', '', '', '5', 'tidak', '5'],
  ['pengurutan', 'Urutkan tahapan penyusunan laporan:', 'Pengumpulan data', 'Analisis data', 'Penyusunan draft', 'Finalisasi', '', '', '', '10', 'tidak', '6'],
  ['esai', 'Jelaskan peran ASN dalam pelayanan publik!', '', '', '', '', '', '', '', '20', 'tidak', '7'],
];

async function downloadQuestionTemplate() {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();

  // Sheet 1: Template
  const ws = XLSX.utils.aoa_to_sheet([QUESTION_TEMPLATE_HEADERS, ...QUESTION_TEMPLATE_EXAMPLES]);
  ws['!cols'] = [{ wch: 14 }, { wch: 50 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 6 }, { wch: 10 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Soal');

  // Sheet 2: Petunjuk
  const guide = XLSX.utils.aoa_to_sheet([
    ['Kolom', 'Keterangan'],
    ['tipe', 'pilihan_ganda | multi_pilih | benar_salah | isian_singkat | jodohkan | pengurutan | esai'],
    ['pertanyaan', 'Teks pertanyaan'],
    ['pilihan_a … pilihan_f', 'Pilihan jawaban. Untuk jodohkan: format kiri||kanan. Untuk pengurutan: item dalam urutan benar.'],
    ['jawaban_benar', 'PG: huruf (A/B/C/D). Multi: huruf dipisah koma (A,C). BS: Benar/Salah. IS: teks jawaban utama.'],
    ['poin', 'Bobot poin soal (angka, default 1)'],
    ['bank_soal', '"ya" jika soal masuk bank undian, "tidak" jika selalu muncul'],
    ['urutan', 'Nomor urut tampil (opsional)'],
  ]);
  XLSX.utils.book_append_sheet(wb, guide, 'Petunjuk');

  XLSX.writeFile(wb, 'template-soal.xlsx');
}

function QuestionImportPanel({ uuid, assessment, onDone, onClose }) {
  const fileRef = useRef(null);
  const [parsed, setParsed] = useState(null); // array of question objects
  const [parseErrors, setParseErrors] = useState([]);
  const [result, setResult] = useState(null);

  const importMut = useMutation({
    mutationFn: () => api.post(`/training-events/${uuid}/assessments/${assessment.id}/questions/import`, { questions: parsed }),
    onSuccess: (res) => { setResult(res.data); onDone(); },
  });

  const handleFile = (f) => {
    if (!f) return;
    setParsed(null); setParseErrors([]); setResult(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const XLSX = await loadXlsx();
        const wb  = XLSX.read(ev.target.result, { type: 'array' });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const rows = raw.slice(1).filter((r) => String(r[0] || '').trim()); // skip header + blank rows
        const questions = [];
        const errors    = [];
        rows.forEach((row, i) => {
          try {
            questions.push(parseQuestionRow(row, i));
          } catch (e) {
            errors.push(`Baris ${i + 2}: ${e.message}`);
          }
        });
        setParseErrors(errors);
        if (questions.length) setParsed(questions);
      } catch {
        setParseErrors(['Gagal membaca file. Pastikan format .xlsx atau .xls.']);
      }
    };
    reader.readAsArrayBuffer(f);
  };

  return (
    <div className="qmodal-form">
      <div className="qmodal-form-head">
        <strong>Import Soal dari Excel</strong>
        <button type="button" className="icon-action" onClick={onClose}><X size={14} /></button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
          Upload file Excel dengan format sesuai template. Maksimal 200 soal per import.
        </p>
        <button className="outline-button compact" style={{ flexShrink: 0 }} onClick={downloadQuestionTemplate}>
          <Download size={13} /> Unduh Template
        </button>
      </div>

      <div
        className="material-upload-zone"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        style={{ minHeight: 80 }}
      >
        <Upload size={18} />
        <span style={{ fontSize: 13 }}>
          {parsed ? `${parsed.length} soal terbaca — klik untuk ganti` : 'Klik atau seret file Excel ke sini'}
        </span>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {parseErrors.length > 0 && (
        <div className="form-error-visible" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {parseErrors.map((e, i) => <span key={i}>{e}</span>)}
        </div>
      )}

      {parsed && !result && (
        <>
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2, #f5f5f5)', textAlign: 'left' }}>
                  <th style={{ padding: '5px 8px', fontWeight: 600 }}>#</th>
                  <th style={{ padding: '5px 8px', fontWeight: 600 }}>Tipe</th>
                  <th style={{ padding: '5px 8px', fontWeight: 600 }}>Pertanyaan</th>
                  <th style={{ padding: '5px 8px', fontWeight: 600 }}>Poin</th>
                  <th style={{ padding: '5px 8px', fontWeight: 600 }}>Bank</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 8).map((q, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '5px 8px', color: 'var(--muted)' }}>{i + 1}</td>
                    <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}><em className="status-badge">{QUESTION_TYPE_LABELS[q.type]}</em></td>
                    <td style={{ padding: '5px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question}</td>
                    <td style={{ padding: '5px 8px' }}>{q.points}</td>
                    <td style={{ padding: '5px 8px' }}>{q.in_bank ? '✓' : '—'}</td>
                  </tr>
                ))}
                {parsed.length > 8 && (
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td colSpan={5} style={{ padding: '5px 8px', color: 'var(--muted)', textAlign: 'center' }}>+{parsed.length - 8} soal lainnya…</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {importMut.error && (
            <div className="form-error-visible">{importMut.error.response?.data?.message || 'Gagal mengimport.'}</div>
          )}

          <button className="primary-button compact" disabled={importMut.isPending} onClick={() => importMut.mutate()}>
            <FileSpreadsheet size={14} /> {importMut.isPending ? 'Mengimport…' : `Import ${parsed.length} Soal`}
          </button>
        </>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="resource-note" style={{ color: 'var(--success, #16a34a)' }}>
            ✓ {result.data?.imported ?? 0} soal berhasil diimport.
          </div>
          {result.data?.errors?.length > 0 && (
            <div className="form-error-visible">
              {result.data.errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
          <button className="outline-button compact" onClick={onClose}>Tutup</button>
        </div>
      )}
    </div>
  );
}

// ── Rich Text Editor (Tiptap) ─────────────────────────────────────────────────

function TbBtn({ editor, action, isActive, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); action(); }}
      style={{
        padding: '2px 7px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
        background: isActive ? 'var(--fg, #0d0d0d)' : 'transparent',
        color: isActive ? '#fff' : 'var(--fg, #0d0d0d)',
      }}
    >
      {children}
    </button>
  );
}

function RichTextEditor({ value, onChange, editorKey }) {
  const skipNextUpdate = useRef(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    onUpdate: ({ editor }) => {
      skipNextUpdate.current = true;
      onChange(editor.getHTML());
    },
  }, [editorKey]);

  useEffect(() => {
    if (!editor) return;
    if (skipNextUpdate.current) { skipNextUpdate.current = false; return; }
    const html = editor.getHTML();
    if (html !== value) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;
  const e = editor;

  return (
    <div style={{ border: '1px solid var(--border, #e3e3e3)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: '4px 6px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2, #f5f5f5)' }}>
        <TbBtn action={() => e.chain().focus().toggleBold().run()} isActive={e.isActive('bold')} title="Bold"><strong>B</strong></TbBtn>
        <TbBtn action={() => e.chain().focus().toggleItalic().run()} isActive={e.isActive('italic')} title="Italic"><em>I</em></TbBtn>
        <TbBtn action={() => e.chain().focus().toggleStrike().run()} isActive={e.isActive('strike')} title="Coret"><s>S</s></TbBtn>
        <TbBtn action={() => e.chain().focus().toggleCode().run()} isActive={e.isActive('code')} title="Kode inline">{'`'}</TbBtn>
        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '3px 3px', alignSelf: 'center' }} />
        <TbBtn action={() => e.chain().focus().toggleBulletList().run()} isActive={e.isActive('bulletList')} title="Poin">• Poin</TbBtn>
        <TbBtn action={() => e.chain().focus().toggleOrderedList().run()} isActive={e.isActive('orderedList')} title="Nomor">1. Nomor</TbBtn>
        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '3px 3px', alignSelf: 'center' }} />
        <TbBtn action={() => e.chain().focus().toggleCodeBlock().run()} isActive={e.isActive('codeBlock')} title="Blok kode">{'</>'}</TbBtn>
        <TbBtn action={() => e.chain().focus().toggleBlockquote().run()} isActive={e.isActive('blockquote')} title="Kutipan">"</TbBtn>
        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '3px 3px', alignSelf: 'center' }} />
        <TbBtn action={() => e.chain().focus().undo().run()} title="Undo">↩</TbBtn>
        <TbBtn action={() => e.chain().focus().redo().run()} title="Redo">↪</TbBtn>
      </div>
      <div style={{ padding: '8px 12px', minHeight: 80, fontSize: 14 }}>
        <style>{`.ProseMirror{outline:none;}.ProseMirror ul,.ProseMirror ol{padding-left:20px}.ProseMirror code{background:var(--surface-2,#f5f5f5);padding:1px 4px;border-radius:3px;font-size:0.9em}.ProseMirror blockquote{border-left:3px solid var(--border);margin:0;padding-left:12px;color:var(--muted)}.ProseMirror pre{background:var(--surface-2,#f5f5f5);padding:8px;border-radius:6px;overflow-x:auto}`}</style>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function QuestionsModal({ uuid, assessment, onClose }) {
  const queryClient = useQueryClient();
  const qk = ['assessment-questions', assessment.id];
  const [editing, setEditing] = useState(null); // null | 'create' | { id }
  const [form, setForm] = useState(EMPTY_QUESTION);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => (await api.get(`/training-events/${uuid}/assessments/${assessment.id}/questions`)).data.data,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: qk });
    queryClient.invalidateQueries({ queryKey: ['event-assessments', uuid] });
    setEditing(null);
  };

  const createMut = useMutation({ mutationFn: (d) => api.post(`/training-events/${uuid}/assessments/${assessment.id}/questions`, d), onSuccess: () => { invalidateAll(); toast.success('Soal ditambahkan.'); }, onError: () => toast.error('Gagal menyimpan soal.') });
  const updateMut = useMutation({ mutationFn: ({ id, ...d }) => api.put(`/training-events/${uuid}/assessments/${assessment.id}/questions/${id}`, d), onSuccess: () => { invalidateAll(); toast.success('Soal diperbarui.'); }, onError: () => toast.error('Gagal memperbarui soal.') });
  const deleteMut = useMutation({ mutationFn: (id) => api.delete(`/training-events/${uuid}/assessments/${assessment.id}/questions/${id}`), onSuccess: () => { invalidateAll(); toast.success('Soal dihapus.'); }, onError: () => toast.error('Gagal menghapus soal.') });

  const isSaving = createMut.isPending || updateMut.isPending;
  const saveError = createMut.error || updateMut.error;

  const TYPE_DEFAULTS = {
    multiple_choice: { options: ['', '', '', ''], correct_answer: '0' },
    multiple_select: { options: ['', '', '', ''], correct_answer: '' },
    true_false:      { options: ['Benar', 'Salah'], correct_answer: '0' },
    fill_in_blank:   { options: [], correct_answer: '' },
    matching:        { options: [{ left: '', right: '' }, { left: '', right: '' }], correct_answer: null },
    ordering:        { options: ['', ''], correct_answer: null },
    essay:           { options: [], correct_answer: null },
  };

  const openCreate = () => {
    createMut.reset();
    setForm(EMPTY_QUESTION);
    setEditing('create');
  };

  const openEdit = (q) => {
    updateMut.reset();
    const type = q.type || 'multiple_choice';
    let options = q.options ?? TYPE_DEFAULTS[type]?.options ?? [];
    if (type === 'true_false') options = ['Benar', 'Salah'];
    setForm({
      question:       q.question || '',
      type,
      options,
      correct_answer: q.correct_answer ?? (TYPE_DEFAULTS[type]?.correct_answer ?? ''),
      points:         q.points?.toString() || '1',
      order:          q.order?.toString() || '',
      in_bank:        q.in_bank ?? false,
    });
    setEditing({ id: q.id });
  };

  const changeType = (v) => {
    setForm((c) => ({ ...c, type: v, ...(TYPE_DEFAULTS[v] || {}) }));
  };

  const buildPayload = () => {
    let { options, correct_answer } = form;
    if (form.type === 'essay') {
      options = null; correct_answer = null;
    } else if (form.type === 'true_false') {
      options = null;
    } else if (form.type === 'matching' || form.type === 'ordering') {
      correct_answer = form.options.map((_, i) => i).join(',');
    }
    return {
      question:       form.question,
      type:           form.type,
      options,
      correct_answer,
      points:         parseInt(form.points, 10) || 1,
      order:          parseInt(form.order, 10) || (questions.length + 1),
      in_bank:        form.in_bank,
    };
  };

  const submit = () => {
    if (!stripHtml(form.question).trim()) return;
    const payload = buildPayload();
    if (editing === 'create') createMut.mutate(payload);
    else updateMut.mutate({ id: editing.id, ...payload });
  };

  const toggleCorrectMultiSelect = (idx) => {
    setForm((c) => {
      const set = new Set(c.correct_answer.split(',').filter(Boolean));
      if (set.has(String(idx))) set.delete(String(idx)); else set.add(String(idx));
      return { ...c, correct_answer: [...set].sort((a, b) => +a - +b).join(',') };
    });
  };

  const updateOption = (idx, val) =>
    setForm((c) => { const o = [...c.options]; o[idx] = val; return { ...c, options: o }; });

  const updateMatchPair = (idx, side, val) =>
    setForm((c) => { const o = [...c.options]; o[idx] = { ...o[idx], [side]: val }; return { ...c, options: o }; });

  const addOption    = (blank) => setForm((c) => ({ ...c, options: [...c.options, blank] }));
  const removeOption = (idx)   => setForm((c) => ({ ...c, options: c.options.filter((_, i) => i !== idx) }));
  const swapOptions  = (i, j)  => setForm((c) => {
    const o = [...c.options]; [o[i], o[j]] = [o[j], o[i]]; return { ...c, options: o };
  });

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box qmodal-box" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <h2>Kelola Soal</h2>
            <p className="qmodal-subtitle">{assessment.title} · {ASSESSMENT_TYPE_LABELS[assessment.type]}</p>
          </div>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        <div className="qmodal-body">
          {/* Left – question list */}
          <div className="qmodal-list-panel">
            {isLoading && <div className="resource-note">Memuat soal…</div>}
            {!isLoading && questions.length === 0 && (
              <div className="qmodal-empty">
                <HelpCircle size={26} />
                <p>Belum ada soal.</p>
                <span>Klik "+ Tambah Soal" untuk mulai.</span>
              </div>
            )}
            <div className="qmodal-list">
              {questions.map((q, i) => (
                <div key={q.id} className={`qmodal-row${editing?.id === q.id ? ' active' : ''}`} onClick={() => openEdit(q)}>
                  <span className="qmodal-num">{i + 1}</span>
                  <div className="qmodal-row-main">
                    <span className="qmodal-q-text">{stripHtml(q.question)}</span>
                    <span className="qmodal-q-meta">
                      {QUESTION_TYPE_LABELS[q.type]} · {q.points} poin
                      {q.in_bank && <em className="status-badge scheduled" style={{ marginLeft: 4, fontSize: 10 }}>Bank</em>}
                    </span>
                  </div>
                  <button className="icon-action danger-icon" title="Hapus" onClick={(e) => { e.stopPropagation(); deleteMut.mutate(q.id); }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="setup-add-btn" style={{ flex: 1 }} onClick={openCreate}><Plus size={14} /> Tambah Soal</button>
              <button className="setup-add-btn" style={{ flex: 1 }} onClick={() => { setEditing('import'); createMut.reset(); }}>
                <FileSpreadsheet size={14} /> Import Excel
              </button>
            </div>
          </div>

          {/* Right – question form */}
          <div className="qmodal-form-panel">
            {!editing ? (
              <div className="qmodal-form-empty">
                <ListChecks size={28} />
                <p>Pilih soal untuk diedit</p>
                <span>atau klik "+ Tambah Soal" / "Import Excel"</span>
              </div>
            ) : editing === 'import' ? (
              <QuestionImportPanel uuid={uuid} assessment={assessment} onDone={invalidateAll} onClose={() => setEditing(null)} />
            ) : (
              <div className="qmodal-form">
                <div className="qmodal-form-head">
                  <strong>{editing === 'create' ? 'Soal Baru' : 'Edit Soal'}</strong>
                  <button type="button" className="icon-action" onClick={() => setEditing(null)}><X size={14} /></button>
                </div>

                {/* Type selector */}
                <div className="event-field">
                  <span>Tipe Soal</span>
                  <div className="qtype-grid">
                    {QUESTION_TYPES.map(({ value, label, desc, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        className={`qtype-card${form.type === value ? ' active' : ''}`}
                        onClick={() => changeType(value)}
                      >
                        <Icon size={20} className="qtype-card-icon" />
                        <span className="qtype-card-label">{label}</span>
                        <span className="qtype-card-desc">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* WYSIWYG question editor */}
                <div className="event-field">
                  <span>Pertanyaan</span>
                  <RichTextEditor
                    key={editing?.id ?? 'create'}
                    value={form.question}
                    onChange={(html) => setForm((c) => ({ ...c, question: html }))}
                  />
                </div>

                {/* Multiple Choice */}
                {form.type === 'multiple_choice' && (
                  <label className="event-field">
                    <span>Pilihan — klik huruf untuk tandai jawaban benar</span>
                    <div className="qoptions-list">
                      {form.options.map((opt, idx) => (
                        <div key={idx} className="qoption-row">
                          <button type="button" className={`qoption-radio${form.correct_answer === String(idx) ? ' correct' : ''}`} onClick={() => setForm((c) => ({ ...c, correct_answer: String(idx) }))}>
                            {OPTION_LABELS[idx]}
                          </button>
                          <input value={opt} onChange={(e) => updateOption(idx, e.target.value)} placeholder={`Pilihan ${OPTION_LABELS[idx]}`} />
                          {form.options.length > 2 && (
                            <button type="button" className="icon-action danger-icon" onClick={() => removeOption(idx)}><X size={11} /></button>
                          )}
                        </div>
                      ))}
                    </div>
                    {form.options.length < OPTION_LABELS.length && (
                      <button type="button" className="setup-add-btn" style={{ marginTop: 4 }} onClick={() => addOption('')}><Plus size={12} /> Tambah Pilihan</button>
                    )}
                  </label>
                )}

                {/* Multiple Select */}
                {form.type === 'multiple_select' && (
                  <label className="event-field">
                    <span>Pilihan — centang huruf untuk tandai semua jawaban benar</span>
                    <div className="qoptions-list">
                      {form.options.map((opt, idx) => {
                        const isCorrect = form.correct_answer.split(',').filter(Boolean).includes(String(idx));
                        return (
                          <div key={idx} className="qoption-row">
                            <button type="button" className={`qoption-radio${isCorrect ? ' correct' : ''}`} onClick={() => toggleCorrectMultiSelect(idx)}>
                              {OPTION_LABELS[idx]}
                            </button>
                            <input value={opt} onChange={(e) => updateOption(idx, e.target.value)} placeholder={`Pilihan ${OPTION_LABELS[idx]}`} />
                            {form.options.length > 2 && (
                              <button type="button" className="icon-action danger-icon" onClick={() => removeOption(idx)}><X size={11} /></button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {form.options.length < OPTION_LABELS.length && (
                      <button type="button" className="setup-add-btn" style={{ marginTop: 4 }} onClick={() => addOption('')}><Plus size={12} /> Tambah Pilihan</button>
                    )}
                  </label>
                )}

                {/* True / False */}
                {form.type === 'true_false' && (
                  <label className="event-field">
                    <span>Jawaban Benar</span>
                    <div className="qtf-selector">
                      {['Benar', 'Salah'].map((label, idx) => (
                        <button key={idx} type="button" className={`qtf-btn${form.correct_answer === String(idx) ? ' active' : ''}`} onClick={() => setForm((c) => ({ ...c, correct_answer: String(idx) }))}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </label>
                )}

                {/* Fill in the Blank */}
                {form.type === 'fill_in_blank' && (
                  <>
                    <FormField label="Jawaban Utama">
                      <input value={form.correct_answer} onChange={(e) => setForm((c) => ({ ...c, correct_answer: e.target.value }))} placeholder="Jawaban yang diterima…" />
                    </FormField>
                    <label className="event-field">
                      <span>Alternatif Jawaban (opsional, case-insensitive)</span>
                      {form.options.map((alt, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                          <input value={alt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Alternatif ${i + 1}`} style={{ flex: 1 }} />
                          <button type="button" className="icon-action danger-icon" onClick={() => removeOption(i)}><X size={12} /></button>
                        </div>
                      ))}
                      <button type="button" className="setup-add-btn" onClick={() => addOption('')}><Plus size={12} /> Tambah Alternatif</button>
                    </label>
                  </>
                )}

                {/* Matching */}
                {form.type === 'matching' && (
                  <label className="event-field">
                    <span>Pasangan — kiri (pernyataan) dipasangkan ke kanan (jawaban)</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {form.options.map((pair, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ flexShrink: 0, fontWeight: 700, color: 'var(--muted)', width: 18, textAlign: 'center' }}>{i + 1}</span>
                          <input value={pair.left || ''} onChange={(e) => updateMatchPair(i, 'left', e.target.value)} placeholder="Pernyataan…" style={{ flex: 1 }} />
                          <span style={{ color: 'var(--muted)' }}>→</span>
                          <input value={pair.right || ''} onChange={(e) => updateMatchPair(i, 'right', e.target.value)} placeholder="Pasangan…" style={{ flex: 1 }} />
                          {form.options.length > 2 && (
                            <button type="button" className="icon-action danger-icon" onClick={() => removeOption(i)}><X size={11} /></button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="setup-add-btn" style={{ marginTop: 4 }} onClick={() => addOption({ left: '', right: '' })}><Plus size={12} /> Tambah Pasangan</button>
                  </label>
                )}

                {/* Ordering */}
                {form.type === 'ordering' && (
                  <label className="event-field">
                    <span>Item dalam urutan yang benar (atas = pertama)</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {form.options.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ flexShrink: 0, fontWeight: 700, color: 'var(--muted)', width: 18, textAlign: 'center' }}>{i + 1}</span>
                          <input value={item} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Item ${i + 1}`} style={{ flex: 1 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <button type="button" className="icon-action" style={{ padding: '1px 4px' }} disabled={i === 0} onClick={() => swapOptions(i, i - 1)}>↑</button>
                            <button type="button" className="icon-action" style={{ padding: '1px 4px' }} disabled={i === form.options.length - 1} onClick={() => swapOptions(i, i + 1)}>↓</button>
                          </div>
                          {form.options.length > 2 && (
                            <button type="button" className="icon-action danger-icon" onClick={() => removeOption(i)}><X size={11} /></button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="setup-add-btn" style={{ marginTop: 4 }} onClick={() => addOption('')}><Plus size={12} /> Tambah Item</button>
                  </label>
                )}

                {/* Essay */}
                {form.type === 'essay' && (
                  <p className="resource-note" style={{ fontSize: 12, margin: 0 }}>Jawaban esai dinilai secara manual oleh fasilitator.</p>
                )}

                {/* Footer settings */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Poin">
                    <input type="number" min="1" value={form.points} onChange={(e) => setForm((c) => ({ ...c, points: e.target.value }))} placeholder="1" />
                  </FormField>
                  <FormField label="Urutan">
                    <input type="number" min="1" value={form.order} onChange={(e) => setForm((c) => ({ ...c, order: e.target.value }))} placeholder="otomatis" />
                  </FormField>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.in_bank} onChange={(e) => setForm((c) => ({ ...c, in_bank: e.target.checked }))} />
                  Masukkan ke bank soal (ikut diundi)
                </label>

                {saveError && <div className="form-error-visible">{saveError.response?.data?.message || 'Gagal menyimpan.'}</div>}

                <div className="qmodal-form-foot">
                  <button type="button" className="outline-button compact" onClick={() => setEditing(null)}>Batal</button>
                  <button type="button" className="primary-button compact" disabled={isSaving} onClick={submit}>
                    {isSaving ? 'Menyimpan…' : 'Simpan Soal'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Submissions Modal ─────────────────────────────────────────────────────────

function renderAnswer(question, answers) {
  const raw = answers?.[question.id];
  if (raw === undefined || raw === null || raw === '') return <em style={{ color: 'var(--muted)' }}>Tidak dijawab</em>;

  if (question.type === 'multiple_choice') {
    const idx = parseInt(raw, 10);
    return <span>{OPTION_LABELS[idx]}: {question.options?.[idx] ?? raw}</span>;
  }
  if (question.type === 'multiple_select') {
    return <span>{raw.split(',').filter(Boolean).map((i) => `${OPTION_LABELS[+i]}: ${question.options?.[+i] ?? i}`).join(' | ')}</span>;
  }
  if (question.type === 'true_false') {
    return <span>{raw === '0' ? 'Benar' : 'Salah'}</span>;
  }
  if (question.type === 'matching' && Array.isArray(question.options)) {
    const pairs = raw.split(',');
    return (
      <span>{question.options.map((p, i) => `${p.left ?? p} → ${question.options[parseInt(pairs[i])]?.right ?? question.options[parseInt(pairs[i])] ?? '?'}`).join(' | ')}</span>
    );
  }
  if (question.type === 'ordering' && Array.isArray(question.options)) {
    return <span>{raw.split(',').map((i) => question.options[+i]).join(' → ')}</span>;
  }
  return <span style={{ whiteSpace: 'pre-wrap' }}>{raw}</span>;
}

function isCorrect(question, answers) {
  if (question.type === 'essay' || question.type === 'matching') return null; // partial / manual
  const given   = String(answers?.[question.id] ?? '');
  const correct = String(question.correct_answer ?? '');
  if (!given) return false;
  if (question.type === 'multiple_select') {
    const g = given.split(',').sort(); const c = correct.split(',').sort();
    return g.length === c.length && g.every((v, i) => v === c[i]);
  }
  if (question.type === 'fill_in_blank') {
    const alts = (question.options ?? []).map((a) => String(a).toLowerCase().trim());
    return given.toLowerCase().trim() === correct.toLowerCase().trim() || alts.includes(given.toLowerCase().trim());
  }
  return given === correct;
}

const TYPE_LABELS = { multiple_choice: 'Pilihan Ganda', true_false: 'Benar/Salah', essay: 'Esai' };

function SubmissionsModal({ uuid, assessment, onClose }) {
  const queryClient = useQueryClient();
  const qk = ['assessment-submissions', uuid, assessment.id];
  const [grading, setGrading] = useState(null); // { submission }
  const [score, setScore] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => (await api.get(`/training-events/${uuid}/assessments/${assessment.id}/submissions`)).data.data,
  });

  const gradeMut = useMutation({
    mutationFn: () => api.put(`/training-events/${uuid}/assessments/${assessment.id}/submissions/${grading.submission.id}/grade`, { score: parseInt(score, 10) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); setGrading(null); setScore(''); toast.success('Nilai disimpan.'); },
    onError: () => toast.error('Gagal menyimpan nilai.'),
  });

  const openGrading = (sub) => { gradeMut.reset(); setGrading({ submission: sub }); setScore(sub.score?.toString() ?? ''); };

  const typeLabel = assessment.type === 'pre_test' ? 'Pre-Test' : 'Post-Test';
  const questions = data?.questions ?? [];
  const submissions = data?.submissions ?? [];

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 860 }}>
        <div className="modal-head">
          <h2>
            {grading ? (
              <button
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }}
                onClick={() => setGrading(null)}
              >
                <ChevronLeft size={16} /> Hasil — {assessment.title}
              </button>
            ) : `Hasil — ${assessment.title}`}
          </h2>
          <button className="icon-action" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isLoading && <div className="resource-note">Memuat data…</div>}

          {/* ── Submission list ── */}
          {!isLoading && !grading && (
            <>
              {submissions.length === 0 ? (
                <div className="resource-note">Belum ada peserta yang mengumpulkan asesmen ini.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>Peserta</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>Dikumpulkan</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'center' }}>Nilai</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '6px 8px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border, #e3e3e3)' }}>
                        <td style={{ padding: '8px' }}>
                          <strong style={{ display: 'block' }}>{s.user?.name ?? '—'}</strong>
                          {s.user?.nip && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{s.user.nip}</span>}
                        </td>
                        <td style={{ padding: '8px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {s.submitted_at ? formatDateTime(s.submitted_at) : '—'}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>
                          {s.score !== null ? s.score : <em style={{ fontWeight: 400, color: 'var(--muted)' }}>—</em>}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {s.score === null
                            ? <em className="status-badge">Belum dinilai</em>
                            : s.is_passed
                              ? <em className="status-badge active">Lulus</em>
                              : <em className="status-badge" style={{ color: '#d04352' }}>Tidak lulus</em>}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <button
                            className="outline-button compact"
                            style={{ fontSize: 11 }}
                            onClick={() => openGrading(s)}
                          >
                            {s.score === null && data?.has_essay ? 'Nilai' : 'Lihat'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                {submissions.length} pengumpulan · Nilai lulus {data?.assessment?.passing_score ?? '—'} · {typeLabel}
              </div>
            </>
          )}

          {/* ── Grading view ── */}
          {!isLoading && grading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 15 }}>{grading.submission.user?.name}</strong>
                {grading.submission.user?.nip && (
                  <span style={{ fontSize: 12, color: 'var(--muted)' }}>NIP {grading.submission.user.nip}</span>
                )}
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>
                  Dikumpulkan {formatDateTime(grading.submission.submitted_at)}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {questions.map((q, i) => {
                  const correct = isCorrect(q, grading.submission.answers);
                  return (
                    <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>{i + 1}. <span dangerouslySetInnerHTML={{ __html: safe(q.question) }} /></p>
                        <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                          {TYPE_LABELS[q.type]} · {q.points ?? 1} poin
                        </span>
                      </div>
                      <div style={{ fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ color: 'var(--muted)', flexShrink: 0 }}>Jawaban:</span>
                        <span style={{ flex: 1 }}>{renderAnswer(q, grading.submission.answers)}</span>
                        {correct !== null && (
                          <em style={{ fontSize: 11, fontStyle: 'normal', color: correct ? 'var(--success, #16a34a)' : '#d04352', whiteSpace: 'nowrap' }}>
                            {correct ? '✓ Benar' : '✗ Salah'}
                          </em>
                        )}
                      </div>
                      {q.type === 'essay' && (
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--muted)' }}>Jawaban esai — perlu dinilai manual</p>
                      )}
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <label style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>Nilai (0–100):</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  style={{ width: 80, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
                  placeholder="0–100"
                />
                {gradeMut.error && (
                  <span style={{ fontSize: 12, color: '#d04352' }}>
                    {gradeMut.error.response?.data?.message || 'Gagal menyimpan.'}
                  </span>
                )}
                <button
                  className="primary-button compact"
                  style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}
                  disabled={score === '' || gradeMut.isPending}
                  onClick={() => gradeMut.mutate()}
                >
                  <Send size={13} /> {gradeMut.isPending ? 'Menyimpan…' : 'Simpan Nilai'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssessmentsSection({ uuid }) {
  const queryClient = useQueryClient();
  const qk = ['event-assessments', uuid];
  const [formModal, setFormModal] = useState(null);
  const [form, setForm] = useState(EMPTY_ASSESSMENT);
  const [questionsModal, setQuestionsModal] = useState(null);
  const [submissionsModal, setSubmissionsModal] = useState(null);

  const { data = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => (await api.get(`/training-events/${uuid}/assessments`)).data.data,
  });

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: qk }); setFormModal(null); };
  const createMut = useMutation({ mutationFn: (d) => api.post(`/training-events/${uuid}/assessments`, d), onSuccess: () => { invalidate(); toast.success('Asesmen ditambahkan.'); }, onError: () => toast.error('Gagal menyimpan asesmen.') });
  const updateMut = useMutation({ mutationFn: ({ id, ...d }) => api.put(`/training-events/${uuid}/assessments/${id}`, d), onSuccess: () => { invalidate(); toast.success('Asesmen diperbarui.'); }, onError: () => toast.error('Gagal memperbarui asesmen.') });
  const deleteMut = useMutation({ mutationFn: (id) => api.delete(`/training-events/${uuid}/assessments/${id}`), onSuccess: () => { invalidate(); toast.success('Asesmen dihapus.'); }, onError: () => toast.error('Gagal menghapus asesmen.') });

  const isSaving = createMut.isPending || updateMut.isPending;
  const saveError = createMut.error || updateMut.error;

  const openCreate = () => { createMut.reset(); setForm(EMPTY_ASSESSMENT); setFormModal({ type: 'create' }); };
  const openEdit = (a) => {
    updateMut.reset();
    setForm({ type: a.type, title: a.title, instructions: a.instructions || '', passing_score: a.passing_score?.toString() || '70', time_limit_minutes: a.time_limit_minutes?.toString() || '', bank_draw_count: a.bank_draw_count?.toString() || '', status: a.status });
    setFormModal({ type: 'edit', id: a.id });
  };

  const submit = () => {
    if (!form.title.trim()) return;
    const payload = { type: form.type, title: form.title, instructions: form.instructions || null, passing_score: parseInt(form.passing_score, 10) || 70, time_limit_minutes: parseInt(form.time_limit_minutes, 10) || null, bank_draw_count: parseInt(form.bank_draw_count, 10) || null, status: form.status };
    if (formModal.type === 'edit') updateMut.mutate({ id: formModal.id, ...payload });
    else createMut.mutate(payload);
  };

  return (
    <SetupSection icon={ClipboardList} title="Assessments" count={data.length} accent="amber">
      {isLoading && <div className="resource-note">Memuat asesmen…</div>}
      {!isLoading && data.length === 0 && <div className="resource-note">Belum ada asesmen. Tambahkan pre-test atau post-test.</div>}

      <div className="setup-list">
        {data.map((a) => (
          <div className="setup-row" key={a.id}>
            <span className={`setup-type-icon setup-icon--${a.type === 'pre_test' ? 'grape' : 'emerald'}`}>
              <CheckCircle2 size={14} />
            </span>
            <div className="setup-row-main">
              <strong>{a.title}</strong>
              <span>
                {ASSESSMENT_TYPE_LABELS[a.type]}
                {a.passing_score != null && ` · Nilai lulus ${a.passing_score}`}
                {a.time_limit_minutes && ` · ${a.time_limit_minutes} menit`}
              </span>
            </div>
            <em className={`status-badge ${a.status === 'published' ? 'active' : ''}`}>
              {ASSESSMENT_STATUS_LABELS[a.status] || a.status}
            </em>
            <div className="setup-row-actions">
              <button
                className="outline-button compact"
                style={{ fontSize: 11, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setQuestionsModal(a)}
                title="Kelola soal"
              >
                <HelpCircle size={12} />
                Soal{a.questions_count > 0 && ` (${a.questions_count})`}
              </button>
              <button
                className="outline-button compact"
                style={{ fontSize: 11, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 4 }}
                onClick={() => setSubmissionsModal(a)}
                title="Lihat hasil"
              >
                <Award size={12} /> Hasil
              </button>
              <button className="icon-action" title="Edit" onClick={() => openEdit(a)}><Pencil size={13} /></button>
              <button className="icon-action danger-icon" title="Hapus" onClick={() => deleteMut.mutate(a.id)}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      <button className="setup-add-btn" onClick={openCreate}><Plus size={14} /> Tambah Asesmen</button>

      {questionsModal && (
        <QuestionsModal uuid={uuid} assessment={questionsModal} onClose={() => setQuestionsModal(null)} />
      )}

      {submissionsModal && (
        <SubmissionsModal uuid={uuid} assessment={submissionsModal} onClose={() => setSubmissionsModal(null)} />
      )}

      {formModal && (
        <RowModal title={formModal.type === 'edit' ? 'Edit Asesmen' : 'Asesmen Baru'} onClose={() => setFormModal(null)} onSubmit={submit} isSaving={isSaving} error={saveError} maxWidth={600}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Tipe">
              <select value={form.type} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))}>
                {Object.entries(ASSESSMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </FormField>
            <FormField label="Status">
              <select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}>
                {Object.entries(ASSESSMENT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </FormField>
          </div>
          <FormField label="Judul Asesmen">
            <input autoFocus required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder="Contoh: Pre-Test Kompetensi Digital" />
          </FormField>
          <FormField label="Petunjuk Pengerjaan">
            <textarea rows={2} value={form.instructions} onChange={(e) => setForm((c) => ({ ...c, instructions: e.target.value }))} placeholder="Baca soal dengan teliti sebelum menjawab…" />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Nilai Lulus (0–100)">
              <input type="number" min="0" max="100" value={form.passing_score} onChange={(e) => setForm((c) => ({ ...c, passing_score: e.target.value }))} placeholder="70" />
            </FormField>
            <FormField label="Batas Waktu (menit)">
              <input type="number" min="1" value={form.time_limit_minutes} onChange={(e) => setForm((c) => ({ ...c, time_limit_minutes: e.target.value }))} placeholder="opsional" />
            </FormField>
            <FormField label="Undian Bank Soal">
              <input type="number" min="1" value={form.bank_draw_count} onChange={(e) => setForm((c) => ({ ...c, bank_draw_count: e.target.value }))} placeholder="tampilkan semua" />
            </FormField>
          </div>
        </RowModal>
      )}
    </SetupSection>
  );
}

// ── Participants ──────────────────────────────────────────────────────────────

const PARTICIPANT_STATUS_LABELS = { enrolled: 'Terdaftar', completed: 'Selesai', dropped: 'Keluar' };
const PARTICIPANT_STATUS_ACCENTS = { enrolled: 'active', completed: 'scheduled', dropped: '' };

// ── Add Participant Modal (3 methods) ─────────────────────────────────────────

const PICKER_TABS = [
  { id: 'search', label: 'Cari Pengguna', icon: Search },
  { id: 'opd',    label: 'Dari OPD',      icon: Building2 },
  { id: 'excel',  label: 'Import Excel',  icon: Upload },
];

function PickerUserRow({ user, enrolled, onAdd }) {
  return (
    <div className={`picker-row${enrolled ? ' already' : ''}`}>
      <div className="picker-avatar">{(user.name || '?')[0].toUpperCase()}</div>
      <div className="picker-row-info">
        <strong>{user.name}</strong>
        <span>{user.nip || user.email}</span>
        {user.opd_name && <em className="picker-opd">{user.opd_name}</em>}
        {user.organization_unit_name && <em className="picker-opd">{user.organization_unit_name}</em>}
      </div>
      {enrolled
        ? <span className="picker-enrolled"><UserCheck size={13} /> Terdaftar</span>
        : <button className="primary-button compact" onClick={() => onAdd(user)}>+ Tambah</button>}
    </div>
  );
}

function SearchTab({ uuid, enrolledIds, onAdd }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['participant-search', uuid, search, page],
    queryFn: async () => (await api.get(`/training-events/${uuid}/participants/search`, {
      params: { search, page, per_page: 10 },
    })).data.data,
    placeholderData: (prev) => prev,
  });

  const users = data?.data ?? [];
  const lastPage = data?.last_page ?? 1;

  return (
    <>
      <div className="picker-search">
        <Search size={14} />
        <input
          autoFocus
          placeholder="Cari nama, NIP, atau email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
      <div className="picker-list">
        {isLoading && <div className="resource-note">Mencari…</div>}
        {!isLoading && users.length === 0 && <div className="resource-note">Tidak ada hasil.</div>}
        {users.map((u) => (
          <PickerUserRow key={u.id} user={u} enrolled={enrolledIds.has(u.id)} onAdd={onAdd} />
        ))}
      </div>
      {lastPage > 1 && (
        <div className="picker-pagination">
          <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
          <span>{page} / {lastPage}</span>
          <button className="outline-button compact" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>Next ›</button>
        </div>
      )}
    </>
  );
}


function ExcludeAsnPicker({ uuid, value, onChange }) {
  const [search, setSearch] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!showDrop) return undefined;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDrop]);

  const { data: results = [] } = useQuery({
    queryKey: ['exclude-asn-search', uuid, search],
    queryFn: async () => (await api.get(`/training-events/${uuid}/participants/search`, {
      params: { search, per_page: 8 },
    })).data.data.data,
    enabled: search.length >= 2,
    placeholderData: (prev) => prev,
  });

  const filtered = results.filter((u) => !value.some((v) => v.id === u.id));

  const add = (user) => {
    onChange([...value, { id: user.id, name: user.name, nip: user.nip }]);
    setSearch('');
    setShowDrop(false);
  };

  return (
    <div className="opd-exclude-box">
      <div className="opd-exclude-label">
        <span>Kecualikan ASN</span>
        {value.length > 0 && (
          <button type="button" className="text-link-sm" onClick={() => onChange([])}>Hapus semua</button>
        )}
      </div>
      {value.length > 0 && (
        <div className="facilitator-chips">
          {value.map((u) => (
            <span key={u.id} className="facilitator-chip">
              {u.name || u.nip}
              <button type="button" onClick={() => onChange(value.filter((v) => v.id !== u.id))}><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      <div ref={ref} style={{ position: 'relative' }}>
        <div className="picker-search" style={{ paddingTop: 5, paddingBottom: 5 }}>
          <Search size={13} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDrop(e.target.value.length >= 2); }}
            onFocus={() => search.length >= 2 && setShowDrop(true)}
            placeholder="Cari NIP atau nama untuk dikecualikan…"
          />
        </div>
        {showDrop && filtered.length > 0 && (
          <div className="facilitator-dropdown" style={{ zIndex: 80 }}>
            <div className="facilitator-option-list">
              {filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="facilitator-option"
                  onMouseDown={(e) => { e.preventDefault(); add(u); }}
                >
                  <span className="facilitator-option-name">{u.name}</span>
                  <span className="facilitator-option-inst">{u.nip || u.email}</span>
                  {u.opd_name && <em className="picker-opd" style={{ marginLeft: 'auto' }}>{u.opd_name}</em>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OpdTab({ uuid, enrolledIds, onAdd, onBulkDone }) {
  const [selectedOpds, setSelectedOpds] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [excludeUsers, setExcludeUsers] = useState([]);
  const { data: opds = [], isLoading: opdsLoading } = useQuery({
    queryKey: ['participant-opds', uuid],
    queryFn: async () => (await api.get(`/training-events/${uuid}/participants/opds`)).data.data,
  });

  useEffect(() => {
    if (!initialized && opds.length > 0) {
      setSelectedOpds(opds.map((o) => o.opd_name));
      setInitialized(true);
    }
  }, [opds, initialized]);

  const allSelected = opds.length > 0 && selectedOpds.length === opds.length;
  const noneSelected = selectedOpds.length === 0;

  const toggleOpd = (name) => setSelectedOpds((prev) =>
    prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
  );

  const excludeNips = excludeUsers.map((u) => u.nip).filter(Boolean);
  const excludeOpds = opds.map((o) => o.opd_name).filter((n) => !selectedOpds.includes(n));
  const totalSelected = opds.filter((o) => selectedOpds.includes(o.opd_name)).reduce((s, o) => s + o.user_count, 0);

  const bulkMut = useMutation({
    mutationFn: () => api.post(`/training-events/${uuid}/participants/bulk-all`, {
      exclude_opds: excludeOpds,
      exclude_nips: excludeNips,
    }),
    onSuccess: (res) => { onBulkDone(); toast.success(res.data?.message || 'Peserta berhasil didaftarkan.'); },
    onError: () => toast.error('Gagal mendaftarkan peserta.'),
  });

  return (
    <>
      <div className="opd-select-header">
         <label className="opd-select-all-label">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = !allSelected && !noneSelected; }}
            onChange={() => allSelected ? setSelectedOpds([]) : setSelectedOpds(opds.map((o) => o.opd_name))}
            disabled={opdsLoading}
          />
          Pilih Semua
        </label>
        <button type="button" className="opd-clear-btn" title="Hapus Semua" onClick={() => setSelectedOpds([])} disabled={noneSelected || opdsLoading}>
          <X size={14} />
        </button>
      </div>

      <div className="opd-checkbox-list">
        {opdsLoading && <div className="resource-note" style={{ padding: '10px 12px' }}>Memuat OPD…</div>}
        {!opdsLoading && opds.length === 0 && (
          <div className="resource-note" style={{ padding: '10px 12px' }}>Tidak ada data OPD.</div>
        )}
        {opds.map((o) => (
          <label key={o.opd_name} className="opd-checkbox-item">
            <span className="opd-checkbox-name">{o.opd_name}</span>
            <span className="opd-checkbox-count">{o.user_count} pengguna</span>
            <input
              type="checkbox"
              checked={selectedOpds.includes(o.opd_name)}
              onChange={() => toggleOpd(o.opd_name)}
            />
          </label>
        ))}
      </div>

      <ExcludeAsnPicker uuid={uuid} value={excludeUsers} onChange={setExcludeUsers} />


      <button
        className="primary-button"
        disabled={bulkMut.isPending || noneSelected || totalSelected === 0}
        onClick={() => bulkMut.mutate()}
      >
        {bulkMut.isPending
          ? 'Mendaftarkan…'
          : allSelected
            ? `Daftarkan Semua OPD (${totalSelected})`
            : `Daftarkan ${selectedOpds.length} OPD (${totalSelected})`}
      </button>
    </>
  );
}

function ExcelTab({ uuid, onImportDone }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState(null);
  const [parseError, setParseError] = useState('');
  const [result, setResult] = useState(null);

  const downloadTemplate = async () => {
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['NIP', 'Nama (opsional)'],
      ['197801012006041001', 'Contoh ASN'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Peserta');
    XLSX.writeFile(wb, 'template-peserta.xlsx');
  };

  const handleFile = (f) => {
    if (!f) return;
    setParseError('');
    setRows(null);
    setResult(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const XLSX = await loadXlsx();
        const wb = XLSX.read(ev.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const nips = raw
          .slice(1)
          .map((row) => String(row[0] || '').trim())
          .filter(Boolean);
        if (nips.length === 0) {
          setParseError('File tidak berisi NIP. Pastikan kolom A berisi NIP peserta.');
          return;
        }
        setRows(nips);
      } catch {
        setParseError('Gagal membaca file. Pastikan format file adalah .xlsx atau .xls.');
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const importMut = useMutation({
    mutationFn: () => api.post(`/training-events/${uuid}/participants/import`, { nips: rows }),
    onSuccess: (res) => {
      setResult(res.data);
      onImportDone();
      toast.success(res.data?.message || 'Import berhasil.');
    },
    onError: () => toast.error('Gagal mengimport peserta.'),
  });

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="excel-import-header">
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
          Upload file Excel (.xlsx) dengan kolom <strong>NIP</strong> di kolom A (baris pertama adalah header).
        </p>
        <button className="outline-button compact" onClick={downloadTemplate}>
          <Download size={13} /> Unduh Template
        </button>
      </div>

      <div
        className="material-upload-zone"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
      >
        <Upload size={20} />
        <span>{rows ? `${rows.length} NIP ditemukan — klik untuk ganti` : 'Klik atau seret file Excel ke sini'}</span>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {parseError && <div className="form-error-visible">{parseError}</div>}

      {rows && !result && (
        <>
          <div className="excel-preview-list">
            <p className="mono-kicker text-muted" style={{ marginBottom: 4 }}>Preview NIP ({rows.length})</p>
            {rows.slice(0, 8).map((nip, i) => (
              <div key={i} className="excel-preview-row"><span>{nip}</span></div>
            ))}
            {rows.length > 8 && <div className="excel-preview-row text-muted">+{rows.length - 8} lainnya…</div>}
          </div>
          <button
            className="primary-button"
            disabled={importMut.isPending}
            onClick={() => importMut.mutate()}
          >
            {importMut.isPending ? 'Mengimport…' : `Import ${rows.length} Peserta`}
          </button>
          {importMut.error && (
            <div className="form-error-visible">
              {importMut.error.response?.data?.message || 'Gagal mengimport.'}
            </div>
          )}
        </>
      )}

      {result && (
        <div className="excel-result">
          <div className="form-success-note">{result.message}</div>
          {result.data?.not_found_nips?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                NIP tidak ditemukan di sistem ({result.data.not_found_nips.length}):
              </p>
              <div className="excel-preview-list">
                {result.data.not_found_nips.slice(0, 5).map((nip) => (
                  <div key={nip} className="excel-preview-row not-found"><span>{nip}</span></div>
                ))}
                {result.data.not_found_nips.length > 5 && (
                  <div className="excel-preview-row text-muted">+{result.data.not_found_nips.length - 5} lainnya</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AddParticipantModal({ uuid, enrolledIds, onAdd, onBulkDone, onClose }) {
  const [tab, setTab] = useState('search');

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <h2>Tambah Peserta</h2>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        <div className="picker-tabs">
          {PICKER_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`picker-tab${tab === id ? ' active' : ''}`}
              onClick={() => setTab(id)}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
          {tab === 'search' && <SearchTab uuid={uuid} enrolledIds={enrolledIds} onAdd={onAdd} />}
          {tab === 'opd'    && <OpdTab    uuid={uuid} enrolledIds={enrolledIds} onAdd={onAdd} onBulkDone={onBulkDone} />}
          {tab === 'excel'  && <ExcelTab  uuid={uuid} onImportDone={onBulkDone} />}
        </div>
      </div>
    </div>
  );
}

const PARTICIPANT_PAGE_SIZE = 20;

function ParticipantsSection({ uuid, quota, canManageParticipants = false }) {
  const queryClient = useQueryClient();
  const qk = ['event-participants', uuid];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());

  const { data = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => (await api.get(`/training-events/${uuid}/participants`)).data.data,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk });
    setSelected(new Set());
  };

  const addMut = useMutation({
    mutationFn: (userId) => api.post(`/training-events/${uuid}/participants`, { user_id: userId }),
    onSuccess: () => { invalidate(); toast.success('Peserta ditambahkan.'); },
    onError: () => toast.error('Gagal menambahkan peserta.'),
  });
  const removeMut = useMutation({
    mutationFn: (userId) => api.delete(`/training-events/${uuid}/participants/${userId}`),
    onSuccess: () => { invalidate(); toast.success('Peserta dihapus.'); },
    onError: () => toast.error('Gagal menghapus peserta.'),
  });
  const bulkRemoveMut = useMutation({
    mutationFn: (userIds) => api.post(`/training-events/${uuid}/participants/bulk-remove`, { user_ids: userIds }),
    onSuccess: (res) => { invalidate(); toast.success(res.data?.message || 'Peserta dihapus.'); },
    onError: () => toast.error('Gagal menghapus peserta.'),
  });

  const totalPages = Math.ceil(data.length / PARTICIPANT_PAGE_SIZE);
  const pageData = data.slice((page - 1) * PARTICIPANT_PAGE_SIZE, page * PARTICIPANT_PAGE_SIZE);

  const allPageSelected = pageData.length > 0 && pageData.every((p) => selected.has(p.id));
  const somePageSelected = pageData.some((p) => selected.has(p.id));

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAllPage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageData.forEach((p) => next.delete(p.id));
      } else {
        pageData.forEach((p) => next.add(p.id));
      }
      return next;
    });
  };

  const handleBulkRemove = () => {
    const userIds = data.filter((p) => selected.has(p.id)).map((p) => p.user_id);
    bulkRemoveMut.mutate(userIds);
  };

  const enrolledIds = new Set(data.map((p) => p.user_id));
  const quotaLabel = quota ? `${data.length} / ${quota}` : `${data.length}`;

  return (
    <SetupSection icon={Users} title="Peserta" count={data.length} accent="sky">
      {isLoading && <div className="resource-note">Memuat peserta…</div>}

      {!isLoading && data.length === 0 && (
        <div className="material-empty">
          <Users size={28} />
          <p>Belum ada peserta terdaftar.</p>
          <span>Tambahkan peserta via pencarian, OPD, atau import Excel.</span>
        </div>
      )}

      {data.length > 0 && (
        <>
          {canManageParticipants && (
            <div className="participant-bulk-bar">
              <label className="opd-select-all-label" style={{ flex: 1 }}>
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  ref={(el) => { if (el) el.indeterminate = !allPageSelected && somePageSelected; }}
                  onChange={toggleAllPage}
                />
                {selected.size > 0 ? `${selected.size} dipilih` : 'Pilih Semua'}
              </label>
              {selected.size > 0 && (
                <button
                  className="outline-button compact danger-outline-button"
                  disabled={bulkRemoveMut.isPending}
                  onClick={handleBulkRemove}
                >
                  <Trash2 size={13} /> Hapus ({selected.size})
                </button>
              )}
            </div>
          )}

          <div className="participant-list">
            {pageData.map((p) => (
              <div className="participant-row" key={p.id}>
                {canManageParticipants && (
                  <input
                    type="checkbox"
                    className="participant-check"
                    checked={selected.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                  />
                )}
                <div className="participant-avatar">{(p.user?.name || '?')[0].toUpperCase()}</div>
                <div className="participant-info">
                  <strong>{p.user?.name}</strong>
                  <span>{p.user?.nip || p.user?.email}</span>
                </div>
                <em className={`status-badge ${PARTICIPANT_STATUS_ACCENTS[p.status] || ''}`}>
                  {PARTICIPANT_STATUS_LABELS[p.status] || p.status}
                </em>
                {canManageParticipants && (
                  <button
                    className="icon-action danger-icon"
                    title="Hapus peserta"
                    onClick={() => removeMut.mutate(p.user_id)}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="picker-pagination">
              <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
              <span>{page} / {totalPages}</span>
              <button className="outline-button compact" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next ›</button>
            </div>
          )}
        </>
      )}

      {canManageParticipants ? (
        <div className="participant-footer">
          {quota > 0 && (
            <span className="participant-quota">
              <Users size={12} /> {quotaLabel} peserta
            </span>
          )}
          <button className="setup-add-btn" style={{ flex: 1 }} onClick={() => setPickerOpen(true)}>
            <Plus size={14} /> Tambah Peserta
          </button>
        </div>
      ) : (
        <p className="resource-note" style={{ margin: 0, fontSize: 12 }}>
          Daftar peserta hanya dapat dilihat oleh fasilitator yang ditugaskan.
        </p>
      )}

      {pickerOpen && (
        <AddParticipantModal
          uuid={uuid}
          enrolledIds={enrolledIds}
          onAdd={(u) => addMut.mutate(u.id)}
          onBulkDone={invalidate}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </SetupSection>
  );
}

// ── Preview panel ─────────────────────────────────────────────────────────────

function EventSetupPreview({ event, uuid, onBannerChange, canUploadBanner = false }) {
  const bannerInputRef = useRef(null);

  const { data: sessions = [] } = useQuery({ queryKey: ['event-sessions', uuid], queryFn: async () => (await api.get(`/training-events/${uuid}/sessions`)).data.data, enabled: !!uuid });
  const { data: materials = [] } = useQuery({ queryKey: ['event-materials', uuid], queryFn: async () => (await api.get(`/training-events/${uuid}/materials`)).data.data, enabled: !!uuid });
  const { data: assessments = [] } = useQuery({ queryKey: ['event-assessments', uuid], queryFn: async () => (await api.get(`/training-events/${uuid}/assessments`)).data.data, enabled: !!uuid });

  const totalSections = 3;
  const filledSections = [sessions.length > 0, materials.length > 0, assessments.length > 0].filter(Boolean).length;
  const progressPct = Math.round((filledSections / totalSections) * 100);

  const preTest = assessments.find((a) => a.type === 'pre_test');
  const postTest = assessments.find((a) => a.type === 'post_test');

  return (
    <aside className="event-preview">
      <p className="mono-kicker text-muted">Pratinjau</p>

      {/* Banner */}
      <div className="setup-banner-wrap">
        {event.banner_url ? (
          <img src={event.banner_url} alt="Banner" className="setup-banner-img" />
        ) : (
          <div className="setup-banner-placeholder">
            <Image size={24} />
            <span>Belum ada banner</span>
          </div>
        )}
        {canUploadBanner && (
          <button
            type="button"
            className="setup-banner-btn"
            title="Unggah banner"
            onClick={() => bannerInputRef.current?.click()}
          >
            <Camera size={14} /> Unggah Banner
          </button>
        )}
        <input
          ref={bannerInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files[0]; if (f) onBannerChange(f); }}
        />
      </div>

      {/* Event card */}
      <div className="event-preview-card">
        <div className="event-preview-card-header">
          <span className={`status-badge ${event.status === 'active' ? 'active' : ''}`}>{event.status}</span>
          {event.location && <span className="event-preview-loc"><MapPin size={11} />{event.location}</span>}
        </div>
        <h3 className="event-preview-title">{event.title}</h3>
        {event.description && <p className="event-preview-desc">{event.description}</p>}
        <div className="event-preview-list">
          <div><Users size={14} /><span>{formatQuota(event.quota)}</span></div>
          {(event.facilitators || []).length > 0 && (
            <div><User size={14} /><span>{event.facilitators.map((f) => f.user?.name).filter(Boolean).join(', ')}</span></div>
          )}
          {event.start_date && (
            <div><Clock size={14} /><span>{formatDate(event.start_date)} – {formatDate(event.end_date)}</span></div>
          )}
          <div>
            <span style={{ fontSize: 14 }}>💳</span>
            <span>
              {event.is_paid
                ? (event.price ? `Rp ${Number(event.price).toLocaleString('id-ID')}` : 'Berbayar')
                : 'Gratis'}
            </span>
          </div>
        </div>
      </div>

      {/* Completion */}
      <div className="event-form-completion">
        <div className="event-form-completion-head">
          <span>Kelengkapan Konten</span>
          <strong>{filledSections}/{totalSections} bagian</strong>
        </div>
        <div className="event-form-progress-track">
          <span style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Checklist */}
      <div className="event-checklist">
        {[
          { label: `Learning Path (${sessions.length} sesi)`, done: sessions.length > 0, accent: 'grape' },
          { label: `Materials (${materials.length} materi)`, done: materials.length > 0, accent: 'emerald' },
          { label: `Assessments (${assessments.length} asesmen)`, done: assessments.length > 0, accent: 'amber' },
        ].map(({ label, done }) => (
          <div key={label} className={done ? 'done' : ''}>
            <CheckCircle2 size={13} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Sessions preview */}
      {sessions.length > 0 && (
        <div className="setup-preview-section">
          <p className="mono-kicker text-muted" style={{ fontSize: 9, marginBottom: 6 }}>KURIKULUM</p>
          {sessions.map((s, i) => (
            <div key={s.id} className="setup-preview-row">
              <span className="setup-order" style={{ fontSize: 10 }}>{i + 1}</span>
              <span style={{ fontSize: 12, flex: 1 }}>{s.title}</span>
              {s.duration_minutes && <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{s.duration_minutes}m</span>}
            </div>
          ))}
        </div>
      )}

      {/* Assessments preview */}
      {(preTest || postTest) && (
        <div className="setup-preview-section">
          <p className="mono-kicker text-muted" style={{ fontSize: 9, marginBottom: 6 }}>ASESMEN</p>
          {preTest && (
            <div className="setup-preview-row">
              <span className={`setup-type-icon setup-icon--grape`} style={{ width: 20, height: 20, borderRadius: 4 }}><CheckCircle2 size={11} /></span>
              <span style={{ fontSize: 12, flex: 1 }}>Pre-Test</span>
              <em className={`status-badge ${preTest.status === 'published' ? 'active' : ''}`} style={{ fontSize: 9 }}>
                {ASSESSMENT_STATUS_LABELS[preTest.status]}
              </em>
            </div>
          )}
          {postTest && (
            <div className="setup-preview-row">
              <span className={`setup-type-icon setup-icon--emerald`} style={{ width: 20, height: 20, borderRadius: 4 }}><CheckCircle2 size={11} /></span>
              <span style={{ fontSize: 12, flex: 1 }}>Post-Test</span>
              <em className={`status-badge ${postTest.status === 'published' ? 'active' : ''}`} style={{ fontSize: 9 }}>
                {ASSESSMENT_STATUS_LABELS[postTest.status]}
              </em>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FacilitatorEventSetup({ session }) {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const roles = getRoleNames(session?.user);
  const canUpdateEvent = roles.includes('super-admin') || hasAnyPermission(session, 'update training event');

  const { data: event, isLoading, isError } = useQuery({
    queryKey: ['training-event-detail', uuid],
    queryFn: async () => (await api.get(`/training-events/${uuid}`)).data.data,
    enabled: !!uuid,
  });

  const bannerMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('banner', file);
      return api.post(`/training-events/${uuid}/banner`, fd);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['training-event-detail', uuid] }); toast.success('Banner diperbarui.'); },
    onError: () => toast.error('Gagal mengunggah banner.'),
  });

  if (isLoading) {
    return <div className="page-stack"><div className="resource-note">Memuat event…</div></div>;
  }

  if (isError || !event) {
    return <div className="page-stack"><div className="form-error-visible">Event tidak ditemukan atau Anda tidak memiliki akses.</div></div>;
  }

  return (
    <div className="page-stack">
      <div className="page-head">
        <div className="setup-page-kicker">
          <button className="icon-action" onClick={() => navigate('/training-events')} title="Kembali">
            <ArrowLeft size={16} />
          </button>
          <p className="mono-kicker text-muted">Setup Event</p>
        </div>
        <h1>{event.title}</h1>
      </div>

      <div className="setup-page-layout">
        <div className="setup-page-main">
          <SessionsSection uuid={uuid} eventStart={event.start_date} eventEnd={event.end_date} />
          <MaterialsSection uuid={uuid} />
          <AssessmentsSection uuid={uuid} />
          <ParticipantsSection uuid={uuid} quota={event.quota} canManageParticipants={canUpdateEvent} />
        </div>

        <EventSetupPreview
          event={event}
          uuid={uuid}
          canUploadBanner={canUpdateEvent}
          onBannerChange={(file) => bannerMutation.mutate(file)}
        />
      </div>
    </div>
  );
}
