import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Award, CheckCircle2, Coins, Image, Loader2, Package,
  Pencil, Plus, ShoppingBag, Ticket, Trash2, X, XCircle,
} from 'lucide-react';
import api from '../api.js';
import { getRoleNames } from '../utils/permissions.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_META = {
  badge:       { label: 'Lencana',     color: '#f59e0b', bg: '#fffbeb', icon: Award },
  voucher:     { label: 'Voucher',     color: '#10b981', bg: '#ecfdf5', icon: Ticket },
  content:     { label: 'Konten',      color: '#6366f1', bg: '#eef2ff', icon: Package },
  merchandise: { label: 'Merchandise', color: '#ec4899', bg: '#fdf4ff', icon: ShoppingBag },
};

const STATUS_META = {
  pending:   { label: 'Menunggu',  color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  fulfilled: { label: 'Selesai',   color: '#16a34a', bg: '#f0fdf4', border: '#86efac' },
  cancelled: { label: 'Dibatalkan', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
};

function typeMeta(type) { return TYPE_META[type] || TYPE_META.voucher; }

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function StoreItemsSkeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden', opacity: Math.max(0.18, 1 - i * 0.08) }}>
          <Skel w="100%" h={130} />
          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Skel w="72%" h={14} />
            <Skel w="90%" h={11} />
            <Skel w="80%" h={11} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <Skel w={62} h={16} />
              <Skel w={50} h={28} style={{ borderRadius: 6 }} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Item card ──────────────────────────────────────────────────────────────────

function ItemCard({ item, balance, onBuy }) {
  const meta = typeMeta(item.type);
  const Icon = meta.icon;
  const canAfford = balance >= item.price;
  const available = item.is_available;

  return (
    <div style={{
      borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden',
      background: 'var(--surface-raised)',
      display: 'flex', flexDirection: 'column',
      opacity: available ? 1 : 0.55,
      transition: 'box-shadow 0.15s',
    }}>
      {/* image / placeholder */}
      <div style={{
        height: 130, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        {item.image_url
          ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <Icon size={42} color={meta.color} strokeWidth={1.5} />
        }
        <span style={{
          position: 'absolute', top: 8, left: 8, fontSize: 10, fontWeight: 700, padding: '2px 8px',
          borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.color}33`,
        }}>{meta.label}</span>
        {!available && (
          <span style={{
            position: 'absolute', top: 8, right: 8, fontSize: 10, fontWeight: 700, padding: '2px 8px',
            borderRadius: 20, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5',
          }}>Habis</span>
        )}
        {item.stock !== null && available && (
          <span style={{
            position: 'absolute', bottom: 8, right: 8, fontSize: 10, color: 'var(--fg-3)',
            background: 'rgba(0,0,0,0.45)', color: '#fff', borderRadius: 10, padding: '2px 7px',
          }}>Stok: {item.stock}</span>
        )}
      </div>

      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <strong style={{ fontSize: 14, color: 'var(--fg)', lineHeight: 1.3 }}>{item.name}</strong>
        {item.description && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--fg-3)', lineHeight: 1.5, flex: 1 }}>
            {item.description}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 800, fontSize: 16, color: '#2563eb' }}>
            <Coins size={15} color="#2563eb" />
            {item.price.toLocaleString()}
          </div>
          <button
            className={canAfford && available ? 'primary-button compact' : 'outline-button compact'}
            disabled={!available || !canAfford}
            onClick={() => onBuy(item)}
            style={{ fontSize: 12 }}
          >
            {!canAfford && available ? 'Token kurang' : 'Beli'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Purchase confirm modal ─────────────────────────────────────────────────────

function BuyModal({ item, balance, onClose, onSuccess }) {
  const meta = typeMeta(item.type);
  const Icon = meta.icon;

  const mut = useMutation({
    mutationFn: () => api.post(`/store/${item.uuid}/purchase`),
    onSuccess: (res) => {
      toast.success('Pembelian berhasil!');
      onSuccess(res.data.data);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal membeli item.'),
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 380 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <strong>Konfirmasi Pembelian</strong>
          <button type="button" className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ textAlign: 'center', padding: '24px 20px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
            <Icon size={30} color={meta.color} strokeWidth={1.5} />
          </div>
          <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>{item.name}</h3>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: 'var(--fg-3)' }}>{item.description}</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: '#eff6ff', borderRadius: 8, marginBottom: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--fg-3)' }}>Harga</span>
            <strong style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Coins size={13} /> {item.price.toLocaleString()} token
            </strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, fontSize: 13 }}>
            <span style={{ color: 'var(--fg-3)' }}>Saldo setelah beli</span>
            <strong style={{ color: balance - item.price >= 0 ? 'var(--fg)' : '#dc2626' }}>
              {(balance - item.price).toLocaleString()} token
            </strong>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="outline-button compact" onClick={onClose}>Batal</button>
          <button type="button" className="primary-button compact" onClick={() => mut.mutate()} disabled={mut.isPending}>
            {mut.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <ShoppingBag size={13} />}
            {mut.isPending ? 'Memproses…' : 'Beli Sekarang'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── My purchases tab ───────────────────────────────────────────────────────────

function MyPurchases() {
  const { data, isLoading } = useQuery({
    queryKey: ['store-my-purchases'],
    queryFn: () => api.get('/store/my-purchases').then((r) => r.data.data.data ?? []),
  });

  return (
    <div className="work-list">
      {isLoading && <div className="resource-note">Memuat…</div>}
      {!isLoading && (data ?? []).length === 0 && <div className="resource-note">Belum ada pembelian.</div>}
      {(data ?? []).map((p) => {
        const sm = STATUS_META[p.status] || STATUS_META.pending;
        const meta = typeMeta(p.item?.type);
        return (
          <div key={p.id} className="work-row" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 80px 90px', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {(() => { const Icon = meta.icon; return <Icon size={18} color={meta.color} strokeWidth={1.5} />; })()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.item?.name ?? '—'}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{formatDate(p.created_at)}{p.note ? ` · ${p.note}` : ''}</div>
            </div>
            <div style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444', fontSize: 13 }}>-{p.tokens_spent.toLocaleString()} T</div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}` }}>{sm.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Admin: manage items ────────────────────────────────────────────────────────

const EMPTY_ITEM = { name: '', description: '', type: 'voucher', price: '', stock: '', is_active: true, sort_order: 0 };

function AdminItems() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(null); // null | 'new' | item object
  const [form, setForm] = useState(EMPTY_ITEM);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['store-admin-items'],
    queryFn: () => api.get('/store/admin/items').then((r) => r.data.data),
  });

  const saveMut = useMutation({
    mutationFn: (payload) => editing === 'new'
      ? api.post('/store/admin/items', payload)
      : api.put(`/store/admin/items/${editing.uuid}`, payload),
    onSuccess: () => {
      toast.success(editing === 'new' ? 'Item dibuat.' : 'Item diperbarui.');
      qc.invalidateQueries({ queryKey: ['store-admin-items'] });
      qc.invalidateQueries({ queryKey: ['store'] });
      setEditing(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal menyimpan.'),
  });

  const delMut = useMutation({
    mutationFn: (uuid) => api.delete(`/store/admin/items/${uuid}`),
    onSuccess: () => { toast.success('Item dihapus.'); qc.invalidateQueries({ queryKey: ['store-admin-items'] }); qc.invalidateQueries({ queryKey: ['store'] }); },
    onError: () => toast.error('Gagal menghapus.'),
  });

  const toggleMut = useMutation({
    mutationFn: ({ uuid, is_active }) => api.put(`/store/admin/items/${uuid}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['store-admin-items'] }),
  });

  function openNew() { setForm(EMPTY_ITEM); setEditing('new'); }
  function openEdit(item) { setForm({ ...item, price: item.price.toString(), stock: item.stock?.toString() ?? '', sort_order: item.sort_order ?? 0 }); setEditing(item); }

  function handleSave() {
    saveMut.mutate({
      name: form.name, description: form.description || null,
      type: form.type, price: parseInt(form.price, 10),
      stock: form.stock !== '' ? parseInt(form.stock, 10) : null,
      is_active: form.is_active, sort_order: parseInt(form.sort_order, 10) || 0,
    });
  }

  return (
    <>
      <div className="section-title" style={{ marginBottom: 12 }}>
        <div><p className="mono-kicker text-muted">ADMIN</p><h2>Kelola Item</h2></div>
        <button className="primary-button compact" onClick={openNew}><Plus size={13} /> Item Baru</button>
      </div>

      {isLoading && <div className="resource-note">Memuat…</div>}
      <div className="work-list">
        {items.map((item) => {
          const meta = typeMeta(item.type);
          const Icon = meta.icon;
          return (
            <div key={item.id} className="work-row" style={{ display: 'grid', gridTemplateColumns: '36px 1fr 60px 70px 80px', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={meta.color} strokeWidth={1.5} />
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{meta.label} · Terjual: {item.sold_count ?? 0}{item.stock !== null ? ` · Stok: ${item.stock}` : ' · ∞'}</div>
              </div>
              <div style={{ fontWeight: 700, color: '#2563eb', fontSize: 13, textAlign: 'right' }}>{item.price.toLocaleString()} T</div>
              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => toggleMut.mutate({ uuid: item.uuid, is_active: !item.is_active })}
                  style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700,
                    background: item.is_active ? '#dcfce7' : '#fee2e2',
                    color: item.is_active ? '#16a34a' : '#dc2626',
                  }}
                >{item.is_active ? 'Aktif' : 'Nonaktif'}</button>
              </div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                <button className="icon-action" onClick={() => openEdit(item)}><Pencil size={14} /></button>
                <button className="icon-action" style={{ color: '#dc2626' }} onClick={() => { if (confirm('Hapus item ini?')) delMut.mutate(item.uuid); }}><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
        {!isLoading && items.length === 0 && <div className="resource-note">Belum ada item. Klik "Item Baru" untuk menambahkan.</div>}
      </div>

      {editing !== null && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="modal-box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <strong>{editing === 'new' ? 'Item Baru' : 'Edit Item'}</strong>
              <button type="button" className="modal-close" onClick={() => setEditing(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { key: 'name', label: 'Nama', type: 'text', placeholder: 'Nama item', required: true },
                { key: 'price', label: 'Harga (token)', type: 'number', placeholder: '100', required: true },
                { key: 'stock', label: 'Stok (kosong = ∞)', type: 'number', placeholder: 'Unlimited jika kosong' },
                { key: 'sort_order', label: 'Urutan', type: 'number', placeholder: '0' },
              ].map(({ key, label, type, placeholder, required }) => (
                <label key={key} className="event-field">
                  <span>{label}</span>
                  <input type={type} required={required} placeholder={placeholder} value={form[key]}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} />
                </label>
              ))}
              <label className="event-field">
                <span>Tipe</span>
                <select value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                  {Object.entries(TYPE_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </label>
              <label className="event-field">
                <span>Deskripsi</span>
                <textarea rows={3} placeholder="Deskripsi item…" value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              </label>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>Aktif</span>
                <button type="button" role="switch" aria-checked={form.is_active} onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
                  style={{ width: 40, height: 22, borderRadius: 11, border: 'none', cursor: 'pointer', padding: 2, background: form.is_active ? 'var(--accent)' : 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: form.is_active ? 'flex-end' : 'flex-start', transition: 'background 0.2s' }}>
                  <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', display: 'block' }} />
                </button>
              </div>
            </div>
            <div className="modal-foot">
              <button type="button" className="outline-button compact" onClick={() => setEditing(null)}>Batal</button>
              <button type="button" className="primary-button compact" disabled={saveMut.isPending || !form.name || !form.price} onClick={handleSave}>
                {saveMut.isPending ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={13} />}
                {saveMut.isPending ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Admin: purchases queue ────────────────────────────────────────────────────

function AdminPurchases() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('pending');

  const { data: purchases = [], isLoading } = useQuery({
    queryKey: ['store-admin-purchases', statusFilter],
    queryFn: () => api.get(`/store/admin/purchases?status=${statusFilter}`).then((r) => r.data.data.data ?? []),
  });

  const fulfillMut = useMutation({
    mutationFn: ({ id, note }) => api.patch(`/store/admin/purchases/${id}/fulfill`, { note }),
    onSuccess: () => { toast.success('Ditandai fulfilled.'); qc.invalidateQueries({ queryKey: ['store-admin-purchases'] }); },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal.'),
  });

  const cancelMut = useMutation({
    mutationFn: ({ id }) => api.patch(`/store/admin/purchases/${id}/cancel`),
    onSuccess: () => { toast.success('Dibatalkan & token dikembalikan.'); qc.invalidateQueries({ queryKey: ['store-admin-purchases'] }); },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal.'),
  });

  return (
    <>
      <div className="section-title" style={{ marginBottom: 12 }}>
        <div><p className="mono-kicker text-muted">ADMIN</p><h2>Antrian Pembelian</h2></div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['pending', 'fulfilled', 'cancelled'].map((s) => (
            <button key={s} type="button"
              onClick={() => setStatusFilter(s)}
              style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)', cursor: 'pointer', fontWeight: 600,
                background: statusFilter === s ? 'var(--accent)' : 'var(--surface)', color: statusFilter === s ? '#fff' : 'var(--fg-3)' }}>
              {STATUS_META[s].label}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="resource-note">Memuat…</div>}
      <div className="work-list">
        {!isLoading && purchases.length === 0 && <div className="resource-note">Tidak ada pembelian.</div>}
        {purchases.map((p) => {
          const sm = STATUS_META[p.status] || STATUS_META.pending;
          const meta = typeMeta(p.item?.type);
          return (
            <div key={p.id} className="work-row" style={{ display: 'grid', gridTemplateColumns: '1fr 90px 70px 130px', alignItems: 'center', gap: 12, padding: '10px 14px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.user?.name ?? '—'} <span style={{ color: 'var(--fg-3)', fontWeight: 400 }}>membeli</span> {p.item?.name ?? '—'}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-3)' }}>{p.user?.nip ?? ''} · {formatDate(p.created_at)}{p.note ? ` · ${p.note}` : ''}</div>
              </div>
              <div style={{ textAlign: 'right', fontWeight: 700, color: '#ef4444', fontSize: 13 }}>-{p.tokens_spent.toLocaleString()} T</div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, fontWeight: 600, background: sm.bg, color: sm.color, border: `1px solid ${sm.border}`, textAlign: 'center' }}>{sm.label}</span>
              {p.status === 'pending' && (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                  <button className="outline-button compact" style={{ fontSize: 11, color: '#16a34a', borderColor: '#86efac' }}
                    onClick={() => fulfillMut.mutate({ id: p.id })} disabled={fulfillMut.isPending}>
                    <CheckCircle2 size={12} /> Fulfill
                  </button>
                  <button className="outline-button compact" style={{ fontSize: 11, color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={() => cancelMut.mutate({ id: p.id })} disabled={cancelMut.isPending}>
                    <XCircle size={12} /> Batal
                  </button>
                </div>
              )}
              {p.status !== 'pending' && <div />}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const TABS_USER  = ['store', 'purchases'];
const TABS_ADMIN = ['store', 'purchases', 'items', 'queue'];
const TAB_LABELS = { store: 'Toko', purchases: 'Riwayat Saya', items: 'Kelola Item', queue: 'Antrian' };

export default function Store({ session }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('store');
  const [buyItem, setBuyItem] = useState(null);

  const roles = getRoleNames(session?.user);
  const isAdmin = roles.includes('super-admin') || roles.includes('admin-opd');
  const tabs = isAdmin ? TABS_ADMIN : TABS_USER;

  const { data: wallet } = useQuery({
    queryKey: ['wallet'],
    queryFn: () => api.get('/wallet').then((r) => r.data.data),
    staleTime: 30_000,
  });
  const balance = wallet?.balance ?? 0;

  const { data: items = [], isLoading: itemsLoading } = useQuery({
    queryKey: ['store'],
    queryFn: () => api.get('/store').then((r) => r.data.data),
    enabled: tab === 'store',
  });

  const [filterType, setFilterType] = useState('all');
  const filtered = filterType === 'all' ? items : items.filter((i) => i.type === filterType);

  return (
    <div className="page-stack">
      <div className="page-head" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p className="mono-kicker text-muted">Token</p>
          <h1>Toko Token</h1>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '8px 16px',
        }}>
          <Coins size={16} color="#2563eb" />
          <span style={{ fontWeight: 800, fontSize: 18, color: '#2563eb' }}>{balance.toLocaleString()}</span>
          <span style={{ fontSize: 12, color: '#93c5fd' }}>token</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid var(--border)' }}>
        {tabs.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            style={{
              padding: '8px 16px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: 'none', color: tab === t ? 'var(--accent)' : 'var(--fg-3)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -2,
            }}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Store tab */}
      {tab === 'store' && (
        <section className="enterprise-card">
          <div className="section-title" style={{ marginBottom: 16 }}>
            <div><p className="mono-kicker text-muted">KATALOG</p><h2>Pilih Apresiasi</h2></div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', ...Object.keys(TYPE_META)].map((t) => (
                <button key={t} type="button" onClick={() => setFilterType(t)}
                  style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 20, border: '1px solid var(--border)',
                    cursor: 'pointer', fontWeight: 600,
                    background: filterType === t ? 'var(--accent)' : 'var(--surface)',
                    color: filterType === t ? '#fff' : 'var(--fg-3)',
                  }}>
                  {t === 'all' ? 'Semua' : TYPE_META[t].label}
                </button>
              ))}
            </div>
          </div>
          {itemsLoading && <StoreItemsSkeleton />}
          {!itemsLoading && filtered.length === 0 && <div className="resource-note">Tidak ada item.</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {filtered.map((item) => (
              <ItemCard key={item.uuid} item={item} balance={balance} onBuy={setBuyItem} />
            ))}
          </div>
        </section>
      )}

      {tab === 'purchases' && (
        <section className="enterprise-card">
          <div className="section-title" style={{ marginBottom: 12 }}>
            <div><p className="mono-kicker text-muted">RIWAYAT</p><h2>Pembelian Saya</h2></div>
          </div>
          <MyPurchases />
        </section>
      )}

      {tab === 'items' && isAdmin && (
        <section className="enterprise-card">
          <AdminItems />
        </section>
      )}

      {tab === 'queue' && isAdmin && (
        <section className="enterprise-card">
          <AdminPurchases />
        </section>
      )}

      {buyItem && (
        <BuyModal
          item={buyItem}
          balance={balance}
          onClose={() => setBuyItem(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['wallet'] });
            qc.invalidateQueries({ queryKey: ['store'] });
            qc.invalidateQueries({ queryKey: ['store-my-purchases'] });
          }}
        />
      )}
    </div>
  );
}
