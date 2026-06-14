import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  FileText,
  Link,
  Pencil,
  Plus,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

const MATERIAL_TYPE_ICONS  = { document: FileText, video: Video, link: Link, presentation: BookOpen };
const MATERIAL_TYPE_LABELS = { document: 'Dokumen', video: 'Video', link: 'Tautan', presentation: 'Presentasi' };
const MATERIAL_TYPE_ACCENTS = { document: 'emerald', video: 'crimson', link: 'grape', presentation: 'amber' };
const EMPTY_FORM = { title: '', type: 'document', url: '', description: '', order: '' };
const MAX_FILE_BYTES = 1000 * 1024 * 1024;

function formatDate(d) {
  if (!d) return '—';
  const s = d.length > 10 ? d.substring(0, 10) : d;
  return new Date(`${s}T00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function guessMediaType(src = '') {
  const ext = src.split('.').pop().toLowerCase().split('?')[0];
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

function UrlPreview({ url }) {
  if (!url) return null;
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  if (ytMatch) {
    const vid = ytMatch[1];
    return (
      <div className="url-preview-box">
        <img src={`https://img.youtube.com/vi/${vid}/hqdefault.jpg`} alt="YouTube thumbnail" className="url-preview-thumb" />
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

function FilePreview({ src, fileName }) {
  const t = guessMediaType(src);
  if (t === 'image') {
    return <img src={src} alt={fileName} style={{ maxHeight: 120, maxWidth: '100%', objectFit: 'contain' }} />;
  }
  if (t === 'video') {
    return <video src={src} controls style={{ maxHeight: 120, maxWidth: '100%' }} />;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <FileText size={16} />
      <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{fileName || src.split('/').pop()}</span>
    </div>
  );
}

// ── Material form modal ────────────────────────────────────────────────────────

function MaterialModal({ uuid, material, onClose, onSuccess }) {
  const [form, setForm] = useState(
    material
      ? { title: material.title, type: material.type || 'document', url: material.url || '', description: material.description || '', order: material.order?.toString() || '' }
      : EMPTY_FORM,
  );
  const [inputMode, setInputMode] = useState(material?.file_url ? 'file' : 'url');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(material?.file_url || null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!selectedFile) return undefined;
    const url = URL.createObjectURL(selectedFile);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  const buildFormData = (extra = {}) => {
    const fd = new FormData();
    fd.append('title', form.title);
    fd.append('type', form.type);
    fd.append('description', form.description || '');
    fd.append('order', parseInt(form.order, 10) || 1);
    if (inputMode === 'file' && selectedFile) {
      fd.append('file', selectedFile);
    } else if (inputMode === 'url') {
      fd.append('url', form.url || '');
    }
    Object.entries(extra).forEach(([k, v]) => fd.append(k, v));
    return fd;
  };

  const shouldClearFile = material?.file_url && inputMode === 'file' && !selectedFile && !filePreviewUrl;

  const saveMut = useMutation({
    mutationFn: () => material
      ? api.post(`/training-events/${uuid}/materials/${material.id}?_method=PUT`, buildFormData(shouldClearFile ? { clear_file: '1' } : {}))
      : api.post(`/training-events/${uuid}/materials`, buildFormData()),
    onSuccess: () => onSuccess(),
  });

  const pickFile = (f) => {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      setFileError(`File terlalu besar (${(f.size / 1024 / 1024).toFixed(1)} MB). Maks. 1000 MB.`);
      return;
    }
    setFileError(null);
    setSelectedFile(f);
  };

  const clearFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 740 }}>
        <div className="modal-head">
          <h2>{material ? 'Edit Materi' : 'Materi Baru'}</h2>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        <form
          className="modal-body"
          style={{ display: 'grid', gap: 16 }}
          onSubmit={(e) => { e.preventDefault(); if (!form.title.trim() || fileError) return; saveMut.mutate(); }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

            {/* Left: title, type, order */}
            <div style={{ display: 'grid', gap: 14 }}>
              <label className="fm-field">
                <span>Judul Materi</span>
                <input
                  autoFocus
                  required
                  value={form.title}
                  onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))}
                  placeholder="Contoh: Modul 1 – Dasar Kompetensi"
                />
              </label>

              <div className="fm-field">
                <span>Tipe Materi</span>
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
              </div>

              <label className="fm-field">
                <span>Urutan</span>
                <input
                  type="number"
                  min="1"
                  value={form.order}
                  onChange={(e) => setForm((c) => ({ ...c, order: e.target.value }))}
                  placeholder="1"
                />
              </label>
            </div>

            {/* Right: source + description */}
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
                      style={{ border: '1px solid var(--border)', padding: '9px 11px', width: '100%', background: '#fff', color: 'var(--fg)', font: 'inherit', outline: 'none', boxSizing: 'border-box' }}
                    />
                    <UrlPreview url={form.url} />
                  </>
                )}

                {inputMode === 'file' && (
                  <div className="material-file-area">
                    {filePreviewUrl ? (
                      <div className="material-file-preview">
                        <FilePreview src={filePreviewUrl} fileName={selectedFile?.name || ''} />
                        <button type="button" className="material-file-clear" onClick={clearFile}>
                          <X size={12} /> Hapus file
                        </button>
                      </div>
                    ) : (
                      <label
                        className={`material-upload-zone${isDragging ? ' drag-over' : ''}${fileError ? ' upload-error' : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); pickFile(e.dataTransfer.files[0]); }}
                      >
                        <Upload size={20} />
                        <span>Seret file ke sini atau <em>klik untuk memilih</em></span>
                        <small>Dokumen, gambar, video — Maks. 1000 MB</small>
                        <input
                          ref={fileInputRef}
                          type="file"
                          style={{ display: 'none' }}
                          onChange={(e) => pickFile(e.target.files[0])}
                        />
                      </label>
                    )}
                    {fileError && <p className="material-file-error">{fileError}</p>}
                  </div>
                )}
              </div>

              <label className="fm-field">
                <span>Deskripsi</span>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))}
                  placeholder="Keterangan singkat tentang materi ini…"
                />
              </label>
            </div>
          </div>

          {saveMut.error && (
            <div className="form-error-visible">{saveMut.error.response?.data?.message || 'Gagal menyimpan.'}</div>
          )}

          <div className="modal-foot" style={{ marginTop: 4 }}>
            <button type="button" className="outline-button compact" onClick={onClose}>Batal</button>
            <button type="submit" className="primary-button compact" disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Menyimpan…' : 'Simpan Materi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm modal ───────────────────────────────────────────────────────

function DeleteConfirm({ material, onClose, onConfirm, isPending }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 400 }}>
        <div className="modal-head">
          <h2>Hapus Materi</h2>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ lineHeight: 1.65, margin: 0 }}>
            Hapus <strong>"{material.title}"</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
        <div className="modal-foot" style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
          <button className="outline-button compact" onClick={onClose}>Batal</button>
          <button className="danger-outline-button compact" disabled={isPending} onClick={onConfirm}>
            {isPending ? 'Menghapus…' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Skeleton helpers ──────────────────────────────────────────────────────────

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function EventListSkeleton() {
  return (
    <>
      {[80, 65, 90, 55, 75, 70, 60].map((w, i) => (
        <div key={i} className="cp-skel-event">
          <Skel w={`${w}%`} h={13} />
          <Skel w="40%" h={10} />
        </div>
      ))}
    </>
  );
}

function MaterialCardsSkeleton() {
  return (
    <div className="material-cards">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="material-card" style={{ opacity: Math.max(0.18, 1 - i * 0.1) }}>
          <div className="material-card-icon-wrap setup-icon--emerald" style={{ flexShrink: 0 }} />
          <div className="material-card-body">
            <Skel w={62} h={10} />
            <Skel w="68%" h={14} />
            <Skel w="86%" h={11} />
            <Skel w={104} h={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function FacilitatorMaterials() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedUuid, setSelectedUuid] = useState(null);
  const [editingMaterial, setEditingMaterial] = useState(undefined); // undefined=closed, null=new, obj=edit
  const [deleteTarget, setDeleteTarget] = useState(null);
  const classParam = searchParams.get('class');

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['facilitator-events-list'],
    queryFn: async () => (await api.get('/training-events?per_page=100')).data.data.data,
  });

  useEffect(() => {
    if (classParam && events.some((ev) => ev.uuid === classParam)) {
      setSelectedUuid(classParam);
    }
  }, [classParam, events]);

  const selectEvent = (uuid) => {
    setSelectedUuid(uuid);
    setSearchParams(uuid ? { class: uuid } : {}, { replace: true });
  };

  const materialsQk = ['event-materials', selectedUuid];
  const { data: materials = [], isLoading: matLoading } = useQuery({
    queryKey: materialsQk,
    queryFn: async () => (await api.get(`/training-events/${selectedUuid}/materials`)).data.data,
    enabled: !!selectedUuid,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/training-events/${selectedUuid}/materials/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: materialsQk });
      setDeleteTarget(null);
      toast.success('Materi dihapus.');
    },
    onError: () => toast.error('Gagal menghapus materi.'),
  });

  const afterSave = () => {
    queryClient.invalidateQueries({ queryKey: materialsQk });
    setEditingMaterial(undefined);
    toast.success('Materi disimpan.');
  };

  const selectedEvent = events.find((e) => e.uuid === selectedUuid);

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Facilitator</p>
        <h1>Learning Materials</h1>
      </div>

      <div className="fm-layout">
        {/* Event list */}
        <aside className="fm-events-list">
          <div className="fm-events-header">Training Events</div>
          {eventsLoading && <EventListSkeleton />}
          {!eventsLoading && events.length === 0 && (
            <div className="resource-note">Tidak ada event yang ditemukan.</div>
          )}
          {events.map((ev) => (
            <button
              key={ev.uuid}
              className={`fm-event-item${selectedUuid === ev.uuid ? ' active' : ''}`}
              onClick={() => selectEvent(ev.uuid)}
            >
              <div className="fm-event-item-body">
                <strong>{ev.title}</strong>
                <span>{formatDate(ev.start_date)}</span>
              </div>
              <ChevronRight size={14} className="fm-event-chevron" />
            </button>
          ))}
        </aside>

        {/* Materials panel */}
        <div className="fm-materials-panel">
          {!selectedUuid && (
            <div className="fm-no-event">
              <BookOpen size={36} />
              <p>Pilih training event untuk mengelola materi pembelajaran.</p>
            </div>
          )}

          {selectedUuid && (
            <>
              <div className="fm-panel-head">
                <div>
                  <strong className="fm-panel-title">{selectedEvent?.title}</strong>
                  <span className="fm-panel-sub">{materials.length} materi</span>
                </div>
                <button className="primary-button compact" onClick={() => setEditingMaterial(null)}>
                  <Plus size={14} /> Tambah Materi
                </button>
              </div>

              {matLoading && <MaterialCardsSkeleton />}

              {!matLoading && materials.length === 0 && (
                <div className="material-empty">
                  <BookOpen size={28} />
                  <p>Belum ada materi pembelajaran.</p>
                  <span>Tambahkan dokumen, video, atau tautan untuk peserta.</span>
                </div>
              )}

              <div className="material-cards">
                {materials.map((m) => {
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
                        {(m.file_url || m.url) && (
                          <a
                            href={m.file_url || m.url}
                            target="_blank"
                            rel="noreferrer"
                            className="icon-action"
                            title="Lihat File"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <button className="icon-action" title="Edit" onClick={() => setEditingMaterial(m)}>
                          <Pencil size={13} />
                        </button>
                        <button className="icon-action danger-icon" title="Hapus" onClick={() => setDeleteTarget(m)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {editingMaterial !== undefined && (
        <MaterialModal
          uuid={selectedUuid}
          material={editingMaterial}
          onClose={() => setEditingMaterial(undefined)}
          onSuccess={afterSave}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          material={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          isPending={deleteMut.isPending}
        />
      )}
    </div>
  );
}
