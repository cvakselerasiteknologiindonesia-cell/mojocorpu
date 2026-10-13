import { useState, useMemo, useEffect } from 'react';
import { safe } from '../../utils/sanitize.js';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Layers,
  Loader2,
  MapPin,
  Play,
  Printer,
  Send,
  Trophy,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react';
import api from '../../api.js';
import { CertPreviewCanvas, CertPrintArea } from '../../components/CertPreview.jsx';

function formatDate(d) {
  if (!d) return '—';
  const s = d.length > 10 ? d.substring(0, 10) : d;
  return new Date(`${s}T00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const MATERIAL_ICONS = { document: FileText, video: Layers, link: ExternalLink, presentation: BookOpen };
const TAB_ICONS = { materi: BookOpen, sesi: Layers, asesmen: ClipboardCheck, presensi: UserCheck, sertifikat: Award };

function seededShuffle(arr, seed) {
  const items = arr.map((item, i) => ({ item, i }));
  let s = (Math.abs(seed) || 1) >>> 0;
  for (let i = items.length - 1; i > 0; i--) {
    s = ((s * 1664525 + 1013904223) | 0) >>> 0;
    const j = s % (i + 1);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items; // [{item, originalIndex: i}]
}

// ── Question answer components ────────────────────────────────────────────────

function MatchingAnswer({ question, answers, setAnswers }) {
  const shuffledRights = useMemo(
    () => seededShuffle(question.options.map((p) => p.right ?? p), question.id),
    [question.id]
  );
  const selected = (answers[question.id] || '').split(',');

  const pick = (promptIdx, origRightIdx) => {
    const next = [...selected];
    while (next.length <= promptIdx) next.push('');
    next[promptIdx] = String(origRightIdx);
    setAnswers((a) => ({ ...a, [question.id]: next.join(',') }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {question.options.map((pair, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flex: 1, fontWeight: 500 }}>{pair.left ?? pair}</span>
          <span style={{ color: 'var(--muted)' }}>→</span>
          <select
            value={selected[i] ?? ''}
            onChange={(e) => pick(i, e.target.value)}
            style={{ flex: 1, padding: '5px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
          >
            <option value="">— pilih —</option>
            {shuffledRights.map((r, si) => (
              <option key={si} value={String(r.i)}>{r.item}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

function OrderingAnswer({ question, answers, setAnswers }) {
  const shuffledItems = useMemo(() => seededShuffle(question.options, question.id), [question.id]);

  const currentOrder = useMemo(() => {
    if (answers[question.id]) return answers[question.id].split(',').map(Number);
    return shuffledItems.map((r) => r.i);
  }, [answers[question.id], shuffledItems]);

  const move = (from, to) => {
    const next = [...currentOrder];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setAnswers((a) => ({ ...a, [question.id]: next.join(',') }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {currentOrder.map((origIdx, pos) => (
        <div key={origIdx} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface, #fff)' }}>
          <span style={{ color: 'var(--muted)', width: 20, textAlign: 'center', fontWeight: 700, flexShrink: 0 }}>{pos + 1}</span>
          <span style={{ flex: 1, fontSize: 13 }}>{question.options[origIdx]}</span>
          <div style={{ display: 'flex', gap: 2 }}>
            <button type="button" disabled={pos === 0} onClick={() => move(pos, pos - 1)} style={{ padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4, background: 'none', cursor: pos === 0 ? 'not-allowed' : 'pointer', opacity: pos === 0 ? 0.3 : 1 }}>↑</button>
            <button type="button" disabled={pos === currentOrder.length - 1} onClick={() => move(pos, pos + 1)} style={{ padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4, background: 'none', cursor: pos === currentOrder.length - 1 ? 'not-allowed' : 'pointer', opacity: pos === currentOrder.length - 1 ? 0.3 : 1 }}>↓</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Materi Tab ────────────────────────────────────────────────────────────────

function MateriTab({ materials }) {
  if (!materials?.length) {
    return <div className="resource-note">Belum ada materi yang diunggah.</div>;
  }

  return (
    <div className="work-list">
      {materials.map((m) => {
        const Icon = MATERIAL_ICONS[m.type] || FileText;
        const href = m.file_url || m.url;
        return (
          <div className="work-row" key={m.id} style={{ alignItems: 'center' }}>
            <Icon size={16} style={{ flexShrink: 0, color: 'var(--muted, #6b6b6b)' }} />
            <div style={{ flex: 1 }}>
              <strong>{m.title}</strong>
              {m.description && <span>{m.description}</span>}
            </div>
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="outline-button compact"
                style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              >
                {m.file_url ? <Download size={13} /> : <ExternalLink size={13} />}
                {m.file_url ? 'Unduh' : 'Buka'}
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Sesi Tab ──────────────────────────────────────────────────────────────────

function SessionCheckIn({ session, eventUuid }) {
  const queryClient = useQueryClient();
  const [done, setDone] = useState(!!session.my_attendance);

  const mut = useMutation({
    mutationFn: () => api.post(`/training-events/${eventUuid}/learn/sessions/${session.id}/check-in`),
    onSuccess: () => {
      setDone(true);
      queryClient.invalidateQueries({ queryKey: ['asn-learn', eventUuid] });
    },
  });

  if (done || session.my_attendance) {
    return (
      <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--success, #16a34a)', whiteSpace: 'nowrap' }}>
        <CheckCircle2 size={13} /> Hadir
      </span>
    );
  }

  return (
    <button
      className="outline-button compact"
      disabled={mut.isPending}
      onClick={() => mut.mutate()}
      style={{ whiteSpace: 'nowrap' }}
    >
      <UserCheck size={13} /> {mut.isPending ? '…' : 'Hadir'}
    </button>
  );
}

function SesiTab({ sessions, eventUuid }) {
  if (!sessions?.length) {
    return <div className="resource-note">Belum ada sesi pembelajaran.</div>;
  }

  return (
    <div className="work-list">
      {sessions.map((s, i) => (
        <div className="work-row" key={s.id} style={{ alignItems: 'flex-start' }}>
          <div style={{
            flexShrink: 0, width: 24, height: 24, borderRadius: '50%',
            background: s.my_attendance ? 'var(--success, #16a34a)' : s.status === 'completed' ? 'var(--border, #e3e3e3)' : 'var(--border, #e3e3e3)',
            color: s.my_attendance ? '#fff' : 'var(--muted)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700,
          }}>
            {i + 1}
          </div>
          <div style={{ flex: 1 }}>
            <strong>{s.title}</strong>
            {s.description && <span>{s.description}</span>}
            {s.start_date && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 12, color: 'var(--muted)' }}>
                <Clock size={11} /> {formatDateTime(s.start_date)}{s.end_date ? ` – ${formatDateTime(s.end_date)}` : ''}
              </span>
            )}
            {!s.start_date && s.duration_minutes && (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 12, color: 'var(--muted)' }}>
                <Clock size={11} /> {s.duration_minutes} menit
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <em className={`status-badge ${s.status === 'completed' ? 'active' : s.status === 'active' ? 'scheduled' : ''}`}>
              {s.status === 'completed' ? 'Selesai' : s.status === 'active' ? 'Aktif' : 'Belum mulai'}
            </em>
            <SessionCheckIn session={s} eventUuid={eventUuid} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Asesmen Tab ───────────────────────────────────────────────────────────────

const Q_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];
const Q_TYPE_LABELS = {
  multiple_choice: 'Pilihan Ganda', true_false: 'Benar / Salah',
  multiple_select: 'Pilih Banyak', fill_in_blank: 'Isian Singkat',
  essay: 'Esai', matching: 'Menjodohkan', ordering: 'Urutan',
};

function formatTime(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function useExamTimer(limitMinutes, active, onExpire) {
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    if (!active || !limitMinutes) { setTimeLeft(null); return; }
    setTimeLeft(limitMinutes * 60);
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(id); onExpire(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [active, limitMinutes]);

  return timeLeft;
}

function Asesmen({ assessment, eventUuid, onDone, onCertificate }) {
  const queryClient = useQueryClient();
  const [taking, setTaking] = useState(false);
  const [questionData, setQuestionData] = useState(null);
  const [answers, setAnswers] = useState({});
  const [currentQ, setCurrentQ] = useState(0);
  const [result, setResult] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const questions = questionData?.questions ?? [];
  const q = questions[currentQ];
  const answeredCount = questions.filter((qq) => answers[qq.id] !== undefined && answers[qq.id] !== '').length;

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/training-events/${eventUuid}/learn/assessments/${assessment.id}/submit`, {
      answers,
      question_ids: questions.map((qq) => qq.id),
    }),
    onSuccess: (res) => {
      const data = res.data.data;
      setResult(data);
      setTaking(false);
      queryClient.invalidateQueries({ queryKey: ['asn-learn', eventUuid] });
      onDone?.();
      if (data?.new_badges?.length) {
        window.dispatchEvent(new CustomEvent('badgesEarned', { detail: data.new_badges }));
      }
    },
  });

  const timeLeft = useExamTimer(
    taking ? questionData?.assessment?.time_limit_minutes : null,
    taking,
    () => submitMutation.mutate(),
  );
  const timerWarn = timeLeft !== null && timeLeft < 300;

  const startAssessment = async () => {
    setLoadError(null);
    try {
      const res = await api.get(`/training-events/${eventUuid}/learn/assessments/${assessment.id}`);
      setQuestionData(res.data.data);
      setAnswers({});
      setCurrentQ(0);
      setTaking(true);
    } catch (e) {
      setLoadError(e.response?.data?.message || 'Gagal memuat asesmen.');
    }
  };

  const typeLabel = assessment.type === 'pre_test' ? 'Pre-Test' : 'Post-Test';
  const typeBadge = assessment.type === 'pre_test' ? 'scheduled' : 'active';

  // ── Already submitted (from server) ──
  if (assessment.my_submission) {
    const sub = assessment.my_submission;
    const passed = sub.is_passed;
    const isPending = sub.score === null;
    return (
      <div className="exam-done-card">
        <div className="exam-done-identity">
          <em className={`status-badge ${typeBadge}`}>{typeLabel}</em>
          <strong className="exam-done-title">{assessment.title}</strong>
        </div>

        <div className={`exam-achievement-banner ${isPending ? 'pending' : passed ? 'pass' : 'fail'}`}>
          <div className="exam-achievement-icon">
            {isPending ? <Clock size={32} /> : passed ? <Trophy size={32} /> : <XCircle size={32} />}
          </div>
          <div className="exam-achievement-text">
            <span className="exam-achievement-headline">
              {isPending ? 'Jawaban Dikumpulkan' : passed ? 'Selamat, Anda Lulus!' : 'Belum Lulus'}
            </span>
            <span className="exam-achievement-sub">
              {isPending ? 'Menunggu koreksi fasilitator' : passed ? 'Anda telah memenuhi nilai kelulusan' : 'Nilai Anda belum memenuhi batas minimum'}
            </span>
          </div>
        </div>

        {!isPending ? (
          <div className="exam-done-result">
            <div className="exam-done-score-wrap">
              <span className={`exam-done-score ${passed ? 'pass' : 'fail'}`}>{sub.score}</span>
              <span className={`exam-done-verdict ${passed ? 'pass' : 'fail'}`}>
                {passed ? '✓ Lulus' : '✗ Tidak lulus'}
              </span>
            </div>
            <div className="exam-done-bar">
              <div className="exam-done-fill" style={{ width: `${sub.score}%` }} />
            </div>
            <span className="exam-done-bar-label">Nilai minimum lulus: {assessment.passing_score}</span>
          </div>
        ) : (
          <div className="exam-done-pending">
            <p className="exam-done-meta">Jawaban esai sedang dalam antrian koreksi fasilitator.</p>
          </div>
        )}

        <div className="exam-done-footer">
          <span className="exam-done-meta">Dikumpulkan {formatDateTime(sub.submitted_at)}</span>
        </div>
      </div>
    );
  }

  // ── Just submitted this session ──
  if (result) {
    const passed = result.is_passed;
    return (
      <div className="exam-done-card">
        <div className="exam-done-identity">
          <em className={`status-badge ${typeBadge}`}>{typeLabel}</em>
          <strong className="exam-done-title">{assessment.title}</strong>
        </div>

        <div className={`exam-achievement-banner ${result.has_essay ? 'pending' : passed ? 'pass' : 'fail'}`}>
          <div className="exam-achievement-icon">
            {result.has_essay ? <Clock size={32} /> : passed ? <Trophy size={32} /> : <XCircle size={32} />}
          </div>
          <div className="exam-achievement-text">
            <span className="exam-achievement-headline">
              {result.has_essay ? 'Jawaban Dikumpulkan' : passed ? 'Selamat, Anda Lulus!' : 'Belum Lulus'}
            </span>
            <span className="exam-achievement-sub">
              {result.has_essay ? 'Menunggu koreksi fasilitator' : passed ? 'Anda telah memenuhi nilai kelulusan' : 'Nilai Anda belum memenuhi batas minimum'}
            </span>
          </div>
        </div>

        {!result.has_essay ? (
          <div className="exam-done-result">
            <div className="exam-done-score-wrap">
              <span className={`exam-done-score ${passed ? 'pass' : 'fail'}`}>{result.score}</span>
              <span className={`exam-done-verdict ${passed ? 'pass' : 'fail'}`}>
                {passed ? '✓ Lulus' : '✗ Tidak lulus'}
              </span>
            </div>
            <div className="exam-done-bar">
              <div className="exam-done-fill" style={{ width: `${result.score}%` }} />
            </div>
            <span className="exam-done-bar-label">Nilai minimum lulus: {assessment.passing_score}</span>
          </div>
        ) : (
          <div className="exam-done-pending">
            <p className="exam-done-meta">Nilai akan tersedia setelah koreksi fasilitator.</p>
          </div>
        )}

        {passed && result.certificate_uuid && (
          <div style={{ marginTop: 16, padding: '14px 18px', background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #86efac', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Award size={22} color="#16a34a" />
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#15803d' }}>Sertifikat Diterbitkan!</p>
                <p style={{ margin: 0, fontSize: 12, color: '#166534' }}>Lihat tab Sertifikat untuk mengunduh.</p>
              </div>
            </div>
            <button type="button" className="primary-button compact" onClick={() => onCertificate?.(result.certificate_uuid)}
              style={{ background: '#16a34a', borderColor: '#15803d', whiteSpace: 'nowrap' }}>
              <Award size={14} /> Lihat Sertifikat
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Active exam ──
  if (taking && questionData) {
    return (
      <div className="exam-view">

        {/* Header */}
        <div className="exam-view-header">
          <span className="exam-view-title">{questionData.assessment.title}</span>
          {timeLeft !== null && (
            <span className={`exam-timer-display${timerWarn ? ' warn' : ''}`}>
              <Clock size={13} />
              {formatTime(timeLeft)}
            </span>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="outline-button compact" onClick={() => setTaking(false)}>Batal</button>
            <button
              className="primary-button compact"
              disabled={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              <Send size={13} /> {submitMutation.isPending ? 'Mengumpulkan…' : 'Kumpulkan'}
            </button>
          </div>
        </div>

        {/* Body: question panel + sidebar */}
        <div className="exam-view-body">

          {q && (
            <div className="q-panel">
              <div className="q-panel-head">
                <span className="q-num">{currentQ + 1}</span>
                <span className="q-type-chip">{Q_TYPE_LABELS[q.type] || q.type}</span>
              </div>

              <div className="q-text" dangerouslySetInnerHTML={{ __html: safe(q.question) }} />

              <div className="q-options">
                {/* Multiple choice */}
                {q.type === 'multiple_choice' && Array.isArray(q.options) && q.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className={`mc-opt${answers[q.id] === String(idx) ? ' sel' : ''}`}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(idx) }))}
                  >
                    <span className="mc-letter">{Q_LETTERS[idx] ?? idx + 1}</span>
                    <span className="mc-opt-text">{opt}</span>
                  </div>
                ))}

                {/* True / False */}
                {q.type === 'true_false' && ['Benar', 'Salah'].map((label, idx) => (
                  <div
                    key={idx}
                    className={`mc-opt${answers[q.id] === String(idx) ? ' sel' : ''}`}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(idx) }))}
                  >
                    <span className="mc-letter">{label[0]}</span>
                    <span className="mc-opt-text">{label}</span>
                  </div>
                ))}

                {/* Multiple select */}
                {q.type === 'multiple_select' && Array.isArray(q.options) && (
                  <>
                    <p style={{ fontSize: 11, color: 'var(--fg-3)', margin: '0 0 4px' }}>Pilih semua yang benar</p>
                    {q.options.map((opt, idx) => {
                      const sel = (answers[q.id] || '').split(',').filter(Boolean);
                      const checked = sel.includes(String(idx));
                      const toggle = () => {
                        const s = new Set(sel);
                        if (s.has(String(idx))) s.delete(String(idx)); else s.add(String(idx));
                        setAnswers((a) => ({ ...a, [q.id]: [...s].sort((x, y) => +x - +y).join(',') }));
                      };
                      return (
                        <div key={idx} className={`mc-opt${checked ? ' sel' : ''}`} onClick={toggle}>
                          <span className="mc-letter">{Q_LETTERS[idx] ?? idx + 1}</span>
                          <span className="mc-opt-text">{opt}</span>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Fill in blank */}
                {q.type === 'fill_in_blank' && (
                  <input
                    type="text"
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Tulis jawaban Anda…"
                    style={{ padding: '9px 12px', border: '1.5px solid var(--border)', fontSize: 13, width: '100%', outline: 'none' }}
                  />
                )}

                {/* Essay */}
                {q.type === 'essay' && (
                  <textarea
                    rows={5}
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Tulis jawaban Anda…"
                    style={{ width: '100%', padding: '9px 12px', border: '1.5px solid var(--border)', resize: 'vertical', fontSize: 13, outline: 'none' }}
                  />
                )}

                {/* Matching */}
                {q.type === 'matching' && Array.isArray(q.options) && (
                  <MatchingAnswer question={q} answers={answers} setAnswers={setAnswers} />
                )}

                {/* Ordering */}
                {q.type === 'ordering' && Array.isArray(q.options) && (
                  <OrderingAnswer question={q} answers={answers} setAnswers={setAnswers} />
                )}
              </div>

              <div className="q-footer">
                <span className="q-counter">{currentQ + 1} / {questions.length}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="outline-button compact"
                    disabled={currentQ === 0}
                    onClick={() => setCurrentQ((c) => c - 1)}
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    className="outline-button compact"
                    disabled={currentQ === questions.length - 1}
                    onClick={() => setCurrentQ((c) => c + 1)}
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sidebar */}
          <div className="exam-sidebar">
            <div className="exam-sidebar-card">
              <div className="exam-sidebar-label">Progres</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: 'var(--fg-3)' }}>Terjawab</span>
                <strong style={{ fontFamily: "'Space Mono', monospace" }}>{answeredCount} / {questions.length}</strong>
              </div>
              <div className="exam-progress-track">
                <div className="exam-progress-fill" style={{ width: `${questions.length ? Math.round(answeredCount / questions.length * 100) : 0}%` }} />
              </div>
            </div>

            <div className="exam-sidebar-card">
              <div className="exam-sidebar-label">Navigasi Soal</div>
              <div className="exam-q-grid">
                {questions.map((qq, i) => (
                  <button
                    key={qq.id}
                    className={`exam-q-btn${i === currentQ ? ' current' : answers[qq.id] ? ' answered' : ''}`}
                    onClick={() => setCurrentQ(i)}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                {[['Terjawab', answeredCount], ['Belum dijawab', questions.length - answeredCount]].map(([lbl, n]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--fg-3)' }}>{lbl}</span>
                    <strong style={{ fontFamily: "'Space Mono', monospace" }}>{n}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div className="exam-sidebar-card">
              {[['var(--grape)', 'Soal aktif'], ['var(--fg)', 'Sudah dijawab'], ['transparent', 'Belum dijawab']].map(([bg, lbl]) => (
                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--fg-3)', marginBottom: 6 }}>
                  <div style={{ width: 14, height: 14, background: bg, border: bg === 'transparent' ? '1px solid var(--border)' : 'none', flexShrink: 0 }} />
                  {lbl}
                </div>
              ))}
            </div>

            <button
              className="primary-button"
              style={{ justifyContent: 'center' }}
              disabled={submitMutation.isPending}
              onClick={() => submitMutation.mutate()}
            >
              <Send size={14} /> {submitMutation.isPending ? 'Mengumpulkan…' : 'Kumpulkan Jawaban'}
            </button>
          </div>
        </div>

        {submitMutation.error && (
          <div className="form-error-visible" style={{ margin: '0 28px 20px' }}>
            {submitMutation.error.response?.data?.message || 'Gagal mengumpulkan. Coba lagi.'}
          </div>
        )}
      </div>
    );
  }

  // ── Intro card ──
  const qCount = assessment.questions_count ?? '—';
  return (
    <div className="exam-intro-card">
      <div style={{ marginBottom: 16 }}>
        <em className={`status-badge ${typeBadge}`} style={{ marginBottom: 6, display: 'inline-block' }}>{typeLabel}</em>
        <h3 className="exam-intro-title">{assessment.title}</h3>
        {assessment.instructions && (
          <p className="exam-intro-instructions">{assessment.instructions}</p>
        )}
      </div>

      <div className="exam-stats-grid">
        {[
          [ClipboardCheck, qCount,                              'Soal'],
          [Clock,          assessment.time_limit_minutes ?? '∞', 'Menit'],
          [CheckCircle2,   assessment.passing_score ?? '—',    'Nilai Lulus'],
          [ChevronRight,   '1×',                               'Percobaan'],
        ].map(([Icon, value, label]) => (
          <div key={label} className="exam-stat">
            <Icon size={18} style={{ color: 'var(--fg-3)' }} />
            <span className="exam-stat-n">{value}</span>
            <span className="exam-stat-l">{label}</span>
          </div>
        ))}
      </div>

      <div className="exam-rules">
        <p className="exam-rules-title">⚠ Peraturan Ujian</p>
        <ul>
          <li>Pastikan koneksi internet Anda stabil sebelum memulai</li>
          <li>Jawaban tersimpan otomatis setiap Anda memilih opsi</li>
          {assessment.time_limit_minutes && <li>Ujian berakhir otomatis saat waktu habis</li>}
          <li>Asesmen hanya dapat dikerjakan satu kali</li>
        </ul>
      </div>

      {loadError && <div className="form-error-visible">{loadError}</div>}

      <button className="primary-button" style={{ fontSize: 14, padding: '11px 22px' }} onClick={startAssessment}>
        <Play size={15} /> Mulai Sekarang
      </button>
    </div>
  );
}

function AsesmenTab({ assessments, eventUuid, onCertificate }) {
  if (!assessments?.length) {
    return <div className="resource-note">Belum ada asesmen yang tersedia.</div>;
  }

  const preTests  = assessments.filter((a) => a.type === 'pre_test');
  const postTests = assessments.filter((a) => a.type === 'post_test');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {preTests.length > 0 && (
        <div>
          <p className="mono-kicker text-muted" style={{ marginBottom: 12 }}>PRE-TEST</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {preTests.map((a) => <Asesmen key={a.id} assessment={a} eventUuid={eventUuid} onCertificate={onCertificate} />)}
          </div>
        </div>
      )}
      {postTests.length > 0 && (
        <div>
          <p className="mono-kicker text-muted" style={{ marginBottom: 12 }}>POST-TEST</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {postTests.map((a) => <Asesmen key={a.id} assessment={a} eventUuid={eventUuid} onCertificate={onCertificate} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Presensi Tab ──────────────────────────────────────────────────────────────

function PresensiTab({ attendance, eventUuid }) {
  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: () => api.post(`/training-events/${eventUuid}/learn/check-in`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['asn-learn', eventUuid] }),
  });

  if (attendance?.checked_in) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' }}>
        <CheckCircle2 size={48} style={{ color: 'var(--success, #16a34a)' }} />
        <strong style={{ fontSize: 16 }}>Presensi tercatat</strong>
        <span style={{ color: 'var(--muted)', fontSize: 13 }}>
          {formatDateTime(attendance.checked_in_at)}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '32px 0' }}>
      <UserCheck size={48} style={{ color: 'var(--muted, #6b6b6b)' }} />
      <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14, textAlign: 'center' }}>
        Tandai kehadiran Anda pada event ini.
      </p>
      {checkInMutation.error && (
        <div className="form-error-visible">
          {checkInMutation.error.response?.data?.message || 'Gagal mencatat presensi.'}
        </div>
      )}
      <button
        className="primary-button"
        disabled={checkInMutation.isPending}
        onClick={() => checkInMutation.mutate()}
      >
        <UserCheck size={15} /> {checkInMutation.isPending ? 'Mencatat…' : 'Tandai Hadir'}
      </button>
    </div>
  );
}

// ── Certificate Modal ─────────────────────────────────────────────────────────

function CertModal({ uuid, onClose }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cert-detail-learn', uuid],
    queryFn: () => api.get(`/certificates/${uuid}`).then((r) => r.data.data),
    enabled: !!uuid,
    retry: false,
  });

  function handlePrint() {
    document.body.classList.add('cert-printing');
    window.print();
    setTimeout(() => document.body.classList.remove('cert-printing'), 1200);
  }

  const tokenValues = data ? {
    participant_name:        data.participant?.name                    || '',
    nip:                     data.participant?.nip                     || '',
    opd_name:                data.participant?.opd_name                || '',
    organization_unit_name:  data.participant?.organization_unit_name  || '',
    event_title:             data.event?.title                        || '',
    issued_date:             data.issued_date                         || '',
    certificate_number:      data.certificate_number                  || '',
    verification_url:        data.verification_url                    || '',
    sessions:                data.event?.sessions                     || [],
  } : {};

  const hasBack = (data?.template?.layout?.back_canvas_elements || []).length > 0;

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div>
            <strong style={{ fontSize: 14 }}>{data?.certificate_number || '—'}</strong>
            {data?.event?.title && <span style={{ marginLeft: 10, fontSize: 12, color: 'var(--fg-3)' }}>{data.event.title}</span>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="primary-button compact" onClick={handlePrint} disabled={isLoading || !data}>
              <Printer size={14} /> Cetak / Unduh PDF
            </button>
            <button type="button" className="outline-button compact" onClick={onClose}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 16px' }}>
          {isLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 64 }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--fg-3)' }} />
            </div>
          )}
          {isError && (
            <div style={{ textAlign: 'center', paddingTop: 64, color: '#f87171' }}>
              <AlertTriangle size={28} style={{ margin: '0 auto 12px' }} />
              <p style={{ margin: 0, fontSize: 14 }}>Gagal memuat sertifikat.</p>
            </div>
          )}
          {!isLoading && !isError && data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center' }}>
              <div style={{ width: '100%' }}>
                <p style={{ textAlign: 'center', margin: '0 0 8px', fontSize: 11, color: '#e5e7eb', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Halaman Depan</p>
                <CertPreviewCanvas template={data.template} tokenValues={tokenValues} maxWidth={520} />
              </div>
              {hasBack && (
                <div style={{ width: '100%' }}>
                  <p style={{ textAlign: 'center', margin: '0 0 8px', fontSize: 11, color: '#e5e7eb', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Halaman Belakang</p>
                  <CertPreviewCanvas template={data.template} tokenValues={tokenValues} maxWidth={520} showBack />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {data && <CertPrintArea template={data.template} tokenValues={tokenValues} />}
    </>
  );
}

// ── Sertifikat Tab ────────────────────────────────────────────────────────────

function SertifikatTab({ certificate, onView }) {
  if (!certificate) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 20px' }}>
        <Award size={40} style={{ color: 'var(--fg-3)', margin: '0 auto 12px' }} />
        <p style={{ margin: 0, color: 'var(--fg-3)', fontSize: 14 }}>Sertifikat belum tersedia.</p>
        <p style={{ margin: '6px 0 0', color: 'var(--fg-3)', fontSize: 12 }}>Selesaikan post-test untuk mendapatkan sertifikat.</p>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '24px 0' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '20px 28px', width: '100%', maxWidth: 480 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a, #15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={22} color="#fff" />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>Sertifikat Tersedia</p>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>{certificate.issued_date}</p>
          </div>
        </div>
        <div style={{ background: '#f9fafb', borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)', marginBottom: 2 }}>Nomor Sertifikat</p>
          <p style={{ margin: 0, fontWeight: 600, fontFamily: "'Space Mono', monospace", fontSize: 13 }}>{certificate.certificate_number}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="primary-button" style={{ flex: 1, justifyContent: 'center' }} onClick={() => onView(certificate.uuid)}>
            <Award size={15} /> Lihat Sertifikat
          </button>
          {certificate.verification_token && (
            <a href={`/api/certificates/verify/${certificate.verification_token}`} target="_blank" rel="noreferrer" className="outline-button" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Verifikasi
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const BASE_TABS = ['materi', 'sesi', 'asesmen', 'presensi', 'sertifikat'];
const TAB_LABELS = { materi: 'Materi', sesi: 'Sesi', asesmen: 'Asesmen', presensi: 'Presensi', sertifikat: 'Sertifikat' };

export default function AsnEventLearn() {
  const { uuid } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const initialTab = new URLSearchParams(location.search).has('assessment') ? 'asesmen' : 'materi';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [certModalUuid, setCertModalUuid] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['asn-learn', uuid],
    queryFn: async () => (await api.get(`/training-events/${uuid}/learn`)).data.data,
    retry: false,
  });

  if (isLoading) {
    return <div className="page-stack"><div className="resource-note">Memuat data event…</div></div>;
  }

  if (isError) {
    const msg = error?.response?.data?.message || 'Tidak dapat memuat data event.';
    return (
      <div className="page-stack">
        <div className="form-error-visible">{msg}</div>
        <button className="outline-button compact" onClick={() => navigate('/training-events')}>
          <ArrowLeft size={14} /> Kembali
        </button>
      </div>
    );
  }

  const { event, sessions, materials, assessments, attendance, certificate } = data;

  function openCert(certUuid) {
    setCertModalUuid(certUuid);
    setActiveTab('sertifikat');
  }

  const TABS = certificate
    ? BASE_TABS
    : BASE_TABS.filter((t) => t !== 'sertifikat');

  return (
    <div className="page-stack">
      <div className="page-head">
        <button
          className="outline-button compact"
          onClick={() => navigate('/training-events')}
          style={{ marginBottom: 8, alignSelf: 'flex-start' }}
        >
          <ArrowLeft size={14} /> Kembali
        </button>
        <p className="mono-kicker text-muted">Event Aktif</p>
        <h1>{event.title}</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 6, color: 'var(--muted)', fontSize: 13 }}>
          <span><strong>Jadwal:</strong> {formatDate(event.start_date)} – {formatDate(event.end_date)}</span>
          {event.location && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} /> {event.location}
            </span>
          )}
        </div>
        {event.description && (
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 13 }}>{event.description}</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border, #e3e3e3)', marginBottom: 4, flexWrap: 'wrap' }}>
        {TABS.map((tab) => {
          const Icon = TAB_ICONS[tab];
          const isCert = tab === 'sertifikat';
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                color: activeTab === tab ? 'var(--fg, #0d0d0d)' : isCert ? '#16a34a' : 'var(--muted, #6b6b6b)',
                borderBottom: activeTab === tab ? '2px solid var(--fg, #0d0d0d)' : '2px solid transparent',
                marginBottom: -1,
              }}
            >
              {Icon && <Icon size={14} />} {TAB_LABELS[tab]}
              {isCert && <span style={{ marginLeft: 4, width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />}
            </button>
          );
        })}
      </div>

      <section className="enterprise-card">
        {activeTab === 'materi'     && <MateriTab materials={materials} />}
        {activeTab === 'sesi'       && <SesiTab sessions={sessions} eventUuid={uuid} />}
        {activeTab === 'asesmen'    && <AsesmenTab assessments={assessments} eventUuid={uuid} onCertificate={openCert} />}
        {activeTab === 'presensi'   && <PresensiTab attendance={attendance} eventUuid={uuid} />}
        {activeTab === 'sertifikat' && <SertifikatTab certificate={certificate} onView={setCertModalUuid} />}
      </section>

      {certModalUuid && <CertModal uuid={certModalUuid} onClose={() => setCertModalUuid(null)} />}
    </div>
  );
}
