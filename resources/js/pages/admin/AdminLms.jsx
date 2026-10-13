import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  ChevronRight,
  ExternalLink,
  FileText,
  Link,
  MessageSquare,
  Send,
  Trash2,
  Video,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

const MATERIAL_TYPE_ICONS   = { document: FileText, video: Video, link: Link, presentation: BookOpen };
const MATERIAL_TYPE_LABELS  = { document: 'Dokumen', video: 'Video', link: 'Tautan', presentation: 'Presentasi' };
const MATERIAL_TYPE_ACCENTS = { document: 'emerald', video: 'crimson', link: 'grape', presentation: 'amber' };

const STATUS_COLORS = {
  draft:     { bg: '#f3f4f6', color: '#6b7280' },
  active:    { bg: '#f0fdf4', color: '#16a34a' },
  completed: { bg: '#eff6ff', color: '#2563eb' },
  cancelled: { bg: '#fef2f2', color: '#dc2626' },
};

const STATUS_LABELS = {
  draft: 'Draf',
  active: 'Aktif',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

function formatDate(d) {
  if (!d) return '—';
  const s = d.length > 10 ? d.substring(0, 10) : d;
  return new Date(`${s}T00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function initials(name = '') {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

// ── Comment Modal ─────────────────────────────────────────────────────────────

function CommentModal({ material, onClose }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const textareaRef = useRef(null);

  const commentsQk = ['lms-comments', material.id];

  const { data: comments = [], isLoading } = useQuery({
    queryKey: commentsQk,
    queryFn: () => api.get(`/lms/materials/${material.id}/comments`).then((r) => r.data.data),
    staleTime: 10_000,
  });

  const addComment = useMutation({
    mutationFn: () => api.post(`/lms/materials/${material.id}/comments`, { body }),
    onSuccess: (res) => {
      qc.setQueryData(commentsQk, (old = []) => [res.data.data, ...old]);
      setBody('');
      toast.success('Komentar dikirim. Fasilitator telah dinotifikasi.');
    },
    onError: () => toast.error('Gagal mengirim komentar.'),
  });

  const deleteComment = useMutation({
    mutationFn: (id) => api.delete(`/lms/comments/${id}`),
    onSuccess: (_, id) => {
      qc.setQueryData(commentsQk, (old = []) => old.filter((c) => c.id !== id));
      toast.success('Komentar dihapus.');
    },
    onError: () => toast.error('Gagal menghapus komentar.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!body.trim()) return;
    addComment.mutate();
  };

  const accent = MATERIAL_TYPE_ACCENTS[material.type] || 'emerald';
  const Icon   = MATERIAL_TYPE_ICONS[material.type] || FileText;

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', maxHeight: '88vh' }}>

        {/* Head */}
        <div className="modal-head" style={{ flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className={`material-card-icon-wrap setup-icon--${accent}`} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, flexShrink: 0 }}>
              <Icon size={15} />
            </span>
            <div>
              <h2 style={{ margin: 0, fontSize: 15 }}>{material.title}</h2>
              <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)', fontFamily: 'Space Mono, monospace' }}>
                {MATERIAL_TYPE_LABELS[material.type] || material.type}
              </p>
            </div>
          </div>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        {/* Material info */}
        {(material.file_url || material.url) && (
          <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}>
            <a href={material.file_url || material.url} target="_blank" rel="noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--grape)', textDecoration: 'none' }}>
              <ExternalLink size={12} /> Buka Materi
            </a>
          </div>
        )}

        {/* Comments list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isLoading && <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: 0 }}>Memuat komentar…</p>}

          {!isLoading && comments.length === 0 && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <MessageSquare size={28} style={{ color: 'var(--fg-3)', margin: '0 auto 8px' }} />
              <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: 0 }}>Belum ada komentar. Tambahkan catatan atau umpan balik untuk fasilitator.</p>
            </div>
          )}

          {comments.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--grape)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                {initials(c.author_name)}
              </div>
              <div style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)' }}>{c.author_name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'Space Mono, monospace' }}>{formatTime(c.created_at)}</span>
                    <button className="icon-action danger-icon" title="Hapus" style={{ padding: 2 }}
                      onClick={() => deleteComment.mutate(c.id)}>
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--fg)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{c.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '14px 20px', display: 'flex', gap: 10 }}>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(e); }}
            placeholder="Tulis komentar atau umpan balik… (Ctrl+Enter untuk kirim)"
            rows={2}
            style={{ flex: 1, resize: 'none', border: '1px solid var(--border)', padding: '8px 10px',
              fontSize: 13, font: 'inherit', outline: 'none', background: '#fff', color: 'var(--fg)',
              borderRadius: 6, lineHeight: 1.5 }}
          />
          <button type="submit" className="primary-button compact" disabled={!body.trim() || addComment.isPending}
            style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Send size={13} /> {addComment.isPending ? '…' : 'Kirim'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminLms() {
  const [selectedUuid, setSelectedUuid]       = useState(null);
  const [search, setSearch]                   = useState('');
  const [commentingOn, setCommentingOn]       = useState(null); // material object

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['admin-lms-events-list'],
    queryFn: async () => (await api.get('/training-events?per_page=100')).data.data.data,
  });

  const filteredEvents = search
    ? events.filter((ev) => ev.title.toLowerCase().includes(search.toLowerCase()))
    : events;

  const { data: materials = [], isLoading: matLoading } = useQuery({
    queryKey: ['admin-lms-materials', selectedUuid],
    queryFn: async () => (await api.get(`/training-events/${selectedUuid}/materials`)).data.data,
    enabled: !!selectedUuid,
  });

  // prefetch comment counts
  const { data: commentCounts = {} } = useQuery({
    queryKey: ['admin-lms-comment-counts', selectedUuid, materials.map((m) => m.id).join(',')],
    queryFn: async () => {
      const counts = {};
      await Promise.all(
        materials.map((m) =>
          api.get(`/lms/materials/${m.id}/comments`).then((r) => { counts[m.id] = r.data.data.length; })
        )
      );
      return counts;
    },
    enabled: materials.length > 0,
    staleTime: 30_000,
  });

  const selectedEvent = events.find((e) => e.uuid === selectedUuid);

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Pembelajaran</p>
        <h1>Sistem Manajemen Pembelajaran</h1>
      </div>

      <div className="fm-layout">
        {/* Daftar kegiatan */}
        <aside className="fm-events-list">
          <div className="fm-events-header">Kegiatan Pelatihan</div>

          <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kegiatan…"
              style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)',
                padding: '6px 10px', fontSize: 12, background: '#fff', color: 'var(--fg)',
                font: 'inherit', outline: 'none' }}
            />
          </div>

          {eventsLoading && <div className="resource-note">Memuat…</div>}
          {!eventsLoading && filteredEvents.length === 0 && (
            <div className="resource-note">Tidak ada kegiatan ditemukan.</div>
          )}
          {filteredEvents.map((ev) => {
            const sc = STATUS_COLORS[ev.status] ?? STATUS_COLORS.draft;
            return (
              <button
                key={ev.uuid}
                className={`fm-event-item${selectedUuid === ev.uuid ? ' active' : ''}`}
                onClick={() => setSelectedUuid(ev.uuid)}
              >
                <div className="fm-event-item-body">
                  <strong>{ev.title}</strong>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {formatDate(ev.start_date)}
                    <em style={{ fontStyle: 'normal', fontSize: 10, padding: '1px 6px',
                      background: sc.bg, color: sc.color, borderRadius: 3, fontFamily: 'inherit' }}>
                      {STATUS_LABELS[ev.status] || ev.status}
                    </em>
                  </span>
                </div>
                <ChevronRight size={14} className="fm-event-chevron" />
              </button>
            );
          })}
        </aside>

        {/* Panel materi */}
        <div className="fm-materials-panel">
          {!selectedUuid && (
            <div className="fm-no-event">
              <BookOpen size={36} />
              <p>Pilih kegiatan pelatihan untuk melihat dan meninjau materi pembelajaran.</p>
            </div>
          )}

          {selectedUuid && (
            <>
              <div className="fm-panel-head">
                <div>
                  <strong className="fm-panel-title">{selectedEvent?.title}</strong>
                  <span className="fm-panel-sub">{materials.length} materi</span>
                </div>
              </div>

              {matLoading && <div className="resource-note">Memuat materi…</div>}

              {!matLoading && materials.length === 0 && (
                <div className="material-empty">
                  <BookOpen size={28} />
                  <p>Belum ada materi pembelajaran untuk kegiatan ini.</p>
                  <span>Materi ditambahkan oleh fasilitator.</span>
                </div>
              )}

              <div className="material-cards">
                {materials.map((m) => {
                  const Icon   = MATERIAL_TYPE_ICONS[m.type] || FileText;
                  const accent = MATERIAL_TYPE_ACCENTS[m.type] || 'emerald';
                  const count  = commentCounts[m.id] ?? 0;
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
                          <a href={m.file_url || m.url} target="_blank" rel="noreferrer" className="icon-action" title="Lihat Berkas">
                            <ExternalLink size={13} />
                          </a>
                        )}
                        <button
                          className="icon-action"
                          title="Komentar"
                          onClick={() => setCommentingOn(m)}
                          style={{ position: 'relative' }}
                        >
                          <MessageSquare size={13} />
                          {count > 0 && (
                            <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--grape)',
                              color: '#fff', borderRadius: '50%', width: 14, height: 14, fontSize: 9,
                              fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              {count > 9 ? '9+' : count}
                            </span>
                          )}
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

      {commentingOn && (
        <CommentModal material={commentingOn} onClose={() => setCommentingOn(null)} />
      )}
    </div>
  );
}
