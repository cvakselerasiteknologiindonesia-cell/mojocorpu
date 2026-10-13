import { useEffect, useRef, useState } from 'react';
import { safe } from '../utils/sanitize.js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Youtube from '@tiptap/extension-youtube';
import { Node, mergeAttributes } from '@tiptap/core';
import {
  Bold,
  ChevronRight,
  Code,
  Edit2,
  Film,
  ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Lock,
  MessageSquare,
  Plus,
  Quote,
  Redo2,
  Search,
  Send,
  Strikethrough,
  Trash2,
  Undo2,
  Unlock,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../api.js';
import { hasAnyPermission } from '../utils/permissions.js';

// ── Custom Video node (for uploaded / direct-URL video) ───────────────────────

const VideoNode = Node.create({
  name: 'video',
  group: 'block',
  atom: true,
  addAttributes() {
    return { src: { default: null } };
  },
  parseHTML() {
    return [{ tag: 'video[src]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['video', mergeAttributes({ controls: true, style: 'max-width:100%;border-radius:6px;' }, HTMLAttributes)];
  },
  addCommands() {
    return {
      setVideo: (options) => ({ commands }) => commands.insertContent({ type: this.name, attrs: options }),
    };
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(d) {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return 'baru saja';
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function Avatar({ name }) {
  const initials = (name || '?').split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return <span className="df-avatar">{initials}</span>;
}

// ── WYSIWYG toolbar button ────────────────────────────────────────────────────

function TbBtn({ action, isActive, title, children }) {
  return (
    <button
      type="button"
      className={`df-tb-btn${isActive ? ' active' : ''}`}
      onMouseDown={(e) => { e.preventDefault(); action(); }}
      title={title}
    >
      {children}
    </button>
  );
}

// ── Media insert popover ──────────────────────────────────────────────────────

function MediaPopover({ mode, editor, onClose }) {
  const [tab, setTab] = useState(mode === 'video' ? 'youtube' : 'upload');
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const isImage = mode === 'image';

  const insertUrl = () => {
    if (!url.trim()) return;
    if (isImage) {
      editor.chain().focus().setImage({ src: url.trim() }).run();
    } else if (tab === 'youtube') {
      editor.chain().focus().setYoutubeVideo({ src: url.trim() }).run();
    } else {
      editor.chain().focus().setVideo({ src: url.trim() }).run();
    }
    onClose();
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.post('/discussion-forum/media', fd);
      const src = res.data.data.url;
      if (isImage) {
        editor.chain().focus().setImage({ src }).run();
      } else {
        editor.chain().focus().setVideo({ src }).run();
      }
      onClose();
    } catch {
      toast.error('Gagal mengunggah berkas.');
    } finally {
      setUploading(false);
    }
  };

  const accept = isImage ? 'image/jpeg,image/png,image/gif,image/webp' : 'video/mp4,video/webm,video/quicktime';

  return (
    <>
      <div className="df-popover-backdrop" onClick={onClose} />
      <div className="df-popover">
        <div className="df-popover-tabs">
          {isImage ? (
            <>
              <button className={`df-popover-tab${tab === 'upload' ? ' active' : ''}`} onClick={() => setTab('upload')}><Upload size={12} /> Unggah</button>
              <button className={`df-popover-tab${tab === 'url' ? ' active' : ''}`} onClick={() => setTab('url')}><Link2 size={12} /> Tautan</button>
            </>
          ) : (
            <>
              <button className={`df-popover-tab${tab === 'youtube' ? ' active' : ''}`} onClick={() => setTab('youtube')}>YouTube</button>
              <button className={`df-popover-tab${tab === 'upload' ? ' active' : ''}`} onClick={() => setTab('upload')}><Upload size={12} /> Unggah</button>
              <button className={`df-popover-tab${tab === 'url' ? ' active' : ''}`} onClick={() => setTab('url')}><Link2 size={12} /> Tautan</button>
            </>
          )}
        </div>

        <div className="df-popover-body">
          {tab === 'upload' && (
            <div
              className="df-drop-zone"
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            >
              {uploading ? (
                <span className="df-drop-uploading">Mengunggah…</span>
              ) : (
                <>
                  {isImage ? <ImageIcon size={22} /> : <Film size={22} />}
                  <span>Klik atau seret {isImage ? 'gambar' : 'video'} ke sini</span>
                  <em>{isImage ? 'JPG, PNG, GIF, WebP · maks 50 MB' : 'MP4, WebM, MOV · maks 50 MB'}</em>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={accept}
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>
          )}

          {(tab === 'url' || tab === 'youtube') && (
            <div className="df-url-row">
              <input
                className="form-input"
                placeholder={tab === 'youtube' ? 'https://youtube.com/watch?v=…' : isImage ? 'https://contoh.com/gambar.jpg' : 'https://contoh.com/video.mp4'}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && insertUrl()}
                autoFocus
              />
              <button className="primary-button compact" onClick={insertUrl} disabled={!url.trim()}>Sisipkan</button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Body WYSIWYG editor ───────────────────────────────────────────────────────

function BodyEditor({ initialContent, onChange }) {
  const [mediaMode, setMediaMode] = useState(null); // 'image' | 'video' | null
  const imgBtnRef = useRef(null);
  const vidBtnRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ HTMLAttributes: { style: 'max-width:100%;border-radius:6px;' } }),
      Youtube.configure({ width: '100%', height: 340, nocookie: true }),
      VideoNode,
    ],
    content: initialContent || '',
    onUpdate: ({ editor: ed }) => onChange(ed.getHTML()),
    editorProps: {
      attributes: { class: 'df-prose-editor' },
    },
  });

  useEffect(() => () => editor?.destroy(), [editor]);

  if (!editor) return null;
  const e = editor;
  const sep = <span className="df-tb-sep" />;

  return (
    <div className="df-editor-wrap">
      <div className="df-toolbar">
        <TbBtn action={() => e.chain().focus().toggleBold().run()} isActive={e.isActive('bold')} title="Tebal"><Bold size={14} /></TbBtn>
        <TbBtn action={() => e.chain().focus().toggleItalic().run()} isActive={e.isActive('italic')} title="Miring"><Italic size={14} /></TbBtn>
        <TbBtn action={() => e.chain().focus().toggleStrike().run()} isActive={e.isActive('strike')} title="Coret"><Strikethrough size={14} /></TbBtn>
        {sep}
        <TbBtn action={() => e.chain().focus().toggleBulletList().run()} isActive={e.isActive('bulletList')} title="Poin"><List size={14} /></TbBtn>
        <TbBtn action={() => e.chain().focus().toggleOrderedList().run()} isActive={e.isActive('orderedList')} title="Nomor"><ListOrdered size={14} /></TbBtn>
        {sep}
        <TbBtn action={() => e.chain().focus().toggleBlockquote().run()} isActive={e.isActive('blockquote')} title="Kutipan"><Quote size={14} /></TbBtn>
        <TbBtn action={() => e.chain().focus().toggleCode().run()} isActive={e.isActive('code')} title="Kode"><Code size={14} /></TbBtn>
        {sep}
        {/* Media buttons — positioned relative for popover */}
        <div className="df-tb-media-wrap" ref={imgBtnRef}>
          <TbBtn
            action={() => setMediaMode((m) => (m === 'image' ? null : 'image'))}
            isActive={mediaMode === 'image'}
            title="Sisipkan Gambar"
          >
            <ImageIcon size={14} />
          </TbBtn>
          {mediaMode === 'image' && (
            <MediaPopover mode="image" editor={e} onClose={() => setMediaMode(null)} />
          )}
        </div>
        <div className="df-tb-media-wrap" ref={vidBtnRef}>
          <TbBtn
            action={() => setMediaMode((m) => (m === 'video' ? null : 'video'))}
            isActive={mediaMode === 'video'}
            title="Sisipkan Video"
          >
            <Film size={14} />
          </TbBtn>
          {mediaMode === 'video' && (
            <MediaPopover mode="video" editor={e} onClose={() => setMediaMode(null)} />
          )}
        </div>
        {sep}
        <TbBtn action={() => e.chain().focus().undo().run()} title="Urungkan"><Undo2 size={14} /></TbBtn>
        <TbBtn action={() => e.chain().focus().redo().run()} title="Ulangi"><Redo2 size={14} /></TbBtn>
      </div>
      <div className="df-editor-body">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ── Thread Compose Sheet ──────────────────────────────────────────────────────

function ThreadModal({ initial, onClose, onSave, isSaving }) {
  const isEdit = !!initial;
  const [title, setTitle] = useState(initial?.title ?? '');
  const [bodyHtml, setBodyHtml] = useState(initial?.body ?? '');
  const titleRef = useRef(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  const isEmpty = (html) => !html || html === '<p></p>' || html.trim() === '';
  const canSubmit = title.trim().length > 0 && !isEmpty(bodyHtml);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSave({ title: title.trim(), body: bodyHtml });
  };

  return (
    <div className="df-compose-overlay" onClick={onClose}>
      <div className="df-compose-sheet" onClick={(e) => e.stopPropagation()}>

        {/* Sheet header */}
        <div className="df-compose-header">
          <span className="df-compose-label">{isEdit ? 'Ubah Diskusi' : 'Diskusi Baru'}</span>
          <button className="icon-button" onClick={onClose} title="Tutup">✕</button>
        </div>

        <form className="df-compose-form" onSubmit={handleSubmit}>
          {/* Title */}
          <input
            ref={titleRef}
            className="df-compose-title-input"
            placeholder="Judul diskusi…"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={255}
          />
          <div className="df-compose-divider" />

          {/* WYSIWYG body */}
          <BodyEditor
            key={initial?.uuid ?? 'new'}
            initialContent={initial?.body ?? ''}
            onChange={setBodyHtml}
          />

          {/* Footer */}
          <div className="df-compose-footer">
            <span className="df-compose-hint">
              {title.length > 0 ? `${title.length}/255` : 'Tulis judul untuk mulai'}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" className="outline-button" onClick={onClose}>Batal</button>
              <button
                type="submit"
                className="primary-button"
                disabled={!canSubmit || isSaving}
              >
                {isSaving ? 'Menyimpan…' : isEdit ? 'Simpan perubahan' : 'Kirim diskusi'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  );
}

// ── Comment Row ───────────────────────────────────────────────────────────────

function CommentRow({ comment, currentUserId, canDelete, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(comment.body);

  const isOwn = comment.user_id === currentUserId;

  const handleSave = () => {
    if (!body.trim()) return;
    onUpdate(comment.id, body.trim());
    setEditing(false);
  };

  return (
    <div className="df-comment">
      <Avatar name={comment.author?.name} />
      <div className="df-comment-body">
        <div className="df-comment-meta">
          <strong>{comment.author?.name ?? 'Pengguna'}</strong>
          <span>{timeAgo(comment.created_at)}</span>
          {comment.created_at !== comment.updated_at && <em className="df-edited">(diedit)</em>}
        </div>
        {editing ? (
          <div className="df-comment-edit">
            <textarea
              className="form-input"
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="primary-button compact" onClick={handleSave}>Simpan</button>
              <button className="outline-button compact" onClick={() => { setEditing(false); setBody(comment.body); }}>Batal</button>
            </div>
          </div>
        ) : (
          <p className="df-comment-text">{comment.body}</p>
        )}
      </div>
      {(isOwn || canDelete) && !editing && (
        <div className="df-comment-actions">
          {isOwn && (
            <button className="icon-action" title="Ubah" onClick={() => setEditing(true)}><Edit2 size={12} /></button>
          )}
          <button className="icon-action danger-icon" title="Hapus" onClick={() => onDelete(comment.id)}><Trash2 size={12} /></button>
        </div>
      )}
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function ThreadListSkeleton() {
  return (
    <>
      {Array.from({ length: 9 }).map((_, i) => (
        <div
          key={i}
          className="df-thread-item"
          style={{ opacity: Math.max(0.18, 1 - i * 0.1), pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
            <Skel w="78%" h={13} />
            <Skel w="52%" h={10} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <Skel w={28} h={14} />
            <Skel w={14} h={14} />
          </div>
        </div>
      ))}
    </>
  );
}

function ThreadDetailSkeleton() {
  return (
    <div className="df-detail">
      {/* Header */}
      <div className="df-detail-head">
        <div className="df-detail-title-row">
          <Skel w="68%" h={22} />
        </div>
        <div className="df-detail-meta" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span className="df-avatar" style={{ background: 'var(--border)' }} />
          <Skel w={160} h={11} />
        </div>
      </div>

      {/* Body */}
      <div className="df-thread-body" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 0' }}>
        <Skel w="92%" h={13} />
        <Skel w="86%" h={13} />
        <Skel w="74%" h={13} />
        <Skel w="80%" h={13} style={{ marginTop: 6 }} />
        <Skel w="60%" h={13} />
      </div>

      {/* Comments */}
      <div className="df-comments-section">
        <Skel w={80} h={10} style={{ marginBottom: 14 }} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="df-comment" style={{ opacity: Math.max(0.3, 1 - i * 0.25) }}>
            <span className="df-avatar" style={{ background: 'var(--border)' }} />
            <div className="df-comment-body" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Skel w={80} h={12} />
                <Skel w={50} h={10} />
              </div>
              <Skel w="85%" h={11} />
              <Skel w="62%" h={11} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Thread Detail Panel ───────────────────────────────────────────────────────

function ThreadDetail({ uuid, session, onClose }) {
  const queryClient = useQueryClient();
  const [commentBody, setCommentBody] = useState('');
  const [editThread, setEditThread] = useState(false);
  const textareaRef = useRef(null);

  const qk = ['thread', uuid];
  const { data: thread, isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => (await api.get(`/discussion-forum/threads/${uuid}`)).data.data,
    enabled: !!uuid,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: qk });
  const invalidateList = () => queryClient.invalidateQueries({ queryKey: ['df-threads'] });

  const currentUserId = session?.user?.id;
  const canDelete = session?.user?.roles?.some((r) => ['super-admin', 'admin-opd'].includes(r.name));
  const canReply = hasAnyPermission(session, ['reply to discussions', 'create discussion forum', 'create discussion topics']);
  const canCreate = hasAnyPermission(session, ['create discussion forum', 'create discussion topics']);
  const isOwn = thread?.created_by === currentUserId;

  const commentMut = useMutation({
    mutationFn: (body) => api.post(`/discussion-forum/threads/${uuid}/comments`, { body }),
    onSuccess: () => {
      invalidate(); invalidateList();
      setCommentBody('');
      toast.success('Balasan terkirim.');
    },
    onError: () => toast.error('Gagal mengirim balasan.'),
  });

  const updateCommentMut = useMutation({
    mutationFn: ({ id, body }) => api.put(`/discussion-forum/threads/${uuid}/comments/${id}`, { body }),
    onSuccess: () => { invalidate(); toast.success('Balasan diperbarui.'); },
    onError: () => toast.error('Gagal memperbarui balasan.'),
  });

  const deleteCommentMut = useMutation({
    mutationFn: (id) => api.delete(`/discussion-forum/threads/${uuid}/comments/${id}`),
    onSuccess: () => { invalidate(); invalidateList(); toast.success('Balasan dihapus.'); },
    onError: () => toast.error('Gagal menghapus balasan.'),
  });

  const updateThreadMut = useMutation({
    mutationFn: (form) => api.put(`/discussion-forum/threads/${uuid}`, form),
    onSuccess: () => { invalidate(); invalidateList(); setEditThread(false); toast.success('Diskusi diperbarui.'); },
    onError: () => toast.error('Gagal memperbarui diskusi.'),
  });

  const toggleStatusMut = useMutation({
    mutationFn: (status) => api.put(`/discussion-forum/threads/${uuid}`, { status }),
    onSuccess: () => { invalidate(); invalidateList(); toast.success('Status diskusi diperbarui.'); },
    onError: () => toast.error('Gagal mengubah status.'),
  });

  const deleteThreadMut = useMutation({
    mutationFn: () => api.delete(`/discussion-forum/threads/${uuid}`),
    onSuccess: () => {
      invalidateList();
      onClose();
      toast.success('Diskusi dihapus.');
    },
    onError: () => toast.error('Gagal menghapus diskusi.'),
  });

  const handleComment = (e) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    commentMut.mutate(commentBody.trim());
  };

  if (isLoading) return <ThreadDetailSkeleton />;
  if (!thread) return null;

  const isClosed = thread.status === 'closed';

  return (
    <div className="df-detail">
      {/* Thread header */}
      <div className="df-detail-head">
        <div className="df-detail-title-row">
          <h2 className="df-detail-title">{thread.title}</h2>
          {isClosed && <span className="df-status-badge df-status-badge--closed">Ditutup</span>}
        </div>
        <div className="df-detail-meta">
          <Avatar name={thread.author?.name} />
          <span><strong>{thread.author?.name ?? '—'}</strong> · {timeAgo(thread.created_at)}</span>
          {thread.training_event && (
            <span className="df-event-tag"># {thread.training_event.title}</span>
          )}
        </div>
        {(isOwn || canDelete) && (
          <div className="df-detail-actions">
            {(isOwn || canDelete) && (
              <button className="icon-action" title="Ubah" onClick={() => setEditThread(true)}><Edit2 size={13} /></button>
            )}
            {(isOwn || canDelete) && (
              <button
                className="icon-action"
                title={isClosed ? 'Buka kembali' : 'Tutup diskusi'}
                onClick={() => toggleStatusMut.mutate(isClosed ? 'open' : 'closed')}
              >
                {isClosed ? <Unlock size={13} /> : <Lock size={13} />}
              </button>
            )}
            <button className="icon-action danger-icon" title="Hapus" onClick={() => {
              if (window.confirm('Hapus diskusi ini beserta semua balasannya?')) deleteThreadMut.mutate();
            }}>
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Thread body */}
      {/* Internal app — HTML from authenticated users only */}
      <div className="df-thread-body df-rich-content" dangerouslySetInnerHTML={{ __html: safe(thread.body) }} />

      {/* Comments */}
      <div className="df-comments-section">
        <p className="df-comments-count mono-kicker text-muted">
          {thread.comments_count} Balasan
        </p>
        <div className="df-comments-list">
          {(thread.comments || []).map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              currentUserId={currentUserId}
              canDelete={canDelete}
              onUpdate={(id, body) => updateCommentMut.mutate({ id, body })}
              onDelete={(id) => {
                if (window.confirm('Hapus balasan ini?')) deleteCommentMut.mutate(id);
              }}
            />
          ))}
          {thread.comments?.length === 0 && (
            <p className="df-no-comments">Belum ada balasan. Jadilah yang pertama!</p>
          )}
        </div>

        {/* Reply box */}
        {canReply && !isClosed && (
          <form className="df-reply-form" onSubmit={handleComment}>
            <Avatar name={session?.user?.name} />
            <div className="df-reply-input-wrap">
              <textarea
                ref={textareaRef}
                className="form-input df-reply-textarea"
                placeholder="Tulis balasan..."
                rows={2}
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleComment(e);
                }}
                style={{ resize: 'vertical' }}
              />
              <button
                type="submit"
                className="primary-button compact df-reply-btn"
                disabled={!commentBody.trim() || commentMut.isPending}
              >
                <Send size={13} /> Kirim
              </button>
            </div>
          </form>
        )}
        {isClosed && (
          <p className="df-closed-note">Diskusi ini telah ditutup dan tidak menerima balasan baru.</p>
        )}
      </div>

      {editThread && (
        <ThreadModal
          initial={thread}
          onClose={() => setEditThread(false)}
          onSave={(form) => updateThreadMut.mutate(form)}
          isSaving={updateThreadMut.isPending}
        />
      )}
    </div>
  );
}

// ── Thread List ───────────────────────────────────────────────────────────────

function ThreadListItem({ thread, isActive, onClick }) {
  return (
    <button
      className={`df-thread-item${isActive ? ' active' : ''}${thread.status === 'closed' ? ' df-thread-item--closed' : ''}`}
      onClick={onClick}
    >
      <div className="df-thread-item-body">
        <div className="df-thread-item-title">
          {thread.status === 'closed' && <Lock size={11} className="df-lock-icon" />}
          {thread.title}
        </div>
        <div className="df-thread-item-meta">
          <span>{thread.author?.name ?? '—'}</span>
          <span>·</span>
          <span>{timeAgo(thread.updated_at)}</span>
        </div>
      </div>
      <div className="df-thread-item-right">
        <span className="df-comment-count"><MessageSquare size={11} /> {thread.comments_count ?? 0}</span>
        <ChevronRight size={14} />
      </div>
    </button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DiscussionForum({ session }) {
  const [selectedUuid, setSelectedUuid] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const queryClient = useQueryClient();

  const canCreate = hasAnyPermission(session, ['create discussion forum', 'create discussion topics']);

  const { data, isLoading } = useQuery({
    queryKey: ['df-threads', search, page],
    queryFn: async () => (await api.get('/discussion-forum/threads', { params: { search, page, per_page: 25 } })).data.data,
    keepPreviousData: true,
  });

  const threads = data?.data ?? [];
  const meta = data;

  const createMut = useMutation({
    mutationFn: (form) => api.post('/discussion-forum/threads', form),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['df-threads'] });
      setShowCreate(false);
      setSelectedUuid(res.data.data.uuid);
      toast.success('Diskusi dibuat.');
    },
    onError: () => toast.error('Gagal membuat diskusi.'),
  });

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Kolaborasi</p>
        <h1>Forum Diskusi</h1>
      </div>

      <div className="fm-layout">
        {/* Thread list sidebar */}
        <aside className="fm-events-list df-thread-list">
          <div className="fm-events-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Diskusi</span>
            {canCreate && (
              <button className="icon-button" title="Buat diskusi baru" onClick={() => setShowCreate(true)}>
                <Plus size={14} />
              </button>
            )}
          </div>

          {/* Search */}
          <div className="df-thread-search">
            <Search size={13} />
            <input
              placeholder="Cari diskusi..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {isLoading && <ThreadListSkeleton />}
          {!isLoading && threads.length === 0 && (
            <div className="resource-note">
              {search ? 'Tidak ada diskusi yang cocok.' : 'Belum ada diskusi.'}
            </div>
          )}

          {threads.map((t) => (
            <ThreadListItem
              key={t.uuid}
              thread={t}
              isActive={selectedUuid === t.uuid}
              onClick={() => setSelectedUuid(t.uuid)}
            />
          ))}

          {/* Pagination */}
          {(meta?.last_page ?? 1) > 1 && (
            <div className="df-pagination">
              <button
                className="outline-button compact"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >‹ Sebelumnya</button>
              <span>{page} / {meta.last_page}</span>
              <button
                className="outline-button compact"
                disabled={page >= (meta?.last_page ?? 1)}
                onClick={() => setPage((p) => p + 1)}
              >Berikutnya ›</button>
            </div>
          )}
        </aside>

        {/* Thread detail panel */}
        <div className="fm-materials-panel df-detail-panel">
          {!selectedUuid && (
            <div className="fm-no-event">
              <MessageSquare size={36} />
              <p>Pilih diskusi untuk membaca atau berpartisipasi.</p>
              {canCreate && (
                <button className="primary-button" onClick={() => setShowCreate(true)}>
                  <Plus size={14} /> Buat Diskusi
                </button>
              )}
            </div>
          )}

          {selectedUuid && (
            <ThreadDetail
              key={selectedUuid}
              uuid={selectedUuid}
              session={session}
              onClose={() => setSelectedUuid(null)}
            />
          )}
        </div>
      </div>

      {showCreate && (
        <ThreadModal
          onClose={() => setShowCreate(false)}
          onSave={(form) => createMut.mutate(form)}
          isSaving={createMut.isPending}
        />
      )}
    </div>
  );
}
