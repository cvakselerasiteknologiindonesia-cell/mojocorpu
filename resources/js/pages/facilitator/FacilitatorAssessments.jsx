import { useEffect, useRef, useState } from 'react';
import { safe } from '../../utils/sanitize.js';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlignLeft,
  ArrowLeftRight,
  ArrowUpDown,
  Award,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  ListChecks,
  Pencil,
  Plus,
  Search,
  Send,
  SquareCheck,
  TextCursorInput,
  ToggleLeft,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { toast } from 'sonner';
import api from '../../api.js';
import { loadXlsx } from '../../utils/xlsx.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const ASSESSMENT_TYPE_LABELS   = { pre_test: 'Pre-Test', post_test: 'Post-Test' };
const ASSESSMENT_STATUS_LABELS = { draft: 'Draft', published: 'Dipublikasikan' };

const EMPTY_ASSESSMENT = {
  type: 'pre_test', title: '', instructions: '',
  passing_score: '70', time_limit_minutes: '', bank_draw_count: '', status: 'draft',
};

const EMPTY_QUESTION = {
  question: '', type: 'multiple_choice', options: ['', '', '', ''],
  correct_answer: '0', points: '1', order: '', in_bank: false,
};

const QUESTION_TYPES = [
  { value: 'multiple_choice', label: 'Pilihan Ganda',  desc: 'Satu jawaban benar',     Icon: CircleDot       },
  { value: 'multiple_select', label: 'Multi Pilih',    desc: 'Beberapa jawaban benar', Icon: SquareCheck     },
  { value: 'true_false',      label: 'Benar / Salah',  desc: 'Dua pilihan biner',      Icon: ToggleLeft      },
  { value: 'fill_in_blank',   label: 'Isian Singkat',  desc: 'Ketik jawaban',          Icon: TextCursorInput },
  { value: 'matching',        label: 'Jodohkan',       desc: 'Pasangkan item',         Icon: ArrowLeftRight  },
  { value: 'ordering',        label: 'Pengurutan',     desc: 'Urutkan item',           Icon: ArrowUpDown     },
  { value: 'essay',           label: 'Esai',           desc: 'Jawaban bebas',          Icon: AlignLeft       },
];
const QUESTION_TYPE_LABELS = Object.fromEntries(QUESTION_TYPES.map((t) => [t.value, t.label]));
const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];

const TYPE_DEFAULTS = {
  multiple_choice: { options: ['', '', '', ''], correct_answer: '0' },
  multiple_select: { options: ['', '', '', ''], correct_answer: '' },
  true_false:      { options: ['Benar', 'Salah'], correct_answer: '0' },
  fill_in_blank:   { options: [], correct_answer: '' },
  matching:        { options: [{ left: '', right: '' }, { left: '', right: '' }], correct_answer: null },
  ordering:        { options: ['', ''], correct_answer: null },
  essay:           { options: [], correct_answer: null },
};

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

function stripHtml(html) {
  return html ? html.replace(/<[^>]*>/g, '').trim() : '';
}

// ── Excel Import helpers ───────────────────────────────────────────────────────

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
  const raw = cell(8);
  const pts = parseInt(cell(9), 10) || 1;
  const bank = cell(10).toLowerCase() === 'ya';
  const ord = parseInt(cell(11), 10) || (rowIndex + 1);
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
    options = opts.length ? opts : null;
  } else if (type === 'matching') {
    options = opts.map((o) => { const [left, right] = o.split('||'); return { left: left?.trim() ?? '', right: right?.trim() ?? '' }; });
    correct_answer = options.map((_, i) => i).join(',');
  } else if (type === 'ordering') {
    options = opts;
    correct_answer = opts.map((_, i) => i).join(',');
  }
  return { question, type, options, correct_answer, points: pts, in_bank: bank, order: ord };
}

const TEMPLATE_HEADERS = ['tipe', 'pertanyaan', 'pilihan_a', 'pilihan_b', 'pilihan_c', 'pilihan_d', 'pilihan_e', 'pilihan_f', 'jawaban_benar', 'poin', 'bank_soal', 'urutan'];
const TEMPLATE_EXAMPLES = [
  ['pilihan_ganda', 'Apa singkatan dari ASN?', 'Aparatur Sipil Negara', 'Aparat Sipil Negara', 'Anggota Sipil Negara', 'Asisten Sipil Negara', '', '', 'A', '5', 'tidak', '1'],
  ['benar_salah', 'ASN wajib mengikuti pelatihan dasar.', '', '', '', '', '', '', 'Benar', '5', 'tidak', '2'],
  ['esai', 'Jelaskan peran ASN dalam pelayanan publik!', '', '', '', '', '', '', '', '20', 'tidak', '3'],
];

async function downloadTemplate() {
  const XLSX = await loadXlsx();
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLES]);
  XLSX.utils.book_append_sheet(wb, ws, 'Soal');
  XLSX.writeFile(wb, 'template-soal.xlsx');
}

// ── Submissions helpers ───────────────────────────────────────────────────────

function renderAnswer(question, answers) {
  const raw = answers?.[question.id];
  if (raw === undefined || raw === null || raw === '') return <em style={{ color: 'var(--fg-3)' }}>Tidak dijawab</em>;
  if (question.type === 'multiple_choice') {
    const idx = parseInt(raw, 10);
    return <span>{OPTION_LABELS[idx]}: {question.options?.[idx] ?? raw}</span>;
  }
  if (question.type === 'multiple_select') {
    return <span>{raw.split(',').filter(Boolean).map((i) => `${OPTION_LABELS[+i]}: ${question.options?.[+i] ?? i}`).join(' | ')}</span>;
  }
  if (question.type === 'true_false') return <span>{raw === '0' ? 'Benar' : 'Salah'}</span>;
  if (question.type === 'matching' && Array.isArray(question.options)) {
    const pairs = raw.split(',');
    return <span>{question.options.map((p, i) => `${p.left ?? p} → ${question.options[parseInt(pairs[i])]?.right ?? '?'}`).join(' | ')}</span>;
  }
  if (question.type === 'ordering' && Array.isArray(question.options)) {
    return <span>{raw.split(',').map((i) => question.options[+i]).join(' → ')}</span>;
  }
  return <span style={{ whiteSpace: 'pre-wrap' }}>{raw}</span>;
}

function isCorrect(question, answers) {
  if (question.type === 'essay' || question.type === 'matching') return null;
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

// ── Rich Text Editor ──────────────────────────────────────────────────────────

function TbBtn({ editor, action, isActive, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); action(); }}
      style={{
        padding: '2px 7px', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 13,
        background: isActive ? 'var(--fg)' : 'transparent',
        color: isActive ? '#fff' : 'var(--fg)',
      }}
    >
      {children}
    </button>
  );
}

function RichTextEditor({ value, onChange, editorKey }) {
  const skipNext = useRef(false);
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    onUpdate: ({ editor: ed }) => { skipNext.current = true; onChange(ed.getHTML()); },
  }, [editorKey]);

  useEffect(() => {
    if (!editor) return;
    if (skipNext.current) { skipNext.current = false; return; }
    const html = editor.getHTML();
    if (html !== value) editor.commands.setContent(value || '', { emitUpdate: false });
  }, [value, editor]);

  if (!editor) return null;
  const e = editor;
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 2, padding: '4px 6px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <TbBtn action={() => e.chain().focus().toggleBold().run()} isActive={e.isActive('bold')} title="Bold"><strong>B</strong></TbBtn>
        <TbBtn action={() => e.chain().focus().toggleItalic().run()} isActive={e.isActive('italic')} title="Italic"><em>I</em></TbBtn>
        <TbBtn action={() => e.chain().focus().toggleStrike().run()} isActive={e.isActive('strike')} title="Coret"><s>S</s></TbBtn>
        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '3px 3px', alignSelf: 'center' }} />
        <TbBtn action={() => e.chain().focus().toggleBulletList().run()} isActive={e.isActive('bulletList')} title="Poin">• Poin</TbBtn>
        <TbBtn action={() => e.chain().focus().toggleOrderedList().run()} isActive={e.isActive('orderedList')} title="Nomor">1. Nomor</TbBtn>
        <span style={{ width: 1, height: 18, background: 'var(--border)', margin: '3px 3px', alignSelf: 'center' }} />
        <TbBtn action={() => e.chain().focus().undo().run()} title="Undo">↩</TbBtn>
        <TbBtn action={() => e.chain().focus().redo().run()} title="Redo">↪</TbBtn>
      </div>
      <div style={{ padding: '8px 12px', minHeight: 80, fontSize: 14 }}>
        <style>{`.ProseMirror{outline:none}.ProseMirror ul,.ProseMirror ol{padding-left:20px}.ProseMirror code{background:var(--surface);padding:1px 4px;border-radius:3px;font-size:.9em}.ProseMirror blockquote{border-left:3px solid var(--border);margin:0;padding-left:12px;color:var(--fg-3)}`}</style>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ── Question Import Panel ─────────────────────────────────────────────────────

function QuestionImportPanel({ uuid, assessmentId, onDone, onClose }) {
  const fileRef = useRef(null);
  const [parsed, setParsed] = useState(null);
  const [parseErrors, setParseErrors] = useState([]);
  const [result, setResult] = useState(null);

  const importMut = useMutation({
    mutationFn: () => api.post(`/training-events/${uuid}/assessments/${assessmentId}/questions/import`, { questions: parsed }),
    onSuccess: (res) => { setResult(res.data); onDone(); toast.success(`${res.data?.data?.imported ?? 0} soal berhasil diimport.`); },
    onError: () => toast.error('Gagal mengimport soal.'),
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
        const rows = raw.slice(1).filter((r) => String(r[0] || '').trim());
        const questions = [];
        const errors = [];
        rows.forEach((row, i) => {
          try { questions.push(parseQuestionRow(row, i)); }
          catch (e) { errors.push(`Baris ${i + 2}: ${e.message}`); }
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
        <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)' }}>Upload file Excel. Maks. 200 soal per import.</p>
        <button className="outline-button compact" style={{ flexShrink: 0 }} onClick={downloadTemplate}>
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
        <span style={{ fontSize: 13 }}>{parsed ? `${parsed.length} soal terbaca — klik untuk ganti` : 'Klik atau seret file Excel'}</span>
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
                <tr style={{ background: 'var(--surface)', textAlign: 'left' }}>
                  <th style={{ padding: '5px 8px' }}>#</th>
                  <th style={{ padding: '5px 8px' }}>Tipe</th>
                  <th style={{ padding: '5px 8px' }}>Pertanyaan</th>
                  <th style={{ padding: '5px 8px' }}>Poin</th>
                </tr>
              </thead>
              <tbody>
                {parsed.slice(0, 8).map((q, i) => (
                  <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '5px 8px', color: 'var(--fg-3)' }}>{i + 1}</td>
                    <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}><em className="status-badge">{QUESTION_TYPE_LABELS[q.type]}</em></td>
                    <td style={{ padding: '5px 8px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question}</td>
                    <td style={{ padding: '5px 8px' }}>{q.points}</td>
                  </tr>
                ))}
                {parsed.length > 8 && (
                  <tr style={{ borderTop: '1px solid var(--border)' }}>
                    <td colSpan={4} style={{ padding: '5px 8px', color: 'var(--fg-3)', textAlign: 'center' }}>+{parsed.length - 8} soal lainnya…</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {importMut.error && <div className="form-error-visible">{importMut.error.response?.data?.message || 'Gagal mengimport.'}</div>}
          <button className="primary-button compact" disabled={importMut.isPending} onClick={() => importMut.mutate()}>
            <FileSpreadsheet size={14} /> {importMut.isPending ? 'Mengimport…' : `Import ${parsed.length} Soal`}
          </button>
        </>
      )}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--emerald)' }}>✓ {result.data?.imported ?? 0} soal berhasil diimport.</div>
          {result.data?.errors?.length > 0 && (
            <div className="form-error-visible">{result.data.errors.map((e, i) => <div key={i}>{e}</div>)}</div>
          )}
          <button className="outline-button compact" onClick={onClose}>Tutup</button>
        </div>
      )}
    </div>
  );
}

// ── Questions Modal ───────────────────────────────────────────────────────────

function QuestionsModal({ uuid, assessment, onClose }) {
  const queryClient = useQueryClient();
  const qk = ['assessment-questions', assessment.id];
  const [editing, setEditing] = useState(null);
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

  const createMut = useMutation({
    mutationFn: (d) => api.post(`/training-events/${uuid}/assessments/${assessment.id}/questions`, d),
    onSuccess: () => { invalidateAll(); toast.success('Soal ditambahkan.'); },
    onError: () => toast.error('Gagal menyimpan soal.'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/training-events/${uuid}/assessments/${assessment.id}/questions/${id}`, d),
    onSuccess: () => { invalidateAll(); toast.success('Soal diperbarui.'); },
    onError: () => toast.error('Gagal memperbarui soal.'),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/training-events/${uuid}/assessments/${assessment.id}/questions/${id}`),
    onSuccess: () => { invalidateAll(); toast.success('Soal dihapus.'); },
    onError: () => toast.error('Gagal menghapus soal.'),
  });

  const isSaving = createMut.isPending || updateMut.isPending;
  const saveError = createMut.error || updateMut.error;

  const openCreate = () => { createMut.reset(); setForm(EMPTY_QUESTION); setEditing('create'); };
  const openEdit = (q) => {
    updateMut.reset();
    const type = q.type || 'multiple_choice';
    let options = q.options ?? TYPE_DEFAULTS[type]?.options ?? [];
    if (type === 'true_false') options = ['Benar', 'Salah'];
    setForm({ question: q.question || '', type, options, correct_answer: q.correct_answer ?? (TYPE_DEFAULTS[type]?.correct_answer ?? ''), points: q.points?.toString() || '1', order: q.order?.toString() || '', in_bank: q.in_bank ?? false });
    setEditing({ id: q.id });
  };

  const changeType = (v) => setForm((c) => ({ ...c, type: v, ...(TYPE_DEFAULTS[v] || {}) }));

  const buildPayload = () => {
    let { options, correct_answer } = form;
    if (form.type === 'essay') { options = null; correct_answer = null; }
    else if (form.type === 'true_false') { options = null; }
    else if (form.type === 'matching' || form.type === 'ordering') {
      correct_answer = form.options.map((_, i) => i).join(',');
    }
    return { question: form.question, type: form.type, options, correct_answer, points: parseInt(form.points, 10) || 1, order: parseInt(form.order, 10) || (questions.length + 1), in_bank: form.in_bank };
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

  const updateOption   = (idx, val) => setForm((c) => { const o = [...c.options]; o[idx] = val; return { ...c, options: o }; });
  const updateMatchPair = (idx, side, val) => setForm((c) => { const o = [...c.options]; o[idx] = { ...o[idx], [side]: val }; return { ...c, options: o }; });
  const addOption      = (blank) => setForm((c) => ({ ...c, options: [...c.options, blank] }));
  const removeOption   = (idx) => setForm((c) => ({ ...c, options: c.options.filter((_, i) => i !== idx) }));
  const swapOptions    = (i, j) => setForm((c) => { const o = [...c.options]; [o[i], o[j]] = [o[j], o[i]]; return { ...c, options: o }; });

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
              <QuestionImportPanel uuid={uuid} assessmentId={assessment.id} onDone={invalidateAll} onClose={() => setEditing(null)} />
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
                      <button key={value} type="button" className={`qtype-card${form.type === value ? ' active' : ''}`} onClick={() => changeType(value)}>
                        <Icon size={20} className="qtype-card-icon" />
                        <span className="qtype-card-label">{label}</span>
                        <span className="qtype-card-desc">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question editor */}
                <div className="event-field">
                  <span>Pertanyaan</span>
                  <RichTextEditor key={editing?.id ?? 'create'} value={form.question} onChange={(html) => setForm((c) => ({ ...c, question: html }))} />
                </div>

                {/* Multiple Choice */}
                {form.type === 'multiple_choice' && (
                  <div className="event-field">
                    <span>Pilihan — klik huruf untuk tandai jawaban benar</span>
                    <div className="qoptions-list">
                      {form.options.map((opt, idx) => (
                        <div key={idx} className="qoption-row">
                          <button type="button" className={`qoption-radio${form.correct_answer === String(idx) ? ' correct' : ''}`} onClick={() => setForm((c) => ({ ...c, correct_answer: String(idx) }))}>
                            {OPTION_LABELS[idx]}
                          </button>
                          <input value={opt} onChange={(e) => updateOption(idx, e.target.value)} placeholder={`Pilihan ${OPTION_LABELS[idx]}`} />
                          {form.options.length > 2 && <button type="button" className="icon-action danger-icon" onClick={() => removeOption(idx)}><X size={11} /></button>}
                        </div>
                      ))}
                    </div>
                    {form.options.length < OPTION_LABELS.length && (
                      <button type="button" className="setup-add-btn" style={{ marginTop: 4 }} onClick={() => addOption('')}><Plus size={12} /> Tambah Pilihan</button>
                    )}
                  </div>
                )}

                {/* Multiple Select */}
                {form.type === 'multiple_select' && (
                  <div className="event-field">
                    <span>Pilihan — centang huruf untuk tandai semua jawaban benar</span>
                    <div className="qoptions-list">
                      {form.options.map((opt, idx) => {
                        const isCorrect2 = form.correct_answer.split(',').filter(Boolean).includes(String(idx));
                        return (
                          <div key={idx} className="qoption-row">
                            <button type="button" className={`qoption-radio${isCorrect2 ? ' correct' : ''}`} onClick={() => toggleCorrectMultiSelect(idx)}>
                              {OPTION_LABELS[idx]}
                            </button>
                            <input value={opt} onChange={(e) => updateOption(idx, e.target.value)} placeholder={`Pilihan ${OPTION_LABELS[idx]}`} />
                            {form.options.length > 2 && <button type="button" className="icon-action danger-icon" onClick={() => removeOption(idx)}><X size={11} /></button>}
                          </div>
                        );
                      })}
                    </div>
                    {form.options.length < OPTION_LABELS.length && (
                      <button type="button" className="setup-add-btn" style={{ marginTop: 4 }} onClick={() => addOption('')}><Plus size={12} /> Tambah Pilihan</button>
                    )}
                  </div>
                )}

                {/* True / False */}
                {form.type === 'true_false' && (
                  <div className="event-field">
                    <span>Jawaban Benar</span>
                    <div className="qtf-selector">
                      {['Benar', 'Salah'].map((label, idx) => (
                        <button key={idx} type="button" className={`qtf-btn${form.correct_answer === String(idx) ? ' active' : ''}`} onClick={() => setForm((c) => ({ ...c, correct_answer: String(idx) }))}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fill in the Blank */}
                {form.type === 'fill_in_blank' && (
                  <>
                    <div className="event-field">
                      <span>Jawaban Utama</span>
                      <input value={form.correct_answer} onChange={(e) => setForm((c) => ({ ...c, correct_answer: e.target.value }))} placeholder="Jawaban yang diterima…" />
                    </div>
                    <div className="event-field">
                      <span>Alternatif Jawaban (opsional)</span>
                      {form.options.map((alt, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                          <input value={alt} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Alternatif ${i + 1}`} style={{ flex: 1 }} />
                          <button type="button" className="icon-action danger-icon" onClick={() => removeOption(i)}><X size={12} /></button>
                        </div>
                      ))}
                      <button type="button" className="setup-add-btn" onClick={() => addOption('')}><Plus size={12} /> Tambah Alternatif</button>
                    </div>
                  </>
                )}

                {/* Matching */}
                {form.type === 'matching' && (
                  <div className="event-field">
                    <span>Pasangan (kiri → kanan)</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {form.options.map((pair, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ flexShrink: 0, fontWeight: 700, color: 'var(--fg-3)', width: 18, textAlign: 'center' }}>{i + 1}</span>
                          <input value={pair.left || ''} onChange={(e) => updateMatchPair(i, 'left', e.target.value)} placeholder="Pernyataan…" style={{ flex: 1 }} />
                          <span style={{ color: 'var(--fg-3)' }}>→</span>
                          <input value={pair.right || ''} onChange={(e) => updateMatchPair(i, 'right', e.target.value)} placeholder="Pasangan…" style={{ flex: 1 }} />
                          {form.options.length > 2 && <button type="button" className="icon-action danger-icon" onClick={() => removeOption(i)}><X size={11} /></button>}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="setup-add-btn" style={{ marginTop: 4 }} onClick={() => addOption({ left: '', right: '' })}><Plus size={12} /> Tambah Pasangan</button>
                  </div>
                )}

                {/* Ordering */}
                {form.type === 'ordering' && (
                  <div className="event-field">
                    <span>Item dalam urutan yang benar (atas = pertama)</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {form.options.map((item, i) => (
                        <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ flexShrink: 0, fontWeight: 700, color: 'var(--fg-3)', width: 18, textAlign: 'center' }}>{i + 1}</span>
                          <input value={item} onChange={(e) => updateOption(i, e.target.value)} placeholder={`Item ${i + 1}`} style={{ flex: 1 }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <button type="button" className="icon-action" style={{ padding: '1px 4px' }} disabled={i === 0} onClick={() => swapOptions(i, i - 1)}>↑</button>
                            <button type="button" className="icon-action" style={{ padding: '1px 4px' }} disabled={i === form.options.length - 1} onClick={() => swapOptions(i, i + 1)}>↓</button>
                          </div>
                          {form.options.length > 2 && <button type="button" className="icon-action danger-icon" onClick={() => removeOption(i)}><X size={11} /></button>}
                        </div>
                      ))}
                    </div>
                    <button type="button" className="setup-add-btn" style={{ marginTop: 4 }} onClick={() => addOption('')}><Plus size={12} /> Tambah Item</button>
                  </div>
                )}

                {/* Essay */}
                {form.type === 'essay' && (
                  <p className="resource-note" style={{ fontSize: 12, margin: 0 }}>Jawaban esai dinilai secara manual oleh fasilitator.</p>
                )}

                {/* Points & Order */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="event-field">
                    <span>Poin</span>
                    <input type="number" min="1" value={form.points} onChange={(e) => setForm((c) => ({ ...c, points: e.target.value }))} placeholder="1" />
                  </div>
                  <div className="event-field">
                    <span>Urutan</span>
                    <input type="number" min="1" value={form.order} onChange={(e) => setForm((c) => ({ ...c, order: e.target.value }))} placeholder="otomatis" />
                  </div>
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

function SubmissionsModal({ uuid, assessment, onClose }) {
  const queryClient = useQueryClient();
  const qk = ['assessment-submissions', uuid, assessment.id];
  const [grading, setGrading] = useState(null);
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
  const questions = data?.questions ?? [];
  const submissions = data?.submissions ?? [];

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 860 }}>
        <div className="modal-head">
          <h2>
            {grading ? (
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 'inherit', fontWeight: 'inherit', padding: 0 }} onClick={() => setGrading(null)}>
                <ChevronLeft size={16} /> Hasil — {assessment.title}
              </button>
            ) : `Hasil — ${assessment.title}`}
          </h2>
          <button className="icon-action" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {isLoading && <div className="resource-note">Memuat data…</div>}

          {!isLoading && !grading && (
            <>
              {submissions.length === 0 ? (
                <div className="resource-note">Belum ada peserta yang mengumpulkan asesmen ini.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--fg-3)', textAlign: 'left' }}>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>Peserta</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600 }}>Dikumpulkan</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'center' }}>Nilai</th>
                      <th style={{ padding: '6px 8px', fontWeight: 600, textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '6px 8px' }} />
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((s) => (
                      <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px' }}>
                          <strong style={{ display: 'block' }}>{s.user?.name ?? '—'}</strong>
                          {s.user?.nip && <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{s.user.nip}</span>}
                        </td>
                        <td style={{ padding: '8px', color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{s.submitted_at ? formatDateTime(s.submitted_at) : '—'}</td>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>
                          {s.score !== null ? s.score : <em style={{ fontWeight: 400, color: 'var(--fg-3)' }}>—</em>}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>
                          {s.score === null
                            ? <em className="status-badge">Belum dinilai</em>
                            : s.is_passed
                              ? <em className="status-badge active">Lulus</em>
                              : <em className="status-badge" style={{ color: '#d04352' }}>Tidak lulus</em>}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right' }}>
                          <button className="outline-button compact" style={{ fontSize: 11 }} onClick={() => openGrading(s)}>
                            {s.score === null && data?.has_essay ? 'Nilai' : 'Lihat'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ fontSize: 12, color: 'var(--fg-3)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
                {submissions.length} pengumpulan · Nilai lulus {data?.assessment?.passing_score ?? '—'} · {ASSESSMENT_TYPE_LABELS[assessment.type]}
              </div>
            </>
          )}

          {!isLoading && grading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <strong style={{ fontSize: 15 }}>{grading.submission.user?.name}</strong>
                {grading.submission.user?.nip && <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>NIP {grading.submission.user.nip}</span>}
                <span style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 'auto' }}>Dikumpulkan {formatDateTime(grading.submission.submitted_at)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {questions.map((q, i) => {
                  const correct = isCorrect(q, grading.submission.answers);
                  return (
                    <div key={q.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <p style={{ margin: 0, fontWeight: 500, fontSize: 13 }}>{i + 1}. <span dangerouslySetInnerHTML={{ __html: safe(q.question) }} /></p>
                        <span style={{ fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{QUESTION_TYPE_LABELS[q.type]} · {q.points ?? 1} poin</span>
                      </div>
                      <div style={{ fontSize: 13, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ color: 'var(--fg-3)', flexShrink: 0 }}>Jawaban:</span>
                        <span style={{ flex: 1 }}>{renderAnswer(q, grading.submission.answers)}</span>
                        {correct !== null && (
                          <em style={{ fontSize: 11, fontStyle: 'normal', color: correct ? 'var(--emerald)' : '#d04352', whiteSpace: 'nowrap' }}>
                            {correct ? '✓ Benar' : '✗ Salah'}
                          </em>
                        )}
                      </div>
                      {q.type === 'essay' && <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>Jawaban esai — perlu dinilai manual</p>}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <label style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>Nilai (0–100):</label>
                <input
                  type="number" min="0" max="100" value={score} onChange={(e) => setScore(e.target.value)}
                  style={{ width: 80, padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border)', fontSize: 13 }}
                  placeholder="0–100"
                />
                {gradeMut.error && <span style={{ fontSize: 12, color: '#d04352' }}>{gradeMut.error.response?.data?.message || 'Gagal menyimpan.'}</span>}
                <button className="primary-button compact" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }} disabled={score === '' || gradeMut.isPending} onClick={() => gradeMut.mutate()}>
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

// ── Assessment Form Modal ─────────────────────────────────────────────────────

function AssessmentFormModal({ title, form, setForm, onClose, onSubmit, isSaving, error }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 560 }}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button className="icon-action" onClick={onClose}><X size={16} /></button>
        </div>
        <form className="modal-body" style={{ display: 'grid', gap: 14 }} onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="event-field">
              <span>Tipe</span>
              <select value={form.type} onChange={(e) => setForm((c) => ({ ...c, type: e.target.value }))}>
                {Object.entries(ASSESSMENT_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="event-field">
              <span>Status</span>
              <select value={form.status} onChange={(e) => setForm((c) => ({ ...c, status: e.target.value }))}>
                {Object.entries(ASSESSMENT_STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="event-field">
            <span>Judul Asesmen</span>
            <input autoFocus required value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} placeholder="Contoh: Pre-Test Kompetensi Digital" />
          </div>
          <div className="event-field">
            <span>Petunjuk Pengerjaan</span>
            <textarea rows={2} value={form.instructions} onChange={(e) => setForm((c) => ({ ...c, instructions: e.target.value }))} placeholder="Baca soal dengan teliti sebelum menjawab…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div className="event-field">
              <span>Nilai Lulus (0–100)</span>
              <input type="number" min="0" max="100" value={form.passing_score} onChange={(e) => setForm((c) => ({ ...c, passing_score: e.target.value }))} placeholder="70" />
            </div>
            <div className="event-field">
              <span>Batas Waktu (menit)</span>
              <input type="number" min="1" value={form.time_limit_minutes} onChange={(e) => setForm((c) => ({ ...c, time_limit_minutes: e.target.value }))} placeholder="opsional" />
            </div>
            <div className="event-field">
              <span>Undian Bank Soal</span>
              <input type="number" min="1" value={form.bank_draw_count} onChange={(e) => setForm((c) => ({ ...c, bank_draw_count: e.target.value }))} placeholder="tampilkan semua" />
            </div>
          </div>
          {error && <div className="form-error-visible">{error.response?.data?.message || 'Gagal menyimpan.'}</div>}
          <div className="modal-foot">
            <button type="button" className="outline-button compact" onClick={onClose}>Batal</button>
            <button type="submit" className="primary-button compact" disabled={isSaving}>
              {isSaving ? 'Menyimpan…' : 'Simpan Asesmen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ name, onClose, onConfirm, isPending }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 400 }}>
        <div className="modal-head">
          <h2>Hapus Asesmen</h2>
          <button className="icon-action" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ margin: 0, lineHeight: 1.65 }}>Hapus <strong>"{name}"</strong>? Semua soal dan jawaban peserta akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.</p>
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

// ── Skeletons ─────────────────────────────────────────────────────────────────

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function EventListSkeleton() {
  return (
    <>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="fm-event-item" style={{ opacity: Math.max(0.18, 1 - i * 0.1), pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            <Skel w="72%" h={13} />
            <Skel w="45%" h={10} />
          </div>
          <Skel w={14} h={14} />
        </div>
      ))}
    </>
  );
}

function AssessmentCardsSkeleton() {
  return (
    <div className="fa-assessment-cards">
      {[0, 1].map((i) => (
        <div key={i} className={`fa-assessment-card ${i === 0 ? 'fa-card--pre' : 'fa-card--post'}`} style={{ opacity: i === 0 ? 1 : 0.55 }}>
          <div className="fa-card-head">
            <Skel w={64} h={20} style={{ borderRadius: 4 }} />
            <Skel w={80} h={18} style={{ borderRadius: 4 }} />
          </div>
          <Skel w="70%" h={15} style={{ marginTop: 4 }} />
          <div className="fa-card-meta" style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            <Skel w={52} h={11} />
            <Skel w={44} h={11} />
            <Skel w={56} h={11} />
          </div>
          <div className="fa-card-actions" style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Skel w="40%" h={30} style={{ borderRadius: 6 }} />
            <Skel w="40%" h={30} style={{ borderRadius: 6 }} />
            <Skel w={30} h={30} style={{ borderRadius: 6 }} />
            <Skel w={30} h={30} style={{ borderRadius: 6 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Assessments Panel ─────────────────────────────────────────────────────────

function AssessmentsPanel({ uuid }) {
  const queryClient = useQueryClient();
  const qk = ['event-assessments', uuid];
  const [formModal, setFormModal] = useState(null);
  const [form, setForm] = useState(EMPTY_ASSESSMENT);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [questionsModal, setQuestionsModal] = useState(null);
  const [submissionsModal, setSubmissionsModal] = useState(null);

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => (await api.get(`/training-events/${uuid}/assessments`)).data.data,
    enabled: !!uuid,
  });

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: qk }); setFormModal(null); };

  const createMut = useMutation({
    mutationFn: (d) => api.post(`/training-events/${uuid}/assessments`, d),
    onSuccess: () => { invalidate(); toast.success('Asesmen ditambahkan.'); },
    onError: () => toast.error('Gagal menyimpan asesmen.'),
  });
  const updateMut = useMutation({
    mutationFn: ({ id, ...d }) => api.put(`/training-events/${uuid}/assessments/${id}`, d),
    onSuccess: () => { invalidate(); toast.success('Asesmen diperbarui.'); },
    onError: () => toast.error('Gagal memperbarui asesmen.'),
  });
  const deleteMut = useMutation({
    mutationFn: (id) => api.delete(`/training-events/${uuid}/assessments/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qk }); setDeleteTarget(null); toast.success('Asesmen dihapus.'); },
    onError: () => toast.error('Gagal menghapus asesmen.'),
  });

  const isSaving = createMut.isPending || updateMut.isPending;
  const saveError = createMut.error || updateMut.error;

  const openCreate = () => { createMut.reset(); updateMut.reset(); setForm(EMPTY_ASSESSMENT); setFormModal('create'); };
  const openEdit = (a) => {
    createMut.reset(); updateMut.reset();
    setForm({ type: a.type, title: a.title, instructions: a.instructions || '', passing_score: a.passing_score?.toString() || '70', time_limit_minutes: a.time_limit_minutes?.toString() || '', bank_draw_count: a.bank_draw_count?.toString() || '', status: a.status });
    setFormModal({ id: a.id });
  };

  const submit = () => {
    if (!form.title.trim()) return;
    const payload = { type: form.type, title: form.title, instructions: form.instructions || null, passing_score: parseInt(form.passing_score, 10) || 70, time_limit_minutes: parseInt(form.time_limit_minutes, 10) || null, bank_draw_count: parseInt(form.bank_draw_count, 10) || null, status: form.status };
    if (formModal?.id) updateMut.mutate({ id: formModal.id, ...payload });
    else createMut.mutate(payload);
  };

  return (
    <>
      {isLoading && <AssessmentCardsSkeleton />}

      {!isLoading && assessments.length === 0 && (
        <div className="material-empty">
          <ClipboardCheck size={28} />
          <p>Belum ada asesmen.</p>
          <span>Tambahkan pre-test atau post-test untuk event ini.</span>
        </div>
      )}

      <div className="fa-assessment-cards">
        {assessments.map((a) => (
          <div key={a.id} className={`fa-assessment-card ${a.type === 'pre_test' ? 'fa-card--pre' : 'fa-card--post'}`}>
            <div className="fa-card-head">
              <em className={`fa-card-type-badge ${a.type === 'pre_test' ? 'fa-badge--pre' : 'fa-badge--post'}`}>
                {ASSESSMENT_TYPE_LABELS[a.type]}
              </em>
              <em className={`status-badge${a.status === 'published' ? ' active' : ''}`} style={{ fontSize: 11 }}>
                {ASSESSMENT_STATUS_LABELS[a.status]}
              </em>
            </div>
            <strong className="fa-card-title">{a.title}</strong>
            <div className="fa-card-meta">
              {a.questions_count != null && <span>{a.questions_count} soal</span>}
              {a.passing_score != null && <span>Lulus ≥ {a.passing_score}</span>}
              {a.time_limit_minutes && <span>{a.time_limit_minutes} menit</span>}
              {a.bank_draw_count && <span>Undian {a.bank_draw_count}</span>}
            </div>
            {a.instructions && <p className="fa-card-instructions">{a.instructions}</p>}
            <div className="fa-card-actions">
              <button className="outline-button compact" style={{ flex: 1 }} onClick={() => setQuestionsModal(a)}>
                <HelpCircle size={13} /> Soal {a.questions_count > 0 ? `(${a.questions_count})` : ''}
              </button>
              <button className="outline-button compact" style={{ flex: 1 }} onClick={() => setSubmissionsModal(a)}>
                <Award size={13} /> Hasil
              </button>
              <button className="icon-action" title="Edit" onClick={() => openEdit(a)}><Pencil size={13} /></button>
              <button className="icon-action danger-icon" title="Hapus" onClick={() => setDeleteTarget(a)}><Trash2 size={13} /></button>
            </div>
          </div>
        ))}
      </div>

      <button className="setup-add-btn" style={{ marginTop: assessments.length ? 8 : 0 }} onClick={openCreate}>
        <Plus size={14} /> Tambah Asesmen
      </button>

      {formModal !== null && (
        <AssessmentFormModal
          title={formModal?.id ? 'Edit Asesmen' : 'Asesmen Baru'}
          form={form}
          setForm={setForm}
          onClose={() => setFormModal(null)}
          onSubmit={submit}
          isSaving={isSaving}
          error={saveError}
        />
      )}

      {deleteTarget && (
        <DeleteConfirm
          name={deleteTarget.title}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMut.mutate(deleteTarget.id)}
          isPending={deleteMut.isPending}
        />
      )}

      {questionsModal && <QuestionsModal uuid={uuid} assessment={questionsModal} onClose={() => setQuestionsModal(null)} />}
      {submissionsModal && <SubmissionsModal uuid={uuid} assessment={submissionsModal} onClose={() => setSubmissionsModal(null)} />}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FacilitatorAssessments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedUuid, setSelectedUuid] = useState(null);
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

  const selectedEvent = events.find((e) => e.uuid === selectedUuid);

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Facilitator</p>
        <h1>Assessments</h1>
      </div>

      <div className="fm-layout">
        {/* Event list */}
        <aside className="fm-events-list">
          <div className="fm-events-header">Training Events</div>
          {eventsLoading && <EventListSkeleton />}
          {!eventsLoading && events.length === 0 && <div className="resource-note">Tidak ada event.</div>}
          {events.map((ev) => (
            <button key={ev.uuid} className={`fm-event-item${selectedUuid === ev.uuid ? ' active' : ''}`} onClick={() => selectEvent(ev.uuid)}>
              <div className="fm-event-item-body">
                <strong>{ev.title}</strong>
                <span>{formatDate(ev.start_date)}</span>
              </div>
              <ChevronRight size={14} className="fm-event-chevron" />
            </button>
          ))}
        </aside>

        {/* Assessments panel */}
        <div className="fm-materials-panel">
          {!selectedUuid && (
            <div className="fm-no-event">
              <ClipboardCheck size={36} />
              <p>Pilih training event untuk mengelola asesmen.</p>
            </div>
          )}

          {selectedUuid && (
            <>
              <div className="fm-panel-head">
                <div>
                  <strong className="fm-panel-title">{selectedEvent?.title}</strong>
                  <span className="fm-panel-sub">Kelola pre-test &amp; post-test</span>
                </div>
              </div>
              <AssessmentsPanel uuid={selectedUuid} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
