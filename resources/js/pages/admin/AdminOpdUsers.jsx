import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Filter, Search, Shield, User, Users, X } from 'lucide-react';
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

const ROLE_OPTIONS = [
  { value: 'all', label: 'Semua peran' },
  { value: 'asn', label: 'ASN' },
  { value: 'admin-opd', label: 'Admin OPD' },
  { value: 'fasilitator-internal', label: 'Fasilitator Internal' },
  { value: 'fasilitator-eksternal', label: 'Fasilitator Eksternal' },
  { value: 'super-admin', label: 'Super Admin' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua status' },
  { value: 'active', label: 'Aktif' },
  { value: 'inactive', label: 'Nonaktif' },
];

const LOGIN_OPTIONS = [
  { value: 'all', label: 'Semua login' },
  { value: 'ever', label: 'Pernah login' },
  { value: 'never', label: 'Belum login' },
];

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
      toast.success(`Peran ${user.name} berhasil diubah.`);
      onSuccess(res.data.data);
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Gagal mengubah peran.'),
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <strong>Ubah Peran</strong>
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
            <label>Peran Baru</label>
            <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
              {availableRoles.map((r) => (
                <option key={r} value={r}>{ROLE_CONFIG[r]?.label ?? r}</option>
              ))}
            </select>
          </div>

          {selectedRole !== currentRole && (
            <div style={{ padding: '8px 12px', background: '#fefce8', border: '1px solid #fde047', fontSize: 12, color: '#854d0e' }}>
              Peran akan diubah dari <strong>{ROLE_CONFIG[currentRole]?.label ?? currentRole}</strong> ke <strong>{ROLE_CONFIG[selectedRole]?.label ?? selectedRole}</strong>.
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
            <Shield size={13} /> {mut.isPending ? 'Menyimpan…' : 'Simpan Peran'}
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
            {user.email || '—'}
          </span>
          <span style={{ display: 'block', fontSize: 11, color: 'var(--fg-3)', marginTop: 2 }}>
            {user.opd_name || 'Tanpa OPD'}{(user.organization_unit_name || user.position_name) ? ` · ${user.organization_unit_name || user.position_name}` : ''}
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
      <span style={{ fontSize: 11, color: 'var(--fg-3)', flexShrink: 0, fontFamily: 'Space Mono, monospace', minWidth: 96, textAlign: 'right' }} className="last-login">
        {formatLogin(user.last_login_at)}
      </span>

      {/* Assign role */}
      {role === 'super-admin' ? (
        <span style={{ fontSize: 11, padding: '2px 8px', border: '1px solid var(--border)', color: 'var(--fg-3)', background: 'var(--surface)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          Terkunci
        </span>
      ) : (
        <button className="outline-button compact" style={{ flexShrink: 0 }} onClick={() => setShowModal(true)}>
          <Shield size={12} /> Ubah peran
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

function EmptyUsersState({ onReset, hasFilters }) {
  return (
    <div className="resource-note" style={{ textAlign: 'center', padding: 22 }}>
      <strong style={{ display: 'block', color: 'var(--fg)', marginBottom: 4 }}>Tidak ada pengguna ditemukan.</strong>
      <span style={{ display: 'block', marginBottom: hasFilters ? 12 : 0 }}>
        {hasFilters ? 'Coba ubah kata kunci atau reset filter pencarian.' : 'Data pengguna belum tersedia untuk kategori ini.'}
      </span>
      {hasFilters && (
        <button type="button" className="outline-button compact" onClick={onReset}>
          Reset filter
        </button>
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

const TAB_ROLES = {
  asn: ['asn'],
  facilitator: ['fasilitator-internal', 'fasilitator-eksternal'],
  other: ['admin-opd', 'super-admin'],
  all: [],
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function PaginationFooter({ page, perPage, pagination, onPageChange, onPerPageChange, isFetching }) {
  const total = pagination?.total ?? 0;
  const from = pagination?.from ?? 0;
  const to = pagination?.to ?? 0;
  const lastPage = pagination?.last_page ?? 1;

  return (
    <div
      className="enterprise-card"
      style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--fg-3)', fontSize: 12 }}>
        <span>
          Menampilkan <strong style={{ color: 'var(--fg)' }}>{from || 0}-{to || 0}</strong> dari <strong style={{ color: 'var(--fg)' }}>{total}</strong> pengguna
        </span>
        {isFetching && <span className="mono-kicker text-muted" style={{ margin: 0 }}>Memuat</span>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <select
          value={perPage}
          onChange={(event) => onPerPageChange(Number(event.target.value))}
          style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', padding: '7px 9px', fontSize: 12 }}
        >
          {PAGE_SIZE_OPTIONS.map((size) => <option key={size} value={size}>{size} / halaman</option>)}
        </select>
        <button className="outline-button compact" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Sebelumnya
        </button>
        <span style={{ fontSize: 12, color: 'var(--fg-2)', minWidth: 86, textAlign: 'center' }}>
          Hal. {page} / {lastPage}
        </span>
        <button className="outline-button compact" disabled={page >= lastPage} onClick={() => onPageChange(page + 1)}>
          Berikutnya
        </button>
      </div>
    </div>
  );
}

export default function AdminOpdUsers() {
  const qc = useQueryClient();
  const location = useLocation();
  const initialRole = new URLSearchParams(location.search).get('role') || 'all';
  const [tab, setTab]     = useState('asn');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loginFilter, setLoginFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState(initialRole);
  const [opdFilter, setOpdFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const debouncedSearch   = useDebounce(search, 350);

  useEffect(() => {
    setPage(1);
  }, [tab, debouncedSearch, statusFilter, loginFilter, roleFilter, opdFilter, perPage]);

  const activeRoleFilters = roleFilter !== 'all' ? [roleFilter] : (TAB_ROLES[tab] ?? []);

  const { data: usersData, isLoading, isFetching } = useQuery({
    queryKey: ['users-admin', tab, debouncedSearch, statusFilter, loginFilter, roleFilter, opdFilter, page, perPage],
    queryFn: () => {
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
      });

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (loginFilter !== 'all') params.set('login', loginFilter);
      if (opdFilter !== 'all') params.set('opd', opdFilter === 'Tanpa OPD' ? '__none' : opdFilter);
      activeRoleFilters.forEach((role) => params.append('role[]', role));

      return api.get(`/users?${params}`).then((r) => r.data.data);
    },
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
    qc.invalidateQueries({ queryKey: ['users-admin'] });
    qc.invalidateQueries({ queryKey: ['users-stats'] });
  };

  const allUsers = usersData?.data ?? [];
  const pagination = usersData ?? {};
  const inactiveCount = stats?.inactive ?? Math.max(Number(stats?.total || 0) - Number(stats?.active || 0), 0);
  const neverLoggedInCount = stats?.never_logged_in ?? 0;
  const opdOptions = stats?.opds ?? [];

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setLoginFilter('all');
    setRoleFilter('all');
    setOpdFilter('all');
    setPage(1);
  };

  const hasActiveFilters = Boolean(search)
    || statusFilter !== 'all'
    || loginFilter !== 'all'
    || roleFilter !== 'all'
    || opdFilter !== 'all';

  // Group helpers
  const asnUsers   = allUsers.filter((u) => u.roles.includes('asn') && !u.roles.includes('super-admin'));
  const facUsers   = allUsers.filter((u) => u.roles.some((r) => r.startsWith('fasilitator')));
  const otherUsers = allUsers.filter((u) => u.roles.some((r) => ['admin-opd', 'super-admin'].includes(r)));

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
        <h1>Manajemen Akses Pengguna</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--fg-3)' }}>
          Kelola role, status akun, dan sebaran pengguna per OPD.
        </p>
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
          <span className="cp-stat-val">{inactiveCount}</span>
          <span className="cp-stat-lbl">Nonaktif</span>
        </div>
        <div className="cp-stat cp-stat--pending">
          <span className="cp-stat-val">{neverLoggedInCount}</span>
          <span className="cp-stat-lbl">Belum Login</span>
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

      {/* Filters */}
      <section className="enterprise-card" style={{ padding: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 8, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--fg-3)', pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, NIP, email, atau OPD..."
              style={{ width: '100%', paddingLeft: 32, paddingRight: search ? 32 : 12, paddingTop: 9, paddingBottom: 9, border: '1px solid var(--border)', font: 'inherit', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--fg-3)', padding: 2, fontSize: 16, display: 'flex' }}>×</button>
            )}
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', padding: '9px 10px', fontSize: 13 }}>
            {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select value={loginFilter} onChange={(e) => setLoginFilter(e.target.value)} style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', padding: '9px 10px', fontSize: 13 }}>
            {LOGIN_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', padding: '9px 10px', fontSize: 13 }}>
            {ROLE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <select value={opdFilter} onChange={(e) => setOpdFilter(e.target.value)} style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--fg)', padding: '9px 10px', fontSize: 13 }}>
            <option value="all">Semua OPD</option>
            {opdOptions.map((opd) => <option key={opd} value={opd}>{opd}</option>)}
          </select>
          <button type="button" className="outline-button compact" onClick={resetFilters} disabled={!hasActiveFilters}>
            <Filter size={12} /> Reset
          </button>
        </div>
      </section>

      {/* Tabs */}
      <div className="cp-filter-tabs">
        {TABS.map(({ key, label, icon: Icon }) => {
          const count = key === 'asn'
            ? stats?.asn
            : key === 'facilitator'
              ? stats?.facilitator
              : key === 'other'
                ? Number(stats?.admin_opd || 0) + Number(stats?.super_admin || 0)
                : stats?.total;
          return (
            <button key={key} className={`cp-filter-tab${tab === key ? ' active' : ''}`} onClick={() => setTab(key)}>
              <Icon size={13} /> {label}
              <em className="sb-badge" style={{ background: tab === key ? 'var(--grape)' : 'var(--fg-3)' }}>{count ?? 0}</em>
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
              {sortedOpdKeys.length === 0 && <EmptyUsersState onReset={resetFilters} hasFilters={hasActiveFilters} />}
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
              {Object.keys(facByRole).length === 0 && <EmptyUsersState onReset={resetFilters} hasFilters={hasActiveFilters} />}
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
              {Object.keys(otherByRole).length === 0 && <EmptyUsersState onReset={resetFilters} hasFilters={hasActiveFilters} />}
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
                <span className="badge-active">{pagination.total ?? 0} pengguna</span>
              </div>
              {allUsers.length === 0 && <EmptyUsersState onReset={resetFilters} hasFilters={hasActiveFilters} />}
              <div className="work-list">
                {allUsers.map((u) => (
                  <UserRow key={u.id} user={u} availableRoles={availableRoles} onRoleChange={handleRoleChange} />
                ))}
              </div>
            </section>
          )}

          <PaginationFooter
            page={page}
            perPage={perPage}
            pagination={pagination}
            onPageChange={setPage}
            onPerPageChange={setPerPage}
            isFetching={isFetching}
          />
        </>
      )}
    </div>
  );
}
