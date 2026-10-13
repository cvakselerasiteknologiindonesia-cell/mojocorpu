import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  LockKeyhole,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../api.js';
import sidebarItems from '../../data/sidebar.js';

const ROLE_META = {
  'super-admin': {
    label: 'Super Admin',
    group: 'Akses Sistem',
    scope: 'Seluruh modul dan konfigurasi sistem',
  },
  'admin-opd': {
    label: 'Admin OPD',
    group: 'Akses Pengelola OPD',
    scope: 'Kelola pengguna, OPD, fasilitator, event, KMS, dan laporan OPD',
  },
  asn: {
    label: 'ASN',
    group: 'Akses Pembelajaran',
    scope: 'Akses pembelajaran, event, sertifikat, forum, dan presensi',
  },
  'fasilitator-internal': {
    label: 'Fasilitator Internal',
    group: 'Akses Fasilitator',
    scope: 'Kelola kelas, materi, asesmen, peserta, laporan, dan kontribusi KMS',
  },
  'fasilitator-eksternal': {
    label: 'Fasilitator Eksternal',
    group: 'Akses Fasilitator',
    scope: 'Kelola kelas yang ditugaskan, materi, asesmen, peserta, dan laporan',
  },
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'active', label: 'Aktif saja' },
  { value: 'inactive', label: 'Nonaktif saja' },
  { value: 'risk', label: 'Risiko tinggi' },
];

function roleLabel(role) {
  return ROLE_META[role]?.label || role;
}

function permissionRisk(permission) {
  if (/^(delete|manage settings)/.test(permission) || permission === 'update user') {
    return { level: 'critical', label: 'KRITIS' };
  }

  if (/^(approve|review|create user|create opd|create training event|create certificate)/.test(permission)) {
    return { level: 'high', label: 'TINGGI' };
  }

  return { level: 'normal', label: 'NORMAL' };
}

function permissionList(item) {
  return item.permissions || (item.permission ? [item.permission] : []);
}

function roleCanSeeItem(role, item) {
  return !item.roles?.length || item.roles.includes(role);
}

function itemVisibleForPermissions(item, permissions, isSuperAdmin) {
  if (isSuperAdmin) return true;
  const needed = permissionList(item);
  if (!needed.length) return true;
  return needed.some((permission) => permissions.has(permission));
}

function samePermissions(a = [], b = []) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((item) => set.has(item));
}

function RoleAccessSkeleton() {
  return (
    <div className="roles-access-grid">
      <section className="enterprise-card roles-access-list">
        {[1, 2, 3, 4].map((item) => <div key={item} className="roles-skeleton-line" />)}
      </section>
      <section className="enterprise-card roles-permission-panel">
        {[1, 2, 3].map((item) => <div key={item} className="roles-skeleton-block" />)}
      </section>
    </div>
  );
}

export default function AdminRoles() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('');
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('menus');
  const [filterMode, setFilterMode] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-role-access'],
    queryFn: () => api.get('/admin/roles/access').then((res) => res.data.data),
  });

  const roles = data?.roles || [];
  const catalog = data?.catalog || [];

  useEffect(() => {
    if (!roles.length) return;
    setSelectedRole((current) => current || roles[0].name);
    setDrafts((current) => {
      if (Object.keys(current).length) return current;
      return Object.fromEntries(roles.map((role) => [role.name, role.permissions || []]));
    });
  }, [roles]);

  const selected = roles.find((role) => role.name === selectedRole);
  const selectedOriginalPermissions = selected?.permissions || [];
  const selectedDraftPermissions = drafts[selectedRole] || selectedOriginalPermissions;
  const selectedSet = useMemo(() => new Set(selectedDraftPermissions), [selectedDraftPermissions]);
  const hasChanges = Boolean(selected) && !samePermissions(selectedOriginalPermissions, selectedDraftPermissions);
  const changedCount = useMemo(() => {
    const original = new Set(selectedOriginalPermissions);
    const draft = new Set(selectedDraftPermissions);
    const added = selectedDraftPermissions.filter((permission) => !original.has(permission)).length;
    const removed = selectedOriginalPermissions.filter((permission) => !draft.has(permission)).length;
    return added + removed;
  }, [selectedOriginalPermissions, selectedDraftPermissions]);

  const mutation = useMutation({
    mutationFn: ({ role, permissions }) => api.put(`/admin/roles/${encodeURIComponent(role)}/permissions`, { permissions }),
    onSuccess: (res, vars) => {
      const updated = res.data.data;
      setDrafts((current) => ({ ...current, [vars.role]: updated.permissions || vars.permissions }));
      queryClient.setQueryData(['admin-role-access'], (current) => {
        if (!current) return current;
        return {
          ...current,
          roles: current.roles.map((role) => role.name === vars.role
            ? { ...role, permissions: updated.permissions || vars.permissions }
            : role),
        };
      });
      toast.success(`Hak akses ${roleLabel(vars.role)} berhasil disimpan.`);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.message || 'Gagal menyimpan hak akses role.');
    },
  });

  const setRolePermissions = (role, permissions) => {
    setDrafts((current) => ({
      ...current,
      [role]: Array.from(new Set(permissions)).sort(),
    }));
  };

  const togglePermission = (permission) => {
    if (!selected || selected.locked) return;
    const next = new Set(selectedDraftPermissions);
    next.has(permission) ? next.delete(permission) : next.add(permission);
    setRolePermissions(selected.name, Array.from(next));
  };

  const setGroup = (items, enabled) => {
    if (!selected || selected.locked) return;
    const next = new Set(selectedDraftPermissions);
    items.forEach((item) => {
      enabled ? next.add(item.name) : next.delete(item.name);
    });
    setRolePermissions(selected.name, Array.from(next));
  };

  const resetSelected = () => {
    if (!selected) return;
    setRolePermissions(selected.name, selectedOriginalPermissions);
  };

  const saveSelected = () => {
    if (!selected || selected.locked || !hasChanges) return;
    mutation.mutate({ role: selected.name, permissions: selectedDraftPermissions });
  };

  const tabs = useMemo(() => catalog.map((group) => ({
    key: group.key,
    label: group.key === 'menus'
      ? 'Menu Sidebar'
      : group.key === 'buttons'
        ? 'Tombol & Aksi'
        : group.key === 'learning-operations'
          ? 'Operasional'
          : 'Permission Teknis',
    count: group.items?.length || 0,
  })), [catalog]);

  useEffect(() => {
    if (!tabs.length) return;
    if (!tabs.some((tab) => tab.key === activeTab)) {
      setActiveTab(tabs[0].key);
    }
  }, [activeTab, tabs]);

  const previewItems = useMemo(() => {
    const isSuperAdmin = selectedRole === 'super-admin';
    return sidebarItems
      .filter((item) => roleCanSeeItem(selectedRole, item))
      .filter((item) => itemVisibleForPermissions(item, selectedSet, isSuperAdmin));
  }, [selectedRole, selectedSet]);

  const filteredCatalog = catalog.filter((group) => group.key === activeTab).map((group) => {
    const q = search.trim().toLowerCase();
    const items = (group.items || []).filter((item) => {
      const checked = selectedSet.has(item.name);
      const risk = permissionRisk(item.name).level;
      const matchSearch = q
        ? [item.label, item.name, item.description].join(' ').toLowerCase().includes(q)
        : true;
      const matchFilter = filterMode === 'active'
        ? checked
        : filterMode === 'inactive'
          ? !checked
          : filterMode === 'risk'
            ? ['critical', 'high'].includes(risk)
            : true;

      return matchSearch && matchFilter;
    });

    return { ...group, items };
  }).filter((group) => group.items.length);

  return (
    <div className="page-stack">
      {isLoading ? <RoleAccessSkeleton /> : (
        <div className="roles-access-grid">
          <section className="enterprise-card roles-access-list">
            <div className="section-title roles-access-title">
              <div>
                <p className="mono-kicker text-muted">Pilih Role</p>
                <h2>Daftar Role</h2>
              </div>
              <ShieldCheck size={18} />
            </div>

            <div className="roles-access-role-list">
              {roles.map((role) => {
                const draft = drafts[role.name] || role.permissions || [];
                const changed = !samePermissions(role.permissions || [], draft);
                const meta = ROLE_META[role.name] || {};

                return (
                  <button
                    key={role.name}
                    type="button"
                    className={`role-access-button ${selectedRole === role.name ? 'active' : ''}`}
                    onClick={() => setSelectedRole(role.name)}
                  >
                    <span className="role-access-icon">
                      {role.locked ? <LockKeyhole size={15} /> : <ShieldCheck size={15} />}
                    </span>
                    <span className="role-access-copy">
                      <strong>{roleLabel(role.name)}</strong>
                      <small>{meta.group || 'Role aplikasi'} · {role.users_count} pengguna</small>
                    </span>
                    <em>{draft.length}</em>
                    {changed && <i />}
                  </button>
                );
              })}
            </div>

            <div className="roles-sidebar-preview">
              <div className="roles-sidebar-preview-head">
                <span>Preview Sidebar</span>
                <strong>{previewItems.length}</strong>
              </div>
              <div className="roles-sidebar-preview-list">
                {previewItems.length === 0 ? (
                  <p>Tidak ada menu yang aktif untuk role ini.</p>
                ) : previewItems.map((item, index) => {
                  const Icon = item.icon;
                  const showSection = index === 0 || previewItems[index - 1].section !== item.section;

                  return (
                    <div key={`${item.to}-${index}`}>
                      {showSection && <small>{item.section}</small>}
                      <span><Icon size={14} /> {item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="enterprise-card roles-permission-panel">
            <div className="roles-panel-head">
              <div>
                <p className="mono-kicker text-muted">Editor Permission</p>
                <h2>{selected ? roleLabel(selected.name) : 'Pilih role'}</h2>
                {selected && <p>{ROLE_META[selected.name]?.scope || 'Atur permission yang melekat ke role ini.'}</p>}
              </div>
              <div className="roles-panel-actions">
                {selected?.locked && <span className="roles-locked-note"><LockKeyhole size={13} /> Terkunci</span>}
                <button type="button" className="outline-button compact" onClick={resetSelected} disabled={!hasChanges || mutation.isPending}>
                  <RotateCcw size={14} /> Reset
                </button>
                <button type="button" className="primary-button compact" onClick={saveSelected} disabled={!hasChanges || selected?.locked || mutation.isPending}>
                  {mutation.isPending ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                  Simpan
                </button>
              </div>
            </div>

            <div className="roles-permission-toolbar">
              <div className="roles-permission-search">
                <Search size={15} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari menu, tombol, atau permission..."
                />
              </div>

              <label className="roles-permission-select">
                <span>Kategori</span>
                <select value={activeTab} onChange={(event) => setActiveTab(event.target.value)}>
                  {tabs.map((tab) => (
                    <option key={tab.key} value={tab.key}>{tab.label} ({tab.count})</option>
                  ))}
                </select>
              </label>

              <label className="roles-permission-select">
                <span>Filter</span>
                <select value={filterMode} onChange={(event) => setFilterMode(event.target.value)}>
                  {FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="roles-permission-summary">
              <span>{selectedDraftPermissions.length} permission aktif</span>
              {hasChanges && <strong>{changedCount} perubahan belum disimpan</strong>}
            </div>

            <div className="roles-permission-groups">
              {filteredCatalog.length === 0 && (
                <div className="roles-permission-empty">
                  Tidak ada permission yang cocok dengan pencarian atau filter aktif.
                </div>
              )}

              {filteredCatalog.map((group) => {
                const checkedCount = group.items.filter((item) => selectedSet.has(item.name)).length;
                const allChecked = checkedCount === group.items.length && group.items.length > 0;

                return (
                  <div key={group.key} className="roles-permission-group">
                    <div className="roles-permission-group-head">
                      <div>
                        <h3>{group.label}</h3>
                        <p>{group.description}</p>
                      </div>
                      <div className="roles-group-actions">
                        <span>{checkedCount}/{group.items.length}</span>
                        {!selected?.locked && (
                          <button type="button" onClick={() => setGroup(group.items, !allChecked)}>
                            {allChecked ? 'Kosongkan' : 'Aktifkan semua'}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="roles-permission-items">
                      {group.items.map((item) => {
                        const checked = selectedSet.has(item.name);
                        const risk = permissionRisk(item.name);

                        return (
                          <label key={item.name} className={`roles-permission-item ${checked ? 'checked' : ''} ${selected?.locked ? 'disabled' : ''}`}>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={selected?.locked}
                              onChange={() => togglePermission(item.name)}
                            />
                            <span>
                              <strong>{item.label} <em className={`risk-badge ${risk.level}`}>{risk.label}</em></strong>
                              <small>{item.description}</small>
                              <code>{item.name}</code>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="roles-save-bar">
              <div>
                <strong>{hasChanges ? `${changedCount} perubahan belum disimpan` : 'Tidak ada perubahan'}</strong>
                <span>{selected?.locked ? 'Role super-admin dikunci.' : 'Simpan agar permission role diperbarui di Spatie.'}</span>
              </div>
              <div className="roles-save-actions">
                <button type="button" className="outline-button compact" onClick={resetSelected} disabled={!hasChanges || mutation.isPending}>
                  <RotateCcw size={14} /> Reset
                </button>
                <button type="button" className="primary-button compact" onClick={saveSelected} disabled={!hasChanges || selected?.locked || mutation.isPending}>
                  {mutation.isPending ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                  Simpan Perubahan
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
