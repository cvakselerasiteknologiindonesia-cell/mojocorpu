import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BookOpen, ChevronDown, ChevronRight, ClipboardList, MessageSquare, Send, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E'];

const TYPE_CONFIG = {
  'pre-test':   { label: 'Pre-Test',  bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'post-test':  { label: 'Post-Test', bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  'evaluation': { label: 'Evaluasi',  bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
};

function formatTime(d) {
  if (!d) return '';
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Comment Modal ──────────────────────────────────────────────────────────────

function CommentModal({ quiz, onClose }) {
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const textRef = useRef(null);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['quiz-comments', quiz.uuid],
    queryFn: () => api.get(`/quizzes/${quiz.uuid}/comments`).then((r) => r.data.data),
    staleTime: 15_000,
  });

  const addMut = useMutation({
    mutationFn: () => api.post(`/quizzes/${quiz.uuid}/comments`, { body }),
    onSuccess: (res) => {
      qc.setQueryData(['quiz-comments', quiz.uuid], (old = []) => [res.data.data, ...old]);
      qc.invalidateQueries({ queryKey: ['quizzes-for-event', quiz.event_uuid] });
      setBody('');
      textRef.current?.focus();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal mengirim komentar.'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/quizzes/comments/${id}`),
    onSuccess: (_, id) => {
      qc.setQueryData(['quiz-comments', quiz.uuid], (old = []) => old.filter((c) => c.id !== id));
      qc.invalidateQueries({ queryKey: ['quizzes-for-event', quiz.event_uuid] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menghapus komentar.'),
  });

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && body.trim()) addMut.mutate();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 520, display: 'flex', flexDirection: 'column', maxHeight: '80vh' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <strong>Komentar Quiz</strong>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--fg-3)', fontWeight: 400 }}>{quiz.title}</p>
          </div>
          <button className="icon-button" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Comment list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {isLoading && <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: 0 }}>Memuat komentar…</p>}
          {!isLoading && comments.length === 0 && (
            <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: 0, textAlign: 'center', padding: '24px 0' }}>
              Belum ada komentar. Tulis komentar pertama di bawah.
            </p>
          )}
          {comments.map((c) => (
            <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--grape)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                {c.author_name?.charAt(0) ?? '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--fg)' }}>{c.author_name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'Space Mono, monospace' }}>{formatTime(c.created_at)}</span>
                    <button className="icon-button" style={{ color: 'var(--fg-3)' }} onClick={() => deleteMut.mutate(c.id)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--fg)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Compose */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <textarea
            ref={textRef}
            rows={2}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Tulis komentar… (Ctrl+Enter untuk kirim)"
            style={{ flex: 1, resize: 'none', border: '1px solid var(--border)', padding: '8px 10px', font: 'inherit', fontSize: 13, outline: 'none' }}
          />
          <button
            className="primary-button compact"
            disabled={addMut.isPending || !body.trim()}
            onClick={() => addMut.mutate()}
            style={{ flexShrink: 0 }}
          >
            {addMut.isPending ? '…' : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Question row (read-only) ───────────────────────────────────────────────────

function QuestionRow({ q }) {
  return (
    <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)' }}>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--fg)', lineHeight: 1.5 }}>{q.question}</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 18px', marginTop: 6 }}>
        {(q.options || []).map((opt, i) => {
          const isCorrect = OPTION_LABELS[i] === q.correct_answer || opt === q.correct_answer;
          return (
            <span key={i} style={{
              fontSize: 12,
              color: isCorrect ? '#166534' : 'var(--fg-3)',
              fontWeight: isCorrect ? 700 : 400,
            }}>
              {OPTION_LABELS[i]}. {typeof opt === 'object' ? opt.text : opt}
              {isCorrect && ' ✓'}
            </span>
          );
        })}
      </div>
      <span style={{ display: 'inline-block', marginTop: 4, fontSize: 11, color: 'var(--fg-3)' }}>Poin: {q.score}</span>
    </div>
  );
}

// ── Quiz Card (read-only + comment) ───────────────────────────────────────────

function QuizCard({ quiz }) {
  const [expanded, setExpanded] = useState(false);
  const [showComment, setShowComment] = useState(false);

  const tc = TYPE_CONFIG[quiz.quiz_type] ?? TYPE_CONFIG['pre-test'];

  return (
    <div style={{ border: '1px solid var(--border)', background: '#fff', overflow: 'hidden', marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderLeft: `3px solid ${tc.border}` }}>
        <button
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--fg-3)', display: 'flex' }}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 14 }}>{quiz.title}</strong>
            <span style={{ fontSize: 11, padding: '2px 8px', background: tc.bg, color: tc.color, border: `1px solid ${tc.border}` }}>
              {tc.label}
            </span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
            {quiz.question_count} soal · Total poin: {quiz.total_score} · Nilai lulus: {quiz.passing_score}
          </span>
        </div>

        {/* Comment button with badge */}
        <button
          className="outline-button compact"
          onClick={() => setShowComment(true)}
          style={{ position: 'relative', flexShrink: 0 }}
          title="Komentar"
        >
          <MessageSquare size={13} />
          {quiz.comment_count > 0 && (
            <em style={{ position: 'absolute', top: -6, right: -6, background: 'var(--grape)', color: '#fff',
              borderRadius: '50%', width: 16, height: 16, fontSize: 9, fontWeight: 700, fontStyle: 'normal',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {quiz.comment_count > 9 ? '9+' : quiz.comment_count}
            </em>
          )}
        </button>
      </div>

      {/* Questions (read-only) */}
      {expanded && (
        <div>
          {quiz.questions.length === 0 && (
            <p style={{ margin: 0, padding: '12px 16px', fontSize: 13, color: 'var(--fg-3)' }}>
              Belum ada soal pada quiz ini.
            </p>
          )}
          {quiz.questions.map((q) => <QuestionRow key={q.id} q={q} />)}
        </div>
      )}

      {showComment && <CommentModal quiz={quiz} onClose={() => setShowComment(false)} />}
    </div>
  );
}

// ── Quizzes panel ──────────────────────────────────────────────────────────────

function QuizzesPanel({ event }) {
  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ['quizzes-for-event', event.uuid],
    queryFn: () => api.get(`/quizzes?event_uuid=${event.uuid}`).then((r) => r.data.data),
    staleTime: 30_000,
  });

  return (
    <div className="fm-materials-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)', fontFamily: 'Space Mono, monospace' }}>QUIZ</p>
        <h2 style={{ margin: 0, fontSize: 16 }}>{event.title}</h2>
        <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{quizzes.length} quiz terdaftar</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {isLoading && <p style={{ color: 'var(--fg-3)', fontSize: 13 }}>Memuat quiz…</p>}
        {!isLoading && quizzes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', border: '1px dashed var(--border)', background: '#fafafa' }}>
            <ClipboardList size={32} style={{ color: 'var(--fg-3)', margin: '0 auto 12px' }} />
            <p style={{ margin: 0, fontSize: 14, color: 'var(--fg-3)' }}>Belum ada quiz untuk event ini.</p>
          </div>
        )}
        {quizzes.map((quiz) => <QuizCard key={quiz.uuid} quiz={quiz} />)}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminQuizzes() {
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const { data: stats } = useQuery({
    queryKey: ['quiz-stats'],
    queryFn: () => api.get('/quizzes/stats').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const { data: eventsRaw = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['training-events-quiz'],
    queryFn: () => api.get('/training-events?per_page=200').then((r) => r.data.data.data),
    staleTime: 60_000,
  });

  const events = eventsRaw.filter((e) =>
    !search || e.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Manajemen Quiz</p>
        <h1>Quiz & Penilaian</h1>
      </div>

      {/* Stats strip */}
      <div className="cp-stats" style={{ marginBottom: 16 }}>
        <div className="cp-stat">
          <span className="cp-stat-val">{stats?.total ?? '—'}</span>
          <span className="cp-stat-lbl">Total Quiz</span>
        </div>
        <div className="cp-stat cp-stat--approved">
          <span className="cp-stat-val">{stats?.pre_test ?? '—'}</span>
          <span className="cp-stat-lbl">Pre-Test</span>
        </div>
        <div className="cp-stat">
          <span className="cp-stat-val">{stats?.post_test ?? '—'}</span>
          <span className="cp-stat-lbl">Post-Test</span>
        </div>
        <div className="cp-stat">
          <span className="cp-stat-val">{stats?.total_questions ?? '—'}</span>
          <span className="cp-stat-lbl">Total Soal</span>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="fm-layout" style={{ flex: 1, minHeight: 0 }}>
        {/* Events sidebar */}
        <aside className="fm-events-list">
          <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border)' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari event…"
              style={{ width: '100%', border: '1px solid var(--border)', padding: '7px 10px', font: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          {eventsLoading && <p style={{ padding: 14, fontSize: 13, color: 'var(--fg-3)' }}>Memuat…</p>}
          {events.map((ev) => (
            <button
              key={ev.uuid}
              className={`fm-event-item${selectedEvent?.uuid === ev.uuid ? ' active' : ''}`}
              onClick={() => setSelectedEvent(ev)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BookOpen size={13} style={{ flexShrink: 0, color: 'var(--fg-3)' }} />
                <span style={{ fontSize: 13, textAlign: 'left', lineHeight: 1.4, flex: 1, minWidth: 0 }}>{ev.title}</span>
              </div>
              <span style={{ fontSize: 10, color: 'var(--fg-3)', marginTop: 3, display: 'block', textAlign: 'left' }}>{ev.status}</span>
            </button>
          ))}
        </aside>

        {/* Right panel */}
        {selectedEvent ? (
          <QuizzesPanel key={selectedEvent.uuid} event={selectedEvent} />
        ) : (
          <div className="fm-materials-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--fg-3)' }}>
            <ClipboardList size={40} />
            <p style={{ margin: 0, fontSize: 14 }}>Pilih event dari daftar kiri untuk melihat quiz-nya.</p>
          </div>
        )}
      </div>
    </div>
  );
}
