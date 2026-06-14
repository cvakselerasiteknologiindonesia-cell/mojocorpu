import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  ExternalLink, FileText, Film, Globe, Image,
  Library, Link, Lock, Pencil, Plus, Search, Tag, Trash2, Upload, User, X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const VISIBILITY_OPTIONS = [
  { value: 'internal', label: 'Internal', icon: Lock },
  { value: 'public',   label: 'Publik',   icon: Globe },
];

const FILTER_TABS = [
  { key: 'all',      label: 'Semua' },
  { key: 'mine',     label: 'Kontribusi Saya' },
  { key: 'public',   label: 'Publik' },
  { key: 'internal', label: 'Internal' },
];

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const EMPTY_FORM     = { title: '', visibility: 'internal', category_ids: [], file_path: '' };

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isValidUrl(str) {
  try { new URL(str); return true; } catch { return false; }
}

function guessMediaType(src = '') {
  const ext = src.split('.').pop().toLowerCase().split('?')[0];
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video';
  if (ext === 'pdf') return 'pdf';
  return 'other';
}

function stripHtml(html = '') {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Category multi-select combobox ─────────────────────────────────────────────

function CategoryPicker({ categories, value, onChange }) {
  const [query, setQuery]   = useState('');
  const [open, setOpen]     = useState(false);
  const containerRef        = useRef(null);
  const inputRef            = useRef(null);

  const selected  = categories.filter((c) => value.includes(c.id));
  const available = categories.filter(
    (c) => !value.includes(c.id) && c.name.toLowerCase().includes(query.toLowerCase()),
  );

  const add    = (id) => { onChange([...value, id]); setQuery(''); inputRef.current?.focus(); };
  const remove = (id) => { onChange(value.filter((x) => x !== id)); inputRef.current?.focus(); };

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const showDropdown = open && (available.length > 0 || (query && available.length === 0));

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Tag bag + inline search input */}
      <div
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 5, padding: '5px 8px',
          border: '1px solid var(--border)', borderRadius: 6, cursor: 'text',
          minHeight: 38, background: 'var(--surface)', alignItems: 'center',
        }}
      >
        {selected.map((c) => (
          <span
            key={c.id}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px 2px 10px', background: '#000', color: '#fff',
              borderRadius: 20, fontSize: 11, fontWeight: 500, lineHeight: 1.5,
            }}
          >
            {c.name}
            <button
              type="button"
              onMouseDown={(e) => { e.stopPropagation(); remove(c.id); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', padding: 0, display: 'flex', lineHeight: 1 }}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected.length === 0 ? 'Pilih atau cari kategori…' : ''}
          style={{
            border: 'none', outline: 'none', flex: '1 1 80px', minWidth: 80,
            fontSize: 12, background: 'transparent', color: 'var(--fg-1)', padding: '2px 0',
          }}
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200,
          background: '#fff', border: '1px solid var(--border)', borderRadius: 6,
          maxHeight: 200, overflowY: 'auto', boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
        }}>
          {available.length > 0
            ? available.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); add(c.id); }}
                  style={{
                    display: 'flex', alignItems: 'center', width: '100%', textAlign: 'left',
                    padding: '8px 12px', fontSize: 12, color: 'var(--fg-1)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2,#f5f5f5)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                >
                  {c.name}
                </button>
              ))
            : (
              <div style={{ padding: '10px 12px', fontSize: 12, color: 'var(--fg-3)' }}>
                Tidak ada kategori yang cocok.
              </div>
            )}
        </div>
      )}
    </div>
  );
}

// ── Visibility segmented control ───────────────────────────────────────────────

function VisibilityControl({ value, onChange }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', width: '100%' }}>
      {VISIBILITY_OPTIONS.map(({ value: v, label, icon: Icon }, i) => {
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 0',
              border: 'none',
              borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
              background: active ? '#000' : 'var(--surface)',
              color: active ? '#fff' : 'var(--fg-2)',
              fontWeight: active ? 600 : 400,
              fontSize: 13,
              cursor: 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

// ── Tiptap WYSIWYG ─────────────────────────────────────────────────────────────

const EDITOR_STYLES = `
  .kms-prose { outline: none; min-height: 90px; font-size: 13px; color: var(--fg-1); }
  .kms-prose p { margin: 0 0 6px; }
  .kms-prose p:last-child { margin-bottom: 0; }
  .kms-prose ul, .kms-prose ol { padding-left: 20px; margin: 0 0 6px; }
  .kms-prose li { margin-bottom: 2px; }
  .kms-prose strong { font-weight: 700; }
  .kms-prose em { font-style: italic; }
  .kms-prose code { background: var(--surface-2,#f3f4f6); padding: 1px 4px; border-radius: 3px; font-size: .88em; font-family: monospace; }
  .kms-prose blockquote { border-left: 3px solid var(--accent); margin: 0 0 6px; padding-left: 10px; color: var(--fg-2); font-style: italic; }
  .kms-prose h2 { font-size: 15px; font-weight: 700; margin: 0 0 6px; }
  .kms-prose h3 { font-size: 14px; font-weight: 600; margin: 0 0 6px; }
`;

function TbBtn({ children, action, isActive, title }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); action(); }}
      style={{
        padding: '3px 7px', fontSize: 12, border: 'none', cursor: 'pointer',
        borderRadius: 3,
        background: isActive ? 'var(--accent)' : 'transparent',
        color: isActive ? '#fff' : 'var(--fg-2)',
        fontWeight: 500, lineHeight: 1.4,
      }}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 2px', alignSelf: 'center', display: 'inline-block' }} />;
}

function RichEditor({ value, onChange, editorKey }) {
  const skipRef = useRef(false);

  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    editorProps: { attributes: { class: 'kms-prose' } },
    onUpdate: ({ editor: ed }) => {
      skipRef.current = true;
      onChange(ed.getHTML());
    },
  }, [editorKey]);

  useEffect(() => {
    if (!editor) return;
    if (skipRef.current) { skipRef.current = false; return; }
    const html = editor.getHTML();
    if (html !== value) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return <div style={{ height: 120, border: '1px solid var(--border)', background: 'var(--surface)' }} />;

  const e = editor;

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
      <style>{EDITOR_STYLES}</style>

      {/* Toolbar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 1, padding: '5px 8px', borderBottom: '1px solid var(--border)', background: 'var(--surface-2,#f8f8f8)' }}>
        <TbBtn action={() => e.chain().focus().toggleBold().run()} isActive={e.isActive('bold')} title="Bold"><strong>B</strong></TbBtn>
        <TbBtn action={() => e.chain().focus().toggleItalic().run()} isActive={e.isActive('italic')} title="Italic"><em>I</em></TbBtn>
        <TbBtn action={() => e.chain().focus().toggleStrike().run()} isActive={e.isActive('strike')} title="Coret"><s>S</s></TbBtn>
        <Sep />
        <TbBtn action={() => e.chain().focus().toggleHeading({ level: 2 }).run()} isActive={e.isActive('heading', { level: 2 })} title="Heading 2">H2</TbBtn>
        <TbBtn action={() => e.chain().focus().toggleHeading({ level: 3 }).run()} isActive={e.isActive('heading', { level: 3 })} title="Heading 3">H3</TbBtn>
        <Sep />
        <TbBtn action={() => e.chain().focus().toggleBulletList().run()} isActive={e.isActive('bulletList')} title="Bullet list">• List</TbBtn>
        <TbBtn action={() => e.chain().focus().toggleOrderedList().run()} isActive={e.isActive('orderedList')} title="Ordered list">1. List</TbBtn>
        <Sep />
        <TbBtn action={() => e.chain().focus().toggleBlockquote().run()} isActive={e.isActive('blockquote')} title="Kutipan">"</TbBtn>
        <TbBtn action={() => e.chain().focus().toggleCode().run()} isActive={e.isActive('code')} title="Kode">{'`'}</TbBtn>
        <Sep />
        <TbBtn action={() => e.chain().focus().undo().run()} title="Undo">↩</TbBtn>
        <TbBtn action={() => e.chain().focus().redo().run()} title="Redo">↪</TbBtn>
      </div>

      {/* Editor body */}
      <div style={{ padding: '10px 12px' }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ── URL preview ────────────────────────────────────────────────────────────────

function UrlPreview({ url }) {
  if (!url || !isValidUrl(url)) return null;
  let parsed;
  try { parsed = new URL(url); } catch { return null; }
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]+)/);
  if (ytMatch) {
    return (
      <div className="url-preview-box">
        <img src={`https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`} alt="YouTube thumbnail" className="url-preview-thumb" />
        <div className="url-preview-label"><Film size={12} /> YouTube Video</div>
      </div>
    );
  }
  if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(parsed.pathname)) {
    return <div className="url-preview-box"><img src={url} alt="Preview" className="url-preview-thumb" /></div>;
  }
  return (
    <div className="url-preview-box url-preview-link">
      <ExternalLink size={12} />
      <div>
        <span className="url-preview-domain">{parsed.hostname}</span>
        <span className="url-preview-path">{parsed.pathname.slice(0, 48)}{parsed.pathname.length > 48 ? '…' : ''}</span>
      </div>
    </div>
  );
}

// ── File preview ───────────────────────────────────────────────────────────────

function FilePreviewBlock({ src, name }) {
  const t = guessMediaType(src);
  if (t === 'image') return <img src={src} alt={name} style={{ maxHeight: 130, maxWidth: '100%', objectFit: 'contain', borderRadius: 4 }} />;
  if (t === 'video') return <video src={src} controls style={{ maxHeight: 130, maxWidth: '100%', borderRadius: 4 }} />;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 4 }}>
      <FileText size={18} style={{ color: 'var(--fg-3)' }} />
      <span style={{ fontSize: 12, color: 'var(--fg-2)' }}>{name || src.split('/').pop()}</span>
    </div>
  );
}

// ── Asset form modal ───────────────────────────────────────────────────────────

function AssetModal({ asset, categories, onClose, onSuccess }) {
  const isEdit = !!asset;
  const [form, setForm]     = useState(isEdit
    ? { title: asset.title, visibility: asset.visibility ?? 'internal', category_ids: asset.category_ids?.map(Number) ?? [], file_path: asset.file_path ?? '' }
    : EMPTY_FORM,
  );
  const [description, setDescription] = useState(isEdit ? (asset.description ?? '') : '');
  const [editorKey]   = useState(() => Math.random());
  const [inputMode, setInputMode]     = useState(isEdit && asset.is_upload ? 'file' : 'url');
  const [file, setFile]               = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(isEdit && asset.is_upload ? (asset.file_url ?? null) : null);
  const [isDragging, setIsDragging]   = useState(false);
  const [fileError, setFileError]     = useState('');
  const fileRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setFilePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pickFile = (f) => {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) { setFileError(`File terlalu besar (${(f.size / 1024 / 1024).toFixed(1)} MB). Maks. 50 MB.`); return; }
    setFileError('');
    setFile(f);
  };

  const clearFile = () => { setFile(null); setFilePreviewUrl(null); setFileError(''); if (fileRef.current) fileRef.current.value = ''; };

  const buildPayload = () => {
    const fd = new FormData();
    fd.append('title',       form.title.trim());
    fd.append('description', description);
    fd.append('visibility',  form.visibility);
    form.category_ids.forEach((id) => fd.append('category_ids[]', id));
    if (inputMode === 'file' && file) fd.append('file', file);
    else if (inputMode === 'url')    fd.append('file_path', form.file_path.trim());
    return fd;
  };

  const saveMut = useMutation({
    mutationFn: (fd) => isEdit
      ? api.post(`/kms-assets/${asset.uuid}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      : api.post('/kms-assets', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
    onSuccess: () => { onSuccess(); toast.success(isEdit ? 'Aset berhasil diperbarui.' : 'Aset berhasil dikontribusikan.'); },
    onError:   (err) => toast.error(err.response?.data?.message || 'Gagal menyimpan aset.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    if (inputMode === 'url' && (!form.file_path.trim() || !isValidUrl(form.file_path.trim()))) {
      toast.error('Masukkan URL yang valid (contoh: https://…)'); return;
    }
    if (inputMode === 'file' && !file && !filePreviewUrl) {
      toast.error('Pilih file untuk diunggah.'); return;
    }
    saveMut.mutate(buildPayload());
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 720, width: '95vw' }}>
        <div className="modal-head">
          <h2>{isEdit ? 'Edit Aset' : 'Kontribusi Aset Pengetahuan'}</h2>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>

          {/* Row 1: two columns — basic fields | source */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>

            {/* Left: title, category, visibility */}
            <div style={{ display: 'grid', gap: 14 }}>
              <label className="fm-field">
                <span>Judul Aset <em style={{ color: '#dc2626', fontStyle: 'normal' }}>*</em></span>
                <input
                  autoFocus required
                  value={form.title}
                  onChange={(e) => set('title', e.target.value)}
                  placeholder="Contoh: Panduan Manajemen Kinerja ASN"
                  maxLength={255}
                />
              </label>

              <div className="fm-field">
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Tag size={12} /> Kategori
                  {form.category_ids.length > 0 && (
                    <em style={{ fontStyle: 'normal', fontSize: 10, color: 'var(--accent)', marginLeft: 2 }}>
                      {form.category_ids.length} dipilih
                    </em>
                  )}
                </span>
                <CategoryPicker
                  categories={categories}
                  value={form.category_ids}
                  onChange={(ids) => set('category_ids', ids)}
                />
              </div>

              <div className="fm-field">
                <span>Visibilitas</span>
                <VisibilityControl value={form.visibility} onChange={(v) => set('visibility', v)} />
                <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>
                  {form.visibility === 'internal'
                    ? 'Hanya terlihat oleh pengguna dalam organisasi.'
                    : 'Dapat diakses oleh seluruh pengguna platform.'}
                </p>
              </div>
            </div>

            {/* Right: source (URL / upload) */}
            <div className="fm-field">
              <span>Sumber Dokumen <em style={{ color: '#dc2626', fontStyle: 'normal' }}>*</em></span>

              <div className="material-mode-tabs" style={{ marginTop: 6 }}>
                <button type="button" className={`material-mode-tab${inputMode === 'url' ? ' active' : ''}`}
                  onClick={() => { setInputMode('url'); clearFile(); }}>
                  <Link size={12} /> URL / Tautan
                </button>
                <button type="button" className={`material-mode-tab${inputMode === 'file' ? ' active' : ''}`}
                  onClick={() => setInputMode('file')}>
                  <Upload size={12} /> Unggah File
                </button>
              </div>

              {inputMode === 'url' && (
                <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                  <input
                    type="url"
                    value={form.file_path}
                    onChange={(e) => set('file_path', e.target.value)}
                    placeholder="https://drive.google.com/…"
                    maxLength={255}
                    style={{ border: '1px solid var(--border)', padding: '9px 11px', width: '100%', background: '#fff', color: 'var(--fg)', font: 'inherit', outline: 'none', boxSizing: 'border-box', borderRadius: 4 }}
                  />
                  <UrlPreview url={form.file_path} />
                </div>
              )}

              {inputMode === 'file' && (
                <div className="material-file-area" style={{ marginTop: 4 }}>
                  {filePreviewUrl ? (
                    <div className="material-file-preview">
                      <FilePreviewBlock src={filePreviewUrl} name={file?.name ?? ''} />
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
                      <small>PDF, Dokumen, Gambar, Video — Maks. 50 MB</small>
                      <input
                        ref={fileRef} type="file" style={{ display: 'none' }}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov"
                        onChange={(e) => pickFile(e.target.files[0])}
                      />
                    </label>
                  )}
                  {fileError && <p style={{ margin: '4px 0 0', fontSize: 12, color: '#dc2626' }}>{fileError}</p>}
                </div>
              )}

              {/* Type indicators */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                {[['PDF', FileText, '#dc2626'], ['Gambar', Image, '#2563eb'], ['Video', Film, '#7c3aed'], ['Dokumen', FileText, '#059669']].map(([lbl, Icon, color]) => (
                  <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--fg-3)', padding: '2px 7px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 3 }}>
                    <Icon size={10} style={{ color }} /> {lbl}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2: description — full width WYSIWYG */}
          <div className="fm-field">
            <span>Deskripsi</span>
            <RichEditor value={description} onChange={setDescription} editorKey={editorKey} />
          </div>

          <div className="modal-foot" style={{ marginTop: 4 }}>
            <button type="button" className="outline-button compact" onClick={onClose}>Batal</button>
            <button type="submit" className="primary-button compact" disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Kontribusikan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────────

function DeleteModal({ asset, onClose, onConfirm, isPending }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <h2>Hapus Aset</h2>
          <button className="icon-action" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ lineHeight: 1.65, margin: 0 }}>
            Hapus <strong>"{asset.title}"</strong>? Tindakan ini tidak dapat dibatalkan.
          </p>
        </div>
        <div className="modal-foot" style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
          <button className="outline-button compact" onClick={onClose}>Batal</button>
          <button className="danger-outline-button compact" disabled={isPending} onClick={onConfirm}>
            {isPending ? 'Menghapus…' : 'Hapus Aset'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Asset card ─────────────────────────────────────────────────────────────────

function AssetCard({ asset, onEdit, onDelete }) {
  const VisIcon = asset.visibility === 'public' ? Globe : Lock;
  const plainDesc = stripHtml(asset.description ?? '');

  return (
    <div className="material-card">
      <div className={`material-card-icon-wrap ${asset.visibility === 'public' ? 'setup-icon--emerald' : 'setup-icon--grape'}`}>
        {asset.is_upload ? <Upload size={18} /> : <Link size={18} />}
      </div>

      <div className="material-card-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span className="material-card-type" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <VisIcon size={10} /> {asset.visibility === 'public' ? 'Publik' : 'Internal'}
          </span>
          {asset.category_names?.map((name) => (
            <span key={name} style={{ fontSize: 10, padding: '1px 6px', background: 'var(--surface-2,#f3f4f6)', color: 'var(--fg-3)', border: '1px solid var(--border)', borderRadius: 3 }}>
              {name}
            </span>
          ))}
          {asset.is_mine && (
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', padding: '1px 6px', background: 'color-mix(in srgb, var(--accent) 12%, white)', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 30%, white)', borderRadius: 3 }}>
              MILIK SAYA
            </span>
          )}
        </div>

        <strong className="material-card-title">{asset.title}</strong>

        {plainDesc && (
          <p className="material-card-desc">
            {plainDesc.length > 120 ? plainDesc.slice(0, 120) + '…' : plainDesc}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
          {asset.file_url && (
            <a href={asset.file_url} target="_blank" rel="noreferrer" className="material-card-link">
              <ExternalLink size={10} /> {asset.is_upload ? 'Unduh File' : 'Buka Dokumen'}
            </a>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--fg-3)' }}>
            <User size={10} /> {asset.uploader_name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{formatDate(asset.created_at)}</span>
        </div>
      </div>

      {asset.is_mine && (
        <div className="material-card-actions">
          <button className="icon-action" title="Edit" onClick={() => onEdit(asset)}><Pencil size={13} /></button>
          <button className="icon-action danger-icon" title="Hapus" onClick={() => onDelete(asset)}><Trash2 size={13} /></button>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function KmsAssetSkeleton() {
  return (
    <div className="material-cards">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="material-card" style={{ opacity: Math.max(0.18, 1 - i * 0.09) }}>
          <div className="material-card-icon-wrap setup-icon--emerald" style={{ flexShrink: 0 }} />
          <div className="material-card-body">
            <Skel w={72} h={10} />
            <Skel w="68%" h={14} />
            <Skel w="88%" h={11} />
            <Skel w={104} h={10} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function FacilitatorKmsContribution() {
  const queryClient = useQueryClient();
  const [modal, setModal]               = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeTab, setActiveTab]       = useState('all');
  const [search, setSearch]             = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage]                 = useState(1);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
    clearTimeout(window._kmsSearchTimer);
    window._kmsSearchTimer = setTimeout(() => setDebouncedSearch(val), 350);
  };

  const { data: categories = [] } = useQuery({
    queryKey: ['kms-categories'],
    queryFn: async () => (await api.get('/kms-categories')).data.data,
    staleTime: 5 * 60 * 1000,
  });

  const qk = ['kms-assets', activeTab, debouncedSearch, page];
  const { data, isLoading, isFetching } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const params = new URLSearchParams({ per_page: 12, page });
      if (activeTab === 'mine')     params.set('mine', '1');
      if (activeTab === 'public')   params.set('visibility', 'public');
      if (activeTab === 'internal') params.set('visibility', 'internal');
      if (debouncedSearch)          params.set('search', debouncedSearch);
      return (await api.get(`/kms-assets?${params}`)).data.data;
    },
    keepPreviousData: true,
  });

  const assets   = data?.data ?? [];
  const lastPage = data?.last_page ?? 1;
  const total    = data?.total ?? 0;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['kms-assets'] });

  const deleteMut = useMutation({
    mutationFn: (uuid) => api.delete(`/kms-assets/${uuid}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast.success('Aset berhasil dihapus.'); },
    onError:   (err) => toast.error(err.response?.data?.message || 'Gagal menghapus aset.'),
  });

  const afterSave = () => { invalidate(); setModal(null); };

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Facilitator</p>
        <h1>KMS Contribution</h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div className="cp-stats" style={{ flex: 1 }}>
          <div className="cp-stat">
            <span className="cp-stat-val">{total}</span>
            <span className="cp-stat-lbl">Total Aset</span>
          </div>
          <div className="cp-stat cp-stat--approved">
            <span className="cp-stat-val">{assets.filter((a) => a.visibility === 'public').length}</span>
            <span className="cp-stat-lbl">Publik</span>
          </div>
          <div className="cp-stat">
            <span className="cp-stat-val">{assets.filter((a) => a.is_mine).length}</span>
            <span className="cp-stat-lbl">Milik Saya</span>
          </div>
        </div>
        <button className="primary-button compact" onClick={() => setModal('create')}>
          <Plus size={14} /> Kontribusi Aset
        </button>
      </div>

      <div className="att-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="cp-filter-tabs">
          {FILTER_TABS.map(({ key, label }) => (
            <button
              key={key}
              className={`cp-filter-tab${activeTab === key ? ' active' : ''}`}
              onClick={() => { setActiveTab(key); setPage(1); }}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="picker-search" style={{ marginLeft: 'auto' }}>
          <Search size={14} />
          <input
            placeholder="Cari judul atau deskripsi…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading && assets.length === 0 && <KmsAssetSkeleton />}

      {!isLoading && assets.length === 0 && (
        <div className="material-empty">
          <Library size={32} />
          <p>
            {search ? 'Tidak ada aset yang cocok.'
              : activeTab === 'mine' ? 'Anda belum berkontribusi aset apapun.'
              : 'Belum ada aset KMS.'}
          </p>
          {!search && activeTab !== 'mine' && <span>Jadilah yang pertama berkontribusi ke basis pengetahuan.</span>}
        </div>
      )}

      <div className="material-cards" style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.15s' }}>
        {assets.map((asset) => (
          <AssetCard
            key={asset.uuid ?? asset.id}
            asset={asset}
            onEdit={(a) => setModal(a)}
            onDelete={(a) => setDeleteTarget(a)}
          />
        ))}
      </div>

      {lastPage > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Sebelumnya</button>
          <span style={{ fontSize: 13, color: 'var(--fg-2)' }}>Halaman {page} / {lastPage}</span>
          <button className="outline-button compact" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>Berikutnya →</button>
        </div>
      )}

      {modal && (
        <AssetModal
          asset={modal === 'create' ? null : modal}
          categories={categories}
          onClose={() => setModal(null)}
          onSuccess={afterSave}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          asset={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMut.mutate(deleteTarget.uuid)}
          isPending={deleteMut.isPending}
        />
      )}
    </div>
  );
}
