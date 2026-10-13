import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, BookOpen, Building2, ChevronLeft, ChevronRight, Eye, EyeOff,
  Globe, Lock, Pencil, Plus, Search, Trash2, User, UserPlus, Users, X,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

// ── Constants ──────────────────────────────────────────────────────────────────

const FILTER_TABS = [
  { key: 'all',      label: 'Semua',     type: null,       status: null },
  { key: 'internal', label: 'Internal',  type: 'internal', status: null },
  { key: 'external', label: 'Eksternal', type: 'external', status: null },
  { key: 'active',   label: 'Aktif',     type: null,       status: 'active' },
  { key: 'inactive', label: 'Nonaktif', type: null,       status: 'inactive' },
];

const EMPTY_FAC  = { user_id: null, user_name: '', user_email: '', picked_user_type: null, facilitator_type: 'internal', institution: '', expertise: '', bio: '', status: 'active' };
const EMPTY_USER = { name: '', nip: '', email: '', password: '', user_type: 'asn' };
const PAGE_SIZE_OPTIONS = [10, 15, 30];

// ── Helpers ────────────────────────────────────────────────────────────────────

function initials(name = '') {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function QualityBadge({ children }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      fontSize: 10,
      fontWeight: 700,
      padding: '2px 7px',
      background: '#fffbeb',
      color: '#92400e',
      border: '1px solid #fde68a',
      whiteSpace: 'nowrap',
    }}>
      <AlertTriangle size={10} /> {children}
    </span>
  );
}

// ── Shared segmented control ───────────────────────────────────────────────────

function SegControl({ value, onChange, options, disabled = false }) {
  return (
    <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden', width: '100%', opacity: disabled ? 0.6 : 1 }}>
      {options.map(({ v, label, Icon }, i) => {
        const active = value === v;
        return (
          <button
            key={v} type="button" onClick={() => !disabled && onChange(v)}
            disabled={disabled}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: '9px 0', border: 'none',
              borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
              background: active ? '#000' : 'var(--surface)',
              color: active ? '#fff' : 'var(--fg-2)',
              fontWeight: active ? 600 : 400, fontSize: 13,
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {Icon && <Icon size={13} />} {label}
          </button>
        );
      })}
    </div>
  );
}

const FAC_TYPE_OPTS  = [{ v: 'internal', label: 'Internal', Icon: Lock }, { v: 'external', label: 'Eksternal', Icon: Globe }];
const USER_TYPE_OPTS = [{ v: 'asn', label: 'ASN', Icon: null }, { v: 'external', label: 'Non-ASN', Icon: null }];

// ── User picker combobox ───────────────────────────────────────────────────────

function UserPicker({ value, onSelect }) {
  const [query, setQuery] = useState(value?.user_name ?? '');
  const [open, setOpen]   = useState(false);
  const [dq, setDq]       = useState('');
  const containerRef      = useRef(null);
  const inputRef          = useRef(null);
  const timerRef          = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setDq(query), 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const { data } = useQuery({
    queryKey: ['user-picker', dq],
    queryFn:  async () => (await api.get(`/users?search=${encodeURIComponent(dq)}&per_page=8`)).data.data.data,
    enabled:  open && dq.length >= 1,
    staleTime: 30_000,
  });

  useEffect(() => {
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const CLEAR_PAYLOAD = { user_id: null, user_name: '', user_email: '', user_type: null, opd_name: null };
  const pick  = (u) => { onSelect({ user_id: u.id, user_name: u.name, user_email: u.email, user_type: u.user_type ?? null, opd_name: u.opd_name ?? null }); setQuery(u.name); setOpen(false); };
  const clear = () => { onSelect(CLEAR_PAYLOAD); setQuery(''); inputRef.current?.focus(); };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid var(--border)', borderRadius: 6, padding: '0 10px', background: '#fff' }}>
        <User size={13} style={{ color: 'var(--fg-3)', flexShrink: 0 }} />
        <input
          ref={inputRef} value={query} onFocus={() => setOpen(true)}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onSelect(CLEAR_PAYLOAD); }}
          placeholder="Cari nama atau email pengguna…"
          style={{ flex: 1, border: 'none', outline: 'none', fontSize: 13, padding: '9px 0', background: 'transparent', color: 'var(--fg-1)' }}
        />
        {value?.user_id && (
          <button type="button" onClick={clear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', display: 'flex', padding: 0 }}>
            <X size={12} />
          </button>
        )}
      </div>

      {open && data?.length > 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, maxHeight: 220, overflowY: 'auto', boxShadow: '0 6px 16px rgba(0,0,0,0.1)' }}>
          {data.map((u, i) => {
            const isAsn = u.user_type === 'asn';
            return (
              <button key={u.id} type="button" onMouseDown={(e) => { e.preventDefault(); pick(u); }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: '100%', padding: '9px 12px', background: 'none', border: 'none', cursor: 'pointer', borderTop: i > 0 ? '1px solid var(--border)' : 'none', textAlign: 'left' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2,#f5f5f5)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</span>
                  {u.user_type && (
                    <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, fontWeight: 600, background: isAsn ? '#f0fdf4' : '#eff6ff', border: `1px solid ${isAsn ? '#bbf7d0' : '#bfdbfe'}`, color: isAsn ? '#166534' : '#1d4ed8' }}>
                      {isAsn ? 'ASN' : 'Non-ASN'}
                    </span>
                  )}
                </div>
                <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
                  {u.email || '—'}{u.opd_name ? ` · ${u.opd_name}` : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {open && dq.length >= 1 && data?.length === 0 && (
        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 200, background: '#fff', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 12px', fontSize: 12, color: 'var(--fg-3)', boxShadow: '0 6px 16px rgba(0,0,0,0.1)' }}>
          Pengguna tidak ditemukan.
        </div>
      )}
    </div>
  );
}

// ── New user form ──────────────────────────────────────────────────────────────

function NewUserForm({ form, onChange }) {
  const [showPwd, setShowPwd] = useState(false);
  const set = (k, v) => onChange({ ...form, [k]: v });

  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* User type */}
      <div className="fm-field">
        <span>Tipe Pengguna</span>
        <SegControl value={form.user_type} onChange={(v) => set('user_type', v)} options={USER_TYPE_OPTS} />
      </div>

      {/* Name + NIP */}
      <div style={{ display: 'grid', gridTemplateColumns: form.user_type === 'asn' ? '1fr 1fr' : '1fr', gap: 14 }}>
        <label className="fm-field">
          <span>Nama Lengkap <em style={{ color: '#dc2626', fontStyle: 'normal' }}>*</em></span>
          <input
            required value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Nama sesuai SK / identitas"
            maxLength={255}
          />
        </label>
        {form.user_type === 'asn' && (
          <label className="fm-field">
            <span>NIP</span>
            <input value={form.nip} onChange={(e) => set('nip', e.target.value)} placeholder="18 digit NIP" maxLength={32} />
          </label>
        )}
      </div>

      {/* Email + Password */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <label className="fm-field">
          <span>Email</span>
          <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="nama@domain.com" maxLength={255} />
        </label>
        <div className="fm-field">
          <span>Password</span>
          <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--border)', borderRadius: 6, background: '#fff', overflow: 'hidden' }}>
            <input
              type={showPwd ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="Kosongkan = tanpa password"
              style={{ flex: 1, border: 'none', outline: 'none', padding: '9px 10px', fontSize: 13, background: 'transparent' }}
            />
            <button type="button" onClick={() => setShowPwd((s) => !s)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', padding: '0 10px', display: 'flex' }}>
              {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Facilitator modal ──────────────────────────────────────────────────────────

const PANEL_LABEL = { fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 14, display: 'block' };

function FacilitatorModal({ facilitator, onClose, onSuccess }) {
  const isEdit = !!facilitator;

  const [mode, setMode]       = useState('existing');
  const [fac, setFac]         = useState(isEdit
    ? { user_id: facilitator.user_id, user_name: facilitator.user_name, user_email: facilitator.user_email, facilitator_type: facilitator.facilitator_type, institution: facilitator.institution ?? '', expertise: facilitator.expertise ?? '', bio: facilitator.bio ?? '', status: facilitator.status ?? 'active' }
    : EMPTY_FAC,
  );
  const [newUser, setNewUser] = useState(EMPTY_USER);

  const setF = (k, v) => setFac((f) => ({ ...f, [k]: v }));

  // Rules 1 & 2: sync user_type → facilitator_type and lock the control
  // Locked when: new-user mode (always) OR existing-user mode with a picked user
  const facTypeLocked = !isEdit && (mode === 'new' || !!fac.picked_user_type);

  useEffect(() => {
    if (isEdit) return;
    const userType = mode === 'new' ? newUser.user_type : fac.picked_user_type;
    if (!userType) return;
    setFac((f) => ({ ...f, facilitator_type: userType === 'asn' ? 'internal' : 'external' }));
  }, [newUser.user_type, fac.picked_user_type, mode, isEdit]);

  // Rule 3: fetch all facilitator user_ids to detect duplicates on "Pilih Pengguna"
  const { data: existingFacilitators = [] } = useQuery({
    queryKey: ['facilitators-all'],
    queryFn:  async () => (await api.get('/facilitators?all=1')).data.data,
    enabled:  !isEdit,
    staleTime: 60_000,
  });
  const takenUserIds = new Set(existingFacilitators.map((f) => f.user_id));
  const isDuplicate  = mode === 'existing' && !!fac.user_id && takenUserIds.has(fac.user_id);

  const saveMut = useMutation({
    mutationFn: async () => {
      if (isEdit) {
        return api.patch(`/facilitators/${facilitator.uuid}`, {
          facilitator_type: fac.facilitator_type,
          institution:      fac.institution.trim() || null,
          expertise:        fac.expertise.trim()   || null,
          bio:              fac.bio.trim()          || null,
          status:           fac.status,
        });
      }
      let userId = fac.user_id;
      if (mode === 'new') {
        const res = await api.post('/users', {
          name:      newUser.name.trim(),
          user_type: newUser.user_type,
          ...(newUser.nip      ? { nip:      newUser.nip.trim()   } : {}),
          ...(newUser.email    ? { email:    newUser.email.trim() } : {}),
          ...(newUser.password ? { password: newUser.password     } : {}),
        });
        userId = res.data.data.id;
      }
      return api.post('/facilitators', {
        user_id:          userId,
        facilitator_type: fac.facilitator_type,
        institution:      fac.institution.trim() || null,
        expertise:        fac.expertise.trim()   || null,
        bio:              fac.bio.trim()          || null,
        status:           fac.status,
      });
    },
    onSuccess: () => { onSuccess(); toast.success(isEdit ? 'Fasilitator diperbarui.' : 'Fasilitator berhasil ditambahkan.'); },
    onError:   (err) => toast.error(err.response?.data?.message || 'Gagal menyimpan.'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isEdit) {
      if (mode === 'existing' && !fac.user_id)  { toast.error('Pilih pengguna terlebih dahulu.'); return; }
      if (mode === 'existing' && isDuplicate)    { toast.error('Pengguna ini sudah terdaftar sebagai fasilitator.'); return; }
      if (mode === 'new' && !newUser.name.trim()) { toast.error('Nama lengkap wajib diisi.'); return; }
    }
    saveMut.mutate();
  };

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog" aria-modal="true"
        style={{
          background: '#fff', borderRadius: 10, boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
          width: '95vw', maxWidth: 760,
          display: 'flex', flexDirection: 'column',
          maxHeight: '92vh', overflow: 'hidden',
        }}
      >
        {/* ── Fixed header ── */}
        <div className="modal-head" style={{ flexShrink: 0 }}>
          <h2>{isEdit ? 'Ubah Fasilitator' : 'Tambah Fasilitator'}</h2>
          <button className="icon-action" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>

          {/* ── Mode switcher — full width, only on create ── */}
          {!isEdit && (
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
              <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
                {[
                  { k: 'existing', label: 'Pilih Pengguna',     Icon: Users    },
                  { k: 'new',      label: 'Buat Pengguna Baru', Icon: UserPlus },
                ].map(({ k, label, Icon }, i) => {
                  const active = mode === k;
                  return (
                    <button
                      key={k} type="button" onClick={() => setMode(k)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        padding: '9px 0', border: 'none',
                        borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                        background: active ? '#000' : 'var(--surface)',
                        color: active ? '#fff' : 'var(--fg-2)',
                        fontWeight: active ? 600 : 400, fontSize: 13,
                        cursor: 'pointer', transition: 'background 0.15s',
                      }}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Two-panel body ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, overflow: 'hidden', minHeight: 0 }}>

            {/* Left: user section */}
            <div style={{ padding: 20, borderRight: '1px solid var(--border)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={PANEL_LABEL}>{isEdit ? 'Pengguna' : mode === 'existing' ? 'Pilih Pengguna' : 'Data Pengguna Baru'}</span>

              {isEdit ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {initials(facilitator.user_name)}
                  </div>
                  <div>
                    <strong style={{ fontSize: 13 }}>{facilitator.user_name}</strong>
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--fg-3)' }}>{facilitator.user_email}</p>
                  </div>
                </div>
              ) : mode === 'existing' ? (
                <div className="fm-field" style={{ margin: 0 }}>
                  <span>Pengguna <em style={{ color: '#dc2626', fontStyle: 'normal' }}>*</em></span>
                  <UserPicker
                    value={fac}
                    onSelect={(u) => setFac((f) => ({
                      ...f,
                      user_id:          u.user_id,
                      user_name:        u.user_name,
                      user_email:       u.user_email,
                      picked_user_type: u.user_type ?? null,
                      // auto-fill institution from opd_name; clear when deselecting
                      institution:      u.user_id ? (u.opd_name || f.institution) : '',
                    }))}
                  />
                  {fac.user_email && !isDuplicate && (
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>{fac.user_email}</p>
                  )}
                  {isDuplicate && (
                    <div style={{ marginTop: 8, padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#dc2626' }}>
                      Pengguna ini sudah terdaftar sebagai fasilitator dan tidak dapat didaftarkan ulang.
                    </div>
                  )}
                </div>
              ) : (
                <NewUserForm form={newUser} onChange={setNewUser} />
              )}
            </div>

            {/* Right: facilitator fields */}
            <div style={{ padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <span style={PANEL_LABEL}>Data Fasilitator</span>

              <div className="fm-field">
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  Tipe Fasilitator
                  {facTypeLocked && (
                    <em style={{ fontStyle: 'normal', fontSize: 10, color: 'var(--fg-3)', fontWeight: 400 }}>
                      · ditentukan otomatis dari tipe pengguna
                    </em>
                  )}
                </span>
                <SegControl
                  value={fac.facilitator_type}
                  onChange={(v) => setF('facilitator_type', v)}
                  options={FAC_TYPE_OPTS}
                  disabled={facTypeLocked}
                />
              </div>

              <div className="fm-field">
                <span>Status</span>
                <select value={fac.status} onChange={(e) => setF('status', e.target.value)}
                  style={{ width: '100%', padding: '9px 10px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, background: '#fff', color: 'var(--fg-1)' }}>
                  <option value="active">Aktif</option>
                  <option value="inactive">Nonaktif</option>
                </select>
              </div>

              <label className="fm-field">
                <span>Instansi / Lembaga</span>
                <input value={fac.institution} onChange={(e) => setF('institution', e.target.value)} placeholder="Contoh: BKPSDM Kab. Mojokerto" maxLength={255} />
              </label>

              <label className="fm-field">
                <span>Keahlian / Bidang</span>
                <input value={fac.expertise} onChange={(e) => setF('expertise', e.target.value)} placeholder="Contoh: Leadership, Manajemen Kinerja" maxLength={255} />
              </label>

              <label className="fm-field" style={{ flex: 1 }}>
                <span>Bio</span>
                <textarea value={fac.bio} onChange={(e) => setF('bio', e.target.value)} rows={4} placeholder="Deskripsi singkat tentang fasilitator…" style={{ resize: 'none', fontSize: 13, height: '100%', minHeight: 80 }} />
              </label>
            </div>
          </div>

          {/* ── Pinned footer — always visible ── */}
          <div
            className="modal-foot"
            style={{ flexShrink: 0, borderTop: '1px solid var(--border)', padding: '12px 20px', background: '#fff' }}
          >
            <button type="button" className="outline-button compact" onClick={onClose}>Batal</button>
            <button type="submit" className="primary-button compact" disabled={saveMut.isPending || isDuplicate}>
              {saveMut.isPending ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Tambah Fasilitator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Delete confirm ─────────────────────────────────────────────────────────────

function DeleteModal({ facilitator, onClose, onConfirm, isPending }) {
  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" role="dialog" aria-modal="true" style={{ maxWidth: 420 }}>
        <div className="modal-head">
          <h2>Hapus Fasilitator</h2>
          <button className="icon-action" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <p style={{ lineHeight: 1.65, margin: 0 }}>
            Hapus <strong>{facilitator.user_name}</strong> dari daftar fasilitator? Akses rolenya akan dicabut dan tindakan ini tidak dapat dibatalkan.
          </p>
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

// ── Facilitator row ────────────────────────────────────────────────────────────

function FacilitatorRow({ facilitator: f, onEdit, onDelete }) {
  const isInternal = f.facilitator_type === 'internal';
  const isActive   = f.status === 'active';

  return (
    <div className="work-row" style={{ gap: 12, alignItems: 'center', borderLeft: `3px solid ${isActive ? (isInternal ? '#111827' : '#2563eb') : '#d97706'}` }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0, background: isInternal ? '#000' : '#2563eb', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
        {initials(f.user_name)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <strong style={{ fontSize: 13 }}>{f.user_name}</strong>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: isInternal ? 'rgba(0,0,0,0.08)' : 'rgba(37,99,235,0.1)', color: isInternal ? '#111' : '#2563eb', border: `1px solid ${isInternal ? 'rgba(0,0,0,0.15)' : 'rgba(37,99,235,0.25)'}`, letterSpacing: '0.04em' }}>
            {isInternal ? 'INTERNAL' : 'EKSTERNAL'}
          </span>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 20, background: isActive ? '#dcfce7' : 'var(--surface)', color: isActive ? '#166534' : 'var(--fg-3)', border: `1px solid ${isActive ? '#86efac' : 'var(--border)'}`, letterSpacing: '0.04em' }}>
            {isActive ? 'AKTIF' : 'NONAKTIF'}
          </span>
        </div>
        <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--fg-3)' }}>{f.user_email || '—'}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
          {f.institution && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--fg-2)' }}><Building2 size={10} /> {f.institution}</span>}
          {f.expertise   && <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--fg-2)' }}><BookOpen size={10} /> {f.expertise}</span>}
          {!f.institution && <QualityBadge>Instansi belum diisi</QualityBadge>}
          {!f.expertise && <QualityBadge>Keahlian belum diisi</QualityBadge>}
        </div>
      </div>

      <span style={{ fontSize: 11, color: 'var(--fg-3)', whiteSpace: 'nowrap' }}>{formatDate(f.created_at)}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <button className="icon-action" title="Ubah" onClick={() => onEdit(f)}><Pencil size={13} /></button>
        <button className="icon-action danger-icon" title="Hapus" onClick={() => onDelete(f)}><Trash2 size={13} /></button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function AdminOpdFacilitators() {
  const queryClient = useQueryClient();
  const [modal, setModal]               = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeTab, setActiveTab]       = useState('all');
  const [search, setSearch]             = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage]                 = useState(1);
  const [perPage, setPerPage]           = useState(15);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
    clearTimeout(window._facSearchTimer);
    window._facSearchTimer = setTimeout(() => setDebouncedSearch(val), 350);
  };

  const currentTab = FILTER_TABS.find((t) => t.key === activeTab);

  const { data: stats } = useQuery({
    queryKey: ['facilitators-stats'],
    queryFn:  async () => (await api.get('/facilitators/stats')).data.data,
    staleTime: 30_000,
  });

  const qk = ['facilitators', activeTab, debouncedSearch, page, perPage];
  const { data, isLoading, isFetching } = useQuery({
    queryKey: qk,
    queryFn: async () => {
      const params = new URLSearchParams({ per_page: perPage, page });
      if (currentTab?.type)   params.set('type', currentTab.type);
      if (currentTab?.status) params.set('status', currentTab.status);
      if (debouncedSearch)    params.set('search', debouncedSearch);
      return (await api.get(`/facilitators?${params}`)).data.data;
    },
    keepPreviousData: true,
  });

  const facilitators = data?.data ?? [];
  const lastPage     = data?.last_page ?? 1;
  const total        = data?.total ?? 0;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['facilitators'] });
    queryClient.invalidateQueries({ queryKey: ['facilitators-stats'] });
  };

  const deleteMut = useMutation({
    mutationFn: (uuid) => api.delete(`/facilitators/${uuid}`),
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast.success('Fasilitator dihapus.'); },
    onError:   (err) => toast.error(err.response?.data?.message || 'Gagal menghapus.'),
  });

  const afterSave = () => { invalidate(); setModal(null); };

  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Administrasi</p>
        <h1>Daftar Fasilitator</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>
          Kelola fasilitator internal dan eksternal, status aktif, serta kelengkapan profil mengajar.
        </p>
      </div>

      <div className="cp-stats">
        {[
          { label: 'Total',     val: stats?.total    ?? '—' },
          { label: 'Internal',  val: stats?.internal ?? '—' },
          { label: 'Eksternal', val: stats?.external ?? '—' },
          { label: 'Aktif',     val: stats?.active   ?? '—' },
          { label: 'Nonaktif',  val: stats?.inactive ?? '—' },
          { label: 'Profil Kurang', val: stats?.without_expertise ?? '—' },
        ].map(({ label, val }) => (
          <div key={label} className={`cp-stat${label === 'Aktif' ? ' cp-stat--approved' : label === 'Profil Kurang' ? ' cp-stat--pending' : ''}`}>
            <span className="cp-stat-val">{val}</span>
            <span className="cp-stat-lbl">{label}</span>
          </div>
        ))}
      </div>

      <div className="att-toolbar" style={{ flexWrap: 'wrap', gap: 10 }}>
        <div className="cp-filter-tabs">
          {FILTER_TABS.map(({ key, label }) => (
            <button key={key} className={`cp-filter-tab${activeTab === key ? ' active' : ''}`} onClick={() => { setActiveTab(key); setPage(1); }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
          <div className="picker-search">
            <Search size={14} />
            <input placeholder="Cari nama, email, instansi, atau keahlian..." value={search} onChange={(e) => handleSearch(e.target.value)} />
          </div>
          <button className="primary-button compact" onClick={() => setModal('create')}>
            <Plus size={14} /> Tambah Fasilitator
          </button>
        </div>
      </div>

      {isLoading && facilitators.length === 0 && <div className="resource-note">Memuat data fasilitator…</div>}

      {!isLoading && facilitators.length === 0 && (
        <div className="material-empty">
          <User size={32} />
          <p>{search ? `Tidak ada fasilitator yang cocok dengan "${search}".` : 'Belum ada fasilitator terdaftar.'}</p>
          {search ? (
            <button className="outline-button compact" onClick={() => handleSearch('')}>Reset pencarian</button>
          ) : (
            <>
              <span>Klik "Tambah Fasilitator" untuk mendaftarkan fasilitator baru.</span>
              <button className="primary-button compact" onClick={() => setModal('create')} style={{ marginTop: 12 }}>
                <Plus size={14} /> Tambah Fasilitator
              </button>
            </>
          )}
        </div>
      )}

      <div className="work-list" style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity 0.15s' }}>
        {facilitators.map((f) => (
          <FacilitatorRow key={f.uuid ?? f.id} facilitator={f} onEdit={(item) => setModal(item)} onDelete={(item) => setDeleteTarget(item)} />
        ))}
      </div>

      {lastPage > 1 && (
        <div className="enterprise-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', padding: '10px 12px', marginTop: 4 }}>
          <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>{total} fasilitator · Halaman {page} / {lastPage}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select
              value={perPage}
              onChange={(event) => { setPerPage(Number(event.target.value)); setPage(1); }}
              style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', padding: '7px 9px', fontSize: 12 }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} / halaman</option>)}
            </select>
            <button className="outline-button compact" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /> Sebelumnya</button>
            <button className="outline-button compact" disabled={page >= lastPage} onClick={() => setPage((p) => p + 1)}>Berikutnya <ChevronRight size={14} /></button>
          </div>
        </div>
      )}

      {modal && (
        <FacilitatorModal
          facilitator={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSuccess={afterSave}
        />
      )}

      {deleteTarget && (
        <DeleteModal
          facilitator={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => deleteMut.mutate(deleteTarget.uuid)}
          isPending={deleteMut.isPending}
        />
      )}
    </div>
  );
}
