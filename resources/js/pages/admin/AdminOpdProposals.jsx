import { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Eye,
  FileText,
  ImagePlus,
  MapPin,
  Pencil,
  Plus,
  Search,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
} from 'lucide-react';
import api from '../../api.js';
import KpiCard from '../../components/KpiCard.jsx';

const STATUS = {
  draft:     { label: 'Draf',      color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
  submitted: { label: 'Diajukan', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  approved:  { label: 'Disetujui',color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  rejected:  { label: 'Ditolak',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

const TABS = [
  { key: 'all',       label: 'Semua'     },
  { key: 'mine',      label: 'Milik Saya' },
  { key: 'draft',     label: 'Draf'      },
  { key: 'submitted', label: 'Diajukan'  },
  { key: 'approved',  label: 'Disetujui' },
  { key: 'rejected',  label: 'Ditolak'   },
];

const EMPTY_EVENT = {
  title: '',
  description: '',
  location: '',
  facilitator_ids: [],
  start_date: '',
  end_date: '',
  quota: '0',
  is_paid: false,
  price: '',
  banner: null,
  banner_url: '',
  banner_remove: false,
  supporting_documents: [],
  existing_supporting_documents: [],
  remove_supporting_document_ids: [],
  target_all_opds: true,
  target_opd_ids: [],
  target_user_ids: [],
};

const EMPTY_FORM = { title: '', description: '', recommendation: '', event: { ...EMPTY_EVENT } };

function createEmptyForm() {
  return { ...EMPTY_FORM, event: { ...EMPTY_EVENT } };
}

function formatDate(d) {
  if (!d) return null;
  const s = d.length > 10 ? d.substring(0, 10) : d;
  return new Date(`${s}T00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateRange(start, end) {
  const s = formatDate(start);
  const e = formatDate(end);
  if (!s && !e) return 'Jadwal belum diisi';
  if (s === e) return s;
  return `${s || '?'} - ${e || '?'}`;
}

function onlyDigits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function formatRupiah(value) {
  const digits = onlyDigits(value);
  if (!digits) return '';
  return new Intl.NumberFormat('id-ID').format(Number(digits));
}

function buildProposalPayload(form, submit, isEdit = false) {
  const payload = new FormData();
  payload.append('title', form.title);
  payload.append('description', form.description || '');
  payload.append('recommendation', form.recommendation || '');
  if (!isEdit || submit) {
    payload.append('status', submit ? 'submitted' : 'draft');
  }

  if (isEdit) {
    payload.append('_method', 'PATCH');
  }

  Object.entries(form.event).forEach(([key, value]) => {
    if (key === 'banner_url') return;
    if (key === 'existing_supporting_documents') return;

    if (key === 'banner') {
      if (value instanceof File) payload.append('event[banner]', value);
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item instanceof File) {
          payload.append(`event[${key}][${index}]`, item);
          return;
        }
        payload.append(`event[${key}][${index}]`, item);
      });
      return;
    }

    if (typeof value === 'boolean') {
      payload.append(`event[${key}]`, value ? '1' : '0');
      return;
    }

    payload.append(`event[${key}]`, value ?? '');
  });

  return payload;
}

function proposalToForm(proposal) {
  return {
    title: proposal.title ?? '',
    description: proposal.description ?? '',
    recommendation: proposal.recommendation ?? '',
    event: {
      ...EMPTY_EVENT,
      title: proposal.event?.title ?? proposal.title ?? '',
      description: proposal.event?.description ?? proposal.description ?? '',
      location: proposal.event?.location ?? '',
      facilitator_ids: proposal.event?.facilitator_ids ?? [],
      start_date: proposal.event?.start_date ?? '',
      end_date: proposal.event?.end_date ?? '',
      quota: proposal.event?.quota?.toString() ?? '0',
      is_paid: proposal.event?.is_paid ?? false,
      price: proposal.event?.price?.toString() ?? '',
      banner: null,
      banner_url: proposal.event?.banner_url ?? '',
      banner_remove: false,
      supporting_documents: [],
      existing_supporting_documents: proposal.event?.supporting_documents ?? [],
      remove_supporting_document_ids: [],
      target_all_opds: proposal.event?.target_all_opds ?? true,
      target_opd_ids: proposal.event?.target_opd_ids ?? [],
      target_user_ids: proposal.event?.target_user_ids ?? [],
    },
  };
}

function StatusBadge({ status }) {
  const s = STATUS[status] ?? STATUS.draft;
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: '2px 10px', borderRadius: 20,
      color: s.color, background: s.bg, border: `1px solid ${s.border}`, letterSpacing: 0.3,
    }}>
      {s.label}
    </span>
  );
}

function statusBadgeClass(status) {
  if (status === 'approved') return 'active';
  if (status === 'submitted') return 'scheduled';
  if (status === 'rejected') return 'rejected';
  return '';
}

function ProposalRow({ p, onDetail, onEdit, onDelete, onApprove }) {
  const canEdit   = p.is_mine && (p.status === 'draft' || p.status === 'rejected');
  const canDelete = p.is_mine && (p.status === 'draft' || p.status === 'rejected');
  const canApproveThis = p.can_approve && p.status === 'submitted';
  const date = p.created_at
    ? new Date(p.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })
    : '—';

  return (
    <div className={`work-row crud-row proposal-row proposal-row--${p.status}`}>
      <div className="proposal-row-main">
        <div className="proposal-row-title">
          <strong>{p.title}</strong>
          {p.status === 'submitted' && <span className="event-pending-pill"><Bell size={9} /> Perlu Ditinjau</span>}
          {p.event?.status === 'active' && <span className="event-proposal-chip">Kegiatan aktif</span>}
        </div>
        {p.description && <span className="proposal-row-desc">{p.description}</span>}
        <span className="proposal-row-meta">
          {p.opd_name || 'OPD tidak tersedia'} · {p.proposer_name} · {date}
        </span>
        {p.event && (
          <span className="proposal-row-event">
            {formatDateRange(p.event.start_date, p.event.end_date)}
            {p.event.location ? ` · ${p.event.location}` : ''}
            {p.event.quota != null ? ` · ${p.event.quota === 0 ? 'Kuota bebas' : `${p.event.quota} peserta`}` : ''}
          </span>
        )}
        {p.recommendation && (
          <span className="proposal-row-note">Rekomendasi: {p.recommendation}</span>
        )}
      </div>

      <div className="proposal-row-status">
        <em className={`status-badge ${statusBadgeClass(p.status)}`}>
          {STATUS[p.status]?.label || p.status}
        </em>
      </div>

      <div className="row-actions proposal-row-actions">
        <button className="icon-action" title="Detail" onClick={() => onDetail(p)}><Eye size={15} /></button>
        {canEdit && <button className="icon-action" title="Ubah" onClick={() => onEdit(p)}><Pencil size={15} /></button>}
        {canDelete && <button className="icon-action danger-icon-action" title="Hapus" onClick={() => onDelete(p)}><Trash2 size={15} /></button>}
        {canApproveThis && (
          <button className="primary-button compact" onClick={() => onApprove(p)}>
            <CheckCircle2 size={14} /> Tinjau
          </button>
        )}
      </div>
    </div>
  );
}

function ProposalModal({ proposal, onClose, onSuccess, facilitators = [], facilitatorsLoading = false, audienceOptions = {}, audienceLoading = false }) {
  const qc = useQueryClient();
  const isEdit = !!proposal;
  const facilitatorRef = useRef(null);
  const bannerInputRef = useRef(null);
  const supportingDocsInputRef = useRef(null);
  const [facilitatorOpen, setFacilitatorOpen] = useState(false);
  const [facilitatorSearch, setFacilitatorSearch] = useState('');
  const [opdSearch, setOpdSearch] = useState('');
  const [asnSearch, setAsnSearch] = useState('');
  const [activeModalTab, setActiveModalTab] = useState('proposal');
  const [form, setForm] = useState(isEdit
    ? proposalToForm(proposal)
    : createEmptyForm()
  );
  const [bannerPreview, setBannerPreview] = useState(form.event.banner_url || '');

  useEffect(() => {
    if (!facilitatorOpen) return undefined;
    const handler = (event) => {
      if (facilitatorRef.current && !facilitatorRef.current.contains(event.target)) {
        setFacilitatorOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [facilitatorOpen]);

  useEffect(() => {
    if (!(form.event.banner instanceof File)) {
      setBannerPreview(form.event.banner_url || '');
      return undefined;
    }

    const url = URL.createObjectURL(form.event.banner);
    setBannerPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.event.banner, form.event.banner_url]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setEvent = (k, v) => setForm((f) => ({ ...f, event: { ...f.event, [k]: v } }));
  const quotaValue = form.event.quota === '' || form.event.quota == null ? '0' : form.event.quota;
  const selectedFacilitatorCount = form.event.facilitator_ids.length;
  const selectedAudienceCount = form.event.target_all_opds
    ? (audienceOptions.opds?.length || 0)
    : form.event.target_opd_ids.length + form.event.target_user_ids.length;
  const completion = [
    { key: 'title', label: 'Judul usulan', done: form.title.trim().length > 0 },
    { key: 'description', label: 'Deskripsi kebutuhan', done: form.description.trim().length > 0 },
    { key: 'recommendation', label: 'Rekomendasi pelatihan', done: form.recommendation.trim().length > 0 },
    { key: 'event_title', label: 'Nama kegiatan', done: form.event.title.trim().length > 0 },
    { key: 'event_date', label: 'Jadwal kegiatan', done: !!form.event.start_date && !!form.event.end_date },
    { key: 'event_quota', label: 'Kuota peserta', done: quotaValue !== '' },
    { key: 'event_facilitator', label: 'Fasilitator', done: selectedFacilitatorCount > 0 },
    { key: 'event_audience', label: 'Target peserta', done: form.event.target_all_opds || selectedAudienceCount > 0 },
  ];
  const completedCount = completion.filter((item) => item.done).length;
  const completionPct = Math.round((completedCount / completion.length) * 100);

  const save = useMutation({
    mutationFn: ({ data, submit }) => {
      const payload = buildProposalPayload(data, submit, isEdit);
      if (isEdit) return api.post(`/training-proposals/${proposal.uuid}`, payload);
      return api.post('/training-proposals', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
      qc.invalidateQueries({ queryKey: ['proposals-stats'] });
      qc.invalidateQueries({ queryKey: ['training-events'] });
      onSuccess();
    },
  });

  const field = (label, key, textarea = false, rows = 3, placeholder = '') => (
    <div className="proposal-field">
      <label>{label}</label>
      {textarea
        ? <textarea value={form[key]} onChange={(e) => set(key, e.target.value)}
            rows={rows} placeholder={placeholder}
          />
        : <input value={form[key]} onChange={(e) => set(key, e.target.value)}
            placeholder={placeholder}
          />
      }
    </div>
  );

  const eventField = (label, key, textarea = false, rows = 3, placeholder = '') => (
    <div className="proposal-field">
      <label>{label}</label>
      {textarea
        ? <textarea value={form.event[key]} onChange={(e) => setEvent(key, e.target.value)}
            rows={rows} placeholder={placeholder}
          />
        : <input value={form.event[key]} onChange={(e) => setEvent(key, e.target.value)}
            placeholder={placeholder}
          />
      }
    </div>
  );

  const selectedFacilitators = facilitators.filter((f) => form.event.facilitator_ids.includes(f.id));
  const modalTabs = [
    {
      key: 'proposal',
      label: 'Usulan',
      done: completion.slice(0, 3).every((item) => item.done),
    },
    {
      key: 'event',
      label: 'Kegiatan',
      done: completion
        .filter((item) => ['event_title', 'event_date', 'event_quota'].includes(item.key))
        .every((item) => item.done),
    },
    {
      key: 'facilitator',
      label: 'Fasilitator',
      done: selectedFacilitatorCount > 0,
    },
    {
      key: 'audience',
      label: 'Peserta',
      done: form.event.target_all_opds || selectedAudienceCount > 0,
    },
  ];
  const facilitatorQuery = facilitatorSearch.trim().toLowerCase();
  const filteredFacilitators = facilitators.filter((f) => {
    if (!facilitatorQuery) return true;
    return [f.display_name, f.institution, f.expertise]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(facilitatorQuery));
  });

  const toggleFacilitator = (id) => {
    const numericId = Number(id);
    setEvent('facilitator_ids', form.event.facilitator_ids.includes(numericId)
      ? form.event.facilitator_ids.filter((item) => item !== numericId)
      : [...form.event.facilitator_ids, numericId]
    );
  };

  const toggleEventArray = (key, id) => {
    const numericId = Number(id);
    const current = form.event[key] || [];
    setEvent(key, current.includes(numericId)
      ? current.filter((item) => item !== numericId)
      : [...current, numericId]
    );
  };

  const opds = audienceOptions.opds || [];
  const asns = audienceOptions.asns || [];
  const opdQuery = opdSearch.trim().toLowerCase();
  const asnQuery = asnSearch.trim().toLowerCase();
  const filteredOpds = opds.filter((opd) => {
    if (!opdQuery) return true;
    return [opd.name, opd.code].filter(Boolean).some((value) => String(value).toLowerCase().includes(opdQuery));
  });
  const filteredAsns = asns.filter((asn) => {
    if (!asnQuery) return true;
    return [asn.name, asn.nip, asn.email, asn.opd_name].filter(Boolean).some((value) => String(value).toLowerCase().includes(asnQuery));
  });
  const selectedOpds = opds.filter((opd) => form.event.target_opd_ids.includes(opd.id));
  const selectedAsns = asns.filter((asn) => form.event.target_user_ids.includes(asn.id));
  const supportingDocumentCount = form.event.existing_supporting_documents.length
    - form.event.remove_supporting_document_ids.length
    + form.event.supporting_documents.length;
  const audienceSummary = form.event.target_all_opds
    ? 'Semua OPD'
    : [
        selectedOpds.length ? `${selectedOpds.length} OPD` : null,
        selectedAsns.length ? `${selectedAsns.length} ASN` : null,
      ].filter(Boolean).join(' + ') || 'Target peserta belum dipilih';

  const canSubmit = form.title.trim().length > 0
    && form.event.title.trim().length > 0
    && !!form.event.start_date
    && !!form.event.end_date
    && quotaValue !== ''
    && selectedFacilitatorCount > 0
    && (form.event.target_all_opds || selectedAudienceCount > 0);

  return (
    <div className="modal-backdrop proposal-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box proposal-modal-box" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <p className="mono-kicker text-muted" style={{ marginBottom: 2 }}>
              {isEdit ? 'Perbarui usulan' : 'Usulan Pelatihan Baru'}
            </p>
            <h2>{isEdit ? 'Ubah Usulan' : 'Buat Usulan'}</h2>
          </div>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        <form className="proposal-modal-body" onSubmit={(e) => e.preventDefault()}>
          <div className="proposal-form-main">
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}
              role="tablist"
              aria-label="Bagian form usulan pelatihan"
            >
              {modalTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  role="tab"
                  aria-selected={activeModalTab === tab.key}
                  className={`ev-tab${activeModalTab === tab.key ? ' active' : ''}`}
                  onClick={() => setActiveModalTab(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="proposal-tab-panel">
              {activeModalTab === 'proposal' && (
                <>
                  <div className="event-section-label">Identitas Usulan</div>
                  {field('Judul Usulan *', 'title', false, 1, 'Contoh: Pelatihan Manajemen Kinerja ASN')}

                  <div className="event-section-label" style={{ marginTop: 6 }}>Kebutuhan Kompetensi</div>
                  {field('Deskripsi', 'description', true, 5, 'Jelaskan latar belakang, masalah kompetensi, target peserta, dan tujuan pelatihan...')}
                  {field('Rekomendasi', 'recommendation', true, 4, 'Rekomendasi bentuk pelatihan, metode, narasumber, atau pola pelaksanaan...')}
                </>
              )}

              {activeModalTab === 'event' && (
                <>
                  <div className="event-section-label">Rancangan Kegiatan</div>
                  {eventField('Nama Kegiatan *', 'title', false, 1, 'Contoh: Pelatihan Manajemen Kinerja ASN')}
                  {eventField('Deskripsi Kegiatan', 'description', true, 3, 'Ringkasan tujuan, metode, dan keluaran kegiatan...')}
                  <div className="event-field-grid">
                    <div className="proposal-field">
                      <label>Tanggal Mulai *</label>
                      <input type="date" value={form.event.start_date} onChange={(e) => setEvent('start_date', e.target.value)} />
                    </div>
                    <div className="proposal-field">
                      <label>Tanggal Selesai *</label>
                      <input type="date" value={form.event.end_date} onChange={(e) => setEvent('end_date', e.target.value)} />
                    </div>
                  </div>
                  <div className="event-field-grid">
                    {eventField('Lokasi', 'location', false, 1, 'Ruang, gedung, atau online')}
                    <div className="proposal-field">
                      <label>Kuota Peserta *</label>
                      <input
                        type="number"
                        min="0"
                        value={quotaValue}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => setEvent('quota', e.target.value === '' ? '0' : e.target.value)}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="proposal-price-row">
                    <label>
                      <input type="checkbox" checked={form.event.is_paid} onChange={(e) => setEvent('is_paid', e.target.checked)} />
                      Kegiatan berbayar
                    </label>
                    {form.event.is_paid && (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatRupiah(form.event.price)}
                        onChange={(e) => setEvent('price', onlyDigits(e.target.value))}
                        placeholder="125.000"
                      />
                    )}
                  </div>

                  <div className="proposal-field">
                      <label>Gambar Kegiatan</label>
                    <div className="proposal-banner-upload">
                      {bannerPreview ? (
                        <div className="proposal-banner-preview">
                          <img src={bannerPreview} alt="Pratinjau gambar kegiatan" />
                          <button
                            type="button"
                            className="proposal-banner-remove"
                            aria-label="Hapus gambar kegiatan"
                            onClick={() => {
                              setForm((current) => ({
                                ...current,
                                event: {
                                  ...current.event,
                                  banner: null,
                                  banner_url: '',
                                  banner_remove: true,
                                },
                              }));
                              if (bannerInputRef.current) bannerInputRef.current.value = '';
                            }}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="proposal-banner-placeholder"
                          onClick={() => bannerInputRef.current?.click()}
                        >
                          <ImagePlus size={20} />
                          <span>Pilih gambar kegiatan</span>
                          <small>PNG, JPG, WEBP — maks. 2 MB</small>
                        </button>
                      )}
                      {bannerPreview && (
                        <button
                          type="button"
                          className="outline-button compact"
                          style={{ marginTop: 6, justifySelf: 'start' }}
                          onClick={() => bannerInputRef.current?.click()}
                        >
                          <ImagePlus size={13} /> Ganti Gambar
                        </button>
                      )}
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setForm((current) => ({
                              ...current,
                              event: {
                                ...current.event,
                                banner: file,
                                banner_remove: false,
                              },
                            }));
                          }
                        }}
                      />
                    </div>
                  </div>
                  <div className="proposal-field">
                    <label>Dokumen Pendukung</label>
                    <div className="proposal-supporting-docs">
                      <button
                        type="button"
                        className="outline-button compact"
                        onClick={() => supportingDocsInputRef.current?.click()}
                      >
                        Tambah Dokumen
                      </button>
                      <input
                        ref={supportingDocsInputRef}
                        type="file"
                        accept=".pdf,.xls,.xlsx,image/*"
                        multiple
                        hidden
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;
                          setEvent('supporting_documents', [...form.event.supporting_documents, ...files]);
                          e.target.value = '';
                        }}
                      />
                      <span>PDF, Excel, atau gambar. Maksimal 10 MB per file.</span>
                    </div>

                    {(form.event.existing_supporting_documents.length > 0 || form.event.supporting_documents.length > 0) && (
                      <div className="proposal-supporting-list">
                        {form.event.existing_supporting_documents
                          .filter((document) => !form.event.remove_supporting_document_ids.includes(document.id))
                          .map((document) => (
                            <div key={`existing-${document.id}`} className="proposal-supporting-item">
                              <a href={document.url} target="_blank" rel="noreferrer">{document.name}</a>
                              <button
                                type="button"
                                className="icon-action danger-icon-action"
                                title="Hapus dokumen"
                                onClick={() => setEvent('remove_supporting_document_ids', [...form.event.remove_supporting_document_ids, document.id])}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ))}
                        {form.event.supporting_documents.map((file, index) => (
                          <div key={`${file.name}-${index}`} className="proposal-supporting-item">
                            <span>{file.name}</span>
                            <button
                              type="button"
                              className="icon-action danger-icon-action"
                              title="Hapus dokumen"
                              onClick={() => setEvent('supporting_documents', form.event.supporting_documents.filter((_, i) => i !== index))}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeModalTab === 'facilitator' && (
                <>
                  <div className="event-section-label">Fasilitator</div>
                  <div className="proposal-field">
                    <label>Pilih Fasilitator</label>
                    <div className="proposal-facilitator-picker" ref={facilitatorRef}>
                      <button
                        type="button"
                        className={`proposal-facilitator-trigger${facilitatorOpen ? ' open' : ''}`}
                        onClick={() => setFacilitatorOpen((open) => !open)}
                        disabled={facilitatorsLoading || facilitators.length === 0}
                      >
                        <span>
                          {facilitatorsLoading
                            ? 'Memuat fasilitator...'
                            : selectedFacilitators.length > 0
                              ? `${selectedFacilitators.length} fasilitator dipilih`
                              : facilitators.length === 0
                                ? 'Belum ada fasilitator aktif'
                                : 'Pilih fasilitator'}
                        </span>
                        <ChevronDown size={14} />
                      </button>

                      {selectedFacilitators.length > 0 && (
                        <div className="proposal-facilitator-summary">
                          {selectedFacilitators.slice(0, 4).map((f) => (
                            <em key={f.id}>{f.display_name}</em>
                          ))}
                          {selectedFacilitators.length > 4 && <em>+{selectedFacilitators.length - 4}</em>}
                        </div>
                      )}

                      {facilitatorOpen && !facilitatorsLoading && facilitators.length > 0 && (
                        <div className="proposal-facilitator-dropdown">
                          <div className="proposal-facilitator-search">
                            <Search size={13} />
                            <input
                              autoFocus
                              value={facilitatorSearch}
                              onChange={(e) => setFacilitatorSearch(e.target.value)}
                              placeholder="Cari fasilitator..."
                            />
                          </div>
                          <div className="proposal-facilitator-options">
                            {filteredFacilitators.length === 0 && (
                              <span className="proposal-facilitator-empty">Tidak ditemukan.</span>
                            )}
                            {filteredFacilitators.map((f) => (
                              <label key={f.id} className="proposal-facilitator-option">
                                <input
                                  type="checkbox"
                                  checked={form.event.facilitator_ids.includes(f.id)}
                                  onChange={() => toggleFacilitator(f.id)}
                                />
                                <span>
                                  <strong>{f.display_name}</strong>
                                  <small>{f.institution || f.expertise || 'Fasilitator aktif'}</small>
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="proposal-tab-help">
                    Fasilitator wajib dipilih. Admin OPD bisa memilih lebih dari satu nama dari data fasilitator aktif.
                  </p>
                </>
              )}

              {activeModalTab === 'audience' && (
                <>
                  <div className="event-section-label">Target Peserta</div>
                  <label className="proposal-audience-all">
                    <input
                      type="checkbox"
                      checked={form.event.target_all_opds}
                      onChange={(e) => setForm((current) => ({
                        ...current,
                        event: {
                          ...current.event,
                          target_all_opds: e.target.checked,
                          target_opd_ids: e.target.checked ? [] : current.event.target_opd_ids,
                        },
                      }))}
                    />
                    <span>
                      <strong>Semua OPD</strong>
                      <small>Seluruh ASN aktif akan menerima notifikasi jika kegiatan disetujui.</small>
                    </span>
                  </label>

                  {!form.event.target_all_opds && (
                    <div className="proposal-audience-grid">
                      <div className="proposal-audience-panel">
                        <div className="proposal-audience-head">
                          <strong>OPD tertentu</strong>
                          <span>{selectedOpds.length} dipilih</span>
                        </div>
                        <div className="proposal-facilitator-search">
                          <Search size={13} />
                          <input
                            value={opdSearch}
                            onChange={(e) => setOpdSearch(e.target.value)}
                            placeholder="Cari OPD..."
                          />
                        </div>
                        <div className="proposal-audience-options">
                          {audienceLoading && <span className="proposal-facilitator-empty">Memuat OPD...</span>}
                          {!audienceLoading && filteredOpds.length === 0 && <span className="proposal-facilitator-empty">OPD tidak ditemukan.</span>}
                          {filteredOpds.map((opd) => (
                            <label key={opd.id} className="proposal-facilitator-option">
                              <input
                                type="checkbox"
                                checked={form.event.target_opd_ids.includes(opd.id)}
                                onChange={() => toggleEventArray('target_opd_ids', opd.id)}
                              />
                              <span>
                                <strong>{opd.name}</strong>
                                <small>{opd.code || 'OPD aktif'}</small>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="proposal-audience-panel">
                        <div className="proposal-audience-head">
                          <strong>ASN tertentu</strong>
                          <span>{selectedAsns.length} dipilih</span>
                        </div>
                        <div className="proposal-facilitator-search">
                          <Search size={13} />
                          <input
                            value={asnSearch}
                            onChange={(e) => setAsnSearch(e.target.value)}
                            placeholder="Cari ASN..."
                          />
                        </div>
                        <div className="proposal-audience-options">
                          {audienceLoading && <span className="proposal-facilitator-empty">Memuat ASN...</span>}
                          {!audienceLoading && filteredAsns.length === 0 && <span className="proposal-facilitator-empty">ASN tidak ditemukan.</span>}
                          {filteredAsns.map((asn) => (
                            <label key={asn.id} className="proposal-facilitator-option">
                              <input
                                type="checkbox"
                                checked={form.event.target_user_ids.includes(asn.id)}
                                onChange={() => toggleEventArray('target_user_ids', asn.id)}
                              />
                              <span>
                                <strong>{asn.name}</strong>
                                <small>{asn.nip || asn.email || asn.opd_name || 'ASN aktif'}</small>
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="proposal-facilitator-summary">
                    {form.event.target_all_opds && <em>Semua OPD</em>}
                    {!form.event.target_all_opds && selectedOpds.slice(0, 3).map((opd) => <em key={`opd-${opd.id}`}>{opd.name}</em>)}
                    {!form.event.target_all_opds && selectedAsns.slice(0, 3).map((asn) => <em key={`asn-${asn.id}`}>{asn.name}</em>)}
                    {!form.event.target_all_opds && selectedOpds.length + selectedAsns.length > 6 && (
                      <em>+{selectedOpds.length + selectedAsns.length - 6}</em>
                    )}
                  </div>
                  <p className="proposal-tab-help">
                    Notifikasi sidebar untuk ASN hanya dikirim ke ASN yang cocok dengan cakupan peserta ini.
                  </p>
                </>
              )}
            </div>
          </div>

          <aside className="proposal-preview">
            <p className="mono-kicker text-muted">Pratinjau</p>
            <div className="proposal-preview-card">
              {bannerPreview && (
                <div className="proposal-preview-banner">
                  <img src={bannerPreview} alt="Gambar kegiatan" />
                </div>
              )}
              <StatusBadge status={isEdit ? proposal.status : 'draft' } />
              <h3>{form.title || <span>Judul usulan pelatihan</span>}</h3>
              <p>{form.description || 'Deskripsi kebutuhan pelatihan akan tampil di sini sebagai ringkasan untuk peninjau.'}</p>
              <div className="proposal-preview-event">
                <strong>{form.event.title || 'Nama kegiatan pelatihan'}</strong>
                <span><CalendarDays size={12} /> {formatDateRange(form.event.start_date, form.event.end_date)}</span>
                <span><MapPin size={12} /> {form.event.location || 'Lokasi belum diisi'}</span>
                <span>{`${quotaValue} peserta`}</span>
                <span>Sasaran: {audienceSummary}</span>
                <span>{supportingDocumentCount} dokumen pendukung</span>
              </div>
              {form.recommendation && (
                <div className="proposal-preview-note">
                  <strong>Rekomendasi</strong>
                  <span>{form.recommendation}</span>
                </div>
              )}
            </div>

            <div className="event-form-completion">
              <div className="event-form-completion-head">
                <span>Kelengkapan</span>
                <strong>{completedCount}/{completion.length} bagian</strong>
              </div>
              <div className="event-form-progress-track">
                <span style={{ width: `${completionPct}%` }} />
              </div>
            </div>

            <div className="event-checklist">
              {completion.map((item) => (
                <div key={item.key} className={item.done ? 'done' : ''}>
                  <span>✓</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="modal-foot proposal-modal-foot">
            <button className="outline-button compact" type="button" onClick={onClose}>Batal</button>
            <button className="outline-button compact" type="button" disabled={!canSubmit || save.isPending}
              onClick={() => save.mutate({ data: form, submit: false })}>
              {save.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Draf'}
            </button>
            <button className="primary-button compact" type="button" disabled={!canSubmit || save.isPending}
              onClick={() => save.mutate({ data: form, submit: true })}>
              {save.isPending ? 'Memproses...' : 'Ajukan Usulan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApproveModal({ proposal, onClose, onSuccess }) {
  const qc = useQueryClient();

  const approve = useMutation({
    mutationFn: (status) => api.post(`/training-proposals/${proposal.uuid}/approve`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['proposals'] });
      qc.invalidateQueries({ queryKey: ['proposals-stats'] });
      qc.invalidateQueries({ queryKey: ['training-events'] });
      onSuccess();
    },
  });

  return (
    <div className="modal-backdrop proposal-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box proposal-dialog-box" role="dialog" aria-modal="true">

        <div className="modal-head">
          <div>
            <p className="mono-kicker text-muted" style={{ marginBottom: 2 }}>Tinjau usulan</p>
            <h2>Tinjau Usulan</h2>
          </div>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        <div className="modal-body proposal-dialog-body">
          <StatusBadge status={proposal.status} />
          <h3>{proposal.title}</h3>
          <p className="proposal-dialog-meta">Oleh {proposal.proposer_name} · {proposal.opd_name}</p>

          {proposal.description && (
            <div className="proposal-dialog-note">
              {proposal.description}
            </div>
          )}

          {proposal.recommendation && (
            <div className="proposal-preview-note">
              <strong>Rekomendasi</strong>
              <span>{proposal.recommendation}</span>
            </div>
          )}
        </div>

        <div className="modal-foot proposal-modal-foot">
          <button className="outline-button compact" onClick={onClose}>Tutup</button>
          <button className="outline-button compact danger-outline-button" disabled={approve.isPending} onClick={() => approve.mutate('rejected')}>
            {approve.isPending ? '…' : <><ThumbsDown size={14} /> Tolak</>}
          </button>
          <button className="primary-button compact" disabled={approve.isPending} onClick={() => approve.mutate('approved')}>
            {approve.isPending ? '…' : <><ThumbsUp size={14} /> Setujui & Aktifkan Kegiatan</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ proposal, onClose, onEdit, onApprove }) {
  const date = proposal.created_at
    ? new Date(proposal.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })
    : '—';
  const canEdit = proposal.is_mine && (proposal.status === 'draft' || proposal.status === 'rejected');
  const canApproveThis = proposal.can_approve && proposal.status === 'submitted';

  return (
    <div className="modal-backdrop proposal-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box proposal-dialog-box proposal-detail-box" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <p className="mono-kicker text-muted" style={{ marginBottom: 2 }}>Detail usulan</p>
            <h2>{proposal.title}</h2>
          </div>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        <div className="modal-body proposal-dialog-body">
          <div className="class-meta-grid">
            <div>
              <span>Status</span>
              <strong><span className={`status-badge ${statusBadgeClass(proposal.status)}`}>{STATUS[proposal.status]?.label || proposal.status}</span></strong>
            </div>
            <div><span>Pengusul</span><strong>{proposal.proposer_name || '—'}</strong></div>
            <div><span>OPD</span><strong>{proposal.opd_name || '—'}</strong></div>
            <div><span>Tanggal</span><strong>{date}</strong></div>
            <div><span>Kegiatan Terkait</span><strong>{proposal.events_count ?? 0}</strong></div>
          </div>

          {proposal.event && (
            <div className="proposal-detail-section proposal-detail-event">
              <span>Rancangan Kegiatan</span>
              {proposal.event.banner_url && (
                <div className="proposal-preview-banner">
                  <img src={proposal.event.banner_url} alt="Gambar kegiatan" />
                </div>
              )}
              <strong>{proposal.event.title}</strong>
              <p>
                {formatDateRange(proposal.event.start_date, proposal.event.end_date)}
                {proposal.event.location ? ` · ${proposal.event.location}` : ''}
                {proposal.event.quota != null ? ` · ${proposal.event.quota === 0 ? 'Kuota bebas' : `${proposal.event.quota} peserta`}` : ''}
                {proposal.event.status ? ` · Status kegiatan: ${proposal.event.status}` : ''}
              </p>
              {proposal.event.facilitator_names?.length > 0 && (
                <p>Fasilitator: {proposal.event.facilitator_names.join(', ')}</p>
              )}
              <p>
                Target peserta: {proposal.event.target_all_opds
                  ? 'Semua OPD'
                  : [
                      proposal.event.target_opd_names?.length ? `${proposal.event.target_opd_names.length} OPD` : null,
                      proposal.event.target_user_names?.length ? `${proposal.event.target_user_names.length} ASN` : null,
                    ].filter(Boolean).join(' + ') || 'Belum ditentukan'}
              </p>
              {proposal.event.supporting_documents?.length > 0 && (
                <div className="proposal-supporting-detail">
                  <strong>Dokumen pendukung</strong>
                  {proposal.event.supporting_documents.map((document) => (
                    <a key={document.id} href={document.url} target="_blank" rel="noreferrer">
                      {document.name}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {proposal.description && (
            <div className="proposal-detail-section">
              <span>Deskripsi Kebutuhan</span>
              <p>{proposal.description}</p>
            </div>
          )}

          {proposal.recommendation && (
            <div className="proposal-detail-section">
              <span>Rekomendasi</span>
              <p>{proposal.recommendation}</p>
            </div>
          )}
        </div>

        <div className="modal-foot proposal-modal-foot">
          <button className="outline-button compact" onClick={onClose}>Tutup</button>
          {canEdit && (
            <button className="outline-button compact" onClick={() => onEdit(proposal)}>
              <Pencil size={14} /> Ubah
            </button>
          )}
          {canApproveThis && (
            <button className="primary-button compact" onClick={() => onApprove(proposal)}>
              <CheckCircle2 size={14} /> Tinjau
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteModal({ proposal, onClose, onSuccess }) {
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: () => api.delete(`/training-proposals/${proposal.uuid}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proposals'] }); qc.invalidateQueries({ queryKey: ['proposals-stats'] }); onSuccess(); },
  });

  return (
    <div className="modal-backdrop proposal-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box proposal-dialog-box" role="dialog" aria-modal="true">

        <div className="modal-head">
          <div>
            <p className="mono-kicker text-muted" style={{ marginBottom: 2 }}>Aksi usulan</p>
            <h2>Hapus Usulan?</h2>
          </div>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        <div className="modal-body proposal-dialog-body">
          <div className="proposal-delete-alert">
            Usulan <strong>"{proposal.title}"</strong> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
          </div>
        </div>

        <div className="modal-foot proposal-modal-foot">
          <button className="outline-button compact" onClick={onClose}>Batal</button>
          <button className="primary-button compact danger-solid-button" disabled={del.isPending} onClick={() => del.mutate()}>
            {del.isPending ? 'Menghapus…' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOpdProposals() {
  const [activeTab, setActiveTab]     = useState('all');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]               = useState(1);
  const [modal, setModal]             = useState(null); // null | { type: 'form'|'detail'|'approve'|'delete', proposal? }
  const searchTimer = useRef(null);

  const handleSearch = (v) => {
    setSearchInput(v);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 350);
  };

  const filters = {};
  if (activeTab === 'mine') filters.mine = 1;
  else if (['draft','submitted','approved','rejected'].includes(activeTab)) filters.status = activeTab;
  if (search) filters.search = search;

  const { data: stats } = useQuery({
    queryKey: ['proposals-stats'],
    queryFn: () => api.get('/training-proposals/stats').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const { data, isFetching } = useQuery({
    queryKey: ['proposals', activeTab, search, page],
    queryFn: () => api.get('/training-proposals', { params: { per_page: 12, page, ...filters } }).then((r) => r.data.data),
    keepPreviousData: true,
    staleTime: 10_000,
  });

  const { data: facilitatorsData = [], isLoading: facilitatorsLoading } = useQuery({
    queryKey: ['proposal-facilitators'],
    queryFn: async () => {
      const rows = (await api.get('/facilitators', { params: { all: 1 } })).data.data || [];
      return rows.map((f) => ({
        ...f,
        id: Number(f.id),
        display_name: f.user_name || f.user?.name || 'Fasilitator',
      }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: audienceOptions = { opds: [], asns: [] }, isLoading: audienceLoading } = useQuery({
    queryKey: ['proposal-audience-options'],
    queryFn: async () => (await api.get('/training-proposals/audience-options')).data.data,
    staleTime: 5 * 60 * 1000,
  });

  const proposals = data?.data ?? [];
  const meta      = { current_page: data?.current_page ?? 1, last_page: data?.last_page ?? 1, total: data?.total ?? 0 };
  const submittedForReview = proposals.filter((p) => p.can_approve && p.status === 'submitted');

  const closeModal  = () => setModal(null);
  const afterAction = () => closeModal();
  const openEdit = (proposal) => setModal({ type: 'form', proposal });
  const openApprove = (proposal) => setModal({ type: 'approve', proposal });
  const KPI = [
    ['Total Usulan', stats?.total ?? 0, 'Semua kebutuhan pelatihan'],
    ['Diajukan', stats?.submitted ?? 0, 'Menunggu tinjauan'],
    ['Disetujui', stats?.approved ?? 0, 'Siap dibuat kegiatan'],
    ['Draf', stats?.draft ?? 0, 'Belum diajukan'],
  ];

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Pelatihan</p>
        <h1>Usulan Kebutuhan Pelatihan</h1>
        <p className="proposal-page-subtitle">
          Ajukan kebutuhan kompetensi OPD, lalu ubah usulan yang disetujui menjadi kegiatan pelatihan.
        </p>
      </div>

      <div className="admin-mini-grid">
        {KPI.map(([label, value, note]) => (
          <KpiCard key={label} label={label} value={value} note={note} loading={!stats} />
        ))}
      </div>

      <section className="enterprise-card">
        <div className="section-title">
          <div>
            <p className="mono-kicker text-muted">DAFTAR USULAN</p>
            <h2>Daftar Usulan</h2>
          </div>
          <button className="primary-button compact" onClick={() => setModal({ type: 'form', proposal: null })}>
            <Plus size={14} /> Buat Usulan
          </button>
        </div>

        <div className="proposal-toolbar">
          <div className="ev-tab-bar proposal-tabs">
            {TABS.map((t) => (
              <button key={t.key} type="button" className={`ev-tab${activeTab === t.key ? ' active' : ''}`}
                onClick={() => { setActiveTab(t.key); setPage(1); }}>
                {t.label}
              </button>
            ))}
          </div>
          <div className="proposal-search-wrap">
            <Search size={14} />
            <input value={searchInput} onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cari judul usulan..." />
          </div>
        </div>

        {isFetching && proposals.length === 0 ? (
          <div className="resource-note">Memuat data...</div>
        ) : proposals.length === 0 ? (
          <div className="resource-note proposal-empty">
            <FileText size={16} />
            <span>Belum ada usulan ditemukan.</span>
            <button className="primary-button compact" onClick={() => setModal({ type: 'form', proposal: null })}>
              <Plus size={14} /> Buat Usulan Pertama
            </button>
          </div>
        ) : (
          <div className="work-list">
            {submittedForReview.length > 0 && (
              <div className="event-pending-notice">
                <Bell size={15} />
                <span>
                  <strong>{submittedForReview.length} usulan</strong> menunggu tinjauan Anda
                </span>
                <em className="event-pending-count">{submittedForReview.length}</em>
              </div>
            )}
            {proposals.map((p) => (
              <ProposalRow key={p.uuid} p={p}
                onDetail={(p) => setModal({ type: 'detail', proposal: p })}
                onEdit={openEdit}
                onDelete={(p) => setModal({ type: 'delete', proposal: p })}
                onApprove={openApprove}
              />
            ))}
          </div>
        )}

        {meta.last_page > 1 && (
          <div className="kms-pagination">
            <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Sebelumnya
            </button>
            <span className="kms-page-info">
              Halaman {meta.current_page} / {meta.last_page} ({meta.total} total)
            </span>
            <button className="outline-button compact" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
              Berikutnya
            </button>
          </div>
        )}
      </section>

      {modal?.type === 'form' && (
        <ProposalModal proposal={modal.proposal}
          onClose={closeModal}
          onSuccess={afterAction}
          facilitators={facilitatorsData}
          facilitatorsLoading={facilitatorsLoading}
          audienceOptions={audienceOptions}
          audienceLoading={audienceLoading}
        />
      )}
      {modal?.type === 'detail' && (
        <DetailModal proposal={modal.proposal}
          onClose={closeModal}
          onEdit={openEdit}
          onApprove={openApprove}
        />
      )}
      {modal?.type === 'approve' && (
        <ApproveModal proposal={modal.proposal} onClose={closeModal} onSuccess={afterAction} />
      )}
      {modal?.type === 'delete' && (
        <DeleteModal proposal={modal.proposal} onClose={closeModal} onSuccess={afterAction} />
      )}
    </div>
  );
}
