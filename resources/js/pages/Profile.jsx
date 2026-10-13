import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Award, BookOpen, BriefcaseBusiness, Building2, CalendarDays, Camera, CheckCircle,
  Coins, Edit2, Flame, IdCard, KeyRound, Layers3, Loader2, Mail, Save,
  ShieldCheck, TrendingUp, UserCheck, X,
} from 'lucide-react';
import api from '../api.js';

/* ── tier CSS class (no hardcoded hex in JS) ── */
function tierClass(tier) {
  const t = (tier || '').toLowerCase();
  if (t === 'platinum') return 'pf-tier-platinum';
  if (t === 'gold')     return 'pf-tier-gold';
  if (t === 'silver')   return 'pf-tier-silver';
  return 'pf-tier-bronze';
}

const ICON_MAP = { Award, BookOpen, Coins, Flame };
const ROLE_LABELS = {
  asn: 'ASN',
  'admin-opd': 'Admin OPD',
  'super-admin': 'Super Admin',
  'fasilitator-internal': 'Fasilitator Internal',
  'fasilitator-eksternal': 'Fasilitator Eksternal',
};

/* ── deterministic avatar colour ── */
const AVATAR_PALETTE = ['#5b02ad','#007a5e','#b8651c','#0b3d91','#123b35','#a0271e'];
function avatarBg(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_PALETTE[h % AVATAR_PALETTE.length];
}

function DefaultAvatar({ name }) {
  const raw      = (name || '').trim();
  const initials = raw ? raw.split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('') : '?';
  const bg       = avatarBg(raw);
  const fontSize = initials.length === 1 ? 30 : 22;
  const uid      = `ag-${raw.charCodeAt(0) || 0}`;
  return (
    <svg className="profile-avatar-svg" width="80" height="80" viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg" aria-label={raw || 'Avatar'} role="img">
      <defs>
        <pattern id={uid} width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M8 0H0V8" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.6" />
        </pattern>
      </defs>
      <rect width="80" height="80" fill={bg} />
      <rect width="80" height="80" fill={`url(#${uid})`} />
      <text x="40" y="41" textAnchor="middle" dominantBaseline="central"
        fill="rgba(255,255,255,0.94)" fontSize={fontSize} fontWeight="700"
        fontFamily="'Space Mono','Courier New',monospace"
        letterSpacing={initials.length > 1 ? '2' : '0'}>
        {initials}
      </text>
    </svg>
  );
}

/* ── Avatar with upload ── */
function Avatar({ user, onUpload }) {
  const inputRef = useRef();
  const [uploading, setUploading] = useState(false);
  const [imgError, setImgError]   = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append('avatar', file);
      const res = await api.post('/profile/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImgError(false);
      onUpload(res.data.data.photo_url);
    } finally {
      setUploading(false);
    }
  };

  const showPhoto = user?.photo_url && !imgError;
  return (
    <div className="profile-avatar-wrap">
      {showPhoto
        ? <img src={user.photo_url} alt={user?.name} onError={() => setImgError(true)} />
        : <DefaultAvatar name={user?.name} />}
      <button className="profile-avatar-btn" onClick={() => inputRef.current?.click()}
        disabled={uploading} aria-label="Ganti foto">
        {uploading ? <Loader2 size={11} className="spin" /> : <Camera size={11} />}
      </button>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  );
}

/* ── Stat card ── */
function StatCard({ icon: Icon, label, value, sub, colorClass = 'pf-stat-grape' }) {
  return (
    <div className={`profile-stat-card ${colorClass}`}>
      <div className="profile-stat-icon">
        <Icon size={16} />
      </div>
      <div className="profile-stat-value">{value ?? '—'}</div>
      <div className="profile-stat-label">{label}</div>
      {sub && <div className="profile-stat-sub">{sub}</div>}
    </div>
  );
}

/* ── Badge item ── */
function BadgeItem({ badge }) {
  const Ic = ICON_MAP[badge.icon] || Award;
  return (
    <div className={`profile-badge-item ${tierClass(badge.tier)}`}>
      <div className="profile-badge-icon">
        <Ic size={14} />
      </div>
      <div className="profile-badge-body">
        <span className="profile-badge-name">{badge.name}</span>
        <span className="profile-badge-tier">{badge.tier}</span>
      </div>
    </div>
  );
}

/* ── Event status helpers ── */
function eventStatusClass(status) {
  if (status === 'ongoing')   return 'pf-ev-ongoing';
  if (status === 'completed') return 'pf-ev-done';
  return 'pf-ev-scheduled';
}
function completionClass(cs) {
  if (cs === 'completed')   return 'pf-cs-done';
  if (cs === 'in_progress') return 'pf-cs-active';
  return 'pf-cs-idle';
}
const COMPLETION_LABEL = {
  completed:   'Lulus',
  not_started: 'Belum mulai',
  in_progress: 'Sedang belajar',
};
const EVENT_STATUS_LABEL = {
  ongoing:   'Berjalan',
  scheduled: 'Terjadwal',
  completed: 'Selesai',
};

const COMPETENCY_AREAS = [
  { title: 'Manajerial', desc: 'Kepemimpinan, perencanaan, dan pengelolaan kinerja.' },
  { title: 'Teknis', desc: 'Penguatan kemampuan sesuai jabatan dan bidang tugas.' },
  { title: 'Sosial Kultural', desc: 'Kolaborasi lintas unit dan pelayanan publik.' },
  { title: 'Keterampilan Digital', desc: 'Literasi data, aplikasi kerja, dan pembelajaran digital.' },
];

function formatDateTime(value) {
  if (!value) return 'Belum tercatat';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatDate(value) {
  if (!value) return null;
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function eventPeriod(event) {
  const start = formatDate(event.start_date);
  const end = formatDate(event.end_date);

  if (start && end && start !== end) return `${start} - ${end}`;
  return start || end || 'Tanggal belum tercatat';
}

function profileCompletionItems(user) {
  return [
    { key: 'nip', label: 'NIP', done: Boolean(user?.nip), source: 'SIMPEG' },
    { key: 'email', label: 'Email', done: Boolean(user?.email), source: 'CorpU' },
    { key: 'position', label: 'Jabatan', done: Boolean(user?.position_name), source: 'SIMPEG' },
    { key: 'opd', label: 'OPD', done: Boolean(user?.opd_name), source: 'SIMPEG' },
    { key: 'unit', label: 'Unit kerja', done: Boolean(user?.organization_unit_name), source: 'SIMPEG' },
    { key: 'photo', label: 'Foto profil', done: Boolean(user?.photo_url), source: 'CorpU' },
    { key: 'password', label: 'Password lokal', done: Boolean(user?.has_password), source: 'CorpU' },
  ];
}

function InfoRow({ icon: Icon, label, value, tag }) {
  return (
    <div className="pf-info-row">
      <div className="pf-info-icon"><Icon size={15} /></div>
      <div className="pf-info-body">
        <span>{label}</span>
        <strong>{value || 'Belum tersedia'}</strong>
      </div>
      {tag && <em>{tag}</em>}
    </div>
  );
}

/* ── Edit profile modal ── */
function EditModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user.name || '', email: user.email || '', position_name: user.position_name || '',
  });
  const [error, setError] = useState('');

  const mut = useMutation({
    mutationFn: (data) => api.put('/profile', data).then((r) => r.data.data),
    onSuccess: (updated) => { onSaved(updated); onClose(); },
    onError:   (e) => setError(e?.response?.data?.message || 'Gagal menyimpan.'),
  });

  const fields = [
    { key: 'name',          label: 'Nama Lengkap' },
    { key: 'email',         label: 'Email', type: 'email' },
    { key: 'position_name', label: 'Jabatan' },
  ];

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal">
        <div className="profile-modal-head">
          <h2>Ubah Profil</h2>
          <button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>
        <div className="profile-modal-body">
          {error && <div className="profile-modal-err">{error}</div>}
          {fields.map(({ key, label, type = 'text' }) => (
            <div key={key} className="profile-modal-field">
              <label>{label}</label>
              <input type={type} value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
            </div>
          ))}
          <div className="profile-modal-foot">
            <button className="outline-button compact" onClick={onClose}>Batal</button>
            <button className="primary-button compact" onClick={() => mut.mutate(form)} disabled={mut.isPending}>
              {mut.isPending ? <Loader2 size={13} className="spin" /> : <Save size={13} />}
              {mut.isPending ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Change password modal ── */
function PasswordModal({ mode = 'change', onClose, onSaved }) {
  const isSetup = mode === 'setup';
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  const mut = useMutation({
    mutationFn: (data) => api.post(isSetup ? '/profile/set-password' : '/profile/change-password', data),
    onSuccess: (res) => {
      setSuccess(true);
      if (isSetup) onSaved?.(res.data?.data?.user || {});
    },
    onError:   (e) => setError(e?.response?.data?.message || 'Gagal mengubah password.'),
  });

  const fields = [
    { key: 'current_password',      label: 'Password Lama' },
    { key: 'password',              label: 'Password Baru' },
    { key: 'password_confirmation', label: 'Konfirmasi Password Baru' },
  ].filter((field) => !isSetup || field.key !== 'current_password');

  return (
    <div className="profile-modal-overlay">
      <div className="profile-modal">
        <div className="profile-modal-head">
          <h2>{isSetup ? 'Buat Password Lokal' : 'Ganti Password'}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Tutup"><X size={16} /></button>
        </div>
        <div className="profile-modal-body">
          {success ? (
            <div className="profile-modal-success">
              <CheckCircle size={38} className="pf-success-icon" />
              <strong>{isSetup ? 'Password lokal berhasil dibuat.' : 'Password berhasil diubah.'}</strong>
              <div className="pf-success-close">
                <button className="primary-button" onClick={onClose}>Tutup</button>
              </div>
            </div>
          ) : (
            <>
              {error && <div className="profile-modal-err">{error}</div>}
              {fields.map(({ key, label }) => (
                <div key={key} className="profile-modal-field">
                  <label>{label}</label>
                  <input type="password" value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
                </div>
              ))}
              <div className="profile-modal-foot">
                <button className="outline-button compact" onClick={onClose}>Batal</button>
                <button className="primary-button compact" onClick={() => mut.mutate(form)} disabled={mut.isPending}>
                  {mut.isPending ? 'Memproses…' : isSetup ? 'Buat Password' : 'Ubah Password'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Skel({ w, h = 12 }) {
  return <span className="cp-skel-line" style={{ width: w, height: h }} />;
}

function ProfileSkeleton() {
  return (
    <div className="page-stack">
      <div className="page-head">
        <p className="mono-kicker text-muted">Profil</p>
        <h1>Profil Saya</h1>
      </div>
      <div className="profile-hero">
        <div className="profile-hero-inner">
          <Skel w={80} h={80} style={{ flexShrink: 0 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <Skel w={58} h={18} />
            <Skel w={200} h={26} />
            <Skel w={160} h={13} />
          </div>
        </div>
      </div>
      <div className="profile-stats">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="profile-stat-card">
            <Skel w={34} h={34} />
            <Skel w={44} h={22} />
            <Skel w={72} h={10} />
          </div>
        ))}
      </div>
      <div className="profile-grid">
        <section className="enterprise-card" style={{ padding: 20 }}>
          <Skel w={100} h={16} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <Skel w={36} h={36} style={{ flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Skel w={82} h={12} />
                  <Skel w={52} h={10} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="enterprise-card" style={{ padding: 20 }}>
          <Skel w={120} h={16} style={{ marginBottom: 16 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
                <Skel w={10} h={10} style={{ borderRadius: '50%', flexShrink: 0, marginTop: 3 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <Skel w="65%" h={13} />
                  <div style={{ display: 'flex', gap: 6 }}><Skel w={60} h={18} /><Skel w={72} h={18} /></div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function Profile({ onUpdateSession }) {
  const qc = useQueryClient();
  const [editOpen,    setEditOpen]    = useState(false);
  const [pwOpen,      setPwOpen]      = useState(false);
  const [localPhoto,  setLocalPhoto]  = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: () => api.get('/profile').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const user   = data?.user;
  const stats  = data?.stats;
  const wallet = data?.wallet;
  const badges = data?.badges  || [];
  const streak = data?.streak;
  const events = data?.recent_events || [];
  const hasPassword = Boolean(user?.has_password);

  const handleSaved = (updated) => {
    qc.setQueryData(['profile'], (old) => old ? { ...old, user: { ...old.user, ...updated } } : old);
    onUpdateSession?.(updated);
  };

  const handleAvatarUpload = (url) => {
    setLocalPhoto(url);
    qc.setQueryData(['profile'], (old) => old ? { ...old, user: { ...old.user, photo_url: url } } : old);
  };

  const handlePasswordSaved = (updated = {}) => {
    qc.setQueryData(['profile'], (old) => old ? {
      ...old,
      user: { ...old.user, ...updated, has_password: true },
    } : old);
    onUpdateSession?.({ ...updated, has_password: true }, { requires_password_setup: false });
  };

  if (isLoading) return <ProfileSkeleton />;

  const completionRate = stats?.events_total
    ? Math.round((stats.events_completed / stats.events_total) * 100)
    : 0;

  const roleLabel = (user?.roles || []).map((role) => ROLE_LABELS[role] ?? role).join(', ') || ROLE_LABELS[user?.user_type] || user?.user_type || 'ASN';
  const profileItems = profileCompletionItems({ ...user, photo_url: localPhoto || user?.photo_url });
  const completedProfileItems = profileItems.filter((item) => item.done).length;
  const profileCompletionRate = Math.round((completedProfileItems / profileItems.length) * 100);
  const missingProfileItems = profileItems.filter((item) => !item.done).slice(0, 3);

  return (
    <div className="page-stack">

      {/* ── Hero ───────────────────────────────────────── */}
      <div className="profile-hero">
        {streak?.current_streak > 0 && (
          <div className="profile-hero-streak">
            <Flame size={13} /> {streak.current_streak} hari streak
          </div>
        )}
        <div className="profile-hero-inner">
          <Avatar
            user={{ ...user, photo_url: localPhoto || user?.photo_url }}
            onUpload={handleAvatarUpload}
          />
          <div className="profile-identity">
            <div className="profile-role-chip">{roleLabel}</div>
            <h1>{user?.name}</h1>
            <p className="profile-meta">
              {user?.position_name && <><strong>{user.position_name}</strong> · </>}
              {user?.opd_name || user?.organization_unit_name}
              {user?.nip && <> · <span>NIP {user.nip}</span></>}
            </p>
            <div className="profile-source-row">
              <span>{user?.auth_provider === 'sso_asn' ? 'SSO ASN aktif' : 'Login lokal'}</span>
              <span>{user?.synced_from || 'Data lokal CorpU'}</span>
            </div>
          </div>
          <div className="profile-hero-actions">
            <button className="profile-hero-btn" onClick={() => setEditOpen(true)}>
              <Edit2 size={13} /> Ubah Profil
            </button>
            <button className="profile-hero-btn" onClick={() => setPwOpen(true)}>
              <KeyRound size={13} /> {hasPassword ? 'Password' : 'Buat Password'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Profile completeness ───────────────────────── */}
      <section className="enterprise-card pf-completion-card">
        <div className="section-title">
          <div>
            <p className="mono-kicker text-muted">Kelengkapan Profil</p>
            <h2>Data ASN CorpU</h2>
          </div>
          <span className="badge-active">{profileCompletionRate}%</span>
        </div>
        <div className="pf-completion-layout">
          <div>
            <div className="pf-completion-bar-track">
              <div className="pf-completion-bar-fill" style={{ width: `${profileCompletionRate}%` }} />
            </div>
            <p className="pf-completion-note">
              {missingProfileItems.length
                ? `Lengkapi ${missingProfileItems.map((item) => item.label.toLowerCase()).join(', ')}.`
                : 'Profil sudah lengkap untuk kebutuhan pembelajaran CorpU.'}
            </p>
          </div>
          <div className="pf-completion-checks">
            {profileItems.map((item) => (
              <span key={item.key} className={item.done ? 'done' : 'todo'}>
                {item.done ? <CheckCircle size={12} /> : <X size={12} />}
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="profile-stats">
        <StatCard icon={CalendarDays} label="Pelatihan Diikuti"
          value={stats?.events_total}
          sub={`${stats?.events_completed ?? 0} selesai`}
          colorClass="pf-stat-grape" />
        <StatCard icon={TrendingUp} label="Rata-rata Nilai"
          value={stats?.avg_score || '—'}
          sub={`${stats?.assessments_total ?? 0} asesmen`}
          colorClass="pf-stat-sky" />
          <StatCard icon={CheckCircle} label="Asesmen Lulus"
          value={stats?.passed_count ?? '—'}
          sub={`Terbaik: ${stats?.best_score || '—'}`}
          colorClass="pf-stat-em" />
        <StatCard icon={Coins} label="Saldo Token"
          value={(wallet?.balance || 0).toLocaleString()}
          colorClass="pf-stat-gold" />
        <StatCard icon={Award} label="Capaian Kompetensi"
          value={badges.length}
          colorClass="pf-stat-grape" />
        {streak && (
        <StatCard icon={Flame} label="Runtun Terpanjang"
            value={streak.longest_streak}
            sub="hari"
            colorClass="pf-stat-gold" />
        )}
      </div>

      {/* ── ASN identity + account status ───────────────── */}
      <div className="profile-grid">
        <section className="enterprise-card">
          <div className="section-title">
            <div>
              <p className="mono-kicker text-muted">Data Pegawai</p>
              <h2>Identitas Kepegawaian</h2>
            </div>
            <span className="badge-active">SIMPEG</span>
          </div>
          <div className="pf-info-list">
            <InfoRow icon={IdCard} label="NIP" value={user?.nip} tag="SIMPEG" />
            <InfoRow icon={Mail} label="Email" value={user?.email} />
            <InfoRow icon={BriefcaseBusiness} label="Jabatan" value={user?.position_name} tag="SIMPEG" />
            <InfoRow icon={Building2} label="OPD / Satker" value={user?.opd_name} tag="SIMPEG" />
            <InfoRow icon={Layers3} label="Unit Kerja" value={user?.organization_unit_name} tag="SIMPEG" />
          </div>
        </section>

        <section className="enterprise-card">
          <div className="section-title">
            <div>
              <p className="mono-kicker text-muted">Keamanan</p>
              <h2>Akun & Akses</h2>
            </div>
          </div>
          <div className="pf-security-panel">
            <div className="pf-security-status">
              <ShieldCheck size={19} />
              <div>
                <strong>{user?.auth_provider === 'sso_asn' ? 'Login SSO ASN aktif' : 'Login lokal aktif'}</strong>
                <span>{user?.synced_from || 'Data lokal CorpU'}</span>
              </div>
            </div>
            <div className={`pf-password-callout ${hasPassword ? 'ready' : 'empty'}`}>
              <div>
                <span>Password Lokal</span>
                <strong>{hasPassword ? 'Sudah dibuat' : 'Belum dibuat'}</strong>
              </div>
              <button className={hasPassword ? 'outline-button compact' : 'primary-button compact'} onClick={() => setPwOpen(true)}>
                <KeyRound size={14} /> {hasPassword ? 'Ganti' : 'Buat Password'}
              </button>
            </div>
            <div className="pf-account-meta">
              <InfoRow icon={UserCheck} label="Status akun" value={user?.is_active ? 'Aktif' : 'Nonaktif'} />
              <InfoRow icon={CalendarDays} label="Terakhir login" value={formatDateTime(user?.last_login_at)} />
            </div>
          </div>
        </section>
      </div>

      {/* ── Competency areas ───────────────────────────── */}
      <section className="enterprise-card">
        <div className="section-title">
          <div>
            <p className="mono-kicker text-muted">Pengembangan Kompetensi</p>
            <h2>Fokus Pembelajaran</h2>
          </div>
        </div>
        <div className="pf-competency-grid">
          {COMPETENCY_AREAS.map((item) => (
            <div key={item.title} className="pf-competency-card">
              <span>{item.title}</span>
              <p>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Badges + Events grid ───────────────────────── */}
      <div className="profile-grid">

        {/* badges */}
        <section className="enterprise-card">
          <div className="section-title">
            <div>
              <p className="mono-kicker text-muted">Capaian</p>
              <h2>Penghargaan Kompetensi</h2>
            </div>
            {badges.length > 0 && <span className="badge-active">{badges.length}</span>}
          </div>

          {badges.length === 0 ? (
            <p className="pf-empty-note">Belum ada capaian. Selesaikan asesmen untuk membuka penghargaan kompetensi.</p>
          ) : (
            <div className="profile-badge-list">
              {badges.slice(0, 6).map((b, i) => <BadgeItem key={i} badge={b} />)}
              {badges.length > 6 && (
                <p className="pf-more-note">+{badges.length - 6} badge lainnya</p>
              )}
            </div>
          )}
        </section>

        {/* recent events */}
        <section className="enterprise-card">
          <div className="section-title">
            <div>
              <p className="mono-kicker text-muted">Riwayat</p>
              <h2>Pelatihan Terkini</h2>
            </div>
          </div>

          {events.length === 0 ? (
            <p className="pf-empty-note">Belum terdaftar di pelatihan manapun.</p>
          ) : (
            <div className="profile-event-list">
              {events.map((e, i) => (
                <div key={i} className="profile-event-row">
                  <div className={`profile-event-dot ${eventStatusClass(e.status)}`} />
                  <div className="profile-event-body">
                    <span className="profile-event-title">{e.title}</span>
                    <span className="profile-event-date">{eventPeriod(e)}</span>
                    <div className="profile-event-chips">
                      <span className={`pf-status-chip ${eventStatusClass(e.status)}`}>
                        {EVENT_STATUS_LABEL[e.status] || 'Terjadwal'}
                      </span>
                      <span className={`pf-cs-chip ${completionClass(e.completion_status)}`}>
                        {COMPLETION_LABEL[e.completion_status] || 'Belum mulai'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* ── Progress ───────────────────────────────────── */}
      {stats?.events_total > 0 && (
        <section className="enterprise-card">
          <div className="section-title">
            <div>
              <p className="mono-kicker text-muted">Progres Belajar</p>
              <h2>Tingkat Penyelesaian</h2>
            </div>
            <span className="badge-active">{completionRate}%</span>
          </div>
          <div className="pf-progress-summary">
            <strong className="pf-progress-num">{stats.events_completed}</strong>
            <span className="pf-progress-sub">
              pelatihan selesai dari {stats.events_total} terdaftar
            </span>
          </div>
          <div className="profile-progress-bar-track">
            <div className="profile-progress-bar-fill"
              style={{ width: `${Math.min(Math.max(completionRate, 0), 100)}%` }} />
          </div>
        </section>
      )}

      {editOpen && <EditModal user={user} onClose={() => setEditOpen(false)} onSaved={handleSaved} />}
      {pwOpen && (
        <PasswordModal
          mode={hasPassword ? 'change' : 'setup'}
          onClose={() => setPwOpen(false)}
          onSaved={handlePasswordSaved}
        />
      )}
    </div>
  );
}
