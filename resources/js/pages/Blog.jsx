import { useEffect, useMemo, useRef, useState } from 'react';
import { safe } from '../utils/sanitize.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { BookOpen, Calendar, Edit3, ExternalLink, Eye, FileText, FolderPlus, ImageIcon, Link2, Loader2, Plus, Save, Search, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../api.js';

const EMPTY_FORM = {
  title: '',
  slug: '',
  blog_category_id: '',
  category: '',
  excerpt: '',
  featured_image: '',
  tags: [],
  seo_title: '',
  seo_description: '',
  seo_canonical_url: '',
  seo_image: '',
  body: '',
  status: 'draft',
};
const EMPTY_CATEGORY = { name: '', description: '' };
const STATUS_TABS = [
  ['published', 'Terbit'],
  ['mine', 'Tulisan Saya'],
  ['draft', 'Draf'],
  ['all', 'Semua'],
];

function formatDate(date) {
  if (!date) return 'Draf';
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function slugify(value) {
  return (value || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function tagsToInput(tags) {
  return Array.isArray(tags) ? tags.join(', ') : (tags || '');
}

function inputToTags(value) {
  return value
    .split(',')
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, arr) => arr.indexOf(tag) === index)
    .slice(0, 12);
}

function canWrite(session) {
  const permissions = session?.permissions || [];
  const roles = (session?.user?.roles || []).map((r) => r.name);
  return roles.some((r) => ['super-admin', 'admin-opd', 'fasilitator-internal', 'fasilitator-eksternal'].includes(r))
    || ['create kms asset', 'upload kms assets', 'create learning articles', 'create discussion topics']
      .some((permission) => permissions.includes(permission));
}

function ToolbarButton({ children, action, isActive, title }) {
  return (
    <button
      type="button"
      title={title}
      className={`blog-editor-tool${isActive ? ' active' : ''}`}
      onMouseDown={(e) => { e.preventDefault(); action(); }}
    >
      {children}
    </button>
  );
}

function ToolbarSep() {
  return <span className="blog-editor-sep" />;
}

function ImagePopover({ editor, onClose }) {
  const [tab, setTab] = useState('upload');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const insertUrl = () => {
    const src = url.trim();
    if (!src) return;
    editor.chain().focus().setImage({ src }).run();
    onClose();
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/blog-posts/media', fd);
      editor.chain().focus().setImage({ src: res.data.data.url }).run();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah gambar.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div className="blog-popover-backdrop" onClick={onClose} />
      <div className="blog-image-popover">
        <div className="blog-popover-tabs">
          <button type="button" className={`blog-popover-tab${tab === 'upload' ? ' active' : ''}`} onClick={() => setTab('upload')}>
            <Upload size={13} /> Unggah
          </button>
          <button type="button" className={`blog-popover-tab${tab === 'url' ? ' active' : ''}`} onClick={() => setTab('url')}>
            <Link2 size={13} /> URL
          </button>
        </div>
        <div className="blog-popover-body">
          {tab === 'upload' ? (
            <div
              className="blog-drop-zone"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            >
              {uploading ? (
                <span>Mengunggah...</span>
              ) : (
                <>
                  <ImageIcon size={22} />
                  <span>Klik atau seret gambar ke sini</span>
                  <em>JPG, PNG, GIF, WebP - maks 5 MB</em>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>
          ) : (
            <div className="blog-url-row">
              <input
                className="form-input"
                placeholder="https://contoh.com/gambar.jpg"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && insertUrl()}
                autoFocus
              />
              <button type="button" className="primary-button compact" onClick={insertUrl} disabled={!url.trim()}>
                Sisipkan
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function BlogRichEditor({ value, onChange, editorKey }) {
  const skipNext = useRef(false);
  const [imageOpen, setImageOpen] = useState(false);
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ HTMLAttributes: { class: 'blog-content-image' } }),
    ],
    content: value || '',
    editorProps: { attributes: { class: 'blog-editor-prose' } },
    onUpdate: ({ editor: ed }) => {
      skipNext.current = true;
      onChange(ed.getHTML());
    },
  }, [editorKey]);

  useEffect(() => {
    if (!editor) return;
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (editor.getHTML() !== value) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return <div className="blog-editor-wrap loading" />;

  return (
    <div className="blog-editor-wrap">
      <div className="blog-editor-toolbar">
        <ToolbarButton action={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Tebal"><strong>B</strong></ToolbarButton>
        <ToolbarButton action={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Miring"><em>I</em></ToolbarButton>
        <ToolbarButton action={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Coret"><s>S</s></ToolbarButton>
        <ToolbarSep />
        <ToolbarButton action={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">H2</ToolbarButton>
        <ToolbarButton action={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Heading 3">H3</ToolbarButton>
        <ToolbarSep />
        <ToolbarButton action={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Daftar poin">• Poin</ToolbarButton>
        <ToolbarButton action={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Daftar nomor">1. Nomor</ToolbarButton>
        <ToolbarSep />
        <ToolbarButton action={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Kutipan">Kutipan</ToolbarButton>
        <ToolbarButton action={() => editor.chain().focus().toggleCode().run()} isActive={editor.isActive('code')} title="Kode inline">{'`'}</ToolbarButton>
        <ToolbarSep />
        <span className="blog-editor-media-wrap">
          <ToolbarButton action={() => setImageOpen((open) => !open)} isActive={imageOpen} title="Sisipkan gambar">
            <ImageIcon size={14} />
          </ToolbarButton>
          {imageOpen && <ImagePopover editor={editor} onClose={() => setImageOpen(false)} />}
        </span>
        <ToolbarSep />
        <ToolbarButton action={() => editor.chain().focus().undo().run()} title="Urungkan">Urungkan</ToolbarButton>
        <ToolbarButton action={() => editor.chain().focus().redo().run()} title="Ulangi">Ulangi</ToolbarButton>
      </div>
      <div className="blog-editor-body" onClick={() => editor.chain().focus().run()}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function CategoryManager({ categories, onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_CATEGORY);

  const reset = () => {
    setEditing(null);
    setForm(EMPTY_CATEGORY);
  };
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['blog-categories'] });
    queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
    onSaved?.();
  };

  const save = useMutation({
    mutationFn: () => editing
      ? api.put(`/blog-categories/${editing.uuid}`, form)
      : api.post('/blog-categories', form),
    onSuccess: () => {
      toast.success(editing ? 'Kategori diperbarui.' : 'Kategori dibuat.');
      reset();
      invalidate();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menyimpan kategori.'),
  });

  const remove = useMutation({
    mutationFn: (category) => api.delete(`/blog-categories/${category.uuid}`),
    onSuccess: () => {
      toast.success('Kategori dihapus.');
      invalidate();
    },
    onError: () => toast.error('Gagal menghapus kategori.'),
  });

  const openEdit = (category) => {
    setEditing(category);
    setForm({ name: category.name || '', description: category.description || '' });
  };

  return (
    <div className="modal-backdrop blog-modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box blog-category-modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <p className="mono-kicker text-muted">Taksonomi Artikel</p>
            <h2>Kategori</h2>
          </div>
          <button className="icon-action" type="button" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>
        <div className="modal-body blog-category-body">
          <form
            className="blog-category-form"
            onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
          >
            <label className="event-field">
              <span>Nama</span>
              <input value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="Strategi Pembelajaran" required />
            </label>
            <label className="event-field">
              <span>Deskripsi</span>
              <textarea value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} rows={3} placeholder="Deskripsi singkat kategori" />
            </label>
            {save.error && <div className="form-error-visible">{save.error.response?.data?.message || 'Gagal menyimpan.'}</div>}
            <div className="modal-foot">
              {editing && <button type="button" className="outline-button compact" onClick={reset}>Batal Edit</button>}
              <button className="primary-button compact" disabled={save.isPending}>{save.isPending ? 'Menyimpan...' : editing ? 'Perbarui Kategori' : 'Tambah Kategori'}</button>
            </div>
          </form>

          <div className="blog-category-list">
            {categories.length === 0 && <div className="resource-note">Belum ada kategori.</div>}
            {categories.map((category) => (
              <div className="blog-category-row" key={category.uuid}>
                <div>
                  <strong>{category.name}</strong>
                  <span>{category.description || category.slug}</span>
                  <em>{category.posts_count || 0} tulisan</em>
                </div>
                <div className="blog-category-actions">
                  <button className="icon-action" title="Ubah" onClick={() => openEdit(category)}><Edit3 size={13} /></button>
                  <button className="icon-action danger-icon" title="Hapus" onClick={() => remove.mutate(category)}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function BlogImageField({ label, value, onChange, help }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/blog-posts/media', fd);
      onChange(res.data.data.url);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah gambar.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="blog-image-field">
      <span>{label}</span>
      {value ? (
        <div className="blog-image-preview">
          <img src={value} alt="" />
          <button type="button" className="icon-action danger-icon" onClick={() => onChange('')} aria-label="Hapus gambar">
            <X size={13} />
          </button>
        </div>
      ) : (
        <button type="button" className="blog-image-empty" onClick={() => fileRef.current?.click()}>
          <ImageIcon size={18} />
          {uploading ? 'Mengunggah...' : 'Unggah gambar'}
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <input className="form-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://... atau /storage/..." />
      {help && <em>{help}</em>}
    </div>
  );
}

function BlogPreviewModal({ form, onClose }) {
  return (
    <div className="modal-backdrop blog-modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box blog-preview-modal" role="dialog" aria-modal="true">
        <div className="modal-head blog-editor-head">
          <div>
            <p className="mono-kicker text-muted">Pratinjau</p>
            <h2>{form.title || 'Tulisan tanpa judul'}</h2>
          </div>
          <button className="icon-action" type="button" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>
        <article className="blog-public-article blog-preview-article">
          {form.featured_image && <img className="blog-public-cover" src={form.featured_image} alt="" />}
          <div className="blog-public-meta">
            <span>{form.category || 'Umum'}</span>
            <span>{statusLabel(form.status)}</span>
          </div>
          <h1>{form.title || 'Tulisan tanpa judul'}</h1>
          {form.excerpt && <p className="blog-public-excerpt">{form.excerpt}</p>}
          {form.tags?.length > 0 && (
            <div className="blog-tag-row">
              {form.tags.map((tag) => <span key={tag}>#{tag}</span>)}
            </div>
          )}
          <div className="blog-body" dangerouslySetInnerHTML={{ __html: safe(form.body || '<p></p>') }} />
        </article>
      </div>
    </div>
  );
}

function BlogEditor({ post, categories, onClose, onSaved }) {
  const [form, setForm] = useState(post ? {
    title: post.title || '',
    slug: post.slug || '',
    blog_category_id: post.blog_category_id || '',
    category: post.category || '',
    excerpt: post.excerpt || '',
    featured_image: post.featured_image || '',
    tags: post.tags || [],
    seo_title: post.seo_title || '',
    seo_description: post.seo_description || '',
    seo_canonical_url: post.seo_canonical_url || '',
    seo_image: post.seo_image || '',
    body: post.body || '',
    status: post.status || 'draft',
  } : EMPTY_FORM);
  const [tagsInput, setTagsInput] = useState(tagsToInput(post?.tags || []));
  const [previewOpen, setPreviewOpen] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState('');
  const [sidePanel, setSidePanel] = useState('publish');
  const draftKey = `blog-editor-draft-${post?.uuid || 'new'}`;

  useEffect(() => {
    const raw = window.localStorage.getItem(draftKey);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      if (draft?.form && window.confirm('Ada draf otomatis untuk tulisan ini. Pulihkan draf?')) {
        setForm({ ...EMPTY_FORM, ...draft.form });
        setTagsInput(tagsToInput(draft.form.tags || []));
        setAutosaveStatus('Draf otomatis dipulihkan.');
      }
    } catch {
      window.localStorage.removeItem(draftKey);
    }
  }, [draftKey]);

  useEffect(() => {
    const hasContent = form.title.trim() || form.body.replace(/<[^>]*>/g, '').trim();
    if (!hasContent) return undefined;

    const timer = window.setTimeout(() => {
      window.localStorage.setItem(draftKey, JSON.stringify({ form, savedAt: new Date().toISOString() }));
      setAutosaveStatus(`Tersimpan otomatis ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [draftKey, form]);

  const save = useMutation({
    mutationFn: () => post
      ? api.put(`/blog-posts/${post.uuid}`, form)
      : api.post('/blog-posts', form),
    onSuccess: () => {
      window.localStorage.removeItem(draftKey);
      toast.success(post ? 'Tulisan diperbarui.' : 'Tulisan dibuat.');
      onSaved();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menyimpan tulisan.'),
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const updateTags = (value) => {
    setTagsInput(value);
    update('tags', inputToTags(value));
  };
  const wordCount = form.body.replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  const seoDescriptionLength = form.seo_description.length;

  return (
    <div className="modal-backdrop blog-modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box blog-editor-modal" role="dialog" aria-modal="true">
        <div className="beh-topbar">
          <button className="beh-close" type="button" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
          <span className="beh-title">{form.title || (post ? 'Edit Tulisan' : 'Tulisan Baru')}</span>
          <span className="beh-divider" />
          {autosaveStatus && <span className="beh-autosave">{autosaveStatus}</span>}
          <button type="button" className="beh-action-btn" onClick={() => setPreviewOpen(true)}>
            <Eye size={14} /> Pratinjau
          </button>
          <button form="blog-post-form" type="submit" className="beh-save-btn" disabled={save.isPending}>
            {save.isPending ? <><Loader2 size={14} className="beh-spin" /> Menyimpan...</> : <><Save size={14} /> Simpan Tulisan</>}
          </button>
        </div>
        <form
          id="blog-post-form"
          className="modal-body blog-editor-form"
          onSubmit={(e) => { e.preventDefault(); save.mutate(); }}
        >
          <div className="blog-compose-grid">
            <div className="blog-compose-main">
              <div className="blog-title-card">
                <div className="blog-title-field">
                  <input
                    value={form.title}
                    onChange={(e) => {
                      const title = e.target.value;
                      setForm((current) => ({
                        ...current,
                        title,
                        slug: current.slug ? current.slug : slugify(title),
                      }));
                    }}
                    placeholder="Judul tulisan"
                    required
                  />
                </div>
                <div className="blog-slug-row">
                  <span>/artikel/</span>
                  <input value={form.slug} onChange={(e) => update('slug', slugify(e.target.value))} placeholder="slug-url-artikel" />
                  {form.slug && (
                    <a href={`/artikel/${form.slug}`} target="_blank" rel="noreferrer" aria-label="Buka URL publik">
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>

              <div className="blog-compose-section-head">
                <span>Isi Artikel</span>
                <em>{wordCount} kata</em>
              </div>
              <BlogRichEditor value={form.body} onChange={(value) => update('body', value)} editorKey={post?.uuid || 'new-blog-post'} />
            </div>

            <aside className="blog-compose-side">
              <div className="blog-side-tabs" role="tablist" aria-label="Pengaturan artikel">
                {[
                  ['publish', 'Publikasi'],
                  ['content', 'Konten'],
                  ['seo', 'SEO'],
                ].map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    className={sidePanel === id ? 'active' : ''}
                    onClick={() => setSidePanel(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="blog-side-panel">
                {sidePanel === 'publish' && (
                  <>
                    <section>
                      <span className="blog-side-label">Status</span>
                      <div className="beh-status-row">
                        {[['draft', 'Draf'], ['published', 'Terbit']].map(([s, label]) => (
                          <button
                            type="button"
                            key={s}
                            className={`beh-status-btn${form.status === s ? ' active' : ''}`}
                            onClick={() => update('status', s)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {form.slug && (
                        <a className="blog-public-link" href={`/artikel/${form.slug}`} target="_blank" rel="noreferrer">
                          <ExternalLink size={13} /> Buka URL publik
                        </a>
                      )}
                    </section>

                    <section>
                      <span className="blog-side-label">Simpan Otomatis</span>
                      <div className="blog-status-card">
                        <strong>{autosaveStatus || 'Menunggu perubahan'}</strong>
                        <span>Draf disimpan sementara di browser ini sampai tulisan disimpan.</span>
                      </div>
                    </section>
                  </>
                )}

                {sidePanel === 'content' && (
                  <>
                    <section>
                      <span className="blog-side-label">Gambar Utama</span>
                      <BlogImageField
                        label="Sampul"
                        value={form.featured_image}
                        onChange={(value) => {
                          setForm((current) => ({
                            ...current,
                            featured_image: value,
                            seo_image: current.seo_image || value,
                          }));
                        }}
                        help="Dipakai untuk kartu beranda dan halaman artikel."
                      />
                    </section>

                    <section>
                      <span className="blog-side-label">Klasifikasi</span>
                      <label className="event-field">
                        <span>Kategori</span>
                        <select
                          value={form.blog_category_id}
                          onChange={(e) => {
                            const category = categories.find((item) => String(item.id) === e.target.value);
                            setForm((current) => ({
                              ...current,
                              blog_category_id: e.target.value,
                              category: category?.name || '',
                            }));
                          }}
                        >
                          <option value="">Umum</option>
                          {categories.map((category) => (
                            <option key={category.uuid} value={category.id}>{category.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="event-field">
                        <span>Tag</span>
                        <input value={tagsInput} onChange={(e) => updateTags(e.target.value)} placeholder="kepemimpinan, asn, digital" />
                      </label>
                      {form.tags.length > 0 && (
                        <div className="blog-tag-row">
                          {form.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                        </div>
                      )}
                    </section>

                    <section>
                      <span className="blog-side-label">Ringkasan</span>
                      <label className="event-field">
                        <span>Kutipan Ringkas</span>
                        <textarea value={form.excerpt} onChange={(e) => update('excerpt', e.target.value)} rows={8} placeholder="Ringkasan singkat artikel" />
                      </label>
                    </section>
                  </>
                )}

                {sidePanel === 'seo' && (
                  <section>
                    <span className="blog-side-label">SEO</span>
                    <label className="event-field">
                      <span>Judul meta</span>
                      <input value={form.seo_title} onChange={(e) => update('seo_title', e.target.value)} placeholder={form.title || 'Judul SEO'} maxLength={180} />
                    </label>
                    <label className="event-field">
                      <span>Deskripsi meta</span>
                      <textarea value={form.seo_description} onChange={(e) => update('seo_description', e.target.value)} rows={5} placeholder="Deskripsi untuk mesin pencari dan share preview" maxLength={320} />
                    </label>
                    <div className="blog-field-meter">
                      <span>{seoDescriptionLength}/320</span>
                      <i style={{ width: `${Math.min(100, (seoDescriptionLength / 320) * 100)}%` }} />
                    </div>
                    <label className="event-field">
                      <span>URL kanonis</span>
                      <input value={form.seo_canonical_url} onChange={(e) => update('seo_canonical_url', e.target.value)} placeholder="https://..." />
                    </label>
                    <BlogImageField
                      label="Gambar SEO"
                      value={form.seo_image}
                      onChange={(value) => update('seo_image', value)}
                      help="Opsional. Default bisa sama dengan gambar utama."
                    />
                  </section>
                )}
              </div>
            </aside>
          </div>

          {save.error && <div className="form-error-visible">{save.error.response?.data?.message || 'Gagal menyimpan.'}</div>}
        </form>
      </div>
      {previewOpen && <BlogPreviewModal form={form} onClose={() => setPreviewOpen(false)} />}
    </div>
  );
}

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function BlogListSkeleton() {
  return (
    <>
      {[68, 80, 55, 73, 60, 85, 50].map((w, i) => (
        <div key={i} className="blog-post-row" style={{ opacity: Math.max(0.18, 1 - i * 0.1), cursor: 'default', pointerEvents: 'none' }}>
          <span className="blog-row-icon"><Skel w={16} h={16} /></span>
          <span className="blog-row-main">
            <Skel w={`${w}%`} h={13} />
            <Skel w="42%" h={10} />
          </span>
          <Skel w={54} h={18} />
        </div>
      ))}
    </>
  );
}

function statusLabel(status) {
  return {
    draft: 'Draf',
    published: 'Terbit',
  }[status] || status;
}

export default function Blog({ session }) {
  const queryClient = useQueryClient();
  const writable = canWrite(session);
  const [activeTab, setActiveTab] = useState('published');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(undefined);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const tabs = writable ? STATUS_TABS : STATUS_TABS.slice(0, 1);

  const { data: categories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: async () => (await api.get('/blog-categories')).data.data,
  });

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['blog-posts', activeTab, search, categoryFilter, page],
    queryFn: async () => (await api.get('/blog-posts', { params: { status: activeTab, search, category: categoryFilter, page, per_page: 9 } })).data.data,
    placeholderData: (previous) => previous,
  });

  const posts = data?.data || [];
  const currentPost = selected || posts[0] || null;
  const visibleCategoryNames = useMemo(() => [...new Set(posts.map((post) => post.category).filter(Boolean))], [posts]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['blog-posts'] });
  const remove = useMutation({
    mutationFn: (post) => api.delete(`/blog-posts/${post.uuid}`),
    onSuccess: () => {
      setSelected(null);
      invalidate();
      toast.success('Tulisan dihapus.');
    },
    onError: () => toast.error('Gagal menghapus tulisan.'),
  });

  return (
    <div className="page-stack blog-page">
      <div className="page-head blog-head">
        <div>
          <p className="mono-kicker text-muted">Berbagi Pengetahuan</p>
          <h1>Artikel</h1>
        </div>
        {writable && (
          <div className="blog-head-actions">
            <button className="outline-button compact" onClick={() => setCategoryManagerOpen(true)}>
              <FolderPlus size={14} /> Kategori
            </button>
            <button className="primary-button compact" onClick={() => setEditing(null)}>
              <Plus size={14} /> Tulisan Baru
            </button>
          </div>
        )}
      </div>

      <div className="blog-toolbar">
        <div className="blog-search">
          <Search size={15} />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Cari tulisan..." />
        </div>
        <div className="blog-tabs">
          {tabs.map(([id, label]) => (
            <button key={id} className={activeTab === id ? 'active' : ''} onClick={() => { setActiveTab(id); setPage(1); }}>
              {label}
            </button>
          ))}
        </div>
        <select className="blog-category-filter" value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="">Semua Kategori</option>
          {categories.map((category) => (
            <option key={category.uuid} value={category.slug}>{category.name}</option>
          ))}
        </select>
      </div>

      <div className="blog-layout">
        <section className="blog-list-panel">
          {isLoading && <BlogListSkeleton />}
          {!isLoading && posts.length === 0 && (
            <div className="material-empty">
              <BookOpen size={30} />
              <p>Belum ada tulisan.</p>
              <span>Artikel yang dipublikasikan akan tampil di sini.</span>
            </div>
          )}
          {posts.map((post) => (
            <div key={post.uuid} className={`blog-post-row${currentPost?.uuid === post.uuid ? ' active' : ''}`} onClick={() => setSelected(post)}>
              <span className="blog-row-icon"><FileText size={16} /></span>
              <span className="blog-row-main">
                <strong>{post.title}</strong>
                <em>{post.category || 'Umum'} · {post.reading_minutes} menit baca · {formatDate(post.published_at)}</em>
              </span>
              <span className={`status-badge ${post.status === 'published' ? 'active' : 'scheduled'}`}>{statusLabel(post.status)}</span>
              {writable && (
                <span className="blog-row-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-action" title="Ubah" onClick={() => setEditing(post)}><Edit3 size={13} /></button>
                  <button className="icon-action danger-icon" title="Hapus" onClick={() => { if (window.confirm(`Hapus "${post.title}"?`)) remove.mutate(post); }}><Trash2 size={13} /></button>
                </span>
              )}
            </div>
          ))}
          {data?.last_page > 1 && (
            <div className="kms-pagination">
              <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Sebelumnya</button>
              <span className="kms-page-info">Hal. {page} / {data.last_page}</span>
              <button className="outline-button compact" disabled={page >= data.last_page} onClick={() => setPage((p) => p + 1)}>Berikutnya</button>
            </div>
          )}
          {isFetching && !isLoading && <div className="resource-note">Memperbarui...</div>}
        </section>

        <article className="blog-reader">
          {!currentPost && (
            <div className="fm-no-event">
              <BookOpen size={36} />
              <p>Pilih tulisan untuk membaca.</p>
            </div>
          )}
          {currentPost && (
            <>
              <div className="blog-reader-top">
                <div>
                  <p className="mono-kicker text-muted">{currentPost.category || 'Umum'}</p>
                  <h2>{currentPost.title}</h2>
                </div>
                {writable && (
                  <div className="blog-reader-actions">
                    <button className="icon-action" title="Ubah" onClick={() => setEditing(currentPost)}><Edit3 size={14} /></button>
                    <button className="icon-action danger-icon" title="Hapus" onClick={() => { if (window.confirm(`Hapus "${currentPost.title}"?`)) remove.mutate(currentPost); }}><Trash2 size={14} /></button>
                  </div>
                )}
              </div>
              <div className="blog-reader-meta">
                <span>{currentPost.author?.name || 'Penulis CorpU'}</span>
                <span><Calendar size={13} /> {formatDate(currentPost.published_at || currentPost.created_at)}</span>
                <span>{currentPost.reading_minutes} menit baca</span>
                {currentPost.slug && (
                  <a href={`/artikel/${currentPost.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink size={13} /> Publik
                  </a>
                )}
              </div>
              {currentPost.featured_image && <img className="blog-reader-cover" src={currentPost.featured_image} alt="" />}
              {currentPost.excerpt && <p className="blog-excerpt">{currentPost.excerpt}</p>}
              {currentPost.tags?.length > 0 && (
                <div className="blog-tag-row">
                  {currentPost.tags.map((tag) => <span key={tag}>#{tag}</span>)}
                </div>
              )}
              <div className="blog-body" dangerouslySetInnerHTML={{ __html: safe(currentPost.body) }} />
              {visibleCategoryNames.length > 0 && (
                <div className="blog-category-strip">
                  {visibleCategoryNames.slice(0, 5).map((category) => <span key={category}>{category}</span>)}
                </div>
              )}
            </>
          )}
        </article>
      </div>

      {editing !== undefined && (
        <BlogEditor
          post={editing}
          categories={categories}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            invalidate();
          }}
        />
      )}
      {categoryManagerOpen && (
        <CategoryManager
          categories={categories}
          onClose={() => setCategoryManagerOpen(false)}
          onSaved={invalidate}
        />
      )}
    </div>
  );
}
