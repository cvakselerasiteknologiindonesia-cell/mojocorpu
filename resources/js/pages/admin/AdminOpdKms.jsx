import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle, ExternalLink, FileText, Loader2,
  Pencil, Plus, Tag, Trash2, X, XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';
import KmsSourcePreviewModal from '../../components/KmsSourcePreviewModal.jsx';
import { getRoleNames } from '../../utils/permissions.js';
import { safe } from '../../utils/sanitize.js';
import { AssetModal } from '../facilitator/FacilitatorKmsContribution.jsx';

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* status → CSS class mapping (no hardcoded hex in JS) */
function statusClass(status) {
  if (status === 'approved') return 'kms-st-approved';
  if (status === 'rejected') return 'kms-st-rejected';
  return 'kms-st-pending';
}
const STATUS_LABEL = { pending: 'Menunggu', approved: 'Disetujui', rejected: 'Ditolak' };

const STATUS_TABS = [
  { key: 'pending',  label: 'Menunggu' },
  { key: 'approved', label: 'Disetujui' },
  { key: 'rejected', label: 'Ditolak' },
  { key: '',         label: 'Semua' },
];

/* ── Tab button (shared) ─────────────────────────────────── */
function TabBtn({ active, onClick, children, badge }) {
  return (
    <button className={`ev-tab${active ? ' active' : ''}`} onClick={onClick} type="button">
      {children}
      {badge != null && badge > 0 && <span className="ev-tab-count kms-badge-alert">{badge}</span>}
    </button>
  );
}

/* ── Reject modal ────────────────────────────────────────── */
function RejectModal({ asset, onClose, onSuccess }) {
  const [reason, setReason] = useState('');

  const reviewMut = useMutation({
    mutationFn: () => api.post(`/kms-assets/${asset.uuid}/review`, { status: 'rejected', rejection_reason: reason }),
    onSuccess: () => { toast.success('Aset ditolak.'); onSuccess(); onClose(); },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menolak aset.'),
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <strong>Tolak Aset Pengetahuan</strong>
          <button className="icon-button" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body kms-reject-body">
          <p className="kms-reject-title">Aset: <strong>{asset.title}</strong></p>
          <div className="fm-field">
            <label>Alasan Penolakan</label>
            <textarea autoFocus rows={4} value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan penolakan aset ini…"
              className="kms-reject-textarea" />
          </div>
        </div>
        <div className="modal-foot">
          <button className="outline-button compact" onClick={onClose}>Batal</button>
          <button className="kms-reject-btn" disabled={reviewMut.isPending || !reason.trim()}
            onClick={() => reviewMut.mutate()}>
            {reviewMut.isPending ? <Loader2 size={13} className="spin" /> : <XCircle size={13} />}
            {reviewMut.isPending ? 'Memproses…' : 'Tolak Aset'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete modal ────────────────────────────────────────── */
function DeleteAssetModal({ asset, onClose, onConfirm, isDeleting }) {
  const isApproved = asset?.status === 'approved';

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <strong>Hapus Aset Pengetahuan</strong>
          <button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>
        <div className="modal-body kms-delete-body">
          <div className="kms-delete-alert">
            <Trash2 size={18} />
            <div>
              <p>Anda akan menghapus aset:</p>
              <strong>{asset.title}</strong>
            </div>
          </div>
          <p className="kms-delete-note">
            {isApproved
              ? 'Aset yang sudah aktif tidak akan tampil lagi di daftar KMS. Riwayat tetap tersimpan untuk audit.'
              : 'Aset ini tidak akan tampil lagi di daftar KMS. Riwayat tetap tersimpan untuk audit.'}
          </p>
        </div>
        <div className="modal-foot">
          <button className="outline-button compact" onClick={onClose}>Batal</button>
          <button className="kms-delete-btn" disabled={isDeleting} onClick={() => onConfirm(asset)}>
            {isDeleting ? <Loader2 size={13} className="spin" /> : <Trash2 size={13} />}
            {isDeleting ? 'Menghapus...' : 'Hapus Aset'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Category row ────────────────────────────────────────── */
function CategoryRow({ cat, onDelete, isDeleting }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName]       = useState(cat.name);

  const updateMut = useMutation({
    mutationFn: () => api.put(`/kms-categories/${cat.uuid}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kms-categories-admin'] });
      setEditing(false);
      toast.success('Kategori diperbarui.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal memperbarui kategori.'),
  });

  if (editing) {
    return (
      <div className="kms-cat-row editing">
        <input autoFocus className="kms-cat-input" value={name}
          onChange={(e) => setName(e.target.value)} maxLength={100}
          onKeyDown={(e) => {
            if (e.key === 'Enter') updateMut.mutate();
            if (e.key === 'Escape') { setEditing(false); setName(cat.name); }
          }} />
        <div className="kms-cat-actions">
          <button className="primary-button compact"
            disabled={updateMut.isPending || !name.trim()} onClick={() => updateMut.mutate()}>
            {updateMut.isPending ? <Loader2 size={13} className="spin" /> : null}
            {updateMut.isPending ? 'Menyimpan…' : 'Simpan'}
          </button>
          <button className="outline-button compact" onClick={() => { setEditing(false); setName(cat.name); }}>
            <X size={13} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="kms-cat-row">
      <div className="kms-cat-info">
        <span className="kms-cat-name">{cat.name}</span>
        <span className="kms-cat-sub">{cat.slug} · {cat.assets_count ?? 0} aset</span>
      </div>
      <div className="kms-cat-actions">
        <button className="outline-button compact" onClick={() => setEditing(true)}>
          <Pencil size={12} /> Ubah
        </button>
        <button className="outline-button compact danger-lite"
          disabled={isDeleting || (cat.assets_count ?? 0) > 0}
          title={(cat.assets_count ?? 0) > 0 ? 'Kategori masih digunakan oleh aset' : ''}
          onClick={() => onDelete(cat)}>
          <Trash2 size={12} /> Hapus
        </button>
      </div>
    </div>
  );
}

/* ── Categories tab ──────────────────────────────────────── */
function CategoriesTab() {
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['kms-categories-admin'],
    queryFn: async () => (await api.get('/kms-categories')).data.data,
  });

  const createMut = useMutation({
    mutationFn: () => api.post('/kms-categories', { name: newName.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kms-categories-admin'] });
      queryClient.invalidateQueries({ queryKey: ['kms-categories'] });
      setNewName('');
      toast.success('Kategori berhasil dibuat.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal membuat kategori.'),
  });

  const deleteMut = useMutation({
    mutationFn: (uuid) => api.delete(`/kms-categories/${uuid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kms-categories-admin'] });
      queryClient.invalidateQueries({ queryKey: ['kms-categories'] });
      toast.success('Kategori dihapus.');
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menghapus kategori.'),
  });

  const totalAssets = categories.reduce((s, c) => s + (c.assets_count ?? 0), 0);

  return (
    <div className="kms-tab-body">
      {/* KPI */}
      <div className="kms-kpi-row">
        <div className="enterprise-card kms-kpi-card">
          <p className="mono-kicker text-muted">Kategori</p>
          <p className="kms-kpi-val">{categories.length}</p>
          <p className="kms-kpi-sub">total kategori</p>
        </div>
        <div className="enterprise-card kms-kpi-card">
          <p className="mono-kicker text-muted" style={{ color: 'var(--emerald)' }}>Aset</p>
          <p className="kms-kpi-val" style={{ color: 'var(--emerald)' }}>{totalAssets}</p>
          <p className="kms-kpi-sub">terkategori</p>
        </div>
      </div>

      {/* Add form */}
      <section className="enterprise-card">
        <div className="section-title">
          <div>
            <p className="mono-kicker text-muted">Baru</p>
            <h2>Tambah Kategori</h2>
          </div>
        </div>
        <form className="kms-cat-form"
          onSubmit={(e) => { e.preventDefault(); if (newName.trim()) createMut.mutate(); }}>
          <div className="kms-cat-field">
            <label className="kms-field-label">Nama Kategori</label>
            <input className="kms-field-input" value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Contoh: Manajemen Risiko" maxLength={100} />
          </div>
          <button className="primary-button compact" disabled={createMut.isPending || !newName.trim()}>
            {createMut.isPending ? <Loader2 size={13} className="spin" /> : <Plus size={14} />}
            {createMut.isPending ? 'Menyimpan…' : 'Tambah'}
          </button>
        </form>
      </section>

      {/* List */}
      <section className="enterprise-card">
        <div className="section-title">
          <div>
            <p className="mono-kicker text-muted">Daftar</p>
            <h2>Semua Kategori</h2>
          </div>
          <span className="badge-active">{categories.length}</span>
        </div>

        {isLoading && <div className="resource-note">Memuat kategori…</div>}
        {!isLoading && categories.length === 0 && (
          <div className="resource-note">Belum ada kategori. Tambahkan di atas.</div>
        )}

        <div className="kms-cat-list">
          {categories.map((cat) => (
            <CategoryRow key={cat.uuid} cat={cat}
              onDelete={(c) => deleteMut.mutate(c.uuid)}
              isDeleting={deleteMut.isPending} />
          ))}
        </div>
      </section>
    </div>
  );
}

/* ── Assets tab ──────────────────────────────────────────── */
function AssetsTab({ canCreate, canReview, canDelete, onCreate }) {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState(canReview ? 'pending' : 'approved');
  const [page, setPage]           = useState(1);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewTarget, setPreviewTarget] = useState(null);
  const visibleStatusTabs = canReview
    ? STATUS_TABS
    : STATUS_TABS.filter((tab) => tab.key !== 'pending');

  const { data: stats } = useQuery({
    queryKey: ['kms-assets-stats'],
    queryFn: async () => (await api.get('/kms-assets/stats')).data.data,
    staleTime: 30_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['kms-assets-admin', statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ per_page: 15, page });
      if (statusFilter) params.set('status', statusFilter);
      return (await api.get(`/kms-assets?${params}`)).data.data;
    },
    keepPreviousData: true,
  });

  const assets   = data?.data   ?? [];
  const lastPage = data?.last_page ?? 1;
  const total    = data?.total ?? 0;

  const approveMut = useMutation({
    mutationFn: (uuid) => api.post(`/kms-assets/${uuid}/review`, { status: 'approved' }),
    onSuccess: () => {
      toast.success('Aset disetujui.');
      qc.invalidateQueries({ queryKey: ['kms-assets-admin'] });
      qc.invalidateQueries({ queryKey: ['kms-assets-stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menyetujui aset.'),
  });

  const deleteMut = useMutation({
    mutationFn: (asset) => api.delete(`/kms-assets/${asset.uuid}`),
    onSuccess: () => {
      toast.success('Aset pengetahuan dihapus.');
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ['kms-assets-admin'] });
      qc.invalidateQueries({ queryKey: ['kms-assets-stats'] });
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menghapus aset.'),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['kms-assets-admin'] });
    qc.invalidateQueries({ queryKey: ['kms-assets-stats'] });
  };

  return (
    <div className="kms-tab-body">
      {/* KPI strip */}
      <div className="kms-kpi-row four">
        <div className={`enterprise-card kms-kpi-card${stats?.pending > 0 ? ' kms-kpi-alert' : ''}`}>
          <p className="mono-kicker text-muted" style={{ color: stats?.pending > 0 ? 'var(--gold)' : undefined }}>
            Menunggu
          </p>
          <p className="kms-kpi-val" style={{ color: stats?.pending > 0 ? 'var(--gold)' : undefined }}>
            {stats?.pending ?? '—'}
          </p>
          <p className="kms-kpi-sub">perlu ditinjau</p>
        </div>
        <div className="enterprise-card kms-kpi-card">
          <p className="mono-kicker text-muted" style={{ color: 'var(--emerald)' }}>Disetujui</p>
          <p className="kms-kpi-val" style={{ color: 'var(--emerald)' }}>{stats?.approved ?? '—'}</p>
          <p className="kms-kpi-sub">aset aktif</p>
        </div>
        <div className="enterprise-card kms-kpi-card">
          <p className="mono-kicker text-muted" style={{ color: 'var(--crimson)' }}>Ditolak</p>
          <p className="kms-kpi-val" style={{ color: 'var(--crimson)' }}>{stats?.rejected ?? '—'}</p>
          <p className="kms-kpi-sub">ditolak</p>
        </div>
        <div className="enterprise-card kms-kpi-card">
          <p className="mono-kicker text-muted">Total</p>
          <p className="kms-kpi-val">{stats?.total ?? '—'}</p>
          <p className="kms-kpi-sub">semua aset</p>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="ev-tab-bar kms-status-toolbar" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {visibleStatusTabs.map(({ key, label }) => (
            <TabBtn key={key} active={statusFilter === key}
              onClick={() => { setStatusFilter(key); setPage(1); }}
              badge={key === 'pending' ? stats?.pending : undefined}>
              {label}
            </TabBtn>
          ))}
        </div>
        {canCreate && (
          <button className="primary-button compact" type="button" onClick={onCreate}>
            <Plus size={13} /> Buat Aset Pengetahuan
          </button>
        )}
      </div>

      {/* Asset list */}
      <section className="enterprise-card">
        <div className="section-title">
          <div>
            <p className="mono-kicker text-muted">
              {STATUS_TABS.find((t) => t.key === statusFilter)?.label ?? 'Semua'}
            </p>
            <h2>Aset Pengetahuan</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge-active">{total}</span>
          </div>
        </div>

        {isLoading && <div className="resource-note">Memuat aset…</div>}
        {!isLoading && assets.length === 0 && (
          <div className="resource-note">Tidak ada aset dengan status ini.</div>
        )}

        <div className="kms-asset-list">
          {assets.map((asset) => (
            <div className="kms-asset-row" key={asset.uuid ?? asset.id}>
              {/* left: icon + info */}
              <div className="kms-asset-left">
                <div className={`kms-asset-icon ${statusClass(asset.status)}`}>
                  <FileText size={15} />
                </div>
                <div className="kms-asset-info">
                  <span className="kms-asset-title">{asset.title}</span>
                  <span className="kms-asset-meta">
                    {asset.uploader_name}
                    {asset.uploader_opd && asset.uploader_opd !== '—' ? ` · ${asset.uploader_opd}` : ''}
                    {' · '}{asset.category_names?.join(', ') || 'Tanpa kategori'}
                    {' · '}{formatDate(asset.created_at)}
                  </span>
                  {asset.visibility === 'internal' && (
                    <span className="kms-asset-meta">
                      Cakupan: {asset.internal_scope === 'selected'
                        ? (asset.opd_names?.join(', ') || 'OPD tertentu')
                        : 'Semua OPD'}
                    </span>
                  )}
                  {asset.description && (
                    <div
                      className="kms-asset-desc"
                      dangerouslySetInnerHTML={{ __html: safe(asset.description) }}
                    />
                  )}
                  {asset.status === 'rejected' && asset.rejection_reason && (
                    <span className="kms-asset-rejection">
                      Alasan: {asset.rejection_reason}
                    </span>
                  )}
                </div>
              </div>

              {/* right: status + actions */}
              <div className="kms-asset-right">
                <div className="kms-moderation-actions">
                  <span className={`kms-status-chip ${statusClass(asset.status)}`}>
                    {STATUS_LABEL[asset.status] ?? asset.status}
                  </span>
                  {canReview && (
                    <div className="kms-review-actions">
                      {asset.status !== 'approved' && (
                        <button className="kms-review-btn kms-review-btn--approve"
                          disabled={approveMut.isPending}
                          onClick={() => approveMut.mutate(asset.uuid)}
                          title="Setujui">
                          {approveMut.isPending
                            ? <Loader2 size={12} className="spin" />
                            : <CheckCircle size={12} />}
                          Setujui
                        </button>
                      )}
                      {asset.status !== 'rejected' && (
                        <button className="kms-review-btn kms-review-btn--reject"
                          onClick={() => setRejectTarget(asset)} title="Tolak">
                          <XCircle size={12} /> Tolak
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="kms-source-actions">
                  {(asset.sources?.length ? asset.sources : (asset.file_url ? [{ file_url: asset.file_url }] : [])).map((source, index, list) => (
                    <button key={source.id ?? `${source.file_url}-${index}`} type="button"
                      className="outline-button compact kms-source-btn"
                      title={list.length > 1 ? `Buka sumber ${index + 1}` : 'Buka file'}
                      onClick={() => setPreviewTarget({ asset, source, index })}>
                      <ExternalLink size={12} />
                    </button>
                  ))}
                  {canDelete && (
                    <button type="button"
                      className="outline-button compact kms-delete-action"
                      title="Hapus aset"
                      onClick={() => setDeleteTarget(asset)}>
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* pagination */}
        {lastPage > 1 && (
          <div className="kms-pagination">
            <button className="outline-button compact" disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}>← Sebelumnya</button>
            <span className="kms-page-info">Hal. {page} / {lastPage}</span>
            <button className="outline-button compact" disabled={page >= lastPage}
              onClick={() => setPage((p) => p + 1)}>Berikutnya →</button>
          </div>
        )}
      </section>

      {rejectTarget && (
        <RejectModal asset={rejectTarget} onClose={() => setRejectTarget(null)} onSuccess={invalidate} />
      )}
      {deleteTarget && (
        <DeleteAssetModal
          asset={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={(asset) => deleteMut.mutate(asset)}
          isDeleting={deleteMut.isPending}
        />
      )}
      {previewTarget && (
        <KmsSourcePreviewModal
          asset={previewTarget.asset}
          source={previewTarget.source}
          index={previewTarget.index}
          onClose={() => setPreviewTarget(null)}
        />
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────── */
export default function AdminOpdKms({ session }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('assets');
  const [showCreate, setShowCreate] = useState(false);
  const roleNames = getRoleNames(session?.user);
  const canCreate = roleNames.includes('admin-opd');
  const canReview = roleNames.includes('super-admin');
  const canDelete = roleNames.includes('super-admin');

  const { data: categories = [] } = useQuery({
    queryKey: ['kms-categories-admin'],
    queryFn: async () => (await api.get('/kms-categories')).data.data,
    staleTime: 5 * 60 * 1000,
  });

  const { data: opds = [] } = useQuery({
    queryKey: ['kms-opd-options'],
    queryFn: async () => (await api.get('/kms-opds/options')).data.data,
    staleTime: 5 * 60 * 1000,
    enabled: canCreate,
  });

  const afterCreate = () => {
    qc.invalidateQueries({ queryKey: ['kms-assets-admin'] });
    qc.invalidateQueries({ queryKey: ['kms-assets-stats'] });
    setShowCreate(false);
  };

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Manajemen Pengetahuan</p>
        <h1>Aset KMS</h1>
      </div>

      {/* Main tab bar */}
      <div className="ev-tab-bar">
        <TabBtn active={tab === 'assets'}     onClick={() => setTab('assets')}>
          <FileText size={13} /> Aset KMS
        </TabBtn>
        <TabBtn active={tab === 'categories'} onClick={() => setTab('categories')}>
          <Tag size={13} /> Kelola Kategori
        </TabBtn>
      </div>

      {tab === 'assets'     && <AssetsTab canCreate={canCreate} canReview={canReview} canDelete={canDelete} onCreate={() => setShowCreate(true)} />}
      {tab === 'categories' && <CategoriesTab />}

      {showCreate && canCreate && (
        <AssetModal
          asset={null}
          categories={categories}
          opds={opds}
          onClose={() => setShowCreate(false)}
          onSuccess={afterCreate}
        />
      )}
    </div>
  );
}
