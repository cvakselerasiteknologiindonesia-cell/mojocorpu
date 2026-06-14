import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../api.js';

const STATUS = {
  draft:     { label: 'Draft',     color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' },
  submitted: { label: 'Diajukan', color: '#d97706', bg: '#fffbeb', border: '#fcd34d' },
  approved:  { label: 'Disetujui',color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  rejected:  { label: 'Ditolak',  color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
};

const TABS = [
  { key: 'all',       label: 'Semua'     },
  { key: 'mine',      label: 'Milik Saya' },
  { key: 'draft',     label: 'Draft'     },
  { key: 'submitted', label: 'Diajukan'  },
  { key: 'approved',  label: 'Disetujui' },
  { key: 'rejected',  label: 'Ditolak'   },
];

const EMPTY_FORM = { title: '', description: '', recommendation: '' };

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

function ProposalCard({ p, onEdit, onDelete, onApprove }) {
  const accentColor = STATUS[p.status]?.border ?? '#d1d5db';
  const canEdit   = p.is_mine && (p.status === 'draft' || p.status === 'rejected');
  const canDelete = p.is_mine && (p.status === 'draft' || p.status === 'rejected');
  const canApproveThis = p.can_approve && p.status === 'submitted';

  return (
    <div style={{
      background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s',
    }}>
      <div style={{ height: 4, background: accentColor }} />
      <div style={{ padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <StatusBadge status={p.status} />
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            {canEdit && (
              <button onClick={() => onEdit(p)} style={btnStyle('#f3f4f6','#374151')}>Edit</button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(p)} style={btnStyle('#fef2f2','#dc2626')}>Hapus</button>
            )}
            {canApproveThis && (
              <button onClick={() => onApprove(p)} style={btnStyle('#f0fdf4','#16a34a')}>Tinjau</button>
            )}
          </div>
        </div>

        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: '#111827', lineHeight: 1.4 }}>{p.title}</p>
          {p.description && (
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#6b7280', lineHeight: 1.5,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {p.description}
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', fontSize: 12, color: '#9ca3af' }}>
          {p.opd_name && <span>🏛 {p.opd_name}</span>}
          <span>👤 {p.proposer_name}</span>
          <span>📅 {new Date(p.created_at).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' })}</span>
        </div>

        {p.recommendation && (
          <div style={{ fontSize: 12, color: '#374151', background: '#f9fafb', borderRadius: 6,
            padding: '8px 12px', borderLeft: '3px solid #d1d5db' }}>
            <span style={{ fontWeight: 600, color: '#6b7280' }}>Rekomendasi: </span>
            {p.recommendation}
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid #f3f4f6', padding: '10px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          {p.events_count ?? 0} event terkait
        </span>
        {p.status === 'submitted' && p.is_mine && (
          <span style={{ fontSize: 11, color: '#d97706', fontWeight: 500 }}>Menunggu persetujuan…</span>
        )}
      </div>
    </div>
  );
}

function btnStyle(bg, color) {
  return {
    fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 6,
    border: 'none', background: bg, color, cursor: 'pointer',
  };
}

function ProposalModal({ proposal, onClose, onSuccess }) {
  const qc = useQueryClient();
  const isEdit = !!proposal;
  const [form, setForm] = useState(isEdit
    ? { title: proposal.title ?? '', description: proposal.description ?? '', recommendation: proposal.recommendation ?? '' }
    : { ...EMPTY_FORM }
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = useMutation({
    mutationFn: ({ data, submit }) => {
      if (isEdit) return api.patch(`/training-proposals/${proposal.uuid}`, { ...data, status: submit ? 'submitted' : undefined });
      return api.post('/training-proposals', { ...data, status: submit ? 'submitted' : 'draft' });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proposals'] }); qc.invalidateQueries({ queryKey: ['proposals-stats'] }); onSuccess(); },
  });

  const field = (label, key, textarea = false, rows = 3, placeholder = '') => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</label>
      {textarea
        ? <textarea value={form[key]} onChange={(e) => set(key, e.target.value)}
            rows={rows} placeholder={placeholder}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13,
              resize: 'vertical', fontFamily: 'inherit', outline: 'none', lineHeight: 1.5 }} />
        : <input value={form[key]} onChange={(e) => set(key, e.target.value)}
            placeholder={placeholder}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, outline: 'none' }} />
      }
    </div>
  );

  const canSubmit = form.title.trim().length > 0;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}>

        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 17, color: '#111827' }}>
            {isEdit ? 'Edit Proposal' : 'Buat Proposal Baru'}
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>
            {isEdit ? 'Perbarui detail proposal pelatihan.' : 'Isi detail usulan pelatihan Anda.'}
          </p>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {field('Judul Proposal *', 'title', false, 1, 'Contoh: Pelatihan Manajemen Kinerja ASN')}
          {field('Deskripsi', 'description', true, 4, 'Jelaskan latar belakang dan tujuan pelatihan...')}
          {field('Rekomendasi', 'recommendation', true, 3, 'Rekomendasi bentuk atau metode pelatihan...')}
        </div>

        <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', flexShrink: 0,
          display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={btnStyle('#f3f4f6', '#374151')}>Batal</button>
          {!isEdit && (
            <button disabled={!canSubmit || save.isPending}
              onClick={() => save.mutate({ data: form, submit: false })}
              style={btnStyle('#f3f4f6', '#374151')}>
              {save.isPending ? 'Menyimpan…' : 'Simpan Draft'}
            </button>
          )}
          <button disabled={!canSubmit || save.isPending}
            onClick={() => save.mutate({ data: form, submit: !isEdit })}
            style={{ ...btnStyle('#111827', '#fff'), opacity: canSubmit ? 1 : 0.5 }}>
            {save.isPending ? 'Memproses…' : isEdit ? 'Simpan Perubahan' : 'Ajukan Proposal'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApproveModal({ proposal, onClose, onSuccess }) {
  const qc = useQueryClient();

  const approve = useMutation({
    mutationFn: (status) => api.post(`/training-proposals/${proposal.uuid}/approve`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['proposals'] }); qc.invalidateQueries({ queryKey: ['proposals-stats'] }); onSuccess(); },
  });

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 460,
        padding: '28px 28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}>

        <p style={{ margin: '0 0 6px', fontWeight: 700, fontSize: 17, color: '#111827' }}>Tinjau Proposal</p>
        <p style={{ margin: '0 0 6px', fontSize: 13, color: '#6b7280' }}>
          <strong style={{ color: '#111827' }}>{proposal.title}</strong>
        </p>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#9ca3af' }}>
          Oleh {proposal.proposer_name} · {proposal.opd_name}
        </p>

        {proposal.description && (
          <div style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 14px', fontSize: 13,
            color: '#374151', lineHeight: 1.6, marginBottom: 20 }}>
            {proposal.description}
          </div>
        )}

        {proposal.recommendation && (
          <div style={{ borderLeft: '3px solid #d1d5db', paddingLeft: 12, marginBottom: 20, fontSize: 13, color: '#6b7280' }}>
            <strong>Rekomendasi:</strong> {proposal.recommendation}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnStyle('#f3f4f6', '#374151')}>Tutup</button>
          <button disabled={approve.isPending} onClick={() => approve.mutate('rejected')}
            style={btnStyle('#fef2f2', '#dc2626')}>
            {approve.isPending ? '…' : 'Tolak'}
          </button>
          <button disabled={approve.isPending} onClick={() => approve.mutate('approved')}
            style={btnStyle('#111827', '#fff')}>
            {approve.isPending ? '…' : 'Setujui'}
          </button>
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
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420,
        padding: '28px 28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
        onClick={(e) => e.stopPropagation()}>

        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 17, color: '#111827' }}>Hapus Proposal?</p>
        <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
          Proposal <strong style={{ color: '#111827' }}>"{proposal.title}"</strong> akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnStyle('#f3f4f6', '#374151')}>Batal</button>
          <button disabled={del.isPending} onClick={() => del.mutate()}
            style={btnStyle('#dc2626', '#fff')}>
            {del.isPending ? 'Menghapus…' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
};

export default function AdminOpdProposals() {
  const [activeTab, setActiveTab]     = useState('all');
  const [search, setSearch]           = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]               = useState(1);
  const [modal, setModal]             = useState(null); // null | { type: 'form'|'approve'|'delete', proposal? }
  const searchTimer = useRef(null);
  const qc = useQueryClient();

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

  const proposals = data?.data ?? [];
  const meta      = { current_page: data?.current_page ?? 1, last_page: data?.last_page ?? 1, total: data?.total ?? 0 };

  const closeModal  = () => setModal(null);
  const afterAction = () => closeModal();

  const KPI = [
    { label: 'Total',     val: stats?.total     ?? 0, color: '#111827' },
    { label: 'Draft',     val: stats?.draft     ?? 0, color: '#6b7280' },
    { label: 'Diajukan',  val: stats?.submitted ?? 0, color: '#d97706' },
    { label: 'Disetujui', val: stats?.approved  ?? 0, color: '#16a34a' },
    { label: 'Ditolak',   val: stats?.rejected  ?? 0, color: '#dc2626' },
  ];

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: '#f9fafb', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1 }}>Training</p>
          <h1 style={{ margin: '4px 0 6px', fontSize: 26, fontWeight: 800, color: '#111827' }}>Training Proposals</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6b7280' }}>Buat dan pantau usulan pelatihan berdasarkan kebutuhan kompetensi OPD.</p>
        </div>
        <button onClick={() => setModal({ type: 'form', proposal: null })}
          style={{ padding: '10px 18px', borderRadius: 10, border: 'none', background: '#111827',
            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', flexShrink: 0 }}>
          + Buat Proposal
        </button>
      </div>

      {/* KPI Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 24 }}>
        {KPI.map((k) => (
          <div key={k.label} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px',
            border: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <p style={{ margin: 0, fontSize: 26, fontWeight: 800, color: k.color }}>{k.val}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <button key={t.key} onClick={() => { setActiveTab(t.key); setPage(1); }}
              style={{
                padding: '6px 14px', borderRadius: 20, border: '1px solid',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s',
                background: activeTab === t.key ? '#111827' : '#fff',
                color: activeTab === t.key ? '#fff' : '#6b7280',
                borderColor: activeTab === t.key ? '#111827' : '#e5e7eb',
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <input value={searchInput} onChange={(e) => handleSearch(e.target.value)}
          placeholder="Cari judul proposal…"
          style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13,
            outline: 'none', width: 220 }} />
      </div>

      {/* Grid */}
      {isFetching && proposals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#9ca3af', fontSize: 14 }}>Memuat data…</div>
      ) : proposals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <p style={{ fontSize: 40, margin: 0 }}>📋</p>
          <p style={{ margin: '12px 0 0', color: '#9ca3af', fontSize: 14 }}>Belum ada proposal ditemukan.</p>
          <button onClick={() => setModal({ type: 'form', proposal: null })}
            style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, border: 'none',
              background: '#111827', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Buat Proposal Pertama
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 28 }}>
          {proposals.map((p) => (
            <ProposalCard key={p.uuid} p={p}
              onEdit={(p) => setModal({ type: 'form', proposal: p })}
              onDelete={(p) => setModal({ type: 'delete', proposal: p })}
              onApprove={(p) => setModal({ type: 'approve', proposal: p })}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta.last_page > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
              fontSize: 13, cursor: page <= 1 ? 'not-allowed' : 'pointer', color: page <= 1 ? '#d1d5db' : '#374151' }}>
            ← Sebelumnya
          </button>
          <span style={{ fontSize: 13, color: '#6b7280' }}>
            Halaman {meta.current_page} dari {meta.last_page} ({meta.total} total)
          </span>
          <button disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff',
              fontSize: 13, cursor: page >= meta.last_page ? 'not-allowed' : 'pointer', color: page >= meta.last_page ? '#d1d5db' : '#374151' }}>
            Berikutnya →
          </button>
        </div>
      )}

      {/* Modals */}
      {modal?.type === 'form' && (
        <ProposalModal proposal={modal.proposal} onClose={closeModal} onSuccess={afterAction} />
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
