import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  ChevronDown, ExternalLink, FileText, Film, Globe, Image,
  Library, Link, Lock, Pencil, Plus, Search, Tag, Trash2, Upload, User, X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';
import KmsSourcePreviewModal from '../../components/KmsSourcePreviewModal.jsx';
import { getRoleNames } from '../../utils/permissions.js';

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
const EMPTY_FORM     = { title: '', visibility: 'internal', internal_scope: 'all', opd_ids: [], category_ids: [], file_path: '' };

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isValidUrl(str) {
  try { new URL(str); return true; } catch { return false; }
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

function OpdScopePicker({ opds = [], value, onChange }) {
  const [query, setQuery] = useState('');
  const filtered = opds.filter((opd) => `${opd.name} ${opd.code ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const selectedCount = value.length;

  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter((item) => item !== id) : [...value, id]);
  };

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: 8, borderBottom: '1px solid var(--border)' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari OPD..."
            style={{ flex: 1, minWidth: 0, border: '1px solid var(--border)', borderRadius: 4, padding: '7px 9px', fontSize: 12, outline: 'none' }}
          />
          <button type="button" className="outline-button compact" onClick={() => onChange(opds.map((opd) => opd.id))}>
            Semua
          </button>
          {selectedCount > 0 && (
            <button type="button" className="outline-button compact" onClick={() => onChange([])}>
              Bersihkan
            </button>
          )}
        </div>

        <div style={{ maxHeight: 170, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <div style={{ padding: 12, fontSize: 12, color: 'var(--fg-3)' }}>OPD tidak ditemukan.</div>
          )}
          {filtered.map((opd) => (
            <label
              key={opd.id}
              style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', borderTop: '1px solid color-mix(in srgb, var(--border) 55%, transparent)', cursor: 'pointer' }}
            >
              <input
                type="checkbox"
                checked={value.includes(opd.id)}
                onChange={() => toggle(opd.id)}
                style={{ marginTop: 2 }}
              />
              <span style={{ display: 'grid', gap: 1, minWidth: 0 }}>
                <strong style={{ fontSize: 12, color: 'var(--fg-1)', fontWeight: 600 }}>{opd.name}</strong>
                {opd.code && <small style={{ fontSize: 10, color: 'var(--fg-3)' }}>Kode: {opd.code}</small>}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function OpdScopeModal({ opds = [], value, onClose, onApply }) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()} style={{ zIndex: 1200 }}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 560, width: '92vw' }}>
        <div className="modal-head">
          <div>
            <h2 style={{ margin: 0 }}>Pilih OPD</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--fg-3)' }}>
              Aset internal hanya terlihat oleh user dari OPD yang dipilih.
            </p>
          </div>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
          <OpdScopePicker opds={opds} value={draft} onChange={setDraft} />
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>
            {draft.length} OPD dipilih.
          </span>
        </div>

        <div className="modal-foot" style={{ padding: '12px 18px', borderTop: '1px solid var(--border)' }}>
          <button type="button" className="outline-button compact" onClick={onClose}>Batal</button>
          <button
            type="button"
            className="primary-button compact"
            onClick={() => {
              onApply(draft);
              onClose();
            }}
          >
            Terapkan Pilihan
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectedOpdSummary({ count, names, onEdit }) {
  const shortName = (name) => (name.length > 10 ? `${name.slice(0, 10)}...` : name);
  const preview = names.length > 0
    ? `${names.slice(0, 2).map(shortName).join(', ')}${names.length > 2 ? `, +${names.length - 2}` : ''}`
    : 'Pilih OPD yang dapat melihat aset ini';
  const fullPreview = names.length > 0 ? names.join(', ') : preview;

  return (
    <div className="fm-field" style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span>OPD Terpilih</span>
        <small style={{ fontSize: 10, color: 'var(--fg-3)' }}>Internal terbatas</small>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 9px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', minWidth: 0 }}>
        <span style={{ flexShrink: 0, padding: '2px 7px', borderRadius: 999, border: '1px solid var(--border)', background: '#fff', color: 'var(--fg-1)', fontSize: 11, fontWeight: 700 }}>
          {count}
        </span>
        <span title={fullPreview} style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, color: names.length > 0 ? 'var(--fg-2)' : 'var(--fg-3)' }}>
          {preview}
        </span>
        <button type="button" className="outline-button compact" onClick={onEdit} style={{ flexShrink: 0, padding: '5px 8px' }}>
          <Pencil size={11} /> Atur
        </button>
      </div>
    </div>
  );
}

// ── Visibility segmented control ───────────────────────────────────────────────

function VisibilityControl({ value, onChange, internalScope = 'all', internalOpdCount = 0, onInternalScopeChange, onOpenOpdPicker }) {
  const [scopeOpen, setScopeOpen] = useState(false);
  const scopeRef = useRef(null);

  useEffect(() => {
    const handler = (event) => {
      if (scopeRef.current && !scopeRef.current.contains(event.target)) setScopeOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'visible', width: '100%', position: 'relative' }}>
      {VISIBILITY_OPTIONS.map(({ value: v, label, icon: Icon }, i) => {
        const active = value === v;
        if (v === 'internal') {
          return (
            <div key={v} ref={scopeRef} style={{ flex: 1, display: 'flex', position: 'relative', borderLeft: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <button
                type="button"
                onClick={() => onChange(v)}
                style={{
                  flex: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px 0',
                  border: 'none',
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
              <button
                type="button"
                aria-label="Pilih cakupan OPD"
                aria-expanded={scopeOpen}
                onClick={() => {
                  onChange(v);
                  setScopeOpen((open) => !open);
                }}
                style={{
                  width: 36,
                  display: 'grid', placeItems: 'center',
                  border: 'none',
                  borderLeft: active ? '1px solid rgba(255,255,255,0.2)' : '1px solid var(--border)',
                  background: active ? '#000' : 'var(--surface)',
                  color: active ? '#fff' : 'var(--fg-2)',
                  cursor: 'pointer',
                }}
              >
                <ChevronDown size={14} style={{ transform: scopeOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
              </button>
              {scopeOpen && (
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  zIndex: 250,
                  width: 210,
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  background: '#fff',
                  boxShadow: '0 10px 24px rgba(0,0,0,0.12)',
                  overflow: 'hidden',
                }}>
                  {[
                    ['all', 'Semua OPD', 'Seluruh user internal dapat melihat.'],
                    ['selected', 'OPD tertentu', 'Batasi ke OPD yang dipilih.'],
                  ].map(([scope, title, desc]) => (
                    <button
                      key={scope}
                      type="button"
                      onClick={() => {
                        onInternalScopeChange(scope);
                        if (scope === 'selected') onOpenOpdPicker?.();
                        setScopeOpen(false);
                      }}
                      style={{
                        width: '100%',
                        display: 'grid',
                        gap: 2,
                        textAlign: 'left',
                        padding: '9px 11px',
                        border: 'none',
                        borderTop: scope === 'selected' ? '1px solid var(--border)' : 'none',
                        background: internalScope === scope ? 'var(--surface-2,#f5f5f5)' : '#fff',
                        color: 'var(--fg-1)',
                        cursor: 'pointer',
                      }}
                    >
                      <strong style={{ fontSize: 12, fontWeight: 700 }}>{title}</strong>
                      <span style={{ fontSize: 10, color: 'var(--fg-3)' }}>{desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        }
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
        <TbBtn action={() => e.chain().focus().toggleBold().run()} isActive={e.isActive('bold')} title="Tebal"><strong>B</strong></TbBtn>
        <TbBtn action={() => e.chain().focus().toggleItalic().run()} isActive={e.isActive('italic')} title="Miring"><em>I</em></TbBtn>
        <TbBtn action={() => e.chain().focus().toggleStrike().run()} isActive={e.isActive('strike')} title="Coret"><s>S</s></TbBtn>
        <Sep />
        <TbBtn action={() => e.chain().focus().toggleHeading({ level: 2 }).run()} isActive={e.isActive('heading', { level: 2 })} title="Heading 2">H2</TbBtn>
        <TbBtn action={() => e.chain().focus().toggleHeading({ level: 3 }).run()} isActive={e.isActive('heading', { level: 3 })} title="Heading 3">H3</TbBtn>
        <Sep />
        <TbBtn action={() => e.chain().focus().toggleBulletList().run()} isActive={e.isActive('bulletList')} title="Daftar poin">• Poin</TbBtn>
        <TbBtn action={() => e.chain().focus().toggleOrderedList().run()} isActive={e.isActive('orderedList')} title="Daftar nomor">1. Nomor</TbBtn>
        <Sep />
        <TbBtn action={() => e.chain().focus().toggleBlockquote().run()} isActive={e.isActive('blockquote')} title="Kutipan">"</TbBtn>
        <TbBtn action={() => e.chain().focus().toggleCode().run()} isActive={e.isActive('code')} title="Kode">{'`'}</TbBtn>
        <Sep />
        <TbBtn action={() => e.chain().focus().undo().run()} title="Urungkan">↩</TbBtn>
        <TbBtn action={() => e.chain().focus().redo().run()} title="Ulangi">↪</TbBtn>
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
        <img src={`https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`} alt="Thumbnail YouTube" className="url-preview-thumb" />
        <div className="url-preview-label"><Film size={12} /> Video YouTube</div>
      </div>
    );
  }
  if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(parsed.pathname)) {
  return <div className="url-preview-box"><img src={url} alt="Pratinjau" className="url-preview-thumb" /></div>;
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

// ── Asset form modal ───────────────────────────────────────────────────────────

export function AssetModal({ asset, categories, opds = [], onClose, onSuccess }) {
  const isEdit = !!asset;
  const initialSources = () => {
    if (isEdit && Array.isArray(asset.sources) && asset.sources.length > 0) {
      return asset.sources.map((source) => ({
        uid: `existing-${source.id ?? source.file_path}`,
        mode: source.is_upload ? 'existing' : 'url',
        url: source.is_upload ? '' : (source.file_path ?? ''),
        file_path: source.file_path ?? '',
        name: source.original_name || source.file_path?.split('/').pop() || 'Dokumen',
      }));
    }

    if (isEdit && asset.file_path) {
      return [{
        uid: `existing-${asset.file_path}`,
        mode: asset.is_upload ? 'existing' : 'url',
        url: asset.is_upload ? '' : asset.file_path,
        file_path: asset.file_path,
        name: asset.file_path.split('/').pop() || 'Dokumen',
      }];
    }

    return [{ uid: `url-${Date.now()}`, mode: 'url', url: '' }];
  };

  const [form, setForm]     = useState(isEdit
    ? {
      title: asset.title,
      visibility: asset.visibility ?? 'internal',
      internal_scope: asset.internal_scope ?? 'all',
      opd_ids: asset.opd_ids?.map(Number) ?? [],
      category_ids: asset.category_ids?.map(Number) ?? [],
      file_path: asset.file_path ?? '',
    }
    : EMPTY_FORM,
  );
  const [description, setDescription] = useState(isEdit ? (asset.description ?? '') : '');
  const [editorKey]   = useState(() => Math.random());
  const [sourceItems, setSourceItems] = useState(initialSources);
  const [fileError, setFileError]     = useState('');
  const [showOpdPicker, setShowOpdPicker] = useState(false);
  const fileRef = useRef(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const selectedOpdNames = opds
    .filter((opd) => form.opd_ids.includes(opd.id))
    .map((opd) => opd.name);

  const addUrlSource = () => {
    setSourceItems((items) => [...items, { uid: `url-${Date.now()}-${items.length}`, mode: 'url', url: '' }]);
  };

  const pickFiles = (files) => {
    const selected = Array.from(files ?? []);
    if (selected.length === 0) return;

    const oversized = selected.find((item) => item.size > MAX_FILE_BYTES);
    if (oversized) {
      setFileError(`Berkas "${oversized.name}" terlalu besar (${(oversized.size / 1024 / 1024).toFixed(1)} MB). Maks. 50 MB.`);
      return;
    }

    setFileError('');
    setSourceItems((items) => [
      ...items,
      ...selected.map((item, index) => ({
        uid: `file-${Date.now()}-${index}`,
        mode: 'file',
        file: item,
        name: item.name,
      })),
    ]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const updateSource = (uid, value) => {
    setSourceItems((items) => items.map((item) => (item.uid === uid ? { ...item, ...value } : item)));
  };

  const removeSource = (uid) => {
    setSourceItems((items) => items.filter((item) => item.uid !== uid));
  };

  const validSourceItems = sourceItems.filter((item) => {
    if (item.mode === 'url') return item.url?.trim();
    if (item.mode === 'file') return item.file;
    if (item.mode === 'existing') return item.file_path;
    return false;
  });

  const buildPayload = () => {
    const fd = new FormData();
    fd.append('title',       form.title.trim());
    fd.append('description', description);
    fd.append('visibility',  form.visibility);
    fd.append('internal_scope', form.visibility === 'internal' ? form.internal_scope : 'all');
    form.category_ids.forEach((id) => fd.append('category_ids[]', id));
    if (form.visibility === 'internal' && form.internal_scope === 'selected') {
      form.opd_ids.forEach((id) => fd.append('opd_ids[]', id));
    }
    validSourceItems.forEach((item) => {
      if (item.mode === 'url') {
        fd.append('source_urls[]', item.url.trim());
      } else if (item.mode === 'file') {
        fd.append('source_files[]', item.file);
      } else if (item.mode === 'existing') {
        fd.append('source_existing_paths[]', item.file_path);
        fd.append('source_existing_names[]', item.name ?? '');
      }
    });
    const primary = validSourceItems[0];
    if (primary?.mode === 'url') fd.append('file_path', primary.url.trim());
    if (primary?.mode === 'existing') fd.append('file_path', primary.file_path);
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
    const invalidUrl = sourceItems.find((item) => item.mode === 'url' && item.url?.trim() && !isValidUrl(item.url.trim()));
    if (invalidUrl) {
      toast.error('Masukkan tautan sumber dokumen yang valid (contoh: https://...)'); return;
    }
    if (validSourceItems.length === 0) {
      toast.error('Tambahkan minimal satu tautan atau berkas sumber dokumen.'); return;
    }
    if (form.visibility === 'internal' && form.internal_scope === 'selected' && form.opd_ids.length === 0) {
      toast.error('Pilih minimal satu OPD untuk visibilitas internal terbatas.'); return;
    }
    saveMut.mutate(buildPayload());
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box kms-asset-modal" role="dialog" aria-modal="true" style={{ maxWidth: 720, width: '95vw' }}>
        <div className="modal-head">
          <h2>{isEdit ? 'Ubah Aset' : 'Kontribusi Aset Pengetahuan'}</h2>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        <form className="modal-body kms-asset-modal-body" onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>

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
                <VisibilityControl
                  value={form.visibility}
                  internalScope={form.internal_scope}
                  internalOpdCount={form.opd_ids.length}
                  onChange={(v) => set('visibility', v)}
                  onInternalScopeChange={(scope) => setForm((f) => ({ ...f, internal_scope: scope, opd_ids: scope === 'all' ? [] : f.opd_ids }))}
                  onOpenOpdPicker={() => setShowOpdPicker(true)}
                />
                <p style={{ margin: '5px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>
                  {form.visibility === 'internal'
                    ? `Cakupan: ${form.internal_scope === 'selected' ? `OPD tertentu (${form.opd_ids.length} dipilih)` : 'Semua OPD'}.`
                    : 'Dapat diakses oleh seluruh pengguna platform.'}
                </p>
              </div>

            </div>

            {/* Right: source */}
            <div className="fm-field">
              <span>Sumber Dokumen <em style={{ color: '#dc2626', fontStyle: 'normal' }}>*</em></span>

              <div style={{ display: 'grid', gap: 8, marginTop: 6 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" className="outline-button compact" onClick={addUrlSource}>
                    <Link size={12} /> Tambah Tautan
                  </button>
                  <button type="button" className="outline-button compact" onClick={() => fileRef.current?.click()}>
                    <Upload size={12} /> Pilih Berkas
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    style={{ display: 'none' }}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov"
                    onChange={(e) => pickFiles(e.target.files)}
                  />
                </div>

                {sourceItems.length === 0 && (
                  <div style={{ padding: '10px 12px', border: '1px dashed var(--border)', borderRadius: 6, color: 'var(--fg-3)', fontSize: 12 }}>
                    Belum ada sumber dokumen.
                  </div>
                )}

                {sourceItems.map((item, index) => (
                  <div key={item.uid} style={{ display: 'grid', gap: 6, padding: '8px 9px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flexShrink: 0, width: 22, height: 22, display: 'grid', placeItems: 'center', borderRadius: 999, background: '#fff', border: '1px solid var(--border)', color: 'var(--fg-3)', fontSize: 11, fontWeight: 700 }}>
                        {index + 1}
                      </span>
                      {item.mode === 'url' ? (
                        <input
                          type="url"
                          value={item.url}
                          onChange={(e) => updateSource(item.uid, { url: e.target.value })}
                          placeholder="https://drive.google.com/..."
                          maxLength={255}
                          style={{ flex: 1, minWidth: 0, border: '1px solid var(--border)', padding: '7px 9px', background: '#fff', color: 'var(--fg)', font: 'inherit', fontSize: 12, outline: 'none', boxSizing: 'border-box', borderRadius: 4 }}
                        />
                      ) : (
                        <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden', color: 'var(--fg-2)', fontSize: 12 }}>
                          <FileText size={14} style={{ flexShrink: 0, color: 'var(--fg-3)' }} />
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.name || 'Dokumen'}
                          </span>
                        </span>
                      )}
                      <button type="button" className="icon-action danger-icon" title="Hapus sumber" onClick={() => removeSource(item.uid)}>
                        <X size={13} />
                      </button>
                    </div>
                    {item.mode === 'url' && <UrlPreview url={item.url} />}
                  </div>
                ))}

                {fileError && <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>{fileError}</p>}
                <small style={{ fontSize: 10, color: 'var(--fg-3)' }}>
                  Bisa berisi beberapa tautan dan/atau berkas. Maks. 50 MB per berkas.
                </small>
              </div>

              {/* Type indicators */}
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 10 }}>
                {[['PDF', FileText, '#dc2626'], ['Gambar', Image, '#2563eb'], ['Video', Film, '#7c3aed'], ['Dokumen', FileText, '#059669']].map(([lbl, Icon, color]) => (
                  <span key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, color: 'var(--fg-3)', padding: '2px 7px', border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 3 }}>
                    <Icon size={10} style={{ color }} /> {lbl}
                  </span>
                ))}
              </div>

              {form.visibility === 'internal' && form.internal_scope === 'selected' && (
                <SelectedOpdSummary
                  count={form.opd_ids.length}
                  names={selectedOpdNames}
                  onEdit={() => setShowOpdPicker(true)}
                />
              )}
            </div>
          </div>

          {/* Row 2: description — full width WYSIWYG */}
          <div className="fm-field">
            <span>Deskripsi</span>
            <RichEditor value={description} onChange={setDescription} editorKey={editorKey} />
          </div>

          <div className="modal-foot kms-asset-modal-foot" style={{ marginTop: 4 }}>
            <button type="button" className="outline-button compact" onClick={onClose}>Batal</button>
            <button type="submit" className="primary-button compact" disabled={saveMut.isPending}>
              {saveMut.isPending ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Kontribusikan'}
            </button>
          </div>
        </form>
      </div>

      {showOpdPicker && (
        <OpdScopeModal
          opds={opds}
          value={form.opd_ids}
          onClose={() => setShowOpdPicker(false)}
          onApply={(ids) => set('opd_ids', ids)}
        />
      )}
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
  const [previewTarget, setPreviewTarget] = useState(null);
  const sources = asset.sources?.length
    ? asset.sources
    : (asset.file_url ? [{ file_url: asset.file_url, is_upload: asset.is_upload, original_name: asset.is_upload ? 'Berkas' : 'Dokumen' }] : []);

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
          {sources.map((source, index) => (
            <button
              key={source.id ?? `${source.file_url}-${index}`}
              type="button"
              className="material-card-link"
              onClick={() => setPreviewTarget({ source, index })}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
            >
              <ExternalLink size={10} /> {sources.length > 1 ? `Sumber ${index + 1}` : (source.is_upload ? 'Unduh Berkas' : 'Buka Dokumen')}
            </button>
          ))}
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--fg-3)' }}>
            <User size={10} /> {asset.uploader_name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{formatDate(asset.created_at)}</span>
        </div>
      </div>

      {asset.is_mine && (
        <div className="material-card-actions">
          <button className="icon-action" title="Ubah" onClick={() => onEdit(asset)}><Pencil size={13} /></button>
          <button className="icon-action danger-icon" title="Hapus" onClick={() => onDelete(asset)}><Trash2 size={13} /></button>
        </div>
      )}
      {previewTarget && (
        <KmsSourcePreviewModal
          asset={asset}
          source={previewTarget.source}
          index={previewTarget.index}
          onClose={() => setPreviewTarget(null)}
        />
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

export default function FacilitatorKmsContribution({ session }) {
  const queryClient = useQueryClient();
  const canCreate = getRoleNames(session?.user).includes('admin-opd');
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
        <p className="mono-kicker text-muted">Fasilitator</p>
        <h1>Kontribusi KMS</h1>
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
        {canCreate && (
          <button className="primary-button compact" onClick={() => setModal('create')}>
            <Plus size={14} /> Kontribusi Aset
          </button>
        )}
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
          {!search && activeTab !== 'mine' && canCreate && <span>Jadilah yang pertama berkontribusi ke basis pengetahuan.</span>}
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
