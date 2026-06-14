import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Search, Shield, User, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

function useDebounce(value, delay) {
  const [deb, setDeb] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDeb(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return deb;
}

function formatLogin(d) {
  if (!d) return 'Belum login';
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

const ROLE_CONFIG = {
  'asn':                 { label: 'ASN',              bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
  'fasilitator-internal': { label: 'Fasilitator Int.', bg: '#fdf4ff', color: '#7e22ce', border: '#e9d5ff' },
  'fasilitator-eksternal': { label: 'Fasilitator Eks.', bg: '#fff7ed', color: '#9a3412', border: '#fed7aa' },
  'admin-opd':           { label: 'Admin OPD',        bg: '#f0fdf4', color: '#166534', border: '#bbf7d0' },
  'super-admin':         { label: 'Super Admin',      bg: '#fef2f2', color: '#991b1b', border: '#fecaca' },
};

function RoleBadge({ role }) {
  const cfg = ROLE_CONFIG[role] ?? { label: role, bg: '#f3f4f6', color: '#374151', border: '#d1d5db' };
  return (
    <span style={{ fontSize: 11, padding: '2px 8px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, whiteSpace: 'nowrap', display: 'inline-block' }}>
      {cfg.label}
    </span>
  );
}

// ── Assign Role Modal ──────────────────────────────────────────────────────────

function AssignRoleModal({ user, availableRoles, onClose, onSuccess }) {
  const currentRole = user.roles[0] ?? 'asn';
  const [selectedRole, setSelectedRole] = useState(currentRole);

  const mut = useMutation({
    mutationFn: () => api.post(`/users/${user.id}/assign-role`, { role: selectedRole }),
    onSuccess: (res) => {
      toast.success(`Role ${user.name} diubah ke ${selectedRole}.`);
      onSuccess(res.data.data);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal mengubah role.'),
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <strong>Ubah Role</strong>
          <button className="icon-button" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--grape)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
              {user.name?.charAt(0) ?? '?'}
            </div>
            <div>
              <strong style={{ display: 'block', fontSize: 13 }}>{user.name}</strong>
              <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>{user.nip || user.email || '—'}</span>
            </div>
          </div>

          <div className="fm-field">
            <label>Role Baru</label>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              {availableRoles.map((r) => (
                <option key={r} value={r}>{ROLE_CONFIG[r]?.label ?? r}</option>
              ))}
            </select>
          </div>

          {selectedRole !== currentRole && (
            <div style={{ padding: '8px 12px', background: '#fefce8', border: '1px solid #fde047', fontSize: 12, color: '#854d0e' }}>
              Role akan diubah dari <strong>{ROLE_CONFIG[currentRole]?.label ?? currentRole}</strong> ke <strong>{ROLE_CONFIG[selectedRole]?.label ?? selectedRole}</strong>.
              Akses sistem pengguna akan berubah segera setelah login berikutnya.
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button className="outline-button compact" onClick={onClose}>Batal</button>
          <button
            className="primary-button compact"
            disabled={mut.isPending || selectedRole === currentRole}
            onClick={() => mut.mutate()}
          >
            <Shield size={13} /> {mut.isPending ? 'Menyimpan…' : 'Simpan Role'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User Row ───────────────────────────────────────────────────────────────────

function UserRow({ user, availableRoles, onRoleChange }) {
  const [showModal, setShowModal] = useState(false);
  const role = user.roles[0];

  return (
    <div className="work-row" style={{ gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Avatar + info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0, color: 'var(--fg-2)' }}>
          {user.name?.charAt(0) ?? '?'}
        </div>
        <div style={{ minWidth: 0 }}>
          <strong style={{ display: 'block', fontSize: 13, lineHeight: 1.3 }}>{user.name}</strong>
          <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>
            {user.nip && <span>{user.nip} · </span>}
            {user.organization_unit_name || user.position_name || user.email || '—'}
          </span>
        </div>
      </div>

      {/* Role badge */}
      <div style={{ flexShrink: 0 }}>
        {role ? <RoleBadge role={role} /> : <span style={{ fontSize: 11, color: 'var(--fg-3)' }}>—</span>}
      </div>

      {/* Status */}
      <span style={{ fontSize: 11, padding: '2px 8px', background: user.is_active ? '#dcfce7' : '#f3f4f6', color: user.is_active ? '#166534' : 'var(--fg-3)', border: `1px solid ${user.is_active ? '#86efac' : 'var(--border)'}`, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {user.is_active ? 'Aktif' : 'Nonaktif'}
      </span>

      {/* Last login */}
      <span style={{ fontSize: 11, color: 'var(--fg-3)', flexShrink: 0, fontFamily: 'Space Mono, monospace', display: 'none', minWidth: 90 }} className="last-login">
        {formatLogin(user.last_login_at)}
      </span>

      {/* Assign role */}
      {role !== 'super-admin' && (
        <button className="outline-button compact" style={{ flexShrink: 0 }} onClick={() => setShowModal(true)}>
          <Shield size={12} /> Role
        </button>
      )}

      {showModal && (
        <AssignRoleModal
          user={user}
          availableRoles={availableRoles}
          onClose={() => setShowModal(false)}
          onSuccess={(updated) => onRoleChange(user.id, updated.roles)}
        />
      )}
    </div>
  );
}

// ── OPD Group (accordion) ──────────────────────────────────────────────────────

function OpdGroup({ opdName, users, availableRoles, onRoleChange }) {
  const [open, setOpen] = useState(true);

  return (
    <div style={{ border: '1px solid var(--border)', marginBottom: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--surface)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {open ? <ChevronDown size={15} style={{ flexShrink: 0, color: 'var(--fg-3)' }} /> : <ChevronRight size={15} style={{ flexShrink: 0, color: 'var(--fg-3)' }} />}
        <strong style={{ fontSize: 13, flex: 1 }}>{opdName || 'Tanpa OPD'}</strong>
        <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'Space Mono, monospace', flexShrink: 0 }}>{users.length} ASN</span>
      </button>
      {open && (
        <div className="work-list" style={{ borderTop: '1px solid var(--border)' }}>
          {users.map((u) => (
            <UserRow key={u.id} user={u} availableRoles={availableRoles} onRoleChange={onRoleChange} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Role Group ─────────────────────────────────────────────────────────────────

function RoleGroup({ roleKey, users, availableRoles, onRoleChange }) {
  const [open, setOpen] = useState(true);
  const cfg = ROLE_CONFIG[roleKey] ?? { label: roleKey };

  return (
    <div style={{ border: '1px solid var(--border)', marginBottom: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'var(--surface)', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {open ? <ChevronDown size={15} style={{ flexShrink: 0, color: 'var(--fg-3)' }} /> : <ChevronRight size={15} style={{ flexShrink: 0, color: 'var(--fg-3)' }} />}
        <RoleBadge role={roleKey} />
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--fg-3)', fontFamily: 'Space Mono, monospace', flexShrink: 0 }}>{users.length} pengguna</span>
      </button>
      {open && (
        <div className="work-list" style={{ borderTop: '1px solid var(--border)' }}>
          {users.map((u) => (
            <UserRow key={u.id} user={u} availableRoles={availableRoles} onRoleChange={onRoleChange} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'asn',        label: 'ASN',        icon: Users },
  { key: 'facilitator', label: 'Fasilitator', icon: User },
  { key: 'other',      label: 'Lainnya',    icon: Shield },
  { key: 'all',        label: 'Semua',      icon: Users },
];

export default function AdminOpdUsers() {
  const qc = useQueryClient();
  const [tab, setTab]     = useState('asn');
  const [search, setSearch] = useState('');
  const debouncedSearch   = useDebounce(search, 350);

  // Fetch all users once (200 per page is enough for this dataset)
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['users-admin'],
    queryFn: () => api.get('/users?per_page=500').then((r) => r.data.data.data),
    staleTime: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['users-stats'],
    queryFn: () => api.get('/users/stats').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const { data: availableRoles = [] } = useQuery({
    queryKey: ['user-roles'],
    queryFn: () => api.get('/users/roles').then((r) => r.data.data),
    staleTime: 300_000,
  });

  // Optimistic role update in local cache
  const handleRoleChange = (userId, newRoles) => {
    qc.setQueryData(['users-admin'], (old) => {
      if (!old) return old;
      return old; // re-fetch is simpler
    });
    qc.invalidateQueries({ queryKey: ['users-admin'] });
    qc.invalidateQueries({ queryKey: ['users-stats'] });
  };

  const allUsers = usersData ?? [];

  // Filter by search across all tabs
  const filtered = debouncedSearch
    ? allUsers.filter((u) =>
        u.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (u.nip && u.nip.includes(debouncedSearch)) ||
        (u.email && u.email.toLowerCase().includes(debouncedSearch.toLowerCase())) ||
        (u.opd_name && u.opd_name.toLowerCase().includes(debouncedSearch.toLowerCase()))
      )
    : allUsers;

  // Group helpers
  const asnUsers   = filtered.filter((u) => u.roles.includes('asn') && !u.roles.includes('super-admin'));
  const facUsers   = filtered.filter((u) => u.roles.some((r) => r.startsWith('fasilitator')));
  const otherUsers = filtered.filter((u) => u.roles.some((r) => ['admin-opd', 'super-admin'].includes(r)));

  // Group ASN by opd_name
  const asnByOpd = asnUsers.reduce((acc, u) => {
    const key = u.opd_name || 'Tanpa OPD';
    if (!acc[key]) acc[key] = [];
    acc[key].push(u);
    return acc;
  }, {});
  const sortedOpdKeys = Object.keys(asnByOpd).sort();

  // Group facilitators by role
  const facByRole = facUsers.reduce((acc, u) => {
    const role = u.roles.find((r) => r.startsWith('fasilitator')) ?? 'fasilitator-internal';
    if (!acc[role]) acc[role] = [];
    acc[role].push(u);
    return acc;
  }, {});

  // Group others by role
  const otherByRole = otherUsers.reduce((acc, u) => {
    const role = u.roles[0] ?? 'asn';
    if (!acc[role]) acc[role] = [];
    acc[role].push(u);
    return acc;
  }, {});

  return (
    <div className="page-stack">
      {/* Header */}
      <div className="page-head">
        <p className="mono-kicker text-muted">Administrasi</p>
        <h1>Pengguna</h1>
      </div>

      {/* Stats strip */}
      <div className="cp-stats">
        <div className="cp-stat">
          <span className="cp-stat-val">{stats?.total ?? '—'}</span>
          <span className="cp-stat-lbl">Total Pengguna</span>
        </div>
        <div className="cp-stat cp-stat--approved">
          <span className="cp-stat-val">{stats?.active ?? '—'}</span>
          <span className="cp-stat-lbl">Aktif</span>
        </div>
        <div className="cp-stat">
          <span className="cp-stat-val">{stats?.asn ?? '—'}</span>
          <span className="cp-stat-lbl">ASN</span>
        </div>
        <div className="cp-stat">
          <span className="cp-stat-val">{stats?.facilitator ?? '—'}</span>
          <span className="cp-stat-lbl">Fasilitator</span>
        </div>
        <div className="cp-stat">
          <span className="cp-stat-val">{stats?.admin_opd ?? '—'}</span>
          <span className="cp-stat-lbl">Admin OPD</span>
        </div>
      </div>

      {/* Live search */}
      <div style={{ position: 'relative', maxWidth: 400 }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, NIP, email, atau OPD…"
          style={{ width: '100%', paddingLeft: 32, paddingRight: search ? 32 : 12, paddingTop: 9, paddingBottom: 9, border: '1px solid var(--border)', font: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
        />
        {search && (
          <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', padding: 2, fontSize: 16, display: 'flex' }}>×</button>
        )}
      </div>

      {/* Tabs */}
      <div className="cp-filter-tabs">
        {TABS.map(({ key, label, icon: Icon }) => {
          const count = key === 'asn' ? asnUsers.length : key === 'facilitator' ? facUsers.length : key === 'other' ? otherUsers.length : filtered.length;
          return (
            <button key={key} className={`cp-filter-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
              <Icon size={13} /> {label}
              <em className="sb-badge" style={{ background: tab === key ? 'var(--grape)' : 'var(--fg-3)' }}>{count}</em>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading && <div className="resource-note">Memuat pengguna…</div>}

      {!isLoading && (
        <>
          {/* ASN tab — grouped by OPD */}
          {tab === 'asn' && (
            <div>
              {sortedOpdKeys.length === 0 && <div className="resource-note">Tidak ada ASN ditemukan.</div>}
              {sortedOpdKeys.map((opd) => (
                <OpdGroup
                  key={opd}
                  opdName={opd}
                  users={asnByOpd[opd]}
                  availableRoles={availableRoles}
                  onRoleChange={handleRoleChange}
                />
              ))}
            </div>
          )}

          {/* Facilitator tab — grouped by role */}
          {tab === 'facilitator' && (
            <div>
              {Object.keys(facByRole).length === 0 && <div className="resource-note">Tidak ada fasilitator ditemukan.</div>}
              {['fasilitator-internal', 'fasilitator-eksternal'].filter((r) => facByRole[r]).map((role) => (
                <RoleGroup
                  key={role}
                  roleKey={role}
                  users={facByRole[role]}
                  availableRoles={availableRoles}
                  onRoleChange={handleRoleChange}
                />
              ))}
            </div>
          )}

          {/* Other tab */}
          {tab === 'other' && (
            <div>
              {Object.keys(otherByRole).length === 0 && <div className="resource-note">Tidak ada pengguna lainnya.</div>}
              {Object.keys(otherByRole).sort().map((role) => (
                <RoleGroup
                  key={role}
                  roleKey={role}
                  users={otherByRole[role]}
                  availableRoles={availableRoles}
                  onRoleChange={handleRoleChange}
                />
              ))}
            </div>
          )}

          {/* All tab — flat list */}
          {tab === 'all' && (
            <section className="enterprise-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div className="section-title" style={{ padding: '14px 18px' }}>
                <h2>Semua Pengguna</h2>
                <span className="badge-active">{filtered.length} pengguna</span>
              </div>
              {filtered.length === 0 && <div className="resource-note">Tidak ada pengguna ditemukan.</div>}
              <div className="work-list">
                {filtered.map((u) => (
                  <UserRow key={u.id} user={u} availableRoles={availableRoles} onRoleChange={handleRoleChange} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
