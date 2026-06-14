import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Award,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  File,
  LayoutDashboard,
  Loader2,
  MapPin,
  MoreHorizontal,
  Pencil,
  Search,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import api from '../../api.js';
import KpiCard from '../../components/KpiCard.jsx';
import { getRoleNames } from '../../utils/permissions.js';

const STATUS_LABELS = { draft: 'Draft', scheduled: 'Scheduled', active: 'Aktif', rejected: 'Ditolak' };
const CREATOR_STATUSES = ['draft', 'scheduled'];

const EMPTY_DRAFT = {
  title: '',
  description: '',
  status: 'draft',
  quota: '',
  facilitator_ids: [],
  location: '',
  start_date: '',
  end_date: '',
};

const CHECKLIST_FIELDS = [
  { key: 'title', label: 'Nama event', check: (v) => !!v },
  { key: 'facilitator_ids', label: 'Fasilitator', check: (v) => Array.isArray(v) && v.length > 0 },
  { key: 'quota', label: 'Kuota peserta', check: (v) => v !== '' && v !== null && v !== undefined },
  { key: 'start_date', label: 'Tanggal mulai', check: (v) => !!v },
  { key: 'end_date', label: 'Tanggal selesai', check: (v) => !!v },
  { key: 'location', label: 'Lokasi', check: (v) => !!v },
];

function facilitatorNames(event) {
  const names = (event.facilitators || []).map((f) => f.user?.name).filter(Boolean);
  return names.length > 0 ? names.join(', ') : '—';
}

function formatDate(d) {
  if (!d) return null;
  const s = d.length > 10 ? d.substring(0, 10) : d;
  return new Date(`${s}T00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateRange(start, end) {
  const s = formatDate(start);
  const e = formatDate(end);
  if (!s && !e) return null;
  if (s === e) return s;
  return `${s || '?'} – ${e || '?'}`;
}

function formatQuota(quota) {
  if (quota == null) return null;
  return quota === 0 ? 'Tidak terbatas' : `${quota} peserta`;
}

function toPayload(draft) {
  return {
    title: draft.title,
    description: draft.description || null,
    location: draft.location || null,
    start_date: draft.start_date,
    end_date: draft.end_date,
    quota: parseInt(draft.quota, 10) || 0,
    status: draft.status || 'draft',
    facilitator_ids: draft.facilitator_ids || [],
  };
}

function eventToDraft(event) {
  return {
    title: event.title,
    description: event.description || '',
    location: event.location || '',
    status: event.status || 'draft',
    quota: event.quota?.toString() || '',
    facilitator_ids: (event.facilitators || []).map((f) => f.id),
    start_date: event.start_date ? event.start_date.substring(0, 10) : '',
    end_date: event.end_date ? event.end_date.substring(0, 10) : '',
  };
}

function statusBadgeClass(status) {
  if (status === 'active') return 'active';
  if (status === 'rejected') return 'rejected';
  if (status === 'scheduled') return 'scheduled';
  return '';
}

function FacilitatorMultiSelect({ value, onChange, facilitators, loading }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = facilitators.filter((f) => value.includes(f.id));
  const q = search.toLowerCase();
  const available = facilitators.filter(
    (f) => !value.includes(f.id) && (!q || f.user?.name?.toLowerCase().includes(q) || f.institution?.toLowerCase().includes(q)),
  );

  const toggle = (id) => {
    onChange(value.includes(id) ? value.filter((i) => i !== id) : [...value, id]);
    setOpen(true);
  };

  return (
    <div className="facilitator-lookup" ref={ref}>
      <div
        className={`facilitator-multi-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        {selected.length === 0 ? (
          <span className="facilitator-placeholder">{loading ? 'Memuat fasilitator…' : 'Pilih fasilitator…'}</span>
        ) : (
          <div className="facilitator-chips">
            {selected.map((f) => (
              <span key={f.id} className="facilitator-chip">
                {f.user?.name}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggle(f.id); }}
                  aria-label={`Hapus ${f.user?.name}`}
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
        <ChevronDown size={13} className={`facilitator-chevron${open ? ' open' : ''}`} style={{ flexShrink: 0 }} />
      </div>

      {open && (
        <div className="facilitator-dropdown">
          <div className="facilitator-search-wrap">
            <Search size={13} />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama atau institusi…"
            />
          </div>
          <div className="facilitator-option-list">
            {loading && <div className="facilitator-hint">Memuat…</div>}
            {!loading && available.length === 0 && (
              <div className="facilitator-hint">
                {value.length > 0 && facilitators.length === value.length ? 'Semua fasilitator sudah dipilih' : 'Tidak ditemukan'}
              </div>
            )}
            {available.map((f) => (
              <button
                key={f.id}
                type="button"
                className="facilitator-option"
                onClick={(e) => { e.stopPropagation(); toggle(f.id); }}
              >
                <span className="facilitator-option-name">{f.user?.name}</span>
                <span className={`facilitator-type-badge ${f.facilitator_type}`}>{f.facilitator_type}</span>
                <span className="facilitator-option-inst">{f.institution}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AssignTemplateModal({ event, onClose, onSuccess }) {
  const [templateId, setTemplateId] = useState(event.certificate_template?.id?.toString() ?? '');

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['certificate-templates-pick'],
    queryFn: () => api.get('/certificate-templates?per_page=50').then((r) => r.data.data.data ?? []),
  });

  const mut = useMutation({
    mutationFn: () => api.patch(`/training-events/${event.uuid}/certificate-template`, {
      certificate_template_id: templateId ? parseInt(templateId) : null,
    }),
    onSuccess: (res) => {
      toast.success('Template sertifikat ditetapkan.');
      onSuccess(res.data.data);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menetapkan template.'),
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <strong>Assign Template Sertifikat</strong>
          <button type="button" className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--fg-2)' }}>
            Event: <strong>{event.title}</strong>
          </p>
          <label className="event-field">
            <span>Template Sertifikat</span>
            {isLoading
              ? <div style={{ fontSize: 12, color: 'var(--fg-3)' }}><Loader2 size={12} style={{ animation: 'spin 1s linear infinite', display: 'inline' }} /> Memuat…</div>
              : <select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                  <option value="">— Tidak ada (kosongkan) —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
            }
          </label>
          {templateId && (
            <div style={{ marginTop: 6, padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 4, fontSize: 12, color: '#1d4ed8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Award size={13} />
              Template ini akan digunakan saat menerbitkan sertifikat untuk event ini.
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="outline-button compact" onClick={onClose}>Batal</button>
          <button type="button" className="primary-button compact" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Award size={13} />}
            {mut.isPending ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  );
}

function EventFormField({ label, children }) {
  return (
    <label className="event-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function EventPreviewPanel({ draft, facilitators }) {
  const filledCount = CHECKLIST_FIELDS.filter(({ key, check }) => check(draft[key])).length;
  const progressPct = Math.round((filledCount / CHECKLIST_FIELDS.length) * 100);
  const dateRange = formatDateRange(draft.start_date, draft.end_date);
  const selectedFacilitators = facilitators.filter((f) => (draft.facilitator_ids || []).includes(f.id));

  return (
    <aside className="event-preview">
      <p className="mono-kicker text-muted">Pratinjau</p>

      <div className="event-preview-card">
        <div className="event-preview-card-header">
          <span className={`status-badge ${statusBadgeClass(draft.status)}`}>
            {STATUS_LABELS[draft.status] || draft.status || 'Draft'}
          </span>
          {draft.location && (
            <span className="event-preview-loc"><MapPin size={11} />{draft.location}</span>
          )}
        </div>
        <h3 className="event-preview-title">
          {draft.title || <span className="event-preview-placeholder">Nama event pelatihan</span>}
        </h3>
        {draft.description && <p className="event-preview-desc">{draft.description}</p>}
        <div className="event-preview-list">
          <div><CalendarDays size={14} /><span>{dateRange || <em>Jadwal belum ditetapkan</em>}</span></div>
          <div><Users size={14} /><span>{draft.quota !== '' ? formatQuota(parseInt(draft.quota, 10) || 0) : <em>Kuota belum diisi</em>}</span></div>
          <div>
            <User size={14} />
            <span>
              {selectedFacilitators.length > 0
                ? selectedFacilitators.map((f) => f.user?.name).filter(Boolean).join(', ')
                : <em>Fasilitator belum dipilih</em>}
            </span>
          </div>
        </div>
      </div>

      <div className="event-form-completion">
        <div className="event-form-completion-head">
          <span>Kelengkapan</span>
          <strong>{filledCount}/{CHECKLIST_FIELDS.length} field</strong>
        </div>
        <div className="event-form-progress-track">
          <span style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <div className="event-checklist">
        {CHECKLIST_FIELDS.map(({ key, label, check }) => (
          <div key={key} className={check(draft[key]) ? 'done' : ''}>
            <CheckCircle2 size={13} />
            <span>{label}</span>
          </div>
        ))}
      </div>
    </aside>
  );
}

function EventModal({ modal, draft, setDraft, onSave, onDelete, onApprove, onClose, isSaving, saveError, isSuperAdmin, isFacilitator, facilitators, facilitatorsLoading }) {
  if (!modal) return null;

  const isForm = modal.type === 'create' || modal.type === 'edit';

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box event-modal-box" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <p className="mono-kicker text-muted" style={{ marginBottom: 2 }}>
              {modal.type === 'edit' ? 'Perbarui data' : modal.type === 'create' ? 'Training Event baru' : ''}
            </p>
            <h2>
              {modal.type === 'detail' ? modal.event.title
                : modal.type === 'edit' ? 'Edit Event'
                : modal.type === 'delete' ? 'Hapus Event'
                : 'Create Event'}
            </h2>
          </div>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        {modal.type === 'detail' && (
          <div className="modal-body">
            <div className="class-meta-grid">
              <div>
                <span>Status</span>
                <strong>
                  <span className={`status-badge ${statusBadgeClass(modal.event.status)}`}>
                    {STATUS_LABELS[modal.event.status] || modal.event.status}
                  </span>
                </strong>
              </div>
              <div><span>Fasilitator</span><strong>{facilitatorNames(modal.event)}</strong></div>
              <div><span>Kuota</span><strong>{formatQuota(modal.event.quota)}</strong></div>
              <div><span>Lokasi</span><strong>{modal.event.location || '—'}</strong></div>
              <div><span>Mulai</span><strong>{formatDate(modal.event.start_date) || '—'}</strong></div>
              <div><span>Selesai</span><strong>{formatDate(modal.event.end_date) || '—'}</strong></div>
            </div>
            {modal.event.description && (
              <div className="resource-note" style={{ marginTop: 12 }}>{modal.event.description}</div>
            )}
            {isSuperAdmin && (
              <div className="modal-foot" style={{ marginTop: 16 }}>
                <button className="outline-button compact" onClick={onClose}>Tutup</button>
                <button
                  className="outline-button compact approve-button"
                  disabled={isSaving}
                  onClick={() => onApprove(modal.event, 'active')}
                >
                  <ThumbsUp size={14} /> Setujui
                </button>
                <button
                  className="outline-button compact danger-outline-button"
                  disabled={isSaving}
                  onClick={() => onApprove(modal.event, 'rejected')}
                >
                  <ThumbsDown size={14} /> Tolak
                </button>
              </div>
            )}
          </div>
        )}

        {isForm && (
          <form className="event-modal-body" onSubmit={onSave}>
            <div className="event-form-main">
              <div className="event-section-label">Identitas Event</div>

              <EventFormField label="Nama Event">
                <input
                  value={draft.title}
                  onChange={(e) => setDraft((c) => ({ ...c, title: e.target.value }))}
                  placeholder="Contoh: Desain Pembelajaran ASN Digital"
                  autoFocus
                  required
                />
              </EventFormField>

              <EventFormField label="Deskripsi">
                <textarea
                  value={draft.description}
                  onChange={(e) => setDraft((c) => ({ ...c, description: e.target.value }))}
                  placeholder="Tujuan, target kompetensi, atau catatan singkat tentang event ini…"
                  rows={3}
                />
              </EventFormField>

              <div className="event-section-label" style={{ marginTop: 6 }}>Penyelenggara</div>

              <div className="event-field">
                <span>Fasilitator</span>
                {isFacilitator ? (
                  <div className="facilitator-self-note">
                    <span>Anda akan otomatis ditugaskan sebagai fasilitator event ini.</span>
                  </div>
                ) : (
                  <FacilitatorMultiSelect
                    value={draft.facilitator_ids}
                    onChange={(ids) => setDraft((c) => ({ ...c, facilitator_ids: ids }))}
                    facilitators={facilitators}
                    loading={facilitatorsLoading}
                  />
                )}
              </div>

              <EventFormField label="Lokasi">
                <input
                  value={draft.location}
                  onChange={(e) => setDraft((c) => ({ ...c, location: e.target.value }))}
                  placeholder="Ruang, gedung, atau online"
                />
              </EventFormField>

              <div className="event-field-grid">
                <EventFormField label="Kuota Peserta">
                  <div className="event-quota-wrap">
                    <input
                      type="number"
                      min="0"
                      value={draft.quota}
                      onChange={(e) => setDraft((c) => ({ ...c, quota: e.target.value }))}
                      placeholder="0"
                    />
                    <span className="event-quota-suffix">{draft.quota === '0' ? 'tak terbatas' : 'peserta'}</span>
                  </div>
                  {draft.quota === '0' && (
                    <p className="event-quota-hint">Kuota 0 berarti tidak ada batas peserta.</p>
                  )}
                </EventFormField>
                <div className="event-field">
                  <span>Status</span>
                  <div className="status-chip-group">
                    {(isSuperAdmin ? ['draft', 'scheduled', 'active'] : CREATOR_STATUSES).map((s) => (
                      <button
                        key={s}
                        type="button"
                        className={`status-chip ${draft.status === s ? 'active' : ''}`}
                        onClick={() => setDraft((c) => ({ ...c, status: s }))}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="event-section-label" style={{ marginTop: 6 }}>Jadwal</div>

              <div className="event-field-grid">
                <EventFormField label="Tanggal Mulai">
                  <input
                    type="date"
                    value={draft.start_date}
                    onChange={(e) => setDraft((c) => ({ ...c, start_date: e.target.value }))}
                  />
                </EventFormField>
                <EventFormField label="Tanggal Selesai">
                  <input
                    type="date"
                    value={draft.end_date}
                    min={draft.start_date || undefined}
                    onChange={(e) => setDraft((c) => ({ ...c, end_date: e.target.value }))}
                  />
                </EventFormField>
              </div>

              {saveError && (
                <div className="form-error-visible">
                  {saveError.response?.data?.message || 'Gagal menyimpan. Coba lagi.'}
                </div>
              )}
            </div>

            <EventPreviewPanel draft={draft} facilitators={facilitators} />

            <div className="modal-foot event-modal-foot">
              <button className="outline-button compact" type="button" onClick={onClose}>Batal</button>
              <button className="primary-button compact" disabled={isSaving}>
                {isSaving ? 'Menyimpan…' : modal.type === 'edit' ? 'Simpan Perubahan' : 'Buat Event'}
              </button>
            </div>
          </form>
        )}

        {modal.type === 'delete' && (
          <div className="modal-body">
            <p className="class-description">
              Yakin ingin menghapus <strong>{modal.event.title}</strong>? Aksi ini tidak dapat dibatalkan.
            </p>
            <div className="modal-foot">
              <button className="outline-button compact" onClick={onClose}>Batal</button>
              <button className="primary-button compact" onClick={() => onDelete(modal.event)} disabled={isSaving}>
                {isSaving ? 'Menghapus…' : 'Hapus'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function TrainingEventListSkeleton() {
  return (
    <div className="work-list">
      {Array.from({ length: 7 }).map((_, i) => (
        <div className="work-row crud-row training-event-row" key={i} style={{ opacity: Math.max(0.18, 1 - i * 0.1) }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <Skel w="52%" h={14} />
            <Skel w="74%" h={11} />
          </div>
          <Skel w={72} h={22} style={{ borderRadius: 4 }} />
          <div className="row-actions" style={{ display: 'flex', gap: 6 }}>
            <Skel w={28} h={28} style={{ borderRadius: 4 }} />
            <Skel w={28} h={28} style={{ borderRadius: 4 }} />
            <Skel w={28} h={28} style={{ borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

const FACILITATOR_ROLES = ['fasilitator-internal', 'fasilitator-eksternal'];

export default function AdminOpdEvents({ session }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [modal, setModal] = useState(null);
  const [rowMenu, setRowMenu] = useState(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [assignModal, setAssignModal] = useState(null); // event object

  const roles = getRoleNames(session?.user);
  const isSuperAdmin = roles.includes('super-admin');
  const isFacilitator = roles.some((r) => FACILITATOR_ROLES.includes(r));

  const { data: eventsData, isLoading, isError } = useQuery({
    queryKey: ['training-events'],
    queryFn: async () => (await api.get('/training-events')).data.data.data,
  });
  const events = eventsData || [];

  const { data: facilitatorsData, isLoading: facilitatorsLoading } = useQuery({
    queryKey: ['facilitators-all'],
    queryFn: async () => (await api.get('/facilitators?all=1')).data.data,
    enabled: !isFacilitator,
    staleTime: 5 * 60 * 1000,
  });
  const facilitators = facilitatorsData || [];

  const onSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['training-events'] });
    setModal(null);
    setRowMenu(null);
  };

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/training-events', payload),
    onSuccess: () => { onSuccess(); toast.success('Event dibuat.'); },
    onError: () => toast.error('Gagal membuat event.'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ uuid, ...payload }) => api.put(`/training-events/${uuid}`, payload),
    onSuccess: () => { onSuccess(); toast.success('Event diperbarui.'); },
    onError: () => toast.error('Gagal memperbarui event.'),
  });

  const approveMutation = useMutation({
    mutationFn: ({ uuid, status }) => api.patch(`/training-events/${uuid}/approve`, { status }),
    onSuccess: (_, { status }) => { onSuccess(); toast.success(status === 'active' ? 'Event disetujui.' : 'Event ditolak.'); },
    onError: () => toast.error('Gagal mengubah status event.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (uuid) => api.delete(`/training-events/${uuid}`),
    onSuccess: () => { onSuccess(); toast.success('Event dihapus.'); },
    onError: () => toast.error('Gagal menghapus event.'),
  });

  const isSaving = createMutation.isPending || updateMutation.isPending || approveMutation.isPending || deleteMutation.isPending;
  const saveError = createMutation.error || updateMutation.error;

  const openCreate = () => {
    createMutation.reset();
    setDraft(EMPTY_DRAFT);
    setModal({ type: 'create' });
  };

  const openEdit = (event) => {
    updateMutation.reset();
    const d = eventToDraft(event);
    const allowedStatuses = isSuperAdmin ? ['draft', 'scheduled', 'active'] : CREATOR_STATUSES;
    if (!allowedStatuses.includes(d.status)) d.status = 'draft';
    setDraft(d);
    setModal({ type: 'edit', event });
  };

  const saveEvent = (e) => {
    e.preventDefault();
    if (!draft.title.trim()) return;
    const payload = toPayload(draft);
    if (modal?.type === 'edit') {
      updateMutation.mutate({ uuid: modal.event.uuid, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const duplicateEvent = (event) => {
    createMutation.mutate({
      ...toPayload(eventToDraft(event)),
      title: `${event.title} Copy`,
      status: 'draft',
    });
    setRowMenu(null);
  };

  const changeStatus = (event, status) => {
    updateMutation.mutate({ uuid: event.uuid, ...toPayload(eventToDraft(event)), status });
    setRowMenu(null);
  };

  const approveEvent = (event, status) => {
    approveMutation.mutate({ uuid: event.uuid, status });
    setRowMenu(null);
  };

  const deleteEvent = (event) => {
    deleteMutation.mutate(event.uuid);
  };

  const kpiCards = isSuperAdmin
    ? [
        ['Total Events', events.length, 'Event dalam sistem'],
        ['Aktif', events.filter((e) => e.status === 'active').length, 'Sudah disetujui'],
        ['Menunggu', events.filter((e) => e.status === 'scheduled').length, 'Perlu ditinjau'],
      ]
    : [
        ['Total Events', events.length, 'Event dalam scope OPD'],
        ['Aktif', events.filter((e) => e.status === 'active').length, 'Sudah berjalan'],
        ['Draft', events.filter((e) => e.status === 'draft').length, 'Perlu penjadwalan'],
      ];

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Training</p>
        <h1>Training Events</h1>
      </div>

      <div className="admin-mini-grid">
        {kpiCards.map(([label, value, note]) => (
          <KpiCard key={label} label={label} value={value} note={note} loading={isLoading} />
        ))}
      </div>

      <section className="enterprise-card">
        <div className="section-title">
          <div>
            <p className="mono-kicker text-muted">DAFTAR EVENT</p>
            <h2>Event Registry</h2>
          </div>
          <button className="primary-button compact" onClick={openCreate}>Buat Event</button>
        </div>

        {isLoading && <TrainingEventListSkeleton />}

        {isError && (
          <div className="form-error-visible">
            Gagal memuat data. Pastikan Anda sudah login dan memiliki akses.
          </div>
        )}

        {!isLoading && !isError && (
          <div className="work-list">
            {events.length === 0 && (
              <div className="resource-note">Belum ada event. Klik &ldquo;Buat Event&rdquo; untuk menambahkan.</div>
            )}
            {events.map((event) => (
              <div className="work-row crud-row training-event-row" key={event.uuid}>
                <div>
                  <strong>{event.title}</strong>
                  <span>
                    {facilitatorNames(event)}
                    {event.quota != null
                      ? ` · ${event.participants_count ?? 0}/${event.quota === 0 ? '∞' : event.quota} peserta`
                      : event.participants_count != null
                        ? ` · ${event.participants_count} peserta`
                        : ''}
                    {formatDateRange(event.start_date, event.end_date)
                      ? ` · ${formatDateRange(event.start_date, event.end_date)}`
                      : ''}
                  </span>
                  {event.certificate_template && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 2, fontSize: 11, color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 3, padding: '1px 7px' }}>
                      <Award size={10} /> {event.certificate_template.name}
                    </span>
                  )}
                </div>
                <em className={`status-badge ${statusBadgeClass(event.status)}`}>
                  {STATUS_LABELS[event.status] || event.status}
                </em>
                <div className="row-actions">
                  {event.certificate_template && (
                    <button
                      className="icon-action"
                      title={`Template: ${event.certificate_template.name}`}
                      style={{ color: '#2563eb' }}
                      onClick={() => { setAssignModal(event); setRowMenu(null); }}
                    >
                      <Award size={15} />
                    </button>
                  )}
                  <button className="icon-action" title="Detail" onClick={() => setModal({ type: 'detail', event })}><Eye size={15} /></button>
                  {isFacilitator && event.status === 'active' && (
                    <button
                      className="icon-action setup-action"
                      title="Setup Konten"
                      onClick={() => navigate(`/training-events/${event.uuid}`)}
                    >
                      <LayoutDashboard size={15} />
                    </button>
                  )}
                  {event.status !== 'rejected' && (
                    <button className="icon-action" title="Edit" onClick={() => openEdit(event)}><Pencil size={15} /></button>
                  )}
                  <div className="row-menu-wrap">
                    <button
                      className="icon-action"
                      title="Lainnya"
                      onClick={() => setRowMenu(rowMenu === event.uuid ? null : event.uuid)}
                    >
                      <MoreHorizontal size={15} />
                    </button>
                    {rowMenu === event.uuid && (
                      <div className="row-menu">
                        {isSuperAdmin ? (
                          <>
                            <button onClick={() => approveEvent(event, 'active')}>
                              <ThumbsUp size={14} /> Setujui
                            </button>
                            <button className="danger-menu" onClick={() => approveEvent(event, 'rejected')}>
                              <ThumbsDown size={14} /> Tolak
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => duplicateEvent(event)}><Copy size={14} /> Duplikasi</button>
                            {event.status !== 'rejected' && (
                              <>
                                <button onClick={() => changeStatus(event, 'scheduled')}><CheckCircle2 size={14} /> Set Scheduled</button>
                                <button onClick={() => changeStatus(event, 'draft')}><File size={14} /> Set Draft</button>
                              </>
                            )}
                            <button onClick={() => { setAssignModal(event); setRowMenu(null); }}>
                              <Award size={14} /> Assign Template Sertifikat
                            </button>
                            <button className="danger-menu" onClick={() => setModal({ type: 'delete', event })}><Trash2 size={14} /> Hapus</button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <EventModal
        modal={modal}
        draft={draft}
        setDraft={setDraft}
        onSave={saveEvent}
        onDelete={deleteEvent}
        onApprove={approveEvent}
        onClose={() => setModal(null)}
        isSaving={isSaving}
        saveError={saveError}
        isSuperAdmin={isSuperAdmin}
        isFacilitator={isFacilitator}
        facilitators={facilitators}
        facilitatorsLoading={facilitatorsLoading}
      />

      {assignModal && (
        <AssignTemplateModal
          event={assignModal}
          onClose={() => setAssignModal(null)}
          onSuccess={(updated) => {
            queryClient.setQueryData(['training-events'], (old) => {
              if (!Array.isArray(old)) return old;
              return old.map((e) => e.uuid === updated.uuid ? { ...e, ...updated } : e);
            });
            queryClient.invalidateQueries({ queryKey: ['training-events'] });
          }}
        />
      )}
    </div>
  );
}
