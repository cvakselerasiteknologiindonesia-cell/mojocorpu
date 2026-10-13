import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  ChevronRight,
  Download,
  Plus,
  Search,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';
import { loadXlsx } from '../../utils/xlsx.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const PARTICIPANT_STATUS_LABELS  = { enrolled: 'Terdaftar', completed: 'Selesai', dropped: 'Keluar' };
const PARTICIPANT_STATUS_ACCENTS = { enrolled: 'active', completed: 'scheduled', dropped: '' };
const PARTICIPANT_PAGE_SIZE = 20;

const PICKER_TABS = [
  { id: 'search', label: 'Cari Pengguna', icon: Search   },
  { id: 'opd',    label: 'Dari OPD',      icon: Building2 },
  { id: 'excel',  label: 'Import Excel',  icon: Upload   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  const s = d.length > 10 ? d.substring(0, 10) : d;
  return new Date(`${s}T00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Picker: Search Tab ────────────────────────────────────────────────────────

function PickerUserRow({ user, enrolled, onAdd }) {
  return (
    <div className={`picker-row${enrolled ? ' already' : ''}`}>
      <div className="picker-avatar">{(user.name || '?')[0].toUpperCase()}</div>
      <div className="picker-row-info">
        <strong>{user.name}</strong>
        <span>{user.nip || user.email}</span>
        {user.opd_name && <em className="picker-opd">{user.opd_name}</em>}
        {user.organization_unit_name && <em className="picker-opd">{user.organization_unit_name}</em>}
      </div>
      {enrolled
        ? <span className="picker-enrolled"><UserCheck size={13} /> Terdaftar</span>
        : <button className="primary-button compact" onClick={() => onAdd(user)}>+ Tambah</button>}
    </div>
  );
}

function SearchTab({ uuid, enrolledIds, onAdd }) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['participant-search', uuid, search, page],
    queryFn: async () => (await api.get(`/training-events/${uuid}/participants/search`, {
      params: { search, page, per_page: 10 },
    })).data.data,
    placeholderData: (prev) => prev,
  });

  const users    = data?.data ?? [];
  const lastPage = data?.last_page ?? 1;

  return (
    <>
      <div className="picker-search">
        <Search size={14} />
        <input
          autoFocus
          placeholder="Cari nama, NIP, atau email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>
      <div className="picker-list">
        {isLoading && <div className="resource-note">Mencari…</div>}
        {!isLoading && users.length === 0 && <div className="resource-note">Tidak ada hasil.</div>}
        {users.map((u) => (
          <PickerUserRow key={u.id} user={u} enrolled={enrolledIds.has(u.id)} onAdd={onAdd} />
        ))}
      </div>
      {lastPage > 1 && (
        <div className="picker-pagination">
          <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
          <span>{page} / {lastPage}</span>
          <button className="outline-button compact" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>Next ›</button>
        </div>
      )}
    </>
  );
}

// ── Picker: Exclude ASN Picker (for OPD tab) ──────────────────────────────────

function ExcludeAsnPicker({ uuid, value, onChange }) {
  const [search, setSearch] = useState('');
  const [showDrop, setShowDrop] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!showDrop) return undefined;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowDrop(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDrop]);

  const { data: results = [] } = useQuery({
    queryKey: ['exclude-asn-search', uuid, search],
    queryFn: async () => (await api.get(`/training-events/${uuid}/participants/search`, {
      params: { search, per_page: 8 },
    })).data.data.data,
    enabled: search.length >= 2,
    placeholderData: (prev) => prev,
  });

  const filtered = results.filter((u) => !value.some((v) => v.id === u.id));

  const add = (user) => {
    onChange([...value, { id: user.id, name: user.name, nip: user.nip }]);
    setSearch('');
    setShowDrop(false);
  };

  return (
    <div className="opd-exclude-box">
      <div className="opd-exclude-label">
        <span>Kecualikan ASN</span>
        {value.length > 0 && (
          <button type="button" className="text-link-sm" onClick={() => onChange([])}>Hapus semua</button>
        )}
      </div>
      {value.length > 0 && (
        <div className="facilitator-chips">
          {value.map((u) => (
            <span key={u.id} className="facilitator-chip">
              {u.name || u.nip}
              <button type="button" onClick={() => onChange(value.filter((v) => v.id !== u.id))}><X size={10} /></button>
            </span>
          ))}
        </div>
      )}
      <div ref={ref} style={{ position: 'relative' }}>
        <div className="picker-search" style={{ paddingTop: 5, paddingBottom: 5 }}>
          <Search size={13} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setShowDrop(e.target.value.length >= 2); }}
            onFocus={() => search.length >= 2 && setShowDrop(true)}
            placeholder="Cari NIP atau nama untuk dikecualikan…"
          />
        </div>
        {showDrop && filtered.length > 0 && (
          <div className="facilitator-dropdown" style={{ zIndex: 80 }}>
            <div className="facilitator-option-list">
              {filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="facilitator-option"
                  onMouseDown={(e) => { e.preventDefault(); add(u); }}
                >
                  <span className="facilitator-option-name">{u.name}</span>
                  <span className="facilitator-option-inst">{u.nip || u.email}</span>
                  {u.opd_name && <em className="picker-opd" style={{ marginLeft: 'auto' }}>{u.opd_name}</em>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Picker: OPD Tab ───────────────────────────────────────────────────────────

function OpdTab({ uuid, onBulkDone }) {
  const [selectedOpds, setSelectedOpds] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [excludeUsers, setExcludeUsers] = useState([]);

  const { data: opds = [], isLoading: opdsLoading } = useQuery({
    queryKey: ['participant-opds', uuid],
    queryFn: async () => (await api.get(`/training-events/${uuid}/participants/opds`)).data.data,
  });

  useEffect(() => {
    if (!initialized && opds.length > 0) {
      setSelectedOpds(opds.map((o) => o.opd_name));
      setInitialized(true);
    }
  }, [opds, initialized]);

  const allSelected  = opds.length > 0 && selectedOpds.length === opds.length;
  const noneSelected = selectedOpds.length === 0;

  const toggleOpd = (name) => setSelectedOpds((prev) =>
    prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
  );

  const excludeNips = excludeUsers.map((u) => u.nip).filter(Boolean);
  const excludeOpds = opds.map((o) => o.opd_name).filter((n) => !selectedOpds.includes(n));
  const totalSelected = opds.filter((o) => selectedOpds.includes(o.opd_name)).reduce((s, o) => s + o.user_count, 0);

  const bulkMut = useMutation({
    mutationFn: () => api.post(`/training-events/${uuid}/participants/bulk-all`, {
      exclude_opds: excludeOpds,
      exclude_nips: excludeNips,
    }),
    onSuccess: (res) => { onBulkDone(); toast.success(res.data?.message || 'Peserta berhasil didaftarkan.'); },
    onError: () => toast.error('Gagal mendaftarkan peserta.'),
  });

  return (
    <>
      <div className="opd-select-header">
        <label className="opd-select-all-label">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = !allSelected && !noneSelected; }}
            onChange={() => allSelected ? setSelectedOpds([]) : setSelectedOpds(opds.map((o) => o.opd_name))}
            disabled={opdsLoading}
          />
          Pilih Semua
        </label>
        <button type="button" className="opd-clear-btn" title="Hapus Semua" onClick={() => setSelectedOpds([])} disabled={noneSelected || opdsLoading}>
          <X size={14} />
        </button>
      </div>

      <div className="opd-checkbox-list">
        {opdsLoading && <div className="resource-note" style={{ padding: '10px 12px' }}>Memuat OPD…</div>}
        {!opdsLoading && opds.length === 0 && <div className="resource-note" style={{ padding: '10px 12px' }}>Tidak ada data OPD.</div>}
        {opds.map((o) => (
          <label key={o.opd_name} className="opd-checkbox-item">
            <span className="opd-checkbox-name">{o.opd_name}</span>
            <span className="opd-checkbox-count">{o.user_count} pengguna</span>
            <input type="checkbox" checked={selectedOpds.includes(o.opd_name)} onChange={() => toggleOpd(o.opd_name)} />
          </label>
        ))}
      </div>

      <ExcludeAsnPicker uuid={uuid} value={excludeUsers} onChange={setExcludeUsers} />

      <button
        className="primary-button"
        disabled={bulkMut.isPending || noneSelected || totalSelected === 0}
        onClick={() => bulkMut.mutate()}
      >
        {bulkMut.isPending
          ? 'Mendaftarkan…'
          : allSelected
            ? `Daftarkan Semua OPD (${totalSelected})`
            : `Daftarkan ${selectedOpds.length} OPD (${totalSelected})`}
      </button>
    </>
  );
}

// ── Picker: Excel Tab ─────────────────────────────────────────────────────────

function ExcelTab({ uuid, onImportDone }) {
  const fileRef = useRef(null);
  const [rows, setRows] = useState(null);
  const [parseError, setParseError] = useState('');
  const [result, setResult] = useState(null);

  const downloadTemplate = async () => {
    const XLSX = await loadXlsx();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ['NIP', 'Nama (opsional)'],
      ['197801012006041001', 'Contoh ASN'],
    ]);
    XLSX.utils.book_append_sheet(wb, ws, 'Peserta');
    XLSX.writeFile(wb, 'template-peserta.xlsx');
  };

  const handleFile = (f) => {
    if (!f) return;
    setParseError(''); setRows(null); setResult(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const XLSX = await loadXlsx();
        const wb  = XLSX.read(ev.target.result, { type: 'array' });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        const nips = raw.slice(1).map((row) => String(row[0] || '').trim()).filter(Boolean);
        if (nips.length === 0) { setParseError('File tidak berisi NIP. Pastikan kolom A berisi NIP peserta.'); return; }
        setRows(nips);
      } catch { setParseError('Gagal membaca file. Pastikan format .xlsx atau .xls.'); }
    };
    reader.readAsArrayBuffer(f);
  };

  const importMut = useMutation({
    mutationFn: () => api.post(`/training-events/${uuid}/participants/import`, { nips: rows }),
    onSuccess: (res) => { setResult(res.data); onImportDone(); toast.success(res.data?.message || 'Import berhasil.'); },
    onError: () => toast.error('Gagal mengimport peserta.'),
  });

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div className="excel-import-header">
        <p style={{ fontSize: 13, color: 'var(--fg-3)', margin: 0 }}>
          Upload file Excel dengan kolom <strong>NIP</strong> di kolom A.
        </p>
        <button className="outline-button compact" onClick={downloadTemplate}>
          <Download size={13} /> Unduh Template
        </button>
      </div>

      <div
        className="material-upload-zone"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
      >
        <Upload size={20} />
        <span>{rows ? `${rows.length} NIP ditemukan — klik untuk ganti` : 'Klik atau seret file Excel ke sini'}</span>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {parseError && <div className="form-error-visible">{parseError}</div>}

      {rows && !result && (
        <>
          <div className="excel-preview-list">
            <p className="mono-kicker text-muted" style={{ marginBottom: 4 }}>Preview NIP ({rows.length})</p>
            {rows.slice(0, 8).map((nip, i) => <div key={i} className="excel-preview-row"><span>{nip}</span></div>)}
            {rows.length > 8 && <div className="excel-preview-row text-muted">+{rows.length - 8} lainnya…</div>}
          </div>
          {importMut.error && <div className="form-error-visible">{importMut.error.response?.data?.message || 'Gagal mengimport.'}</div>}
          <button className="primary-button" disabled={importMut.isPending} onClick={() => importMut.mutate()}>
            {importMut.isPending ? 'Mengimport…' : `Import ${rows.length} Peserta`}
          </button>
        </>
      )}

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 13, color: 'var(--emerald)' }}>✓ {result.message}</div>
          {result.data?.not_found_nips?.length > 0 && (
            <div>
              <p style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 4 }}>NIP tidak ditemukan ({result.data.not_found_nips.length}):</p>
              <div className="excel-preview-list">
                {result.data.not_found_nips.slice(0, 5).map((nip) => <div key={nip} className="excel-preview-row not-found"><span>{nip}</span></div>)}
                {result.data.not_found_nips.length > 5 && <div className="excel-preview-row text-muted">+{result.data.not_found_nips.length - 5} lainnya</div>}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add Participant Modal ──────────────────────────────────────────────────────

function AddParticipantModal({ uuid, enrolledIds, onAdd, onBulkDone, onClose }) {
  const [tab, setTab] = useState('search');

  return (
    <div className="modal-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 520 }}>
        <div className="modal-head">
          <h2>Tambah Peserta</h2>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>
        <div className="picker-tabs">
          {PICKER_TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`picker-tab${tab === id ? ' active' : ''}`} onClick={() => setTab(id)}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: 12 }}>
          {tab === 'search' && <SearchTab uuid={uuid} enrolledIds={enrolledIds} onAdd={onAdd} />}
          {tab === 'opd'    && <OpdTab    uuid={uuid} onBulkDone={onBulkDone} />}
          {tab === 'excel'  && <ExcelTab  uuid={uuid} onImportDone={onBulkDone} />}
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

function ParticipantListSkeleton() {
  return (
    <div className="participant-list">
      {Array.from({ length: 8 }).map((_, i) => (
        <div className="participant-row" key={i} style={{ opacity: Math.max(0.18, 1 - i * 0.1) }}>
          <Skel w={16} h={16} style={{ borderRadius: 3, flexShrink: 0 }} />
          <div className="participant-avatar" style={{ background: 'var(--border)' }} />
          <div className="participant-info" style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Skel w={120} h={13} />
            <Skel w={88} h={10} />
          </div>
          <Skel w={64} h={20} style={{ borderRadius: 4 }} />
          <Skel w={28} h={28} style={{ borderRadius: 6 }} />
        </div>
      ))}
    </div>
  );
}

// ── Participants Panel ────────────────────────────────────────────────────────

function ParticipantsPanel({ uuid, quota }) {
  const queryClient = useQueryClient();
  const qk = ['event-participants', uuid];
  const [pickerOpen, setPickerOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');

  const { data = [], isLoading } = useQuery({
    queryKey: qk,
    queryFn: async () => (await api.get(`/training-events/${uuid}/participants`)).data.data,
    enabled: !!uuid,
  });

  const invalidate = () => { queryClient.invalidateQueries({ queryKey: qk }); setSelected(new Set()); };

  const addMut = useMutation({
    mutationFn: (userId) => api.post(`/training-events/${uuid}/participants`, { user_id: userId }),
    onSuccess: () => { invalidate(); toast.success('Peserta ditambahkan.'); },
    onError: () => toast.error('Gagal menambahkan peserta.'),
  });
  const removeMut = useMutation({
    mutationFn: (userId) => api.delete(`/training-events/${uuid}/participants/${userId}`),
    onSuccess: () => { invalidate(); toast.success('Peserta dihapus.'); },
    onError: () => toast.error('Gagal menghapus peserta.'),
  });
  const bulkRemoveMut = useMutation({
    mutationFn: (userIds) => api.post(`/training-events/${uuid}/participants/bulk-remove`, { user_ids: userIds }),
    onSuccess: (res) => { invalidate(); toast.success(res.data?.message || 'Peserta dihapus.'); },
    onError: () => toast.error('Gagal menghapus peserta.'),
  });

  const filtered = search.trim()
    ? data.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.user?.name?.toLowerCase().includes(q) ||
          p.user?.nip?.includes(q) ||
          p.user?.email?.toLowerCase().includes(q)
        );
      })
    : data;

  const totalPages = Math.ceil(filtered.length / PARTICIPANT_PAGE_SIZE);
  const pageData   = filtered.slice((page - 1) * PARTICIPANT_PAGE_SIZE, page * PARTICIPANT_PAGE_SIZE);

  const allPageSelected  = pageData.length > 0 && pageData.every((p) => selected.has(p.id));
  const somePageSelected = pageData.some((p) => selected.has(p.id));

  const toggleSelect = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const toggleAllPage = () => setSelected((prev) => {
    const next = new Set(prev);
    if (allPageSelected) pageData.forEach((p) => next.delete(p.id));
    else pageData.forEach((p) => next.add(p.id));
    return next;
  });

  const handleBulkRemove = () => {
    const userIds = data.filter((p) => selected.has(p.id)).map((p) => p.user_id);
    bulkRemoveMut.mutate(userIds);
  };

  const enrolledIds  = new Set(data.map((p) => p.user_id));
  const quotaFull    = quota > 0 && data.length >= quota;

  return (
    <>
      {/* Toolbar */}
      <div className="fp-toolbar">
        <div className="picker-search" style={{ flex: 1, maxWidth: 320 }}>
          <Search size={14} />
          <input
            placeholder="Cari nama, NIP, email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="fp-toolbar-right">
          {quota > 0 && (
            <span className="fp-quota-badge">
              <Users size={13} /> {data.length} / {quota}
              {quotaFull && <em style={{ color: 'var(--crimson)', marginLeft: 4 }}>Penuh</em>}
            </span>
          )}
          {!quota && data.length > 0 && (
            <span className="fp-quota-badge"><Users size={13} /> {data.length} peserta</span>
          )}
          <button className="primary-button compact" onClick={() => setPickerOpen(true)}>
            <Plus size={14} /> Tambah Peserta
          </button>
        </div>
      </div>

      {isLoading && <ParticipantListSkeleton />}

      {!isLoading && data.length === 0 && (
        <div className="material-empty">
          <Users size={32} />
          <p>Belum ada peserta terdaftar.</p>
          <span>Tambahkan peserta via pencarian, OPD, atau import Excel.</span>
        </div>
      )}

      {!isLoading && data.length > 0 && (
        <>
          {/* Bulk action bar */}
          <div className="participant-bulk-bar">
            <label className="opd-select-all-label" style={{ flex: 1 }}>
              <input
                type="checkbox"
                checked={allPageSelected}
                ref={(el) => { if (el) el.indeterminate = !allPageSelected && somePageSelected; }}
                onChange={toggleAllPage}
              />
              {selected.size > 0 ? `${selected.size} dipilih` : `Pilih Semua (${filtered.length})`}
            </label>
            {selected.size > 0 && (
              <button
                className="outline-button compact danger-outline-button"
                disabled={bulkRemoveMut.isPending}
                onClick={handleBulkRemove}
              >
                <Trash2 size={13} /> Hapus ({selected.size})
              </button>
            )}
          </div>

          {/* Participant list */}
          <div className="participant-list">
            {pageData.length === 0 && (
              <div className="resource-note" style={{ padding: '14px' }}>Tidak ada peserta yang cocok dengan pencarian.</div>
            )}
            {pageData.map((p) => (
              <div className="participant-row" key={p.id}>
                <input
                  type="checkbox"
                  className="participant-check"
                  checked={selected.has(p.id)}
                  onChange={() => toggleSelect(p.id)}
                />
                <div className="participant-avatar">{(p.user?.name || '?')[0].toUpperCase()}</div>
                <div className="participant-info">
                  <strong>{p.user?.name ?? '—'}</strong>
                  <span>{p.user?.nip || p.user?.email || '—'}</span>
                  {p.user?.opd_name && <em className="picker-opd">{p.user.opd_name}</em>}
                </div>
                <em className={`status-badge ${PARTICIPANT_STATUS_ACCENTS[p.status] || ''}`}>
                  {PARTICIPANT_STATUS_LABELS[p.status] || p.status}
                </em>
                <button
                  className="icon-action danger-icon"
                  title="Hapus peserta"
                  disabled={removeMut.isPending}
                  onClick={() => removeMut.mutate(p.user_id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="picker-pagination">
              <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>‹ Prev</button>
              <span>{page} / {totalPages} · {filtered.length} peserta</span>
              <button className="outline-button compact" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next ›</button>
            </div>
          )}
        </>
      )}

      {pickerOpen && (
        <AddParticipantModal
          uuid={uuid}
          enrolledIds={enrolledIds}
          onAdd={(u) => addMut.mutate(u.id)}
          onBulkDone={invalidate}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FacilitatorParticipants() {
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
        <h1>Participants</h1>
      </div>

      <div className="fm-layout">
        {/* Event list */}
        <aside className="fm-events-list">
          <div className="fm-events-header">Training Events</div>
          {eventsLoading && <EventListSkeleton />}
          {!eventsLoading && events.length === 0 && <div className="resource-note">Tidak ada event.</div>}
          {events.map((ev) => (
            <button
              key={ev.uuid}
              className={`fm-event-item${selectedUuid === ev.uuid ? ' active' : ''}`}
              onClick={() => selectEvent(ev.uuid)}
            >
              <div className="fm-event-item-body">
                <strong>{ev.title}</strong>
                <span>{formatDate(ev.start_date)}</span>
              </div>
              <ChevronRight size={14} className="fm-event-chevron" />
            </button>
          ))}
        </aside>

        {/* Participants panel */}
        <div className="fm-materials-panel">
          {!selectedUuid && (
            <div className="fm-no-event">
              <Users size={36} />
              <p>Pilih training event untuk mengelola peserta.</p>
            </div>
          )}

          {selectedUuid && (
            <>
              <div className="fm-panel-head">
                <div>
                  <strong className="fm-panel-title">{selectedEvent?.title}</strong>
                  <span className="fm-panel-sub">
                    {formatDate(selectedEvent?.start_date)}
                    {selectedEvent?.end_date && selectedEvent.end_date !== selectedEvent.start_date && ` – ${formatDate(selectedEvent.end_date)}`}
                    {selectedEvent?.location && ` · ${selectedEvent.location}`}
                  </span>
                </div>
                <em className={`status-badge${selectedEvent?.status === 'active' ? ' active' : ''}`}>
                  {selectedEvent?.status ?? '—'}
                </em>
              </div>
              <ParticipantsPanel uuid={selectedUuid} quota={selectedEvent?.quota} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
